/**
 * Downloads replacement images for the 18 CDN URLs that returned 404,
 * then updates all source JSON files to use the new local paths.
 *
 * The original URLs no longer exist on the wiki; this script maps them to
 * current equivalents (renamed/reuploaded files or best-fit substitutes).
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { readdir, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";

const SRC_PACKS = "src/packs";

// Mapping: original failed URL → { newCdnUrl, localPath }
// For substitutes (no exact match found), the comment explains the choice.
const REPLACEMENTS = [
  // Creatures
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/c/c3/ME2_Harbinger_Possessed.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/d/d2/Harbinger_LE2_enemybox.png",
    local: "assets/img/creatures/Harbinger_LE2_enemybox.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/f/f4/ME2_Geth_Trooper.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/7/74/Geth_Trooper_ME2.png",
    local: "assets/img/creatures/Geth_Trooper_ME2.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/3/3e/ME3_Leaper.png",
    // Leaper is a homebrew Reaper humanoid creature; Abomination (already downloaded)
    // is the closest available visual match — small, humanoid, Reaper-made.
    new: null,
    local: "assets/img/creatures/Abomination.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/c/cb/ME3_Phantom.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/4/4d/ME3_Cerberus_Phantom.png",
    local: "assets/img/creatures/ME3_Cerberus_Phantom.png",
  },

  // Ships
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/1/1d/ME3_Alliance_Cruiser.png",
    // Alliance fleet in space battle, ME1 Citadel showdown — clearly shows Alliance cruisers
    new: "https://static.wikia.nocookie.net/masseffect/images/3/38/Citadel_final_battle_-_Arcturus_Fleet_in_action.png",
    local: "assets/img/ships/Citadel_final_battle_-_Arcturus_Fleet_in_action.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/d/d5/ME3_Alliance_Dreadnought.png",
    // Council fleet assembled — the large capital ships are dreadnoughts
    new: "https://static.wikia.nocookie.net/masseffect/images/8/83/Citadel_fleet_2183.png",
    local: "assets/img/ships/Citadel_fleet_2183.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/1/1d/ME3_Alliance_Frigate.png",
    // Alliance fleet arriving at the Citadel — shows the smaller frigates in the fleet
    new: "https://static.wikia.nocookie.net/masseffect/images/4/4f/Citadel_final_battle_-_Arcturus_Fleet_to_the_rescue.png",
    local: "assets/img/ships/Citadel_final_battle_-_Arcturus_Fleet_to_the_rescue.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/9/9e/ME3_Asari_Cruiser.png",
    // Destiny Ascension under attack — the most iconic asari warship in the trilogy
    new: "https://static.wikia.nocookie.net/masseffect/images/0/04/Destiny_Ascension_ME1.png",
    local: "assets/img/ships/Destiny_Ascension_ME1.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/4/4a/ME1_Destiny_Ascension.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/0/04/Destiny_Ascension_ME1.png",
    local: "assets/img/ships/Destiny_Ascension_ME1.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/1/16/ME1_Normandy_SR-1.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/e/e1/Normandy_Render.png",
    local: "assets/img/ships/Normandy_Render.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/2/2c/ME2_Normandy_SR-2.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/1/11/Mass_Effect_Normandy_SR2.png",
    local: "assets/img/ships/Mass_Effect_Normandy_SR2.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/8/8c/ME3_Salarian_Frigate.png",
    // No salarian-specific ship image found on wiki; use turian cruiser front view as
    // a generic Council warship visual (close-up, clearly a warship)
    new: "https://static.wikia.nocookie.net/masseffect/images/3/32/Turian_cruiser_Front.png",
    local: "assets/img/ships/Turian_cruiser_Front.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/5/55/ME3_Turian_Cruiser.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/e/ef/Citadel_final_battle_-_turian_cruiser.png",
    local: "assets/img/ships/Citadel_final_battle_-_turian_cruiser.png",
  },

  // Vehicles
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/2/22/ME3_Atlas_Mech.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/1/16/ME3_Cerberus_Atlas.png",
    local: "assets/img/vehicles/ME3_Cerberus_Atlas.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/e/e8/ME2_Cerberus_Gunship.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/4/48/Mantis.png",
    local: "assets/img/vehicles/Mantis.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/9/99/ME2_Kodiak_Shuttle.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/0/06/ME2_Cerberus_Kodiak_Shuttle.png",
    local: "assets/img/vehicles/ME2_Cerberus_Kodiak_Shuttle.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/3/35/ME1_Mako.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/1/10/Normandy_-_M35_Mako.png",
    local: "assets/img/vehicles/Normandy_-_M35_Mako.png",
  },
  {
    old: "https://static.wikia.nocookie.net/masseffect/images/5/53/ME2_Hammerhead.png",
    new: "https://static.wikia.nocookie.net/masseffect/images/9/90/M-44_Hammerhead_2160p.png",
    local: "assets/img/vehicles/M-44_Hammerhead_2160p.png",
  },
];

// Step 1: Download new images (skip already-downloaded and null new-URLs)
let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const { new: newUrl, local } of REPLACEMENTS) {
  if (!newUrl) {
    console.log(`  reuse  ${local}`);
    skipped++;
    continue;
  }
  if (existsSync(local)) {
    console.log(`  exists ${local}`);
    skipped++;
    continue;
  }
  try {
    const res = await fetch(newUrl);
    if (!res.ok) {
      console.error(`  FAIL ${res.status} ${newUrl}`);
      failed++;
      continue;
    }
    const buf = await res.arrayBuffer();
    writeFileSync(local, Buffer.from(buf));
    console.log(`  +dl    ${local}`);
    downloaded++;
  } catch (err) {
    console.error(`  ERROR ${newUrl}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDownloads: ${downloaded} new, ${skipped} skipped, ${failed} failed`);

// Step 2: Update all source JSON files.
// The previous download script replaced CDN URLs with local module paths using the
// original (now-404) filenames. Here we replace those wrong local paths with the
// correct ones based on the replacement images we just downloaded.
const MODULE_PREFIX = "modules/mass-effect-sf2e-conversion/";
let filesUpdated = 0;
let totalReplacements = 0;

// Build old-local → new-local mapping
const pathFixups = REPLACEMENTS.map(({ old: oldUrl, local: newLocal }) => {
  // Derive the wrong local path the previous script would have written
  const origFilename = oldUrl.split("/").pop();
  const category = newLocal.split("/").slice(0, 3).join("/"); // e.g. assets/img/creatures
  const wrongLocal = `${MODULE_PREFIX}${category}/${origFilename}`;
  const correctLocal = `${MODULE_PREFIX}${newLocal}`;
  return { wrongLocal, correctLocal };
}).filter(({ wrongLocal, correctLocal }) => wrongLocal !== correctLocal);

const packDirs = await readdir(SRC_PACKS);
for (const packName of packDirs) {
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
    let content = await readFile(filePath, "utf8");
    let replacements = 0;
    for (const { wrongLocal, correctLocal } of pathFixups) {
      if (content.includes(wrongLocal)) {
        content = content.split(wrongLocal).join(correctLocal);
        replacements++;
      }
    }
    if (replacements > 0) {
      await writeFile(filePath, content);
      filesUpdated++;
      totalReplacements += replacements;
    }
  }
}

console.log(`Updated ${filesUpdated} source files (${totalReplacements} URL replacements).`);
console.log("\n✓ Done. Run npm run build to recompile.");
