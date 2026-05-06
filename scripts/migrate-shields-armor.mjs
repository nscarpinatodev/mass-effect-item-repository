// Replaces old per-NPC "Kinetic Barrier" effect items and ad-hoc armour
// effect items across me-npcs, me-creatures, and me-vehicles source JSONs
// with the standardised module items (equipment Kinetic Shield + mods,
// effect Combat Armor Frame).

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

const MODULE_ID  = 'mass-effect-sf2e-conversion';
const PACK_DIRS  = ['src/packs/me-npcs', 'src/packs/me-creatures', 'src/packs/me-vehicles'];

// ── Tier tables ──────────────────────────────────────────────────────────────

const SHIELD_HP_TIERS = [
  { tier: 1, bonus: 10, level: 3,  price: 600,   name: 'Shield HP Mod — Tier 1' },
  { tier: 2, bonus: 20, level: 6,  price: 2500,  name: 'Shield HP Mod — Tier 2' },
  { tier: 3, bonus: 40, level: 9,  price: 7000,  name: 'Shield HP Mod — Tier 3' },
  { tier: 4, bonus: 70, level: 12, price: 16000, name: 'Shield HP Mod — Tier 4' },
];

const SHIELD_REGEN_TIERS = [
  { tier: 1, mult: 1.5, pct: 50,  level: 3,  price: 600,   name: 'Shield Regen Mod — Tier 1' },
  { tier: 2, mult: 2.0, pct: 100, level: 6,  price: 2500,  name: 'Shield Regen Mod — Tier 2' },
  { tier: 3, mult: 2.5, pct: 150, level: 9,  price: 7000,  name: 'Shield Regen Mod — Tier 3' },
  { tier: 4, mult: 3.0, pct: 200, level: 12, price: 16000, name: 'Shield Regen Mod — Tier 4' },
];

const ARMOR_FRAME_TIERS = [
  { tier: 1, name: 'Light Combat Frame',    ap: 20  },
  { tier: 2, name: 'Standard Combat Frame', ap: 50  },
  { tier: 3, name: 'Heavy Combat Frame',    ap: 100 },
  { tier: 4, name: 'Titan Combat Frame',    ap: 200 },
];

function shieldModTierIdx(level) {
  if (level >= 12) return 3;
  if (level >= 9)  return 2;
  if (level >= 6)  return 1;
  if (level >= 3)  return 0;
  return -1;
}

function armorFrameTierIdx(level) {
  if (level >= 13) return 3;
  if (level >= 9)  return 2;
  if (level >= 5)  return 1;
  return 0;
}

// ── Item factories ───────────────────────────────────────────────────────────

function genId() { return randomBytes(8).toString('hex'); }

function makeKineticShield(actorId, sort) {
  const id = genId();
  return {
    _id: id,
    name: 'Kinetic Shield',
    type: 'equipment',
    img: 'icons/magic/defensive/shield-barrier-blue.webp',
    system: {
      slug: 'me-kinetic-shield',
      description: {
        value: '<p>A personal kinetic barrier providing <strong>30 Shield HP</strong>. Recharges <strong>10 HP per turn</strong>.</p>'
          + '<p>Equip <strong>Shield HP</strong> and <strong>Regen</strong> mods to upgrade your barrier. If fully depleted, the wearer must <strong>Take Cover</strong> before the shield will begin recharging.</p>',
        gm: '',
      },
      level:    { value: 1 },
      price:    { value: { sp: 150 } },
      bulk:     { value: 1 },
      equipped: { carryType: 'worn', inSlot: true },
      usage:    { value: 'other' },
      traits:   { value: [], rarity: 'common' },
      rules:    [],
      _migration:  { version: null, previous: null },
      publication: { title: '', authors: '', license: 'OGL', remaster: false },
    },
    effects:   [],
    folder:    null,
    sort,
    flags:     { [MODULE_ID]: { shieldMax: 30, shieldRegen: 10 } },
    ownership: { default: 0 },
    _key: `!actors.items!${actorId}.${id}`,
  };
}

function makeShieldHpMod(actorId, tierIdx, sort) {
  const id = genId();
  const t  = SHIELD_HP_TIERS[tierIdx];
  return {
    _id: id,
    name: t.name,
    type: 'equipment',
    img: 'icons/magic/defensive/shield-barrier-glowing-blue.webp',
    system: {
      slug: `me-shield-hp-mod-t${t.tier}`,
      description: {
        value: `<p>Increases kinetic shield capacity by <strong>+${t.bonus} HP</strong> (base 30 → ${30 + t.bonus}).</p>`
          + '<p>Only one Shield HP Mod can be installed at a time.</p>',
        gm: '',
      },
      level:    { value: t.level },
      price:    { value: { sp: t.price } },
      bulk:     { value: 0 },
      equipped: { carryType: 'worn', inSlot: true },
      usage:    { value: 'other' },
      traits:   { value: [], rarity: 'common' },
      rules:    [],
      _migration:  { version: null, previous: null },
      publication: { title: '', authors: '', license: 'OGL', remaster: false },
    },
    effects:   [],
    folder:    null,
    sort,
    flags:     { [MODULE_ID]: { shieldHpBonus: t.bonus } },
    ownership: { default: 0 },
    _key: `!actors.items!${actorId}.${id}`,
  };
}

