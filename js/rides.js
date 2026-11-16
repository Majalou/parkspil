// Rides. plot = [x, y, w, h] in the 1000x720 park map. coaster = minigame track settings. game = other minigame
const RIDES = [
  { id: 'ormen', name: 'Ormen', cost: 0, plot: [300, 215, 240, 100], desc: 'En lille rutsjebane for de mindste. Den var her fra starten.',
    coaster: { hills: [40, 60, 50, 70], red: 1, limit: 9, len: 2600, sky: ['#9be7ff', '#e8fbff'], track: '#3bb54a', car: '#ffd23f', theme: 'orm' } },
  { id: 'karrusel', name: 'Karrusellen', cost: 40, plot: [300, 330, 140, 125], desc: 'Heste der kører rundt og rundt til glad musik.' },
  { id: 'radiobil', name: 'Radiobilerne', cost: 80, plot: [460, 330, 170, 120], desc: 'Kør ind i hinanden. Bump!', game: 'bump' },
  { id: 'svaner', name: 'Svanebådene', cost: 120, plot: [15, 460, 250, 200], desc: 'Hyggelige både, der ligner svaner, på søen.', game: 'boat' },
  { id: 'raev', name: 'Rævens Hule', cost: 160, plot: [20, 235, 230, 200], desc: 'Et lille tog kører ind i rævens hemmelige hule. Du styrer sporskifterne!', game: 'mine' },
  { id: 'flagermus', name: 'Flagermusen', cost: 220, plot: [265, 20, 250, 160], desc: 'En rutsjebane hvor du hænger under skinnerne, ligesom en flagermus.',
    coaster: { hills: [90, 60, 110, 70, 90], red: 2, limit: 9.5, len: 3200, sky: ['#2b2d6e', '#f28f6b'], track: '#1d1d1d', car: '#7b2cbf', theme: 'flagermus', tunnels: 1, hang: true } },
  { id: 'pariser', name: 'Pariserhjulet', cost: 260, plot: [795, 230, 195, 230], desc: 'Et kæmpe hjul. Fra toppen kan du se hele parken.' },
  { id: 'vand', name: 'Vandlandet', cost: 320, plot: [800, 470, 190, 200], desc: 'Bassiner og vandrutsjebaner. Plask!' },
  { id: 'falken', name: 'Falken', cost: 400, plot: [525, 20, 260, 160], desc: 'En vild rutsjebane af træ med masser af bakker.',
    coaster: { hills: [150, 90, 120, 70, 110, 60, 90], red: 2, limit: 10, len: 3800, sky: ['#5fb3f9', '#d9f1ff'], track: '#8b5a2b', car: '#d62828', theme: 'trae' } },
  { id: 'faldtaarn', name: 'Faldtårnet', cost: 450, plot: [805, 15, 110, 210], desc: 'Først op i toppen. Så falder du helt ned!', game: 'drop' },
  { id: 'orkanen', name: 'Orkanen', cost: 520, plot: [15, 15, 240, 200], desc: 'Hurtig og snoet som en storm. Med et loop!',
    coaster: { hills: [170, 110, 150, 80, 130, 90, 120], red: 3, limit: 10.5, len: 4200, sky: ['#4a6fa5', '#b8d0eb'], track: '#1f6fd1', car: '#f6f6f6', theme: 'storm', loops: 1 } },
  { id: 'foenix', name: 'Fønix', cost: 650, plot: [270, 500, 200, 170], desc: 'Fugl Fønix stiger op af ilden. Et kæmpe fald!',
    coaster: { hills: [230, 120, 170, 90, 150, 100, 130], red: 3, limit: 11, len: 4500, sky: ['#ff7b39', '#ffe3a3'], track: '#e85d04', car: '#ffba08', theme: 'ild', tunnels: 1, loops: 1 } },
  { id: 'lynet', name: 'Lynet', cost: 800, plot: [595, 495, 190, 180], desc: 'Parkens hurtigste. Du bliver skudt af sted som et lyn!',
    coaster: { hills: [210, 150, 190, 110, 170, 120, 150, 100], red: 4, limit: 11.5, len: 5000, sky: ['#1b1b3a', '#6b5bd1'], track: '#ffd60a', car: '#111111', theme: 'lyn', launch: true, loops: 2, tunnels: 1 } },

];

