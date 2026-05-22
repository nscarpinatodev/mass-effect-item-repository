// Generates docs/class-compendium.md from source pack JSON files.
// Usage: node scripts/generate-class-docs.mjs

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const SRC = 'src/packs';

async function loadFeat(packDir, filename) {
  const p = join(SRC, packDir, filename);
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}

function htmlToMd(html) {
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/g, '*$1*')
    .replace(/<hr\s*\/?>/g, '\n---\n')
    .replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n')
    .replace(/<ul>([\s\S]*?)<\/ul>/g, '$1')
    .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function actionSymbol(actionType, actions) {
  if (actionType === 'reaction') return ' ↺';
  if (actionType === 'free')     return ' ◇';
  if (actionType === 'passive')  return '';
  if (actions === 1) return ' ◆';
  if (actions === 2) return ' ◆◆';
  if (actions === 3) return ' ◆◆◆';
  return '';
}

function renderFeat(feat) {
  const s = feat.system;
  const level   = s.level.value;
  const sym     = actionSymbol(s.actionType.value, s.actions.value);
  const prereqs = s.prerequisites.value.map(p => p.value).filter(Boolean);
  const desc    = htmlToMd(s.description.value);

  let out = `#### ${feat.name}${sym} — Level ${level}\n`;
  if (prereqs.length) out += `*Prerequisite: ${prereqs.join(', ')}*\n`;
  out += '\n' + desc;
  return out;
}

// ── Class-to-feat mapping ────────────────────────────────────────────────────

