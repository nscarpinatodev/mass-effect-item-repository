'use strict';

// ============================================================
// MASS EFFECT SHIELD SYSTEM — Foundry VTT v13 Module
// System: Pathfinder 2e (Starfinder 2e proxy)
// ============================================================
//
// DAMAGE ROUTING ORDER:  Barrier → Shield → Armor → HP
//
// AMMO POWERS: action items that apply Effects with DamageDice
//   rule elements. Routing detects ammo type from the attacker's
//   active effects (actor flag check) and from chat damage types
//   (electricity fallback for natural electric weapons).
//
// ARMOR FRAMES: standalone equipment items with armorMax /
//   armorCurrent flags. Ablative — when depleted the item is
//   destroyed. No regeneration.
//
// SETUP (run from browser console as GM):
//   MassEffectShields.sync(true)   ← create/recreate all world items
//
// ============================================================

const MODULE_ID = 'mass-effect-item-repository';

// Bump this (not module.json version) when world items need recreating.
const MODULE_DATA_VERSION = '1.1.0';

// ── AMMO DEFINITIONS ──────────────────────────────────────────────────────────

const AMMO_DEFS = [
  {
    id: 'incendiary',
    name: 'Incendiary Rounds',
    color: '#ff6f00',
    img: 'icons/magic/fire/flame-burning-orange.webp',
    damageType: 'fire',
    diceNum: 1, dieSz: 'd6',
    description: '<p>Thermite-tipped rounds that ignite on impact. Your weapon attacks deal an additional <strong>1d6 fire damage</strong>.</p>'
      + '<p>Incendiary rounds burn through armor 50% faster: when the target has an active Combat Armor Frame, each point of incoming damage depletes 1.5 points of armor.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'phasic',
    name: 'Phasic Rounds',
    color: '#00e5ff',
    img: 'icons/magic/light/beam-rays-blue-small.webp',
    damageType: 'force',
    diceNum: 1, dieSz: 'd4',
    description: '<p>Rounds coated in a mass effect field that disrupts ablative plating. Your weapon attacks deal an additional <strong>1d4 force damage</strong>.</p>'
      + '<p>Phasic rounds bypass Combat Armor Frames entirely — damage goes directly to shields and HP without being absorbed by the armor layer.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'disruptor',
    name: 'Disruptor Rounds',
    color: '#fff176',
    img: 'icons/magic/lightning/bolt-yellow.webp',
    damageType: 'electricity',
    diceNum: 1, dieSz: 'd4',
    description: '<p>Rounds that generate a disruptive electrical pulse on impact. Your weapon attacks deal an additional <strong>1d4 electricity damage</strong>.</p>'
      + '<p>Disruptor rounds deal double damage to kinetic shields: all electricity damage against shielded targets is automatically doubled.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'cryo',
    name: 'Cryo Rounds',
    color: '#80deea',
    img: 'icons/magic/water/ice-snowflake-cold-blue.webp',
    damageType: 'cold',
    diceNum: 1, dieSz: 'd4',
    description: '<p>Cryogenically-charged rounds that flash-freeze on impact. Your weapon attacks deal an additional <strong>1d4 cold damage</strong>.</p>'
      + '<p>When Cryo Rounds deal direct HP damage, the target becomes <strong>Chilled</strong> (off-guard until the end of their next turn).</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'warp',
    name: 'Warp Rounds',
    color: '#ce93d8',
    img: 'icons/magic/chaos/orb-purple-burst.webp',
    damageType: 'void',
    diceNum: 1, dieSz: 'd4',
    description: '<p>Rounds infused with destabilizing dark energy. Your weapon attacks deal an additional <strong>1d4 void damage</strong>.</p>'
      + '<p>Warp rounds are devastating against biotic barriers: damage to a Biotic Barrier is multiplied by 1.5×. Depleting a barrier with Warp rounds triggers a dark energy detonation.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'armor-piercing',
    name: 'Armor-Piercing Rounds',
    color: '#90a4ae',
    img: 'icons/weapons/ammunition/bullet-cartridge-round-red.webp',
    damageType: null,
    diceNum: 0, dieSz: '',
    description: '<p>Hard alloy sabot rounds designed to penetrate ablative armor plating. These rounds add no bonus damage type.</p>'
      + '<p>When striking a target with an active Combat Armor Frame, 50% of the incoming HP damage bypasses the armor entirely and is dealt directly to shields and HP.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
  {
    id: 'shredder',
    name: 'Shredder Rounds',
    color: '#d32f2f',
    img: 'icons/weapons/ammunition/bullet-cartridge-round-copper.webp',
    damageType: 'slashing',
    diceNum: 1, dieSz: 'd6',
    description: '<p>Serrated flechette rounds designed to shred unprotected tissue. Your weapon attacks deal an additional <strong>1d6 slashing damage</strong>.</p>'
      + '<p>Most effective against targets with no active shields, barriers, or armor.</p>'
      + '<p>Remove this effect to return to standard ammunition.</p>',
  },
];

// ── ARMOR FRAME TIERS ─────────────────────────────────────────────────────────

const ARMOR_FRAME_TIERS = [
  { tier: 1, name: 'Light Combat Frame',    ap: 20,  level: 1,  price: { gp: 15 } },
  { tier: 2, name: 'Standard Combat Frame', ap: 50,  level: 5,  price: { gp: 250 } },
  { tier: 3, name: 'Heavy Combat Frame',    ap: 100, level: 9,  price: { gp: 2000 } },
  { tier: 4, name: 'Titan Combat Frame',    ap: 200, level: 13, price: { gp: 12000 } },
];

// ── SETTINGS ──────────────────────────────────────────────────────────────────

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'takeCoverSlug', {
    name: 'Take Cover Effect Slug',
    hint: 'The slug of the "Take Cover" effect used to detect when a depleted shield can begin recharging.',
    scope: 'world',
    config: true,
    type: String,
    default: 'effect-cover',
  });

  game.settings.register(MODULE_ID, 'lastSyncedVersion', {
    scope: 'world',
    config: false,
    type: String,
    default: '',
  });
});

