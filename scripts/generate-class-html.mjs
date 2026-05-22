// Generates docs/class-compendium.html from source pack JSON files.
// Usage: node scripts/generate-class-html.mjs

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const SRC = 'src/packs';
const ICONS_DIR = join('docs', 'images', 'actions');

async function loadIconCss() {
  const names = { OneAction: 'one', TwoActions: 'two', ThreeActions: 'three', Reaction: 'reaction', FreeAction: 'free' };
  let css = '';
  for (const [file, key] of Object.entries(names)) {
    const buf = await readFile(join(ICONS_DIR, `${file}.png`));
    const b64 = buf.toString('base64');
    css += `.ai-${key}{background-image:url("data:image/png;base64,${b64}")}\n`;
  }
  return css;
}

let ICON_CSS = '';

function actionImg(key, alt) {
  return `<span class="action-icon ai-${key}" role="img" aria-label="${alt}" title="${alt}"></span>`;
}

const CLASS_COLORS = {
  SOLDIER:     { accent: '#c41e3a', dark: '#8b1429', text: '#fce4e8' },
  ENGINEER:    { accent: '#0369a1', dark: '#024f82', text: '#e0f2fe' },
  ADEPT:       { accent: '#7c3aed', dark: '#5b21b6', text: '#ede9fe' },
  VANGUARD:    { accent: '#9333ea', dark: '#6b21a8', text: '#f3e8ff' },
  INFILTRATOR: { accent: '#0f766e', dark: '#0a5e58', text: '#ccfbf1' },
  SENTINEL:    { accent: '#b45309', dark: '#854000', text: '#fef3c7' },
};

const KEY_ABILITIES = {
  SOLDIER:     'Strength',
  ENGINEER:    'Intelligence',
  ADEPT:       'Charisma',
  VANGUARD:    'Strength',
  INFILTRATOR: 'Dexterity',
  SENTINEL:    'Constitution',
};

const STANDARD_ADVANCEMENT = {
  1:  ['Ancestry Feat', 'Initial Proficiencies'],
  2:  ['Skill Feat'],
  3:  ['General Feat', 'Skill Increase'],
  4:  ['Skill Feat'],
  5:  ['Ancestry Feat', 'Attribute Boosts', 'Skill Increase'],
  6:  ['Skill Feat'],
  7:  ['General Feat', 'Skill Increase'],
  8:  ['Skill Feat'],
  9:  ['Ancestry Feat', 'Skill Increase'],
  10: ['Attribute Boosts', 'Skill Feat'],
  11: ['General Feat', 'Skill Increase'],
  12: ['Skill Feat'],
  13: ['Ancestry Feat', 'Skill Increase'],
  14: ['Skill Feat'],
  15: ['Attribute Boosts', 'General Feat', 'Skill Increase'],
  16: ['Skill Feat'],
  17: ['Ancestry Feat', 'Skill Increase'],
  18: ['Skill Feat'],
  19: ['General Feat', 'Skill Increase'],
  20: ['Attribute Boosts', 'Skill Feat'],
};

const CLASS_PROFICIENCIES = {
  SOLDIER: [
    { group: 'Perception',     items: ['Expert in Perception'] },
    { group: 'Saving Throws',  items: ['Expert in Fortitude', 'Trained in Reflex', 'Trained in Will'] },
    { group: 'Skills',         items: ['Trained in Athletics', 'Trained in a number of additional skills equal to 3 + your Intelligence modifier'] },
    { group: 'Attacks',        items: ['Expert in martial weapons', 'Trained in advanced weapons', 'Trained in unarmed attacks'] },
    { group: 'Defenses',       items: ['Trained in light, medium, and heavy armor'] },
    { group: 'Class DC',       items: ['Trained in Soldier class DC'] },
  ],
  ENGINEER: [
    { group: 'Perception',     items: ['Trained in Perception'] },
    { group: 'Saving Throws',  items: ['Trained in Fortitude', 'Trained in Reflex', 'Expert in Will'] },
    { group: 'Skills',         items: ['Trained in Computers or Engineering (your choice)', 'Trained in a number of additional skills equal to 4 + your Intelligence modifier'] },
    { group: 'Attacks',        items: ['Trained in martial weapons', 'Trained in unarmed attacks'] },
    { group: 'Defenses',       items: ['Trained in light armor'] },
    { group: 'Class DC',       items: ['Trained in Engineer class DC'] },
  ],
  ADEPT: [
    { group: 'Perception',     items: ['Trained in Perception'] },
    { group: 'Saving Throws',  items: ['Expert in Fortitude', 'Trained in Reflex', 'Expert in Will'] },
    { group: 'Skills',         items: ['Trained in a number of skills equal to 3 + your Intelligence modifier'] },
    { group: 'Attacks',        items: ['Trained in simple weapons', 'Trained in unarmed attacks'] },
    { group: 'Defenses',       items: ['Trained in light armor'] },
    { group: 'Class DC',       items: ['Trained in Adept class DC'] },
  ],
  VANGUARD: [
    { group: 'Perception',     items: ['Expert in Perception'] },
    { group: 'Saving Throws',  items: ['Trained in Fortitude', 'Expert in Reflex', 'Trained in Will'] },
    { group: 'Skills',         items: ['Trained in Athletics', 'Trained in a number of additional skills equal to 3 + your Intelligence modifier'] },
    { group: 'Attacks',        items: ['Expert in martial weapons', 'Trained in unarmed attacks'] },
    { group: 'Defenses',       items: ['Trained in light, medium, and heavy armor'] },
    { group: 'Class DC',       items: ['Trained in Vanguard class DC'] },
  ],
  INFILTRATOR: [
    { group: 'Perception',     items: ['Expert in Perception'] },
    { group: 'Saving Throws',  items: ['Trained in Fortitude', 'Expert in Reflex', 'Trained in Will'] },
    { group: 'Skills',         items: ['Trained in Stealth', 'Trained in a number of additional skills equal to 4 + your Intelligence modifier'] },
    { group: 'Attacks',        items: ['Expert in martial weapons', 'Trained in unarmed attacks'] },
    { group: 'Defenses',       items: ['Trained in light and medium armor'] },
    { group: 'Class DC',       items: ['Trained in Infiltrator class DC'] },
  ],
  SENTINEL: [
    { group: 'Perception',     items: ['Trained in Perception'] },
    { group: 'Saving Throws',  items: ['Expert in Fortitude', 'Trained in Reflex', 'Expert in Will'] },
    { group: 'Skills',         items: ['Trained in Medicine', 'Trained in a number of additional skills equal to 3 + your Intelligence modifier'] },
    { group: 'Attacks',        items: ['Trained in martial weapons', 'Trained in unarmed attacks'] },
    { group: 'Defenses',       items: ['Trained in light, medium, and heavy armor'] },
    { group: 'Class DC',       items: ['Trained in Sentinel class DC'] },
  ],
};

