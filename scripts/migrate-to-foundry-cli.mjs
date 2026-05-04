/**
 * One-time migration script: converts item-repo source files to Foundry CLI
 * (LevelDB) format and merges in actor-ancestry content.
 *
 * Run from the repo root:  node scripts/migrate-to-foundry-cli.mjs
 *
 * After running, delete items/ and actors/ directories, then:
 *   npm install && npm run build
 */

import {
  readFileSync, writeFileSync, mkdirSync,
  readdirSync, existsSync, copyFileSync,
} from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const ANCESTRY   = join(ROOT, '..', 'mass-effect-actor-and-ancestry-compendium');

const MODULE_ID  = 'mass-effect-sf2e-conversion';
const OLD_MODULE = 'mass-effect-item-repository';

// ── helpers ───────────────────────────────────────────────────────────────

function makeId(slug) {
  return crypto.createHash('sha256').update(slug).digest('hex').slice(0, 16);
}

function makeEmbeddedId(actorId, index, name) {
  return crypto.createHash('sha256').update(`${actorId}.${index}.${name}`).digest('hex').slice(0, 16);
}

function readJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...readJsonFiles(full));
    else if (entry.name.endsWith('.json')) {
      results.push({ path: full, data: JSON.parse(readFileSync(full, 'utf8')) });
    }
  }
  return results;
}

function writeJson(destDir, filename, data) {
  mkdirSync(destDir, { recursive: true });
  writeFileSync(join(destDir, filename), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function firstSentence(text) {
  const plain = stripHtml(text);
  const match = plain.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : plain.slice(0, 120);
}

// Rename flags from old module id to new one (recursive)
function renameFlags(obj) {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach(renameFlags);
    } else {
      if (obj[OLD_MODULE] !== undefined) {
        obj[MODULE_ID] = obj[OLD_MODULE];
        delete obj[OLD_MODULE];
      }
      for (const v of Object.values(obj)) renameFlags(v);
    }
  }
}

// Defaults for prototypeToken fields missing from item-repo actors
function enrichProtoToken(token, actorImg) {
  return {
    name:     token.name,
    displayName: token.displayName ?? 20,
    actorLink:   false,
    width:    token.width  ?? 1,
    height:   token.height ?? 1,
    texture: {
      src:        token.img ?? actorImg ?? 'systems/pf2e/icons/default-icons/npc.svg',
      anchorX:    0.5,
      anchorY:    0.5,
      offsetX:    0,
      offsetY:    0,
      fit:        'contain',
      scaleX:     1,
      scaleY:     1,
      rotation:   0,
      tint:       '#ffffff',
      alphaThreshold: 0.75,
    },
    lockRotation: true,
    rotation:   0,
    alpha:      1,
    disposition: token.disposition ?? -1,
    displayBars: token.displayBars ?? 40,
    bar1: { attribute: 'attributes.hp' },
    bar2: { attribute: null },
    light: {
      negative:    false,
      priority:    0,
      alpha:       0.5,
      angle:       360,
      bright:      0,
      color:       null,
      coloration:  1,
      dim:         0,
      attenuation: 0.5,
      luminosity:  0.5,
      saturation:  0,
      contrast:    0,
      shadows:     0,
      animation:   { type: null, speed: 5, intensity: 5, reverse: false },
      darkness:    { min: 0, max: 1 },
    },
    sight: {
      enabled:     true,
      range:       0,
      angle:       360,
      visionMode:  'basic',
      color:       null,
      attenuation: 0.1,
      brightness:  0,
      saturation:  0,
      contrast:    0,
    },
    detectionModes: [],
    flags: { pf2e: { linkToActorSize: true, autoscale: true } },
  };
}

// Transform an embedded item (melee attack, action, effect, equipment)
function transformEmbeddedItem(item, actorId, index) {
  const id = makeEmbeddedId(actorId, index, item.name);
  const result = {
    _id:    id,
    name:   item.name,
    type:   item.type,
    img:    item.img ?? `systems/pf2e/icons/default-icons/${item.type}.svg`,
    system: { ...item.system },
    effects:    [],
    folder:     null,
    sort:       (index + 1) * 100000,
    flags:      { ...(item.flags ?? {}) },
    ownership:  { default: 0 },
    _key:       `!actors.items!${actorId}.${id}`,
  };

  // Rename old module flags
  renameFlags(result.flags);

  // Ensure description is { value, gm }
  if (result.system.description === undefined || result.system.description === null) {
    result.system.description = { value: '', gm: '' };
  } else if (typeof result.system.description === 'string') {
    result.system.description = { value: result.system.description, gm: '' };
  } else {
    result.system.description = {
      value: result.system.description.value ?? '',
      gm:    result.system.description.gm    ?? '',
    };
  }

  // Normalize _migration
  result.system._migration = { version: null, previous: null };

  // Add rules array if missing
  if (!result.system.rules) result.system.rules = [];

  // publication block
  if (!result.system.publication) {
    result.system.publication = { title: '', authors: '', license: 'OGL', remaster: false };
  }

  return result;
}