// ── READY ─────────────────────────────────────────────────────────────────────

Hooks.once('ready', async () => {
  const version = game.modules.get(MODULE_ID)?.version ?? '?';
  console.log(`ME Shields | Mass Effect Shield System v${version} loaded.`);
  if (game.user.isGM) await syncEffects(version);
});

// ── EFFECT LIFECYCLE ──────────────────────────────────────────────────────────

Hooks.on('createItem', async (item, _options, _userId) => {
  if (!game.user.isGM) return;
  const actor = item.parent;
  if (!actor) return;

  if (isShieldEffect(item)) {
    const baseMax = item.getFlag(MODULE_ID, 'shieldMax') ?? 0;
    const hpMod   = getShieldHpMod(actor);
    const hpBonus = hpMod ? (hpMod.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0) : 0;
    const effectiveMax = baseMax + hpBonus;
    if (effectiveMax > 0) await actor.update({ 'system.attributes.hp.temp': effectiveMax });
    return;
  }

  if (isShieldHpMod(item)) {
    for (const e of [...(actor.itemTypes?.equipment ?? []), ...(actor.itemTypes?.effect ?? [])]
        .filter(e => isShieldHpMod(e) && e.id !== item.id)) {
      await e.delete();
    }
    const shield = getShieldEffect(actor);
    if (shield) {
      const baseMax  = shield.getFlag(MODULE_ID, 'shieldMax') ?? 0;
      const hpBonus  = item.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0;
      const effectiveMax = baseMax + hpBonus;
      if (effectiveMax > 0) await actor.update({ 'system.attributes.hp.temp': effectiveMax });
    }
    return;
  }

  if (isRegenMod(item)) {
    for (const e of [...(actor.itemTypes?.equipment ?? []), ...(actor.itemTypes?.effect ?? [])]
        .filter(e => isRegenMod(e) && e.id !== item.id)) {
      await e.delete();
    }
    return;
  }

  if (isBioticBarrier(item)) {
    for (const e of actor.itemTypes.effect.filter(e => isBioticBarrier(e) && e.id !== item.id)) {
      await e.delete();
    }
    const existingMax = item.getFlag(MODULE_ID, 'barrierMax');
    const level = actor.level ?? 1;
    const max = existingMax ?? Math.max(5, 5 * Math.floor(level / 2));
    await item.update({
      [`flags.${MODULE_ID}.barrierMax`]:     max,
      [`flags.${MODULE_ID}.barrierCurrent`]: max,
      'system.badge': { type: 'counter', value: max, max },
    });
    return;
  }

  if (isArmorFrame(item)) {
    const max = item.getFlag(MODULE_ID, 'armorMax') ?? 0;
    if (max > 0 && item.getFlag(MODULE_ID, 'armorCurrent') == null) {
      await item.update({
        [`flags.${MODULE_ID}.armorCurrent`]: max,
        'system.badge': { type: 'counter', value: max, max },
      });
    }
    return;
  }

  if (isAmmoEffect(item)) {
    // Only one ammo effect at a time
    for (const e of (actor.itemTypes?.effect ?? []).filter(e => isAmmoEffect(e) && e.id !== item.id)) {
      await e.delete();
    }
  }
});

Hooks.on('deleteItem', async (item, _options, _userId) => {
  if (!game.user.isGM) return;
  const actor = item.parent;
  if (!actor) return;

  if (isShieldEffect(item)) {
    await actor.update(
      { 'system.attributes.hp.temp': 0 },
      { [MODULE_ID]: { shieldRemoval: true } }
    );
    return;
  }

  if (isShieldHpMod(item)) {
    const shield = getShieldEffect(actor);
    if (shield) {
      const baseMax     = shield.getFlag(MODULE_ID, 'shieldMax') ?? 0;
      const currentTemp = actor.system.attributes.hp.temp ?? 0;
      if (currentTemp > baseMax) {
        await actor.update(
          { 'system.attributes.hp.temp': baseMax },
          { [MODULE_ID]: { shieldRemoval: true } }
        );
      }
    }
  }
});

// ── DAMAGE ROUTING ────────────────────────────────────────────────────────────
// Priority: Barrier → Shield → Armor → HP