const DECOS = [
  { id: 'traeer', name: 'Træer', cost: 15, plot: [925, 30, 70, 180], e: '🌳' },
  { id: 'ballon', name: 'Ballonsælger', cost: 20, plot: [700, 405, 50, 60], e: '🎈' },
  { id: 'isbod', name: 'Isbod', cost: 25, plot: [565, 222, 80, 80], e: '🍦' },
  { id: 'poelse', name: 'Pølsevogn', cost: 25, plot: [660, 222, 80, 80], e: '🌭' },
  { id: 'springvand', name: 'Springvand', cost: 45, plot: [490, 525, 80, 80], e: '⛲' },
  { id: 'legeplads', name: 'Legeplads', cost: 60, plot: [645, 335, 100, 60], e: '🛝' },
];
const rideById = id => RIDES.find(r => r.id === id) || DECOS.find(d => d.id === id);
const areaOf = r => r.area || 'sommer';
const AREAS = [
  { id: 'sommer', name: 'Sommerland', icon: '🎡' },
];
// Upgrade levels for rides: lights, new paint, golden star
const UPGRADES = [['💡', 'Lys'], ['🎨', 'Ny farve'], ['⭐', 'Guld-stjerne']];
const upgradeCost = (r, lvl) => Math.round(Math.max(r.cost, 80) * 0.35 * (lvl + 1) / 5) * 5;

const FLAVORS = [['Jordbær', '#ff7b9c'], ['Chokolade', '#7b4a2a'], ['Vanilje', '#fff1c1'], ['Pistacie', '#a7d676'],
  ['Blåbær', '#7986cb'], ['Citron', '#fff176'], ['Lakrids', '#3a3a3a'], ['Mango', '#ffb74d']];

const BADGES = [
  { id: 'byg1', icon: '🏗️', name: 'Bygmester', desc: 'Byg din første forlystelse', t: s => s.built >= 2 },
  { id: 'byg5', icon: '🎠', name: 'Parkdirektør', desc: 'Hav 5 forlystelser', t: s => s.built >= 5 },
  { id: 'byg13', icon: '🎡', name: 'Sommerland færdigt', desc: 'Byg alle forlystelser i Sommerland', t: s => s.area2 },
  { id: 'byg26', icon: '👑', name: 'Kæmpeparken', desc: 'Byg alle forlystelser og al pynt i Sommerland', t: s => s.built >= RIDES.length + DECOS.length },
  { id: 'tur1', icon: '🎢', name: 'Første tur', desc: 'Kør en tur i en rutsjebane', t: s => s.coasterRides >= 1 },
  { id: 'tur10', icon: '🎟️', name: 'Rutsjebane-fan', desc: 'Kør 10 ture i rutsjebaner', t: s => s.coasterRides >= 10 },
  { id: 'perfekt', icon: '🏁', name: 'Perfekt tur', desc: 'Kør langsomt i alle røde sving', t: s => s.perfect >= 1 },
  { id: 'lynet', icon: '⚡', name: 'Lynmester', desc: 'Perfekt tur i Lynet', t: s => s.perfectLynet },
  { id: 'spil3', icon: '🕹️', name: 'Spillemester', desc: 'Prøv radiobiler, både og faldtårn', t: s => s.games >= 3 },
  { id: 'g500', icon: '👥', name: '500 gæster', desc: 'Få 500 gæster i parken', t: s => s.guests >= 500 },
  { id: 'g1000', icon: '🎉', name: '1000 gæster', desc: 'Få 1000 gæster i parken', t: s => s.guests >= 1000 },
  { id: 'bod10', icon: '📚', name: 'Flittig', desc: 'Gør 10 boder færdige', t: s => s.lessons >= 10 },
  { id: 'bod50', icon: '🧠', name: 'Supersmart', desc: 'Gør 50 boder færdige', t: s => s.lessons >= 50 },
  { id: 'op1', icon: '💡', name: 'Opgraderet', desc: 'Opgrader en forlystelse', t: s => s.upgrades >= 1 },
  { id: 'op3', icon: '⭐', name: 'Guld-stjerne', desc: 'Giv en forlystelse en guld-stjerne', t: s => s.maxUp >= 3 },
  { id: 'is', icon: '🍦', name: 'Is-pause', desc: 'Hold en is-pause', t: s => s.ice >= 1 },
  { id: 'hjaelp', icon: '🤝', name: 'Hjælpsom', desc: 'Hjælp 5 gæster med et regnestykke', t: s => s.helped >= 5 },
  { id: 'nat', icon: '🌙', name: 'Natteravn', desc: 'Se parken om natten', t: s => s.night },
  { id: 'rig', icon: '💰', name: 'Rigmand', desc: 'Hav 500 kr på én gang', t: s => s.money >= 500 },
];

const GUEST_FACES = ['👧', '👦', '👩', '👨', '👵', '👴', '🧒', '👱'];
const GUEST_SAY = [
  'Hvor er det en flot park!', 'Jeg elsker {ride}!', 'Må jeg køre en tur mere?', 'Den bedste dag nogensinde!',
  'Jeg vil have en kæmpe is!', 'Wow, se alle de forlystelser!', 'Hvornår bygger du {next}?', 'Jeg kører {ride} igen!',
  'Mine ben ryster efter {ride}!', 'Her kommer vi igen i morgen!', 'Sikke en god direktør!', 'Kan du bygge {next}? Jeg glæder mig!',
];
const WEATHER = { sol: ['☀️', 'Solskin', 1], sky: ['⛅', 'Skyet', 0.85], regn: ['🌧️', 'Regn', 0.6] };
