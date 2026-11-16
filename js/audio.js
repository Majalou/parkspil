const Speech = {
  voices: [],
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices(); if (this.onChange) this.onChange(); };
    load();
    speechSynthesis.onvoiceschanged = load;
  },
  prefs: {},
  listFor(l2) {
    return this.voices.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(l2));
  },
  // Picks the user's chosen voice, otherwise the best-sounding one available
  voice(lang) {
    const l = lang.toLowerCase(), l2 = l.slice(0, 2);
    const list = this.listFor(l2);
    const chosen = this.prefs[l2] && list.find(v => v.voiceURI === this.prefs[l2]);
    if (chosen) return chosen;
    const score = v => {
      const id = v.name + ' ' + v.voiceURI;
      let s = 0;
      if (/natural|neural|premium|enhanced|forbedret/i.test(id)) s += 20;
      if (/online|google|siri/i.test(id)) s += 8;
      if (/compact/i.test(id)) s -= 5;
      if (v.lang.replace('_', '-').toLowerCase() === l) s += 3;
      return s;
    };
    return [...list].sort((a, b) => score(b) - score(a))[0];
  },
  clean(text) {
    return String(text).replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').replace(/×/g, ' gange ').replace(/÷/g, ' delt med ').replace(/−/g, ' minus ').replace(/\+/g, ' plus ');
  },
  utter(text, lang) {
    const u = new SpeechSynthesisUtterance(this.clean(text));
    u.lang = lang;
    const v = this.voice(lang);
    if (v) u.voice = v;
    u.rate = lang.startsWith('en') ? 0.8 : 0.95;
    return u;
  },
  say(text, lang = 'da-DK') {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(this.utter(text, lang));
  },
  queue(text, lang = 'da-DK') {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.speak(this.utter(text, lang));
  },
  // Some browsers drop utterances queued right after cancel(), so chain on onend instead
  sayThen(text, lang, next, nextLang) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = this.utter(text, lang);
    let done = false;
    const go = () => { if (!done) { done = true; speechSynthesis.speak(this.utter(next, nextLang)); } };
    u.onend = go;
    u.onerror = go;
    setTimeout(go, 600 + String(text).length * 90);
    speechSynthesis.speak(u);
  },
  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
};

const Listen = {
  supported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
  start(lang, onResult, onFail) {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    let done = false;
    try {
      const r = new R();
      r.lang = lang;
      r.interimResults = false;
      r.maxAlternatives = 5;
      r.onresult = e => {
        if (done) return;
        done = true;
        onResult([...e.results[0]].map(a => a.transcript));
      };
      r.onerror = () => { if (!done) { done = true; onFail(); } };
      r.onend = () => { if (!done) { done = true; onFail(); } };
      r.start();
    } catch (e) {
      if (!done) { done = true; onFail(); }
    }
  },
  matches(alts, target) {
    const norm = s => s.toLowerCase()
      .replace(/\b(10|[1-9])\b/g, d => EN_NUMBERS[+d - 1])
      .replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
    const want = norm(target);
    return alts.some(alt => {
      const got = norm(alt);
      const hits = want.filter(w => got.includes(w)).length;
      return hits >= Math.ceil(want.length * 0.6);
    });
  },
};

const Sfx = {
  ctx: null,
  get() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type = 'sine', vol = 0.15, delay = 0) {
    const c = this.get();
    if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    const t = c.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  noise(dur, vol, freq = 1200, q = 0.7, delay = 0) {
    const c = this.get();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start(c.currentTime + delay);
  },
  click() { this.tone(560, 0.06, 'square', 0.04); },
  good() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.14, i * 0.08)); },
  bad() { this.tone(230, 0.22, 'sawtooth', 0.06); this.tone(180, 0.28, 'sawtooth', 0.06, 0.1); },
  magic() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.1, i * 0.07)); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.15, i * 0.15)); },
  whoosh() { this.noise(0.35, 0.5, 900, 1.5); },
  hit() { this.tone(110, 0.25, 'square', 0.12); this.noise(0.15, 0.6, 400); },
  whistle() { this.tone(2100, 0.5, 'sine', 0.08); this.tone(2150, 0.5, 'sine', 0.05); },
  cheer() { this.noise(1.6, 1.2, 1500, 0.4); this.noise(1.2, 0.8, 2500, 0.6, 0.2); this.good(); },
  groan() { this.noise(0.8, 0.6, 500, 0.5); },
};