Hooks.on('preUpdateActor', (actor, changes, options, _userId) => {
  if (!game.user.isGM) return;
  if (options?.[MODULE_ID]?.shieldRemoval) return;

  const barrier    = getBioticBarrier(actor);
  const shield     = getShieldEffect(actor);
  const armorFrame = getArmorFrame(actor);
  if (!barrier && !shield && !armorFrame) return;

  const currentHP   = actor.system.attributes.hp.value;
  const currentTemp = actor.system.attributes.hp.temp ?? 0;
  const newHP   = foundry.utils.getProperty(changes, 'system.attributes.hp.value') ?? currentHP;
  const newTemp = foundry.utils.getProperty(changes, 'system.attributes.hp.temp') ?? currentTemp;

  const derivedDamage = Math.max(0, (currentHP - newHP) + (currentTemp - newTemp));
  if (derivedDamage <= 0) return;

  const reportedDamage = options?.damageTaken ?? null;
  const totalDamage    = reportedDamage ?? derivedDamage;

  // Ammo detection: check attacker's active effects for all routing-relevant types.
  // Electricity also falls back to chat message scan so natural-electric weapons work.
  const attackerAmmoType = getAttackerAmmoType();
  const detectedTypes    = detectDamageTypes();
  const isElectricity    = detectedTypes.has('electricity');
  const isWarp           = attackerAmmoType === 'warp';
  const isIncendiary     = attackerAmmoType === 'incendiary';
  const isPhasic         = attackerAmmoType === 'phasic';
  const isAP             = attackerAmmoType === 'armor-piercing';
  const isCryo           = attackerAmmoType === 'cryo';

  const barrierHPBefore = barrier ? (barrier.getFlag(MODULE_ID, 'barrierCurrent') ?? 0) : null;
  const barrierMax      = barrier ? (barrier.getFlag(MODULE_ID, 'barrierMax')     ?? 0) : null;
  const shieldBaseMax   = shield?.getFlag(MODULE_ID, 'shieldMax') ?? 0;
  const shieldHpMod     = shield ? getShieldHpMod(actor) : null;
  const shieldHpBonus   = shieldHpMod ? (shieldHpMod.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0) : 0;
  const shieldMax       = shieldBaseMax + shieldHpBonus;
  const armorMax        = armorFrame ? (armorFrame.getFlag(MODULE_ID, 'armorMax') ?? 0) : 0;
  const armorCurrent    = armorFrame ? (armorFrame.getFlag(MODULE_ID, 'armorCurrent') ?? armorMax) : 0;

  console.group(`ME Shields | [${actor.name}] Damage Routing`);
  console.log(`  PRE-STATE  barrier:${barrierHPBefore ?? '-'}  shields:${currentTemp}/${shieldMax}  armor:${armorCurrent}/${armorMax}  HP:${currentHP}`);
  console.log(`  DAMAGE     total:${totalDamage}  ammo:${attackerAmmoType ?? 'standard'}`);

  // ── Step 1: Barrier absorption (Warp = 1.5×) ──────────────────────────────
  let overflow       = totalDamage;
  let barrierDepleted = false;
  let warpDetonated   = false;

  if (barrier && barrierHPBefore > 0) {
    const warpMult = isWarp ? 1.5 : 1.0;
    const effectiveBarrierDamage = Math.min(Math.floor(overflow * warpMult), barrierHPBefore);
    const originalAbsorbed = Math.min(overflow, Math.ceil(effectiveBarrierDamage / warpMult));
    overflow -= originalAbsorbed;
    const newBarrierHP = barrierHPBefore - effectiveBarrierDamage;
    console.log(`  BARRIER    absorbs ${originalAbsorbed} (×${warpMult})  (${barrierHPBefore}→${Math.max(0, newBarrierHP)})`);
    if (newBarrierHP > 0) {
      barrier.update({
        [`flags.${MODULE_ID}.barrierCurrent`]: newBarrierHP,
        'system.badge': { type: 'counter', value: newBarrierHP, max: barrierMax },
      });
    } else {
      barrierDepleted = true;
      warpDetonated   = isWarp;
      barrier.delete();
    }
  }

  // ── Step 2: Shield rules (electricity = 2×, massive hit = collapse) ────────
  const rawShieldDamage = Math.min(overflow, currentTemp);
  const effectiveShieldDamage = isElectricity
    ? Math.min(rawShieldDamage * 2, currentTemp)
    : rawShieldDamage;

  const massiveThreshold = shieldMax / 2;
  const isCollapse = shield && currentTemp > 0 && effectiveShieldDamage > massiveThreshold;

  const shieldAbsorbs = isCollapse ? Math.ceil(massiveThreshold) : rawShieldDamage;
  const finalShieldHP = isCollapse ? 0 : Math.max(0, currentTemp - rawShieldDamage);
  let   hpDamage      = Math.max(0, Math.floor(overflow - shieldAbsorbs));

  console.log(`  SHIELDS    ${currentTemp}/${shieldMax}  collapse:${isCollapse}  after:${finalShieldHP}`);

  // ── Step 3: Armor routing ──────────────────────────────────────────────────
  let finalHpDamage    = hpDamage;
  let armorDepleted    = false;
  let newArmorHP       = armorCurrent;
  let armorDamageTaken = 0;

  if (armorFrame && hpDamage > 0) {
    if (isPhasic) {
      // Phasic bypasses armor entirely
      console.log(`  ARMOR      BYPASSED (phasic)  HP:${hpDamage}`);
    } else {
      // Incendiary burns 1.5× faster; AP lets 50% bleed through
      const armorDmgMult = isIncendiary ? 1.5 : 1.0;
      armorDamageTaken   = Math.min(Math.floor(hpDamage * armorDmgMult), armorCurrent);
      newArmorHP         = armorCurrent - armorDamageTaken;
      const hpNeutralized  = Math.min(hpDamage, Math.floor(armorDamageTaken / armorDmgMult));
      const apBleedThrough = isAP ? Math.floor(hpDamage * 0.5) : 0;
      finalHpDamage = Math.max(apBleedThrough, hpDamage - hpNeutralized);

      if (newArmorHP <= 0) {
        armorDepleted = true;
        armorFrame.delete();
        console.log(`  ARMOR      DEPLETED  HP overflow:${finalHpDamage}`);
      } else {
        armorFrame.update({
          [`flags.${MODULE_ID}.armorCurrent`]: newArmorHP,
          'system.badge': { type: 'counter', value: newArmorHP, max: armorMax },
        });
        console.log(`  ARMOR      ${armorCurrent}→${newArmorHP}  HP leaked:${finalHpDamage}`);
      }
    }
  }

  console.log(`  HP         overflow:${finalHpDamage}  HP after:${Math.max(0, currentHP - finalHpDamage)}`);

  // ── Step 4: Rewrite changes ────────────────────────────────────────────────
  foundry.utils.setProperty(changes, 'system.attributes.hp.temp',  finalShieldHP);
  foundry.utils.setProperty(changes, 'system.attributes.hp.value', Math.max(0, currentHP - finalHpDamage));
  console.groupEnd();

  // ── Step 5: Post messages ──────────────────────────────────────────────────
  if (warpDetonated) {
    postChat(actor, warpBarrierHtml(barrierHPBefore, barrierMax));
  } else if (barrierDepleted) {
    postChat(actor, barrierDepletedHtml());
  }

  if (isElectricity && shield && rawShieldDamage > 0) {
    postChat(actor, lightningShieldHtml(effectiveShieldDamage, currentTemp, finalShieldHP, shieldMax));
  }
  if (isCollapse) {
    postChat(actor, shieldCollapseHtml(shieldMax));
  }

  if (isPhasic && armorFrame && hpDamage > 0) {
    postChat(actor, phasicBypassHtml(armorCurrent, armorMax));
  } else if (armorDepleted) {
    postChat(actor, armorDepletedHtml(armorMax));
  } else if (armorFrame && armorDamageTaken > 0) {
    postChat(actor, armorStatusHtml(newArmorHP, armorMax, isIncendiary, isAP));
  }

  if (isCryo && finalHpDamage > 0) {
    createChilledEffect(actor);
  }
});

