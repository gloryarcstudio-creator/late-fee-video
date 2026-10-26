// Del, the night clerk: pose state machine on single-frame sprites (batch 04) plus the character block (stand, lamp, mini CRT, shadow).
// Every clip starts and ends on an anchor pose, so clips chain on frame boundaries with no cut:
//   hold states  idle ⇄ lean / pause / bored   via  <state>_in  →  <state>_loop  →  <state>_out
//   one-shots    cheer / wow / rew             from idle back to idle (wow interrupts anything with a crossfade)
// Frames: assets/del/f/<clip>_<i>.webp (384×754, 24 fps: the 12 fps clips from tools/art/split_del_frames.py plus an optical-flow
// in-between for every pair, tools/art/del_inbetween.py), assets/del/m/f/ 288×566 for phones. The idle sway is a ping-pong that
// reversed at full speed with a doubled frame (a hitch every pass): tools/art/del_retime.py eases it to a stop and back.
// They are drawn on one canvas from requestAnimationFrame with hard frame steps: no cross-dissolve between frames (a dissolve of
// two poses left both half transparent, and Del showed the shelves through him on big moves). Every frame is held STEP ms, and the frames of the pose transitions carry a stabilising shift (OFF, tools/art/del_offsets.py) so the feet stay put
// instead of drifting and jumping sideways. A canvas never draws a loaded image as blank (whole strips as CSS backgrounds fell
// out of the browser's decoded-image budget and Del vanished for whole passes); a clip starts only once its frames have arrived.
// The ~600 frames are fetched as bytes and decoded here into ImageBitmaps a few frames ahead of the playhead, at most KEEP at a
// time: with all of them as <img> a browser showed other frames of the loop in place of every second frame (v26–v27).
window.DEL = (function () {
  // name: [frames, loop, startPose, endPose] (frames of the 24 fps sets; a loop's last frame repeats its first)
  const CLIPS = {
    idle: [116, 1, 'idle', 'idle'], cheer_t: [59, 0, 'idle', 'idle'], wow_t: [71, 0, 'idle', 'idle'], rew_t: [59, 0, 'idle', 'idle'],
    lean_in: [23, 0, 'idle', 'lean'], lean_loop: [47, 1, 'lean', 'lean'], lean_out: [23, 0, 'lean', 'idle'],
    pause_in: [23, 0, 'idle', 'pause'], pause_loop: [47, 1, 'pause', 'pause'], pause_out: [23, 0, 'pause', 'idle'],
    bored_in: [35, 0, 'idle', 'bored'], bored_loop: [71, 1, 'bored', 'bored'], bored_out: [23, 0, 'bored', 'idle'],
  };
  // OFF: per-frame shift [dx list, dy list] in 384×754 frame px (one value = every frame); idle and the one-shots stay unshifted.
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
  const HOLD = { idle: 1, lean: 1, pause: 1, bored: 1 }, SHOT = { cheer: 1, wow: 1, rew: 1 };
  const ALIAS = { spin: 'idle', rewind: 'rew' };
  // STEP: every frame is held 50 ms, i.e. 3 screen refreshes at 60 Hz and 6 at 120 Hz, so the steps stay even (the earlier
  // 53–57 ms frames came out as a 3-3-3-4 refresh pattern, a small stutter on the slow idle sway). XF: interrupt blend ms;
  // PAD: canvas side margin (frame px) for the shifts.
  const STEP = 50, XF = 160, PAD = 32;
  const STILL = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // per-frame shifts are given for the 12 fps frames; the in-betweens take the mean of their neighbours
  const off = {}; for (const k in OFF) off[k] = OFF[k].map(v => v.split(',').map(Number)).map(a => a.length < 2 ? a : a.flatMap((x, i) => i + 1 < a.length ? [x, (x + a[i + 1]) / 2] : [x]));
  let root, cv, g, dir = 'assets/del/f/', FW = 384, FH = 754, S = 1;
  // the build's ?v=N (tools/build_fe.py) also goes on the frame URLs: frame files kept their names when the 12 fps sets became 24 fps,
  // so a browser or CDN cache from an older build would hand back other poses under the same names
  const VQ = ((document.currentScript && document.currentScript.src.match(/\?v=[^&#]+/)) || [''])[0];
  let hold = 'idle';        // the pose Del is in (or heading to) between clips
  let want = 'idle';        // the hold state the game asked for
  let shot = null;          // one pending one-shot
  let cur = null, old = null, xfAt = 0;   // clip on screen { name, t0, pass }, the one it crossfades from, crossfade start
  const frames = {}, got = {}, loaded = {}, settled = {};
  const BIT = typeof createImageBitmap === 'function' && typeof fetch === 'function' && location.protocol !== 'file:';
  const bm = new Map(), KEEP = 28;   // `${clip}_${i}` → ImageBitmap, or the Promise while it decodes; Map order = least recent first
  let last = null;                   // the frame on the canvas, redrawn while the next one decodes
  let rafNow = 0;                    // time of the last animation frame: clips start on that grid
  const span = name => (CLIPS[name][0] - 1) * STEP;                             // ms per pass

  function load(name) {
    if (frames[name]) return;
    const n = CLIPS[name][0]; got[name] = 0; frames[name] = new Array(n);
    const done = (i, v) => { settled[name] = (settled[name] || 0) + 1; if (v) { frames[name][i] = v; if (++got[name] === n) loaded[name] = true; } };
    const img = (i, url) => { const im = new Image(); im.onload = () => done(i, im); im.onerror = () => done(i, null); im.src = url; };
    for (let i = 0; i < n; i++) {
      const url = `${dir}${name}_${i}.webp${VQ}`;
      if (BIT) fetch(url).then(r => r.ok ? r.blob() : Promise.reject(r.status)).then(b => done(i, b), () => img(i, url)); else img(i, url);
    }
  }
  // the decoded frame, or null while it decodes (the decode starts here); <img> frames (no fetch / createImageBitmap) as they are
  function bitmap(name, i) {
    const src = frames[name] && frames[name][i]; if (!src) return null;
    if (!(src instanceof Blob)) return src.naturalWidth ? src : null;
    const k = name + '_' + i, v = bm.get(k);
    if (v) { if (v instanceof Promise) return null; bm.delete(k); bm.set(k, v); return v; }
    const p = createImageBitmap(src).then(b => { if (bm.get(k) === p) { bm.set(k, b); trim(); } else b.close(); }, () => bm.delete(k));
    bm.set(k, p); return null;
  }
  function trim() {
    let extra = bm.size - KEEP;
    for (const [k, v] of bm) { if (extra <= 0) break; if (v instanceof Promise || (last && last.im === v)) continue; v.close(); bm.delete(k); extra--; }
  }
  // 24 fps sets are ~600 frames: fetch the clips in the order the game first needs them (anticipation, wins, features, bored)
  const ORDER = ['lean_in', 'lean_loop', 'lean_out', 'cheer_t', 'wow_t', 'pause_in', 'pause_loop', 'pause_out', 'rew_t', 'bored_in', 'bored_loop', 'bored_out'];
  // one clip at a time, so the frames never queue ahead of the rest of the deferred art (bonus background, idle loops)
  function preloadAll() {
    const q = ORDER.concat(Object.keys(CLIPS)).filter((k, i, a) => a.indexOf(k) === i);
    (function next() { const k = q.shift(); if (!k) return; load(k); const w = setInterval(() => { if ((settled[k] || 0) >= CLIPS[k][0]) { clearInterval(w); next(); } }, 50); })();
  }

  // ---------- drawing ----------
  function frame(name, i, w) {
    const im = bitmap(name, i), o = off[name]; if (w <= 0.002 || !im) return false;
    const dx = o ? o[0][o[0].length > 1 ? i : 0] : 0, dy = o ? o[1][o[1].length > 1 ? i : 0] : 0;
    g.globalAlpha = Math.min(1, w); g.drawImage(im, (PAD + dx) * S, dy * S, FW, FH);
    if (w >= 1) last = { im, x: (PAD + dx) * S, y: dy * S }; return true;
  }
  // frame position of a clip at `now`: loops wrap, transitions and one-shots hold their last frame
  function at(s, now) {
    const [n, loop] = CLIPS[s.name];
    if (STILL) return loop ? 0 : n - 1;
    const p = Math.max(0, (now - s.t0) / STEP);
    return loop ? p % (n - 1) : Math.min(p, n - 1);
  }
  // frame on screen: refreshes fall on thirds or sixths of a step after t0, so a boundary at .75 never sits on one and a
  // timestamp jitter cannot stretch or skip a frame
  function draw(s, now, w) {
    const [n, loop] = CLIPS[s.name], i = Math.min(n - 1, Math.floor(at(s, now) + 0.25));
    for (let j = 1; j <= 6; j++) bitmap(s.name, loop ? (i + j) % (n - 1) : Math.min(n - 1, i + j));   // decode ahead
    return frame(s.name, i, w);
  }

  // ---------- clip sequencing ----------
  // mode 0: seamless switch on the shared anchor frame; mode 1 (interrupts): the new clip fades in over the old one held whole, so
  // the figure never turns see-through; only the wow cut adds a short VHS tracking glitch (on every pose change it read as jerking)
  function start(name, mode, t0) {
    const now = performance.now();
    old = mode && cur ? cur : null; xfAt = now;
    if (old && name === 'wow_t' && !STILL) { root.classList.remove('glitch'); void root.offsetWidth; root.classList.add('glitch'); clearTimeout(start.gt); start.gt = setTimeout(() => root.classList.remove('glitch'), 260); }
    cur = { name, t0: t0 == null ? (rafNow || now) : t0, pass: 0 };
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
    const [, loop, , end] = CLIPS[cur.name], len = span(cur.name), el = now - cur.t0;
    if (!loop) { if (el >= len) { hold = end; go(0, Math.max(cur.t0 + len, now - STEP)); } return; }
    const pass = Math.floor(el / len);
    if (pass > cur.pass) { cur.pass = pass; if (shot || want !== hold) go(0, Math.max(cur.t0 + pass * len, now - STEP)); }
  }
  function tick(now) {
    requestAnimationFrame(tick); const dt = rafNow ? now - rafNow : 0; rafNow = now;
    if (!cur || !loaded[cur.name] || document.visibilityState === 'hidden') return;   // keep the last picture until frames arrive
    // a stall (busy main thread, a tab coming back) or a frame still decoding stops Del's clock: he carries on from the frame
    // he was on instead of jumping ahead, which read as a hitch
    const lag = dt > 2 * STEP ? dt - STEP : tick.wait ? dt : 0;
    if (lag) { cur.t0 += lag; if (old) old.t0 += lag; xfAt += lag; }
    advance(now);
    const k = old ? Math.min(1, (now - xfAt) / XF) : 1; if (k >= 1) old = null;
    const nx = nextName(); if (nx !== cur.name && frames[nx]) for (let j = 0; j < 3; j++) bitmap(nx, j);   // the clip that chains next
    const keep = last;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cv.width, cv.height);
    const drawn = (old ? draw(old, now, 1) : false) | draw(cur, now, old ? k : 1);
    tick.wait = !drawn && !!keep;
    if (tick.wait) { g.globalAlpha = 1; g.drawImage(keep.im, keep.x, keep.y, FW, FH); last = keep; }   // its frame still decodes: hold
  }
  // leave a loop: on its next pass boundary when that is close, otherwise now with a crossfade (hold loops barely move)
  function leave() {
    const len = span(cur.name), left = len - (performance.now() - cur.t0) % len;
    if (left > 400) go(1);
  }
  // a transition or one-shot with more than ~0.6 s still to run is cut short with a crossfade when the game asks for something
  // else, so Del follows fast rounds instead of finishing a clip that no longer matches the reels
  function remaining() { const [, loop] = CLIPS[cur.name]; return loop ? 0 : (span(cur.name) - (performance.now() - cur.t0)) / 1000; }
  function cut() { if (cur && remaining() > 0.6) { hold = 'idle'; return go(1); } return false; }

  function set(state) {
    state = ALIAS[state] || state;
    if (!root || !cur) return;
    const c = CLIPS[cur.name];
    if (SHOT[state]) {
      if (!loaded[`${state}_t`]) { load(`${state}_t`); return; }
      if (state === 'wow') { shot = null; hold = 'idle'; want = 'idle'; return start('wow_t', 1); }   // big moment: interrupt now
      if (cur.name === `${state}_t`) return;                                                           // already doing it
      shot = state; want = 'idle'; if (!c[1]) { cut(); return; } leave(); return;
    }
    if (!HOLD[state]) state = 'idle';
    const target = c[1] ? hold : c[3];
    want = state; if (want === target && !shot) return;
    if (!c[1]) { if (!/_t$/.test(cur.name) || state !== 'idle') cut(); return; }
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
  return { init, set, event, preloadAll, state: () => ({ clip: cur && cur.name, hold, want, shot }), CLIPS, STEP, V: VQ };
})();
