// Track geometry, physics, ratings and the first-person 3D ride
const Track3D = (() => {
  const STEP = 0.5;
  const G = 9.81;
  const norm = p => (typeof p === 'string' ? { t: p } : p);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // ---------- geometry ----------
  function buildPath(pieces) {
    const pts = [];
    let x = 0, y = 1.5, z = 0, yaw = 0;
    const push = (px, py, pz, roll, f, k) => pts.push({ p: [px, py, pz], roll, f, k });
    const lin = (L, dh, k, f, rollFn) => {
      const n = Math.max(2, Math.round(L / STEP)), x0 = x, y0 = y, z0 = z, fx = Math.cos(yaw), fz = Math.sin(yaw);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        push(x0 + fx * L * t, y0 + (dh * (1 - Math.cos(Math.PI * t))) / 2, z0 + fz * L * t, rollFn ? rollFn(t) : 0, f, k);
      }
      x = x0 + fx * L; y = y0 + dh; z = z0 + fz * L;
    };
    lin(10, 0, -1, { station: 1 });
    pieces.map(norm).forEach((pc, k) => {
      const P = PIECES[pc.t] || PIECES.straight;
      const dh = pc.dh ?? P.dh ?? 0;
      if (pc.t === 'left' || pc.t === 'right') {
        const r = 9, a = -P.turn * Math.PI / 2, n = Math.round((r * Math.abs(a)) / STEP), ds = (r * Math.abs(a)) / n;
        for (let i = 1; i <= n; i++) {
          yaw += a / n;
          x += Math.cos(yaw) * ds; z += Math.sin(yaw) * ds;
          push(x, y, z, P.turn * 0.45 * Math.sin((Math.PI * i) / n), {}, k);
        }
      } else if (pc.t === 'loop') {
        const R = 6, drift = 2.4, n = Math.round((2 * Math.PI * R) / STEP);
        const f = [Math.cos(yaw), 0, Math.sin(yaw)], sd = [-Math.sin(yaw), 0, Math.cos(yaw)], x0 = x, y0 = y, z0 = z;
        for (let i = 1; i <= n; i++) {
          const a = (2 * Math.PI * i) / n, s = (drift * i) / n;
          push(x0 + f[0] * R * Math.sin(a) + sd[0] * s, y0 + R * (1 - Math.cos(a)), z0 + f[2] * R * Math.sin(a) + sd[2] * s, 0, { loop: 1 }, k);
        }
        x = x0 + sd[0] * drift; z = z0 + sd[2] * drift;
      } else {
        const L = Math.max(P.L || 8, Math.abs(dh) * 1.2);
        const f = { chain: { chain: 1 }, tunnel: { tunnel: 1 }, booster: { booster: 1 }, brake: { brake: 1 }, splash: { water: 1 } }[pc.t] || {};
        lin(L, dh, k, f, pc.t === 'twist' ? t => 2 * Math.PI * (t * t * (3 - 2 * t)) : null);
      }
    });
    lin(10, 0, -1, { brake: 1, station: 1 });
    // frames: tangent, parallel-transported up, then roll
    let U = [0, 1, 0];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(pts.length - 1, i + 1)].p;
      const T = nrm(sub(b, a));
      U = nrm(sub(U, mul(T, dot(U, T))));
      const r = pts[i].roll, side = cross(T, U);
      const Ur = nrm(add(mul(U, Math.cos(r)), mul(side, Math.sin(r))));
      pts[i].T = T; pts[i].U = Ur; pts[i].R = cross(T, Ur);
    }
    return pts;
  }

  // ---------- physics ----------
  function simulate(pts, strict = true) {
    let v = 3, maxV = 0, maxH = 0, fail = -2;
    const vs = [];
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      if (i > 0) {
        const dy = pts[i - 1].p[1] - pt.p[1];
        let v2 = v * v + 2 * G * dy;
        v2 = v2 * (1 - 0.0012) - 0.01;
        if (pt.f.chain) v2 = Math.max(v2, 5 * 5);
        if (pt.f.booster) v2 = Math.max(v2, 25 * 25);
        if (pt.f.brake) v2 = Math.min(v2, 5 * 5);
        if (pt.f.station) v2 = Math.max(v2, 2.5 * 2.5);
        if (pt.f.water && !(pts[i + 1] && pts[i + 1].f.water)) v2 *= 0.55;
        if (v2 < 0.05) {
          if (fail === -2) fail = pt.k;
          if (strict) { vs.push(0); return { vs, fail, maxV, maxH, ok: false }; }
          v2 = 2.5 * 2.5;
        }
        v = Math.sqrt(v2);
      }
      vs.push(v);
      maxV = Math.max(maxV, v);
      maxH = Math.max(maxH, pt.p[1]);
    }
    return { vs, fail, maxV, maxH, ok: fail === -2 };
  }

  function stats(c) {
    const pts = buildPath(c.pieces), sim = simulate(pts);
    const pcs = c.pieces.map(norm);
    const n = t => pcs.filter(p => p.t === t).length;
    const length = Math.round(pts.length * STEP);
    const cost = pcs.reduce((a, p) => a + (PIECES[p.t] ? PIECES[p.t].cost : 0), 0) + (c.props || []).reduce((a, x) => a + (propById(x.id) ? propById(x.id).cost : 0), 0);
    const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
    const spaend = clamp(sim.maxV * 1.6 + sim.maxH * 0.8 + n('loop') * 10 + n('twist') * 8 + n('bigdrop') * 5 + n('booster') * 5 + n('tunnel') * 4 + n('splash') * 4 + (n('left') + n('right')) * 1.5);
    const vild = clamp(sim.maxV * 2.2 + n('loop') * 9 + n('twist') * 7 + n('bigdrop') * 3);
    const hygge = clamp(20 + (c.props || []).length * 5 + (c.theme !== 'klassisk' ? 15 : 0) + (c.station !== 'hytte' ? 10 : 0) + (c.queue !== 'lige' ? 8 : 0) + (c.car.shape !== 'klassisk' ? 7 : 0) - Math.max(0, vild - 85) * 0.5);
    const score = sim.ok ? Math.round(spaend * 0.45 + hygge * 0.35 + Math.min(vild, 70) * 0.2) : 0;
    return { pts, sim, length, cost, spaend, vild, hygge, score, stars: Math.max(1, Math.min(5, Math.round(score / 18))), maxH: Math.round(sim.maxH), maxKmh: Math.round(sim.maxV * 3.6) };
  }

  // Turn one of the park's fixed coasters into pieces so it can be ridden in 3D
  function fromRide(r) {
    const c = r.coaster, H = c.hills.map(h => Math.max(6, h * 0.11));
    const pcs = [];
    let top = H[0] + 1.5;
    if (c.launch) { pcs.push({ t: 'booster' }); pcs.push({ t: 'up', dh: H[0] }); }
    else pcs.push({ t: 'chain', dh: H[0] });
    let loops = c.loops || 0, tunnels = c.tunnels || 0;
    for (let i = 1; i < H.length; i++) {
      pcs.push({ t: top > 12 ? 'bigdrop' : 'down', dh: 2 - top });
      if (loops && i % 2 === 1) { pcs.push({ t: 'loop' }); loops--; }
      if (tunnels && i % 3 === 2) { pcs.push({ t: 'tunnel' }); tunnels--; }
      if (c.theme === 'lyn' || c.theme === 'drage' || c.theme === 'midgard') { if (i === 3) pcs.push({ t: 'twist' }); }
      pcs.push({ t: i % 2 ? 'left' : 'right' });
      const next = Math.min(H[i], (top - 2) * 0.75 + 2);
      pcs.push({ t: 'up', dh: next - 2 });
      top = next;
    }
    pcs.push({ t: 'down', dh: 1.5 - top }, { t: 'right' }, { t: 'brake' });
    const map = { orm: 'klassisk', flagermus: 'gys', trae: 'jungle', storm: 'klassisk', ild: 'gys', lyn: 'rummet', viking: 'viking', drage: 'viking', valkyrie: 'viking', midgard: 'pirat' };
    return {
      name: r.name, pieces: pcs, theme: map[c.theme] || 'klassisk', track: c.track, support: null,
      car: { shape: { orm: 'klassisk', drage: 'drage', midgard: 'skib', viking: 'skib', lyn: 'raket' }[c.theme] || 'klassisk', color: c.car, n: 3, front: '' },
      station: 'hytte', queue: 'lige', props: [], fixed: true,
    };
  }

  // ---------- 3D ride ----------
  let raf = 0, cleanup = null;
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    Music.stop();
    if (cleanup) { cleanup(); cleanup = null; }
  }
  const imgCache = {};
  // Emoji drawn once into small canvases; drawing text every frame is slow on tablets
  const sprites = {};
  function sprite(e) {
    if (!sprites[e]) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const x = c.getContext('2d');
      x.font = '78px serif'; x.textAlign = 'center';
      x.fillText(e, 48, 82);
      sprites[e] = c;
    }
    return sprites[e];
  }
  function propImage(prop) {
    if (!prop.svg) return null;
    if (!imgCache[prop.id]) {
      const im = new Image();
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">${IsoPark.PROP_SVG[prop.svg]}</svg>`);
      imgCache[prop.id] = im;
    }
    return imgCache[prop.id];
  }

  // Landscape per theme: grass, meadow patches, far/near hills and scenery [emoji, size]
  const LAND = {
    klassisk: { grass: '#5fb84a', patch: '#4fa83d', hills: ['#a9cfe6', '#6aa957'], path: '#d9c08a', sun: true, land: [['🌳', 5], ['🌲', 6], ['🌳', 4], ['🌷', 1.1], ['🌼', 1], ['🌿', 1.2], ['🏡', 4]] },
    jungle: { grass: '#3c8d3f', patch: '#2f7a33', hills: ['#9fd0c8', '#3f8f3f'], path: '#c9a66b', sun: true, land: [['🌴', 6], ['🌳', 5], ['🌿', 1.5], ['🌺', 1.1], ['🌴', 5]] },
    pirat: { grass: '#f4d58d', patch: '#e9c873', hills: ['#b4dcef', '#79b96a'], path: '#e0bf73', sun: true, land: [['🌴', 6], ['🐚', 0.9], ['🌿', 1.3], ['🌴', 5], ['⛵', 4]] },
    rummet: { grass: '#4a4a6a', patch: '#3b3b58', hills: ['#2c2758', '#4d4d70'], path: '#5c5c80', moon: true, land: [['🪨', 2.5], ['🌑', 3], ['🪨', 1.5]] },
    slik: { grass: '#9be38f', patch: '#ffc8dd', hills: ['#ffd6e8', '#c8a2ff'], path: '#fff0f6', sun: true, land: [['🌳', 5], ['🍭', 3], ['🌸', 1.2], ['🧁', 2], ['🌷', 1.1]] },
    viking: { grass: '#5c8a48', patch: '#4f7a3d', hills: ['#b8cbd9', '#5d7f52'], path: '#b39b72', sun: true, land: [['🌲', 6], ['🌲', 5], ['🌳', 5], ['🪨', 2], ['🌿', 1.2], ['🛖', 4]] },
    gys: { grass: '#3b5a32', patch: '#2f4a28', hills: ['#3a2a52', '#25351f'], path: '#6b5a45', moon: true, land: [['🌲', 6], ['🌳', 5], ['🍄', 1.2], ['🪦', 1.6], ['🌲', 5]] },
  };

  function start(root, coaster, av, year, onEnd) {
    stop();
    Music.start(Music.forTheme(coaster.theme));
    const se = Season.get();
    const th = THEMES[coaster.theme] || THEMES.klassisk;
    const trackCol = coaster.track || th.track, supCol = coaster.support || th.support;
    const pts = buildPath(coaster.pieces), sim = simulate(pts, false), vs = sim.vs;
    root.innerHTML = '<canvas class="ccanvas"></canvas>';
    const cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
    let W = 800, H = 600;
    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = root.clientWidth || 800; H = root.clientHeight || 600;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const st = { s: 0, hold: false, lastHold: -9, coins: 0, msg: [], shake: 0, t: 0, done: false, splash: 0, fly: [], sparkle: 0 };
    // Several fingers and iPad touch quirks: hands stay up while any finger is down
    const ptrs = new Set();
    let touches = 0, keyHeld = false;
    const sync = () => { st.hold = ptrs.size > 0 || touches > 0 || keyHeld; if (st.hold) st.lastHold = st.t; };
    const down = e => { e.preventDefault(); ptrs.add(e.pointerId); sync(); };
    const up = e => { ptrs.delete(e.pointerId); sync(); };
    const tdown = e => { e.preventDefault(); touches = e.touches.length; sync(); };
    const tup = e => { touches = e.touches.length; sync(); };
    const key = e => { if (e.code === 'Space') { e.preventDefault(); keyHeld = e.type === 'keydown'; sync(); } };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('touchstart', tdown, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('touchend', tup);
    window.addEventListener('touchcancel', tup);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    cleanup = () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchend', tup);
      window.removeEventListener('touchcancel', tup);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
    };
    const say = (text, color = '#fff') => st.msg.push({ text, color, t: 0 });

    // coins above the track (catch with hands up) and beams (duck!)
    const items = [];
    const beamEvery = year === 1 ? 6 : year === 2 ? 5 : 4;
    let cnt = 0;
    for (let i = 40; i < pts.length - 30; i += 26) {
      const pt = pts[i];
      if (pt.f.loop || pt.f.station) continue;
      cnt++;
      items.push({ i, beam: cnt % beamEvery === 0 && !pt.f.tunnel, done: false });
    }
    const total = items.filter(x => !x.beam).length;
    // scenery
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    pts.forEach(({ p }) => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]); });
    const land0 = LAND[coaster.theme] || LAND.klassisk;
    const land = se.ground3d && !th.water && !land0.moon ? { ...land0, grass: se.ground3d[0], patch: se.ground3d[1] } : land0;
    const mid = [(minX + maxX) / 2, (minZ + maxZ) / 2];
    const deco = [];
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const nearTrack = (x, z, r) => pts.some((pt, i) => i % 8 === 0 && Math.hypot(pt.p[0] - x, pt.p[2] - z) < r);
    const rx = m => minX - m + rand() * (maxX - minX + 2 * m), rz = m => minZ - m + rand() * (maxZ - minZ + 2 * m);
    for (let k = 0; k < 240; k++) {
      const x = rx(80), z = rz(80);
      if (nearTrack(x, z, 5)) continue;
      const [e, s] = k % 4 === 0 ? [th.deco[k % th.deco.length], 3] : se.land && k % 3 === 1 ? se.land[k % se.land.length] : land.land[k % land.land.length];
      deco.push({ p: [x, 0, z], e, s: s * (0.9 + rand() * 0.6) });
    }
    // spectators along the track, and a crowd by the station
    const crowd = [];
    let cn = 0;
    const addGroup = (i, sideSign) => {
      const pt = pts[i], side = nrm([pt.R[0], 0, pt.R[2]]), fw = nrm([pt.T[0], 0, pt.T[2]]), d = 4.5 + rand() * 2;
      const n = 3 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const off = (k - n / 2) * 1.1, x = pt.p[0] + side[0] * d * sideSign + fw[0] * off, z = pt.p[2] + side[2] * d * sideSign + fw[2] * off;
        if (nearTrack(x, z, 2.5)) continue;
        crowd.push({ p: [x, 0, z], i, o: Coaster.crowdLook(cn++) });
      }
    };
    addGroup(16, 1); addGroup(16, -1);
    for (let i = 50; i < pts.length - 30; i += 45 + Math.floor(rand() * 30)) {
      if (pts[i].f.loop || pts[i].f.tunnel) continue;
      addGroup(i, rand() < 0.5 ? 1 : -1);
    }
    const blob = (x, z, r) => Array.from({ length: 10 }, (_, j) => { const a = (j / 10) * Math.PI * 2, q = r * (0.7 + rand() * 0.5); return [x + Math.cos(a) * q, 0.01, z + Math.sin(a) * q]; });
    const patches = Array.from({ length: 50 }, () => blob(rx(90), rz(90), 4 + rand() * 12));
    const ponds = [];
    if (!th.water) for (let k = 0; k < 40 && ponds.length < 2; k++) { const x = rx(40), z = rz(40); if (!nearTrack(x, z, 16)) ponds.push(blob(x, z, 8 + rand() * 5)); }
    const ring = (r, base, amp, ph) => Array.from({ length: 73 }, (_, j) => { const a = (j / 72) * Math.PI * 2; return [mid[0] + Math.cos(a) * r, base + amp * (0.5 + 0.3 * Math.sin(a * 3 + ph) + 0.2 * Math.sin(a * 8 + ph * 2)), mid[1] + Math.sin(a) * r]; });
    const hills = [{ top: ring(1500, 50, 220, 1), col: land.hills[0] }, { top: ring(700, 5, 60, 4), col: land.hills[1] }];
    const clouds = Array.from({ length: 16 }, () => { const a = rand() * Math.PI * 2, r = 400 + rand() * 900; return { p: [mid[0] + Math.cos(a) * r, 110 + rand() * 140, mid[1] + Math.sin(a) * r], w: 50 + rand() * 70 }; });
    const sunDir = nrm([0.5, 0.3, 0.8]);
    const props = (coaster.props || []).map((pr, n) => {
      const idx = pts.findIndex(pt => pt.k === pr.at);
      const pt = pts[idx >= 0 ? idx + 6 : 20] || pts[20];
      const side = nrm([pt.R[0], 0, pt.R[2]]);
      return { p: [pt.p[0] + side[0] * 5 * (pr.side || 1), 0, pt.p[2] + side[2] * 5 * (pr.side || 1)], prop: propById(pr.id) };
    }).filter(x => x.prop);
    const stars = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.7]);

    function frameAt(s) {
      const i = Math.min(pts.length - 2, Math.floor(s)), u = s - i, a = pts[i], b = pts[i + 1];
      const lerp = (x, y) => add(mul(x, 1 - u), mul(y, u));
      return { p: lerp(a.p, b.p), T: nrm(lerp(a.T, b.T)), U: nrm(lerp(a.U, b.U)), i };
    }

    function draw() {
      const fr = frameAt(st.s);
      let F = nrm(sub(fr.T, mul(fr.U, 0.1)));
      const Up = nrm(sub(fr.U, mul(F, dot(fr.U, F))));
      const R = cross(F, Up);
      const C = add(fr.p, mul(fr.U, 1.5));
      const f = Math.min(W, H) * 0.85;
      const cx = W / 2 + (st.shake ? (Math.random() - 0.5) * 14 * st.shake : 0), cy = H * 0.55;
      const cam = q => { const d = sub(q, C); return [dot(d, R), dot(d, Up), dot(d, F)]; };
      const proj = c => [cx + (f * c[0]) / c[2], cy - (f * c[1]) / c[2]];
      const NEAR = 0.3;
      const clip = (a, b) => {
        if (a[2] < NEAR && b[2] < NEAR) return null;
        if (a[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); a = add(a, mul(sub(b, a), t)); }
        if (b[2] < NEAR) { const t = (NEAR - b[2]) / (a[2] - b[2]); b = add(b, mul(sub(a, b), t)); }
        return [a, b];
      };
      const clipPoly = poly => {
        const out = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length];
          if (a[2] >= NEAR) out.push(a);
          if ((a[2] >= NEAR) !== (b[2] >= NEAR)) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push(add(a, mul(sub(b, a), t))); }
        }
        return out;
      };
      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (th.stars) { ctx.fillStyle = '#fff'; for (const [a, b] of stars) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(st.t + a * 30)); ctx.fillRect(a * W, b * H, 2, 2); } ctx.globalAlpha = 1; }
      // sun or moon
      const sc = cam(add(C, mul(sunDir, 2000)));
      if (sc[2] > 1 && (land.sun || land.moon)) {
        const [sx, sy] = proj(sc), sr = Math.max(14, (f * 90) / sc[2]);
        const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3.5);
        glow.addColorStop(0, land.sun ? 'rgba(255,240,170,.8)' : 'rgba(220,230,255,.45)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow; ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
        ctx.fillStyle = land.sun ? '#fff3b0' : '#f1f3ff';
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
        if (land.moon) { ctx.fillStyle = 'rgba(160,170,200,.5)'; ctx.beginPath(); ctx.arc(sx - sr * 0.3, sy - sr * 0.2, sr * 0.22, 0, 7); ctx.arc(sx + sr * 0.35, sy + sr * 0.3, sr * 0.15, 0, 7); ctx.fill(); }
      }
      // ground plane
      const L = 3000;
      const gp = clipPoly([[C[0] - L, 0, C[2] - L], [C[0] + L, 0, C[2] - L], [C[0] + L, 0, C[2] + L], [C[0] - L, 0, C[2] + L]].map(cam));
      const addPoly = poly => { if (poly.length < 3) return; poly.map(proj).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
      const fillPoly = (poly, col) => { ctx.fillStyle = col; ctx.beginPath(); addPoly(poly); ctx.fill(); };
      fillPoly(gp, th.water ? '#1e9bd7' : land.grass);
      if (th.water) fillPoly(clipPoly([[minX - 40, 0.01, minZ - 40], [maxX + 40, 0.01, minZ - 40], [maxX + 40, 0.01, maxZ + 40], [minX - 40, 0.01, maxZ + 40]].map(cam)), land.grass);
      // hills on the horizon, far layer first
      for (const h of hills) {
        ctx.fillStyle = h.col; ctx.beginPath();
        for (let j = 0; j < 72; j++) {
          const a = h.top[j], b = h.top[j + 1];
          addPoly(clipPoly([a, b, [b[0], 0, b[2]], [a[0], 0, a[2]]].map(cam)));
        }
        ctx.fill();
      }
      // clouds drifting slowly
      ctx.fillStyle = land.moon ? 'rgba(200,190,230,.22)' : 'rgba(255,255,255,.92)';
      for (const cl of clouds) {
        const c = cam([cl.p[0] + st.t * 3, cl.p[1], cl.p[2]]);
        if (c[2] < 20) continue;
        const [x, y] = proj(c), s = (f * cl.w) / c[2];
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.6, s * 0.22, 0, 0, 7); ctx.ellipse(x - s * 0.25, y - s * 0.1, s * 0.25, s * 0.2, 0, 0, 7); ctx.ellipse(x + s * 0.18, y - s * 0.14, s * 0.3, s * 0.24, 0, 0, 7);
        ctx.fill();
      }
      // meadow patches and ponds
      ctx.fillStyle = land.patch; ctx.beginPath();
      for (const pa of patches) addPoly(clipPoly(pa.map(cam)));
      ctx.fill();
      ctx.fillStyle = land.moon ? '#2c4a6e' : '#4fb0e6'; ctx.strokeStyle = land.path; ctx.lineWidth = 3; ctx.beginPath();
      for (const po of ponds) addPoly(clipPoly(po.map(cam)));
      ctx.fill(); ctx.stroke();
      // the track's shadow on the ground gives a sense of speed
      ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath();
      for (let i = fr.i + 2; i < Math.min(pts.length - 4, fr.i + 300); i += 3) {
        const a = pts[i], b = pts[i + 3];
        const ra = nrm([a.T[2], 0, -a.T[0]]), rb = nrm([b.T[2], 0, -b.T[0]]);
        const g = (p, r, s) => [p[0] + r[0] * s, 0.02, p[2] + r[2] * s];
        addPoly(clipPoly([g(a.p, ra, -0.8), g(b.p, rb, -0.8), g(b.p, rb, 0.8), g(a.p, ra, 0.8)].map(cam)));
      }
      ctx.fill();
      // collect primitives and paint far to near
      const prims = [];
      const seg = (a, b, w, col) => { const c = clip(cam(a), cam(b)); if (!c) return; const z = (c[0][2] + c[1][2]) / 2; if (z > 180) return; prims.push({ z, k: 0, a: proj(c[0]), b: proj(c[1]), w: Math.max(1, (f * w) / z), col }); };
      const bill = (q, size, draw) => { const c = cam(q); if (c[2] < 1 || c[2] > 220) return; const [x, y] = proj(c); prims.push({ z: c[2], k: 1, x, y, s: (f * size) / c[2], draw }); };
      const i0 = fr.i;
      for (let i = i0 + 1 + ((i0 + 1) % 2); i < Math.min(pts.length - 2, i0 + 300); i += 2) {
        const a = pts[i], b = pts[i + 2];
        const la = add(a.p, mul(a.R, -0.6)), ra = add(a.p, mul(a.R, 0.6)), lb = add(b.p, mul(b.R, -0.6)), rb = add(b.p, mul(b.R, 0.6));
        seg(add(a.p, mul(a.U, -0.35)), add(b.p, mul(b.U, -0.35)), 0.28, shade(trackCol, -0.35));
        seg(la, lb, 0.12, trackCol);
        seg(ra, rb, 0.12, trackCol);
        if (i % 2 === 0) seg(la, ra, 0.1, '#444');
        if (i % 8 === 0 && a.p[1] > 1 && a.U[1] > 0.3) seg(add(a.p, mul(a.U, -0.35)), [a.p[0], 0, a.p[2]], 0.18, supCol);
        if (a.f.tunnel && i % 4 === 0) {
          const ring = Array.from({ length: 9 }, (_, n) => { const ang = (n / 8) * Math.PI * 2; return add(add(a.p, mul(a.R, Math.cos(ang) * 3)), mul(a.U, Math.sin(ang) * 3 + 1)); });
          for (let n = 0; n < 8; n++) seg(ring[n], ring[n + 1], 0.6, n % 2 ? '#4e342e' : '#6d4c41');
        }
        if (a.f.water && i % 6 === 0) bill(add(a.p, mul(a.R, 2.5)), 1.4, (x, y, s) => { ctx.drawImage(sprite('💦'), x - s / 2, y - s, s, s); });
      }
      for (const it of items) {
        if (it.done || it.i <= i0) continue;
        const pt = pts[it.i];
        if (it.beam) {
          const a = add(add(pt.p, mul(pt.U, 2.1)), mul(pt.R, -2.4)), b = add(add(pt.p, mul(pt.U, 2.1)), mul(pt.R, 2.4));
          for (let n = 0; n < 6; n++) seg(add(a, mul(sub(b, a), n / 6)), add(a, mul(sub(b, a), (n + 1) / 6)), 0.35, n % 2 ? '#fff' : '#e63946');
          seg(add(pt.p, mul(pt.R, -2.4)), a, 0.15, '#888');
          seg(add(pt.p, mul(pt.R, 2.4)), b, 0.15, '#888');
        } else {
          bill(add(pt.p, mul(pt.U, 2.4)), 1.3, (x, y, s) => {
            const wob = Math.abs(Math.cos(st.t * 4 + it.i)) * 0.7 + 0.3;
            ctx.fillStyle = 'rgba(255,230,120,.35)'; ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, 7); ctx.fill();
            ctx.fillStyle = '#ffc300'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = Math.max(1, s * 0.08);
            ctx.beginPath(); ctx.ellipse(x, y, (s / 2) * wob, s / 2, 0, 0, 7); ctx.fill(); ctx.stroke();
          });
        }
      }
      for (const d of deco) bill(d.p, d.s, (x, y, s) => { ctx.drawImage(sprite(d.e), x - s / 2, y - s, s, s); });
      for (const g of crowd) bill(g.p, 1.7, (x, y, s) => { if (s > 4) Coaster.person(ctx, x, y, s, g.o, Math.abs(g.i - i0) < 70, st.t); });
      for (const pr of props) {
        const im = propImage(pr.prop);
        bill(pr.p, 3.2, (x, y, s) => {
          if (im && im.complete) ctx.drawImage(im, x - s / 2, y - s, s, s);
          else ctx.drawImage(sprite(pr.prop.e || '⭐'), x - s / 2, y - s, s, s);
        });
      }
      prims.sort((a, b) => b.z - a.z);
      ctx.lineCap = 'round';
      ctx.textAlign = 'center';
      for (const q of prims) {
        if (q.k === 0) { ctx.strokeStyle = q.col; ctx.lineWidth = q.w; ctx.beginPath(); ctx.moveTo(q.a[0], q.a[1]); ctx.lineTo(q.b[0], q.b[1]); ctx.stroke(); }
        else q.draw(q.x, q.y, q.s);
      }
      ctx.textAlign = 'left';
      const here = pts[i0];
      if (here.f.tunnel) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); }
      if (se.tint) { ctx.fillStyle = se.tint; ctx.fillRect(0, 0, W, H); }
      if (se.fall === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (let n = 0; n < 70; n++) { ctx.beginPath(); ctx.arc((n * 137 + Math.sin(st.t + n) * 20 + W) % W, (n * 89 + st.t * (50 + (n % 4) * 25)) % H, 1.5 + (n % 3), 0, 7); ctx.fill(); }
      } else if (se.fall) {
        for (let n = 0; n < 14; n++) ctx.drawImage(sprite(se.fall[n % se.fall.length]), (n * 211 + Math.sin(st.t * 0.8 + n) * 40 + W) % W, (n * 97 + st.t * (40 + (n % 3) * 15)) % H, 26, 26);
      }
      if (st.splash > 0) {
        ctx.fillStyle = `rgba(120,200,255,${st.splash * 0.5})`; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#e1f5fe';
        for (let n = 0; n < 30; n++) { ctx.beginPath(); ctx.arc((n * 137) % W, (n * 89 + st.t * 400) % H, 6, 0, 7); ctx.fill(); }
      }
      // speed lines
      const v = vs[Math.min(vs.length - 1, i0)] || 0;
      if (v > 15) {
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
        for (let n = 0; n < 16; n++) {
          const a = (n / 16) * Math.PI * 2 + st.t * 0.3, r1 = Math.min(W, H) * (0.35 + ((st.t * 2 + n * 0.13) % 1) * 0.4);
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * (r1 + 30 + v), cy + Math.sin(a) * (r1 + 30 + v)); ctx.stroke();
        }
      }
      // front of the car and the rider's arms
      const car = coaster.car || {};
      ctx.fillStyle = car.color || '#e63946';
      ctx.beginPath(); ctx.moveTo(W * 0.18, H); ctx.lineTo(W * 0.3, H * 0.84); ctx.lineTo(W * 0.7, H * 0.84); ctx.lineTo(W * 0.82, H); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(W * 0.32, H * 0.85, W * 0.36, H * 0.015);
      ctx.font = `${H * 0.08}px serif`; ctx.textAlign = 'center';
      ctx.fillText(car.front || (CAR_SHAPES[car.shape] || CAR_SHAPES.klassisk).icon, W / 2, H * 0.96);
      ctx.strokeStyle = '#ffd9b0'; ctx.lineWidth = H * 0.035; ctx.lineCap = 'round';
      if (st.hold) {
        ctx.beginPath(); ctx.moveTo(W * 0.3, H); ctx.lineTo(W * 0.24, H * 0.62); ctx.moveTo(W * 0.7, H); ctx.lineTo(W * 0.76, H * 0.62); ctx.stroke();
        ctx.font = `${H * 0.09}px serif`; ctx.fillText('✋', W * 0.24, H * 0.62); ctx.fillText('✋', W * 0.76, H * 0.62);
        if (st.sparkle > 0) { ctx.globalAlpha = Math.min(1, st.sparkle * 3); ctx.fillText('✨', W * 0.5, H * 0.6); ctx.globalAlpha = 1; }
      } else {
        ctx.strokeStyle = '#555'; ctx.lineWidth = H * 0.02; ctx.beginPath(); ctx.moveTo(W * 0.33, H * 0.86); ctx.lineTo(W * 0.67, H * 0.86); ctx.stroke();
        ctx.strokeStyle = '#ffd9b0'; ctx.lineWidth = H * 0.035;
        ctx.beginPath(); ctx.moveTo(W * 0.3, H); ctx.lineTo(W * 0.38, H * 0.87); ctx.moveTo(W * 0.7, H); ctx.lineTo(W * 0.62, H * 0.87); ctx.stroke();
      }
      // HUD
      ctx.textAlign = 'left';
      const pill = (x, y, w, h) => { ctx.fillStyle = 'rgba(0,0,0,.45)'; Coaster.roundRect(ctx, x, y, w, h, h / 2); ctx.fill(); };
      pill(14, 14, 160, 50);
      ctx.fillStyle = '#fff'; ctx.font = '800 28px system-ui, sans-serif'; ctx.fillText(`🪙 ${st.coins}`, 28, 50);
      pill(W / 2 - 160, 22, 320, 26);
      ctx.fillStyle = '#ffd23f'; Coaster.roundRect(ctx, W / 2 - 156, 26, 312 * (st.s / (pts.length - 1)), 18, 9); ctx.fill();
      pill(14, H - 70, 210, 50);
      ctx.fillStyle = '#fff'; ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText(`💨 ${Math.round(v * 3.6)} km/t`, 30, H - 37);
      if (st.t < 8) {
        ctx.textAlign = 'center'; pill(W / 2 - 230, H * 0.2 - 30, 460, 50);
        ctx.fillStyle = '#fff'; ctx.font = '700 19px system-ui, sans-serif';
        ctx.fillText('Hold fingeren = armene op 🙌  ·  Slip = duk dig', W / 2, H * 0.2);
      }
      // caught coins fly up to the counter
      for (const fl of st.fly) {
        const u = Math.min(1, fl.t / 0.6), x = W * 0.5 + (90 - W * 0.5) * u, y = H * 0.55 + (40 - H * 0.55) * u - Math.sin(u * Math.PI) * 60;
        ctx.fillStyle = '#ffc300'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 22 - u * 8, 0, 7); ctx.fill(); ctx.stroke();
      }
      ctx.textAlign = 'center';
      st.msg.forEach((m, n) => {
        ctx.globalAlpha = Math.min(1, 2 - m.t);
        ctx.font = '900 40px system-ui, sans-serif';
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.6)';
        const y = H * 0.32 + n * 48 - m.t * 20;
        ctx.strokeText(m.text, W / 2, y); ctx.fillStyle = m.color; ctx.fillText(m.text, W / 2, y);
        ctx.globalAlpha = 1;
      });
      ctx.textAlign = 'left';
    }

    function update(dt) {
      st.t += dt;
      const i = Math.min(pts.length - 1, Math.floor(st.s));
      const v = Math.max(2.5, vs[i] || 2.5);
      const prev = st.s;
      st.s = Math.min(pts.length - 1.001, st.s + (v * dt) / STEP);
      const a = Math.floor(prev), b = Math.floor(st.s);
      for (let k = a + 1; k <= b; k++) {
        const pt = pts[k], pp = pts[k - 1];
        if (pt.f.chain && !pp.f.chain) say('Kæden trækker jer op...', '#ffe066');
        if (pt.f.booster && !pp.f.booster) { say('RAKETSTART!', '#ff9f1c'); Sfx.whoosh(); st.shake = 0.4; }
        if (pt.f.loop && !pp.f.loop) { say('LOOP!', '#7df9ff'); Sfx.whoosh(); }
        if (pt.f.tunnel && !pp.f.tunnel) say('Tunnel!', '#ffd6a5');
        if (pp.f.water && !pt.f.water) { st.splash = 1; Sfx.noise(0.8, 0.8, 600, 0.6); say('Vandplask!', '#7df9ff'); }
        if (pt.p[1] < pp.p[1] - 0.3 && (pts[k + 1] && pts[k + 1].p[1] < pt.p[1]) && !pp.f.loop && Math.random() < 0.01) Sfx.whoosh();
        for (const it of items) {
          if (it.done || it.i !== k) continue;
          it.done = true;
          if (it.beam) {
            if (st.hold) { const lose = Math.min(2, st.coins); st.coins -= lose; st.shake = 0.6; say(lose ? `Bjælken ramte! −${lose}` : 'Bjælken ramte!', '#ff6b6b'); Sfx.hit(); }
            else { say('Godt dukket!', '#bfffbf'); Sfx.tone(660, 0.1, 'triangle', 0.06); }
          } else if (st.t - st.lastHold < 0.5) { st.coins++; st.fly.push({ t: 0 }); st.sparkle = 0.5; Sfx.tone(1318, 0.12, 'triangle', 0.1); }
        }
        // warn about beams ahead
        const ahead = items.find(it => it.beam && !it.warned && it.i > k && it.i - k < 40);
        if (ahead) { ahead.warned = true; say('Bjælke! Slip og duk dig!', '#ff6b6b'); Sfx.tone(880, 0.1, 'square', 0.05); }
      }
      if (st.hold) st.lastHold = st.t;
      st.fly.forEach(fl => { fl.t += dt; });
      st.fly = st.fly.filter(fl => fl.t < 0.6);
      st.sparkle = Math.max(0, st.sparkle - dt);
      st.shake = Math.max(0, st.shake - dt);
      st.splash = Math.max(0, st.splash - dt * 1.2);
      st.msg.forEach(m => { m.t += dt; });
      st.msg = st.msg.filter(m => m.t < 1.8);
      if (st.s >= pts.length - 1.01 && !st.done) {
        st.done = true;
        stop();
        Sfx.fanfare();
        onEnd({ coins: st.coins, total, pen: 0, airs: 0, loops: 0, d3: true });
      }
    }

    let last = performance.now();
    const loop = now => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      update(dt);
      if (!st.done) { draw(); raf = requestAnimationFrame(loop); }
    };
    raf = requestAnimationFrame(loop);
    return { st, pts, total, step: dt => { update(dt); if (!st.done) draw(); } };
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  return { buildPath, simulate, stats, fromRide, start, stop, shade, norm };
})();
