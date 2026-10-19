// Del QA: node tools/qa_del.js BASE_URL OUT_DIR — pose chains run on anchor frames, the figure is on the canvas in every frame and
// keeps its feet in place, block classes follow events, screenshots of the block.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
let fails = 0; const ok = (n, p, i = '') => { fails += p ? 0 : 1; console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? '  ' + i : '')); };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 592 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  await ctl('balance=1000000000&round=none&currency=USD&social=false&jur=');
  // tag every Del frame drawn with its file: fetched blobs and the bitmaps decoded from them carry the URL
  await page.addInitScript(() => {
    window.__drawn = []; const f0 = window.fetch, c0 = window.createImageBitmap, d0 = CanvasRenderingContext2D.prototype.drawImage;
    window.fetch = (u, ...a) => f0(u, ...a).then(r => { const b0 = r.blob.bind(r); r.blob = () => b0().then(b => { b.__u = String(u); return b; }); return r; });
    window.createImageBitmap = (src, ...a) => c0(src, ...a).then(b => { b.__u = src.__u || src.src; return b; });
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) { if (this.canvas.closest && this.canvas.closest('#delFig')) window.__drawn.push([performance.now(), String(im.__u || im.src || '').split('/').pop()]); return d0.call(this, im, ...a); };
  });
  await page.goto(`${BASE}/index.html?sessionID=sess-ok&rgs_url=${BASE.replace(/^https?:\/\//, 'http://')}&lang=en&currency=USD`);
  await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 });
  await page.click('#splashBtn');
  // sampler: every 2nd animation frame, opaque share of Del's canvas and the x of his feet (rows just above the feet line)
  await page.evaluate(() => { window.__px = []; let k = 0; const cv = document.querySelector('#delFig canvas'), g = cv.getContext('2d');
    const f = () => { if (k++ % 2 === 0) { const d = g.getImageData(0, 0, cv.width, cv.height).data, W = cv.width, y0 = Math.round(cv.height * .93), y1 = Math.round(cv.height * .985);
      let op = 0, fx = 0, fn = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 128) op++;
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) { fx += x; fn++; }
      window.__px.push({ op: op / (d.length / 16), fx: fn ? fx / fn : -1, clip: DEL.state().clip }); }
      requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await page.evaluate(() => { window.__seq = []; new MutationObserver(() => window.__seq.push(document.getElementById('del').dataset.state)).observe(document.getElementById('del'), { attributes: true, attributeFilter: ['data-state'] }); });
  await page.waitForTimeout(2500); // preloadAll after lateArt
  // idle: every drawn frame is the next one in the loop (or the same one held), never a frame from elsewhere in the clip
  await page.evaluate(() => { window.__drawn = []; });
  await page.waitForTimeout(4500);
  { const d = (await page.evaluate(() => window.__drawn)).map(x => x[1]).filter(u => /^idle_\d+\.webp$/.test(u)).map(u => +u.match(/\d+/)[0]);
    const n = 95, bad = d.slice(1).map((v, i) => [d[i], v]).filter(([a, b]) => { const st = (b - a + (n - 1)) % (n - 1); return !(st <= 2 || (a === n - 1 && b <= 1)); });
    ok('idle frames drawn in order (4.5 s)', d.length > 60 && bad.length === 0, `${d.length} draws, ${new Set(d).size} frames, out of order: ${bad.slice(0, 5).map(x => x.join('→')).join(' ')}`); }
  const loaded = await page.evaluate(() => Object.keys(DEL.CLIPS).length);
  ok('13 clips known', loaded === 13);
  await page.screenshot({ path: `${OUT}/del_idle_1280.png`, clip: { x: 0, y: 0, width: 420, height: 592 } });
  const chain = async (steps, wait) => { await page.evaluate(() => { window.__seq = []; }); for (const s of steps) { await page.evaluate(x => DEL.set(x), s); await page.waitForTimeout(wait); } return page.evaluate(() => window.__seq); };
  let seq = await chain(['lean'], 1600);
  ok('idle → lean_in → lean loop', seq.join('>') === 'lean_in>lean', seq.join('>'));
  await page.screenshot({ path: `${OUT}/del_lean_1280.png`, clip: { x: 0, y: 0, width: 420, height: 592 } });
  seq = await chain(['idle'], 1600);
  ok('lean → lean_out → idle', seq.join('>') === 'lean_out>idle', seq.join('>'));
  seq = await chain(['cheer'], 3800);
  ok('cheer one-shot returns to idle', seq.join('>') === 'cheer>idle', seq.join('>'));
  seq = await chain(['pause'], 1700); seq = seq.concat(await chain(['cheer'], 6500));
  ok('pause → (out) → cheer → idle', seq.join('>') === 'pause_in>pause>pause_out>cheer>idle', seq.join('>'));
  seq = await chain(['bored'], 2500); seq = seq.concat(await chain(['spin'], 1600));
  ok('bored → spin perks up to idle', seq.join('>') === 'bored_in>bored>bored_out>idle', seq.join('>'));
  seq = await chain(['lean'], 1500); seq = seq.concat(await chain(['wow'], 4400));
  ok('wow interrupts lean and lands on idle', seq.slice(-2).join('>') === 'wow>idle' && seq[0] === 'lean_in', seq.join('>'));
  const px = await page.evaluate(() => window.__px.slice(1));
  const minOp = Math.min(...px.map(p => p.op)), fxs = px.filter(p => !/^(cheer|wow|rew)/.test(p.clip)).map(p => p.fx);
  ok('figure drawn in every sampled frame', px.length > 200 && minOp > 0.2, `${px.length} frames, min opaque share ${minOp.toFixed(3)}`);
  { const by = {}; px.forEach(p => { const b = by[p.clip] = by[p.clip] || [9e9, -9e9]; b[0] = Math.min(b[0], p.fx); b[1] = Math.max(b[1], p.fx); }); console.log('feet x by clip', JSON.stringify(by)); }
  ok('feet stay in place through pose changes (±4 px)', Math.max(...fxs) - Math.min(...fxs) <= 8, `feet x ${Math.min(...fxs).toFixed(1)}–${Math.max(...fxs).toFixed(1)}`);
  // block classes
  await page.evaluate(() => DEL.event('spin')); ok('spin marks the block without moving it', await page.evaluate(() => { const r = document.getElementById('del'); return r.classList.contains('spin') && getComputedStyle(document.getElementById('delBlock')).transform === 'none'; }));
  await page.evaluate(() => DEL.event('stop')); ok('stop clears it', await page.evaluate(() => !document.getElementById('del').classList.contains('spin')));
  // a real round with a big win overlay
  await page.evaluate(() => { window.__game.S.turbo = true; });
  await ctl('force=win'); await page.evaluate(() => window.__game.spin()); await page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 60000 });
  const settled = await page.waitForFunction(() => ['idle', 'bored_loop'].includes(DEL.state().clip), null, { timeout: 12000 }).then(() => true, () => false);
  ok('after a round Del settles on idle (or bored)', settled, JSON.stringify(await page.evaluate(() => DEL.state())));
  // portrait: no stand
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  ok('portrait hides the stand', await page.evaluate(() => getComputedStyle(document.getElementById('delStand')).display === 'none'));
  await page.screenshot({ path: `${OUT}/del_port_390.png` });
  ok('no page/console errors', errors.length === 0, errors.join(' | '));
  await browser.close(); console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
