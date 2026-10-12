// Del, the night clerk: pose state machine on sprite strips (batch 04) plus the character block (stand, lamp, mini CRT, shadow).
// Every clip starts and ends on an anchor pose, so clips chain on frame boundaries with no cut:
//   hold states  idle ⇄ lean / pause / bored   via  <state>_in  →  <state>_loop  →  <state>_out
//   one-shots    cheer / wow / rew             from idle back to idle (wow interrupts anything with a 150 ms crossfade)
// Strips: assets/del/<clip>_strip.webp (320×480 frames, 12 fps); assets/del/m/ holds 160×240 copies for small screens.
window.DEL = (function () {
  // name: [frames, seconds, loop, startPose, endPose]
  const CLIPS = {
    idle: [48, 4, 1, 'idle', 'idle'], cheer_t: [30, 2.5, 0, 'idle', 'idle'], wow_t: [36, 3, 0, 'idle', 'idle'], rew_t: [30, 2.5, 0, 'idle', 'idle'],
    lean_in: [12, 1, 0, 'idle', 'lean'], lean_loop: [24, 2, 1, 'lean', 'lean'], lean_out: [12, 1, 0, 'lean', 'idle'],
    pause_in: [12, 1, 0, 'idle', 'pause'], pause_loop: [24, 2, 1, 'pause', 'pause'], pause_out: [12, 1, 0, 'pause', 'idle'],
    bored_in: [18, 1.5, 0, 'idle', 'bored'], bored_loop: [36, 3, 1, 'bored', 'bored'], bored_out: [12, 1, 0, 'bored', 'idle'],
  };
  const HOLD = { idle: 1, lean: 1, pause: 1, bored: 1 }, SHOT = { cheer: 1, wow: 1, rew: 1 };
  const ALIAS = { spin: 'idle', rewind: 'rew' };
  let root, fig, layers, cur = 0, dir = 'assets/del/';
  let hold = 'idle';        // the pose Del is in (or heading to) between clips
  let want = 'idle';        // the hold state the game asked for
  let shot = null;          // one pending one-shot
  let clip = null, t0 = 0;  // clip playing now and when it started
  const loaded = {}, imgs = {};
  const url = name => `${dir}del_${name}_strip.webp`;

  function load(name) {
    if (imgs[name]) return imgs[name];
    const i = new Image(); i.onload = () => { loaded[name] = true; }; i.src = url(name); imgs[name] = i; return i;
  }
  function preloadAll() { Object.keys(CLIPS).forEach(load); }

  // put `name` on the next layer, aligned on its first frame; `xfade` crossfades instead of a hard swap
  function play(name, xfade) {
    const [n, sec, loop] = CLIPS[name]; t0 = performance.now();
    const prev = layers[cur]; cur ^= 1; const el = layers[cur];
    el.style.animation = 'none'; el.style.setProperty('--n', n); el.style.backgroundImage = `url(${url(name)})`;
    void el.offsetWidth;
    el.style.animation = `strip ${sec}s steps(${n - 1}) ${loop ? 'infinite' : '1 forwards'}`;
    el.classList.toggle('xf', !!xfade); prev.classList.toggle('xf', !!xfade);
    el.classList.add('on'); prev.classList.remove('on');
    clip = name; root.dataset.state = name.replace(/_(t|loop)$/, '');
  }
  // next clip once the current one has ended on its end pose
  function step(xf) {
    const c = clip ? CLIPS[clip] : null; if (c) hold = c[4];
    if (shot) { if (hold !== 'idle') return play(`${hold}_out`, xf); const s = shot; shot = null; return play(`${s}_t`, xf); }
    if (want !== hold) { if (hold !== 'idle') return play(`${hold}_out`, xf); return play(loaded[`${want}_in`] ? `${want}_in` : 'idle', xf); }
    play(hold === 'idle' ? 'idle' : `${hold}_loop`, xf);
  }
  // leave a loop: on its next pass boundary when that is close, otherwise now with a short crossfade (loop frames stay near the anchor)
  function leave() {
    const [, sec, loop] = CLIPS[clip]; if (!loop) return;
    const left = sec - ((performance.now() - t0) / 1000) % sec;
    if (left > 0.4) step(true);
  }
  function onEnd(e) { if (e.target === layers[cur] && !CLIPS[clip][2]) step(); }
  // a loop never ends on its own: when the request changes mid-loop, leave at the loop's next pass boundary (≤ one loop)
  function onIter(e) { if (e.target === layers[cur] && CLIPS[clip][2] && (shot || want !== hold)) step(); }

  function set(state) {
    state = ALIAS[state] || state;
    if (!root) return;
    if (SHOT[state]) {
      if (!loaded[`${state}_t`]) { load(`${state}_t`); return; }
      if (state === 'wow') { shot = null; hold = 'idle'; want = 'idle'; return play('wow_t', true); }   // big moment: interrupt now
      if (clip === `${state}_t`) return;                                                                 // already doing it
      shot = state; want = 'idle'; leave(); return;
    }
    if (!HOLD[state]) state = 'idle';
    want = state; if (want !== hold) leave();
  }

  // ---------- character block (stand, lamp, mini CRT, shadow) ----------
  let crt, ctx, noiseT = 0;
  function noise() {
    if (!ctx || document.visibilityState === 'hidden') return;
    const w = crt.width, h = crt.height, id = ctx.createImageData(w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = 90 + Math.random() * 150; d[i] = v * 0.85; d[i + 1] = v; d[i + 2] = v * 1.1; d[i + 3] = 255; }
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] *= 0.6; d[i + 1] *= 0.6; d[i + 2] *= 0.6; }
    ctx.putImageData(id, 0, 0);
    if (root.classList.contains('rec')) { ctx.fillStyle = (Math.floor(noiseT / 4) % 2) ? '#ff2a2a' : 'transparent'; ctx.beginPath(); ctx.arc(8, 8, 4, 0, 7); ctx.fill(); }
    noiseT++;
  }
  // block events from the game: spin, stop, antic, win, bigwin, calm, bonus, base
  let winT = 0;
  function event(name) {
    if (!root) return;
    const b = root.classList;
    if (name === 'spin') { b.add('spin'); b.remove('antic'); }
    else if (name === 'stop') { b.remove('spin', 'antic'); }
    else if (name === 'antic') { b.add('antic'); }
    else if (name === 'win') { b.remove('win'); void root.offsetWidth; b.add('win'); clearTimeout(winT); winT = setTimeout(() => b.remove('win'), 800); }
    else if (name === 'bigwin') { b.add('bigwin'); }
    else if (name === 'calm') { b.remove('bigwin', 'win', 'antic'); }
    else if (name === 'bonus') { b.add('rec'); }
    else if (name === 'base') { b.remove('rec'); }
  }

  function init(opts = {}) {
    root = document.getElementById('del'); fig = root.querySelector('#delFig'); layers = [...fig.querySelectorAll('.anim')];
    if (opts.mobile) dir = 'assets/del/m/';
    layers.forEach(l => { l.addEventListener('animationend', onEnd); l.addEventListener('animationiteration', onIter); });
    crt = root.querySelector('canvas'); if (crt) { ctx = crt.getContext('2d'); setInterval(noise, 125); }
    load('idle'); play('idle');
  }
  return { init, set, event, preloadAll, state: () => ({ clip, hold, want, shot }), CLIPS };
})();