// ── TURN-START REGEN ──────────────────────────────────────────────────────────

Hooks.on('pf2e.startTurn', async (first, second) => {
  const combatant = first?.actor  ? first
                  : second?.actor ? second
                  : null;

  if (!game.user.isGM) return;

  const actor = combatant?.actor;
  if (!actor) return;

  const shield  = getShieldEffect(actor);
  const barrier = getBioticBarrier(actor);
  if (!shield && !barrier) return;

  const parts = [];

  if (shield) {
    const baseMax   = shield.getFlag(MODULE_ID, 'shieldMax')   ?? 0;
    const baseRegen = shield.getFlag(MODULE_ID, 'shieldRegen') ?? 0;
    const hpMod     = getShieldHpMod(actor);
    const hpBonus   = hpMod ? (hpMod.getFlag(MODULE_ID, 'shieldHpBonus') ?? 0) : 0;
    const max       = baseMax + hpBonus;
    const regenMod  = getRegenMod(actor);
    const mult      = regenMod ? (regenMod.getFlag(MODULE_ID, 'regenMult') ?? 1) : 1;
    const regen     = Math.round(baseRegen * mult);
    const current   = actor.system.attributes.hp.temp ?? 0;

    if (current > 0) {
      if (current >= max) {
        parts.push(fullHtml(max));
      } else {
        const newTemp  = Math.min(current + regen, max);
        const restored = newTemp - current;
        await actor.update({ 'system.attributes.hp.temp': newTemp });
        parts.push(rechargeHtml(newTemp, max, restored));
      }
    } else {
      const inCover = hasTakeCover(actor);
      if (inCover) {
        const newTemp = Math.min(regen, max);
        await actor.update({ 'system.attributes.hp.temp': newTemp });
        parts.push(restoringHtml(newTemp, max));
      } else {
        parts.push(offlineHtml(max));
      }
    }
  }

  if (barrier) {
    const barrierMax     = barrier.getFlag(MODULE_ID, 'barrierMax')     ?? 0;
    const barrierCurrent = barrier.getFlag(MODULE_ID, 'barrierCurrent') ?? 0;
    if (barrierCurrent <= 0) {
      await barrier.delete();
    } else {
      parts.push(barrierStatusHtml(barrierCurrent, barrierMax));
    }
  }

  if (parts.length > 0) postChat(actor, parts.join(''));
});

// ── HELPERS ───────────────────────────────────────────────────────────────────

function isShieldEffect(item) {
  return item.flags?.[MODULE_ID]?.shieldMax != null
    && (item.type === 'equipment' || item.type === 'effect');
}

function getShieldEffect(actor) {
  return actor?.itemTypes?.equipment?.find(isShieldEffect)
    ?? actor?.itemTypes?.effect?.find(isShieldEffect)
    ?? null;
}

function isBioticBarrier(item) {
  return item.type === 'effect'
    && (item.flags?.[MODULE_ID]?.barrier === true
        || item.flags?.[MODULE_ID]?.barrierMax != null);
}

function getBioticBarrier(actor) {
  return actor?.itemTypes?.effect?.find(isBioticBarrier) ?? null;
}

function isArmorFrame(item) {
  return item.flags?.[MODULE_ID]?.armorMax != null
    && (item.type === 'equipment' || item.type === 'effect');
}

function getArmorFrame(actor) {
  return actor?.itemTypes?.equipment?.find(isArmorFrame)
    ?? actor?.itemTypes?.effect?.find(isArmorFrame)
    ?? null;
}

function isAmmoEffect(item) {
  return item.type === 'effect'
    && item.flags?.[MODULE_ID]?.ammoType != null;
}

function isRegenMod(item) {
  return item.flags?.[MODULE_ID]?.regenMult != null
    && (item.type === 'equipment' || item.type === 'effect');
}

function getRegenMod(actor) {
  return actor?.itemTypes?.equipment?.find(isRegenMod)
    ?? actor?.itemTypes?.effect?.find(isRegenMod)
    ?? null;
}

function isShieldHpMod(item) {
  return item.flags?.[MODULE_ID]?.shieldHpBonus != null
    && (item.type === 'equipment' || item.type === 'effect');
}

function getShieldHpMod(actor) {
  return actor?.itemTypes?.equipment?.find(isShieldHpMod)
    ?? actor?.itemTypes?.effect?.find(isShieldHpMod)
    ?? null;
}

// Returns a Set of damage types from the most recent damage-roll chat message.
function detectDamageTypes() {
  const recent = [...game.messages.contents].slice(-10).reverse();
  for (const msg of recent) {
    const pf2e = msg.flags?.pf2e;
    if (!pf2e) continue;
    if (pf2e.context?.type !== 'damage-roll') continue;
    const options = pf2e.context?.options ?? [];
    const types = new Set();
    for (const opt of options) {
      const m = opt.match(/^item:damage:type:(.+)$/);
      if (m) types.add(m[1]);
    }
    return types;
  }
  return new Set();
}

