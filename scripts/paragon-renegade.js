'use strict';

// ============================================================
// MASS EFFECT PARAGON / RENEGADE TRACKER — Foundry VTT v13 Module
// ============================================================
//
// Opens via the Token Controls toolbar (GM only).
// Reads party members from the Party actor (type === 'party').
// Scores stored as world-scoped actor flags: 'paragon' / 'renegade'.
//
// ============================================================

const MODULE_ID = 'mass-effect-sf2e-conversion';

// ── HELPERS ────────────────────────────────────────────────────────────────────

const N = v => Number(v) || 0;
const clamp = (v, lo, hi) => Math.min(Math.max(N(v), lo), hi);

function mkAction({ name, img, atype, category, perDay, descHTML, rules = [] }) {
  return {
    type: 'action',
    name,
    img,
    system: {
      actionType: { value: atype },
      actions: { value: atype === 'one' ? 1 : null },
      category,
      description: { value: descHTML },
      frequency: { max: perDay, per: 'day', value: perDay },
      rules,
      traits: { value: [] },
      _migration: { version: null, previous: null },
    },
  };
}

// ── ITEM BLUEPRINTS ────────────────────────────────────────────────────────────

const PARAGON_ITEMS = {
  'Paragon 20 — Trusted Presence': {
    type: 'effect',
    name: 'Paragon 20 — Trusted Presence',
    img: 'icons/svg/aura.svg',
    system: {
      description: { value: '+1 circumstance to Diplomacy checks.' },
      duration: { value: -1, unit: 'unlimited' },
      start: { value: 0 },
      tokenIcon: { show: true },
      rules: [{ key: 'FlatModifier', selector: 'diplomacy', type: 'circumstance', value: 1 }],
    },
  },
  'Paragon 40 — Inspiring Voice': mkAction({
    name: 'Paragon 40 — Inspiring Voice',
    img: 'icons/svg/upgrade.svg',
    atype: 'free',
    category: 'defensive',
    perDay: 1,
    descHTML: 'Free Action (1/day). Fortune on one Diplomacy or Medicine check (keep higher).',
    rules: [{ key: 'RollTwice', selector: ['diplomacy', 'medicine'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }],
  }),
  'Paragon 60 — Beacon of Hope': mkAction({
    name: 'Paragon 60 — Beacon of Hope',
    img: 'icons/svg/sun.svg',
    atype: 'one',
    category: 'interaction',
    perDay: 1,
    descHTML: 'Action (1/day). For 1 minute, +2 circumstance to Diplomacy when you Make an Impression or Request.',
  }),
  'Paragon 80 — Noble Sacrifice': mkAction({
    name: 'Paragon 80 — Noble Sacrifice',
    img: 'icons/svg/shield.svg',
    atype: 'reaction',
    category: 'defensive',
    perDay: 1,
    descHTML: 'Reaction (1/day). Trigger: ally in 30 ft would drop to 0 HP. Effect: ally set to 1 HP; you take damage equal to your level.',
  }),
  'Paragon 100 — Living Legend': {
    type: 'effect',
    name: 'Paragon 100 — Living Legend',
    img: 'icons/svg/star.svg',
    system: {
      description: { value: '+1 status to Diplomacy and Medicine.' },
      duration: { value: -1, unit: 'unlimited' },
      start: { value: 0 },
      tokenIcon: { show: true },
      rules: [
        { key: 'FlatModifier', selector: 'diplomacy', type: 'status', value: 1 },
        { key: 'FlatModifier', selector: 'medicine', type: 'status', value: 1 },
      ],
    },
  },
};

const RENEGADE_ITEMS = {
  'Renegade 20 — Fearsome Reputation': {
    type: 'effect',
    name: 'Renegade 20 — Fearsome Reputation',
    img: 'icons/svg/daze.svg',
    system: {
      description: { value: '+1 circumstance to Intimidation checks.' },
      duration: { value: -1, unit: 'unlimited' },
      start: { value: 0 },
      tokenIcon: { show: true },
      rules: [{ key: 'FlatModifier', selector: 'intimidation', type: 'circumstance', value: 1 }],
    },
  },
  'Renegade 40 — Ruthless Efficiency': mkAction({
    name: 'Renegade 40 — Ruthless Efficiency',
    img: 'icons/svg/bolt.svg',
    atype: 'free',
    category: 'offensive',
    perDay: 1,
    descHTML: 'Free Action (1/day). Fortune on one Intimidation or Deception check (keep higher).',
    rules: [{ key: 'RollTwice', selector: ['intimidation', 'deception'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }],
  }),
  'Renegade 60 — Command Through Fear': mkAction({
    name: 'Renegade 60 — Command Through Fear',
    img: 'icons/svg/terror.svg',
    atype: 'one',
    category: 'interaction',
    perDay: 1,
    descHTML: 'Action (1/day). For 1 minute, +2 circumstance to Intimidation when you Coerce.',
  }),
  'Renegade 80 — Uncompromising': mkAction({
    name: 'Renegade 80 — Uncompromising',
    img: 'icons/svg/target.svg',
    atype: 'one',
    category: 'offensive',
    perDay: 1,
    descHTML: 'Action (1/day). Before a Strike this turn: +2 circumstance to attack; treat cover one step lower.',
  }),
  'Renegade 100 — Living Legend': {
    type: 'effect',
    name: 'Renegade 100 — Living Legend',
    img: 'icons/svg/explosion.svg',
    system: {
      description: { value: '+1 status to Intimidation and Deception.' },
      duration: { value: -1, unit: 'unlimited' },
      start: { value: 0 },
      tokenIcon: { show: true },
      rules: [
        { key: 'FlatModifier', selector: 'intimidation', type: 'status', value: 1 },
        { key: 'FlatModifier', selector: 'deception', type: 'status', value: 1 },
      ],
    },
  },
};

const PARAGON_THRESH = [
  { value: 20, grants: ['Paragon 20 — Trusted Presence'] },
  { value: 40, grants: ['Paragon 40 — Inspiring Voice'] },
  { value: 60, grants: ['Paragon 60 — Beacon of Hope'] },
  { value: 80, grants: ['Paragon 80 — Noble Sacrifice'] },
  { value: 100, grants: ['Paragon 100 — Living Legend'] },
];

const RENEGADE_THRESH = [
  { value: 20, grants: ['Renegade 20 — Fearsome Reputation'] },
  { value: 40, grants: ['Renegade 40 — Ruthless Efficiency'] },
  { value: 60, grants: ['Renegade 60 — Command Through Fear'] },
  { value: 80, grants: ['Renegade 80 — Uncompromising'] },
  { value: 100, grants: ['Renegade 100 — Living Legend'] },
];

function namesFor(val, table) {
  const out = new Set();
  for (const row of table) if (N(val) >= row.value) for (const n of row.grants) out.add(n);
  return out;
}

// ── ENGINE ─────────────────────────────────────────────────────────────────────

async function syncTrack(actor, track, newVal) {
  const val = clamp(newVal, 0, 100);
  await actor.setFlag('world', track, val);

  const isParagon = track === 'paragon';
  const table = isParagon ? PARAGON_THRESH : RENEGADE_THRESH;
  const defs  = isParagon ? PARAGON_ITEMS  : RENEGADE_ITEMS;

  const should = namesFor(val, table);
  const owned  = actor.items.contents;
  const byName = new Map(owned.map(i => [i.name, i]));

  const toCreate = [];
  for (const name of should) if (!byName.has(name)) toCreate.push(defs[name]);
  if (toCreate.length) await actor.createEmbeddedDocuments('Item', toCreate);

  const prefix  = isParagon ? 'Paragon ' : 'Renegade ';
  const toDelete = owned
    .filter(i => (i.type === 'effect' || i.type === 'action') && i.name.startsWith(prefix) && !should.has(i.name))
    .map(i => i.id);
  if (toDelete.length) await actor.deleteEmbeddedDocuments('Item', toDelete);

  return val;
}

async function useTier(actor, track, tier) {
  const name =
    track === 'paragon' ? (
      tier === 40 ? 'Paragon 40 — Inspiring Voice'    :
      tier === 60 ? 'Paragon 60 — Beacon of Hope'     :
      tier === 80 ? 'Paragon 80 — Noble Sacrifice'    : null
    ) : (
      tier === 40 ? 'Renegade 40 — Ruthless Efficiency'    :
      tier === 60 ? 'Renegade 60 — Command Through Fear'   :
      tier === 80 ? 'Renegade 80 — Uncompromising'         : null
    );
  if (!name) return;

  const item = actor.items.getName(name);
  if (!item) return ui.notifications.warn(`${name} not found on actor.`);
  const freq = item.system?.frequency;
  if (!freq || N(freq.value) <= 0) return ui.notifications.warn('No uses left today.');

  const speaker = ChatMessage.getSpeaker({ actor });

  if (name.includes('Inspiring Voice')) {
    await ChatMessage.create({ speaker, content: '<b>Inspiring Voice</b>: Fortune on one Diplomacy or Medicine check (keep higher).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Inspiring Voice (Fortune)', img: 'icons/svg/upgrade.svg',
      system: {
        description: { value: 'Roll Twice (fortune): Diplomacy/Medicine; remove after first eligible roll.' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'RollTwice', selector: ['diplomacy', 'medicine'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }],
      },
    }]);
  } else if (name.includes('Beacon of Hope')) {
    await ChatMessage.create({ speaker, content: '<b>Beacon of Hope</b>: +2 circumstance to Diplomacy for Make an Impression / Request (1 minute).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Beacon of Hope (+2 Diplomacy: Impression/Request)', img: 'icons/svg/sun.svg',
      system: {
        description: { value: '+2 circumstance to Diplomacy (Make an Impression / Request).' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'FlatModifier', selector: 'diplomacy', type: 'circumstance', value: 2, predicate: [{ or: ['action:make-an-impression', 'action:request'] }] }],
      },
    }]);
  } else if (name.includes('Noble Sacrifice')) {
    await ChatMessage.create({ speaker, content: '<b>Noble Sacrifice</b>: Ally in 30 ft would drop to 0 → instead set to 1 HP; you take damage equal to your level (GM adjudication).' });
  } else if (name.includes('Ruthless Efficiency')) {
    await ChatMessage.create({ speaker, content: '<b>Ruthless Efficiency</b>: Fortune on one Intimidation or Deception check (keep higher).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Ruthless Efficiency (Fortune)', img: 'icons/svg/bolt.svg',
      system: {
        description: { value: 'Roll Twice (fortune): Intimidation/Deception; remove after first eligible roll.' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'RollTwice', selector: ['intimidation', 'deception'], keep: 'higher', effectType: 'fortune', removeAfterRoll: true }],
      },
    }]);
  } else if (name.includes('Command Through Fear')) {
    await ChatMessage.create({ speaker, content: '<b>Command Through Fear</b>: +2 circumstance to Intimidation when you Coerce (1 minute).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Command Through Fear (+2 Intimidation: Coerce)', img: 'icons/svg/terror.svg',
      system: {
        description: { value: '+2 circumstance to Intimidation when you Coerce.' },
        duration: { value: 1, unit: 'minutes' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'FlatModifier', selector: 'intimidation', type: 'circumstance', value: 2, predicate: ['action:coerce'] }],
      },
    }]);
  } else if (name.includes('Uncompromising')) {
    await ChatMessage.create({ speaker, content: '<b>Uncompromising</b>: +2 circumstance to attack rolls; treat cover one step lower (1 round).' });
    await actor.createEmbeddedDocuments('Item', [{
      type: 'effect', name: 'Uncompromising (+2 to attacks; cover -1 step)', img: 'icons/svg/target.svg',
      system: {
        description: { value: 'For 1 round: +2 circumstance to attack rolls; treat cover one step lower (GM adjudication).' },
        duration: { value: 1, unit: 'rounds' }, start: { value: 0 }, tokenIcon: { show: true },
        rules: [{ key: 'FlatModifier', selector: 'attack-roll', type: 'circumstance', value: 2 }],
      },
    }]);
  }

  await item.update({ 'system.frequency.value': Math.max(0, N(freq.value) - 1) });
  ui.notifications.info(`Used: ${name}`);
}

