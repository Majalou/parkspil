// "Min egen park": build and design your own roller coasters
const OWN_LOT_COSTS = [150, 300, 500, 800, 1200, 1600];

// L = length in metres, dh = height change, turn = +1 left / -1 right
const PIECES = {
  straight: { name: 'Ligeud', icon: '➖', cost: 2, unlock: 0, L: 8 },
  up: { name: 'Bakke op', icon: '↗️', cost: 4, unlock: 0, L: 10, dh: 6 },
  down: { name: 'Bakke ned', icon: '↘️', cost: 4, unlock: 0, L: 10, dh: -6 },
  chain: { name: 'Kædeløft', icon: '⛓️', cost: 8, unlock: 0, L: 14, dh: 10 },
  brake: { name: 'Bremse', icon: '🛑', cost: 3, unlock: 0, L: 6 },
  left: { name: 'Sving til venstre', icon: '↩️', cost: 5, unlock: 40, turn: 1 },
  right: { name: 'Sving til højre', icon: '↪️', cost: 5, unlock: 40, turn: -1 },
  bigdrop: { name: 'Stort fald', icon: '⏬', cost: 8, unlock: 60, L: 16, dh: -16 },
  tunnel: { name: 'Tunnel', icon: '🕳️', cost: 10, unlock: 80, L: 12 },
  splash: { name: 'Vandplask', icon: '💦', cost: 12, unlock: 100, L: 12, dh: -4 },
  booster: { name: 'Raketstart', icon: '🚀', cost: 15, unlock: 120, L: 10 },
  twist: { name: 'Twist', icon: '🌀', cost: 15, unlock: 120, L: 14 },
  loop: { name: 'Loop', icon: '🔄', cost: 20, unlock: 150 },
};
const STARTER_PIECES = ['straight', 'up', 'down', 'chain', 'brake'];

const THEMES = {
  klassisk: { name: 'Klassisk', icon: '🎡', cost: 0, sky: ['#5fb3f9', '#e3f4ff'], ground: '#5fb84a', track: '#e63946', support: '#c0c7cf', deco: ['🌳', '🌲'] },
  jungle: { name: 'Jungle', icon: '🌴', cost: 60, sky: ['#4fc3f7', '#e9ffe0'], ground: '#2e7d32', track: '#ff9f1c', support: '#6d4c41', deco: ['🌴', '🌿', '🦜'] },
  pirat: { name: 'Piratø', icon: '🏝️', cost: 80, sky: ['#29b6f6', '#e1f5fe'], ground: '#f4d58d', water: true, track: '#6d4c41', support: '#8d6e63', deco: ['🌴', '⚓', '🏝️'] },
  rummet: { name: 'Rummet', icon: '🪐', cost: 100, sky: ['#05051a', '#2a1f5c'], ground: '#3d3d5c', stars: true, track: '#00e5ff', support: '#9aa3ad', deco: ['🪐', '🌙', '🛸'] },
  slik: { name: 'Slikland', icon: '🍭', cost: 80, sky: ['#ffafcc', '#fff0f6'], ground: '#ffc8dd', track: '#8338ec', support: '#ffffff', deco: ['🍭', '🍬', '🧁'] },
  viking: { name: 'Vikinger', icon: '⚔️', cost: 60, sky: ['#7fb3d5', '#e8f4fa'], ground: '#4f7942', track: '#6d4c41', support: '#a1887f', deco: ['🌲', '🪨', '🛡️'] },
  gys: { name: 'Gys', icon: '🎃', cost: 100, sky: ['#1b1440', '#d9784a'], ground: '#3b5a32', stars: true, track: '#ff6d00', support: '#555555', deco: ['🎃', '🦇', '🕸️'] },
};

