// Seasons: colours and decorations for both parks and the rides
const SEASONS = {
  sommer: { name: 'Sommer', icon: '☀️', cost: 0, desc: 'Grønt græs, blomster og sol.',
    grass: ['#8bd36b', '#5fb84a'], iso: ['#7cc47f', '#74bb77'], leaves: ['#2e7d32', '#43a047', '#66bb6a'], tree: '🌳', sky: '#9fdcff',
    deco: [], flowers: null, bunting: null },
  paaske: { name: 'Påske', icon: '🐣', cost: 60, desc: 'Påskeæg, kyllinger, påskeharer og gule blomster.',
    grass: ['#a6e389', '#7cc95e'], iso: ['#9bd88a', '#92d081'], leaves: ['#7cb342', '#9ccc65', '#f8bbd0'], tree: '🌳', sky: '#c9ecff',
    deco: ['🐣', '🥚', '🐰', '🌷', '🐥', '🧺', '🌼'], flowers: ['#fff176', '#f8bbd0', '#b39ddb', '#80deea', '#ffffff'], bunting: ['#fff176', '#f8bbd0', '#b39ddb', '#a5d6a7', '#80deea'],
    land: [['🐣', 1], ['🥚', 0.8], ['🐰', 1.2], ['🌷', 1.1]] },
  hoest: { name: 'Høstfest', icon: '🍂', cost: 60, desc: 'Orange blade, græskar, majs og æbler.',
    grass: ['#b8c46a', '#8e9b43'], iso: ['#b3b865', '#aab05d'], leaves: ['#e65100', '#fb8c00', '#fdd835'], tree: '🌳', autumn: true, sky: '#f6dcb0',
    deco: ['🎃', '🌽', '🍎', '🌻', '🍂', '🍄', '🧺'], flowers: ['#ff9800', '#f4511e', '#fdd835', '#8d6e63', '#c62828'], bunting: ['#e65100', '#fdd835', '#8d6e63', '#c62828', '#ff9800'],
    fall: ['🍂', '🍁'], land: [['🎃', 1.2], ['🌽', 1.3], ['🍂', 0.8], ['🍄', 1]], ground3d: ['#a8a24f', '#978f42'] },
  halloween: { name: 'Halloween', icon: '🎃', cost: 80, desc: 'Græskarlygter, spøgelser, flagermus og spindelvæv.',
    grass: ['#6f8f52', '#45603a'], iso: ['#5f7d4d', '#587546'], leaves: ['#4e342e', '#6d4c41', '#ff6f00'], tree: '🌲', sky: '#3a2a5c', tint: 'rgba(60,20,90,.25)',
    deco: ['🎃', '👻', '🦇', '🕸️', '🍬', '🧙', '🕯️'], flowers: ['#ff6f00', '#7b1fa2', '#212121', '#76ff03', '#ff9100'], bunting: ['#ff6f00', '#212121', '#7b1fa2', '#76ff03'],
    fly: '🦇', land: [['🎃', 1.3], ['👻', 1.5], ['🕸️', 1.2], ['🪦', 1.2]], ground3d: ['#4f6b3c', '#435c33'] },
  jul: { name: 'Jul', icon: '🎄', cost: 80, desc: 'Sne, juletræer, gaver, snemænd og julelys.',
    grass: ['#f4f8fc', '#d8e4ef'], iso: ['#eef4fa', '#e4edf6'], leaves: ['#1b5e20', '#2e7d32', '#ffffff'], tree: '🎄', snow: true, lights: true, sky: '#bcd3ea',
    deco: ['⛄', '🎁', '🦌', '🎅', '🕯️', '🔔', '🎄'], flowers: ['#e53935', '#ffffff', '#2e7d32', '#ffd23f'], bunting: ['#e53935', '#ffffff', '#2e7d32', '#ffd23f'],
    fall: 'snow', land: [['⛄', 1.6], ['🎄', 4], ['🎁', 1], ['🦌', 2]], ground3d: ['#eef4fa', '#dbe6f2'] },
  nytaar: { name: 'Nytår', icon: '🎆', cost: 80, desc: 'Fyrværkeri, konfetti, guld og glimmer.',
    grass: ['#7fbf6a', '#4f9a45'], iso: ['#74b878', '#6cb070'], leaves: ['#2e7d32', '#43a047', '#ffd23f'], tree: '🌳', lights: true, fireworks: true, sky: '#2b3a78',
    deco: ['🎉', '🎊', '⭐', '🎆', '🎇', '🥳', '🎈'], flowers: ['#ffd23f', '#e0e0e0', '#ff70a6', '#3a86ff'], bunting: ['#ffd23f', '#c0c0c0', '#ffd23f', '#1d3557'],
    land: [['🎉', 1.2], ['⭐', 1], ['🎈', 1.3]] },
};

const Season = {
  cur: 'sommer',
  get(id) { return SEASONS[id || this.cur] || SEASONS.sommer; },
  // Falling snow or leaves, or flying bats, over a W x H svg
  overlay(s, x0, y0, W, H) {
    let out = '';
    if (s.fall === 'snow') {
      out = Array.from({ length: 70 }, (_, i) => {
        const x = x0 + ((i * 137) % W), r = 1.5 + (i % 3), d = 6 + (i % 5) * 2;
        return `<circle cx="${x}" cy="${y0 - 10}" r="${r}" fill="#fff" opacity=".9"><animateTransform attributeName="transform" type="translate" values="0 0;${(i % 2 ? 20 : -20)} ${H + 20}" dur="${d}s" begin="-${((i * 1.7) % d).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }).join('');
    } else if (s.fall) {
      out = Array.from({ length: 24 }, (_, i) => {
        const x = x0 + ((i * 173) % W), d = 9 + (i % 4) * 3;
        return `<text x="${x}" y="${y0 - 10}" font-size="${14 + (i % 3) * 4}">${s.fall[i % s.fall.length]}<animateTransform attributeName="transform" type="translate" values="0 0;${i % 2 ? 60 : -60} ${H + 30}" dur="${d}s" begin="-${((i * 2.3) % d).toFixed(1)}s" repeatCount="indefinite"/></text>`;
      }).join('');
    }
    if (s.fly) {
      out += Array.from({ length: 6 }, (_, i) => {
        const y = y0 + 30 + i * (H / 9), d = 14 + i * 3;
        return `<text x="${x0 - 40}" y="${y}" font-size="${18 + (i % 3) * 6}">${s.fly}<animateMotion dur="${d}s" begin="-${i * 4}s" repeatCount="indefinite" path="M0 0 Q${W / 4} -40 ${W / 2} 0 T${W + 80} 0"/></text>`;
      }).join('');
    }
    if (s.tint) out = `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${s.tint}"/>` + out;
    return out ? `<g pointer-events="none">${out}</g>` : '';
  },
  // Turns green emoji trees orange
  defs: '<filter id="autumn"><feColorMatrix type="hueRotate" values="-75"/><feColorMatrix type="saturate" values="1.3"/></filter>',
};
