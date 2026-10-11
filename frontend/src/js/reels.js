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

  function symEl(name) {
    const d = document.createElement('div');
    d.className = 'sym s-' + name + (name === 'W' ? ' wild' : name === 'S' ? ' scatter' : name === 'R' ? ' rew' : '');
    d.innerHTML = '<span>' + (LABEL[name] || name) + '</span>' + (name === 'W' ? '<i>WILD</i>' : '');
    return d;
  }
  function randomSym(stripName, r) {
    const s = (strips[stripName] || strips.BR0)[r];
    let n = s[Math.floor(Math.random() * s.length)];
    if (n === 'R' || n === 'S') n = 'L' + (1 + Math.floor(Math.random() * 4)); // keep specials out of the blur
    return n;
  }
  function names(boardCol) { return boardCol.map(x => (typeof x === 'string' ? x : x.name)); }

  function build(r, items, y) {
    const st = cols[r].strip;
    st.textContent = '';
    items.forEach(n => st.appendChild(symEl(n)));
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
        build(r, start, 1);
      }
    },
    setCell(px, g) { cell = px; gap = g; cols.forEach((c, r) => build(r, c.cur, 1)); },
    current() { return cols.map(c => c.cur.slice()); },
    // Show a board immediately (restore, replay start).
    show(board) { board.forEach((col, r) => { cols[r].cur = names(col); build(r, cols[r].cur, 1); }); },

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
        build(r, items, from);
        const antic = opts.anticipation && opts.anticipation[r] > 0;
        if (antic && !opts.fast) anticExtra += opts.turbo ? 500 : 1100;
        const dur = (650 + k * 170) * t + anticExtra; // reels after an anticipation reel wait for it
        if (antic) cols[r].reel.classList.add('antic');
        const over = (opts.reverse ? 0.12 : -0.12) * cell;
        const a = cols[r].strip.animate([
          { transform: `translate3d(0,${-from * cell}px,0)` },
          { transform: `translate3d(0,${-to * cell - over}px,0)`, offset: 0.9 },
          { transform: `translate3d(0,${-to * cell}px,0)` },
        ], { duration: Math.max(40, dur), easing: 'cubic-bezier(.35,.05,.45,1)', fill: 'forwards' });
        anims.push(a);
        return a.finished.catch(() => {}).then(() => {
          a.cancel();
          cols[r].cur = fin; build(r, fin, 1);
          cols[r].reel.classList.remove('antic');
          if (opts.onStop) opts.onStop(r);
        });
      });
      return Promise.all(ps).then(() => { anims = []; });
    },
    slam() { anims.forEach(a => { try { a.finish(); } catch (e) {} }); },
    spinning() { return anims.length > 0; },

    cellEl(reel, row) { return cols[reel].strip.children[row]; },
    highlight(positions, cls = 'hit') { positions.forEach(p => { const e = this.cellEl(p.reel, p.row); if (e) e.classList.add(cls); }); },
    dim(on) { root.classList.toggle('dimmed', !!on); },
    clear() {
      root.querySelectorAll('.hit,.hit-s').forEach(e => e.classList.remove('hit', 'hit-s'));
      this.dim(false); svg.textContent = '';
    },
    freeze(reels) { cols.forEach((c, r) => c.reel.classList.toggle('frozen', reels.includes(r))); },
    unfreeze() { cols.forEach(c => c.reel.classList.remove('frozen')); },
    // Draw payline polylines for wins (meta.lineIndex is 1-based, as in game_config.paylines).
    lines(wins) {
      const W = N * cell + (N - 1) * gap, H = 3 * cell;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.textContent = '';
      wins.forEach(w => {
        const li = w.meta && w.meta.lineIndex; const pl = PAYLINES[li]; if (!pl) return;
        const pts = pl.map((row, r) => `${r * (cell + gap) + cell / 2},${row * cell + cell / 2}`).join(' ');
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        p.setAttribute('points', pts); p.setAttribute('class', 'pl');
        svg.appendChild(p);
      });
    },
  };
  window.Reels = Reels;
})();