// ── STYLES ─────────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('me-pr-styles')) return;
  const style = document.createElement('style');
  style.id = 'me-pr-styles';
  style.textContent = `
    /* Paragon / Renegade Dashboard */
    #me-paragon-renegade .window-content {
      padding: 0;
      overflow-y: auto;
    }

    .me-pr-body {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .me-pr-empty {
      padding: 1.5rem;
      text-align: center;
      color: var(--color-text-secondary, #888);
      font-style: italic;
    }

    /* Member card */
    .me-pr-member {
      border-bottom: 1px solid var(--color-border-light, #2a3340);
      padding: 0.75rem 1rem;
    }
    .me-pr-member:last-child { border-bottom: none; }

    .me-pr-member-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.6rem;
    }
    .me-pr-portrait {
      width: 36px;
      height: 36px;
      border-radius: 4px;
      object-fit: cover;
      border: 1px solid var(--color-border-light, #3a4659);
    }
    .me-pr-member-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #dbe5ff);
    }

    /* Track row */
    .me-pr-track {
      margin-bottom: 0.5rem;
      padding: 0.5rem 0.6rem;
      border-radius: 4px;
      background: var(--color-bg-secondary, rgba(255,255,255,0.03));
    }
    .me-pr-track:last-child { margin-bottom: 0; }

    .me-pr-track-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.35rem;
    }
    .me-pr-track-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .me-pr-track-label.paragon { color: #4a9eff; }
    .me-pr-track-label.renegade { color: #ff5555; }

    .me-pr-score {
      font-size: 1.1rem;
      font-weight: 700;
      min-width: 2.5rem;
      text-align: right;
      color: var(--color-text-primary, #dbe5ff);
    }

    /* Progress bar */
    .me-pr-bar {
      height: 6px;
      border-radius: 3px;
      background: var(--color-bg-tertiary, #1a2230);
      margin-bottom: 0.5rem;
      overflow: hidden;
    }
    .me-pr-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .me-pr-bar-fill.paragon  { background: linear-gradient(90deg, #1a6eff, #4ab8ff); }
    .me-pr-bar-fill.renegade { background: linear-gradient(90deg, #cc2200, #ff5533); }

    /* Controls row */
    .me-pr-controls {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-wrap: wrap;
    }

    .me-pr-btn {
      padding: 0.15rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 3px;
      border: 1px solid var(--color-border-light, #3a4659);
      background: var(--color-bg-btn, #1a2230);
      color: var(--color-text-primary, #dbe5ff);
      cursor: pointer;
      line-height: 1.4;
    }
    .me-pr-btn:hover { background: var(--color-bg-btn-hover, #2a3a55); }
    .me-pr-btn.delta-neg { color: #ff7777; }

    .me-pr-set-input {
      width: 48px;
      padding: 0.15rem 0.3rem;
      font-size: 0.75rem;
      border-radius: 3px;
      border: 1px solid var(--color-border-light, #3a4659);
      background: var(--color-bg-tertiary, #1a2230);
      color: var(--color-text-primary, #dbe5ff);
      text-align: center;
    }
    .me-pr-set-input::-webkit-inner-spin-button { -webkit-appearance: none; }

    /* Tier buttons */
    .me-pr-tiers {
      display: flex;
      gap: 0.3rem;
      flex-wrap: wrap;
      margin-top: 0.4rem;
    }
    .me-pr-tier-btn {
      padding: 0.15rem 0.6rem;
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: 3px;
      cursor: pointer;
      border: 1px solid;
    }
    .me-pr-tier-btn.paragon {
      border-color: #4a9eff;
      background: rgba(74,158,255,0.12);
      color: #4ab8ff;
    }
    .me-pr-tier-btn.paragon:hover { background: rgba(74,158,255,0.25); }
    .me-pr-tier-btn.renegade {
      border-color: #ff5555;
      background: rgba(255,85,55,0.12);
      color: #ff7766;
    }
    .me-pr-tier-btn.renegade:hover { background: rgba(255,85,55,0.25); }

    /* Active perks */
    .me-pr-perks {
      margin-top: 0.35rem;
      font-size: 0.72rem;
      color: var(--color-text-secondary, #90a0bf);
      line-height: 1.4;
    }
    .me-pr-perks strong { color: var(--color-text-primary, #dbe5ff); }
  `;
  document.head.appendChild(style);
}

