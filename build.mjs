import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";

const PACKS = [
  { src: "src/packs/me-ancestries",     dest: "packs/me-ancestries" },
  { src: "src/packs/me-heritages",      dest: "packs/me-heritages" },
  { src: "src/packs/me-ancestry-feats", dest: "packs/me-ancestry-feats" },
  { src: "src/packs/me-backgrounds",    dest: "packs/me-backgrounds" },
  { src: "src/packs/me-npcs",           dest: "packs/me-npcs" },
  { src: "src/packs/me-creatures",      dest: "packs/me-creatures" },
  { src: "src/packs/me-armors",         dest: "packs/me-armors" },
  { src: "src/packs/me-armor-mods",     dest: "packs/me-armor-mods" },
  { src: "src/packs/me-weapons",        dest: "packs/me-weapons" },
  { src: "src/packs/me-weapon-mods",    dest: "packs/me-weapon-mods" },
  { src: "src/packs/me-vehicles",       dest: "packs/me-vehicles" },
  { src: "src/packs/me-ships",          dest: "packs/me-ships" },
  { src: "src/packs/me-shields",        dest: "packs/me-shields" },
  { src: "src/packs/me-ammo-powers",    dest: "packs/me-ammo-powers" },
  { src: "src/packs/me-biotic-powers",  dest: "packs/me-biotic-powers" },
  { src: "src/packs/me-tech-powers",    dest: "packs/me-tech-powers" },
  { src: "src/packs/me-grenades",       dest: "packs/me-grenades" },
  { src: "src/packs/me-items",          dest: "packs/me-items" },
  { src: "src/packs/me-classes",          dest: "packs/me-classes" },
  { src: "src/packs/me-combat-passives",      dest: "packs/me-combat-passives" },
  { src: "src/packs/me-class-progressions",  dest: "packs/me-class-progressions" },
];

const SF2E_PACKS = PACKS.map(({ src, dest }) => ({
  src,
  dest: dest.replace("packs/", "packs/sf2e-"),
}));

for (const { src, dest } of [...PACKS, ...SF2E_PACKS]) {
  try {
    await fs.access(src);
  } catch {
    console.warn(`Skipping ${src} (not found)`);
    continue;
  }
  console.log(`Compiling ${src} → ${dest}`);
  await compilePack(src, dest, { recursive: true });
}

console.log("\n✓ Build complete.");