// Finds the attacker's active ammo effect by scanning the most recent
// damage-roll message for the speaker token, then checking that actor's effects.
function getAttackerAmmoType() {
  const recent = [...game.messages.contents].slice(-10).reverse();
  for (const msg of recent) {
    const pf2e = msg.flags?.pf2e;
    if (!pf2e) continue;
    if (pf2e.context?.type !== 'damage-roll') continue;
    const tokenId = msg.speaker?.token;
    const sceneId = msg.speaker?.scene;
    if (!tokenId) break;
    const scene = game.scenes.get(sceneId) ?? game.scenes.current;
    const token = scene?.tokens?.get(tokenId);
    const attackerActor = token?.actor;
    if (!attackerActor) break;
    const ammoEffect = attackerActor.itemTypes?.effect?.find(isAmmoEffect);
    return ammoEffect?.getFlag(MODULE_ID, 'ammoType') ?? null;
  }
  return null;
}

function hasTakeCover(actor) {
  const slug = game.settings.get(MODULE_ID, 'takeCoverSlug');
  return actor?.itemTypes?.effect?.some(e => e.system?.slug === slug) ?? false;
}

function getWhisperRecipients(actor) {
  const ids = new Set(game.users.filter(u => u.isGM).map(u => u.id));
  for (const [userId, level] of Object.entries(actor.ownership ?? {})) {
    if (userId === 'default') continue;
    if (level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) ids.add(userId);
  }
  return [...ids];
}

function postChat(actor, content) {
  ChatMessage.create({
    speaker: { alias: `⚡ ${actor.name}` },
    content,
    whisper: getWhisperRecipients(actor),
  });
}

async function createChilledEffect(actor) {
  await actor.createEmbeddedDocuments('Item', [{
    name: 'Chilled',
    type: 'effect',
    img: 'icons/magic/water/ice-snowflake-cold-blue.webp',
    flags: {},
    system: {
      slug: 'me-chilled',
      description: {
        value: '<p>Off-guard until the end of your next turn. Applied by Cryo Rounds.</p>',
      },
      duration: { value: 1, unit: 'turns', expiry: 'turn-end' },
      rules: [],
    },
  }]);
}

// ── CHAT HTML ─────────────────────────────────────────────────────────────────

const C = {
  active:   '#4fc3f7',
  broken:   '#ef5350',
  restore:  '#66bb6a',
  barrier:  '#ce93d8',
  overload: '#ff6f00',
  lightning:'#fff176',
  armor:    '#90a4ae',
  phasic:   '#00e5ff',
  warp:     '#ce93d8',
  incendiary: '#ff6f00',
  cryo:     '#80deea',
};

function shieldBar(current, max, color) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
    <div style="flex:1;background:rgba(0,0,0,0.3);border-radius:3px;height:7px;overflow:hidden;">
      <div style="width:${pct}%;background:${color};height:100%;border-radius:3px;"></div>
    </div>
    <span style="font-size:0.85em;white-space:nowrap;"><strong>${current}/${max}</strong></span>
  </div>`;
}

function card(color, body) {
  return `<div style="border-left:3px solid ${color};padding:5px 10px;`
    + `background:${color}18;border-radius:2px;font-size:0.95em;margin-top:4px;">${body}</div>`;
}

function fullHtml(max) {
  return card(C.active, `<strong>⚡ Shields at Full Capacity</strong>` + shieldBar(max, max, C.active));
}

function rechargeHtml(current, max, restored) {
  return card(C.active, `<strong>⚡ Shields Recharging</strong> +${restored}` + shieldBar(current, max, C.active));
}

function restoringHtml(current, max) {
  return card(C.restore,
    `<strong>🛡️ Shields Coming Online</strong><br>`
    + `Cover taken — kinetic barrier beginning to recharge.`
    + shieldBar(current, max, C.restore));
}

function offlineHtml(max) {
  return card(C.broken,
    `<strong>🛡️ Shields Offline</strong><br>`
    + `Kinetic barrier is depleted. <em>Take Cover to begin recharging.</em>`
    + shieldBar(0, max, C.broken));
}

function lightningShieldHtml(shieldDamage, _prevTemp, finalShieldHP, shieldMax) {
  return card(C.lightning,
    `<strong>⚡ Lightning Strike — Shields take double damage!</strong><br>`
    + `Shield damage: <strong>${shieldDamage}</strong> (${shieldDamage / 2} × 2)`
    + shieldBar(finalShieldHP, shieldMax, C.lightning));
}

function shieldCollapseHtml(shieldMax) {
  return card(C.overload,
    `<strong>🔴 Shield Overload — Shields Collapsed!</strong><br>`
    + `Massive hit exceeded overload threshold (${Math.ceil(shieldMax / 2)} damage). `
    + `<em>Take Cover to restart.</em>`
    + shieldBar(0, shieldMax, C.overload));
}

function barrierStatusHtml(current, max) {
  return card(C.barrier, `<strong>🟣 Biotic Barrier</strong>` + shieldBar(current, max, C.barrier));
}

function barrierDepletedHtml() {
  return card(C.barrier,
    `<strong>🟣 Biotic Barrier Collapsed</strong><br>`
    + `Barrier depleted — spend actions to reactivate.`);
}

function warpBarrierHtml(prevHP, max) {
  return card(C.warp,
    `<strong>🟣 Warp Detonation — Barrier Collapsed!</strong><br>`
    + `Warp rounds destroyed the biotic barrier (${prevHP} HP) in a dark energy detonation.`
    + shieldBar(0, max, C.warp));
}

function armorStatusHtml(current, max, isIncendiary, isAP) {
  const note = isIncendiary ? ' <em>(Incendiary — 1.5× armor damage)</em>'
             : isAP         ? ' <em>(AP — 50% bleed-through)</em>'
             : '';
  return card(C.armor,
    `<strong>🔩 Armor Absorbing Damage</strong>${note}`
    + shieldBar(current, max, C.armor));
}

function armorDepletedHtml(max) {
  return card(C.broken,
    `<strong>🔩 Armor Destroyed!</strong><br>`
    + `Combat Armor Frame has been completely ablated.`
    + shieldBar(0, max, C.broken));
}