const CLASSES = [
  {
    name: 'SOLDIER',
    classFile: ['me-classes', 'soldier.json'],
    masteryChain: [
      ['me-combat-passives', 'soldier-mastery.json'],
      ['me-combat-passives', 'soldier-mastery-improved.json'],
      ['me-combat-passives', 'soldier-mastery-superior.json'],
    ],
    feats: [
      ['me-combat-passives', 'adrenaline-rush.json'],
      ['me-combat-passives', 'adrenaline-rush-improved.json'],
      ['me-combat-passives', 'adrenaline-rush-master.json'],
      ['me-combat-passives', 'concussive-shot.json'],
      ['me-combat-passives', 'concussive-shot-improved.json'],
      ['me-combat-passives', 'concussive-shot-master.json'],
      ['me-combat-passives', 'concussive-shot-volley.json'],
      ['me-combat-passives', 'frag-grenade-feat.json'],
      ['me-ammo-powers',     'incendiary-feat.json'],
      ['me-ammo-powers',     'disruptor-feat.json'],
      ['me-ammo-powers',     'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-ammo-master.json'],
      ['me-class-progressions', 'soldier-heavy-weapon-training.json'],
      ['me-class-progressions', 'soldier-tactical-reload.json'],
      ['me-class-progressions', 'soldier-devastating-rounds.json'],
      ['me-class-progressions', 'soldier-suppressing-fire.json'],
      ['me-class-progressions', 'soldier-battlefield-commander.json'],
      ['me-class-progressions', 'soldier-legendary-combat.json'],
      ['me-class-progressions', 'soldier-war-machine.json'],
    ],
  },
  {
    name: 'ENGINEER',
    classFile: ['me-classes', 'engineer.json'],
    masteryChain: [
      ['me-combat-passives', 'engineer-mastery.json'],
      ['me-combat-passives', 'engineer-mastery-improved.json'],
      ['me-combat-passives', 'engineer-mastery-superior.json'],
    ],
    feats: [
      ['me-tech-powers', 'incinerate-feat.json'],
      ['me-tech-powers', 'overload-feat.json'],
      ['me-tech-powers', 'cryo-blast-feat.json'],
      ['me-tech-powers', 'combat-drone-feat.json'],
      ['me-tech-powers', 'sabotage-feat.json'],
      ['me-tech-powers', 'sentry-turret-feat.json'],
      ['me-class-progressions', 'upgrade-overload.json'],
      ['me-class-progressions', 'upgrade-incinerate.json'],
      ['me-class-progressions', 'upgrade-combat-drone.json'],
      ['me-class-progressions', 'engineer-system-override.json'],
      ['me-class-progressions', 'engineer-tech-field.json'],
      ['me-class-progressions', 'engineer-overload-network.json'],
      ['me-class-progressions', 'engineer-drone-commander.json'],
      ['me-class-progressions', 'engineer-omni-grenade.json'],
      ['me-class-progressions', 'engineer-network-shutdown.json'],
      ['me-class-progressions', 'engineer-apex-engineer.json'],
    ],
  },
  {
    name: 'ADEPT',
    classFile: ['me-classes', 'adept.json'],
    masteryChain: [
      ['me-combat-passives', 'adept-mastery.json'],
      ['me-combat-passives', 'adept-mastery-improved.json'],
      ['me-combat-passives', 'adept-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'throw-feat.json'],
      ['me-biotic-powers', 'pull-feat.json'],
      ['me-biotic-powers', 'shockwave-feat.json'],
      ['me-biotic-powers', 'warp-feat.json'],
      ['me-biotic-powers', 'singularity-feat.json'],
      ['me-biotic-powers', 'cluster-grenade-feat.json'],
      ['me-class-progressions', 'upgrade-warp.json'],
      ['me-class-progressions', 'upgrade-singularity.json'],
      ['me-class-progressions', 'adept-biotic-resonance.json'],
      ['me-class-progressions', 'adept-warp-field.json'],
      ['me-class-progressions', 'adept-gravity-well.json'],
      ['me-class-progressions', 'adept-biotic-cascade.json'],
      ['me-class-progressions', 'adept-dark-matter.json'],
      ['me-class-progressions', 'adept-ascendant-form.json'],
    ],
  },
  {
    name: 'VANGUARD',
    classFile: ['me-classes', 'vanguard.json'],
    masteryChain: [
      ['me-combat-passives', 'vanguard-mastery.json'],
      ['me-combat-passives', 'vanguard-mastery-improved.json'],
      ['me-combat-passives', 'vanguard-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'pull-feat.json'],
      ['me-biotic-powers', 'charge-feat.json'],
      ['me-biotic-powers', 'shockwave-feat.json'],
      ['me-biotic-powers', 'nova-feat.json'],
      ['me-biotic-powers', 'vanguard-rush-feat.json'],
      ['me-ammo-powers',   'incendiary-feat.json'],
      ['me-ammo-powers',   'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-charge.json'],
      ['me-class-progressions', 'upgrade-nova.json'],
      ['me-class-progressions', 'vanguard-unstoppable-charge.json'],
      ['me-class-progressions', 'vanguard-biotic-warrior.json'],
      ['me-class-progressions', 'vanguard-vanguard-strike.json'],
      ['me-class-progressions', 'vanguard-rampage.json'],
      ['me-class-progressions', 'vanguard-deaths-embrace.json'],
      ['me-class-progressions', 'vanguard-apex-vanguard.json'],
    ],
  },
  {
    name: 'INFILTRATOR',
    classFile: ['me-classes', 'infiltrator.json'],
    masteryChain: [
      ['me-combat-passives', 'infiltrator-mastery.json'],
      ['me-combat-passives', 'infiltrator-mastery-improved.json'],
      ['me-combat-passives', 'infiltrator-mastery-superior.json'],
    ],
    feats: [
      ['me-tech-powers', 'incinerate-feat.json'],
      ['me-tech-powers', 'tactical-cloak-feat.json'],
      ['me-tech-powers', 'sabotage-feat.json'],
      ['me-tech-powers', 'sticky-grenade-feat.json'],
      ['me-ammo-powers', 'disruptor-feat.json'],
      ['me-ammo-powers', 'cryo-feat.json'],
      ['me-class-progressions', 'upgrade-incinerate.json'],
      ['me-class-progressions', 'upgrade-tactical-cloak.json'],
      ['me-class-progressions', 'infiltrator-ghost-protocol.json'],
      ['me-class-progressions', 'infiltrator-assassination-protocol.json'],
      ['me-class-progressions', 'infiltrator-hunters-mark.json'],
      ['me-class-progressions', 'infiltrator-phantom-protocol.json'],
      ['me-class-progressions', 'infiltrator-death-from-above.json'],
      ['me-class-progressions', 'infiltrator-apex-infiltrator.json'],
    ],
  },
  {
    name: 'SENTINEL',
    classFile: ['me-classes', 'sentinel.json'],
    masteryChain: [
      ['me-combat-passives', 'sentinel-mastery.json'],
      ['me-combat-passives', 'sentinel-mastery-improved.json'],
      ['me-combat-passives', 'sentinel-mastery-superior.json'],
    ],
    feats: [
      ['me-biotic-powers', 'throw-feat.json'],
      ['me-biotic-powers', 'warp-feat.json'],
      ['me-biotic-powers', 'lift-grenade-feat.json'],
      ['me-tech-powers',   'armor-feat.json'],
      ['me-tech-powers',   'overload-feat.json'],
      ['me-tech-powers',   'cryo-blast-feat.json'],
      ['me-class-progressions', 'upgrade-overload.json'],
      ['me-class-progressions', 'upgrade-warp.json'],
      ['me-class-progressions', 'sentinel-hybrid-core.json'],
      ['me-class-progressions', 'sentinel-adaptive-defense.json'],
      ['me-class-progressions', 'sentinel-interference-field.json'],
      ['me-class-progressions', 'sentinel-battle-hardened.json'],
      ['me-class-progressions', 'sentinel-sentinels-resolve.json'],
      ['me-class-progressions', 'sentinel-apex-sentinel.json'],
    ],
  },
];

// ── General Feats ────────────────────────────────────────────────────────────

const GENERAL_FEATS = [
  ['me-biotic-powers', 'lift-feat.json'],
  ['me-biotic-powers', 'lash-feat.json'],
  ['me-biotic-powers', 'slam-feat.json'],
  ['me-biotic-powers', 'reave-feat.json'],
  ['me-biotic-powers', 'stasis-feat.json'],
  ['me-biotic-powers', 'dark-channel-feat.json'],
  ['me-biotic-powers', 'dominate-feat.json'],
  ['me-biotic-powers', 'flare-feat.json'],
  ['me-tech-powers', 'damping-feat.json'],
  ['me-tech-powers', 'neural-shock-feat.json'],
  ['me-tech-powers', 'geth-shield-boost-feat.json'],
  ['me-tech-powers', 'decoy-feat.json'],
  ['me-tech-powers', 'ai-hacking-feat.json'],
  ['me-tech-powers', 'energy-drain-feat.json'],
  ['me-tech-powers', 'defense-drone-feat.json'],
  ['me-tech-powers', 'defense-matrix-feat.json'],
  ['me-ammo-powers', 'armor-piercing-feat.json'],
  ['me-ammo-powers', 'phasic-feat.json'],
  ['me-ammo-powers', 'shredder-feat.json'],
  ['me-ammo-powers', 'warp-feat.json'],
  ['me-combat-passives', 'fortification.json'],
  ['me-combat-passives', 'fortification-improved.json'],
  ['me-combat-passives', 'fortification-master.json'],
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const lines = [];

  lines.push('# Mass Effect Class Compendium');
  lines.push('');
  lines.push('*Action costs: ◆ = 1 action · ◆◆ = 2 actions · ◆◆◆ = 3 actions · ↺ = reaction · no symbol = passive*');
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const cls of CLASSES) {
    const classFeat = await loadFeat(...cls.classFile);

    // Load mastery chain
    const masteryFeats = [];
    for (const [pack, filename] of (cls.masteryChain ?? [])) {
      try {
        masteryFeats.push(await loadFeat(pack, filename));
      } catch (e) {
        console.warn(`  WARNING: could not load mastery feat ${pack}/${filename}: ${e.message}`);
      }
    }

    // Load class feats
    const feats = [];
    for (const [pack, filename] of cls.feats) {
      try {
        feats.push(await loadFeat(pack, filename));
      } catch (e) {
        console.warn(`  WARNING: could not load ${pack}/${filename}: ${e.message}`);
      }
    }

    feats.sort((a, b) => {
      const d = a.system.level.value - b.system.level.value;
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });

    lines.push(`## ${cls.name}`);
    lines.push('');
    lines.push('### Class Feature');
    lines.push('');
    lines.push(`**${classFeat.name}** *(Level 1)*`);
    lines.push('');
    lines.push(htmlToMd(classFeat.system.description.value));
    lines.push('');
    lines.push('---');
    lines.push('');

    if (masteryFeats.length) {
      lines.push('### Class Mastery');
      lines.push('');
      lines.push('*These features are automatically granted at the indicated levels.*');
      lines.push('');
      for (const feat of masteryFeats) {
        lines.push(renderFeat(feat));
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    lines.push('### Class Feats');
    lines.push('');

    for (const feat of feats) {
      lines.push(renderFeat(feat));
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // General Feats section
  lines.push('## GENERAL FEATS');
  lines.push('');
  lines.push('*Available as bonus powers or to any eligible class.*');
  lines.push('');
  lines.push('---');
  lines.push('');

  const generalFeats = [];
  for (const [pack, filename] of GENERAL_FEATS) {
    try {
      generalFeats.push(await loadFeat(pack, filename));
    } catch (e) {
      console.warn(`  WARNING: could not load general feat ${pack}/${filename}: ${e.message}`);
    }
  }
  generalFeats.sort((a, b) => {
    const d = a.system.level.value - b.system.level.value;
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
  for (const feat of generalFeats) {
    lines.push(renderFeat(feat));
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const output = lines.join('\n');
  await mkdir('docs', { recursive: true });
  await writeFile('docs/class-compendium.md', output, 'utf8');
  console.log(`✓ Wrote docs/class-compendium.md (${output.length.toLocaleString()} chars)`);
}

main().catch(err => { console.error(err); process.exit(1); });