const CAR_SHAPES = {
  klassisk: { name: 'Klassisk', icon: '🚃', cost: 0 },
  raket: { name: 'Raket', icon: '🚀', cost: 50 },
  svane: { name: 'Svane', icon: '🦢', cost: 50 },
  poelse: { name: 'Pølse', icon: '🌭', cost: 40 },
  tog: { name: 'Damptog', icon: '🚂', cost: 60 },
  skib: { name: 'Piratskib', icon: '⛵', cost: 70 },
  drage: { name: 'Drage', icon: '🐉', cost: 80 },
};
const STATIONS = {
  hytte: { name: 'Træhytte', icon: '🛖', cost: 0, wall: '#a1887f', roof: '#6d4c41' },
  cirkus: { name: 'Cirkustelt', icon: '🎪', cost: 60, wall: '#ffffff', roof: '#e63946' },
  slik: { name: 'Slikhus', icon: '🧁', cost: 70, wall: '#ffc8dd', roof: '#8338ec' },
  slot: { name: 'Slot', icon: '🏰', cost: 80, wall: '#cfd8dc', roof: '#3a86ff' },
  pirat: { name: 'Piratskib', icon: '⛵', cost: 90, wall: '#8d5524', roof: '#212121' },
  rum: { name: 'Rumstation', icon: '🛸', cost: 100, wall: '#eceff1', roof: '#00bcd4' },
};
const QUEUES = {
  lige: { name: 'Lige kø', icon: '➖', cost: 0 },
  zigzag: { name: 'Zigzag-kø', icon: '〰️', cost: 30 },
  bugtet: { name: 'Bugtet kø', icon: '🌀', cost: 40 },
  tag: { name: 'Kø med tag', icon: '⛱️', cost: 60 },
};
const OWN_COLORS = ['#e63946', '#ff9f1c', '#ffd23f', '#0ead69', '#3a86ff', '#8338ec', '#ff70a6', '#00e5ff', '#ffffff', '#1d1d1d', '#6d4c41', '#d4af37'];

// Props. svg = custom drawing key in IsoPark.PROP_SVG, otherwise emoji
const PROPS = [
  { id: 'klovn', cat: 'figur', name: 'Klovn', e: '🤡', cost: 15 },
  { id: 'viking', cat: 'figur', name: 'Viking', svg: 'viking', cost: 20 },
  { id: 'pirat', cat: 'figur', name: 'Pirat', svg: 'pirat', cost: 20 },
  { id: 'robot', cat: 'figur', name: 'Robot', e: '🤖', cost: 20 },
  { id: 'dino', cat: 'figur', name: 'Dinosaur', e: '🦖', cost: 25 },
  { id: 'spoegelse', cat: 'figur', name: 'Spøgelse', e: '👻', cost: 15 },
  { id: 'havfrue', cat: 'figur', name: 'Havfrue', e: '🧜', cost: 25 },
  { id: 'rumvaesen', cat: 'figur', name: 'Rumvæsen', e: '👽', cost: 20 },
  { id: 'trold', cat: 'figur', name: 'Trold', e: '🧌', cost: 20 },
  { id: 'enhjoerning', cat: 'figur', name: 'Enhjørning', e: '🦄', cost: 30 },
  { id: 'lygte', cat: 'lys', name: 'Lygtepæl', svg: 'lygte', cost: 8 },
  { id: 'fakkel', cat: 'lys', name: 'Ildfakkel', svg: 'fakkel', cost: 8 },
  { id: 'lyskaede', cat: 'lys', name: 'Lyskæde', svg: 'lyskaede', cost: 12 },
  { id: 'neon', cat: 'lys', name: 'Neonstjerne', svg: 'neon', cost: 15 },
  { id: 'lanterne', cat: 'lys', name: 'Lanterne', e: '🏮', cost: 10 },
  { id: 'blomster', cat: 'natur', name: 'Blomster', e: '🌷', cost: 5 },
  { id: 'solsikke', cat: 'natur', name: 'Solsikke', e: '🌻', cost: 5 },
  { id: 'palme', cat: 'natur', name: 'Palme', e: '🌴', cost: 10 },
  { id: 'kaktus', cat: 'natur', name: 'Kaktus', e: '🌵', cost: 8 },
  { id: 'svamp', cat: 'natur', name: 'Svamp', e: '🍄', cost: 8 },
  { id: 'trae', cat: 'natur', name: 'Træ', e: '🌳', cost: 10 },
  { id: 'springvand', cat: 'ting', name: 'Springvand', e: '⛲', cost: 30 },
  { id: 'fyrvaerkeri', cat: 'ting', name: 'Fyrværkeri', e: '🎆', cost: 25 },
  { id: 'ballon', cat: 'ting', name: 'Balloner', e: '🎈', cost: 8 },
  { id: 'slikstang', cat: 'ting', name: 'Slikstang', e: '🍭', cost: 10 },
  { id: 'raket', cat: 'ting', name: 'Raket', e: '🚀', cost: 30 },
  { id: 'skat', cat: 'ting', name: 'Skattekiste', svg: 'skat', cost: 25 },
  { id: 'isbod', cat: 'ting', name: 'Isbod', e: '🍦', cost: 20 },
  { id: 'poelsevogn', cat: 'ting', name: 'Pølsevogn', e: '🌭', cost: 20 },
];
const PROP_CATS = [['figur', '🤡 Figurer'], ['lys', '💡 Lys'], ['natur', '🌷 Natur'], ['ting', '🎈 Ting']];

