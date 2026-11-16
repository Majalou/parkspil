// Isometric (2.5D) renderer for "Min egen park"
const IsoPark = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NI = 16, NJ = 12, HW = 32, HH = 16;
  const P = (i, j, h = 0) => [(i - j) * HW, (i + j) * HH - h];
  const f1 = n => n.toFixed(1);
  const pt = (i, j, h) => P(i, j, h).map(f1).join(',');

  // Lots: 3 columns x 2 rows of 4x4 tiles
  const LOTS = [0, 1, 2, 3, 4, 5].map(k => ({ k, i: 1 + (k % 3) * 5, j: k < 3 ? 1 : 7, w: 4, d: 4 }));
  const isPath = (i, j) => j === 5 || j === 6 || ((i === 5 || i === 10) && j >= 0 && j < NJ);
  const lotAt = (i, j) => LOTS.find(L => i >= L.i && i < L.i + L.w && j >= L.j && j < L.j + L.d);
  const isFree = (i, j) => !isPath(i, j) && !lotAt(i, j);

  const PROP_SVG = {
    viking: `<ellipse cx="32" cy="61" rx="14" ry="3" fill="rgba(0,0,0,.25)"/><rect x="22" y="44" width="7" height="16" rx="2" fill="#5d4037"/><rect x="35" y="44" width="7" height="16" rx="2" fill="#5d4037"/>
      <path d="M18 28 Q32 22 46 28 L44 48 L20 48Z" fill="#8d6e63"/><rect x="19" y="42" width="26" height="4" fill="#3e2723"/><circle cx="32" cy="44" r="3" fill="#ffd23f"/>
      <circle cx="32" cy="20" r="9" fill="#ffcc99"/><path d="M23 22 Q32 40 41 22 Q36 30 32 30 Q28 30 23 22Z" fill="#ff8f00"/>
      <path d="M22 17 Q32 4 42 17Z" fill="#9e9e9e" stroke="#616161"/><path d="M23 14 Q14 10 15 2 Q19 9 25 11Z" fill="#fff8e1" stroke="#bdbdbd"/><path d="M41 14 Q50 10 49 2 Q45 9 39 11Z" fill="#fff8e1" stroke="#bdbdbd"/>
      <circle cx="29" cy="19" r="1.4" fill="#222"/><circle cx="35" cy="19" r="1.4" fill="#222"/><circle cx="13" cy="38" r="8" fill="#e63946" stroke="#5d4037" stroke-width="2"/><circle cx="13" cy="38" r="2" fill="#bdbdbd"/>`,
    pirat: `<ellipse cx="32" cy="61" rx="14" ry="3" fill="rgba(0,0,0,.25)"/><rect x="23" y="46" width="7" height="14" fill="#212121"/><rect x="34" y="46" width="7" height="14" fill="#212121"/>
      <rect x="20" y="28" width="24" height="20" rx="4" fill="#fff"/>${[0, 1, 2, 3].map(k => `<rect x="20" y="${30 + k * 5}" width="24" height="2.5" fill="#e63946"/>`).join('')}
      <rect x="20" y="45" width="24" height="3" fill="#5d4037"/><circle cx="32" cy="20" r="9" fill="#ffcc99"/><path d="M26 25 Q32 29 38 25" stroke="#5d4037" stroke-width="2" fill="none"/>
      <rect x="27" y="16" width="6" height="5" rx="2" fill="#111"/><line x1="23" y1="15" x2="41" y2="21" stroke="#111" stroke-width="1.2"/><circle cx="36" cy="19" r="1.4" fill="#222"/>
      <path d="M17 13 Q32 0 47 13 Q32 9 17 13Z" fill="#212121"/><circle cx="32" cy="9" r="2.4" fill="#fff"/><path d="M46 36 q6 0 6 6 q0 4 -4 4" fill="none" stroke="#bdbdbd" stroke-width="2.5"/>`,
    lygte: `<ellipse cx="32" cy="61" rx="8" ry="2.5" fill="rgba(0,0,0,.25)"/><rect x="30" y="16" width="4" height="45" fill="#37474f"/><rect x="26" y="58" width="12" height="4" fill="#37474f"/>
      <circle cx="32" cy="12" r="12" fill="rgba(255,240,150,.45)"/><path d="M25 8 L39 8 L36 18 L28 18Z" fill="#fff3b0" stroke="#37474f" stroke-width="2"/><path d="M23 8 L32 2 L41 8Z" fill="#37474f"/>`,
    fakkel: `<ellipse cx="32" cy="61" rx="6" ry="2" fill="rgba(0,0,0,.25)"/><path d="M29 60 L31 26 L33 26 L35 60Z" fill="#6d4c41"/><rect x="27" y="24" width="10" height="6" rx="2" fill="#424242"/>
      <circle cx="32" cy="14" r="13" fill="rgba(255,150,40,.35)"/><path d="M32 2 Q42 14 36 24 L28 24 Q22 14 32 2Z" fill="#ff6d00"/><path d="M32 10 Q37 17 34 24 L30 24 Q27 17 32 10Z" fill="#ffd600"/>`,
    lyskaede: `<rect x="6" y="14" width="3" height="48" fill="#5d4037"/><rect x="55" y="14" width="3" height="48" fill="#5d4037"/><path d="M8 16 Q32 34 56 16" fill="none" stroke="#333" stroke-width="1.2"/>
      ${[0, 1, 2, 3, 4, 5, 6].map(k => { const t = (k + 1) / 8, x = 8 + 48 * t, y = 16 + 18 * 4 * t * (1 - t) * 0.9; return `<circle cx="${f1(x)}" cy="${f1(y + 3)}" r="3.4" fill="${['#ff5a5f', '#ffd23f', '#3a86ff', '#0ead69', '#ff70a6', '#ff9f1c', '#00e5ff'][k]}"/>`; }).join('')}`,
    neon: `<path d="M32 4 L39 22 L58 22 L43 34 L49 53 L32 42 L15 53 L21 34 L6 22 L25 22Z" fill="rgba(255,112,166,.25)" stroke="#ff70a6" stroke-width="4" stroke-linejoin="round"/>
      <path d="M32 4 L39 22 L58 22 L43 34 L49 53 L32 42 L15 53 L21 34 L6 22 L25 22Z" fill="none" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><rect x="30" y="52" width="4" height="10" fill="#555"/>`,
    skat: `<ellipse cx="32" cy="60" rx="20" ry="3" fill="rgba(0,0,0,.25)"/><rect x="12" y="34" width="40" height="24" rx="3" fill="#8d5524" stroke="#4e342e" stroke-width="2"/>
      <path d="M12 34 Q32 14 52 34Z" fill="#a0522d" stroke="#4e342e" stroke-width="2"/><rect x="12" y="40" width="40" height="4" fill="#d4af37"/><rect x="28" y="38" width="8" height="10" rx="2" fill="#d4af37"/>
      ${[[20, 30], [30, 26], [40, 30], [26, 22], [36, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#ffd23f" stroke="#b8860b"/>`).join('')}`,
  };

  // ---------- theme pack drawings (64x64 box, standing on the bottom edge) ----------
  const shieldSvg = (x, y, r, a, b) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a}" stroke="#5d4037" stroke-width="${f1(Math.max(1, r / 4.5))}"/><path d="M${x} ${y - r} V${y + r} M${x - r} ${y} H${x + r}" stroke="${b}" stroke-width="${f1(r / 3.5)}"/><circle cx="${x}" cy="${y}" r="${f1(r / 4)}" fill="#bdbdbd" stroke="#757575" stroke-width=".8"/>`;
  const WEAPON = {
    axe: '<rect x="47" y="18" width="3" height="34" rx="1" fill="#6d4c41"/><path d="M49 18 Q59 15 59 27 Q54 25 49 27Z" fill="#cfd8dc" stroke="#78909c"/>',
    spear: '<rect x="48" y="6" width="2.5" height="52" fill="#6d4c41"/><path d="M49.2 0 L53 9 L45.5 9Z" fill="#cfd8dc" stroke="#78909c"/>',
    sword: '<path d="M47.5 42 V16 L49 12 L50.5 16 V42Z" fill="#e0e0e0" stroke="#78909c"/><rect x="44" y="41" width="10" height="3" rx="1" fill="#8d6e63"/><rect x="47.5" y="44" width="3" height="6" fill="#5d4037"/>',
    bow: '<path d="M49 12 Q61 33 49 54" fill="none" stroke="#8d6e63" stroke-width="3"/><line x1="49" y1="12" x2="49" y2="54" stroke="#eee" stroke-width="1"/>',
    cutlass: '<path d="M47 42 Q57 30 52 14 Q50 30 44 40Z" fill="#e0e0e0" stroke="#78909c"/><rect x="42" y="39" width="8" height="3.5" rx="1.5" fill="#ffd23f"/>',
  };
  const PARROT = '<g transform="translate(17 25)"><path d="M-1 2 L-5 13 L1 7Z" fill="#3a86ff"/><ellipse rx="4.5" ry="6.5" fill="#e63946"/><path d="M-2 -1 L-6 3 L-1 4Z" fill="#0ead69"/><circle cy="-7" r="3.8" fill="#e63946"/><path d="M3 -8 Q7 -7 4 -4Z" fill="#ffd23f"/><circle cx="1" cy="-8" r="1" fill="#111"/></g>';
  function figure(o) {
    const hats = {
      horn: '<path d="M22 16 Q32 3 42 16Z" fill="#9e9e9e" stroke="#616161"/><path d="M23 13 Q14 9 15 1 Q19 8 25 10Z" fill="#fff8e1" stroke="#bdbdbd"/><path d="M41 13 Q50 9 49 1 Q45 8 39 10Z" fill="#fff8e1" stroke="#bdbdbd"/>',
      round: '<path d="M22 17 Q32 1 42 17Z" fill="#b0bec5" stroke="#607d8b"/><rect x="31" y="14" width="2" height="8" fill="#607d8b"/>',
      crown: `<path d="M22 18 Q22 8 32 8 Q42 8 42 18 Q37 13 32 13 Q27 13 22 18Z" fill="${o.hair}"/><path d="M24 11 L24 3 L28 7 L32 1 L36 7 L40 3 L40 11Z" fill="#ffd23f" stroke="#b8860b"/><circle cx="32" cy="7" r="1.4" fill="#e63946"/>`,
      hair: `<path d="M22 19 Q22 8 32 8 Q42 8 42 19 Q37 12 32 12 Q27 12 22 19Z" fill="${o.hair}"/>`,
      tricorn: `<path d="M15 14 Q32 -3 49 14 Q32 8 15 14Z" fill="${o.hat}"/><path d="M21 12 Q32 5 43 12" stroke="#ffd23f" stroke-width="1.5" fill="none"/><circle cx="32" cy="7" r="2.3" fill="#fff"/>`,
      bandana: `<path d="M22 17 Q32 4 42 17Z" fill="${o.hat}"/><circle cx="27" cy="12" r="1.1" fill="#fff"/><circle cx="35" cy="10" r="1.1" fill="#fff"/><path d="M41 14 L49 11 L47 19Z" fill="${o.hat}"/>`,
    };
    const legR = o.peg ? '<rect x="35.5" y="46" width="3.5" height="14" rx="1.5" fill="#8d6e63"/>' : `<rect x="34" y="45" width="7" height="13" rx="2" fill="${o.pants}"/><rect x="33" y="56" width="9" height="4" rx="2" fill="#3e2723"/>`;
    const shirt = o.stripes ? [0, 1, 2, 3].map(k => `<rect x="20" y="${30 + k * 5}" width="24" height="2.5" fill="${o.stripes}"/>`).join('') : '';
    const coat = o.coat ? `<path d="M19 28 L16 52 L26 52 L26 30Z" fill="${o.coat}"/><path d="M45 28 L48 52 L38 52 L38 30Z" fill="${o.coat}"/>${[[24, 36], [24, 42], [40, 36], [40, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#ffd23f"/>`).join('')}` : '';
    const beard = o.beard ? `<path d="M23 21 Q32 ${o.longBeard ? 42 : 33} 41 21 Q36 27 32 27 Q28 27 23 21Z" fill="${o.beard}"/>` : '<path d="M28.5 23.5 Q32 26.5 35.5 23.5" stroke="#8d4a2a" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    const eyes = o.patch ? '<rect x="26.5" y="15.5" width="6" height="5" rx="2" fill="#111"/><line x1="22" y1="14" x2="42" y2="20" stroke="#111" stroke-width="1.2"/><circle cx="35.5" cy="18.5" r="1.4" fill="#222"/>'
      : '<circle cx="28.5" cy="18.5" r="1.4" fill="#222"/><circle cx="35.5" cy="18.5" r="1.4" fill="#222"/>';
    return `<ellipse cx="32" cy="61" rx="15" ry="3" fill="rgba(0,0,0,.25)"/>${o.cape ? `<path d="M20 27 L13 56 L51 56 L44 27Z" fill="${o.cape}"/>` : ''}
      ${o.long ? `<path d="M23 17 Q19 32 23 38 M41 17 Q45 32 41 38" stroke="${o.hair}" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}
      <rect x="23" y="45" width="7" height="13" rx="2" fill="${o.pants}"/><rect x="21" y="56" width="9" height="4" rx="2" fill="#3e2723"/>${legR}
      <path d="M19 28 Q32 22 45 28 L44 48 L20 48Z" fill="${o.tunic}"/>${shirt}${coat}
      <rect x="19" y="44" width="26" height="4" fill="#3e2723"/><rect x="29.5" y="43.5" width="5" height="5" rx="1" fill="#ffd23f"/>
      <path d="M20 30 L16 41 M44 30 L47 41" stroke="${o.coat || o.tunic}" stroke-width="5.5" stroke-linecap="round"/>
      ${o.weapon ? WEAPON[o.weapon] : ''}<circle cx="16" cy="42" r="3" fill="${o.skin}"/>
      ${o.hook ? '<path d="M47 40 q6 0 6 6 q0 4 -4 4" fill="none" stroke="#bdbdbd" stroke-width="2.5"/>' : `<circle cx="47" cy="42" r="3" fill="${o.skin}"/>`}
      <circle cx="32" cy="19" r="9" fill="${o.skin}"/>${eyes}${beard}${hats[o.top] || ''}
      ${o.shield ? shieldSvg(13, 40, 9, o.shield[0], o.shield[1]) : ''}${o.parrot ? PARROT : ''}`;
  }
  const gem = (x, y, s, c, c2) => `<path d="M${x - s} ${y} L${x - s / 2} ${y - s * 0.7} L${x + s / 2} ${y - s * 0.7} L${x + s} ${y} L${x} ${y + s * 1.2}Z" fill="${c}" stroke="${c2}" stroke-width="1.2"/>
    <path d="M${x - s} ${y} H${x + s} M${x - s / 2} ${y - s * 0.7} L${x} ${y} L${x + s / 2} ${y - s * 0.7} M${x} ${y} V${y + s * 1.2}" stroke="rgba(255,255,255,.6)" stroke-width="1" fill="none"/>`;
  const sparkle = (x, y, d) => `<path d="M${x} ${y - 5} l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5z" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${d}s" repeatCount="indefinite"/></path>`;
  const shadow = (rx, ry = 3.5) => `<ellipse cx="32" cy="60" rx="${rx}" ry="${ry}" fill="rgba(0,0,0,.25)"/>`;
  const deckY = x => { const t = (x - 2) / 60; return 52 * (1 - t + t * t); };
  const PACK_SVG = {
    vkriger: figure({ skin: '#ffcc99', hair: '#ff8f00', beard: '#ff8f00', tunic: '#8d6e63', pants: '#5d4037', top: 'horn', weapon: 'axe', shield: ['#e63946', '#ffd23f'] }),
    vskjold: figure({ skin: '#ffe0bd', hair: '#ffd54f', long: true, tunic: '#3a86ff', pants: '#455a64', top: 'round', weapon: 'spear', shield: ['#ffffff', '#3a86ff'] }),
    vhoevding: figure({ skin: '#f1c27d', hair: '#bdbdbd', beard: '#e0e0e0', longBeard: true, tunic: '#6a1b9a', cape: '#c62828', pants: '#4e342e', top: 'crown', weapon: 'sword' }),
    vbue: figure({ skin: '#c68642', hair: '#4e342e', beard: '#4e342e', tunic: '#2e7d32', pants: '#5d4037', top: 'hair', weapon: 'bow' }),
    pkaptajn: figure({ skin: '#ffcc99', hair: '#212121', beard: '#212121', longBeard: true, tunic: '#ffffff', coat: '#c62828', pants: '#212121', top: 'tricorn', hat: '#212121', hook: true }),
    ppapegoeje: figure({ skin: '#e0ac69', tunic: '#ffffff', stripes: '#e63946', pants: '#1d3557', top: 'bandana', hat: '#e63946', patch: true, weapon: 'cutlass', parrot: true, beard: '#5d4037' }),
    ptraeben: figure({ skin: '#ffdbac', tunic: '#ffffff', stripes: '#1d3557', pants: '#795548', top: 'bandana', hat: '#3a86ff', peg: true, beard: '#ff8f00', weapon: 'cutlass' }),
    ppige: figure({ skin: '#8d5524', hair: '#212121', long: true, tunic: '#ffd23f', coat: '#0ead69', pants: '#5d4037', top: 'bandana', hat: '#e63946', weapon: 'cutlass' }),
    vskib: `${shadow(29, 4)}<rect x="30.8" y="4" width="2.6" height="40" fill="#5d4037"/><rect x="14" y="8" width="36" height="24" rx="2" fill="#fff" stroke="#bdbdbd"/>
      ${[18, 26, 34, 42].map(x => `<rect x="${x}" y="8" width="4" height="24" fill="#e63946"/>`).join('')}
      <path d="M4 42 Q32 62 60 42 L52 40 L12 40Z" fill="#8d5524" stroke="#4e342e" stroke-width="2"/><path d="M8 46 Q32 60 56 46" stroke="#6d4c41" stroke-width="1.5" fill="none"/>
      <path d="M58 43 Q64 32 59 22 Q54 22 55 27 Q59 28 58 33 Q56 38 54 41Z" fill="#8d5524" stroke="#4e342e" stroke-width="1.5"/><circle cx="57.5" cy="25" r="1.1" fill="#ffd23f"/>
      <path d="M6 43 Q0 34 5 26 Q8 30 7 34 Q8 38 10 41Z" fill="#8d5524" stroke="#4e342e" stroke-width="1.5"/>
      ${[14, 22, 30, 38, 46].map((x, k) => shieldSvg(x, 43, 3.6, k % 2 ? '#ffd23f' : '#e63946', '#fff')).join('')}`,
    langhus: `${shadow(30, 4)}<path d="M6 58 L6 36 Q32 30 58 36 L58 58Z" fill="#8d6e63" stroke="#4e342e" stroke-width="2"/>
      ${[14, 22, 42, 50].map(x => `<line x1="${x}" y1="35" x2="${x}" y2="58" stroke="#6d4c41"/>`).join('')}
      <path d="M2 38 Q32 6 62 38 Q32 30 2 38Z" fill="#c9a24a" stroke="#8d6e63" stroke-width="2"/><path d="M10 33 Q32 14 54 33 M18 30 Q32 20 46 30" stroke="#a1822f" fill="none"/>
      <path d="M2 38 L-1 29 L5 33Z M62 38 L65 29 L59 33Z" fill="#6d4c41"/><path d="M27 58 V47 Q32 42 37 47 V58Z" fill="#4e342e"/>
      ${shieldSvg(15, 47, 4.5, '#e63946', '#fff')}${shieldSvg(49, 47, 4.5, '#3a86ff', '#fff')}`,
    skjolde: `${shadow(24)}<rect x="8" y="30" width="48" height="4" fill="#6d4c41"/><rect x="10" y="30" width="4" height="30" fill="#5d4037"/><rect x="50" y="30" width="4" height="30" fill="#5d4037"/>
      ${shieldSvg(18, 42, 10, '#e63946', '#ffd23f')}${shieldSvg(46, 42, 10, '#0ead69', '#ffd23f')}${shieldSvg(32, 40, 10, '#3a86ff', '#fff')}`,
    vaaben: `${shadow(22)}<rect x="10" y="22" width="44" height="4" fill="#6d4c41"/><rect x="10" y="50" width="44" height="4" fill="#6d4c41"/><rect x="12" y="22" width="4" height="38" fill="#5d4037"/><rect x="48" y="22" width="4" height="38" fill="#5d4037"/>
      <rect x="21" y="10" width="3" height="46" fill="#8d6e63"/><path d="M23 12 Q33 9 33 22 Q28 19 23 21Z" fill="#cfd8dc" stroke="#78909c"/>
      <path d="M31 50 V8 L32.5 4 L34 8 V50Z" fill="#e0e0e0" stroke="#78909c"/><rect x="28" y="48" width="9" height="3" fill="#8d6e63"/><rect x="31" y="51" width="3" height="7" fill="#5d4037"/>
      <rect x="41" y="6" width="2.5" height="52" fill="#8d6e63"/><path d="M42.2 0 L46 9 L38.5 9Z" fill="#cfd8dc" stroke="#78909c"/>`,
    runesten: `${shadow(16)}<path d="M18 60 L16 22 Q20 6 32 4 Q46 6 48 22 L46 60Z" fill="#9e9e9e" stroke="#616161" stroke-width="2"/><path d="M20 26 Q22 10 32 9" stroke="#bdbdbd" stroke-width="2" fill="none"/>
      <path d="M22 20 Q32 10 42 20 Q44 34 38 44 Q30 52 24 44" fill="none" stroke="#c62828" stroke-width="2.5"/>
      <path d="M28 24 V34 M28 26 L32 29 M34 24 V34 L37 30 M30 38 L34 42 M34 38 L30 42" stroke="#c62828" stroke-width="1.6"/>`,
    baal: `${shadow(18, 4)}<circle cx="32" cy="38" r="22" fill="rgba(255,150,40,.25)"/>
      <path d="M18 54 L46 46 M18 46 L46 54" stroke="#6d4c41" stroke-width="5" stroke-linecap="round"/>
      <path d="M32 18 Q44 34 38 50 L26 50 Q20 34 32 18Z" fill="#ff6d00"><animate attributeName="d" values="M32 18 Q44 34 38 50 L26 50 Q20 34 32 18Z;M33 13 Q42 32 38 50 L26 50 Q22 32 33 13Z;M32 18 Q44 34 38 50 L26 50 Q20 34 32 18Z" dur=".8s" repeatCount="indefinite"/></path>
      <path d="M32 30 Q38 40 35 50 L29 50 Q26 40 32 30Z" fill="#ffd600"/>${[14, 21, 28, 36, 43, 50].map(x => `<ellipse cx="${x}" cy="57" rx="4" ry="3" fill="#9e9e9e" stroke="#616161"/>`).join('')}`,
    pskib: `${shadow(29, 4)}<rect x="21" y="6" width="2.5" height="36" fill="#5d4037"/><rect x="40" y="10" width="2.5" height="32" fill="#5d4037"/>
      <path d="M12 10 Q22 14 32 10 L32 30 Q22 34 12 30Z" fill="#f5f5f5" stroke="#bdbdbd"/><path d="M33 14 Q41 17 50 14 L50 32 Q41 35 33 32Z" fill="#f5f5f5" stroke="#bdbdbd"/>
      <circle cx="22" cy="18" r="3.5" fill="#212121"/><rect x="20" y="20" width="4" height="3" fill="#212121"/><path d="M17 24 L27 28 M27 24 L17 28" stroke="#212121" stroke-width="1.6"/>
      <path d="M23.5 4 L32 6 L23.5 9Z" fill="#212121"/><path d="M58 41 L64 32" stroke="#5d4037" stroke-width="2"/>
      <path d="M2 40 L62 40 L54 58 L10 58Z" fill="#6d4c41" stroke="#3e2723" stroke-width="2"/><path d="M2 40 V31 H16 V40Z" fill="#6d4c41" stroke="#3e2723" stroke-width="2"/>
      <rect x="2" y="38" width="60" height="3" fill="#ffd23f"/>${[20, 30, 40, 50].map(x => `<rect x="${x - 2}" y="45" width="5" height="4" fill="#212121"/>`).join('')}`,
    kanon: `${shadow(20)}<rect x="14" y="44" width="30" height="8" rx="2" fill="#6d4c41"/><path d="M18 36 L52 30 L54 38 L20 46Z" fill="#37474f" stroke="#212121" stroke-width="1.5"/><ellipse cx="53" cy="34" rx="2.5" ry="4.5" fill="#212121"/>
      ${[20, 38].map(x => `<circle cx="${x}" cy="54" r="6" fill="#8d6e63" stroke="#4e342e" stroke-width="2"/><circle cx="${x}" cy="54" r="1.6" fill="#4e342e"/>`).join('')}
      <circle cx="50" cy="57" r="3" fill="#212121"/><circle cx="56" cy="57" r="3" fill="#212121"/><circle cx="53" cy="52" r="3" fill="#212121"/>`,
    pflag: `<ellipse cx="22" cy="61" rx="8" ry="2" fill="rgba(0,0,0,.25)"/><rect x="20" y="4" width="3" height="57" fill="#6d4c41"/><circle cx="21.5" cy="4" r="2.5" fill="#ffd23f"/>
      <path d="M23 7 Q38 4 54 8 Q50 18 54 30 Q38 26 23 29Z" fill="#212121"/><circle cx="38" cy="15" r="5" fill="#fff"/><rect x="35.5" y="18" width="5" height="3.5" fill="#fff"/>
      <circle cx="36" cy="15" r="1.3" fill="#212121"/><circle cx="40" cy="15" r="1.3" fill="#212121"/><path d="M31 21 L45 27 M45 21 L31 27" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
    guld: `${shadow(22, 4)}<path d="M10 59 Q16 34 32 30 Q48 34 54 59Z" fill="#ffc300" stroke="#b8860b" stroke-width="1.5"/>
      ${[[18, 52], [26, 46], [34, 40], [40, 48], [46, 54], [30, 54], [24, 57], [38, 57]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4.5" ry="3" fill="#ffd54f" stroke="#b8860b"/>`).join('')}
      ${sparkle(44, 36, 0)}${sparkle(22, 44, 0.8)}`,
    diamanter: `${shadow(22)}${gem(31, 28, 10, '#69f0ae', '#00897b')}${gem(19, 44, 9, '#40c4ff', '#0277bd')}${gem(43, 46, 8, '#ff4081', '#ad1457')}${gem(31, 52, 5, '#e040fb', '#6a1b9a')}${sparkle(40, 20, 0)}${sparkle(14, 36, 0.7)}`,
    soe: `<ellipse cx="32" cy="52" rx="31" ry="11" fill="#d7c08a"/><ellipse cx="32" cy="52" rx="28" ry="9" fill="#29b6f6"/><ellipse cx="30" cy="51" rx="22" ry="6" fill="#4fc3f7"/>
      <path d="M18 50 q4 -2 8 0 M36 54 q4 -2 8 0" stroke="#fff" stroke-width="1.5" fill="none"><animate attributeName="opacity" values=".9;.2;.9" dur="2.5s" repeatCount="indefinite"/></path>
      <path d="M6 50 V38 M9 51 V41 M56 49 V39" stroke="#558b2f" stroke-width="2"/><ellipse cx="6" cy="37" rx="1.6" ry="3.5" fill="#6d4c41"/><ellipse cx="56" cy="38" rx="1.6" ry="3.5" fill="#6d4c41"/>`,
    vandfald: `<ellipse cx="32" cy="56" rx="27" ry="7" fill="#4fc3f7" stroke="#90a4ae" stroke-width="2"/>
      <path d="M8 55 L13 20 L26 8 L40 10 L53 22 L56 55Z" fill="#8d9aa5" stroke="#607d8b" stroke-width="2"/><path d="M15 24 L26 12 L33 13" fill="none" stroke="#b0bec5" stroke-width="3"/>
      <path d="M12 40 q4 -3 8 0 M46 34 q4 -3 8 0" stroke="#7cb342" stroke-width="3" fill="none"/>
      <path d="M26 13 L38 13 L40 56 L24 56Z" fill="#81d4fa"/>
      <path d="M28 13 V56 M32 13 V56 M36 13 V56" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" from="0" to="-22" dur=".6s" repeatCount="indefinite"/></path>
      <ellipse cx="32" cy="56" rx="11" ry="3" fill="#fff" opacity=".85"/>`,
    sproejt: `<ellipse cx="32" cy="58" rx="22" ry="5.5" fill="#b0bec5"/><ellipse cx="32" cy="57" rx="18" ry="4" fill="#4fc3f7"/>
      <path d="M32 14 Q18 10 14 56 M32 14 Q46 10 50 56" fill="none" stroke="#81d4fa" stroke-width="2.5" stroke-dasharray="4 4"><animate attributeName="stroke-dashoffset" from="0" to="-16" dur=".5s" repeatCount="indefinite"/></path>
      <path d="M32 56 V8" stroke="#b3e5fc" stroke-width="4" stroke-dasharray="6 3" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="0" to="18" dur=".5s" repeatCount="indefinite"/></path>
      <circle cx="32" cy="8" r="4" fill="#e1f5fe"/>`,
    bro: `<ellipse cx="32" cy="54" rx="30" ry="8" fill="#4fc3f7"/><path d="M2 52 Q32 26 62 52 L62 57 Q32 33 2 57Z" fill="#a1887f" stroke="#5d4037" stroke-width="2"/>
      ${[6, 14, 22, 32, 42, 50, 58].map(x => `<line x1="${x}" y1="${f1(deckY(x))}" x2="${x}" y2="${f1(deckY(x) - 9)}" stroke="#6d4c41" stroke-width="2"/>`).join('')}
      <path d="M2 43 Q32 17 62 43" stroke="#6d4c41" stroke-width="2.5" fill="none"/>`,
    aakande: `<ellipse cx="32" cy="54" rx="28" ry="8" fill="#29b6f6"/>
      ${[[16, 53], [30, 57], [46, 52]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="3.5" fill="#43a047"/><path d="M${x} ${y} L${x + 7} ${y - 2}" stroke="#29b6f6" stroke-width="1.5"/>`).join('')}
      <g transform="translate(44 49)">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse rx="2" ry="5" fill="#f48fb1" transform="rotate(${a}) translate(0 -3)"/>`).join('')}<circle r="2" fill="#ffd23f"/></g>`,
    fyrtaarn: `${shadow(16)}<ellipse cx="32" cy="58" rx="14" ry="3" fill="#9e9e9e"/><path d="M24 58 L27 16 L37 16 L40 58Z" fill="#fff" stroke="#9e9e9e" stroke-width="1.5"/>
      <path d="M25.3 40 L26 30 L38 30 L38.7 40Z M24.3 58 L24.9 50 L39.1 50 L39.7 58Z" fill="#e63946"/>
      <rect x="25" y="10" width="14" height="7" fill="#ffd23f" stroke="#37474f" stroke-width="1.5"/><path d="M24 10 L32 3 L40 10Z" fill="#e63946" stroke="#8a1414"/>
      <path d="M39 13 L64 5 L64 21Z" fill="rgba(255,240,150,.6)"><animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite"/></path>
      <path d="M25 13 L0 5 L0 21Z" fill="rgba(255,240,150,.6)"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></path>`,
    vulkan: `${shadow(28, 4)}<path d="M4 59 L24 18 L40 18 L60 59Z" fill="#6d4c41" stroke="#4e342e" stroke-width="2"/><path d="M24 18 L40 18 L36 26 Q32 22 28 26Z" fill="#ff6d00"/>
      <path d="M30 22 Q28 34 24 40 Q22 46 18 50" stroke="#ff6d00" stroke-width="3" fill="none"/><path d="M35 22 Q38 34 42 44" stroke="#ff9100" stroke-width="2.5" fill="none"/>
      ${[0, 1].map(k => `<circle cx="${30 + k * 4}" cy="14" r="5" fill="#9e9e9e"><animate attributeName="cy" values="16;-2" dur="2s" begin="-${k}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="2s" begin="-${k}s" repeatCount="indefinite"/></circle>`).join('')}`,
    dinoaeg: `${shadow(20)}<ellipse cx="32" cy="54" rx="20" ry="6" fill="#a1887f" stroke="#6d4c41" stroke-width="2"/>
      <ellipse cx="32" cy="40" rx="9" ry="12.5" fill="#e3f2fd" stroke="#64b5f6" stroke-width="1.5"/><path d="M25 38 l3 3 l3 -3 l3 3 l3 -3" stroke="#455a64" fill="none" stroke-width="1.2"/>
      <ellipse cx="22" cy="46" rx="7.5" ry="10" fill="#f1f8e9" stroke="#9ccc65" stroke-width="1.5"/><ellipse cx="42" cy="46" rx="7.5" ry="10" fill="#fff3e0" stroke="#ffb74d" stroke-width="1.5"/>
      ${[[20, 42], [24, 49], [40, 43], [44, 50], [30, 33], [35, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#8d6e63" opacity=".6"/>`).join('')}
      <path d="M12 54 Q32 66 52 54 Q32 60 12 54Z" fill="#8d6e63"/>`,
  };
  Object.assign(PROP_SVG, PACK_SVG);

  function propSvg(prop, x, y, size, extra = '') {
    if (!prop) return '';
    const shadow = `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(size * 0.32)}" ry="${f1(size * 0.1)}" fill="rgba(0,0,0,.2)"/>`;
    if (prop.svg) return `<g ${extra}><g transform="translate(${f1(x - size / 2)} ${f1(y - size)}) scale(${(size / 64).toFixed(3)})">${PROP_SVG[prop.svg]}</g></g>`;
    return `<g ${extra}>${shadow}<text x="${f1(x)}" y="${f1(y - size * 0.08)}" font-size="${f1(size * 0.85)}" text-anchor="middle">${prop.e}</text></g>`;
  }

  const diamond = (i, j, w = 1, d = 1, h = 0) => `${pt(i, j, h)} ${pt(i + w, j, h)} ${pt(i + w, j + d, h)} ${pt(i, j + d, h)}`;

  // Box with top, left and right faces
  function box(i, j, w, d, h, top, left, right, z = 0) {
    return `<polygon points="${pt(i, j + d, z)} ${pt(i + w, j + d, z)} ${pt(i + w, j + d, z + h)} ${pt(i, j + d, z + h)}" fill="${left}"/>
      <polygon points="${pt(i + w, j, z)} ${pt(i + w, j + d, z)} ${pt(i + w, j + d, z + h)} ${pt(i + w, j, z + h)}" fill="${right}"/>
      <polygon points="${diamond(i, j, w, d, z + h)}" fill="${top}"/>`;
  }

  function tree(i, j, s = 1, kind = 0, se = SEASONS.sommer) {
    const [x, y] = P(i, j);
    const greens = kind % 2 ? ['#1b5e20', '#2e7d32'] : se.leaves;
    const snow = se.snow ? (kind % 2 ? `<path d="M${x - 8 * s} ${y - 40 * s} L${x} ${y - 66 * s} L${x + 8 * s} ${y - 40 * s} Q${x} ${y - 46 * s} ${x - 8 * s} ${y - 40 * s}Z" fill="#fff"/>`
      : `<ellipse cx="${x - 2 * s}" cy="${y - 48 * s}" rx="${12 * s}" ry="${5 * s}" fill="#fff"/>`) : '';
    const lights = se.lights && kind % 2 ? [[-8, -22], [5, -28], [-3, -36], [6, -44], [-5, -50]].map(([dx, dy], n) => `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${2 * s}" fill="${['#ff5a5f', '#ffd23f', '#3a86ff', '#0ead69', '#ff70a6'][n]}"><animate attributeName="opacity" values="1;.3;1" dur="1.2s" begin="${n * 0.2}s" repeatCount="indefinite"/></circle>`).join('') : '';
    return `<g><ellipse cx="${x}" cy="${y}" rx="${14 * s}" ry="${6 * s}" fill="rgba(0,0,0,.2)"/><rect x="${x - 3 * s}" y="${y - 22 * s}" width="${6 * s}" height="${22 * s}" fill="#6d4c41"/>
      ${kind % 2 ? `<path d="M${x - 16 * s} ${y - 16 * s} L${x} ${y - 58 * s} L${x + 16 * s} ${y - 16 * s}Z" fill="${greens[0]}"/><path d="M${x - 12 * s} ${y - 32 * s} L${x} ${y - 66 * s} L${x + 12 * s} ${y - 32 * s}Z" fill="${greens[1]}"/>`
        : `<circle cx="${x}" cy="${y - 34 * s}" r="${16 * s}" fill="${greens[0]}"/><circle cx="${x - 8 * s}" cy="${y - 40 * s}" r="${11 * s}" fill="${greens[1]}"/><circle cx="${x + 6 * s}" cy="${y - 44 * s}" r="${9 * s}" fill="${greens[2]}"/>`}${snow}${lights}</g>`;
  }

  // ---------- a coaster drawn on a lot ----------
  let lastTop = 0;
  function coasterIso(c, L, uid, anim = true, hs = 46) {
    const th = THEMES[c.theme] || THEMES.klassisk;
    const trackCol = c.track || th.track, supCol = c.support || th.support;
    const pts = Track3D.buildPath(c.pieces);
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    pts.forEach(({ p }) => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]); });
    const s = (Math.min(L.w, L.d) - 0.8) / Math.max(maxX - minX, maxZ - minZ, 24);
    const offI = L.i + 0.4 + ((L.w - 0.8) - (maxX - minX) * s) / 2, offJ = L.j + 0.4 + ((L.d - 0.8) - (maxZ - minZ) * s) / 2;
    const toIso = p => [offI + (p[0] - minX) * s, offJ + (p[2] - minZ) * s, p[1] * s * hs];
    lastTop = Math.min(...pts.map(q => P(...toIso(q.p))[1]));
    const proj = p => { const [i, j, h] = toIso(p); return P(i, j, h); };
    let sup = '';
    pts.forEach((q, k) => {
      if (k % 6 || q.p[1] < 1.2 || q.U[1] < 0.2) return;
      const [i, j] = toIso(q.p), a = P(i, j, 0), b = proj(q.p);
      sup += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}"/>`;
    });
    const d = pts.filter((_, k) => k % 2 === 0).map((q, k) => { const [x, y] = proj(q.p); return `${k ? 'L' : 'M'}${f1(x)} ${f1(y)}`; }).join('');
    const water = pts.filter(q => q.f.water).map(q => { const [x, y] = P(...toIso(q.p).slice(0, 2), 0); return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="14" ry="6" fill="#4fc3f7" opacity=".7"/>`; }).filter((_, k) => k % 6 === 0).join('');
    const tunnels = pts.filter((q, k) => q.f.tunnel && k % 6 === 0).map(q => { const [x, y] = proj(q.p); return `<path d="M${f1(x - 9)} ${f1(y + 4)} Q${f1(x)} ${f1(y - 16)} ${f1(x + 9)} ${f1(y + 4)}" fill="#6d4c41" stroke="#4e342e" stroke-width="2"/>`; }).join('');
    // station + queue at the start of the track
    const st0 = toIso(pts[8].p), stS = STATIONS[c.station] || STATIONS.hytte;
    const station = box(st0[0] - 0.35, st0[1] - 0.6, 0.7, 0.5, 16, shade(stS.roof, 0.15), stS.wall, shade(stS.wall, -0.15))
      + `<text x="${f1(P(st0[0], st0[1] - 0.35)[0])}" y="${f1(P(st0[0], st0[1] - 0.35)[1] - 20)}" font-size="13" text-anchor="middle">${stS.icon}</text>`;
    const q0 = P(st0[0] - 0.2, st0[1] - 0.9);
    const qd = { lige: `M0 0 h-30`, zigzag: `M0 0 l-12 6 l12 6 l-12 6 l12 6`, bugtet: `M0 0 q-16 6 0 12 q16 6 0 12`, tag: `M0 0 h-30` }[c.queue] || 'M0 0 h-30';
    const queue = `<g transform="translate(${f1(q0[0])} ${f1(q0[1])})"><path d="${qd}" fill="none" stroke="#795548" stroke-width="2.5" stroke-dasharray="3 2"/>${c.queue === 'tag' ? '<path d="M-34 -10 h38 l-4 -6 h-30z" fill="#ff9f1c"/>' : ''}
      ${[0, 1, 2].map(k => `<circle cx="${-6 - k * 8}" cy="${c.queue === 'zigzag' || c.queue === 'bugtet' ? k * 7 : 0}" r="2.6" fill="${['#ff5a5f', '#3a86ff', '#0ead69'][k]}"/>`).join('')}</g>`;
    const props = (c.props || []).map(pr => {
      const idx = pts.findIndex(q => q.k === pr.at), q = pts[idx >= 0 ? idx + 6 : 20] || pts[20];
      const side = [q.R[0], 0, q.R[2]], ln = Math.hypot(side[0], side[2]) || 1;
      const [i, j] = toIso([q.p[0] + (side[0] / ln) * 5 * (pr.side || 1), 0, q.p[2] + (side[2] / ln) * 5 * (pr.side || 1)]);
      const [x, y] = P(i, j);
      return { y, svg: propSvg(propById(pr.id), x, y, 26) };
    }).sort((a, b) => a.y - b.y).map(o => o.svg).join('');
    const nCars = Math.max(1, Math.min(5, (c.car && c.car.n) || 3));
    const cars = Array.from({ length: nCars }, (_, k) => `<g><rect x="-5" y="-4" width="10" height="7" rx="2.5" fill="${(c.car && c.car.color) || '#e63946'}" stroke="#222" stroke-width=".8"/><circle cx="0" cy="-5" r="2" fill="#ffd9b0"/>
      ${anim ? `<animateMotion dur="${Math.max(6, pts.length / 22).toFixed(1)}s" begin="-${(k * 0.35).toFixed(2)}s" repeatCount="indefinite" path="${d}"/>` : ''}</g>`).join('');
    const corner = th.deco[0];
    const [cx1, cy1] = P(L.i + 0.4, L.j + L.d - 0.3), [cx2, cy2] = P(L.i + L.w - 0.3, L.j + 0.4);
    return `<polygon points="${diamond(L.i + 0.1, L.j + 0.1, L.w - 0.2, L.d - 0.2)}" fill="${th.water ? '#4fc3f7' : th.ground}" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
      ${th.water ? `<polygon points="${diamond(L.i + 0.5, L.j + 0.5, L.w - 1, L.d - 1)}" fill="${th.ground}"/>` : ''}
      <text x="${f1(cx1)}" y="${f1(cy1)}" font-size="20" text-anchor="middle">${corner}</text><text x="${f1(cx2)}" y="${f1(cy2)}" font-size="20" text-anchor="middle">${th.deco[1] || corner}</text>
      ${water}${queue}${station}
      <g stroke="${supCol}" stroke-width="1.6" opacity=".9">${sup}</g>
      <path id="iso-${uid}" d="${d}" fill="none" stroke="#2b2b2b" stroke-width="5" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${trackCol}" stroke-width="3" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1" stroke-linejoin="round"/>
      ${tunnels}${cars}${props}`;
  }

  // Preview of a single coaster for the designer
  function preview(c) {
    const L = { i: 0, j: 0, w: 6, d: 6 };
    const inner = coasterIso(c, L, 'prev' + Math.random().toString(36).slice(2, 6), true, 90);
    const [x0] = P(0, 6), [x1] = P(6, 0), [, y1] = P(6, 6), top = Math.min(-10, lastTop) - 40;
    return `<svg class="iso-preview" viewBox="${x0 - 20} ${f1(top)} ${x1 - x0 + 40} ${f1(y1 + 30 - top)}" preserveAspectRatio="xMidYMid meet">
      <polygon points="${diamond(-0.3, -0.3, 6.6, 6.6)}" fill="#7cc47f"/><polygon points="${pt(-0.3, 6.3, 0)} ${pt(6.3, 6.3, 0)} ${pt(6.3, 6.3, -14)} ${pt(-0.3, 6.3, -14)}" fill="#6d4c41"/><polygon points="${pt(6.3, -0.3, 0)} ${pt(6.3, 6.3, 0)} ${pt(6.3, 6.3, -14)} ${pt(6.3, -0.3, -14)}" fill="#5d4037"/>${inner}</svg>`;
  }

  // ---------- the whole park ----------
  function map(p, opts = {}) {
    const own = p.own;
    const night = !!opts.night;
    const se = Season.get(opts.season);
    let ground = '';
    for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
      const path = isPath(i, j), free = isFree(i, j);
      const col = path ? ((i + j) % 2 ? '#efe0bd' : '#e8d6ae') : se.iso[(i + j) % 2 ? 0 : 1];
      ground += `<polygon class="${free && opts.propMode ? 'tile free' : 'tile'}" ${free ? `data-tile="${i},${j}"` : ''} points="${diamond(i, j)}" fill="${col}" ${path ? 'stroke="#d8c08f" stroke-width="1"' : ''}/>`;
    }
    // edge of the world
    const edge = `<polygon points="${pt(0, NJ, 0)} ${pt(NI, NJ, 0)} ${pt(NI, NJ, -22)} ${pt(0, NJ, -22)}" fill="#6d4c41"/>
      <polygon points="${pt(NI, 0, 0)} ${pt(NI, NJ, 0)} ${pt(NI, NJ, -22)} ${pt(NI, 0, -22)}" fill="#5d4037"/>
      <polygon points="${diamond(NI, 4.3, 1.4, 3.4)}" fill="#e8d6ae" stroke="#d8c08f"/><polygon points="${pt(NI, 7.7, 0)} ${pt(NI + 1.4, 7.7, 0)} ${pt(NI + 1.4, 7.7, -22)} ${pt(NI, 7.7, -22)}" fill="#8d6e63"/>
      <polygon points="${pt(NI + 1.4, 4.3, 0)} ${pt(NI + 1.4, 7.7, 0)} ${pt(NI + 1.4, 7.7, -22)} ${pt(NI + 1.4, 4.3, -22)}" fill="#795548"/>`;
    const objs = [];
    LOTS.forEach(L => {
      const bought = own.lots.includes(L.k), c = own.coasters.find(x => x.lot === L.k);
      const [sx, sy] = P(L.i + L.w / 2, L.j + L.d / 2);
      let svg;
      if (c) svg = `<g class="lot built" data-lot="${L.k}">${coasterIso(c, L, 'lot' + L.k, true, 130)}
        <g transform="translate(${f1(P(L.i + L.w, L.j + L.d / 2)[0] - 10)} ${f1(P(L.i + L.w, L.j + L.d / 2)[1] + 6)})"><rect x="-46" y="-12" width="92" height="20" rx="10" fill="#fff" stroke="${c.track || '#e63946'}" stroke-width="2"/><text y="3" font-size="11" font-weight="800" text-anchor="middle" fill="#1d3557">${esc(c.name.slice(0, 16))}</text></g>
        <polygon class="lot-hit" points="${diamond(L.i, L.j, L.w, L.d)}"/></g>`;
      else if (bought) svg = `<g class="lot open" data-lot="${L.k}"><polygon points="${diamond(L.i + 0.1, L.j + 0.1, L.w - 0.2, L.d - 0.2)}" fill="#c8a97e" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/>
        <text x="${sx}" y="${sy - 4}" font-size="30" text-anchor="middle">🏗️</text><text x="${sx}" y="${sy + 18}" class="lot-name" text-anchor="middle">Byg rutsjebane</text></g>`;
      else {
        const idx = own.lots.length, price = OWN_LOT_COSTS[Math.min(idx, OWN_LOT_COSTS.length - 1)], can = p.money >= price;
        svg = `<g class="lot sale ${can ? 'can' : ''}" data-lot="${L.k}"><polygon class="lot-d" points="${diamond(L.i + 0.1, L.j + 0.1, L.w - 0.2, L.d - 0.2)}"/>
          <text x="${sx}" y="${sy - 4}" font-size="26" text-anchor="middle">${can ? '🪧' : '🔒'}</text><text x="${sx}" y="${sy + 16}" class="lot-name" text-anchor="middle">Grund til salg</text><text x="${sx}" y="${sy + 34}" class="lot-price" text-anchor="middle">${price} kr</text></g>`;
      }
      objs.push({ depth: L.j + L.d / 2 + L.i * 0.01, front: L.j > 5, svg });
    });
    (own.parkProps || []).forEach((pr, n) => {
      const [x, y] = P(pr.i + 0.5, pr.j + 0.5);
      objs.push({ depth: pr.j + 0.5, front: pr.j > 5, svg: propSvg(propById(pr.id), x, y + 4, 40, `class="pprop" data-pp="${n}"`) });
    });
    // trees along the edges
    [[0.5, 0.5, 0], [3, 0.4, 1], [7.5, 0.4, 0], [12.5, 0.5, 1], [15.5, 0.6, 0], [15.5, 3, 1], [15.5, 9, 0], [15.4, 11.4, 1], [0.4, 3, 1], [0.4, 9.5, 0], [0.5, 11.5, 1], [7.5, 11.5, 0]]
      .filter(([i, j]) => isFree(Math.floor(i), Math.floor(j)) && !(own.parkProps || []).some(pr => pr.i === Math.floor(i) && pr.j === Math.floor(j)))
      .forEach(([i, j, k]) => objs.push({ depth: j, front: j > 5, svg: tree(i, j, 0.8, se.tree === '🎄' ? 1 : k, se) }));
    // seasonal decorations on free tiles along the edges
    if (se.deco.length) {
      [[2, 0], [9, 0], [14, 0], [0, 7], [3, 11], [12, 11], [15, 2], [15, 10], [1, 5], [8, 4], [13, 4], [7, 7], [14, 7]]
        .filter(([i, j]) => isFree(i, j) && !(own.parkProps || []).some(pr => pr.i === i && pr.j === j))
        .forEach(([i, j], n) => {
          const [x, y] = P(i + 0.5, j + 0.5);
          objs.push({ depth: j + 0.5, front: j > 5, svg: `<text x="${f1(x)}" y="${f1(y + 6)}" font-size="26" text-anchor="middle" pointer-events="none">${se.deco[n % se.deco.length]}</text>` });
        });
    }
    const back = objs.filter(o => !o.front).sort((a, b) => a.depth - b.depth).map(o => o.svg).join('');
    const front = objs.filter(o => o.front).sort((a, b) => a.depth - b.depth).map(o => o.svg).join('');
    // guests walk along the streets
    const route = (a, b) => `M${P(...a).map(f1).join(' ')} L${P(...b).map(f1).join(' ')}`;
    const routes = [route([17.3, 5.5], [0.2, 5.5]), route([0.2, 6.5], [17.3, 6.5]), route([5.5, 0.2], [5.5, 11.8]), route([10.5, 11.8], [10.5, 0.2])];
    const nG = Math.min(24, 4 + own.coasters.length * 4 + Math.floor((own.parkProps || []).length / 3));
    const cols = ['#ff5a5f', '#3a86ff', '#ffd23f', '#0ead69', '#ff70a6', '#8338ec', '#ff9f1c', '#00b4d8'];
    const guests = Array.from({ length: nG }, (_, k) => `<g><circle cy="-11" r="3.6" fill="#ffd9b0"/><rect x="-3.6" y="-8" width="7.2" height="9" rx="3" fill="${cols[k % 8]}"/>
      <animateMotion dur="${24 + (k % 5) * 5}s" begin="-${(k * 7.3).toFixed(1)}s" repeatCount="indefinite" path="${routes[k % 4]}"/></g>`).join('');
    // Entrance gate across the main street; it stands in the same isometric plane as the street
    const gi = 16.2, TH = 46, A = 4.5, B = 7.0;
    const tower = j0 => {
      const apex = pt(gi + 0.25, j0 + 0.25, TH + 26), [fx, fy] = P(gi + 0.25, j0 + 0.25, TH + 26);
      const flag = (d1, d2) => `M${f1(fx)} ${f1(fy - 16)} l12 ${d1} l-12 ${d2}z`;
      return box(gi, j0, 0.5, 0.5, TH, '#ffd23f', '#e63946', '#b71c1c')
        + `<polygon points="${pt(gi - 0.12, j0 - 0.12, TH)} ${pt(gi + 0.62, j0 - 0.12, TH)} ${pt(gi + 0.62, j0 + 0.62, TH)} ${pt(gi - 0.12, j0 + 0.62, TH)}" fill="#ffb703"/>`
        + `<polygon points="${pt(gi - 0.12, j0 + 0.62, TH)} ${pt(gi + 0.62, j0 + 0.62, TH)} ${apex}" fill="#1d6fd1"/><polygon points="${pt(gi + 0.62, j0 - 0.12, TH)} ${pt(gi + 0.62, j0 + 0.62, TH)} ${apex}" fill="#1557a8"/>`
        + `<line x1="${f1(fx)}" y1="${f1(fy)}" x2="${f1(fx)}" y2="${f1(fy - 16)}" stroke="#555" stroke-width="1.5"/><path d="${flag(4, 4)}" fill="#ff70a6"><animate attributeName="d" values="${flag(4, 4)};${flag(2, 6)};${flag(4, 4)}" dur="1.2s" repeatCount="indefinite"/></path>`;
    };
    const [scx, scy] = P(gi + 0.5, (A + B + 0.5) / 2, TH - 1);
    const bulbs = Array.from({ length: 9 }, (_, n) => { const [x, y] = P(gi + 0.46, B - 0.1 - n * ((B - A - 0.3) / 8), TH - 15); return `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#fff"><animate attributeName="fill" values="#fff;#ff5a5f;#ffd23f;#fff" dur="1.2s" begin="${(n * 0.13).toFixed(2)}s" repeatCount="indefinite"/></circle>`; }).join('');
    const gateDeco = se.deco.length ? [[16.5, 4.1], [16.5, 7.9]].map(([i, j], n) => { const [x, y] = P(i, j); return `<text x="${f1(x)}" y="${f1(y + 4)}" font-size="22" text-anchor="middle">${se.deco[n]}</text>`; }).join('') : '';
    const gate = `<g class="iso-gate" pointer-events="none">${tower(A)}
      ${box(gi + 0.05, A + 0.25, 0.4, B - A, 10, '#ffd23f', '#e63946', '#c62828', TH - 20)}
      <polygon points="${pt(gi + 0.5, A, TH + 8)} ${pt(gi + 0.5, B + 0.5, TH + 8)} ${pt(gi + 0.5, B + 0.5, TH - 10)} ${pt(gi + 0.5, A, TH - 10)}" fill="#fff" stroke="#e63946" stroke-width="3" stroke-linejoin="round"/>
      <text transform="matrix(0.894 -0.447 0 1 ${f1(scx)} ${f1(scy)})" text-anchor="middle" class="gate-name" style="font-size:11px" y="4">${esc((own.name || 'Min egen park').slice(0, 18))}</text>
      ${bulbs}${tower(B)}${gateDeco}</g>`;
    const [x0] = P(0, NJ), [x1] = P(NI, 0), [, yb] = P(NI, NJ);
    return `<svg class="park-map iso-map ${opts.propMode ? 'prop-mode' : ''}" viewBox="${x0 - 40} -160 ${x1 - x0 + 120} ${yb + 210}" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="isoglow"><stop offset="0" stop-color="#fff3b0" stop-opacity=".8"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient></defs>
      <rect x="${x0 - 40}" y="-160" width="${x1 - x0 + 120}" height="${yb + 210}" fill="${night ? '#0d1b3d' : se.sky}"/>
      ${edge}${ground}${back}${guests}${front}${gate}
      ${Season.overlay(se, x0 - 40, -160, x1 - x0 + 120, yb + 210)}
      ${night ? `<rect x="${x0 - 40}" y="-160" width="${x1 - x0 + 120}" height="${yb + 210}" fill="#0b1a4a" opacity=".45" pointer-events="none"/>
        ${(own.parkProps || []).filter(pr => { const x = propById(pr.id); return x && x.cat === 'lys'; }).map(pr => { const [x, y] = P(pr.i + 0.5, pr.j + 0.5); return `<circle cx="${x}" cy="${y - 30}" r="40" fill="url(#isoglow)" pointer-events="none"/>`; }).join('')}` : ''}
    </svg>`;
  }

  function shade(hex, amt) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  return { map, preview, propSvg, PROP_SVG, LOTS, isFree };
})();