// Transform a full item-repo Actor document
function transformActor(raw) {
  const slug  = raw.system?.slug ?? raw.name;
  const id    = makeId(slug);

  // Deep-clone
  const actor = JSON.parse(JSON.stringify(raw));

  actor._id  = id;
  actor._key = `!actors!${id}`;
  if (!actor.effects) actor.effects = [];
  delete actor._stats;

  // prototypeToken
  actor.prototypeToken = enrichProtoToken(actor.prototypeToken ?? {}, actor.img);

  const sys = actor.system;

  // Move perception
  if (sys.attributes?.perception?.value !== undefined) {
    sys.perception = {
      details: '',
      mod:     sys.attributes.perception.value,
      senses:  [],
      vision:  true,
    };
    delete sys.attributes.perception;
  }

  // Normalize _migration
  sys._migration = { version: null, previous: null };

  // Normalize resources
  if (!sys.resources) sys.resources = {};

  // Add initiative
  if (!sys.initiative) sys.initiative = { statistic: 'perception' };

  // Move publication into details
  if (sys.publication && !sys.details?.publication) {
    if (!sys.details) sys.details = {};
    sys.details.publication = sys.publication;
    delete sys.publication;
  }
  if (sys.details?.publication) {
    sys.details.publication.title   = 'Mass Effect Compendium';
    sys.details.publication.authors = 'nscarpinatodev';
  }

  // Ensure details has languages, blurb
  if (sys.details) {
    if (!sys.details.languages) sys.details.languages = { value: [], details: '' };
    if (!sys.details.blurb) {
      sys.details.blurb = firstSentence(sys.details.publicNotes ?? '');
    }
  }

  // Transform embedded items
  if (Array.isArray(actor.items)) {
    actor.items = actor.items.map((item, i) => transformEmbeddedItem(item, id, i));
  }

  // Rename any old module flags
  renameFlags(actor.flags);
  renameFlags(actor.items);

  return actor;
}

// Transform an item-repo Item document (armor, weapon, mod)
function transformItem(raw) {
  const slug = raw.system?.slug ?? raw.name;
  const id   = makeId(slug);

  const item = JSON.parse(JSON.stringify(raw));
  item._id  = id;
  item._key = `!items!${id}`;
  if (!item.effects) item.effects = [];
  delete item._stats;

  renameFlags(item.flags);

  return item;
}

// Copy JSON files recursively, skipping names listed in skipSet (without extension)
function copyJsonFiles(srcDir, destDir, skipSet = new Set()) {
  if (!existsSync(srcDir)) { console.warn(`  skip (not found): ${srcDir}`); return 0; }
  mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src  = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyJsonFiles(src, dest, skipSet);
    } else if (entry.name.endsWith('.json')) {
      const stem = basename(entry.name, '.json');
      if (!skipSet.has(stem)) { copyFileSync(src, dest); count++; }
    }
  }
  return count;
}

// ── migrate item-repo Items ───────────────────────────────────────────────

const itemMappings = [
  { src: join(ROOT, 'items/armor'),       dest: join(ROOT, 'src/packs/me-armors') },
  { src: join(ROOT, 'items/armor-mods'),  dest: join(ROOT, 'src/packs/me-armor-mods') },
  { src: join(ROOT, 'items/weapons'),     dest: join(ROOT, 'src/packs/me-weapons') },
  { src: join(ROOT, 'items/weapon-mods'), dest: join(ROOT, 'src/packs/me-weapon-mods') },
];