function phasicBypassHtml(armorCurrent, armorMax) {
  return card(C.phasic,
    `<strong>🔵 Phasic Bypass — Armor Ignored</strong><br>`
    + `Phasic rounds phase through the armor frame (${armorCurrent}/${armorMax} AP remaining).`
    + shieldBar(armorCurrent, armorMax, C.phasic));
}

// ── ITEM CREATION UTILITIES ───────────────────────────────────────────────────

async function createShieldEffects() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can create shield effects.');

  let folder = game.folders.find(f => f.name === 'Mass Effect Shields' && f.type === 'Item');
  if (!folder) folder = await Folder.create({ name: 'Mass Effect Shields', type: 'Item', color: '#4fc3f7' });

  await Item.create({
    name: 'Kinetic Shield',
    type: 'equipment',
    img: 'icons/magic/defensive/shield-barrier-blue.webp',
    folder: folder.id,
    flags: { [MODULE_ID]: { shieldMax: 30, shieldRegen: 10 } },
    system: {
      slug: 'me-kinetic-shield',
      description: {
        value: `<p>A personal kinetic barrier providing <strong>30 Shield HP</strong>. Recharges <strong>10 HP per turn</strong>.</p>`
          + `<p>Equip <strong>Shield HP</strong> and <strong>Regen</strong> mods to upgrade your barrier. If fully depleted, the wearer must <strong>Take Cover</strong> before the shield will begin recharging.</p>`,
      },
      level:   { value: 1 },
      price:   { value: { sp: 150 } },
      bulk:    { value: 1 },
      equipped: { carryType: 'worn', inSlot: true },
      usage:   { value: 'other' },
      traits:  { value: [], rarity: 'common' },
      rules:   [],
    },
  });

  ui.notifications.info('ME Shields | Created Kinetic Shield item.');
}

async function createBarrierEffects() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can create barrier effects.');

  let folder = game.folders.find(f => f.name === 'Mass Effect Barriers' && f.type === 'Item');
  if (!folder) folder = await Folder.create({ name: 'Mass Effect Barriers', type: 'Item', color: '#ce93d8' });

  await Item.create({
    name: 'Biotic Barrier',
    type: 'effect',
    img: 'icons/magic/lightning/barrier-shield-crackling-orb-pink.webp',
    folder: folder.id,
    flags: { [MODULE_ID]: { barrier: true } },
    system: {
      slug: 'me-biotic-barrier',
      description: {
        value: `<p>A biotic barrier. HP = 5 × ⌊level ÷ 2⌋, calculated at activation.</p>`
          + `<p>Absorbs damage before shields and actual HP. Does not recharge per turn — spend actions to reactivate at full strength.</p>`,
      },
      duration: { value: -1, unit: 'unlimited', expiry: null },
      rules: [],
    },
  });

  ui.notifications.info('ME Shields | Created Biotic Barrier effect.');
}

async function createBarrierActionItems() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can create barrier action items.');

  let folder = game.folders.find(f => f.name === 'Mass Effect Barriers' && f.type === 'Item');
  if (!folder) folder = await Folder.create({ name: 'Mass Effect Barriers', type: 'Item', color: '#ce93d8' });

  const barrierEffect = game.items.find(i => i.type === 'effect' && i.flags?.[MODULE_ID]?.barrier === true);
  const selfEffect = barrierEffect ? { uuid: `Item.${barrierEffect.id}`, name: 'Biotic Barrier' } : null;

  const sharedDesc = `<p>You project a protective mass effect field. You gain a biotic barrier with Hit Points equal to 5 × half your level (rounded down, minimum 5). The barrier absorbs damage before your shields and actual HP.</p>`
    + `<p>The barrier lasts until depleted or dismissed. It does not recharge automatically — spend 2 actions to reactivate at full strength. Reactivating replaces any remaining barrier HP with a fresh full barrier.</p>`
    + `<table><tbody><tr><td><strong>Level</strong></td><td><strong>Barrier HP</strong></td></tr>`
    + `<tr><td>1–3</td><td>5</td></tr><tr><td>4–5</td><td>10</td></tr><tr><td>6–7</td><td>15</td></tr>`
    + `<tr><td>8–9</td><td>20</td></tr><tr><td>10–11</td><td>25</td></tr><tr><td>12–13</td><td>30</td></tr>`
    + `<tr><td>14–15</td><td>35</td></tr><tr><td>16–17</td><td>40</td></tr><tr><td>18–19</td><td>45</td></tr>`
    + `<tr><td>20</td><td>50</td></tr></tbody></table>`;

  await Item.create({
    name: 'Activate Biotic Barrier',
    type: 'feat',
    img: 'icons/magic/lightning/barrier-shield-crackling-orb-pink.webp',
    folder: folder.id,
    flags: { [MODULE_ID]: { barrier: true } },
    system: {
      slug: 'me-activate-biotic-barrier',
      description: { value: sharedDesc },
      rules: [],
      category: 'classfeature',
      level: { value: 1 },
      traits: { otherTags: ['biotic', 'barrier'], value: [] },
      prerequisites: { value: [{ value: 'Biotic Dedication or Biotic Barrier class feature' }] },
      actionType: { value: 'action' },
      actions: { value: 2 },
      selfEffect,
    },
  });

  await Item.create({
    name: 'Activate Biotic Barrier (NPC)',
    type: 'action',
    img: 'icons/magic/lightning/barrier-shield-crackling-orb-pink.webp',
    folder: folder.id,
    flags: { [MODULE_ID]: { barrier: true } },
    system: {
      slug: 'me-activate-biotic-barrier-npc',
      description: { value: sharedDesc },
      rules: [],
      traits: { otherTags: ['biotic', 'barrier'], value: [] },
      actionType: { value: 'action' },
      actions: { value: 2 },
      category: 'interaction',
      selfEffect,
    },
  });

  ui.notifications.info('ME Shields | Created Activate Biotic Barrier items.');
}