const CLASS_ROLEPLAY = {
  SOLDIER: {
    combat:    'You hold the line, laying down suppressive fire to keep enemies pinned while your squad maneuvers. You cycle through ammo powers to exploit weaknesses and close the distance when the moment demands it.',
    social:    'You speak plainly and expect the same in return. Diplomacy has its place, but you\'re quick to note when the enemy isn\'t stopping for negotiations.',
    exploring: 'You take point or watch the rear, weapon at low ready. Cover positions, chokepoints, and potential ambush sites register as naturally as breathing.',
    downtime:  'You drill. Weapon maintenance, combat simulations, and physical conditioning are your routine. You might also spend time mentoring newer soldiers or reviewing after-action reports.',
    youMight: [
      'Approach every obstacle as a tactical problem to be solved with superior firepower and positioning.',
      'Keep your squadmates alive through sheer aggression, believing the best defense is overwhelming offense.',
      'Have strong opinions about weapon loadouts and spend downtime calibrating gear.',
    ],
    othersMight: [
      'Respect your combat instincts but wonder if you ever met a problem you didn\'t want to shoot.',
      'Rely on you to hold the line when everything else falls apart.',
      'Assume you\'re always ready for a fight, even in peacetime.',
    ],
  },
  ENGINEER: {
    combat:    'You stand at the edge of the firefight, deploying tech powers and drones to control the battlefield. You disrupt enemy systems and create openings for allies while staying mobile enough to avoid direct engagement.',
    social:    'You prefer facts over feelings and can get lost in technical tangents. You\'re most valuable when someone needs a rapid assessment of a technical threat.',
    exploring: 'You scan everything. Terminals, access panels, and structural details catch your eye. You often find shortcuts or resources others walk right past.',
    downtime:  'You tinker — upgrading equipment, running diagnostics, writing VI subroutines, or prototyping new tech powers. You maintain detailed logs and schematics of everything you\'ve touched.',
    youMight: [
      'See every mechanical system as a puzzle waiting to be solved and every piece of enemy tech as a potential tool.',
      'Pause mid-firefight to admire elegant engineering before destroying it.',
      'Have strong opinions on power-to-weight ratios and optimal system configurations.',
    ],
    othersMight: [
      'Come to you first when something electronic stops working.',
      'Assume you can hack, override, or disable anything given enough time.',
      'Worry you\'ll start disassembling critical equipment out of curiosity.',
    ],
  },
  ADEPT: {
    combat:    'You are the force multiplier. Singularity and throw clear formations while warp shreds through barriers. You prime targets for biotic detonations and look for the moment the battlefield tips in your favor.',
    social:    'You\'re perceptive about intent — emotions sometimes wash over you through your amp. You navigate social situations with patience and read the room better than most.',
    exploring: 'You sense pressure differentials, structural stresses, and gravitational anomalies that warn of danger ahead. Confined spaces don\'t bother you.',
    downtime:  'You meditate and run biotic exercises that look effortless but require intense focus. You study dark energy theory and push your amp\'s calibration to its limits.',
    youMight: [
      'Feel the dark energy currents around you even in peaceful moments, perceiving the world as a lattice of mass and force.',
      'Trust your biotic instincts when logic says otherwise.',
      'Find combat almost meditative — every throw and warp an expression of who you are.',
    ],
    othersMight: [
      'Watch you nervously in confined spaces, wondering if a biotic surge might happen without warning.',
      'Rely on you to shred through enemy defenses that weapons can\'t touch.',
      'Assume you have a more complicated relationship with your own mortality than most.',
    ],
  },
  VANGUARD: {
    combat:    'You are the opening salvo. Charge carries you directly into enemy formations and your shotgun and nova abilities turn the resulting chaos into opportunity. You leave long-range work to others.',
    social:    'You speak your mind without hesitation and have little patience for prolonged negotiation. You\'re honest — sometimes brutally so — and people trust you because of it.',
    exploring: 'You move aggressively through space, comfortable with closeness and proximity that makes others nervous. You\'re often first through the door.',
    downtime:  'You push your physical limits constantly — sparring, conditioning, drilling the muscle memory of combat. You study enemy tactics looking for new angles for Charge.',
    youMight: [
      'Judge every situation by whether to charge in or wait for the perfect moment — and almost always charge.',
      'Feed off the chaos of close-quarters fighting where biotics and a shotgun are the only things that matter.',
      'Run toward gunfire as a reflex rather than a decision.',
    ],
    othersMight: [
      'Worry you\'ll get yourself killed doing something reckless — then watch you emerge from the wreckage unscathed.',
      'Rely on you to break up defensive formations no one else can crack.',
      'Assume your survival instincts are entirely optional to you.',
    ],
  },
  INFILTRATOR: {
    combat:    'You find high ground, eliminate priority targets with precision, and keep enemies off-balance with tech powers and tactical cloak. You engage and disengage faster than anyone can track.',
    social:    'You\'re observant and economical with words. You notice inconsistencies others miss and file them away. You can be charming when needed, but it\'s always a tool.',
    exploring: 'You move quietly and efficiently, gathering information before committing to a path. Guard patterns, camera positions, and emergency exits register automatically.',
    downtime:  'You clean and calibrate weapons with near-ritualistic precision. You review mission data, run scenarios in your head, and prepare for situations you hope never happen.',
    youMight: [
      'See every room as a set of angles, lines of sight, and kill zones before noticing the furniture.',
      'Keep your own counsel — information is ammunition, and you don\'t share either carelessly.',
      'Trust your own assessment over anyone else\'s intel.',
    ],
    othersMight: [
      'Appreciate your precision but find your silences unnerving.',
      'Assume you know things you\'re not sharing.',
      'Rely on you to gather intelligence no one else could safely obtain.',
    ],
  },
  SENTINEL: {
    combat:    'You hold position under fire, using tech armor, overload, and biotic powers to deny ground and protect allies. You don\'t charge — you hold, counter, and let enemies break themselves against you.',
    social:    'You listen more than you talk. When you do share an opinion it\'s measured and well-reasoned. People look to you when they want an honest assessment without emotional noise.',
    exploring: 'You\'re methodical and thorough. You check for hazards, verify exits, and establish fallback positions before the squad moves forward.',
    downtime:  'You review defensive protocols, run threat simulations, and calibrate your medical kit. You want every system performing optimally when it counts.',
    youMight: [
      'Hold the line when everyone else is pulling back, trusting your armor and training to absorb what others can\'t.',
      'Resist surrendering tactical initiative even when the numbers say you should.',
      'Feel personally responsible when a teammate takes damage you could have prevented.',
    ],
    othersMight: [
      'Rely on you as the immovable anchor of any engagement.',
      'Assume your defensive systems can absorb more punishment than any one person should.',
      'Trust you with the rear guard or the most exposed position without hesitation.',
    ],
  },
};

