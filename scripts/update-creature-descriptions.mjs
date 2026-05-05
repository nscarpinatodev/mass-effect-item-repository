/**
 * One-time script: update creature publicNotes and img from Mass Effect Wiki.
 * Run: node scripts/update-creature-descriptions.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DIR = 'src/packs/me-creatures';

const UPDATES = {
  'abomination': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/7/72/Abomination.png',
    notes: '<p>Abominations are a Husk variant created by the Collectors, distinguished from standard Husks by their red bioluminescent glow. They function as suicide shock troops, charging enemies and detonating on contact to deal heavy area damage.</p><p>Their death explosion can chain-kill nearby unarmored Husks, and unlike regular Husks they can be turned against their allies using the Dominate power.</p>',
  },
  'banshee': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/e/eb/ME3_Banshee.png',
    notes: '<p>Banshees are Reaper-converted asari, specifically created from Ardat-Yakshi — asari with a rare neurological condition that makes them uniquely susceptible to the conversion process. The result amplifies their already formidable biotic abilities and strips away all independent will.</p><p>In combat, Banshees are lethal at both range and close quarters. They launch powerful biotic projectiles, teleport across the battlefield, and possess a lethal sync-kill grab. They are protected by both barriers and armor.</p>',
  },
  'brute': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/9/90/ME3_Brute.png',
    notes: '<p>Brutes are Reaper-created amalgamations of turian and krogan tissue, fusing two biologically incompatible species with Reaper implants that regulate their body chemistry. The combination of turian military physiology and krogan blood rage produces a creature capable of destroying armored vehicles.</p><p>In combat, Brutes charge and sweep with melee attacks that can strip shields and health in a single hit, and can leap and slam to stagger nearby enemies. Their unprotected head is a weak point they often guard with their arm.</p>',
  },
  'cannibal': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/1/1b/ME3_Cannibal.png',
    notes: '<p>Cannibals are synthetic-organic Reaper soldiers created primarily from batarians, mutated by Reaper technology and deployed alongside Husks during the invasion of Earth. Their most distinctive ability is consuming fallen enemies on the battlefield to regenerate health and grow armored plating over their bodies.</p><p>They wield a gun fused to a human corpse used as an arm, and lack any dodge capability, making them vulnerable to powers. Incendiary Ammo can permanently halt their regeneration after they have fed.</p>',
  },
  'collector-captain': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/8/8f/Collector_CapME3.jpg',
    notes: '<p>Collector Captains are Collector tactician units that serve as squad commanders in Mass Effect 2, directing other Collector forces on the battlefield. They are armed with Collector Assault Rifles and protected by biotic barriers.</p><p>Their most notable role is deploying Seeker Swarms to disable the abilities of Shepard and squadmates. Like all Collectors, they can be possessed by Harbinger, which dramatically increases their combat lethality.</p>',
  },
  'collector-drone': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/a/a3/Collector.png',
    notes: '<p>Collector Drones are the standard foot soldiers of the Collector forces and the most numerous enemy type encountered in Mass Effect 2. Each drone is a Prothean-derived being cybernetically modified and indoctrinated to the point of having all independent intelligence eradicated.</p><p>They are armed with Collector Assault Rifles and represent the basic combat unit of the Collector army. Like all Collectors, they can be possessed by Harbinger.</p>',
  },
  'collector-guardian': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/c/ce/Collector_Guardian.png',
    notes: '<p>Collector Guardians are Collector combat units in Mass Effect 2 equipped with Collector Assault Rifles and protected by biotic barriers. They are distinguished by their ability to deploy personal anti-ballistic shields and use Warp ammunition against Shepard\'s squad.</p><p>Like all Collectors, they can be possessed by Harbinger, which significantly increases their combat effectiveness and damage output.</p>',
  },
  'collector-harbinger': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/c/c3/ME2_Harbinger_Possessed.png',
    notes: '<p>Harbinger is the most powerful known Reaper and primary director of the Collector forces, participating in ground combat by remotely possessing individual Collector units. When it assumes control, the drone\'s skin becomes covered in glowing red cracks and its eyes emit a bright orange glow, granting it fully charged barriers, armor, and powerful biotic attacks.</p><p>Harbinger prefers to possess weaker or damaged Collector units and relinquishes control only when the possessed body is destroyed, at which point it can immediately possess another nearby unit.</p>',
  },
  'collector-soldier': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/d/d3/Collector_TrooperME3.jpg',
    notes: '<p>Collector Soldiers are a combat-specialized class of Collector drone encountered in Mass Effect 2, armed with Collector Assault Rifles. Like all Collectors, they are the remnants of the Prothean race, converted over 50,000 years into cybernetically enslaved servants of the Reapers.</p><p>They can be possessed by Harbinger during combat, transforming them into significantly more dangerous opponents with enhanced defenses and abilities.</p>',
  },
  'geth-armature': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/d/d0/Geth_armature_enemy_box.png',
    notes: '<p>The Geth Armature is a large quadrupedal walker platform used as a mobile anti-vehicle and anti-personnel unit, frequently deployed from Geth Dropships. When inactive, Armatures fold into a compact state for transport.</p><p>They are armed with a Siege Pulse assault cannon and are highly dangerous at long range. They are often escorted by Geth Rocket Troopers and represent a significant threat to infantry and vehicles alike.</p>',
  },
  'geth-colossus': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/7/7e/Geth_colossus_enemy_box.png',
    notes: '<p>The Geth Colossus is the largest geth ground combat platform, appearing in Mass Effect 1 as a significantly upgraded Geth Armature with greater health, heavier armor, and more powerful weaponry. It is visually distinct by its larger size and platinum-silver armor with ridges along the back.</p><p>Equipped with mass accelerator machine guns and a powerful Siege Pulse cannon, it is one of the most formidable enemies in the first game and can devastate any squad caught in the open.</p>',
  },
  'geth-destroyer': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/5/57/Geth_destroyer_ME_LE_enemy_box.png',
    notes: '<p>The Geth Destroyer is a large, heavily armed geth infantry platform standing approximately eleven feet tall with dark grey armor and a bright blue optical sensor. It is equipped with a Geth Pulse Shotgun and strong shielding.</p><p>It will attempt to flank enemies before closing for powerful melee attacks. Despite not using cover as frequently as other geth units, its resilience and offensive power make it a serious threat at close range.</p>',
  },
  'geth-hopper': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/f/ff/ME_LE_Geth_Hopper_Codex.png',
    notes: '<p>The Geth Hopper is a specialized geth platform designed for stealth attacks, cyberwarfare, and sabotage, encountered in Mass Effect 1. Hoppers can disrupt hardsuit computers, shields, and weapons, and are capable of Sabotage, Overload, and radar jamming.</p><p>They use a geth sniper beam weapon and are lightly shielded, excelling at hit-and-run harassment. Their agility and disruptive capabilities make them a persistent nuisance in any engagement.</p>',
  },
  'geth-hunter': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/e/e4/Geth_Hunter_LE2_enemy_box.png',
    notes: '<p>Geth Hunters are stealth infantry units armed with shotguns, encountered in Mass Effect 2. They use tactical cloaking devices to approach unseen before closing distance and eliminating targets at short range.</p><p>Their stealth capability makes them especially dangerous when more visible threats demand attention. They are best countered with area-denial abilities that reveal their position before they can close to shotgun range.</p>',
  },
  'geth-prime': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/a/ac/Geth_prime_ME_LE_enemy_box.png',
    notes: '<p>Geth Primes are the most powerful and elite geth infantry platforms, standing approximately twelve feet tall with white armor. They carry a heavy pulse rifle capable of launching rockets, possess very strong shields and heavy armor, and wield a suite of tech abilities.</p><p>Geth Primes boost the combat capabilities of nearby geth units while jamming enemy radar. Eliminating them quickly significantly degrades the effectiveness of surrounding geth forces.</p>',
  },
  'geth-rocket-trooper': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/1/1f/Geth_rocket_trooper_ME_LE_enemy_box.png',
    notes: '<p>Geth Rocket Troopers are geth support infantry units armed with powerful rocket launchers, providing anti-armor and anti-air capability from long range. They are equipped with shielding and usually operate alongside heavier geth units such as Armatures.</p><p>Their rockets deal heavy damage against grouped targets and vehicles, making them priority targets in any engagement. Leaving them unaddressed in cover will rapidly attrite any advancing squad.</p>',
  },
  'geth-stalker': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/e/ec/ME_geth_stalker.png',
    notes: '<p>The Geth Stalker is a variant of the Geth Hopper platform used by geth loyal to Saren Arterius, distinguished by camouflage-patterned black-on-white coloring. Like standard Hoppers, Stalkers are cyberwarfare platforms capable of disrupting shields, weapons, and hardsuit systems.</p><p>They are agile, lightly shielded harassers that are difficult to pin down. Their cyberwarfare attacks can cripple a squad\'s defenses at the worst possible moment.</p>',
  },
  'geth-trooper': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/f/f9/Geth_trooper_ME_LE_enemy_box.png',
    notes: '<p>Geth Troopers are the standard ground infantry of the geth, encountered throughout the Mass Effect trilogy as the most common geth enemy type. They are equipped with Geth Pulse Rifles and Geth Barriers, and can use the Geth Shield Boost ability to recharge their defenses mid-combat.</p><p>While individually manageable, they attack in groups supported by heavier geth units. Their coordinated tactics and ability to rapidly restore shields make them a persistent threat.</p>',
  },
  'harvester': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/a/ae/ME3_Harvester.png',
    notes: '<p>Harvesters are large flying predator creatures native to worlds including Tuchanka, roughly a third the size of a Thresher Maw. During the Reaper invasion in Mass Effect 3, many were corrupted and repurposed as troop transports and atmospheric combat craft.</p><p>In combat they are armed with powerful head-mounted heavy cannons and can deploy other Reaper forces, making them both a direct threat and a force multiplier that demands immediate attention.</p>',
  },
  'husk': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/e/ec/Husk_ME_adversarybox.png',
    notes: '<p>Husks are synthetic-organic soldiers created when living beings are impaled on Reaper-origin devices called Dragon\'s Teeth, which replace water and trace minerals with cybernetics that reanimate the body. They appear throughout all three Mass Effect games as the frontline troops of the geth, the Collectors, and the Reapers.</p><p>In combat, Husks charge in packs and deliver a powerful electrical overload blast at close range that disables shields. They are immune to Hacking but vulnerable to Neural Shock.</p>',
  },
  'husked-geth': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/a/a8/ME3_Geth_Zombie.png',
    notes: '<p>A Geth Trooper platform corrupted and reanimated by Reaper technology after battlefield destruction, known informally as a "Geth Zombie." The Reaper signal overwrites their consensus network access and repurposes their combat chassis with reckless aggression.</p><p>Husked Geth retain the armor and basic combat capabilities of a standard trooper but operate without tactical networking, charging enemies in disorganized rushes. They are primarily encountered during the Reaper invasion of geth-controlled space in Mass Effect 3.</p>',
  },
  'leaper': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/3/3e/ME3_Leaper.png',
    notes: '<p>Leapers are small, agile Reaper-created creatures encountered during the ground war on Tuchanka in Mass Effect 3. They attack in packs, using their speed and leaping ability to close distance rapidly and overwhelm enemies with relentless melee pressure.</p><p>While individually weak, Leapers are dangerous in numbers and can quickly surround and bring down a soldier separated from their squad. They are best handled with area-of-effect attacks or high-rate-of-fire weapons.</p>',
  },
  'marauder': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/9/9b/ME3_Marauder.png',
    notes: '<p>Marauders are Reaper-created synthetic-organic soldiers derived from turian victims, functioning as squad leaders and frontline combatants within the Reaper ground forces in Mass Effect 3. They are the only Reaper enemy type that uses conventional-style firearms.</p><p>Their most notable ability is granting armored plating to nearby Husks and Cannibals, significantly increasing those units\' durability. Taking out Marauders quickly is a priority to prevent allied units from becoming heavily armored.</p>',
  },
  'phantom': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/c/cb/ME3_Phantom.png',
    // keep existing good description from actor-ancestry
  },
  'praetorian': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/a/ad/Praetorian_Combat.png',
    notes: '<p>The Praetorian is a massive, slow-moving aerial Collector construct encountered in Mass Effect 2, created by fusing approximately thirty deformed Husks into a single platform. It hovers just above the ground and is armed with powerful twin particle beam cannons.</p><p>It is protected by both a strong biotic barrier and a heavily armored carapace, making it one of the most durable enemies in ME2. Its combined health pool demands sustained, coordinated fire to bring down.</p>',
  },
  'ravager': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/7/7b/ME3_Ravager.png',
    notes: '<p>Ravagers are former rachni transformed by the Reapers through implantation and genetic modification into living heavy artillery platforms, encountered in Mass Effect 3. They are armed with two long-range cannons and continuously spawn Swarmers from egg sacs to harass enemies.</p><p>When a Ravager\'s egg sacs are destroyed or it is killed, all remaining Swarmers burst out and charge at enemies. Ravagers are protected by heavy armor only, with no shields or barriers.</p>',
  },
  'scion': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/f/f4/Scion_Frontal.png',
    notes: '<p>Scions are Collector-created constructs assembled by fusing three Husks together into a single powerful unit, encountered in Mass Effect 2. They are armed with a powerful long-range arm cannon and protected entirely by heavy armor — no shields or barriers.</p><p>Scions fire their cannons in three-round salvos and can be possessed by Harbinger, which grants them faster fire, harder-to-dodge projectiles, and a devastating one-hit melee attack. They are slow but extremely resilient.</p>',
  },
  'seeker-swarm': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/8/8f/SwarmME3.jpg',
    notes: '<p>Seeker Swarms are insectoid Collector probes released in large numbers to neutralize organic targets. The Collectors use them to paralyze the populations of entire human colonies before moving in to collect the incapacitated bodies.</p><p>In combat, a swarm deals ongoing damage, disables cooldown-based powers, and reduces weapon accuracy. They are deployed by Collector Captains and are best countered by staying mobile and using environmental cover.</p>',
  },
  'thresher-maw': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/e/e0/Codex_ME_-_Thresher_Maws.png',
    // keep existing good description from actor-ancestry
  },
  'varren': {
    img: 'https://static.wikia.nocookie.net/masseffect/images/6/63/Codex_ME_-_Varren.png',
    // keep existing good description from actor-ancestry
  },
};

let updated = 0;
for (const file of readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  const slug = file.replace('.json', '');
  const u = UPDATES[slug];
  if (!u) continue;

  const path = join(DIR, file);
  const actor = JSON.parse(readFileSync(path, 'utf8'));

  if (u.img) {
    actor.img = u.img;
    if (actor.prototypeToken?.texture) {
      actor.prototypeToken.texture.src = u.img;
    }
  }
  if (u.notes) {
    actor.system.details.publicNotes = u.notes;
    // Update blurb too (first sentence)
    const plain = u.notes.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const match = plain.match(/^[^.!?]+[.!?]/);
    actor.system.details.blurb = match ? match[0].trim() : plain.slice(0, 120);
  }

  writeFileSync(path, JSON.stringify(actor, null, 2) + '\n', 'utf8');
  updated++;
}

console.log(`Updated ${updated} creature files.`);