const SHIELD_HP_MOD_TIERS = [
  { tier: 1, bonus: 10, level: 3,  price: 600,   name: 'Shield HP Mod — Tier 1' },
  { tier: 2, bonus: 20, level: 6,  price: 2500,  name: 'Shield HP Mod — Tier 2' },
  { tier: 3, bonus: 40, level: 9,  price: 7000,  name: 'Shield HP Mod — Tier 3' },
  { tier: 4, bonus: 70, level: 12, price: 16000, name: 'Shield HP Mod — Tier 4' },
];

async function createShieldHpModEffects() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can create HP mod effects.');

  let folder = game.folders.find(f => f.name === 'Mass Effect Mods' && f.type === 'Item');
  if (!folder) folder = await Folder.create({ name: 'Mass Effect Mods', type: 'Item', color: '#80cbc4' });

  for (const mod of SHIELD_HP_MOD_TIERS) {
    await Item.create({
      name: mod.name,
      type: 'equipment',
      img: 'icons/magic/defensive/shield-barrier-glowing-blue.webp',
      folder: folder.id,
      flags: { [MODULE_ID]: { shieldHpBonus: mod.bonus } },
      system: {
        slug: `me-shield-hp-mod-t${mod.tier}`,
        description: {
          value: `<p>Increases kinetic shield capacity by <strong>+${mod.bonus} HP</strong> (base 30 → ${30 + mod.bonus}).</p>`
            + `<p>Only one Shield HP Mod can be installed at a time.</p>`,
        },
        level:   { value: mod.level },
        price:   { value: { sp: mod.price } },
        bulk:    { value: 0 },
        equipped: { carryType: 'worn', inSlot: true },
        usage:   { value: 'other' },
        traits:  { value: [], rarity: 'common' },
        rules:   [],
      },
    });
  }

  ui.notifications.info(`ME Shields | Created ${SHIELD_HP_MOD_TIERS.length} Shield HP Mod items.`);
}

const REGEN_MOD_TIERS = [
  { tier: 1, pct: 50,  mult: 1.5, level: 3,  price: 600,   name: 'Shield Regen Mod — Tier 1' },
  { tier: 2, pct: 100, mult: 2.0, level: 6,  price: 2500,  name: 'Shield Regen Mod — Tier 2' },
  { tier: 3, pct: 150, mult: 2.5, level: 9,  price: 7000,  name: 'Shield Regen Mod — Tier 3' },
  { tier: 4, pct: 200, mult: 3.0, level: 12, price: 16000, name: 'Shield Regen Mod — Tier 4' },
];

async function createRegenModEffects() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can create regen mod effects.');

  let folder = game.folders.find(f => f.name === 'Mass Effect Mods' && f.type === 'Item');
  if (!folder) folder = await Folder.create({ name: 'Mass Effect Mods', type: 'Item', color: '#80cbc4' });

  for (const mod of REGEN_MOD_TIERS) {
    await Item.create({
      name: mod.name,
      type: 'equipment',
      img: 'icons/magic/defensive/shield-barrier-flaming-diamond-blue-yellow.webp',
      folder: folder.id,
      flags: { [MODULE_ID]: { regenMult: mod.mult } },
      system: {
        slug: `me-shield-regen-mod-t${mod.tier}`,
        description: {
          value: `<p>Boosts kinetic shield recharge rate by <strong>+${mod.pct}%</strong> (base 10 → ${Math.round(10 * mod.mult)} HP/turn).</p>`
            + `<p>Only one Shield Regen Mod can be installed at a time.</p>`,
        },
        level:   { value: mod.level },
        price:   { value: { sp: mod.price } },
        bulk:    { value: 0 },
        equipped: { carryType: 'worn', inSlot: true },
        usage:   { value: 'other' },
        traits:  { value: [], rarity: 'common' },
        rules:   [],
      },
    });
  }

  ui.notifications.info(`ME Shields | Created ${REGEN_MOD_TIERS.length} Shield Regen Mod items.`);
}

async function createArmorFrameItems() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can create armor frame items.');

  let folder = game.folders.find(f => f.name === 'Mass Effect Armor' && f.type === 'Item');
  if (!folder) folder = await Folder.create({ name: 'Mass Effect Armor', type: 'Item', color: '#90a4ae' });

  for (const tier of ARMOR_FRAME_TIERS) {
    await Item.create({
      name: tier.name,
      type: 'equipment',
      img: 'icons/magic/defensive/shield-barrier-blue.webp',
      folder: folder.id,
      flags: { [MODULE_ID]: { armorMax: tier.ap } },
      system: {
        slug: `me-armor-frame-t${tier.tier}`,
        description: {
          value: `<p>An ablative combat armor frame providing <strong>${tier.ap} Armor Points</strong>.</p>`
            + `<p>Armor Points absorb damage that gets through shields, before it reaches your HP. The frame is destroyed when all Armor Points are depleted.</p>`
            + `<p><strong>Incendiary Rounds</strong> burn through armor 50% faster. <strong>Phasic Rounds</strong> bypass the armor frame entirely. <strong>Armor-Piercing Rounds</strong> allow 50% of damage to bleed through to shields/HP.</p>`,
        },
        level:    { value: tier.level },
        price:    { value: tier.price },
        bulk:     { value: 1 },
        equipped: { carryType: 'worn', inSlot: true },
        usage:    { value: 'other' },
        traits:   { value: ['tech'], rarity: 'common' },
        rules:    [],
      },
    });
  }

  ui.notifications.info(`ME Shields | Created ${ARMOR_FRAME_TIERS.length} Combat Armor Frame items.`);
}

