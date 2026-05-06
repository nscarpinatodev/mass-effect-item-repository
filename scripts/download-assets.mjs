import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { readdir } from "fs/promises";

const PACK_TO_ASSET = {
  "me-weapons":     "assets/img/weapons",
  "me-armors":      "assets/img/armors",
  "me-armor-mods":  "assets/img/armor-mods",
  "me-weapon-mods": "assets/img/weapon-mods",
  "me-creatures":   "assets/img/creatures",
  "me-ships":       "assets/img/ships",
  "me-vehicles":    "assets/img/vehicles",
  "me-npcs":        "assets/img/npcs",
};

const CDN_PREFIX = "https://static.wikia.nocookie.net/masseffect/images/";
const MODULE_PREFIX = "modules/mass-effect-sf2e-conversion/";
const SRC_PACKS = "src/packs";

// Step 1: Build URL → localPath mapping by scanning each pack directory
const urlToLocal = new Map();

for (const [packName, assetDir] of Object.entries(PACK_TO_ASSET)) {
  const packDir = join(SRC_PACKS, packName);
  let files;
  try {
    files = await readdir(packDir);
  } catch {
    continue;
  }
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const content = readFileSync(join(packDir, file), "utf8");
    const matches = content.matchAll(/https:\/\/static\.wikia\.nocookie\.net\/masseffect\/images\/[^"]+/g);
    for (const [url] of matches) {
      if (!urlToLocal.has(url)) {
        const filename = basename(url);
        urlToLocal.set(url, `${assetDir}/${filename}`);
      }
    }
  }
}

console.log(`Found ${urlToLocal.size} unique CDN URLs to download.\n`);

// Step 2: Create directories
const dirs = new Set(Object.values(PACK_TO_ASSET));
for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
}

// Step 3: Download images
let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const [url, localPath] of urlToLocal) {
  if (existsSync(localPath)) {
    skipped++;
    continue;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  FAIL ${res.status} ${url}`);
      failed++;
      continue;
    }
    const buf = await res.arrayBuffer();
    writeFileSync(localPath, Buffer.from(buf));
    console.log(`  downloaded ${localPath}`);
    downloaded++;
  } catch (err) {
    console.error(`  ERROR ${url}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDownloads: ${downloaded} new, ${skipped} skipped, ${failed} failed`);

// Step 4: Update all source JSON files
let filesUpdated = 0;
let totalReplacements = 0;

for (const packName of Object.keys(PACK_TO_ASSET)) {
  const packDir = join(SRC_PACKS, packName);
  let files;
  try {
    files = await readdir(packDir);
  } catch {
    continue;
  }
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = join(packDir, file);
    let content = readFileSync(filePath, "utf8");
    let replacements = 0;
    for (const [url, localPath] of urlToLocal) {
      if (content.includes(url)) {
        const moduleUrl = `${MODULE_PREFIX}${localPath}`;
        content = content.split(url).join(moduleUrl);
        replacements++;
      }
    }
    if (replacements > 0) {
      writeFileSync(filePath, content);
      filesUpdated++;
      totalReplacements += replacements;
    }
  }
}

console.log(`\nUpdated ${filesUpdated} source files (${totalReplacements} URL replacements).`);
console.log("\n✓ Asset download complete.");
