// Banebyggeren: design your own roller coaster
const Designer = (() => {
  const MAX_PIECES = 40, MAX_H = 45;
  let tab = 'track', propSel = null, propSide = 1, propCat = 'figur', selK = null;

  const has = (p, kind, id, cost) => !cost || p.own.has.includes(`${kind}:${id}`);
  function buy(p, kind, id, cost, name, then) {
    const ui = App.ui;
    if (p.money < cost) { ui.say(`${name} koster ${cost} kroner. Du har ${p.money} kroner. Du mangler ${cost - p.money} kroner.`); ui.toast(`Du mangler ${cost - p.money} kr`); return; }
    const m = ui.modal(`<h2>Køb ${ui.esc(name)}?</h2><div class="big-eq">${p.money} − ${cost} = ${p.money - cost}</div><p>Så kan du bruge det i alle dine baner.</p>
      <div class="end-actions"><button class="btn ghost" data-close>Nej tak</button><button class="btn gold big" id="ok">Køb for ${cost} kr</button></div>`);
    ui.say(`${name} koster ${cost} kroner. Du har ${p.money} kroner.`);
    m.el.querySelector('#ok').onclick = () => {
      p.money -= cost;
      p.own.has.push(`${kind}:${id}`);
      ui.save();
      m.el.remove();
      Sfx.magic();
      ui.toast(`🔓 ${ui.esc(name)} er låst op!`);
      then();
    };
  }

  // What the train can't handle: under ground, too high, or too slow to get over.
  function problem(pieces) {
    if (!pieces.length) return null;
    const pts = Track3D.buildPath(pieces);
    const last = pieces.length - 1;
    const low = pts.find(q => q.k >= 0 && q.p[1] < 0.3);
    if (low) return { k: low.k, kind: 'low', msg: 'Banen kommer under jorden' };
    const high = pts.find(q => q.k >= 0 && q.p[1] > MAX_H + 2);
    if (high) return { k: high.k, kind: 'high', msg: 'Banen bliver for høj' };
    const sim = Track3D.simulate(pts);
    if (!sim.ok) return { k: sim.fail < 0 ? last : sim.fail, kind: 'slow', msg: 'Toget kan ikke komme over' };
    return null;
  }
  const costOf = pieces => pieces.reduce((a, pc) => a + PIECES[Track3D.norm(pc).t].cost, 0);

  // Tries small repairs at the problem spot and keeps the one that gets the train furthest.
  function autoFix(pieces0, can, allowInsert) {
    let pieces = pieces0.slice();
    const ops = [];
    for (let it = 0; it < 40; it++) {
      const pr = problem(pieces);
      if (!pr) return { pieces, ops, ok: true };
      const k = pr.k, t = Track3D.norm(pieces[k]).t, left = pieces.length - k;
      const cands = [];
      const ins = nt => { if (allowInsert && pieces.length < MAX_PIECES && can(nt)) cands.push({ p: [...pieces.slice(0, k), nt, ...pieces.slice(k)], op: { ins: k } }); };
      const rep = nt => { if (nt !== t && can(nt)) cands.push({ p: pieces.map((x, i) => (i === k ? nt : x)), op: { rep: k } }); };
      if (pr.kind === 'slow') { ins('chain'); ins('booster'); if (['up', 'loop', 'twist', 'brake', 'splash'].includes(t)) rep('straight'); }
      if (pr.kind === 'low') { if (t === 'bigdrop') rep('down'); if (t === 'down' || t === 'splash') rep('straight'); ins('up'); }
      if (pr.kind === 'high') { if (['up', 'chain'].includes(t)) rep('straight'); ins('down'); }
      cands.push({ p: pieces.filter((_, i) => i !== k), op: { rem: k } });
      let best = null, bestLeft = left;
      for (const c of cands) {
        const pr2 = problem(c.p), l2 = pr2 ? c.p.length - pr2.k : -1;
        if (l2 < bestLeft) { best = c; bestLeft = l2; }
      }
      if (!best) best = cands[cands.length - 1];
      pieces = best.p;
      ops.push(best.op);
    }
    return { pieces, ops, ok: !problem(pieces) };
  }
  // Keep decorations on the same piece after inserts/removals; returns refunded money
  function remapProps(c, ops) {
    let refund = 0;
    ops.forEach(op => {
      if (op.ins !== undefined) c.props.forEach(x => { if (x.at >= op.ins) x.at++; });
      if (op.rem !== undefined) {
        c.props = c.props.filter(x => { if (x.at === op.rem) { refund += propById(x.id).cost; return false; } return true; });
        c.props.forEach(x => { if (x.at > op.rem) x.at--; });
      }
    });
    return refund;
  }

  function open(coasterId) {
    const ui = App.ui, p = ui.cur(), c = p.own.coasters.find(x => x.id === coasterId);
    if (!c) { ui.screenPark(); return; }
    const S = Track3D.stats(c);
    const esc = ui.esc;
    if (selK !== null && selK >= c.pieces.length) selK = null;
    const pr = problem(c.pieces);
    const bar = (label, v, col) => `<div class="rate"><span>${label}</span><div class="rate-bar"><i style="width:${v}%;background:${col}"></i></div><b>${v}</b></div>`;
    const prName = pr ? (PIECES[Track3D.norm(c.pieces[pr.k]).t] || {}).name : '';
    const check = !pr
      ? `<div class="check ok">✅ Toget kan køre hele banen!</div>`
      : `<div class="check bad">⚠️ ${pr.msg} ved stykke nr. ${pr.k + 1} (${esc(prName || '')}). Du kan ikke bygge videre, før det er fikset.
          <div class="end-actions"><button class="btn gold" id="fix">🔧 Lad maskinen fikse banen</button></div></div>`;
    const strip = c.pieces.map((pc, k) => {
      const P = PIECES[Track3D.norm(pc).t];
      const nProps = (c.props || []).filter(x => x.at === k).length;
      return `<button class="piece-tile ${pr && pr.k === k ? 'bad' : ''} ${selK === k ? 'sel' : ''}" data-k="${k}" title="${esc(P.name)}">${P.icon}<small>${k + 1}</small>${nProps ? `<i class="pp-dot">${nProps}</i>` : ''}</button>`;
    }).join('') || '<p class="hint-s">Tilføj skinner nedenfor ⬇️</p>';
    const selBar = selK !== null && !(tab === 'props' && propSel) ? `<div class="sel-bar"><b>${PIECES[Track3D.norm(c.pieces[selK]).t].icon} Nr. ${selK + 1}</b>
        <button class="btn small" id="mvL" ${selK === 0 ? 'disabled' : ''}>⬅️ Flyt</button><button class="btn small" id="mvR" ${selK === c.pieces.length - 1 ? 'disabled' : ''}>Flyt ➡️</button>
        <button class="btn small" id="del">🗑️ Fjern</button><button class="btn small ghost" id="unsel">✖</button></div>
        <p class="hint-s">Nye skinner sættes ind lige efter nr. ${selK + 1}.</p>` : '';
    const swatches = (key, sel, list) => list.map(col => `<button class="sw-btn ${sel === col ? 'sel' : ''}" data-${key}="${col}" style="background:${col}"></button>`).join('');
    const shopBtn = (kind, id, o, sel) => {
      const ok = has(p, kind, id, o.cost);
      return `<button class="shop-btn ${sel ? 'sel' : ''} ${ok ? '' : 'locked'}" data-kind="${kind}" data-id="${id}"><span class="sb-i">${o.icon}</span><span>${esc(o.name)}</span>${ok ? '' : `<b>🔒 ${o.cost} kr</b>`}</button>`;
    };
    const tabs = [['track', '🛤️ Skinner'], ['theme', '🎨 Tema'], ['car', '🚃 Vogne'], ['station', '🏠 Station'], ['props', '🎭 Pynt']];
    let body = '';
    if (tab === 'track') {
      body = `<div class="pal">${Object.entries(PIECES).map(([id, P]) => {
        const ok = has(p, 'piece', id, P.unlock);
        return `<button class="pal-btn ${ok ? '' : 'locked'}" data-piece="${id}"><span class="sb-i">${P.icon}</span><span>${esc(P.name)}</span><b>${ok ? `${P.cost} kr` : `🔒 ${P.unlock} kr`}</b></button>`;
      }).join('')}</div>
      <div class="end-actions"><button class="btn" id="undo">↩️ Fjern sidste</button><button class="btn ghost" id="clear">🧹 Start forfra</button></div>
      <p class="hint-s">Tryk på et stykke i båndet for at flytte eller fjerne det. Du får pengene tilbage, når du fjerner.</p>`;
    } else if (tab === 'theme') {
      body = `<h4>Tema</h4><div class="shop-grid">${Object.entries(THEMES).map(([id, o]) => shopBtn('theme', id, o, c.theme === id)).join('')}</div>
        <h4>Skinnernes farve</h4><div class="sw-row">${swatches('track', c.track, OWN_COLORS)}</div>
        <h4>Søjlernes farve</h4><div class="sw-row"><button class="sw-btn auto ${!c.support ? 'sel' : ''}" data-support="">Auto</button>${swatches('support', c.support, OWN_COLORS)}</div>`;
    } else if (tab === 'car') {
      const fronts = ['', ...PROPS.filter(x => x.cat === 'figur' && x.e).map(x => x.e), '⭐', '🔥', '❤️'];
      body = `<h4>Vognenes form</h4><div class="shop-grid">${Object.entries(CAR_SHAPES).map(([id, o]) => shopBtn('shape', id, o, c.car.shape === id)).join('')}</div>
        <h4>Farve</h4><div class="sw-row">${swatches('carcol', c.car.color, OWN_COLORS)}</div>
        <h4>Antal vogne</h4><div class="sw-row">${[1, 2, 3, 4, 5].map(n => `<button class="opt-btn ${c.car.n === n ? 'sel' : ''}" data-ncar="${n}">${n}</button>`).join('')}</div>
        <h4>Figur forrest</h4><div class="sw-row">${fronts.map(e => `<button class="opt-btn ${c.car.front === e ? 'sel' : ''}" data-front="${e}">${e || 'Ingen'}</button>`).join('')}</div>`;
    } else if (tab === 'station') {
      body = `<h4>Stationen</h4><div class="shop-grid">${Object.entries(STATIONS).map(([id, o]) => shopBtn('station', id, o, c.station === id)).join('')}</div>
        <h4>Køen</h4><div class="shop-grid">${Object.entries(QUEUES).map(([id, o]) => shopBtn('queue', id, o, c.queue === id)).join('')}</div>`;
    } else {
      const packLocked = PACKS[propCat] && !packOwned(p, propCat);
      body = `<div class="cat-row">${PROP_TABS.map(([id, n]) => `<button class="opt-btn ${propCat === id ? 'sel' : ''}" data-pcat="${id}">${packOwned(p, id) ? '' : '🔒 '}${n}</button>`).join('')}</div>
        ${packLocked ? packCard(propCat) : `<div class="shop-grid">${PROPS.filter(x => x.cat === propCat).map(x => `<button class="shop-btn prop-btn ${propSel === x.id ? 'sel' : ''}" data-prop="${x.id}"><svg viewBox="-32 -64 64 66" class="prop-ico">${IsoPark.propSvg(x, 0, 0, 60)}</svg><span>${esc(x.name)}</span><b>${x.cost} kr</b></button>`).join('')}</div>
        <div class="sw-row"><span>Side:</span><button class="opt-btn ${propSide === 1 ? 'sel' : ''}" data-side="1">➡️ Højre</button><button class="opt-btn ${propSide === -1 ? 'sel' : ''}" data-side="-1">⬅️ Venstre</button></div>
        <p class="hint-s">${propSel ? `Tryk nu på et stykke skinne i båndet for at sætte ${esc(propById(propSel).name)} der.` : 'Vælg en ting, og tryk så på et stykke skinne i båndet.'}</p>`}
        ${(c.props || []).length ? `<h4>På banen (${c.props.length})</h4><div class="sw-row">${c.props.map((x, n) => `<button class="opt-btn" data-delprop="${n}">${propById(x.id).e || '⭐'} ${esc(propById(x.id).name)} ✕</button>`).join('')}</div>` : ''}`;
    }
    ui.show(`
      <header class="lesson-top" style="--cc:${c.track || '#e63946'}">
        <button class="btn small" id="back">⬅ Parken</button>
        <div class="lt-name">🛠️ <input id="cname" class="cname" maxlength="18" value="${esc(c.name)}"></div>
        <div class="lt-pts">💰 ${p.money} kr</div>
      </header>
      <div class="designer">
        <div class="d-left">
          <div class="d-preview">${IsoPark.preview(c)}</div>
          <div class="strip" id="strip">${strip}</div>
          ${selBar}
          ${check}
          <div class="d-stats">
            <span>📏 ${S.length} m</span><span>⛰️ ${S.maxH} m</span><span>💨 ${S.maxKmh} km/t</span><span>🧩 ${c.pieces.length}/${MAX_PIECES}</span><span>⭐ ${'★'.repeat(S.stars)}<i class="dim">${'★'.repeat(5 - S.stars)}</i></span>
          </div>
          ${bar('🎢 Spænding', S.spaend, '#ff5a5f')}${bar('😱 Vildhed', S.vild, '#8338ec')}${bar('🌷 Hygge', S.hygge, '#0ead69')}
          <div class="end-actions"><button class="btn gold big" id="test" ${!pr && c.pieces.length ? '' : 'disabled'}>🎢 Prøvetur i 3D</button></div>
        </div>
        <div class="d-right">
          <div class="d-tabs">${tabs.map(([id, n]) => `<button class="d-tab ${tab === id ? 'sel' : ''}" data-tab="${id}">${n}</button>`).join('')}</div>
          <div class="d-body">${body}</div>
        </div>
      </div>`, 'designer-screen');
    const $ = s => document.querySelector('#app ' + s), $$ = s => [...document.querySelectorAll('#app ' + s)];
    const redraw = () => { ui.save(); open(c.id); };
    // Any edit: if it creates a new problem, warn right away
    const change = fn => {
      const before = problem(c.pieces);
      fn();
      redraw();
      const now = problem(c.pieces);
      if (now && (!before || before.k !== now.k || before.kind !== now.kind)) warn(now);
    };
    const warn = now => {
      Sfx.bad();
      const m = ui.modal(`<div class="m-big">⚠️</div><h2>Det kan toget ikke klare!</h2><p>${now.msg} ved stykke nr. ${now.k + 1}.</p><p>Du kan ikke bygge videre, før banen er fikset.</p>
        <div class="end-actions"><button class="btn ghost" data-close>Jeg fikser selv</button><button class="btn gold big" id="wfix">🔧 Lad maskinen fikse</button></div>`);
      ui.say(`${now.msg}. Du kan selv rette det, eller lade maskinen fikse banen.`);
      m.el.querySelector('#wfix').onclick = () => { m.el.remove(); runFix(); };
    };
    const can = t => has(p, 'piece', t, PIECES[t].unlock);
    function runFix() {
      let res = autoFix(c.pieces, can, true);
      let delta = costOf(res.pieces) - costOf(c.pieces);
      if (delta > p.money) { res = autoFix(c.pieces, can, false); delta = costOf(res.pieces) - costOf(c.pieces); }
      if (!res.ok) { ui.toast('Maskinen kunne ikke fikse banen'); ui.say('Maskinen kunne ikke fikse banen. Prøv at fjerne nogle stykker.'); return; }
      const added = res.pieces.length - c.pieces.length;
      const go = () => {
        c.props = c.props || [];
        const refund = remapProps(c, res.ops);
        c.pieces = res.pieces;
        p.money += refund - delta;
        selK = null;
        Sfx.magic();
        ui.toast('🔧 Banen er fikset!');
        ui.say(`Maskinen har fikset banen. ${res.ops.length === 1 ? 'Den lavede én ændring.' : `Den lavede ${res.ops.length} ændringer.`}`);
        redraw();
      };
      if (delta <= 0) { go(); return; }
      const m = ui.modal(`<div class="m-big">🔧</div><h2>Maskinen kan fikse banen</h2><p>Den ${added > 0 ? `sætter ${added} ekstra stykke${added === 1 ? '' : 'r'} ind` : 'ændrer nogle stykker'}. Det koster ${delta} kr.</p>
        <div class="big-eq">${p.money} − ${delta} = ${p.money - delta}</div>
        <div class="end-actions"><button class="btn ghost" data-close>Nej tak</button><button class="btn gold big" id="fok">Fiks for ${delta} kr</button></div>`);
      ui.say(`Det koster ${delta} kroner at fikse banen. Du har ${p.money} kroner.`);
      m.el.querySelector('#fok').onclick = () => { m.el.remove(); go(); };
    }
    if ($('#fix')) $('#fix').onclick = runFix;
    if ($('#mvL')) {
      const swap = d => change(() => {
        const a = selK, b = selK + d;
        [c.pieces[a], c.pieces[b]] = [c.pieces[b], c.pieces[a]];
        (c.props || []).forEach(x => { if (x.at === a) x.at = b; else if (x.at === b) x.at = a; });
        selK = b;
        Sfx.click();
      });
      $('#mvL').onclick = () => swap(-1);
      $('#mvR').onclick = () => swap(1);
      $('#del').onclick = () => change(() => {
        const k = selK, pc = Track3D.norm(c.pieces[k]);
        c.props = c.props || [];
        p.money += PIECES[pc.t].cost + remapProps(c, [{ rem: k }]);
        c.pieces.splice(k, 1);
        selK = c.pieces.length ? Math.min(k, c.pieces.length - 1) : null;
        Sfx.click();
      });
      $('#unsel').onclick = () => { selK = null; open(c.id); };
    }
    $('#back').onclick = () => ui.screenPark();
    $('#cname').onchange = e => { c.name = e.target.value.trim().slice(0, 18) || 'Min rutsjebane'; ui.save(); };
    $('#test').onclick = () => testRide(c);
    $$('.d-tab').forEach(b => { b.onclick = () => { tab = b.dataset.tab; propSel = null; Sfx.click(); open(c.id); }; });
    $$('.piece-tile').forEach(b => {
      b.onclick = () => {
        const k = +b.dataset.k;
        if (tab === 'props' && propSel) {
          const pr = propById(propSel);
          if (p.money < pr.cost) { ui.toast(`Du mangler ${pr.cost - p.money} kr`); ui.say(`Du mangler ${pr.cost - p.money} kroner.`); return; }
          p.money -= pr.cost;
          c.props = c.props || [];
          c.props.push({ id: propSel, at: k, side: propSide });
          Sfx.good();
          ui.say(`${pr.name}. Det kostede ${pr.cost} kroner.`);
          redraw();
          return;
        }
        selK = selK === k ? null : k;
        Sfx.click();
        open(c.id);
      };
    });
    if (tab === 'track') {
      $$('.pal-btn').forEach(b => {
        b.onclick = () => {
          const id = b.dataset.piece, P = PIECES[id];
          if (!has(p, 'piece', id, P.unlock)) { buy(p, 'piece', id, P.unlock, P.name, () => open(c.id)); return; }
          if (pr) { ui.toast('Fiks banen først!'); ui.say('Du skal fikse banen, før du kan bygge videre.'); Sfx.bad(); warn(pr); return; }
          if (c.pieces.length >= MAX_PIECES) { ui.toast('Banen er fuld!'); return; }
          if (p.money < P.cost) { ui.toast(`Du mangler ${P.cost - p.money} kr`); ui.say(`${P.name} koster ${P.cost} kroner. Tjen flere penge i boderne.`); return; }
          const at = selK === null ? c.pieces.length : selK + 1;
          const pts = Track3D.buildPath(c.pieces.slice(0, at)), h = pts[pts.length - 1].p[1];
          if ((P.dh || 0) < 0 && h + P.dh < 0.5) { ui.toast('For lavt! Byg en bakke op først.'); ui.say('Banen er for lav. Byg en bakke op eller et kædeløft først.'); Sfx.bad(); return; }
          if ((P.dh || 0) > 0 && h + P.dh > MAX_H) { ui.toast('For højt! Byg en bakke ned først.'); Sfx.bad(); return; }
          if (id === 'loop' && h + 12 > MAX_H) { ui.toast('Der er ikke plads til et loop her.'); return; }
          change(() => {
            c.pieces.splice(at, 0, id);
            c.props = c.props || [];
            if (at < c.pieces.length - 1) remapProps(c, [{ ins: at }]);
            if (selK !== null) selK = at;
            p.money -= P.cost;
            Sfx.click();
            ui.say(P.name);
          });
        };
      });
      $('#undo').onclick = () => change(() => {
        const k = c.pieces.length - 1;
        if (k < 0) return;
        c.props = c.props || [];
        p.money += PIECES[Track3D.norm(c.pieces[k]).t].cost + remapProps(c, [{ rem: k }]);
        c.pieces.pop();
        selK = null;
      });
      $('#clear').onclick = () => {
        if (!c.pieces.length || !confirm('Vil du fjerne alle skinner? Du får pengene tilbage.')) return;
        c.pieces.forEach(pc => { p.money += PIECES[Track3D.norm(pc).t].cost; });
        (c.props || []).forEach(x => { p.money += propById(x.id).cost; });
        c.pieces = []; c.props = [];
        redraw();
      };
    }
    $$('.shop-btn[data-kind]').forEach(b => {
      b.onclick = () => {
        const kind = b.dataset.kind, id = b.dataset.id;
        const list = { theme: THEMES, shape: CAR_SHAPES, station: STATIONS, queue: QUEUES }[kind], o = list[id];
        const apply = () => {
          if (kind === 'theme') { c.theme = id; c.track = THEMES[id].track; c.support = null; }
          if (kind === 'shape') c.car.shape = id;
          if (kind === 'station') c.station = id;
          if (kind === 'queue') c.queue = id;
          Sfx.click();
          redraw();
        };
        if (!has(p, kind, id, o.cost)) buy(p, kind, id, o.cost, o.name, apply); else apply();
      };
    });
    $$('[data-track]').forEach(b => { b.onclick = () => { c.track = b.dataset.track; redraw(); }; });
    $$('[data-support]').forEach(b => { b.onclick = () => { c.support = b.dataset.support || null; redraw(); }; });
    $$('[data-carcol]').forEach(b => { b.onclick = () => { c.car.color = b.dataset.carcol; redraw(); }; });
    $$('[data-ncar]').forEach(b => { b.onclick = () => { c.car.n = +b.dataset.ncar; redraw(); }; });
    $$('[data-front]').forEach(b => { b.onclick = () => { c.car.front = b.dataset.front; redraw(); }; });
    $$('[data-pcat]').forEach(b => { b.onclick = () => { propCat = b.dataset.pcat; propSel = null; open(c.id); }; });
    $$('[data-buypack]').forEach(b => { b.onclick = () => buyPack(p, b.dataset.buypack, () => open(c.id)); });
    $$('[data-prop]').forEach(b => { b.onclick = () => { propSel = propSel === b.dataset.prop ? null : b.dataset.prop; Sfx.click(); open(c.id); }; });
    $$('[data-side]').forEach(b => { b.onclick = () => { propSide = +b.dataset.side; open(c.id); }; });
    $$('[data-delprop]').forEach(b => {
      b.onclick = () => {
        const n = +b.dataset.delprop, x = c.props[n];
        p.money += propById(x.id).cost;
        c.props.splice(n, 1);
        redraw();
      };
    });
  }

  function testRide(c) {
    const ui = App.ui, p = ui.cur();
    ui.show('<div class="coaster-root" id="croot"></div><button class="btn small c-exit" id="cexit">✕</button>', 'coaster');
    document.querySelector('#cexit').onclick = () => open(c.id);
    Speech.say(`Prøvetur på ${c.name}. Hold fingeren for at løfte armene.`);
    window.__ride3d = Track3D.start(document.querySelector('#croot'), c, p.avatar, p.year, () => {
      ui.toast('🎢 Prøveturen er slut!');
      open(c.id);
    });
  }

  function newCoaster(p, lot) {
    const c = {
      id: 'c' + Date.now().toString(36), lot, name: `Bane ${p.own.coasters.length + 1}`,
      pieces: ['chain', 'down'], theme: 'klassisk', track: THEMES.klassisk.track, support: null,
      car: { shape: 'klassisk', color: '#3a86ff', n: 3, front: '' }, station: 'hytte', queue: 'lige', props: [],
    };
    p.own.coasters.push(c);
    return c;
  }

  // Shop card for a theme pack that isn't bought yet
  function packCard(id) {
    const k = PACKS[id], esc = App.ui.esc;
    return `<div class="pack-card"><div class="pack-ico">${k.icon}</div><h3>Temapakke: ${esc(k.name)}</h3><p>${esc(k.desc)}</p>
      <div class="pack-prev">${PROPS.filter(x => x.pack === id).map(x => `<svg viewBox="-32 -64 64 66" class="prop-ico"><title>${esc(x.name)}</title>${IsoPark.propSvg(x, 0, 0, 60)}</svg>`).join('')}</div>
      <button class="btn gold big" data-buypack="${id}">🔓 Køb pakken for ${k.cost} kr</button><p class="hint-s">Når pakken er købt, kan du sætte tingene både ved banerne og i parken.</p></div>`;
  }
  const buyPack = (p, id, then) => buy(p, 'pack', id, PACKS[id].cost, `Temapakken ${PACKS[id].name}`, then);

  return { open, newCoaster, testRide, packCard, buyPack, setTab: t => { tab = t; } };
})();