// Theme packs: buy the pack once, then its things cost like other decorations
const PACKS = {
  vand: { name: 'Vand', icon: '💧', cost: 120, desc: 'Søer, vandfald, vandsprøjt, broer, åkander og dyr fra vandet.' },
  viking: { name: 'Vikinger', icon: '⚔️', cost: 150, desc: '4 vikinger, vikingeskib, langhus, skjolde, våben og runesten.' },
  pirat: { name: 'Pirater', icon: '🏴‍☠️', cost: 150, desc: '4 pirater, piratskib, kanon, flag, guld og diamanter.' },
  dyr: { name: 'Dyr', icon: '🦁', cost: 150, desc: 'Heste, grise, får, løver, enhjørninger, trolde, aber, giraffer og mange flere.' },
  dino: { name: 'Dinosaurer', icon: '🦖', cost: 120, desc: 'Dinosaurer, dino-æg, vulkan og knogler.' },
  eventyr: { name: 'Eventyr', icon: '🏰', cost: 140, desc: 'Slot, prinsesse, prins, drage, troldmand og fe.' },
  rum: { name: 'Rummet', icon: '🪐', cost: 120, desc: 'Astronauter, planeter, ufoer og satellitter.' },
};
const packProps = (pack, list) => list.forEach(([id, name, cost, look]) => PROPS.push({ id, cat: pack, pack, name, cost, ...(/^[a-z]+$/.test(look) ? { svg: look } : { e: look }) }));
packProps('vand', [['soe', 'Sø', 25, 'soe'], ['vandfald', 'Vandfald', 35, 'vandfald'], ['sproejt', 'Vandsprøjt', 25, 'sproejt'], ['bro', 'Bro', 20, 'bro'],
  ['aakande', 'Åkander', 15, 'aakande'], ['and', 'Ænder', 10, '🦆'], ['svane', 'Svane', 12, '🦢'], ['delfin', 'Delfin', 20, '🐬'], ['fisk', 'Fisk', 8, '🐠'], ['fyrtaarn', 'Fyrtårn', 30, 'fyrtaarn']]);
packProps('viking', [['vkriger', 'Viking-kriger', 20, 'vkriger'], ['vskjold', 'Skjoldmø', 20, 'vskjold'], ['vhoevding', 'Høvding', 25, 'vhoevding'], ['vbue', 'Bueskytte', 20, 'vbue'],
  ['vskib', 'Vikingeskib', 40, 'vskib'], ['langhus', 'Langhus', 35, 'langhus'], ['skjolde', 'Skjolde', 15, 'skjolde'], ['vaaben', 'Våben', 15, 'vaaben'], ['runesten', 'Runesten', 15, 'runesten'], ['baal', 'Bål', 12, 'baal']]);
packProps('pirat', [['pkaptajn', 'Kaptajn', 25, 'pkaptajn'], ['ppapegoeje', 'Pirat med papegøje', 20, 'ppapegoeje'], ['ptraeben', 'Pirat med træben', 20, 'ptraeben'], ['ppige', 'Piratpige', 20, 'ppige'],
  ['pskib', 'Piratskib', 40, 'pskib'], ['kanon', 'Kanon', 15, 'kanon'], ['pflag', 'Piratflag', 10, 'pflag'], ['guld', 'Guld', 20, 'guld'], ['diamanter', 'Diamanter', 25, 'diamanter'], ['pskat', 'Skattekiste', 25, 'skat']]);