for (const { src, dest } of itemMappings) {
  const files = readJsonFiles(src);
  for (const { data } of files) {
    const item     = transformItem(data);
    const filename = `${item.system?.slug ?? item.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    writeJson(dest, filename, item);
  }
  console.log(`Items: migrated ${files.length} → ${dest.replace(ROOT, '.')}`);
}

// ── migrate item-repo Actors ──────────────────────────────────────────────

// Enemies that go into me-creatures (everything except cerberus-* humanoids)
const creatureFiles = [
  ...readJsonFiles(join(ROOT, 'actors/enemies/me2')),
  ...readJsonFiles(join(ROOT, 'actors/enemies/me3')).filter(
    ({ path }) => !basename(path, '.json').startsWith('cerberus-')
  ),
];
for (const { data } of creatureFiles) {
  const actor    = transformActor(data);
  const filename = `${actor.system?.slug ?? actor.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  writeJson(join(ROOT, 'src/packs/me-creatures'), filename, actor);
}
console.log(`Actors: migrated ${creatureFiles.length} creatures → src/packs/me-creatures`);

// Cerberus humanoids → me-npcs
const cerberusFiles = readJsonFiles(join(ROOT, 'actors/enemies/me3')).filter(
  ({ path }) => basename(path, '.json').startsWith('cerberus-')
);
for (const { data } of cerberusFiles) {
  const actor    = transformActor(data);
  const filename = `${actor.system?.slug ?? actor.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  writeJson(join(ROOT, 'src/packs/me-npcs'), filename, actor);
}
console.log(`Actors: migrated ${cerberusFiles.length} Cerberus NPCs → src/packs/me-npcs`);

// Vehicles
const vehicleFiles = readJsonFiles(join(ROOT, 'actors/vehicles'));
for (const { data } of vehicleFiles) {
  const actor    = transformActor(data);
  const filename = `${actor.system?.slug ?? actor.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  writeJson(join(ROOT, 'src/packs/me-vehicles'), filename, actor);
}
console.log(`Actors: migrated ${vehicleFiles.length} vehicles → src/packs/me-vehicles`);

// Ships
const shipFiles = readJsonFiles(join(ROOT, 'actors/ships'));
for (const { data } of shipFiles) {
  const actor    = transformActor(data);
  const filename = `${actor.system?.slug ?? actor.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  writeJson(join(ROOT, 'src/packs/me-ships'), filename, actor);
}
console.log(`Actors: migrated ${shipFiles.length} ships → src/packs/me-ships`);

// ── copy actor-ancestry content ───────────────────────────────────────────

const DUPE_CREATURES = new Set([
  'banshee', 'brute', 'cannibal', 'harvester', 'husk',
  'marauder', 'praetorian', 'ravager', 'scion', 'seeker-swarm',
]);
const DUPE_NPCS = new Set(['phantom']);

const ancestryCopies = [
  { src: join(ANCESTRY, 'src/packs/me-ancestries'),     dest: join(ROOT, 'src/packs/me-ancestries'),     skip: new Set() },
  { src: join(ANCESTRY, 'src/packs/me-heritages'),      dest: join(ROOT, 'src/packs/me-heritages'),      skip: new Set() },
  { src: join(ANCESTRY, 'src/packs/me-ancestry-feats'), dest: join(ROOT, 'src/packs/me-ancestry-feats'), skip: new Set() },
  { src: join(ANCESTRY, 'src/packs/me-npcs'),           dest: join(ROOT, 'src/packs/me-npcs'),           skip: DUPE_NPCS },
  { src: join(ANCESTRY, 'src/packs/me-creatures'),      dest: join(ROOT, 'src/packs/me-creatures'),      skip: DUPE_CREATURES },
];

for (const { src, dest, skip } of ancestryCopies) {
  const n = copyJsonFiles(src, dest, skip);
  console.log(`Ancestry: copied ${n} files → ${dest.replace(ROOT, '.')}`);
}

// Copy assets (ancestry images, etc.)
const assetCount = copyJsonFiles(join(ANCESTRY, 'assets'), join(ROOT, 'assets'), new Set());
// Also copy non-JSON assets
function copyAllFiles(srcDir, destDir) {
  if (!existsSync(srcDir)) return 0;
  mkdirSync(destDir, { recursive: true });
  let n = 0;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src  = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) n += copyAllFiles(src, dest);
    else { copyFileSync(src, dest); n++; }
  }
  return n;
}
const imgCount = copyAllFiles(join(ANCESTRY, 'assets'), join(ROOT, 'assets'));
console.log(`Assets: copied ${imgCount} files → assets/`);

console.log('\n✓ Migration complete.');
console.log('Next steps:');
console.log('  1. npm install');
console.log('  2. npm run build');
console.log('  3. Verify pack entry counts');
console.log('  4. Delete items/ actors/ scripts/build.js packs/*.db');
