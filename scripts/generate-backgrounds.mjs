import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT = "src/packs/me-backgrounds";
mkdirSync(OUT, { recursive: true });

const FREE_BOOST = ["cha", "con", "dex", "int", "str", "wis"];
const PUB = { title: "Mass Effect Compendium", authors: "nscarpinatodev", license: "ORC", remaster: true };

const BACKGROUNDS = [
  {
    id: "MEBackgnd0000001", name: "Alliance Soldier", slug: "alliance-soldier",
    skill: "ath", boosts: ["con", "str"], lore: "Alliance Military",
    desc: `<p>You served in the Systems Alliance military, humanity's primary defense force and its voice in galactic politics. Years of training, deployment, and combat experience hardened your body and sharpened your instincts. Whether you survived the Skyllian Blitz, patrolled the Terminus border, or served aboard an Alliance frigate, military service left an indelible mark on how you move, think, and solve problems.</p><p>You are trained in Athletics and gain the Alliance Military Lore skill. You boost Constitution or Strength, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000002", name: "Biotic Prodigy", slug: "biotic-prodigy",
    skill: "occ", boosts: ["con", "cha"], lore: "Biotic Theory",
    desc: `<p>Element zero exposure before birth — or a rare, unexplained neurological event — gifted you with exceptional biotic potential. You were identified early and sent for training at a biotic academy, where instructors noted your unusual raw ability even among students with similar exposure. Most biotics develop adequate field application. You developed something else entirely.</p><p>You are trained in Occultism and gain the Biotic Theory Lore skill. You boost Constitution or Charisma, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000003", name: "Cerberus Agent", slug: "cerberus-agent",
    skill: "itm", boosts: ["int", "str"], lore: "Cerberus Operations",
    desc: `<p>You believed — or needed to believe — in humanity's manifest destiny among the stars. Cerberus recruited you, trained you, and deployed you against threats the Alliance refused to acknowledge. The organization gave you resources, a mission, and the uncomfortable knowledge of what humanity's enemies are actually capable of. Whatever doubts you carry now, the skills remain.</p><p>You are trained in Intimidation and gain the Cerberus Operations Lore skill. You boost Intelligence or Strength, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000004", name: "Citadel Bureaucrat", slug: "citadel-bureaucrat",
    skill: "soc", boosts: ["int", "cha"], lore: "Citadel Politics",
    desc: `<p>The Citadel's administrative machinery is vast enough that millions of careers disappear into it without trace. Yours didn't. You navigated the Presidium's endless layered jurisdictions, learned which regulations were enforced and which were merely words, and developed an instinct for institutional power that most people never acquire. The Council doesn't govern the galaxy so much as it ratifies what the bureaucracy has already decided.</p><p>You are trained in Society and gain the Citadel Politics Lore skill. You boost Intelligence or Charisma, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000005", name: "Colonist", slug: "colonist",
    skill: "sur", boosts: ["con", "wis"], lore: "Frontier Survival",
    desc: `<p>You grew up somewhere humanity wasn't supposed to be able to survive — a colony world at the edge of explored space, an outpost that measured its isolation in months of travel time, a settlement that built everything it needed from whatever the planet provided. That experience gave you a pragmatic relationship with hardship that people raised in the inner systems simply don't have.</p><p>You are trained in Survival and gain the Frontier Survival Lore skill. You boost Constitution or Wisdom, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000006", name: "Corporate Operative", slug: "corporate-operative",
    skill: "dip", boosts: ["int", "cha"], lore: "Corporate Affairs",
    desc: `<p>The major corporations operating in galactic space — Eldfell-Ashland, Binary Helix, Synthetic Insights — answer to no government and employ their own security, intelligence, and negotiation assets. You were one of those assets. Your work required knowing when to talk, when to listen, and when to let the contract speak for itself.</p><p>You are trained in Diplomacy and gain the Corporate Affairs Lore skill. You boost Intelligence or Charisma, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000007", name: "Infiltrator", slug: "infiltrator",
    skill: "dec", boosts: ["dex", "int"], lore: "Intelligence Operations",
    desc: `<p>You gathered information that wasn't meant to be gathered. Whether you worked for Alliance Intelligence, a private security firm, or a client you never met in person, your value was your ability to be somewhere you weren't supposed to be and leave without anyone knowing you'd been there. The work changed how you process every room you enter.</p><p>You are trained in Deception and gain the Intelligence Operations Lore skill. You boost Dexterity or Intelligence, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000008", name: "Mercenary", slug: "mercenary",
    skill: "ath", boosts: ["str", "con"], lore: "Mercenary Operations",
    desc: `<p>The Blue Suns, Eclipse, Blood Pack, and dozens of smaller outfits provide the galaxy with armed professionals willing to do what standing militaries won't or can't. You were one of them. The work was rarely clean, always dangerous, and paid well enough that you kept taking contracts. You've learned to evaluate threats fast, because in your line of work you don't get a second chance to reassess.</p><p>You are trained in Athletics and gain the Mercenary Operations Lore skill. You boost Strength or Constitution, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000009", name: "Noble", slug: "noble",
    skill: "dip", boosts: ["cha", "int"], lore: "Aristocracy",
    desc: `<p>Wealth and influence are not the same thing, but you have both. Your family — or the institution you were born into — provided access to education, connections, and resources that most people spend careers trying to acquire. You've been in rooms where galaxy-shaping decisions were made, watched them be made badly, and understood that the real power usually belongs to whoever controls what gets said next.</p><p>You are trained in Diplomacy and gain the Aristocracy Lore skill. You boost Charisma or Intelligence, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000010", name: "Omni-Tool Engineer", slug: "omni-tool-engineer",
    skill: "cra", boosts: ["int", "dex"], lore: "Engineering",
    desc: `<p>You didn't just learn to use an omni-tool. You learned to understand it — the hardware layer, the firmware, the edge cases the manufacturer never anticipated, and the modifications that turn consumer hardware into something else entirely. That knowledge made you valuable to anyone who needed tech that worked in conditions where it wasn't supposed to.</p><p>You are trained in Crafting and gain the Engineering Lore skill. You boost Intelligence or Dexterity, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000011", name: "Quarian Pilgrim", slug: "quarian-pilgrim",
    skill: "cra", boosts: ["wis", "dex"], lore: "Migrant Fleet",
    desc: `<p>Your Pilgrimage took you away from the Flotilla and into a galaxy that had no reason to trust you. Quarians are tolerated at best, viewed with suspicion at worst. The year or more you spent away from the Fleet — finding something to bring back, finding yourself in the process — changed you in ways that even the Fleet elders couldn't have predicted. You brought back more than a gift.</p><p>You are trained in Crafting and gain the Migrant Fleet Lore skill. You boost Wisdom or Dexterity, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000012", name: "Scientist", slug: "scientist",
    skill: "arc", boosts: ["int", "wis"], lore: "Scientific Research",
    desc: `<p>The fundamental questions — of life, mass effect fields, dark energy, the Protheans, what lies beyond the relay network — pulled you into a life of research. You've worked in corporate labs, university positions, or independent settings where funding was uncertain and curiosity was the only constant. Science is the only methodology you trust completely, which makes you both valuable and occasionally difficult to work with.</p><p>You are trained in Arcana and gain the Scientific Research Lore skill. You boost Intelligence or Wisdom, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000013", name: "Smuggler", slug: "smuggler",
    skill: "thi", boosts: ["dex", "cha"], lore: "Underworld",
    desc: `<p>The galaxy runs on legal commerce and officially sanctioned contracts. The parts that matter, though, frequently don't. You've moved cargo that couldn't be declared, navigated inspection protocols designed to fail against creative interpretation, and developed a working relationship with people who exist in the spaces between law and its enforcement. You know what things are actually worth and who actually wants them.</p><p>You are trained in Thievery and gain the Underworld Lore skill. You boost Dexterity or Charisma, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000014", name: "Spectre Candidate", slug: "spectre-candidate",
    skill: "ste", boosts: ["str", "dex"], lore: "Spectre Operations",
    desc: `<p>The Council's Special Tactics and Reconnaissance operatives answer to no one but the Council itself, receive no public acknowledgment, and operate by a mandate that begins and ends with results. You were identified as a potential candidate — screened, evaluated, and subjected to a preparation process that most people never know exists. Whether you've been formally inducted yet or not, you were changed by the process.</p><p>You are trained in Stealth and gain the Spectre Operations Lore skill. You boost Strength or Dexterity, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000015", name: "Terminus Survivor", slug: "terminus-survivor",
    skill: "med", boosts: ["wis", "con"], lore: "Terminus Systems",
    desc: `<p>The Terminus Systems exist outside Council space and outside Council law. You grew up in a region where medical care was whatever you could provide yourself, law enforcement was whoever had the bigger weapon, and trust was the most dangerous luxury available. That environment taught you to assess injuries fast and treat them faster — survival in the Terminus often depends on being able to get back up before your enemies notice you went down.</p><p>You are trained in Medicine and gain the Terminus Systems Lore skill. You boost Wisdom or Constitution, and gain a free boost.</p>`,
  },
  // Location backgrounds
  {
    id: "MEBackgnd0000016", name: "Omega", slug: "omega",
    skill: "ste", boosts: ["dex", "cha"], lore: "Omega Underworld",
    desc: `<p>There is nowhere else in the galaxy quite like Omega. The Terminus's largest station has no government, no law, and no shortage of people willing to fill those vacancies violently. You grew up here, which means you learned early that visibility is a liability, that everyone wants something, and that the station's endless crowds are simultaneously your greatest danger and your best cover. Aria T'Loak keeps Omega from destroying itself. Everything else is negotiable.</p><p>You are trained in Stealth and gain the Omega Underworld Lore skill. You boost Dexterity or Charisma, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000017", name: "Illium", slug: "illium",
    skill: "dec", boosts: ["int", "cha"], lore: "Illium Trade Law",
    desc: `<p>Technically, Illium is a lawfully governed asari world. Practically, it operates as a free market with diplomatic immunity — a planet where anything can be bought, sold, or contracted if the paperwork is correct. You navigated that system, which means you know how to read a contract, understand which regulations are enforced, and recognize when someone is using legality as a tool rather than a constraint. The smile and the clause are both part of the negotiation.</p><p>You are trained in Deception and gain the Illium Trade Law Lore skill. You boost Intelligence or Charisma, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000018", name: "Citadel Wards", slug: "citadel-wards",
    skill: "soc", boosts: ["cha", "wis"], lore: "Citadel Wards",
    desc: `<p>The Presidium gleams for visiting dignitaries. The Wards are where everyone else lives. Millions of beings from dozens of species crowd into residential towers, commercial districts, and service corridors that most Presidium residents never see. Growing up in the Wards means learning the rhythms of a genuinely multicultural society — who trusts whom, which districts belong to which communities, and what the actual power structures are beneath the ones on the organization chart.</p><p>You are trained in Society and gain the Citadel Wards Lore skill. You boost Charisma or Wisdom, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000019", name: "Tuchanka", slug: "tuchanka",
    skill: "itm", boosts: ["str", "con"], lore: "Tuchanka Warlords",
    desc: `<p>Before the Genophage, Tuchanka was a krogan world of warring clans and fierce territorial contests. After it, the planet became something else — a blasted, radiation-scarred demonstration of what happens when a species is biologically broken by design. Growing up here demanded physical toughness and the ability to project power, because the alternative was to become prey. Tuchanka does not produce diplomats. It produces survivors who understand exactly what they survived.</p><p>You are trained in Intimidation and gain the Tuchanka Warlords Lore skill. You boost Strength or Constitution, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000020", name: "Thessia", slug: "thessia",
    skill: "occ", boosts: ["int", "wis"], lore: "Thessian Culture",
    desc: `<p>The asari homeworld is everything the species has spent three thousand years becoming — prosperous, cultured, suffused with biotic tradition and diplomatic sophistication. Thessia's schools are among the galaxy's finest. Its biotic academies are the oldest. Growing up here means you absorbed a civilization's worth of accumulated knowledge — including the biotic theory that underlies everything from L2 amplifiers to singularity fields. The galaxy looks different when you can read its physics.</p><p>You are trained in Occultism and gain the Thessian Culture Lore skill. You boost Intelligence or Wisdom, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000021", name: "Palaven", slug: "palaven",
    skill: "acr", boosts: ["dex", "wis"], lore: "Turian Military Doctrine",
    desc: `<p>Every turian serves. This is not metaphor or tradition — it is the organizing principle of an entire civilization. Palaven's mandatory military service structures society around collective duty, hierarchy, and the understanding that the individual exists in service of something larger. Your fifteen years of service gave you military training, a place in the hierarchy, and a set of physical instincts that civilian life cannot replicate. You learned to move through danger efficiently, because fear doesn't excuse failure.</p><p>You are trained in Acrobatics and gain the Turian Military Doctrine Lore skill. You boost Dexterity or Wisdom, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000022", name: "Sur'Kesh", slug: "surkesh",
    skill: "nat", boosts: ["int", "dex"], lore: "Sur'Kesh Science",
    desc: `<p>The salarian homeworld is a humid jungle world of extraordinary biological complexity — ecosystems dense enough that new species are still being catalogued, and a culture sophisticated enough to be cataloguing them. Sur'Kesh produced the Special Tasks Group, the galaxy's most effective intelligence service, and the scientific methodologies that underpin much of modern research. Growing up here means an instinctive relationship with living systems — their structures, their vulnerabilities, and their potential applications.</p><p>You are trained in Nature and gain the Sur'Kesh Science Lore skill. You boost Intelligence or Dexterity, and gain a free boost.</p>`,
  },
  {
    id: "MEBackgnd0000023", name: "Earth Native", slug: "earth-native",
    skill: "prf", boosts: ["cha", "wis"], lore: "Human History",
    desc: `<p>Humanity's homeworld carries the weight of the species' entire history — every war, every art form, every scientific breakthrough, every catastrophic failure. Earth is the cultural core of the Systems Alliance and the reference point against which humanity measures everything it has become in the galaxy. Growing up here means you were shaped by that history: the music, the politics, the literature, the sports, and the contradictions of a species that nearly destroyed its own planet and then decided to expand into someone else's galaxy.</p><p>You are trained in Performance and gain the Human History Lore skill. You boost Charisma or Wisdom, and gain a free boost.</p>`,
  },
];

for (const bg of BACKGROUNDS) {
  const doc = {
    _id: bg.id,
    _key: `!items!${bg.id}`,
    type: "background",
    name: bg.name,
    img: "systems/pf2e/icons/default-icons/background.svg",
    system: {
      description: { gm: "", value: bg.desc },
      rules: [],
      slug: bg.slug,
      traits: { rarity: "common", value: [], otherTags: [] },
      boosts: {
        "0": { value: bg.boosts },
        "1": { value: FREE_BOOST },
      },
      items: {},
      trainedLore: bg.lore,
      trainedSkills: { value: [bg.skill] },
      _migration: { version: 0.955, lastMigration: null, previous: null },
      publication: PUB,
    },
    effects: [],
    folder: null,
    flags: {},
    ownership: { default: 0 },
  };

  const filename = join(OUT, `${bg.slug}.json`);
  writeFileSync(filename, JSON.stringify(doc, null, 2));
  console.log(`wrote ${filename}`);
}

console.log(`\n✓ Generated ${BACKGROUNDS.length} backgrounds`);