// ── TIER LABELS ────────────────────────────────────────────────────────────────

const TIER_LABEL = {
  paragon: {
    40: 'Inspiring Voice (T2)',
    60: 'Beacon of Hope (T3)',
    80: 'Noble Sacrifice (T4)',
  },
  renegade: {
    40: 'Ruthless Efficiency (T2)',
    60: 'Command Through Fear (T3)',
    80: 'Uncompromising (T4)',
  },
};

// ── APPLICATION ────────────────────────────────────────────────────────────────

class ParagonRenegadeDashboard extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'me-paragon-renegade',
    classes: ['me-pr-dashboard'],
    tag: 'div',
    window: {
      title: 'Paragon \u2f Renegade Tracker',
      icon: 'fa-solid fa-scale-balanced',
      resizable: true,
      minimizable: true,
    },
    position: { width: 560, height: 'auto' },
  };

  static _instance = null;

  static open() {
    if (!ParagonRenegadeDashboard._instance || ParagonRenegadeDashboard._instance._state < 0) {
      ParagonRenegadeDashboard._instance = new ParagonRenegadeDashboard();
    }
    ParagonRenegadeDashboard._instance.render(true);
  }

  _getPartyMembers() {
    const party = game.actors.find(a => a.type === 'party');
    if (!party) return [];
    const members = party.system?.details?.members ?? [];
    return members
      .map(m => fromUuidSync(m.uuid))
      .filter(Boolean);
  }

  async _prepareContext(options) {
    const members = this._getPartyMembers();
    return {
      members: members.map(actor => {
        const pVal = N(actor.getFlag('world', 'paragon'));
        const rVal = N(actor.getFlag('world', 'renegade'));
        const allItems = actor.items.contents;
        return {
          id: actor.id,
          name: actor.name,
          img: actor.img,
          paragon: pVal,
          renegade: rVal,
          paragonPerks: allItems
            .filter(i => (i.type === 'effect' || i.type === 'action') && i.name.startsWith('Paragon '))
            .map(i => i.name),
          renegadePerks: allItems
            .filter(i => (i.type === 'effect' || i.type === 'action') && i.name.startsWith('Renegade '))
            .map(i => i.name),
          paragonTiers: [40, 60, 80].filter(t => pVal >= t),
          renegadeTiers: [40, 60, 80].filter(t => rVal >= t),
        };
      }),
    };
  }

  async _renderHTML(context, options) {
    const wrap = document.createElement('div');
    wrap.className = 'me-pr-body';
    wrap.innerHTML = context.members.length
      ? context.members.map(m => this._memberHTML(m)).join('')
      : '<p class="me-pr-empty">No party actor found, or the party has no members.</p>';
    return wrap;
  }

  _replaceHTML(result, content, options) {
    content.replaceChildren(result);
  }

  _memberHTML(m) {
    return `
      <div class="me-pr-member" data-actor-id="${m.id}">
        <div class="me-pr-member-header">
          <img class="me-pr-portrait" src="${m.img}" alt="${m.name}">
          <h3>${m.name}</h3>
        </div>
        ${this._trackHTML(m, 'paragon')}
        ${this._trackHTML(m, 'renegade')}
      </div>
    `;
  }

  _trackHTML(m, track) {
    const isParagon = track === 'paragon';
    const val   = isParagon ? m.paragon  : m.renegade;
    const tiers = isParagon ? m.paragonTiers  : m.renegadeTiers;
    const perks = isParagon ? m.paragonPerks  : m.renegadePerks;
    const label = isParagon ? 'Paragon' : 'Renegade';

    const tiersHTML = tiers.length
      ? `<div class="me-pr-tiers">
          ${tiers.map(t => `
            <button class="me-pr-tier-btn ${track}" data-action="use-tier" data-track="${track}" data-tier="${t}">
              ${TIER_LABEL[track][t]}
            </button>`).join('')}
        </div>`
      : '';

    const perksHTML = perks.length
      ? `<div class="me-pr-perks"><strong>Active:</strong> ${perks.join(', ')}</div>`
      : '';

    return `
      <div class="me-pr-track">
        <div class="me-pr-track-header">
          <span class="me-pr-track-label ${track}">${label}</span>
          <span class="me-pr-score">${val}</span>
        </div>
        <div class="me-pr-bar">
          <div class="me-pr-bar-fill ${track}" style="width:${val}%"></div>
        </div>
        <div class="me-pr-controls">
          <button class="me-pr-btn delta-neg" data-action="delta" data-track="${track}" data-delta="-1">-1</button>
          <button class="me-pr-btn" data-action="delta" data-track="${track}" data-delta="1">+1</button>
          <button class="me-pr-btn" data-action="delta" data-track="${track}" data-delta="2">+2</button>
          <button class="me-pr-btn" data-action="delta" data-track="${track}" data-delta="5">+5</button>
          <input class="me-pr-set-input" type="number" min="0" max="100" value="${val}" data-track="${track}" title="Set exact value">
          <button class="me-pr-btn" data-action="set" data-track="${track}">Set</button>
        </div>
        ${tiersHTML}
        ${perksHTML}
      </div>
    `;
  }

  _onRender(context, options) {
    if (!this._listenersAttached) {
      this.element.addEventListener('click', this._onClick.bind(this));
      this.element.addEventListener('keydown', this._onKeydown.bind(this));
      this._listenersAttached = true;
    }
  }

  async _onClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;

    const memberEl = btn.closest('[data-actor-id]');
    if (!memberEl) return;

    const actor = game.actors.get(memberEl.dataset.actorId);
    if (!actor) return;

    const action = btn.dataset.action;
    const track  = btn.dataset.track;

    if (action === 'delta') {
      const current = N(actor.getFlag('world', track));
      await syncTrack(actor, track, current + N(btn.dataset.delta));
      await this.render();

    } else if (action === 'set') {
      const input = memberEl.querySelector(`.me-pr-set-input[data-track="${track}"]`);
      await syncTrack(actor, track, N(input?.value));
      await this.render();

    } else if (action === 'use-tier') {
      await useTier(actor, track, N(btn.dataset.tier));
      await this.render();
    }
  }

  async _onKeydown(event) {
    if (event.key !== 'Enter') return;
    const input = event.target;
    if (!input.classList.contains('me-pr-set-input')) return;

    const memberEl = input.closest('[data-actor-id]');
    if (!memberEl) return;

    const actor = game.actors.get(memberEl.dataset.actorId);
    if (!actor) return;

    await syncTrack(actor, input.dataset.track, N(input.value));
    await this.render();
  }
}

// ── HOOKS ──────────────────────────────────────────────────────────────────────

Hooks.once('ready', () => {
  injectStyles();
});

Hooks.on('getSceneControlButtons', controls => {
  const tokenGroup = Array.isArray(controls)
    ? controls.find(c => c.name === 'token')
    : null;
  if (!tokenGroup) return;

  tokenGroup.tools.push({
    name: 'me-paragon-renegade',
    title: 'Paragon / Renegade Tracker',
    icon: 'fa-solid fa-scale-balanced',
    button: true,
    visible: game.user.isGM,
    onClick: () => ParagonRenegadeDashboard.open(),
  });
});

// Expose for macro/console access
globalThis.MassEffectPR = { open: () => ParagonRenegadeDashboard.open() };
