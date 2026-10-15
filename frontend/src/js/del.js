// Del, the night clerk: pose state machine on single-frame sprites (batch 04) plus the character block (stand, lamp, mini CRT, shadow).
// Every clip starts and ends on an anchor pose, so clips chain on frame boundaries with no cut:
//   hold states  idle ⇄ lean / pause / bored   via  <state>_in  →  <state>_loop  →  <state>_out
//   one-shots    cheer / wow / rew             from idle back to idle (wow interrupts anything with a crossfade)
// Frames: assets/del/f/<clip>_<i>.webp (384×754, 12 fps; tools/art/split_del_frames.py from art/del_strips/), assets/del/m/f/
// 288×566 for phones.
// They are drawn on one canvas from requestAnimationFrame: the next frame fades in over the current one ('lighter' sum with
// weights 1−f and f, so the 12 fps clips move continuously and the figure never dims; big jumps fade late, see BW), clips run
// at SPEED of their authored speed, and the frames of the pose transitions carry a stabilising shift (OFF, tools/art/del_offsets.py) so the feet stay put
// instead of drifting and jumping sideways. A canvas never draws a loaded image as blank (whole strips as CSS backgrounds fell
// out of the browser's decoded-image budget and Del vanished for whole passes); a clip starts only once its frames have arrived.
window.DEL = (function () {
  // name: [frames, seconds, loop, startPose, endPose]
  const CLIPS = {
    idle: [48, 4, 1, 'idle', 'idle'], cheer_t: [30, 2.5, 0, 'idle', 'idle'], wow_t: [36, 3, 0, 'idle', 'idle'], rew_t: [30, 2.5, 0, 'idle', 'idle'],
    lean_in: [12, 1, 0, 'idle', 'lean'], lean_loop: [24, 2, 1, 'lean', 'lean'], lean_out: [12, 1, 0, 'lean', 'idle'],
    pause_in: [12, 1, 0, 'idle', 'pause'], pause_loop: [24, 2, 1, 'pause', 'pause'], pause_out: [12, 1, 0, 'pause', 'idle'],
    bored_in: [18, 1.5, 0, 'idle', 'bored'], bored_loop: [36, 3, 1, 'bored', 'bored'], bored_out: [12, 1, 0, 'bored', 'idle'],
  };
  // OFF: per-frame shift [dx list, dy list] in 384×754 frame px (one value = every frame); idle and the one-shots stay unshifted.
  // BW: share of each frame step the fade to the next frame may use (digit/9; missing = whole step): big pose jumps fade late.
  const OFF = {
    lean_loop: ['9.3', '1'],
    lean_in: ['0,-0.1,3.1,7.3,14.2,20.1,11.7,10.3,10.3,10.7,9.6,9.3', '0,0,1,4,4,4,2,2,2,2,1,1'],
    lean_out: ['9.3,9.6,9,8.3,21.1,9.9,3.8,0.2,0,-0.1,-0.1,0', '1,2,4,4,7,5,2,1,0,0,0,0'],
    pause_loop: ['20.6', '-3'],
    pause_in: ['0,0,4.3,3.3,14.6,25.2,20.3,20.4,20.6,20.5,20.8,20.6', '0,0,1,0,1,-2,-2,-3,-3,-3,-3,-3'],
    pause_out: ['20.6,20.7,20.7,20.7,26.6,35.3,34.1,13.6,13.5,4,-0.1,0', '-3,-3,-3,-3,-1,-2,-2,2,2,0,0,0'],
    bored_loop: ['11.7', '1'],
    bored_in: ['0,-0.2,0.5,12.7,15.3,14.9,14.2,22.8,22,23.5,19.6,12.2,11.5,11.6,11.6,11.7,12.2,11.7', '0,0,1,4,6,6,6,6,6,5,5,2,1,1,1,1,0.4,1'],
    bored_out: ['11.7,12.2,11.8,11.8,11.9,11.9,2.9,4,0.9,-0.1,-0.1,0', '1,1,1,1,1,1,1,1,1,0,0,0'],
  };
  const BW = {
    lean_in: '96232268999',
    lean_out: '99925259999',
    pause_in: '94223287999',
    pause_out: '99942324289',
    bored_in: '99376436232889999',
    bored_out: '99862623989',
    cheer_t: '99999999985459899747889999999',
    wow_t: '99999986535747794775326778989999999',
    rew_t: '99999788999999999999978899999',
  };
  const HOLD = { idle: 1, lean: 1, pause: 1, bored: 1 }, SHOT = { cheer: 1, wow: 1, rew: 1 };
  const ALIAS = { spin: 'idle', rewind: 'rew' };
  const SPEED = 0.8, XF = 250, PAD = 32;      // speed factor, crossfade ms, canvas side margin (frame px) for the shifts
  const STILL = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const off = {}; for (const k in OFF) off[k] = OFF[k].map(v => v.split(',').map(Number));
  let root, cv, g, dir = 'assets/del/f/', FW = 384, FH = 754, S = 1;
  let hold = 'idle';        // the pose Del is in (or heading to) between clips
  let want = 'idle';        // the hold state the game asked for
  let shot = null;          // one pending one-shot
  let cur = null, old = null, xfAt = 0;   // clip on screen { name, t0, pass }, the one it crossfades from, crossfade start
  const frames = {}, got = {}, loaded = {};
  const step = name => CLIPS[name][1] / SPEED / (CLIPS[name][0] - 1) * 1000;   // ms per frame
  const span = name => (CLIPS[name][0] - 1) * step(name);                        // ms per pass

  function load(name) {
    if (frames[name]) return;
    const n = CLIPS[name][0]; got[name] = 0;
    frames[name] = Array.from({ length: n }, (_, i) => {
      const im = new Image(); im.onload = () => { if (++got[name] === n) loaded[name] = true; }; im.src = `${dir}${name}_${i}.webp`; return im;
    });
  }
  function preloadAll() { Object.keys(CLIPS).forEach(load); }

  // ---------- drawing ----------
  function frame(name, i, w) {
    const im = frames[name][i], o = off[name]; if (w <= 0.002 || !im.naturalWidth) return;
    const dx = o ? o[0][o[0].length > 1 ? i : 0] : 0, dy = o ? o[1][o[1].length > 1 ? i : 0] : 0;
    g.globalAlpha = Math.min(1, w); g.drawImage(im, (PAD + dx) * S, dy * S, FW, FH);
  }
  // frame position of a clip at `now`: loops wrap, transitions and one-shots hold their last frame
  function at(s, now) {
    const [n, , loop] = CLIPS[s.name];
    if (STILL) return loop ? 0 : n - 1;
    const p = Math.max(0, (now - s.t0) / step(s.name));   // a clip started from a game event this frame has t0 after the rAF time
    return loop ? p % (n - 1) : Math.min(p, n - 1);
  }
  function draw(s, now, w) {
    const n = CLIPS[s.name][0], p = at(s, now), i = Math.floor(p), bw = BW[s.name], d = bw ? +bw[i] / 9 || 1 : 1;
    const f = Math.max(0, (p - i - (1 - d)) / d);
    frame(s.name, i, w * (1 - f)); if (i + 1 < n) frame(s.name, i + 1, w * f);
    const ahead = frames[s.name][Math.min(i + 2, n - 1)];   // decode the next frame off the draw path
    if (ahead.decode && !ahead._dec && ahead.naturalWidth) { ahead._dec = 1; ahead.decode().catch(() => {}); }
  }

  // ---------- clip sequencing ----------
  // mode 0: seamless switch on the shared anchor frame; mode 1: crossfade from where the old clip is (interrupts)
  function start(name, mode, t0) {
    const now = performance.now();
    old = mode && cur ? cur : null; xfAt = now;
    cur = { name, t0: t0 == null ? now : t0, pass: 0 };
    root.dataset.state = name.replace(/_(t|loop)$/, '');
  }
  // the clip that follows the current pose and request
  function nextName() {
    if (shot) return hold !== 'idle' ? `${hold}_out` : `${shot}_t`;
    if (want !== hold) return hold !== 'idle' ? `${hold}_out` : (loaded[`${want}_in`] ? `${want}_in` : 'idle');
    return hold === 'idle' ? 'idle' : `${hold}_loop`;
  }
  function go(mode, t0) {
    const name = nextName();
    if (!loaded[name]) { load(name); return false; }    // hold the current frame until its frames arrive
    if (shot && name === `${shot}_t`) shot = null;
    start(name, mode, t0); return true;
  }
  // end of a transition/one-shot, or a loop pass boundary with a pending request: chain on the anchor frame
  function advance(now) {
    const [, , loop, , end] = CLIPS[cur.name], len = span(cur.name), el = now - cur.t0;
    if (!loop) { if (el >= len) { hold = end; go(0, Math.max(cur.t0 + len, now - 34)); } return; }
    const pass = Math.floor(el / len);
    if (pass > cur.pass) { cur.pass = pass; if (shot || want !== hold) go(0, Math.max(cur.t0 + pass * len, now - 34)); }
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (!cur || !loaded[cur.name] || document.visibilityState === 'hidden') return;   // keep the last picture until frames arrive
    advance(now);
    const k = old ? Math.min(1, (now - xfAt) / XF) : 1; if (k >= 1) old = null;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'lighter';
    if (old) draw(old, now, 1 - k);
    draw(cur, now, k);
  }
  // leave a loop: on its next pass boundary when that is close, otherwise now with a crossfade (hold loops barely move)
  function leave() {
    const len = span(cur.name), left = len - (performance.now() - cur.t0) % len;
    if (left > 400) go(1);
  }
  // a transition or one-shot with more than ~0.6 s still to run is cut short with a crossfade when the game asks for something
  // else, so Del follows fast rounds instead of finishing a clip that no longer matches the reels
  function remaining() { const [, , loop] = CLIPS[cur.name]; return loop ? 0 : (span(cur.name) - (performance.now() - cur.t0)) / 1000; }
  function cut() { if (cur && remaining() > 0.6) { hold = 'idle'; return go(1); } return false; }

  function set(state) {
    state = ALIAS[state] || state;
    if (!root || !cur) return;
    const c = CLIPS[cur.name];
    if (SHOT[state]) {
      if (!loaded[`${state}_t`]) { load(`${state}_t`); return; }
      if (state === 'wow') { shot = null; hold = 'idle'; want = 'idle'; return start('wow_t', 1); }   // big moment: interrupt now
      if (cur.name === `${state}_t`) return;                                                           // already doing it
      shot = state; want = 'idle'; if (!c[2]) { cut(); return; } leave(); return;
    }
    if (!HOLD[state]) state = 'idle';
    const target = c[2] ? hold : c[4];
    want = state; if (want === target && !shot) return;
    if (!c[2]) { if (!/_t$/.test(cur.name) || state !== 'idle') cut(); return; }
    if (want !== hold) leave();
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
  let winT = 0, bigT = 0;
  function event(name) {
    if (!root) return;
    const b = root.classList;
    if (name === 'spin') { b.add('spin'); b.remove('antic'); }
    else if (name === 'stop') { b.remove('spin', 'antic'); }
    else if (name === 'antic') { b.add('antic'); }
    else if (name === 'win') { b.remove('win'); void root.offsetWidth; b.add('win'); clearTimeout(winT); winT = setTimeout(() => b.remove('win'), 950); }
    else if (name === 'bigwin') { b.add('bigwin'); clearTimeout(bigT); bigT = setTimeout(() => b.remove('bigwin'), 6000); }
    else if (name === 'calm') { b.remove('bigwin', 'win', 'antic'); }
    else if (name === 'bonus') { b.add('rec'); }
    else if (name === 'base') { b.remove('rec'); }
  }

  function init(opts = {}) {
    root = document.getElementById('del'); cv = root.querySelector('#delFig canvas'); g = cv.getContext('2d');
    if (opts.mobile) { dir = 'assets/del/m/f/'; FW = 288; FH = 566; }
    S = FW / 384; cv.width = Math.round((384 + 2 * PAD) * S); cv.height = FH;
    crt = root.querySelector('#delStand canvas'); if (crt) { ctx = crt.getContext('2d'); setInterval(noise, 125); }
    load('idle'); start('idle', 0); requestAnimationFrame(tick);
  }
  return { init, set, event, preloadAll, state: () => ({ clip: cur && cur.name, hold, want, shot }), CLIPS, SPEED };
})();