async function createAmmoActionItems() {
  if (!game.user.isGM) return ui.notifications.warn('ME Shields | Only the GM can create ammo action items.');

  let folder = game.folders.find(f => f.name === 'Mass Effect Ammo Powers' && f.type === 'Item');
  if (!folder) folder = await Folder.create({ name: 'Mass Effect Ammo Powers', type: 'Item', color: '#ff6f00' });

  for (const ammo of AMMO_DEFS) {
    // Build DamageDice rule element (omit for ammo types with no bonus dice)
    const rules = ammo.diceNum > 0 ? [{
      key: 'DamageDice',
      selector: 'strike-damage',
      diceNumber: ammo.diceNum,
      dieSize: ammo.dieSz,
      damageType: ammo.damageType,
      label: ammo.name,
    }] : [];

    // Create the effect item first so we can reference its ID in the action
    const effect = await Item.create({
      name: ammo.name,
      type: 'effect',
      img: ammo.img,
      folder: folder.id,
      flags: { [MODULE_ID]: { ammoType: ammo.id } },
      system: {
        slug: `me-ammo-${ammo.id}`,
        description: { value: ammo.description },
        duration: { value: -1, unit: 'unlimited', expiry: null },
        rules,
      },
    });

    const selfEffect = { uuid: `Item.${effect.id}`, name: ammo.name };

    const actionDesc = `<p>You load ${ammo.name.toLowerCase()} into your weapon. ${ammo.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}</p>`;

    // PC feat action
    await Item.create({
      name: `Load ${ammo.name}`,
      type: 'feat',
      img: ammo.img,
      folder: folder.id,
      flags: { [MODULE_ID]: { ammoType: ammo.id } },
      system: {
        slug: `me-load-${ammo.id}`,
        description: { value: actionDesc },
        rules: [],
        category: 'classfeature',
        level: { value: 1 },
        traits: { otherTags: ['ammo-power'], value: [] },
        actionType: { value: 'action' },
        actions: { value: 1 },
        selfEffect,
      },
    });
  }

  ui.notifications.info(`ME Shields | Created ${AMMO_DEFS.length} ammo power items.`);
}

// ── AUTO-SYNC ─────────────────────────────────────────────────────────────────

async function syncEffects(version, { force = false } = {}) {
  const lastVersion = game.settings.get(MODULE_ID, 'lastSyncedVersion');
  if (!force && lastVersion === MODULE_DATA_VERSION) return;

  console.log(`ME Shields | Syncing effects (data v${MODULE_DATA_VERSION}, module v${version})…`);

  const stale = game.items.filter(i => {
    const f = i.flags?.[MODULE_ID];
    return f && (
      f.shieldMax     != null ||
      f.barrier       === true ||
      f.barrierMax    != null ||
      f.regenMult     != null ||
      f.shieldHpBonus != null ||
      f.armorMax      != null ||
      f.ammoType      != null
    );
  });
  for (const item of stale) await item.delete();

  for (const folderName of ['Mass Effect Shields', 'Mass Effect Barriers', 'Mass Effect Mods', 'Mass Effect Armor', 'Mass Effect Ammo Powers']) {
    const folder = game.folders.find(f => f.name === folderName && f.type === 'Item');
    if (folder && folder.contents.length === 0) await folder.delete();
  }

  await createShieldEffects();
  await createBarrierEffects();
  await createBarrierActionItems();
  await createShieldHpModEffects();
  await createRegenModEffects();
  await createArmorFrameItems();
  await createAmmoActionItems();
  await game.settings.set(MODULE_ID, 'lastSyncedVersion', MODULE_DATA_VERSION);
  console.log(`ME Shields | Sync complete.`);
}

// ── DEBUG UTILITY ─────────────────────────────────────────────────────────────

function debugShields(actor) {
  actor ??= canvas.tokens.controlled[0]?.actor ?? game.combat?.combatant?.actor;
  if (!actor) { console.warn('ME Shields | debug(): no actor selected'); return; }

  console.group(`ME Shields | Debug — ${actor.name}`);
  console.log('tempHP:', actor.system.attributes.hp.temp);

  const shield = getShieldEffect(actor);
  if (shield) {
    console.log('Shield:', shield.name, `| max=${shield.getFlag(MODULE_ID,'shieldMax')} regen=${shield.getFlag(MODULE_ID,'shieldRegen')}`);
  } else {
    console.warn('No shield effect found.');
  }

  const barrier = getBioticBarrier(actor);
  if (barrier) {
    console.log('Barrier:', barrier.name, `| max=${barrier.getFlag(MODULE_ID,'barrierMax')} current=${barrier.getFlag(MODULE_ID,'barrierCurrent')}`);
  }

  const armorFrame = getArmorFrame(actor);
  if (armorFrame) {
    console.log('Armor Frame:', armorFrame.name, `| max=${armorFrame.getFlag(MODULE_ID,'armorMax')} current=${armorFrame.getFlag(MODULE_ID,'armorCurrent')}`);
  }

  const hpMod = getShieldHpMod(actor);
  if (hpMod) console.log('HP Mod:', hpMod.name, `| bonus=${hpMod.getFlag(MODULE_ID,'shieldHpBonus')}`);

  const regenMod = getRegenMod(actor);
  if (regenMod) console.log('Regen Mod:', regenMod.name, `| mult=${regenMod.getFlag(MODULE_ID,'regenMult')}`);

  const ammoEffect = actor.itemTypes?.effect?.find(isAmmoEffect);
  if (ammoEffect) console.log('Ammo:', ammoEffect.name, `| type=${ammoEffect.getFlag(MODULE_ID,'ammoType')}`);

  console.log('Take Cover:', hasTakeCover(actor));
  console.groupEnd();
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

globalThis.MassEffectShields = {
  createShieldEffects,
  createBarrierEffects,
  createBarrierActionItems,
  createShieldHpModEffects,
  createRegenModEffects,
  createArmorFrameItems,
  createAmmoActionItems,
  sync:  (force = false) => syncEffects(game.modules.get(MODULE_ID)?.version ?? '?', { force }),
  debug: debugShields,
};