packProps('dyr', [['hest', 'Hest', 12, '🐎'], ['gris', 'Gris', 10, '🐖'], ['faar', 'Får', 10, '🐑'], ['ko', 'Ko', 12, '🐄'], ['loeve', 'Løve', 18, '🦁'], ['tiger', 'Tiger', 18, '🐅'],
  ['denhj', 'Enhjørning', 20, '🦄'], ['dtrold', 'Trold', 15, '🧌'], ['fugl', 'Fugl', 6, '🐦'], ['papegoeje', 'Papegøje', 10, '🦜'], ['abe', 'Abe', 12, '🐒'], ['zebra', 'Zebra', 15, '🦓'],
  ['giraf', 'Giraf', 18, '🦒'], ['elefant', 'Elefant', 20, '🐘'], ['hund', 'Hund', 8, '🐕'], ['kat', 'Kat', 8, '🐈'], ['mus', 'Mus', 5, '🐁'], ['kanin', 'Kanin', 6, '🐇'],
  ['pingvin', 'Pingvin', 12, '🐧'], ['bjoern', 'Bjørn', 15, '🐻'], ['panda', 'Panda', 15, '🐼'], ['krokodille', 'Krokodille', 15, '🐊'], ['flamingo', 'Flamingo', 12, '🦩'], ['ugle', 'Ugle', 10, '🦉']]);
packProps('dino', [['trex', 'T-rex', 25, '🦖'], ['langhals', 'Langhals', 25, '🦕'], ['vulkan', 'Vulkan', 35, 'vulkan'], ['dinoaeg', 'Dino-æg', 12, 'dinoaeg'], ['knogle', 'Knogler', 8, '🦴'], ['bregne', 'Bregne', 6, '🌿'], ['krybdyr', 'Firben', 8, '🦎']]);
packProps('eventyr', [['slot', 'Slot', 40, '🏰'], ['prinsesse', 'Prinsesse', 20, '👸'], ['prins', 'Prins', 20, '🤴'], ['edrage', 'Drage', 30, '🐉'], ['troldmand', 'Troldmand', 20, '🧙'],
  ['fe', 'Fe', 18, '🧚'], ['elver', 'Elver', 18, '🧝'], ['froekonge', 'Frøkonge', 12, '🐸'], ['krone', 'Krone', 15, '👑'], ['tryllestav', 'Krystalkugle', 15, '🔮']]);
packProps('rum', [['astronaut', 'Astronaut', 20, '🧑‍🚀'], ['planet', 'Planet', 20, '🪐'], ['ufo', 'Ufo', 25, '🛸'], ['satellit', 'Satellit', 18, '🛰️'], ['maane', 'Måne', 15, '🌙'],
  ['komet', 'Komet', 15, '☄️'], ['stjerne', 'Stjerne', 8, '🌟'], ['rumraket', 'Rumraket', 30, '🚀']]);
const packOwned = (p, id) => !PACKS[id] || p.own.has.includes(`pack:${id}`);
const propOwned = (p, prop) => !prop.pack || packOwned(p, prop.pack);
const PROP_TABS = [...PROP_CATS, ...Object.entries(PACKS).map(([id, k]) => [id, `${k.icon} ${k.name}`])];
const propById = id => PROPS.find(x => x.id === id);

AREAS.push({ id: 'own', name: 'Min egen park', icon: '🛠️' });
CLASSES.ingenioer = { name: 'Ingeniørkontoret', teacher: 'Uglen Ulla · meter og priser', icon: '📐', tIcon: '🦉', color: '#00897b', item: '🛤️' };
BADGES.push(
  { id: 'egen1', icon: '🛠️', name: 'Banebygger', desc: 'Byg din første egen rutsjebane', t: s => s.ownBuilt >= 1 },
  { id: 'egen3', icon: '🏗️', name: 'Ingeniør', desc: 'Hav 3 egne rutsjebaner', t: s => s.ownBuilt >= 3 },
  { id: 'egen5s', icon: '🌟', name: 'Mesterværk', desc: 'Byg en egen bane med 5 stjerner', t: s => s.ownTop >= 5 },
  { id: 'tur3d', icon: '🎥', name: '3D-rytter', desc: 'Kør din egen bane i 3D', t: s => s.own3d >= 1 },
);
