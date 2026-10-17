// 5x3 reels driven by book boards. Rows in book coordinates: 0 and 4 are hidden padding, 1-3 visible.
(function () {
  const LABEL = {
    L1: '▶', L2: '■', L3: '◀◀', L4: '❚❚', M1: 'POP', M2: 'SODA', M3: 'PHONE',
    H1: 'HORROR', H2: 'ACTION', H3: 'SCI-FI', P: 'DEL', W: '★', S: 'KEY', R: '◀◀ REW',
  };
  const PAYLINES = [null,
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
    [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
    [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0]];
  const N = 5, ROWS = 5;
  let root, svg, cell = 136, gap = 6, cols = [], anims = [], strips = window.REELSTRIPS;
  // idle loops (batch 05): {dir, clips: {name: {n, sec}}, rest}. A standing cell gets a strip layer over its still. Every cell of
  // one symbol runs on the same clock (phase = symbol type, not cell), so twins on the board move in sync; different symbols are
  // offset from each other. Each pass is followed by a rest on the first frame, baked into the keyframes so the sync never drifts.
  let IDLE = null, T0 = 0; const RULES = {};
  const LINE_COLORS = ['#ffd34a', '#3de0ff', '#ff4fc3', '#7dff6a', '#ff8a3d', '#b48bff', '#4dffd2', '#ff5a6e'];
  function winRule(n) {
    const key = `symwin_${n}`;
    if (!RULES[key]) {
      const sheet = document.getElementById('symidleCss') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'symidleCss' }));
      sheet.sheet.insertRule(`@keyframes ${key} { from { background-position-x: 0%; } to { background-position-x: 100%; } }`, 0);
      RULES[key] = true;
    }
    return key;
  }
  function idleRule(n, sec, rest) {
    const key = `symidle_${n}_${sec}_${rest}`.replace(/\./g, '_');
    if (!RULES[key]) {
      const p = +(100 * sec / (sec + rest)).toFixed(3);
      const sheet = document.getElementById('symidleCss') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'symidleCss' }));
      sheet.sheet.insertRule(`@keyframes ${key} { 0% { background-position-x: 0%; animation-timing-function: steps(${n - 1}); } ${p}% { background-position-x: 100%; animation-timing-function: step-end; } ${p + 0.01}% { background-position-x: 0%; animation-timing-function: step-end; } 100% { background-position-x: 0%; } }`, 0);
      RULES[key] = true;
    }
    return key;
  }
  function symEl(name, live) {
    const d = document.createElement('div');
    d.className = 'sym s-' + name + (name === 'W' ? ' wild' : name === 'S' ? ' scatter' : name === 'R' ? ' rew' : '');
    d.innerHTML = '<span>' + (LABEL[name] || name) + '</span>' + (name === 'W' ? '<i>WILD</i>' : '');
    const c = live && IDLE && IDLE.clips[name];
    if (c) {
      const rest = IDLE.rest == null ? 2 : IDLE.rest, P = c.sec + rest, keys = Object.keys(IDLE.clips);
      const phase = (keys.indexOf(name) / keys.length) * P;                       // each symbol type starts at its own point of the period
      const at = ((performance.now() - T0) / 1000 + phase) % P;                     // where this type is on the shared clock right now
      const b = document.createElement('b'); b.className = 'idle';
      b.style.setProperty('--n', c.n); b.style.backgroundImage = `url(${IDLE.dir}sym_${name}_strip.webp)`;
      b.style.animation = `${idleRule(c.n, c.sec, rest)} ${P}s linear -${at.toFixed(3)}s infinite`;
      d.appendChild(b);
    }
    return d;
  }
  function randomSym(stripName, r) {
    const s = (strips[stripName] || strips.BR0)[r];
    let n = s[Math.floor(Math.random() * s.length)];
    if (!n || n === 'R' || n === 'S') n = 'L' + (1 + Math.floor(Math.random() * 4)); // keep specials (and any padding blank) out of the blur
    return n;
  }
  function names(boardCol) { return boardCol.map(x => (typeof x === 'string' ? x : x.name)); }

  // blur: indexes of the items that fly past (motion-blurred copies); a standing board marks its hidden padding rows
  function build(r, items, y, live, blur) {
    const st = cols[r].strip;
    st.textContent = '';
    items.forEach((n, i) => {
      const d = st.appendChild(symEl(n, live && i >= 1 && i <= 3));   // loops only on the three visible rows
      if (live && (i === 0 || i === 4)) d.classList.add('pad');
      if (blur && blur(i)) d.classList.add('mb');
    });
    st.style.transform = `translate3d(0,${-y * cell}px,0)`;
  }

  const Reels = {
    LABEL, PAYLINES,
    init(el, svgEl) {
      root = el; svg = svgEl; root.textContent = ''; cols = [];
      for (let r = 0; r < N; r++) {
        const reel = document.createElement('div'); reel.className = 'reel';
        const strip = document.createElement('div'); strip.className = 'strip';
        reel.appendChild(strip); root.appendChild(reel);
        const start = []; for (let k = 0; k < ROWS; k++) start.push(randomSym('BR0', r));
        cols.push({ reel, strip, cur: start });
        build(r, start, 1, true);
      }
    },
    setCell(px, g) { cell = px; gap = g; cols.forEach((c, r) => build(r, c.cur, 1, true)); },
    current() { return cols.map(c => c.cur.slice()); },
    // Show a board immediately (restore, replay start).
    show(board) { board.forEach((col, r) => { cols[r].cur = names(col); build(r, cols[r].cur, 1, true); }); },
    // turn the idle loops on once their strips are loaded; rebuilds the standing board
    idle(cfg) { IDLE = cfg; T0 = performance.now(); if (!anims.length) cols.forEach((c, r) => build(r, c.cur, 1, true)); },

    /**
     * Spin to a board. opts: {spin:[reel idx], anticipation:[], reverse, turbo, strip, fast}
     * Resolves when every spinning reel has stopped (slam-stop finishes them early).
     */
    spin(board, opts = {}) {
      const which = opts.spin || [0, 1, 2, 3, 4];
      const t = opts.fast ? 0.05 : opts.turbo ? 0.45 : 1;
      let anticExtra = 0;
      const ps = which.map((r, k) => {
        const fin = names(board[r]);
        const n = Math.max(3, Math.round((10 + k * 3) * (opts.turbo ? 0.6 : 1)));
        const fill = []; for (let i = 0; i < n; i++) fill.push(randomSym(opts.strip, r));
        const cur = cols[r].cur;
        const items = opts.reverse ? cur.concat(fill, fin) : fin.concat(fill, cur);
        const from = opts.reverse ? 1 : n + 6, to = opts.reverse ? n + 6 : 1;
        // the filler is drawn blurred except the two next to the landing board, which pass slowly while the reel brakes
        const blur = opts.fast ? null : opts.reverse ? (i => i >= 5 && i < 3 + n) : (i => i >= 7 && i < 5 + n);
        build(r, items, from, false, blur);
        cols[r].reel.classList.add('spin'); cols[r].reel.classList.remove('land');
        const antic = opts.anticipation && opts.anticipation[r] > 0;
        if (antic && !opts.fast) anticExtra += opts.turbo ? 500 : 1100;
        const dur = (650 + k * 170) * t + anticExtra; // reels after an anticipation reel wait for it
        if (antic) cols[r].reel.classList.add('antic');
        // wind-up against the direction of travel, the run, an overshoot past the landing row and a bounce back
        const dir = opts.reverse ? -1 : 1, wind = opts.fast ? 0 : 0.2 * cell, over = (opts.fast ? 0.04 : 0.17) * cell;
        const D = Math.max(40, dur), w = opts.fast ? 0 : Math.min(0.14, 110 / D);
        const Y = v => `translate3d(0,${v}px,0)`;
        const a = cols[r].strip.animate([
          { transform: Y(-from * cell), easing: 'cubic-bezier(.3,0,.6,1)' },
          { transform: Y(-from * cell - dir * wind), offset: w || 0.0001, easing: 'cubic-bezier(.45,.05,.4,1)' },
          { transform: Y(-to * cell + dir * over), offset: 0.88, easing: 'cubic-bezier(.3,0,.5,1)' },
          { transform: Y(-to * cell - dir * over * 0.22), offset: 0.95, easing: 'ease-in-out' },
          { transform: Y(-to * cell) },
        ], { duration: D, fill: 'forwards' });
        anims.push(a);
        return a.finished.catch(() => {}).then(() => {
          a.cancel();
          cols[r].cur = fin; build(r, fin, 1, true);
          cols[r].reel.classList.remove('antic', 'spin');
          if (!opts.fast) { const rl = cols[r].reel; rl.classList.remove('land'); void rl.offsetWidth; rl.classList.add('land'); }
          if (opts.onStop) opts.onStop(r);
        });
      });
      return Promise.all(ps).then(() => { anims = []; });
    },
    slam() { anims.forEach(a => { try { a.finish(); } catch (e) {} }); },
    spinning() { return anims.length > 0; },

    cellEl(reel, row) { return cols[reel].strip.children[row]; },
    // colour: the line's neon (frame, glow); the symbol's idle clip switches to a straight loop at full pace while it wins
    highlight(positions, cls = 'hit', color) {
      positions.forEach(p => {
        const e = this.cellEl(p.reel, p.row); if (!e) return;
        e.classList.add(cls); if (color) e.style.setProperty('--lc', color);
        const b = e.querySelector('.idle'), c = IDLE && IDLE.clips[e.className.match(/s-(\w+)/)[1]];
        if (b && c && !b.dataset.win) { b.dataset.win = 1; b.style.animation = `${winRule(c.n)} ${(c.sec * 0.6).toFixed(2)}s steps(${c.n - 1}) infinite`; }
      });
    },
    lineColor: li => LINE_COLORS[(li - 1) % LINE_COLORS.length],
    dim(on) { root.classList.toggle('dimmed', !!on); },
    clear() {
      root.querySelectorAll('.hit,.hit-s').forEach(e => { e.classList.remove('hit', 'hit-s'); e.style.removeProperty('--lc'); });
      this.dim(false); svg.textContent = '';
    },
    freeze(reels) { cols.forEach((c, r) => c.reel.classList.toggle('frozen', reels.includes(r))); },
    unfreeze() { cols.forEach(c => c.reel.classList.remove('frozen')); },
    // Tracking Band: a VHS tracking strip over the wild cells of one row (positions in book rows, 1-3 visible); null removes it
    band(positions) {
      let el = root.querySelector('.band');
      if (!positions || !positions.length) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.className = 'band'; root.appendChild(el); }
      const reels = positions.map(p => p.reel), r0 = Math.min(...reels), r1 = Math.max(...reels);
      el.style.top = `calc(${positions[0].row - 1} * var(--cell))`;
      el.style.left = `calc(${r0} * (var(--cell) + var(--gap)))`;
      el.style.width = `calc(${r1 - r0 + 1} * var(--cell) + ${r1 - r0} * var(--gap))`;
    },
    // Draw payline polylines for wins (meta.lineIndex is 1-based, as in game_config.paylines).
    lines(wins) {
      const W = N * cell + (N - 1) * gap, H = 3 * cell;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.textContent = '';
      const NS = 'http://www.w3.org/2000/svg', el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
      wins.forEach((w, k) => {
        const li = w.meta && w.meta.lineIndex; const pl = PAYLINES[li]; if (!pl) return;
        const xy = pl.map((row, r) => [r * (cell + gap) + cell / 2, row * cell + cell / 2]);
        // run the line from the outer edges of reels 1 and 5 so it reads as a line through the whole window
        xy.unshift([4, xy[0][1]]); xy.push([W - 4, xy[xy.length - 1][1]]);
        const pts = xy.map(p => p.join(',')).join(' '), col = this.lineColor(li), delay = `${(k * 0.06).toFixed(2)}s`;
        ['pg', 'pl', 'pc'].forEach(c => {
          const p = el('polyline', { points: pts, class: c, pathLength: 1 }); if (c !== 'pc') p.style.stroke = col;
          p.style.animationDelay = delay; svg.appendChild(p);
        });
        if (wins.length <= 3) {
          const dot = el('circle', { r: 6 }), m = el('animateMotion', { dur: '1.1s', repeatCount: 'indefinite', path: 'M' + xy.map(p => p.join(',')).join(' L') });
          dot.appendChild(m); svg.appendChild(dot);
        }
      });
    },
  };
  window.Reels = Reels;
})();
