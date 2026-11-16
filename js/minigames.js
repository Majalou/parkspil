// Small ride games: bumper cars, boats and the drop tower (with a math target)
const MiniGames = (() => {
  let raf = 0, cleanup = null;
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (cleanup) { cleanup(); cleanup = null; }
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rr = (ctx, x, y, w, h, r) => Coaster.roundRect(ctx, x, y, w, h, r);

  function setup(root) {
    root.innerHTML = '<canvas class="ccanvas"></canvas>';
    const cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
    const view = { W: 800, H: 600 };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      view.W = root.clientWidth || 800; view.H = root.clientHeight || 600;
      cv.width = view.W * dpr; cv.height = view.H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const ptr = { x: null, y: null, down: false };
    const pos = e => { const r = cv.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; };
    const dn = e => { e.preventDefault(); ptr.down = true; pos(e); };
    const mv = e => { if (ptr.down || e.pointerType === 'mouse') pos(e); };
    const upf = () => { ptr.down = false; };
    cv.addEventListener('pointerdown', dn);
    cv.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', upf);
    cleanup = () => { window.removeEventListener('resize', resize); window.removeEventListener('pointerup', upf); };
    return { cv, ctx, view, ptr };
  }

  function hud(ctx, view, coins, time, text) {
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    rr(ctx, 14, 14, 150, 50, 25); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 28px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`🪙 ${coins}`, 28, 50);
    if (time !== null) {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, view.W / 2 - 60, 14, 120, 44, 22); ctx.fill();
      ctx.fillStyle = time < 6 ? '#ff6b6b' : '#fff'; ctx.textAlign = 'center';
      ctx.fillText(`⏱️ ${Math.ceil(time)}`, view.W / 2, 46);
    }
    if (text) {
      ctx.textAlign = 'center'; ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(ctx, view.W / 2 - 200, view.H - 56, 400, 40, 20); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(text, view.W / 2, view.H - 30);
    }
    ctx.textAlign = 'left';
  }
  function floats(ctx, list, dt) {
    ctx.textAlign = 'center';
    for (const f of list) {
      f.t += dt;
      ctx.globalAlpha = Math.max(0, 1 - f.t);
      ctx.font = '900 30px system-ui, sans-serif';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.strokeText(f.text, f.x, f.y - f.t * 40);
      ctx.fillStyle = f.col || '#ffd23f'; ctx.fillText(f.text, f.x, f.y - f.t * 40);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    for (let i = list.length - 1; i >= 0; i--) if (list[i].t > 1) list.splice(i, 1);
  }
  function runLoop(fn) {
    let last = performance.now();
    const loop = now => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (fn(dt) !== false) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // ---------- bumper cars / go-karts ----------
  function bump(root, ride, av, year, onEnd) {
    stop();
    const { ctx, view, ptr } = setup(root);
    const kart = ride.id === 'gokart';
    const COLS = ['#ff5a5f', '#3a86ff', '#ffd23f', '#0ead69', '#ff70a6', '#8338ec'];
    const me = { x: view.W / 2, y: view.H / 2, vx: 0, vy: 0, ang: 0, col: av.color, me: true };
    const ai = Array.from({ length: 5 + (year > 2 ? 1 : 0) }, (_, i) => ({ x: rnd(80, view.W - 80), y: rnd(120, view.H - 80), vx: rnd(-80, 80), vy: rnd(-80, 80), ang: 0, col: COLS[i % 6], cd: 0, face: ['🙂', '😃', '😆', '😮', '😜', '🤠'][i] }));
    const st = { t: 35, coins: 0, fx: [], done: false };
    const R = 32;
    runLoop(dt => {
      const { W, H } = view;
      const pad = 40;
      st.t -= dt;
      // player steers toward the finger
      if (ptr.x !== null) {
        const dx = ptr.x - me.x, dy = ptr.y - me.y, d = Math.hypot(dx, dy);
        if (d > 8) { me.vx += (dx / d) * 900 * dt; me.vy += (dy / d) * 900 * dt; }
      }
      const all = [me, ...ai];
      for (const c of all) {
        if (!c.me) {
          c.vx += rnd(-200, 200) * dt; c.vy += rnd(-200, 200) * dt;
          c.cd = Math.max(0, c.cd - dt);
        }
        const sp = Math.hypot(c.vx, c.vy), max = c.me ? 330 : 170;
        if (sp > max) { c.vx *= max / sp; c.vy *= max / sp; }
        c.vx *= 1 - dt * 0.8; c.vy *= 1 - dt * 0.8;
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < pad + R) { c.x = pad + R; c.vx = Math.abs(c.vx); }
        if (c.x > W - pad - R) { c.x = W - pad - R; c.vx = -Math.abs(c.vx); }
        if (c.y < pad + 60 + R) { c.y = pad + 60 + R; c.vy = Math.abs(c.vy); }
        if (c.y > H - pad - R) { c.y = H - pad - R; c.vy = -Math.abs(c.vy); }
        if (sp > 20) c.ang = Math.atan2(c.vy, c.vx);
      }
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < R * 2 && d > 0) {
          const nx = dx / d, ny = dy / d, push = (R * 2 - d) / 2;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) { a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx * 1.3; b.vy += rel * ny * 1.3; }
          if (a.me && !b.cd && rel > 80) {
            b.cd = 1;
            st.coins++;
            st.fx.push({ text: 'BUMP! +1', x: b.x, y: b.y - 20, t: 0 });
            Sfx.hit();
          }
        }
      }
      // draw
      ctx.fillStyle = kart ? '#2e7d32' : '#26263a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = kart ? '#555' : '#4a4f5c';
      rr(ctx, pad, pad + 60, W - pad * 2, H - pad * 2 - 60, 30); ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = kart ? '#fff' : '#ffd23f';
      if (kart) ctx.setLineDash([30, 30]);
      rr(ctx, pad, pad + 60, W - pad * 2, H - pad * 2 - 60, 30); ctx.stroke();
      ctx.setLineDash([]);
      if (!kart) {
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 2;
        for (let x = pad; x < W - pad; x += 40) { ctx.beginPath(); ctx.moveTo(x, pad + 60); ctx.lineTo(x, H - pad); ctx.stroke(); }
        for (let i = 0; i < 12; i++) { ctx.fillStyle = `hsl(${(i * 30 + performance.now() / 10) % 360},90%,60%)`; ctx.beginPath(); ctx.arc(pad + ((W - 2 * pad) * i) / 11, pad + 60, 5, 0, 7); ctx.fill(); }
      }
      for (const c of all) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.ang);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(ctx, -R + 3, -R * 0.75 + 4, R * 2, R * 1.5, 12); ctx.fill();
        ctx.fillStyle = '#222'; rr(ctx, -R - 3, -R * 0.5, R * 2 + 6, R, 10); ctx.fill();
        ctx.fillStyle = c.col; rr(ctx, -R, -R * 0.75, R * 2, R * 1.5, 12); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, -R + 4, -R * 0.7, R * 2 - 8, 6, 3); ctx.fill();
        ctx.rotate(-c.ang);
        ctx.font = '32px serif'; ctx.textAlign = 'center';
        Coaster.emoji(ctx, c.me ? av.animal : c.face, 0, 11, 32);
        if (c.me) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R + 8, 0, 7); ctx.stroke(); }
        ctx.restore();
      }
      floats(ctx, st.fx, dt);
      hud(ctx, view, st.coins, st.t, st.t > 30 ? 'Træk fingeren dit du vil køre. Bump de andre!' : '');
      if (st.t <= 0) { stop(); onEnd({ coins: st.coins, game: 'bump' }); return false; }
    });
    return { st };
  }

  // ---------- boats: collect ducks ----------
  function boat(root, ride, av, year, onEnd) {
    stop();
    const { ctx, view, ptr } = setup(root);
    const river = ride.id === 'rafting';
    const me = { x: view.W / 2, y: view.H * 0.7, vx: 0, vy: 0 };
    const items = [];
    const st = { t: 35, coins: 0, fx: [], spawn: 0, flow: 0 };
    runLoop(dt => {
      const { W, H } = view;
      st.t -= dt;
      st.flow += dt;
      st.spawn -= dt;
      if (st.spawn <= 0) {
        st.spawn = river ? 0.55 : 0.9;
        const rock = river && Math.random() < 0.3 + year * 0.05;
        items.push({ x: rnd(60, W - 60), y: river ? -30 : rnd(110, H - 60), vy: river ? rnd(120, 180) : 0, life: river ? 99 : 6, rock, wob: rnd(0, 6) });
      }
      if (ptr.x !== null) {
        const dx = ptr.x - me.x, dy = ptr.y - me.y, d = Math.hypot(dx, dy);
        if (d > 6) { me.vx += (dx / d) * 700 * dt; me.vy += (dy / d) * 700 * dt; }
      }
      me.vx *= 1 - dt * 1.6; me.vy *= 1 - dt * 1.6;
      me.x = Math.max(40, Math.min(W - 40, me.x + me.vx * dt));
      me.y = Math.max(100, Math.min(H - 40, me.y + me.vy * dt));
      for (const it of items) {
        it.y += it.vy * dt;
        it.life -= dt;
        if (!it.gone && Math.hypot(it.x - me.x, it.y - me.y) < 40) {
          it.gone = true;
          if (it.rock) { st.coins = Math.max(0, st.coins - 1); st.fx.push({ text: 'Av! −1', x: me.x, y: me.y - 30, t: 0, col: '#ff6b6b' }); Sfx.bad(); }
          else { st.coins++; st.fx.push({ text: '+1', x: it.x, y: it.y - 20, t: 0 }); Sfx.tone(1175, 0.12, 'triangle', 0.1); }
        }
      }
      for (let i = items.length - 1; i >= 0; i--) if (items[i].gone || items[i].life <= 0 || items[i].y > H + 40) items.splice(i, 1);
      // draw water
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, river ? '#1e88e5' : '#48cae4'); g.addColorStop(1, river ? '#0d47a1' : '#0096c7');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (river) { ctx.fillStyle = '#4f7942'; ctx.fillRect(0, 0, 30, H); ctx.fillRect(W - 30, 0, 30, H); }
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
      for (let i = 0; i < 18; i++) {
        const x = (i * 157) % W, y = river ? ((i * 89 + st.flow * 200) % H) : (i * 89) % H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 15, y - 6 + Math.sin(st.flow * 2 + i) * 3, x + 30, y); ctx.stroke();
      }
      ctx.textAlign = 'center';
      for (const it of items) {
        ctx.font = it.rock ? '46px serif' : '44px serif';
        ctx.globalAlpha = Math.min(1, it.life);
        Coaster.emoji(ctx, it.rock ? '🪨' : '🦆', it.x, it.y + Math.sin(st.flow * 3 + it.wob) * 4 + 12, it.rock ? 46 : 44);
      }
      ctx.globalAlpha = 1;
      // player boat
      ctx.save(); ctx.translate(me.x, me.y);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(0, 18, 44, 12, 0, 0, 7); ctx.fill();
      if (river) {
        ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffe8cc'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
        Coaster.emoji(ctx, av.animal, 0, 10, 28);
      } else {
        Coaster.emoji(ctx, '🦢', 0, 18, 64);
        Coaster.emoji(ctx, av.animal, 14, -6, 26);
      }
      ctx.restore();
      ctx.textAlign = 'left';
      floats(ctx, st.fx, dt);
      hud(ctx, view, st.coins, st.t, st.t > 30 ? (river ? 'Saml ænderne. Pas på stenene!' : 'Træk fingeren. Saml ænderne!') : '');
      if (st.t <= 0) { stop(); onEnd({ coins: st.coins, game: 'boat' }); return false; }
    });
    return { st };
  }

  // ---------- drop tower: stop the seat at the answer ----------
  function dropTarget(year) {
    const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    if (year === 1) { const a = r(1, 5), b = r(1, 10 - a); return { text: `${a} + ${b}`, ans: a + b, max: 10, step: 1 }; }
    if (year === 2) { const a = r(2, 12), b = r(1, 20 - a); return Math.random() < 0.5 ? { text: `${a} + ${b}`, ans: a + b, max: 20, step: 2 } : { text: `${a + b} − ${b}`, ans: a, max: 20, step: 2 }; }
    if (year === 3) { const a = r(2, 9), b = r(2, 10); return { text: `${a} × ${b}`, ans: a * b, max: 100, step: 10 }; }
    const a = r(2, 9), b = r(2, 9), c = r(1, 9);
    return { text: `${a} × ${b} + ${c}`, ans: a * b + c, max: 100, step: 10 };
  }
  function drop(root, ride, av, year, onEnd) {
    stop();
    const { cv, ctx, view } = setup(root);
    const thor = ride.id === 'thor';
    const st = { round: 0, coins: 0, fx: [], phase: 'move', t: 0, pos: 0, dir: 1, speed: year === 1 ? 0.14 : 0.2, tgt: dropTarget(year), wait: 0, fall: 0, result: '' };
    Speech.say(`Stop ved ${st.tgt.text}`);
    const btn = { x: 0, y: 0, r: 60 };
    cv.addEventListener('pointerdown', e => {
      if (st.phase !== 'move') return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - btn.x, y - btn.y) > btn.r + 30) return;
      const val = st.pos * st.tgt.max, tol = st.tgt.max / 20;
      const hit = Math.abs(val - st.tgt.ans) <= tol;
      st.phase = 'stop'; st.wait = 1.4;
      if (hit) { st.coins += 3; st.result = 'ok'; st.fx.push({ text: 'Præcis! +3', x: view.W * 0.4, y: view.H * 0.3, t: 0 }); Sfx.good(); Speech.say(`Rigtigt! ${st.tgt.text} er ${st.tgt.ans}`); }
      else { st.result = 'bad'; st.fx.push({ text: `Det var ${st.tgt.ans}`, x: view.W * 0.4, y: view.H * 0.3, t: 0, col: '#ff6b6b' }); Sfx.bad(); Speech.say(`${st.tgt.text} er ${st.tgt.ans}`); }
    });
    runLoop(dt => {
      const { W, H } = view;
      st.t += dt;
      if (st.phase === 'move') {
        st.pos += st.dir * st.speed * dt;
        if (st.pos > 1) { st.pos = 1; st.dir = -1; }
        if (st.pos < 0) { st.pos = 0; st.dir = 1; }
      } else if (st.phase === 'stop') {
        st.wait -= dt;
        if (st.wait <= 0) { st.phase = 'fall'; st.fall = 0; Sfx.whoosh(); }
      } else if (st.phase === 'fall') {
        st.fall += dt;
        st.pos = Math.max(0, st.pos - st.fall * 2.4 * dt * 10);
        if (st.pos <= 0) {
          st.round++;
          if (st.round >= 5) { stop(); onEnd({ coins: st.coins, game: 'drop' }); return false; }
          st.tgt = dropTarget(year); st.speed += 0.04; st.phase = 'move'; st.pos = 0; st.dir = 1;
          Speech.say(`Stop ved ${st.tgt.text}`);
        }
      }
      // background
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, thor ? '#37474f' : '#64b5f6'); g.addColorStop(1, thor ? '#90a4ae' : '#e3f2fd');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (thor && Math.floor(st.t * 1.5) % 6 === 0) { ctx.fillStyle = 'rgba(255,255,200,.2)'; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = '#5fb84a'; ctx.fillRect(0, H - 50, W, 50);
      // tower + scale
      const tx = W * 0.4, top = 110, bot = H - 70, hgt = bot - top;
      ctx.fillStyle = thor ? '#78909c' : '#adb5bd'; ctx.fillRect(tx - 16, top - 20, 32, hgt + 30);
      if (thor) { ctx.fillStyle = '#546e7a'; rr(ctx, tx - 50, top - 70, 100, 44, 8); ctx.fill(); ctx.fillStyle = '#6d4c41'; ctx.fillRect(tx - 7, top - 30, 14, 20); }
      else { ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(tx - 30, top - 20); ctx.lineTo(tx, top - 60); ctx.lineTo(tx + 30, top - 20); ctx.fill(); }
      const marks = st.tgt.max / st.tgt.step;
      ctx.font = '800 18px system-ui, sans-serif'; ctx.textAlign = 'left';
      for (let i = 0; i <= marks; i++) {
        const v = i * st.tgt.step, y = bot - (v / st.tgt.max) * hgt;
        ctx.fillStyle = '#1d3557'; ctx.fillRect(tx + 76, y - 1.5, 18, 3);
        ctx.fillText(String(v), tx + 100, y + 6);
        if (st.tgt.step > 1 && i < marks) for (let k = 1; k < 5; k++) ctx.fillRect(tx + 76, y - (k * hgt) / marks / 5, 8, 1.5);
      }
      // seat
      const sy = bot - st.pos * hgt;
      ctx.fillStyle = thor ? '#c62828' : '#3a86ff';
      rr(ctx, tx - 70, sy - 18, 140, 32, 10); ctx.fill();
      ctx.font = '26px serif'; ctx.textAlign = 'center';
      Coaster.emoji(ctx, av.animal, tx - 40, sy + 4, 26); Coaster.emoji(ctx, '😃', tx, sy + 4, 26); Coaster.emoji(ctx, '😮', tx + 40, sy + 4, 26);
      if (st.phase === 'fall') { ctx.font = '900 34px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('AAAH!', tx + 110, sy); }
      // pointer arrow at the seat
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(tx + 76, sy); ctx.lineTo(tx + 62, sy - 10); ctx.lineTo(tx + 62, sy + 10); ctx.fill();
      // target + stop button
      ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(ctx, W * 0.62, 90, W * 0.34, 110, 20); ctx.fill();
      ctx.fillStyle = '#1d3557'; ctx.font = '700 20px system-ui, sans-serif';
      ctx.fillText(`Runde ${Math.min(5, st.round + 1)} af 5 · Stop ved:`, W * 0.79, 125);
      ctx.font = '900 44px system-ui, sans-serif'; ctx.fillStyle = '#e63946';
      ctx.fillText(st.tgt.text, W * 0.79, 180);
      btn.x = W * 0.79; btn.y = H * 0.62; btn.r = Math.min(80, W * 0.12);
      ctx.fillStyle = st.phase === 'move' ? '#e63946' : '#999';
      ctx.beginPath(); ctx.arc(btn.x, btn.y + 6, btn.r, 0, 7); ctx.fillStyle = '#8a1414'; ctx.fill();
      ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r, 0, 7); ctx.fillStyle = st.phase === 'move' ? '#e63946' : '#999'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 34px system-ui, sans-serif'; ctx.fillText('STOP', btn.x, btn.y + 12);
      floats(ctx, st.fx, dt);
      hud(ctx, view, st.coins, null, st.round === 0 && st.phase === 'move' ? 'Tryk STOP, når stolen er ud for svaret' : '');
    });
    return { st };
  }

  // ---------- mine train in first person: pick the tunnel with the right answer ----------
  function mine(root, ride, av, year, onEnd) {
    stop();
    const { cv, ctx, view } = setup(root);
    const troll = ride.id === 'trolde';
    const pal = troll
      ? { rock: [38, 74, 54], glow: '#9dff9d', fog: '#06140c', crystal: '#7dffb0', deco: ['🍄', '🌿', '🧌'] }
      : { rock: [96, 64, 48], glow: '#ffd27a', fog: '#120a06', crystal: '#9ad8ff', deco: ['💎', '🦊', '🍄'] };
    const SPEED = year === 1 ? 8 : 10, GAP = 70, N = 8, VIEW = 60, R = 3.2;
    const forks = Array.from({ length: N }, (_, k) => {
      const q = dropTarget(year);
      let wrong = q.ans + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2)) * (q.ans > 30 ? q.step : 1);
      if (wrong < 0 || wrong === q.ans) wrong = q.ans + 2;
      const goodLeft = Math.random() < 0.5;
      return { z: 60 + k * GAP, q, left: goodLeft ? q.ans : wrong, right: goodLeft ? wrong : q.ans, good: goodLeft ? 'L' : 'R', choice: null, taken: null, asked: false };
    });
    const END = forks[N - 1].z + 55;
    const nuggets = [];
    for (let z = 12; z < END - 10; z += 6) if (!forks.some(F => z > F.z - 14 && z < F.z + 6)) nuggets.push({ z, x: (Math.random() - 0.5) * 0.6, got: false });
    const deco = Array.from({ length: 60 }, (_, k) => ({ z: 8 + k * (END / 60), a: Math.random() < 0.5 ? -0.55 : 0.55, e: pal.deco[k % pal.deco.length], cr: Math.random() < 0.6 }));
    const st = { z: 0, v: 0, coins: 0, fx: [], t: 0, shake: 0, sparkle: [], done: false, boost: 0, bats: [], wrongUntil: 0 };

    cv.addEventListener('pointerdown', e => {
      const F = forks.find(f => !f.taken && f.z > st.z);
      if (!F || F.z - st.z > 75) return;
      const r = cv.getBoundingClientRect();
      const was = F.choice;
      F.choice = e.clientX - r.left < view.W / 2 ? 'L' : 'R';
      Sfx.click();
      if (!was) { st.boost = 2.2; Sfx.whoosh(); }
    });

    // curvature: gentle wiggle, plus a turn into the chosen tunnel after each fork
    const bump = (u, len) => (u > 0 && u < len ? Math.sin((Math.PI * u) / len) : 0);
    const curve = Z => 0.012 * Math.sin(Z / 13) + forks.reduce((a, F) => a + (F.taken ? (F.taken === 'L' ? -1 : 1) * 0.045 * bump(Z - F.z, 22) : 0), 0);
    // small hills plus a fast dip right after every fork
    const hgt = Z => 0.5 * Math.sin(Z / 11) + 0.25 * Math.sin(Z / 4.3) - forks.reduce((a, F) => a + (F.taken ? 2.2 * bump(Z - F.z - 4, 16) : 0), 0);

    runLoop(dt => {
      const { W, H } = view;
      st.t += dt;
      // the train slows down and waits at the fork until an answer is chosen
      const upcoming = forks.find(F => !F.taken && F.z > st.z - 0.01);
      const dist = upcoming ? upcoming.z - st.z : 999;
      let target = SPEED * (st.boost > 0 ? 1.5 : 1);
      if (upcoming && !upcoming.choice && dist < 40) target = Math.max(0, Math.min(target, (dist - 9) * 0.6));
      st.v += (target - st.v) * Math.min(1, dt * (target < st.v ? 3 : 1.5));
      st.boost = Math.max(0, st.boost - dt);
      st.z += st.v * dt;
      st.waiting = upcoming && !upcoming.choice && dist < 12;
      // forks
      for (const F of forks) {
        if (!F.asked && F.z - st.z < 75) { F.asked = true; Speech.say(`Hvilken tunnel? ${F.q.text}`); }
        if (!F.taken && st.z >= F.z) {
          F.taken = F.choice || 'L';
          if (F.taken === F.good) {
            st.coins += 3; st.fx.push({ text: 'Rigtigt! 💎 +3', x: W / 2, y: H * 0.35, t: 0 }); Sfx.good();
            for (let k = 0; k < 24; k++) st.sparkle.push({ x: W / 2, y: H * 0.5, vx: (Math.random() - 0.5) * 600, vy: -Math.random() * 500, t: 0 });
          } else {
            st.shake = 0.6; st.wrongUntil = F.z + 35; st.fx.push({ text: `Ups! ${F.q.text} = ${F.q.ans}`, x: W / 2, y: H * 0.35, t: 0, col: '#ff6b6b' }); Sfx.hit(); Speech.say(`Ups, forkert tunnel! ${F.q.text} er ${F.q.ans}. Pas på flagermusene!`);
            for (let k = 0; k < 14; k++) st.bats.push({ a: Math.random() * Math.PI * 2, r: 10, v: 250 + Math.random() * 350, t: 0, w: Math.random() * 6 });
          }
        }
      }
      for (const n of nuggets) if (!n.got && n.z <= st.z) { n.got = true; st.coins++; Sfx.tone(1175, 0.1, 'triangle', 0.08); }

      // ---------- render ----------
      const f = H * 0.9, cy = H * 0.5 + (st.shake ? (Math.random() - 0.5) * 16 * st.shake : 0), cx = W / 2;
      const camH = hgt(st.z) + 1.4;
      // relative lateral offset for each depth (integrate curvature ahead of us)
      const step = 0.5, n = VIEW / step, rx = [0];
      let head = 0;
      for (let i = 1; i <= n; i++) { head += curve(st.z + i * step) * step; rx.push(rx[i - 1] + head * step); }
      const lat = d => rx[Math.min(n, Math.max(0, Math.round(d / step)))];
      const proj = (d, x, y) => [cx + (f * (x + lat(d))) / d, cy - (f * (y + hgt(st.z + d) - camH)) / d];
      const nextFork = forks.find(F => !F.taken && F.z > st.z);
      const wallD = nextFork ? nextFork.z - st.z : 999;

      ctx.fillStyle = pal.fog; ctx.fillRect(0, 0, W, H);
      const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
      const K = 14;
      const wrongHere = st.wrongUntil && st.z < st.wrongUntil;
      const rad = (Z, k) => R * (0.88 + 0.22 * hash(Z, ((k % K) + K) % K));
      const ringW = (Z, k) => { const d = Math.max(0.7, Z - st.z), a = (k / K) * Math.PI * 2, r = rad(Z, k); return proj(d, Math.cos(a) * r, 1.5 + Math.sin(a) * r * 0.85); };
      // lanterns every 12 m light up the rock around them
      const lightAt = Z => { const m = ((Z % 12) + 12) % 12; return (wrongHere ? 0.55 : 1) * (0.42 + 0.7 * Math.max(0, 1 - Math.min(m, 12 - m) / 5)) * (0.94 + 0.06 * Math.sin(st.t * 11 + Z)); };
      const shadeRGB = (rgb, s) => `rgb(${rgb.map(v => Math.max(0, Math.min(255, Math.round(v * s)))).join(',')})`;
      const quad = (a, b, c, e) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill(); };
      const far = Math.min(VIEW - 1, wallD);
      const zTop = Math.floor((st.z + far) / 2) * 2;
      // tunnel walls, beams, stalactites and lanterns, far to near
      for (let Z = zTop; Z > st.z; Z -= 2) {
        const d = Z - st.z, fog = Math.min(1, d / VIEW), L = lightAt(Z - 1);
        for (let k = 0; k < K; k++) {
          const top = Math.sin(((k + 0.5) / K) * Math.PI * 2), side = Math.abs(Math.cos(((k + 0.5) / K) * Math.PI * 2));
          if (top < -0.75) continue;
          const a = ringW(Z, k), b = ringW(Z, k + 1), c = ringW(Z - 2, k + 1), e = ringW(Z - 2, k);
          const nz = hash(Z, k + 50);
          ctx.fillStyle = shadeRGB(pal.rock, (0.5 + 0.38 * top) * L * (1 - fog * 0.85) * (0.78 + 0.4 * nz) * 1.45);
          quad(a, b, c, e);
          if (nz > 0.82 && d < 30) {
            ctx.strokeStyle = shadeRGB(pal.rock, 0.35 * (1 - fog)); ctx.lineWidth = Math.max(1, (f * 0.03) / d);
            ctx.beginPath(); ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); ctx.lineTo((a[0] + c[0]) / 2 + 3, (a[1] + c[1]) / 2); ctx.lineTo((e[0] + c[0]) / 2, (e[1] + c[1]) / 2); ctx.stroke();
          }
          if (side > 0.5 && hash(Z, k + 90) > 0.9 && d < 35) {
            ctx.fillStyle = `rgba(255,215,90,${0.5 + 0.5 * Math.sin(st.t * 5 + Z + k)})`;
            const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], s = Math.max(1.5, (f * 0.05) / d);
            ctx.fillRect(m[0], m[1], s, s); ctx.fillRect(m[0] + s * 2, m[1] + s, s, s);
          }
          if (top > 0.55 && hash(Z, k + 20) > 0.7) {
            const ang = ((k + 0.5) / K) * Math.PI * 2, r = R * 0.85, len = 0.4 + 0.6 * hash(Z, k + 33);
            const p1 = proj(Math.max(0.7, d - 0.6), Math.cos(ang) * r - 0.18, 1.5 + Math.sin(ang) * r * 0.85), p2 = proj(Math.max(0.7, d - 0.6), Math.cos(ang) * r + 0.18, 1.5 + Math.sin(ang) * r * 0.85);
            const tip = proj(Math.max(0.7, d - 0.6), Math.cos(ang) * r, 1.5 + Math.sin(ang) * r * 0.85 - len);
            ctx.fillStyle = shadeRGB(pal.rock, 1.25 * L * (1 - fog * 0.8));
            ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(tip[0], tip[1]); ctx.fill();
          }
        }
        if (Z % 6 === 0) {
          const wood = shadeRGB([120, 82, 46], L * (1 - fog * 0.8)), dark = shadeRGB([70, 46, 24], L * (1 - fog * 0.8));
          const post = (x0, x1) => { ctx.fillStyle = wood; quad(proj(d, x0, 0), proj(d, x1, 0), proj(d, x1, 3.05), proj(d, x0, 3.05)); ctx.fillStyle = dark; quad(proj(d, x1 - 0.05, 0), proj(d, x1, 0), proj(d, x1, 3.05), proj(d, x1 - 0.05, 3.05)); };
          post(-R * 0.86, -R * 0.86 + 0.3); post(R * 0.86 - 0.3, R * 0.86);
          ctx.fillStyle = wood; quad(proj(d, -R * 0.95, 2.95), proj(d, R * 0.95, 2.95), proj(d, R * 0.95, 3.3), proj(d, -R * 0.95, 3.3));
          ctx.fillStyle = dark; quad(proj(d, -R * 0.95, 2.95), proj(d, R * 0.95, 2.95), proj(d, R * 0.95, 3.0), proj(d, -R * 0.95, 3.0));
          ctx.strokeStyle = wood; ctx.lineWidth = Math.max(1, (f * 0.12) / d);
          const b1 = proj(d, -R * 0.86 + 0.3, 2.2), b2 = proj(d, -R * 0.4, 2.95), b3 = proj(d, R * 0.86 - 0.3, 2.2), b4 = proj(d, R * 0.4, 2.95);
          ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.moveTo(b3[0], b3[1]); ctx.lineTo(b4[0], b4[1]); ctx.stroke();
          if (Z % 12 === 0) {
            const lp = proj(d, 0, 2.6), s = (f * 0.55) / d;
            const g = ctx.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], s * 4);
            g.addColorStop(0, wrongHere ? 'rgba(120,160,255,.5)' : 'rgba(255,200,110,.55)'); g.addColorStop(1, 'rgba(255,180,80,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lp[0], lp[1], s * 4, 0, 7); ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath(); ctx.moveTo(lp[0], lp[1] - s * 0.9); ctx.lineTo(lp[0], lp[1] - s * 0.5); ctx.stroke();
            Coaster.emoji(ctx, '🏮', lp[0], lp[1] + s * 0.45, s);
          }
        }
      }
      // floor: gravel, light pools, sleepers and rails
      for (let Z = Math.floor(st.z + far); Z > st.z + 0.7; Z -= 1) {
        const d = Z - st.z, dn = Math.max(0.7, d - 1), fog = Math.min(1, d / VIEW), L = lightAt(Z);
        ctx.fillStyle = shadeRGB(pal.rock, 0.62 * L * (1 - fog * 0.8) * (0.85 + 0.3 * hash(Z, 3)));
        quad(proj(d, -R, 0), proj(d, R, 0), proj(dn, R, 0), proj(dn, -R, 0));
        if (hash(Z, 7) > 0.9) {
          const pp = proj(d, (hash(Z, 8) > 0.5 ? 1 : -1) * 1.7, 0.01), s = (f * 0.7) / d;
          ctx.fillStyle = `rgba(150,190,230,${0.35 * (1 - fog)})`; ctx.beginPath(); ctx.ellipse(pp[0], pp[1], s, s * 0.2, 0, 0, 7); ctx.fill();
        }
        ctx.fillStyle = shadeRGB([110, 76, 44], L * (1 - fog * 0.75) * (0.85 + 0.25 * hash(Z, 5)));
        quad(proj(d, -1.0, 0.04), proj(d, 1.0, 0.04), proj(Math.max(0.7, d - 0.35), 1.0, 0.04), proj(Math.max(0.7, d - 0.35), -1.0, 0.04));
      }
      [-0.6, 0.6].forEach(x => {
        [['#3a3f45', 0.09, 0.06], ['#d9e1e8', 0.035, 0.1]].forEach(([col, w, y]) => {
          ctx.strokeStyle = col; ctx.lineCap = 'round';
          for (let d = far; d > 0.8; d -= 1) {
            const p1 = proj(d, x, y), p2 = proj(Math.max(0.8, d - 1), x, y);
            ctx.lineWidth = Math.max(1, (f * w) / d);
            ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
          }
        });
      });
      // cobwebs in the wrong tunnel
      if (wrongHere) {
        for (let Z = Math.ceil(st.z / 5) * 5; Z < Math.min(st.wrongUntil, st.z + far); Z += 5) {
          const d = Z - st.z;
          if (d < 1.5) continue;
          const p = proj(d, (Z % 10 ? -1 : 1) * R * 0.7, 2.7), s = (f * 1.3) / d;
          Coaster.emoji(ctx, '🕸️', p[0], p[1] + s * 0.4, s);
        }
      }
      // crystals, lanterns and creatures on the walls
      for (const o of deco) {
        const d = o.z - st.z;
        if (d < 1.5 || d > far) continue;
        const p = proj(d, o.a * R * 1.5, 2.4), s = (f * 1.1) / d;
        if (o.cr) {
          const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], s * 1.6);
          g.addColorStop(0, pal.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.55 + 0.25 * Math.sin(st.t * 3 + o.z); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], s * 1.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
          ctx.fillStyle = pal.crystal; ctx.beginPath(); ctx.moveTo(p[0], p[1] - s * 0.6); ctx.lineTo(p[0] + s * 0.25, p[1]); ctx.lineTo(p[0], p[1] + s * 0.3); ctx.lineTo(p[0] - s * 0.25, p[1]); ctx.fill();
        } else Coaster.emoji(ctx, o.e, p[0], p[1] + s * 0.4, s);
      }
      // nuggets on the track
      for (const nn of nuggets) {
        const d = nn.z - st.z;
        if (nn.got || d < 1 || d > far) continue;
        const p = proj(d, nn.x, 0.5), s = (f * 0.55) / d;
        Coaster.emoji(ctx, '🪙', p[0], p[1] + s * 0.4, s);
      }
      // the fork: a rock wall with two tunnel mouths and answer signs
      if (nextFork && wallD < VIEW) {
        const d = wallD, fog = Math.min(1, d / VIEW), sc = 1.1 - fog * 0.7;
        const tl = proj(d, -R, 3.4), br = proj(d, R, -0.2);
        const wg = ctx.createLinearGradient(0, tl[1], 0, br[1]);
        wg.addColorStop(0, `rgb(${pal.rock.map(v => Math.round(v * sc * 0.8)).join(',')})`);
        wg.addColorStop(1, `rgb(${pal.rock.map(v => Math.round(v * sc * 1.2)).join(',')})`);
        ctx.fillStyle = wg;
        ctx.fillRect(tl[0] - 2, tl[1] - 2, br[0] - tl[0] + 4, br[1] - tl[1] + 4);
        // stones in the wall
        for (let k = 0; k < 26; k++) {
          const x = -R + ((k * 0.61803) % 1) * 2 * R, y = 0.2 + ((k * 0.3819) % 1) * 3.1, p = proj(d, x, y), s = (f * (0.18 + ((k * 0.17) % 0.2))) / d;
          ctx.fillStyle = `rgba(0,0,0,${0.18 * (1 - fog)})`; ctx.beginPath(); ctx.ellipse(p[0], p[1], s * 1.4, s, 0, 0, 7); ctx.fill();
        }
        [['L', -1.45, nextFork.left], ['R', 1.45, nextFork.right]].forEach(([side, x, val]) => {
          const c0 = proj(d, x, 1.1), rw = (f * 1.15) / d, rh = (f * 1.5) / d;
          const mouth = () => { ctx.beginPath(); ctx.ellipse(c0[0], c0[1], rw, rh, 0, Math.PI, 0); ctx.lineTo(c0[0] + rw, c0[1] + rh * 0.75); ctx.lineTo(c0[0] - rw, c0[1] + rh * 0.75); ctx.closePath(); };
          const mg = ctx.createRadialGradient(c0[0], c0[1] + rh * 0.2, 0, c0[0], c0[1], rh * 1.3);
          mg.addColorStop(0, nextFork.choice === side ? '#3a2a10' : '#101010'); mg.addColorStop(1, '#000');
          ctx.fillStyle = mg; mouth(); ctx.fill();
          ctx.strokeStyle = shadeRGB([120, 82, 46], sc); ctx.lineWidth = Math.max(3, (f * 0.22) / d); mouth(); ctx.stroke();
          // little rails disappearing into each tunnel
          ctx.strokeStyle = '#8a9299'; ctx.lineWidth = Math.max(1, (f * 0.04) / d);
          [-1, 1].forEach(o => { ctx.beginPath(); ctx.moveTo(c0[0] + o * rw * 0.4, c0[1] + rh * 0.75); ctx.lineTo(c0[0] + o * rw * 0.12, c0[1] + rh * 0.05); ctx.stroke(); });
          // lantern beside each mouth
          const lp = proj(d, x + (side === 'L' ? -1.2 : 1.2), 2.2), ls = (f * 0.5) / d;
          const lg = ctx.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], ls * 3);
          lg.addColorStop(0, 'rgba(255,200,110,.6)'); lg.addColorStop(1, 'rgba(255,180,80,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lp[0], lp[1], ls * 3, 0, 7); ctx.fill();
          Coaster.emoji(ctx, '🏮', lp[0], lp[1] + ls * 0.4, ls);
          const sp = proj(d, x, 2.85), sw = (f * 1.0) / d, sh2 = (f * 0.62) / d;
          ctx.fillStyle = shadeRGB([110, 76, 44], sc); ctx.fillRect(sp[0] - sw * 0.06, sp[1] - sh2 * 1.4, sw * 0.12, sh2 * 0.5);
          ctx.fillStyle = nextFork.choice === side ? '#ffd23f' : '#fff3e0';
          Coaster.roundRect(ctx, sp[0] - sw, sp[1] - sh2, sw * 2, sh2 * 1.6, sh2 * 0.3); ctx.fill();
          ctx.strokeStyle = '#5d4037'; ctx.lineWidth = Math.max(2, (f * 0.06) / d); ctx.stroke();
          ctx.fillStyle = '#1d3557'; ctx.font = `900 ${Math.max(10, sh2 * 1.1)}px system-ui, sans-serif`; ctx.textAlign = 'center';
          ctx.fillText(String(val), sp[0], sp[1] + sh2 * 0.45);
        });
        ctx.textAlign = 'left';
      }
      // magic sparkles in the air
      ctx.fillStyle = pal.glow;
      for (let k = 0; k < 24; k++) {
        const x = ((k * 173 + st.t * 30) % W), y = ((k * 97 + Math.sin(st.t + k) * 30) % (H * 0.7));
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(st.t * 4 + k); ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const s of st.sparkle) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; Coaster.emoji(ctx, '💎', s.x, s.y, 26); }
      st.sparkle = st.sparkle.filter(s => s.t < 1.2);
      for (const b of st.bats) { b.t += dt; b.r += b.v * dt; Coaster.emoji(ctx, '🦇', cx + Math.cos(b.a) * b.r + Math.sin(st.t * 12 + b.w) * 8, cy + Math.sin(b.a) * b.r * 0.6, 20 + b.r * 0.12); }
      st.bats = st.bats.filter(b => b.t < 2);
      // vignette
      const vg = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      // front of the mine cart and the rider
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath(); ctx.moveTo(W * 0.15, H); ctx.lineTo(W * 0.27, H * 0.82); ctx.lineTo(W * 0.73, H * 0.82); ctx.lineTo(W * 0.85, H); ctx.fill();
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(W * 0.27, H * 0.82, W * 0.46, H * 0.025);
      ctx.fillStyle = '#9e9e9e'; [0.32, 0.5, 0.68].forEach(x => { ctx.beginPath(); ctx.arc(W * x, H * 0.9, H * 0.012, 0, 7); ctx.fill(); });
      ctx.strokeStyle = '#ffd9b0'; ctx.lineWidth = H * 0.035; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(W * 0.3, H); ctx.lineTo(W * 0.36, H * 0.85); ctx.moveTo(W * 0.7, H); ctx.lineTo(W * 0.64, H * 0.85); ctx.stroke();
      Coaster.emoji(ctx, av.animal, W / 2, H * 0.98, H * 0.1);
      // question banner and choice arrows
      if (nextFork && wallD < 75) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,.92)'; Coaster.roundRect(ctx, W / 2 - 230, 70, 460, st.waiting ? 112 : 86, 20); ctx.fill();
        ctx.fillStyle = '#1d3557'; ctx.font = '700 18px system-ui, sans-serif'; ctx.fillText(nextFork.choice ? 'Godt valgt! Af sted!' : 'Tryk i den side, hvor svaret er:', W / 2, 98);
        ctx.font = '900 36px system-ui, sans-serif'; ctx.fillStyle = '#e63946'; ctx.fillText(nextFork.q.text, W / 2, 140);
        if (st.waiting) { ctx.font = '700 16px system-ui, sans-serif'; ctx.fillStyle = '#2a7d4f'; ctx.fillText('Toget venter på dig. Tag dig god tid 🙂', W / 2, 170); }
        ctx.font = '900 60px system-ui, sans-serif';
        ctx.fillStyle = nextFork.choice === 'L' ? '#ffd23f' : 'rgba(255,255,255,.45)'; ctx.fillText('⬅', 60, H * 0.55);
        ctx.fillStyle = nextFork.choice === 'R' ? '#ffd23f' : 'rgba(255,255,255,.45)'; ctx.fillText('➡', W - 60, H * 0.55);
        ctx.textAlign = 'left';
      }
      st.shake = Math.max(0, st.shake - dt);
      floats(ctx, st.fx, dt);
      hud(ctx, view, st.coins, null, st.t < 4 ? 'Tryk i venstre eller højre side for at vælge tunnel' : '');
      if (st.z >= END) { stop(); onEnd({ coins: st.coins, game: 'mine' }); return false; }
    });
    return { st };
  }

  return { bump, boat, drop, mine, stop };
})();
