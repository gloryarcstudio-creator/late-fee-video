// Late Fee Video — audio. One Web Audio graph, one mute gate, scene music with crossfade, stingers duck the music.
// Assets: assets/audio/<name>.mp3 described by assets/audio/audio.json (kind, vol, dur, loop). Every call is a no-op
// until unlock() runs inside a user gesture (iOS); nothing plays while muted or in fast (QA) mode.
window.AUDIO = (function () {
  const BASE = 'assets/audio/';
  const FADE = 0.8;      // music crossfade, seconds
  const DUCK = 0.3;      // music level under a stinger
  let ctx = null, master = null, musicBus = null, sfxBus = null;
  let manifest = {}, buffers = {}, loading = {};
  let muted = false, unlocked = false, ready = false;
  let music = null;      // { name, src, gain }
  let duckUntil = 0, duckTimer = 0;
  const loops = {};      // name -> { src, gain } for sfx loops (reel_loop, antic_loop, count_loop)

  try { muted = localStorage.getItem('lfv_muted') === '1'; } catch (e) {}

  function graph() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    return ctx;
  }

  // ---------- loading ----------
  async function init() {
    try { manifest = await (await fetch(BASE + 'audio.json')).json(); } catch (e) { manifest = {}; }
    ready = true;
  }
  function load(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    if (!graph() || !manifest[name]) return Promise.resolve(null);
    loading[name] = fetch(BASE + name + '.mp3').then(r => r.arrayBuffer())
      .then(ab => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }))
      .then(buf => { buffers[name] = buf; return buf; })
      .catch(() => null).finally(() => { delete loading[name]; });
    return loading[name];
  }
  function preload(names) { return Promise.all((names || Object.keys(manifest)).map(load)); }
  // loops were rendered as loop + 1 s tail; skip decoder padding by starting at the first audible sample
  function loopRange(name, buf) {
    const m = manifest[name]; if (!m || !m.loop) return null;
    if (m._start === undefined) {
      const d = buf.getChannelData(0); let i = 0; while (i < d.length && Math.abs(d[i]) < 0.002) i++;
      m._start = Math.min(i, Math.max(0, buf.length - m.loop * buf.sampleRate - 1)) / buf.sampleRate;
    }
    return [m._start, m._start + m.loop];
  }

  // ---------- gate ----------
  function unlock() {
    if (!graph()) return;
    unlocked = true;
    if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
  }
  function setMuted(on) {
    muted = !!on;
    try { localStorage.setItem('lfv_muted', muted ? '1' : '0'); } catch (e) {}
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }
  const can = () => ctx && unlocked && !muted && !window.__fast && document.visibilityState !== 'hidden';

  // ---------- players ----------
  function voice(name, bus, loop) {
    const buf = buffers[name]; if (!buf) { load(name); return null; }
    const m = manifest[name] || {};
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = m.vol == null ? 0.6 : m.vol;
    if (loop) { const r = loopRange(name, buf); src.loop = true; if (r) { src.loopStart = r[0]; src.loopEnd = r[1]; } }
    src.connect(g).connect(bus);
    return { name, src, gain: g, vol: g.gain.value };
  }
  function sfx(name) {
    if (!can()) return;
    const v = voice(name, sfxBus, false); if (!v) return;
    v.src.start();
  }
  // sfx loop: start once, stop(name) fades it out over 60 ms
  function loop(name) {
    if (!can() || loops[name]) return;
    const v = voice(name, sfxBus, true); if (!v) return;
    loops[name] = v; v.src.start();
  }
  function stop(name, fade = 0.06) {
    const v = loops[name]; if (!v) return; delete loops[name];
    const t = ctx.currentTime; v.gain.gain.setValueAtTime(v.gain.gain.value, t); v.gain.gain.linearRampToValueAtTime(0, t + fade);
    try { v.src.stop(t + fade + 0.01); } catch (e) {}
  }
  function stopLoops() { Object.keys(loops).forEach(n => stop(n)); }
  // scene music: crossfade to `name` (null = fade out). Restarts only when the track changes.
  function setMusic(name) {
    if (!ctx || !unlocked) { music = name ? { name, pending: true } : null; return; }
    if (music && music.name === name && !music.pending) return;
    const t = ctx.currentTime;
    if (music && music.src) {
      const old = music; old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + FADE); try { old.src.stop(t + FADE + 0.05); } catch (e) {}
    }
    music = name ? { name, pending: true } : null;
    if (!name) return;
    load(name).then(buf => {
      if (!buf || !music || music.name !== name || !music.pending) return;
      const v = voice(name, musicBus, true); if (!v) return;
      const t1 = ctx.currentTime, ducked = t1 < duckUntil;
      v.gain.gain.setValueAtTime(0, t1); v.gain.gain.linearRampToValueAtTime(v.vol * (ducked ? DUCK : 1), t1 + FADE);
      v.src.start(); music = v;
    });
  }
  function duck(sec) {
    if (!ctx || !music || !music.gain) return;
    const t = ctx.currentTime, g = music.gain.gain;
    duckUntil = Math.max(duckUntil, t + sec);
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(music.vol * DUCK, t + 0.12);
    clearTimeout(duckTimer);
    duckTimer = setTimeout(() => { if (!music || !music.gain) return; const t2 = ctx.currentTime; g.cancelScheduledValues(t2); g.setValueAtTime(g.value, t2); g.linearRampToValueAtTime(music.vol, t2 + 0.6); }, (duckUntil - t) * 1000);
  }
  // stinger: one-shot that ducks the music for its length
  function stinger(name) {
    if (!can()) return;
    const m = manifest[name]; sfx(name); if (m) duck(m.dur);
  }

  // music follows muting only; pause when the tab is hidden so a background tab stays silent and cheap
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !unlocked) return;
    if (document.visibilityState === 'hidden') { stopLoops(); ctx.suspend().catch(() => {}); }
    else ctx.resume().catch(() => {});
  });

  return { init, preload, unlock, setMuted, isMuted: () => muted, sfx, loop, stop, stopLoops, setMusic, stinger, duck, loaded: n => !!buffers[n], manifest: () => manifest };
})();
