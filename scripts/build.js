/**
 * Compiles source JSON files from items/ into NeDB .db pack files in packs/.
 * Each item gets a deterministic _id derived from its slug so IDs are stable
 * across rebuilds. Run with: npm run build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

/**
 * Generates a stable 16-character Foundry-compatible ID from a slug string.
 */
function makeId(slug) {
  return crypto.createHash('sha256').update(slug).digest('hex').slice(0, 16);
}

/**
 * Recursively reads all .json files under a directory and returns parsed objects.
 */
function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...readJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      results.push(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
    }
  }
  return results;
}

/**
 * Builds a single .db pack file from all JSON items in sourceDir.
 */
function buildPack(sourceDir, outputPath) {
  const items = readJsonFiles(sourceDir);

  if (items.length === 0) {
    console.log(`Skipping ${path.basename(outputPath)}: no source files found`);
    return;
  }

  const slugsSeen = new Set();
  const lines = items.map(item => {
    const slug = item.system?.slug ?? item.name;
    if (slugsSeen.has(slug)) {
      console.warn(`  WARNING: duplicate slug "${slug}" — IDs may collide`);
    }
    slugsSeen.add(slug);
    return JSON.stringify({ ...item, _id: makeId(slug) });
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Built ${path.relative(ROOT, outputPath)}: ${items.length} items`);
}

buildPack(path.join(ROOT, 'items/armor'),       path.join(ROOT, 'packs/me-armors.db'));
buildPack(path.join(ROOT, 'items/armor-mods'),  path.join(ROOT, 'packs/me-armor-mods.db'));
buildPack(path.join(ROOT, 'items/weapons'),     path.join(ROOT, 'packs/me-weapons.db'));
buildPack(path.join(ROOT, 'items/weapon-mods'), path.join(ROOT, 'packs/me-weapon-mods.db'));