// Ride music generated with WebAudio (works offline). One style per coaster theme.
const Music = {
  enabled: true, timer: 0, out: null, st: null, nbuf: null,
  STYLES: {
    glad: { bpm: 138, scale: [0, 2, 4, 5, 7, 9, 11], root: 60, prog: [0, 4, 5, 3, 0, 3, 4, 0], lead: 'square', pad: 'triangle' },
    eventyr: { bpm: 120, scale: [0, 2, 3, 5, 7, 9, 10], root: 57, prog: [0, 6, 3, 0, 0, 6, 4, 0], lead: 'triangle', pad: 'sawtooth' },
    pirat: { bpm: 150, scale: [0, 2, 3, 5, 7, 8, 10], root: 57, prog: [0, 5, 6, 4, 0, 3, 4, 0], lead: 'square', pad: 'triangle' },
    gys: { bpm: 112, scale: [0, 2, 3, 5, 7, 8, 11], root: 55, prog: [0, 5, 3, 4, 0, 5, 1, 4], lead: 'sawtooth', pad: 'triangle' },
    rum: { bpm: 128, scale: [0, 2, 4, 6, 7, 9, 11], root: 62, prog: [0, 1, 5, 4, 0, 1, 3, 4], lead: 'sine', pad: 'triangle' },
  },
  // Scale steps above the chord root per 16th note; null = rest
  MEL: [
    [0, null, 2, null, 4, null, 2, 4, 7, null, 4, null, 2, null, null, null],
    [4, null, 4, 5, 4, null, 2, null, 0, null, 2, null, 4, null, null, null],
    [7, null, 6, null, 4, null, 2, null, 4, 5, 4, 2, 0, null, null, null],
    [2, null, 4, null, 7, null, 9, null, 7, null, 4, null, 2, null, 0, null],
  ],
  forTheme(t) {
    return { gys: 'gys', flagermus: 'gys', ild: 'gys', viking: 'eventyr', drage: 'eventyr', valkyrie: 'eventyr', trae: 'eventyr', pirat: 'pirat', midgard: 'pirat', rummet: 'rum', lyn: 'rum', storm: 'rum' }[t] || 'glad';
  },
  midi(st, deg, oct) {
    const n = st.scale.length, o = Math.floor(deg / n);
    return st.root + (oct + o) * 12 + st.scale[((deg % n) + n) % n];
  },
  start(style) {
    this.stop();
    if (!this.enabled) return;
    const c = Sfx.get();
    if (!c) return;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, c.currentTime);
    out.gain.exponentialRampToValueAtTime(0.7, c.currentTime + 1.5);
    out.connect(c.destination);
    this.out = out;
    this.st = { ...(this.STYLES[style] || this.STYLES.glad), step: 0, next: c.currentTime + 0.15 };
    this.timer = setInterval(() => this.tick(), 60);
  },
  stop() {
    clearInterval(this.timer);
    this.timer = 0;
    this.st = null;
    const out = this.out, c = Sfx.ctx;
    this.out = null;
    if (!out || !c) return;
    out.gain.cancelScheduledValues(c.currentTime);
    out.gain.setValueAtTime(out.gain.value, c.currentTime);
    out.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
    setTimeout(() => out.disconnect(), 500);
  },
  tick() {
    const c = Sfx.ctx, st = this.st;
    if (!c || !st) return;
    if (document.hidden) { st.next = c.currentTime + 0.1; return; }
    const dt = 60 / st.bpm / 4;
    if (st.next < c.currentTime) st.next = c.currentTime + 0.02;
    while (st.next < c.currentTime + 0.2) {
      this.play(st, st.step, st.next, dt);
      st.next += dt;
      st.step++;
    }
  },
  voice(type, m, t, dur, vol) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(440 * Math.pow(2, (m - 69) / 12), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  kick(t) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.2);
  },
  drum(t, f, dur, vol, type) {
    const c = Sfx.ctx;
    if (!this.nbuf) {
      const len = Math.floor(c.sampleRate * 0.3);
      this.nbuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.nbuf;
    fl.type = type;
    fl.frequency.value = f;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(this.out);
    src.start(t);
    src.stop(t + dur + 0.02);
  },
  play(st, step, t, dt) {
    const s = step % 16, bar = Math.floor(step / 16), chord = st.prog[bar % st.prog.length];
    if (s % 8 === 0) this.voice('triangle', this.midi(st, chord, -2), t, dt * 3, 0.2);
    if (s % 8 === 4) this.voice('triangle', this.midi(st, chord + 4, -2), t, dt * 2, 0.14);
    if (s % 4 === 2) [0, 2, 4].forEach(k => this.voice(st.pad, this.midi(st, chord + k, 0), t, dt * 1.5, 0.02));
    const m = this.MEL[(bar % 8 < 4 ? 0 : 2) + (bar % 2)][s];
    if (m !== null) this.voice(st.lead, this.midi(st, chord + m, 1), t, dt * 1.8, st.lead === 'sine' ? 0.09 : 0.04);
    if (s % 8 === 0) this.kick(t);
    if (s % 8 === 4) this.drum(t, 1800, 0.09, 0.22, 'bandpass');
    if (s % 2 === 0) this.drum(t, 7000, 0.03, 0.05, 'highpass');
  },
};