function makeShieldRegenMod(actorId, tierIdx, sort) {
  const id = genId();
  const t  = SHIELD_REGEN_TIERS[tierIdx];
  return {
    _id: id,
    name: t.name,
    type: 'equipment',
    img: 'icons/magic/defensive/shield-barrier-flaming-diamond-blue-yellow.webp',
    system: {
      slug: `me-shield-regen-mod-t${t.tier}`,
      description: {
        value: `<p>Boosts kinetic shield recharge rate by <strong>+${t.pct}%</strong> (base 10 → ${Math.round(10 * t.mult)} HP/turn).</p>`
          + '<p>Only one Shield Regen Mod can be installed at a time.</p>',
        gm: '',
      },
      level:    { value: t.level },
      price:    { value: { sp: t.price } },
      bulk:     { value: 0 },
      equipped: { carryType: 'worn', inSlot: true },
      usage:    { value: 'other' },
      traits:   { value: [], rarity: 'common' },
      rules:    [],
      _migration:  { version: null, previous: null },
      publication: { title: '', authors: '', license: 'OGL', remaster: false },
    },
    effects:   [],
    folder:    null,
    sort,
    flags:     { [MODULE_ID]: { regenMult: t.mult } },
    ownership: { default: 0 },
    _key: `!actors.items!${actorId}.${id}`,
  };
}

function makeArmorFrame(actorId, tierIdx, sort) {
  const id = genId();
  const t  = ARMOR_FRAME_TIERS[tierIdx];
  return {
    _id: id,
    name: t.name,
    type: 'effect',
    img: 'modules/mass-effect-sf2e-conversion/assets/img/icons/combat-armor-frame.png',
    system: {
      slug: `me-armor-frame-t${t.tier}`,
      duration:    { value: -1, unit: 'unlimited', expiry: null },
      badge:       { type: 'counter', value: t.ap, max: t.ap, label: 'Armor Points' },
      rules:       [],
      description: { value: '', gm: '' },
      _migration:  { version: null, previous: null },
      publication: { title: '', authors: '', license: 'OGL', remaster: false },
    },
    effects:   [],
    folder:    null,
    sort,
    flags:     { [MODULE_ID]: { armorMax: t.ap, armorCurrent: t.ap } },
    ownership: { default: 0 },
    _key: `!actors.items!${actorId}.${id}`,
  };
}

// ── Main loop ────────────────────────────────────────────────────────────────

let filesUpdated   = 0;
let shieldCount    = 0;
let armorCount     = 0;

for (const packDir of PACK_DIRS) {
  let files;
  try {
    files = await readdir(packDir);
  } catch {
    console.warn(`  skip — ${packDir} not found`);
    continue;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = join(packDir, file);
    let buf = await readFile(filePath);
    if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) buf = buf.slice(3); // strip BOM
    const actor   = JSON.parse(buf.toString('utf8'));
    const level   = actor.system?.details?.level?.value ?? 1;
    const actorId = actor._id;
    let changed   = false;

    // ── Shield replacement ────────────────────────────────────────────────
    const oldShieldItems = actor.items.filter(i => {
      const f = i.flags?.[MODULE_ID];
      return f && (f.shieldMax != null || f.shieldHpBonus != null || f.regenMult != null);
    });

    if (oldShieldItems.length > 0) {
      const baseSort = Math.min(...oldShieldItems.map(i => i.sort ?? 999999));
      actor.items   = actor.items.filter(i => !oldShieldItems.includes(i));

      const tierIdx  = shieldModTierIdx(level);
      const newItems = [makeKineticShield(actorId, baseSort)];
      if (tierIdx >= 0) {
        newItems.push(makeShieldHpMod(actorId, tierIdx, baseSort + 100000));
        newItems.push(makeShieldRegenMod(actorId, tierIdx, baseSort + 200000));
      }
      actor.items.push(...newItems);

      const hpBonus = tierIdx >= 0 ? SHIELD_HP_TIERS[tierIdx].bonus : 0;
      actor.system.attributes.hp.temp = 30 + hpBonus;

      shieldCount++;
      changed = true;
      const modLabel = tierIdx >= 0
        ? `T${tierIdx + 1} mods (${30 + hpBonus} HP, ×${SHIELD_REGEN_TIERS[tierIdx].mult} regen)`
        : 'no mods (30 HP)';
      console.log(`  [L${String(level).padStart(2)}] ${actor.name} — shield → Kinetic Shield + ${modLabel}`);
    }

    // ── Armor replacement ─────────────────────────────────────────────────
    const oldArmorItems = actor.items.filter(i => i.flags?.[MODULE_ID]?.armorMax != null);

    if (oldArmorItems.length > 0) {
      const baseSort = Math.min(...oldArmorItems.map(i => i.sort ?? 999999));
      actor.items   = actor.items.filter(i => !oldArmorItems.includes(i));

      const tierIdx = armorFrameTierIdx(level);
      actor.items.push(makeArmorFrame(actorId, tierIdx, baseSort));

      armorCount++;
      changed = true;
      const t = ARMOR_FRAME_TIERS[tierIdx];
      console.log(`  [L${String(level).padStart(2)}] ${actor.name} — armor → ${t.name} (${t.ap} AP)`);
    }

    if (changed) {
      actor.items.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      await writeFile(filePath, JSON.stringify(actor, null, 2), { encoding: 'utf8' });
      filesUpdated++;
    }
  }
}

console.log(`\n✓ Done. ${filesUpdated} files updated (${shieldCount} shield, ${armorCount} armor replacements).`);
console.log('Run: npm run build');