const CLASS_FEAT_LEVELS = new Set([1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);

async function loadFeat(packDir, filename) {
  const p = join(SRC, packDir, filename);
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}


function actionSymbol(actionType, actions) {
  if (actionType === 'reaction') return actionImg('reaction',  'Reaction');
  if (actionType === 'free')     return actionImg('free',      'Free Action');
  if (actionType === 'passive')  return null;
  if (actions === 1)             return actionImg('one',       'One Action');
  if (actions === 2)             return actionImg('two',       'Two Actions');
  if (actions === 3)             return actionImg('three',     'Three Actions');
  return null;
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function ordinal(n) {
  if (n === 1)  return '1ST';
  if (n === 2)  return '2ND';
  if (n === 3)  return '3RD';
  if (n === 21) return '21ST';
  if (n === 22) return '22ND';
  if (n === 23) return '23RD';
  return `${n}TH`;
}

function parseClassDescription(html) {
  const [before = '', after = ''] = html.split(/<hr\s*\/?>/i);
  const paras = [...before.matchAll(/<p>([\s\S]*?)<\/p>/g)];
  const flavor = paras[0] ? paras[0][1].replace(/<[^>]+>/g, '').trim() : '';
  const bonus  = paras[1] ? paras[1][0] : '';
  const mechanics = [...after.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[0]);
  return { flavor, bonus, mechanics };
}

function renderFeatEntry(feat) {
  const s = feat.system;
  const sym    = actionSymbol(s.actionType.value, s.actions.value);
  const traits = (s.traits?.value || []).filter(t => t && t !== 'common');
  const prereqs = s.prerequisites.value.map(p => p.value).filter(Boolean);

  const symHtml = sym
    ? `<span class="feat-action-sym">${sym}</span>`
    : '';
  const traitsHtml = traits.length
    ? `<div class="feat-traits">${traits.map(t => `<span class="trait-badge">${t}</span>`).join('')}</div>`
    : '';
  const prereqHtml = prereqs.length
    ? `<p class="feat-prereq"><em>Prerequisites:</em> ${prereqs.join(', ')}</p>`
    : '';

  return `<div class="feat-entry">
  <div class="feat-header">
    <div class="feat-name-line">
      <span class="feat-name">${feat.name}</span>${symHtml}
    </div>
    <div class="feat-level-badge">FEAT ${s.level.value}</div>
  </div>
  ${traitsHtml}${prereqHtml}<div class="feat-description">${s.description.value}</div>
</div>`;
}

function buildAdvancementTable(progressionFeats, classFeatureName, masteryFeats = []) {
  const byLevel = new Map();
  for (const feat of masteryFeats) {
    const lvl = feat.system.level.value;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl).push(`<strong>${feat.name}</strong>`);
  }
  for (const feat of progressionFeats) {
    const lvl = feat.system.level.value;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl).push(feat.name);
  }

  let rows = '';
  for (let lvl = 1; lvl <= 20; lvl++) {
    const named = byLevel.get(lvl) || [];
    const std = STANDARD_ADVANCEMENT[lvl] || [];
    const parts = [];
    if (lvl === 1) parts.push(`<em>${classFeatureName ?? 'Class Feature'}</em>`);
    parts.push(...named);
    if (CLASS_FEAT_LEVELS.has(lvl)) parts.push('Class Feat');
    parts.push(...std.map(s => `<span class="adv-std">${s}</span>`));
    const cell = parts.length ? parts.join(', ') : '—';
    const rowClass = lvl % 2 === 0 ? ' class="even-row"' : '';
    rows += `<tr${rowClass}><td class="adv-level">${lvl}</td><td>${cell}</td></tr>`;
  }
  return `<table class="advancement-table">
  <thead><tr><th>Level</th><th>Class Features</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function renderSidebar(cls) {
  const classOrder = ['SOLDIER', 'ENGINEER', 'ADEPT', 'VANGUARD', 'INFILTRATOR', 'SENTINEL'];
  const clsIndex = classOrder.indexOf(cls.name) + 1;
  const navItems = classOrder.map(name => {
    const active = name === cls.name;
    return `<a href="#${name.toLowerCase()}" class="sidebar-item${active ? ' sidebar-active' : ''}">${name}</a>`;
  }).join('');
  return `<aside class="class-sidebar">
  <div class="sidebar-badge">${clsIndex}</div>
  <div class="sidebar-label">MASS EFFECT</div>
  <div class="sidebar-section-label">CLASSES</div>
  <nav class="sidebar-nav">${navItems}</nav>
</aside>`;
}

function buildFeatColumns(flatItems, darkColor, accentColor) {
  const bg = darkColor && accentColor
    ? `background:linear-gradient(to right,${darkColor},${accentColor})`
    : 'background:linear-gradient(to right,#2d3748,#4a5568)';
  let html = '';
  let curLevel = null;
  for (const { feat, level } of flatItems) {
    if (level !== curLevel) {
      curLevel = level;
      html += `<div class="level-header-bar" style="${bg}"><span>${ordinal(level)} LEVEL</span></div>`;
    }
    html += renderFeatEntry(feat);
  }
  return `<div class="feats-columns">${html}</div>`;
}

function renderProficiencies(className) {
  const profs = CLASS_PROFICIENCIES[className];
  if (!profs) return '';
  const groups = profs.map(({ group, items }) => {
    const itemsHtml = items.map(i => `<div class="prof-item">${i}</div>`).join('');
    return `<div class="prof-group"><div class="prof-group-name">${group}</div>${itemsHtml}</div>`;
  }).join('');
  return `<div class="proficiency-block"><div class="prof-section-title">Initial Proficiencies</div>${groups}</div>`;
}

function renderRoleplay(className) {
  const rp = CLASS_ROLEPLAY[className];
  if (!rp) return '';
  const ctxKeys = [['combat', 'During Combat'], ['social', 'During Social Encounters'], ['exploring', 'While Exploring'], ['downtime', 'In Downtime']];
  const contextHtml = ctxKeys
    .filter(([k]) => rp[k])
    .map(([k, label]) => `<div class="roleplay-item"><span class="roleplay-context">${label}.</span> ${rp[k]}</div>`)
    .join('');
  const mightHtml = rp.youMight
    ? `<div class="might-block"><div class="might-title">You Might...</div><ul class="might-list">${rp.youMight.map(i => `<li>${i}</li>`).join('')}</ul></div>`
    : '';
  const otherHtml = rp.othersMight
    ? `<div class="might-block"><div class="might-title">Others Probably...</div><ul class="might-list">${rp.othersMight.map(i => `<li>${i}</li>`).join('')}</ul></div>`
    : '';
  return `<div class="roleplay-section"><div class="roleplay-header">Roleplaying the ${titleCase(className)}</div>${contextHtml}${mightHtml}${otherHtml}</div>`;
}

function renderClass(cls, classFeat, allFeats, progressionFeats, masteryFeats) {
  const colors = CLASS_COLORS[cls.name];
  const keyAbility = KEY_ABILITIES[cls.name] ?? '';
  const { flavor, bonus, mechanics } = parseClassDescription(classFeat.system.description.value);

  const featsByLevel = new Map();
  for (const feat of allFeats) {
    const lvl = feat.system.level.value;
    if (!featsByLevel.has(lvl)) featsByLevel.set(lvl, []);
    featsByLevel.get(lvl).push(feat);
  }
  const levels = [...featsByLevel.keys()].sort((a, b) => a - b);

  const flatFeats = [];
  for (const level of levels) {
    const sorted = [...featsByLevel.get(level)].sort((a, b) => a.name.localeCompare(b.name));
    for (const feat of sorted) flatFeats.push({ feat, level });
  }
  const featColumns = buildFeatColumns(flatFeats, colors.dark, colors.accent);

  const masteryItems = (masteryFeats ?? []).map(f => ({ feat: f, level: f.system.level.value }));
  const masteryColumns = masteryItems.length
    ? buildFeatColumns(masteryItems, colors.dark, colors.accent)
    : '';

  const keyAbilityHtml = keyAbility
    ? `<div class="class-stat-box class-stat-key"><span class="stat-label">Key Ability Score</span><div class="stat-value stat-value-key">${keyAbility}</div></div>`
    : '';

  const bonusHtml = bonus
    ? `<div class="class-stat-box"><span class="stat-label">Hit Points</span><div class="stat-value">${bonus.replace(/<\/?p>/g, '')}</div></div>`
    : '';

  const mechItems = mechanics.map(m => {
    const labelMatch = m.match(/<strong>([\s\S]*?)<\/strong>/);
    const label = labelMatch ? labelMatch[1].replace(/:$/, '') : null;
    const body = label
      ? m.replace(/<strong>[\s\S]*?<\/strong>:?\s*/, '').replace(/<\/?p>/g, '').trim()
      : m.replace(/<\/?p>/g, '').trim();
    if (label) return `<div class="mech-item"><span class="mech-label">${label}</span><span class="mech-value">${body}</span></div>`;
    return `<div class="mech-item"><span class="mech-value">${body}</span></div>`;
  }).join('');

  const masterySection = masteryColumns
    ? `\n  <h3 class="section-bar" style="background:#0f2034">Class Mastery</h3>
  <p class="mastery-note">These features are automatically granted at the indicated levels — they are not chosen from the feat list.</p>
  <div class="feats-area">
${masteryColumns}  </div>`
    : '';

  return `<section class="class-section" id="${cls.name.toLowerCase()}">
<div class="class-main">
  <div class="class-name-bar">
    <div class="header-accent-lines"></div>
    <div class="header-content">
      <div>
        <h2 class="class-name">${titleCase(cls.name)}</h2>
        <p class="class-tagline">${classFeat.name}</p>
      </div>
    </div>
  </div>
  <p class="class-flavor">${flavor}</p>

  <div class="class-info-grid">
    <div class="class-stats-col">
      ${keyAbilityHtml}
      ${bonusHtml}
      ${renderProficiencies(cls.name)}
      <div class="class-feat-note">Class feats available at levels: 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20</div>
    </div>
    <div class="class-mechanics-col">${mechItems}${renderRoleplay(cls.name)}</div>
  </div>

  <h3 class="section-bar" style="background:#0f2034">Advancement</h3>
  ${buildAdvancementTable(progressionFeats, classFeat.name, masteryFeats ?? [])}
${masterySection}
  <h3 class="section-bar" style="background:#0f2034">Class Feats</h3>
  <div class="action-key">
    ${actionImg('one',      'One Action')} 1 action &nbsp;·&nbsp;
    ${actionImg('two',      'Two Actions')} 2 actions &nbsp;·&nbsp;
    ${actionImg('three',    'Three Actions')} 3 actions &nbsp;·&nbsp;
    ${actionImg('reaction', 'Reaction')} reaction &nbsp;·&nbsp;
    ${actionImg('free',     'Free Action')} free action &nbsp;·&nbsp;
    no icon = passive
  </div>
  <div class="feats-area">
${featColumns}  </div>
</div>
</section>`;
}

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
@font-face{font-family:'Korataki';src:url('fonts/Korataki-Regular.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'MyriadPro';src:url('fonts/MyriadPro-Regular.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'Slider';src:url('fonts/Slider-Regular.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'GoodOT';src:url('fonts/GoodOT.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'GoodOT';src:url('fonts/GoodOT-Bold.woff2') format('woff2');font-weight:700;font-style:normal}
@font-face{font-family:'GoodOT';src:url('fonts/GoodOT-Italic.woff2') format('woff2');font-weight:400;font-style:italic}
@font-face{font-family:'GoodOT-Cond';src:url('fonts/GoodOT-Cond.woff2') format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'GoodOT-Cond';src:url('fonts/GoodOT-CondBold.woff2') format('woff2');font-weight:700;font-style:normal}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

body{
  font-family:'MyriadPro',sans-serif;
  font-size:9pt;
  line-height:1.5;
  color:#1a1a2e;
  background:#ffffff;
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
}

/* N7 stripe — right side, repeats on every PDF page */
.n7-stripe{
  position:fixed;
  top:0;bottom:0;right:0;
  width:62px;
  z-index:10;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:space-between;
  padding:10px 0 10px;
  background:linear-gradient(to right,
    #0d0f1a 0 11px,
    #dcdcdc 11px 13.5px,
    #b91c2a 13.5px 48.5px,
    #dcdcdc 48.5px 51px,
    #0d0f1a 51px 62px
  );
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
}
.n7-badge{
  width:38px;
  height:38px;
  flex-shrink:0;
}
.n7-badge img{
  width:100%;
  height:100%;
  object-fit:contain;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,0.9)) drop-shadow(0 0 3px rgba(0,0,0,0.7));
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
}
.n7-label{
  writing-mode:vertical-rl;
  transform:rotate(180deg);
  font-family:'Korataki',sans-serif;
  font-size:1.3rem;
  letter-spacing:0.35em;
  color:#ffffff;
  text-shadow:0 0 10px rgba(196,30,58,0.9),0 0 20px rgba(196,30,58,0.5);
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
}

.page-wrap{
  max-width:1140px;
  margin:0 auto;
  padding:2rem 80px 2rem 1.5rem;
}

/* ── Title Page ──────────────────────────────────────────── */
.title-page{
  text-align:center;
  padding:5rem 2rem 4rem;
  background:rgba(15,32,52,0.92);
  color:#ffffff;
  margin-bottom:2.5rem;
  page-break-after:always;
}
.title-logo{
  max-width:420px;
  width:80%;
  margin-bottom:1rem;
}
.title-page .title-sub{
  font-family:'Slider',sans-serif;
  font-weight:400;
  font-size:1.4rem;
  letter-spacing:0.2em;
  text-transform:uppercase;
  color:#4a9ed6;
  margin-bottom:2rem;
}
.title-page .title-rule{
  width:8rem;
  height:3px;
  background:#4a9ed6;
  margin:0 auto 2rem;
}
.title-page .title-body{
  font-style:italic;
  font-size:1.1rem;
  max-width:500px;
  margin:0 auto;
  color:#c8d8e8;
  line-height:1.6;
}

/* ── TOC ─────────────────────────────────────────────────── */
.toc{
  background:#ffffff;
  border:1px solid #cbd5e0;
  padding:2rem;
  margin-bottom:3rem;
  page-break-after:always;
}
.toc h2{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:1.4rem;
  letter-spacing:0.12em;
  text-transform:uppercase;
  color:#0f2034;
  border-bottom:3px solid #0f2034;
  padding-bottom:0.4rem;
  margin-bottom:1.25rem;
}
.toc-list{
  display:flex;
  flex-direction:column;
  gap:0.5rem;
}
.toc-entry{
  display:flex;
  align-items:baseline;
  gap:0.5rem;
}
.toc-dot{
  flex:1;
  border-bottom:1px dotted #a0aec0;
}
.toc-entry a{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:1.1rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  text-decoration:none;
  color:#0f2034;
  white-space:nowrap;
}
.toc-entry a:hover{color:#4a9ed6}
.toc-pg{
  font-family:'Slider',sans-serif;
  font-size:0.9rem;
  font-weight:700;
  color:#0f2034;
  white-space:nowrap;
}

/* ── General Feats Section ───────────────────────────────── */
.general-section{
  margin-bottom:2.5rem;
  page-break-before:always;
  overflow:hidden;
}
.general-section .class-main{
  background:#ffffff;
}
.general-pack-header{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:0.95rem;
  text-transform:uppercase;
  color:#ffffff;
  background:#2d3748;
  padding:0.35rem 0.75rem;
  margin:0.75rem 0 0;
  break-after:avoid;
  page-break-after:avoid;
}

/* ── Class Section ───────────────────────────────────────── */
.class-section{
  margin-bottom:2.5rem;
  page-break-before:always;
  overflow:hidden;
}
.class-main{
  background:#ffffff;
  display:flex;
  flex-direction:column;
}

/* ── Class Header Bar (SF2e texture) ─────────────────────── */
.class-name-bar{
  background-image:url(images/sf2e-class-header.jpg);
  background-size:cover;
  background-position:center;
  position:relative;
  padding:1.25rem 2rem 1rem;
  overflow:hidden;
}
.header-accent-lines{
  position:absolute;
  top:0;left:0;right:0;
  height:5px;
  background:linear-gradient(to right,
    #4dd9d9 0%, #4dd9d9 50%,
    #d94499 50%, #d94499 100%);
}
.header-content{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  position:relative;
  z-index:1;
}
.class-name{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:2.55rem;
  text-transform:uppercase;
  color:#ffffff;
  line-height:0.9;
  margin:0;
}
.class-tagline{
  font-family:'Slider',sans-serif;
  font-weight:400;
  font-size:1rem;
  letter-spacing:0.15em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.65);
  margin-top:0.3rem;
}
.header-chapter{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.7rem;
  letter-spacing:0.18em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.5);
  align-self:flex-start;
  padding-top:0.25rem;
}


.class-flavor{
  font-style:italic;
  font-size:0.9rem;
  text-align:center;
  color:#2d3748;
  padding:1rem 3rem;
  background:#f7fafc;
  border-bottom:1px solid #e2e8f0;
  line-height:1.6;
}

/* ── Class Info Grid ─────────────────────────────────────── */
.class-info-grid{
  display:grid;
  grid-template-columns:220px 1fr;
  gap:0;
  border-bottom:1px solid #e2e8f0;
}
.class-stats-col{
  background:#f0f4f8;
  padding:1.25rem;
  border-right:1px solid #e2e8f0;
  display:flex;
  flex-direction:column;
  gap:0.75rem;
}
.class-stat-box{
  background:#ffffff;
  border:1px solid #e2e8f0;
  border-radius:4px;
  padding:0.6rem 0.75rem;
}
.stat-label{
  display:block;
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.7rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:#718096;
  margin-bottom:0.2rem;
}
.stat-value{
  font-size:0.77rem;
  color:#1a1a2e;
}
.stat-value strong{color:#0f2034}
.class-stat-key{border-left:3px solid #4a9ed6}
.stat-value-key{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.9rem;
  color:#0f2034;
  text-transform:uppercase;
  letter-spacing:0.04em;
}
.class-feat-note{
  font-size:0.68rem;
  color:#718096;
  font-style:italic;
  line-height:1.4;
}

.class-mechanics-col{
  padding:1.25rem 1.5rem;
  display:flex;
  flex-direction:column;
  gap:0.4rem;
}
.mech-item{
  font-size:0.8rem;
  line-height:1.5;
}
.mech-label{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.77rem;
  letter-spacing:0.04em;
  text-transform:uppercase;
  color:#0f2034;
  margin-right:0.4rem;
}
.mech-value{
  color:#2d3748;
}
.mech-value em{color:#4a5568;font-style:italic}
.mech-value strong{color:#0f2034;font-weight:600}

/* ── Section Bar ─────────────────────────────────────────── */
.section-bar{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:0.9rem;
  text-transform:uppercase;
  color:#ffffff;
  padding:0.4rem 1.5rem;
  margin:0;
  break-after:avoid;
  page-break-after:avoid;
}

/* ── Advancement Table ───────────────────────────────────── */
.advancement-table{
  width:100%;
  border-collapse:collapse;
  font-size:0.74rem;
}
.advancement-table thead{
  background:#2d3748;
  color:#ffffff;
  font-family:'Korataki',sans-serif;
  font-size:0.78rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
}
.advancement-table th{
  padding:0.35rem 0.75rem;
  text-align:left;
}
.advancement-table td{
  padding:0.22rem 0.75rem;
  border-bottom:1px solid #e2e8f0;
  vertical-align:top;
}
.even-row{background:#f7fafc}
.adv-level{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  width:3.5rem;
  text-align:center;
  color:#0f2034;
}
.adv-std{color:#a0aec0;font-style:italic}

/* ── Action Key ──────────────────────────────────────────── */
.action-key{
  font-family:'GoodOT-Cond',sans-serif;
  font-size:0.71rem;
  letter-spacing:0.05em;
  color:#718096;
  padding:0.4rem 1.5rem;
  background:#f7fafc;
  border-bottom:1px solid #e2e8f0;
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:0.2rem;
}
.action-key .action-icon{width:1em;height:1em;top:0}

/* ── Level Group + Two-Column Feat Layout ────────────────── */
.level-group{
  margin-top:0.25rem;
}
.feats-columns{
  column-count:2;
  column-gap:0.6rem;
  padding:0.75rem;
}

.level-header-bar{
  color:#ffffff;
  font-family:'MyriadPro',sans-serif;
  font-weight:400;
  font-size:0.72rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  padding:0.3rem 0.75rem;
  margin:0;
  break-after:avoid;
  page-break-after:avoid;
}

/* ── Feat Entry ──────────────────────────────────────────── */
.feat-entry{
  break-inside:avoid;
  page-break-inside:avoid;
  margin:0 0 0.6rem 0;
  padding:0.5rem 0.6rem;
  border:1px solid #e2e8f0;
  border-radius:4px;
  background:#ffffff;
  display:block;
}
.feat-header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:0.4rem;
  margin-bottom:0.15rem;
}
.feat-name-line{
  display:flex;
  align-items:center;
  gap:0.3rem;
  flex:1;
  flex-wrap:wrap;
}
.feat-name{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.97rem;
  text-transform:uppercase;
  letter-spacing:0.04em;
  color:#0f2034;
}
.feat-action-sym{display:inline-flex;align-items:center;gap:0.15rem;margin-left:0.2rem}
.action-icon{
  display:inline-block;
  width:1.1em;
  height:1.1em;
  background-size:contain;
  background-repeat:no-repeat;
  background-position:center;
  vertical-align:middle;
  position:relative;
  top:-0.06em;
  flex-shrink:0;
}
.feat-level-badge{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.67rem;
  letter-spacing:0.07em;
  text-transform:uppercase;
  background:#0f2034;
  color:#ffffff;
  padding:0.12rem 0.4rem;
  border-radius:3px;
  white-space:nowrap;
  flex-shrink:0;
}
.feat-traits{
  display:flex;
  flex-wrap:wrap;
  gap:0.2rem;
  margin:0.2rem 0;
}
.trait-badge{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:600;
  font-size:0.67rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  background:#4a9ed6;
  color:#ffffff;
  padding:0.1rem 0.35rem;
  border-radius:3px;
}
.feat-prereq{
  font-size:0.72rem;
  color:#4a5568;
  margin:0.15rem 0;
}
.feat-description{
  font-size:0.71rem;
  line-height:1.5;
  color:#1a1a2e;
}
.feat-description p{margin:0.2rem 0}
.feat-description p:first-child{margin-top:0}
.feat-description strong{font-weight:600;color:#0f2034}
.feat-description em{color:#4a5568}
.feat-description ul{margin:0.2rem 0 0.2rem 1.2rem;padding:0}
.feat-description li{margin:0.1rem 0}

/* ── Proficiency Block ───────────────────────────────────── */
.proficiency-block{
  background:#ffffff;
  border:1px solid #e2e8f0;
  border-radius:4px;
  padding:0.5rem 0.75rem;
}
.prof-section-title{
  font-family:'Slider',sans-serif;
  font-weight:700;
  font-size:0.7rem;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:#0f2034;
  border-bottom:2px solid #0f2034;
  margin-bottom:0.4rem;
  padding-bottom:0.15rem;
}
.prof-group{margin-bottom:0.25rem}
.prof-group-name{
  font-family:'GoodOT-Cond',sans-serif;
  font-weight:700;
  font-size:0.67rem;
  letter-spacing:0.06em;
  text-transform:uppercase;
  color:#4a5568;
  margin-top:0.15rem;
}
.prof-item{
  font-size:0.74rem;
  color:#1a1a2e;
  padding-left:0.5rem;
  line-height:1.35;
}

/* ── Mastery Chain Note ──────────────────────────────────── */
.mastery-note{
  font-size:0.72rem;
  color:#4a5568;
  font-style:italic;
  margin-bottom:0.5rem;
}

/* ── Roleplay Section ────────────────────────────────────── */
.roleplay-section{
  margin-top:0.75rem;
  padding-top:0.6rem;
  border-top:1px solid #e2e8f0;
}
.roleplay-header{
  font-family:'Korataki',sans-serif;
  font-weight:400;
  font-size:0.75rem;
  text-transform:uppercase;
  letter-spacing:0.12em;
  color:#0f2034;
  margin-bottom:0.35rem;
}
.roleplay-item{
  font-size:0.72rem;
  line-height:1.45;
  margin-bottom:0.25rem;
}
.roleplay-context{
  font-family:'GoodOT',sans-serif;
  font-weight:700;
  font-size:0.72rem;
  color:#0f2034;
  margin-right:0.25rem;
}
.might-block{margin-top:0.35rem}
.might-title{
  font-family:'GoodOT',sans-serif;
  font-weight:700;
  font-size:0.72rem;
  color:#0f2034;
  margin-top:0.25rem;
}
.might-list{
  margin:0.1rem 0 0 1rem;
  padding:0;
}
.might-list li{
  font-size:0.71rem;
  color:#2d3748;
  line-height:1.4;
  margin:0.08rem 0;
}

/* ── Print ───────────────────────────────────────────────── */
@media print{
  body{
    font-size:7.5pt;
    print-color-adjust:exact;
    -webkit-print-color-adjust:exact;
  }
  .n7-stripe{
    print-color-adjust:exact;
    -webkit-print-color-adjust:exact;
  }
  .page-wrap{padding:0 80px 0 1.5rem;max-width:none}
  .class-section{page-break-before:always}
  .class-name-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .class-sidebar{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .title-page{page-break-after:always}
  .toc{page-break-after:always}
  .feat-entry{border-color:#ccc;break-inside:avoid;page-break-inside:avoid}
  .advancement-table{break-inside:avoid;page-break-inside:avoid}
  a{color:inherit;text-decoration:none}
  .feats-columns{column-gap:0}
}
`;

// ── Class-to-feat mapping ──────────────────────────────────────────────────────

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

// ── General Feats section renderer ────────────────────────────────────────────

function renderGeneralSection(featsByPack) {
  // featsByPack: Map of packLabel -> sorted feat array
  let body = '';
  for (const [packLabel, feats] of featsByPack) {
    const sorted = [...feats].sort((a, b) => {
      const d = a.system.level.value - b.system.level.value;
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });
    const items = sorted.map(feat => ({ feat, level: feat.system.level.value }));
    body += `<h3 class="general-pack-header">${packLabel}</h3>\n`;
    body += buildFeatColumns(items, null, null);
  }

  return `<section class="general-section" id="general-feats">
<div class="class-main">
  <div class="class-name-bar">
    <div class="header-accent-lines"></div>
    <div class="header-content">
      <div>
        <h2 class="class-name">General Feats</h2>
        <p class="class-tagline">Available to multiple classes</p>
      </div>
    </div>
  </div>
  <p class="class-flavor">These feats appear on the feat lists of two or more classes. Any class that lists them may take them at the appropriate level.</p>
  ${body}
</div>
</section>`;
}

// ── General Feats (powers not assigned to any class) ──────────────────────────

const GENERAL_FEATS = [
  // Biotic Powers
  ['me-biotic-powers', 'lift-feat.json'],
  ['me-biotic-powers', 'lash-feat.json'],
  ['me-biotic-powers', 'slam-feat.json'],
  ['me-biotic-powers', 'reave-feat.json'],
  ['me-biotic-powers', 'stasis-feat.json'],
  ['me-biotic-powers', 'dark-channel-feat.json'],
  ['me-biotic-powers', 'dominate-feat.json'],
  ['me-biotic-powers', 'flare-feat.json'],
  // Tech Powers
  ['me-tech-powers', 'damping-feat.json'],
  ['me-tech-powers', 'neural-shock-feat.json'],
  ['me-tech-powers', 'geth-shield-boost-feat.json'],
  ['me-tech-powers', 'decoy-feat.json'],
  ['me-tech-powers', 'ai-hacking-feat.json'],
  ['me-tech-powers', 'energy-drain-feat.json'],
  ['me-tech-powers', 'defense-drone-feat.json'],
  ['me-tech-powers', 'defense-matrix-feat.json'],
  // Ammo Powers
  ['me-ammo-powers', 'armor-piercing-feat.json'],
  ['me-ammo-powers', 'phasic-feat.json'],
  ['me-ammo-powers', 'shredder-feat.json'],
  ['me-ammo-powers', 'warp-feat.json'],
  // Combat Passives (bonus powers available to any class)
  ['me-combat-passives', 'fortification.json'],
  ['me-combat-passives', 'fortification-improved.json'],
  ['me-combat-passives', 'fortification-master.json'],
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  ICON_CSS = await loadIconCss();

  // ── Load all class sections ──────────────────────────────────────────────────
  const generalFeatsByPack = new Map(); // packLabel -> feat[]
  const classSections = [];

  for (const cls of CLASSES) {
    const classFeat = await loadFeat(...cls.classFile);
    const classSpecificFeats = [];
    const progressionFeats = [];

    for (const [pack, filename] of cls.feats) {
      try {
        const feat = await loadFeat(pack, filename);
        classSpecificFeats.push(feat);
        if (pack === 'me-class-progressions') progressionFeats.push(feat);
      } catch (e) {
        console.warn(`  WARNING: could not load ${pack}/${filename}: ${e.message}`);
      }
    }

    // Load mastery chain feats for this class
    const masteryFeats = [];
    for (const [pack, filename] of (cls.masteryChain ?? [])) {
      try {
        masteryFeats.push(await loadFeat(pack, filename));
      } catch (e) {
        console.warn(`  WARNING: could not load mastery feat ${pack}/${filename}: ${e.message}`);
      }
    }

    classSpecificFeats.sort((a, b) => {
      const d = a.system.level.value - b.system.level.value;
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });

    classSections.push(renderClass(cls, classFeat, classSpecificFeats, progressionFeats, masteryFeats));
  }

  // ── Load explicit General Feats ──────────────────────────────────────────────
  for (const [pack, filename] of GENERAL_FEATS) {
    try {
      const feat = await loadFeat(pack, filename);
      const packLabel = packDisplayName(pack);
      if (!generalFeatsByPack.has(packLabel)) generalFeatsByPack.set(packLabel, []);
      generalFeatsByPack.get(packLabel).push(feat);
    } catch (e) {
      console.warn(`  WARNING: could not load general feat ${pack}/${filename}: ${e.message}`);
    }
  }

  // Sort general packs in display order
  const PACK_ORDER = [
    'Combat Passives', 'Biotic Powers', 'Tech Powers', 'Ammo Powers', 'Class Progressions',
  ];
  const sortedGeneralPacks = new Map(
    [...generalFeatsByPack.entries()].sort(
      (a, b) => (PACK_ORDER.indexOf(a[0]) + 99) - (PACK_ORDER.indexOf(b[0]) + 99)
    )
  );

  const generalSection = renderGeneralSection(sortedGeneralPacks);

  const tocEntries = [
    ...CLASSES.map(c => {
      const col = CLASS_COLORS[c.name];
      const id = c.name.toLowerCase();
      return `<div class="toc-entry"><a href="#${id}" style="color:${col.accent}">${c.name}</a><span class="toc-dot"></span><span class="toc-pg" id="toc-pg-${id}" style="color:${col.accent}">—</span></div>`;
    }),
    `<div class="toc-entry"><a href="#general-feats" style="color:#4a9ed6">General Feats</a><span class="toc-dot"></span><span class="toc-pg" id="toc-pg-general-feats">—</span></div>`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mass Effect Class Compendium</title>
<style>${CSS}${ICON_CSS}</style>
</head>
<body>
<div class="n7-stripe" aria-hidden="true">
  <div class="n7-badge">
    <img src="images/Paragon.png" alt="Paragon">
  </div>
  <div class="n7-label">N7</div>
  <div class="n7-badge" aria-hidden="true"></div>
</div>
<div class="page-wrap">

<div class="title-page">
  <img src="images/MELogo.png" alt="Mass Effect" class="title-logo">
  <div class="title-sub">Class Compendium</div>
  <div class="title-rule"></div>
  <p class="title-body">A complete reference for all six player classes — Soldier, Engineer, Adept, Vanguard, Infiltrator, and Sentinel — including every available class feat and progression feature.</p>
</div>

<div class="toc">
  <h2>Contents</h2>
  <div class="toc-list">
    ${tocEntries}
  </div>
</div>

${classSections.join('\n\n')}

${generalSection}

</div>
</body>
</html>`;

  await mkdir('docs', { recursive: true });
  await writeFile('docs/class-compendium.html', html, 'utf8');
  console.log(`✓ Wrote docs/class-compendium.html (${html.length.toLocaleString()} chars)`);
}

function packDisplayName(pack) {
  const map = {
    'me-combat-passives':   'Combat Passives',
    'me-biotic-powers':     'Biotic Powers',
    'me-tech-powers':       'Tech Powers',
    'me-ammo-powers':       'Ammo Powers',
    'me-class-progressions':'Class Progressions',
  };
  return map[pack] ?? pack;
}

main().catch(err => { console.error(err); process.exit(1); });
