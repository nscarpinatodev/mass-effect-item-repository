'use strict';
// ============================================================
// MASS EFFECT POWERS AUTOMATION — Foundry VTT v13
// ------------------------------------------------------------
// Save-based biotic/tech powers stay as feats. Each power's
// description carries a one-click save button:
//
//   @Check[reflex|dc:resolve(@actor.system.attributes.classDC.value)|options:me-power:<slug>]
//
// When the target resolves that save, this script reads the
// outcome from the chat message, looks up the power in the
// registry below, and auto-applies the mapped damage (routed
// through the shield system), persistent damage, and conditions
// to the saving creature.
// ============================================================

const MODULE_ID = 'mass-effect-sf2e-conversion';
const OPT_PREFIX = 'me-power:';

// ── POWER REGISTRY ──────────────────────────────────────────────────────────
// Keyed by the feat's system.slug. Each degree may define:
//   damage      — a typed damage formula, e.g. "2d6[fire]"
//   persistent  — { formula, type, dc }  (creates a persistent-damage effect)
//   conditions  — [ "off-guard", "stunned:1", "slowed:1", ... ]  (":" = value)
//   note        — reminder text shown in the result card (manual rulings)
const POWERS = {
  'me-tech-incinerate': {
    name: 'Incinerate',
    save: 'reflex',
    degrees: {
      success:         { damage: '1d6[fire]' },
      failure:         { damage: '2d6[fire]', persistent: { formula: '1d4', type: 'fire', dc: 15 },
                         note: 'Target cannot regain HP until the start of your next turn. Armor Frames take 1.5× damage.' },
      criticalFailure: { damage: '4d6[fire]', persistent: { formula: '2d4', type: 'fire', dc: 15 },
                         note: 'Target cannot regain HP until the start of your next turn. Armor Frames take 1.5× damage.' },
    },
  },
};

// ── SETTINGS ────────────────────────────────────────────────────────────────
Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'autoApplyPowerEffects', {
    name: 'Auto-Apply Power Effects',
    hint: 'When a target resolves a save against a Mass Effect power, automatically apply its damage and conditions based on the outcome.',
    scope: 'world', config: true, type: Boolean, default: true,
  });
});

// ── SAVE-RESULT HOOK ────────────────────────────────────────────────────────
Hooks.on('createChatMessage', async (message) => {
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, 'autoApplyPowerEffects')) return;

  const ctx = message.flags?.pf2e?.context;
  if (!ctx || ctx.type !== 'saving-throw' || !ctx.outcome) return;

  const opt = (ctx.options ?? []).find(o => o.startsWith(OPT_PREFIX));
  if (!opt) return;
  const slug  = opt.slice(OPT_PREFIX.length);
  const power = POWERS[slug];
  if (!power) return;

  const actor = ChatMessage.getSpeakerActor(message.speaker);
  if (!actor) return;
  const tokenDoc = message.token
    ?? canvas?.scene?.tokens?.get(message.speaker?.token)
    ?? actor.getActiveTokens(true, true)[0] ?? null;

  const degree = power.degrees[ctx.outcome];
  if (!degree) {
    postResult(actor, power.name, ctx.outcome, ['No effect.']);
    return;
  }

  const log = [];

  // ── Direct damage (routes through the shield system via applyDamage) ──
  if (degree.damage) {
    try {
      const roll = await new game.pf2e.DamageRoll(degree.damage).evaluate();
      await actor.applyDamage({ damage: roll, token: tokenDoc?.object ?? tokenDoc });
      log.push(`${roll.total} ${describeFormula(degree.damage)} damage`);
    } catch (err) {
      console.warn('ME Powers | applyDamage failed, posting roll instead', err);
      const roll = await new Roll(stripTags(degree.damage)).evaluate();
      roll.toMessage({ flavor: `${power.name} damage`, speaker: { alias: power.name } });
      log.push(`${roll.total} damage (apply manually)`);
    }
  }

  // ── Persistent damage (PersistentDamage rule element on a new effect) ──
  if (degree.persistent) {
    const p = degree.persistent;
    await actor.createEmbeddedDocuments('Item', [{
      name: `${power.name} — Persistent ${cap(p.type)}`,
      type: 'effect',
      img: 'icons/magic/fire/flame-burning-orange.webp',
      system: {
        slug: `me-persistent-${slug}`,
        description: { value: `<p>${p.formula} persistent ${p.type} damage from ${power.name}. DC ${p.dc ?? 15} flat check to end.</p>` },
        duration: { value: -1, unit: 'unlimited' },
        rules: [{ key: 'PersistentDamage', formula: p.formula, damageType: p.type, dc: p.dc ?? 15 }],
      },
    }]);
    log.push(`${p.formula} persistent ${p.type}`);
  }

  // ── Conditions ──
  for (const c of degree.conditions ?? []) {
    const [name, value] = c.split(':');
    try {
      await actor.increaseCondition(name, value ? { value: Number(value) } : undefined);
      log.push(value ? `${cap(name)} ${value}` : cap(name));
    } catch (err) {
      console.warn(`ME Powers | could not apply condition "${c}"`, err);
      log.push(`${cap(name)} (apply manually)`);
    }
  }

  if (degree.note) log.push(`<em>${degree.note}</em>`);
  postResult(actor, power.name, ctx.outcome, log);
});

// ── HELPERS ─────────────────────────────────────────────────────────────────
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const stripTags = f => f.replace(/\[[^\]]*\]/g, '');
function describeFormula(f) {
  const m = f.match(/\[([^\]]+)\]/);
  return m ? m[1].replace(/persistent,?/, '').trim() : '';
}

const OUTCOME_LABEL = {
  criticalSuccess: 'Critical Success',
  success: 'Success',
  failure: 'Failure',
  criticalFailure: 'Critical Failure',
};

function postResult(actor, powerName, outcome, lines) {
  const color = outcome.includes('Failure') || outcome === 'failure' ? '#ff6f00' : '#4fc3f7';
  const body = `<div style="border-left:3px solid ${color};padding:5px 10px;background:${color}18;border-radius:2px;font-size:0.95em;">`
    + `<strong>🔥 ${powerName} — ${OUTCOME_LABEL[outcome] ?? outcome}</strong>`
    + `<br>Target: <strong>${actor.name}</strong>`
    + (lines.length ? `<ul style="margin:4px 0 0 0;padding-left:18px;">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : '')
    + `</div>`;
  ChatMessage.create({
    speaker: { alias: '⚙ ME Powers' },
    content: body,
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
  });
}

console.log('ME Powers | automation loaded.');
