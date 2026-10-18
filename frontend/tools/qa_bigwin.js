// Big win scenes (batch 08, intros batch 09): node tools/qa_bigwin.js BASE_URL OUT_DIR
// per viewport: a CULT-sized win walks BIG → MEGA → EPIC → CULT, each tier on its own loop (playing, matching the title) for a beat,
// entering through its intro clip that hands over to the loop with no empty frame;
// shots of every tier, the max-win and bonus-total banners; then a bought bonus shows a big win after every 20×+ free spin
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const RGS = `?sessionID=sess-ok&rgs_url=${BASE}&lang=en&currency=USD&device=desktop&social=false`;
const VIEW = [[1280, 720], [1920, 1080], [2560, 1080], [1024, 768], [812, 375, 1], [390, 844, 1], [430, 932, 1]];
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

(async () => {
  const browser = await chromium.launch();
  await ctl('balance=1000000000&round=none&force=none&jur=');
  for (const vp of VIEW) {
    const tag = `${vp[0]}x${vp[1]}`;
    const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, isMobile: !!vp[2], hasTouch: !!vp[2], deviceScaleFactor: vp[2] ? 2 : 1 });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    await page.goto(BASE + '/index.html' + RGS);
    await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 15000 });
    await page.click('#splashBtn'); await page.waitForTimeout(1500);
    // tier log: every frame, which tier the title shows and which video is on and playing
    await page.evaluate(() => {
      window.__bw = []; const t0 = performance.now();
      (function f() {
        const el = document.getElementById('bigWin');
        if (!el.classList.contains('hide')) {
          const on = [...document.querySelectorAll('#bigScene video.on')], v = on.find(x => !x.classList.contains('in')) || on[0];
          window.__bw.push({ t: performance.now() - t0, tier: el.dataset.tier, vid: v && v.dataset.tier, ct: v ? v.currentTime : -1, rs: v ? v.readyState : -1, title: document.getElementById('bigTitle').textContent,
            n: on.length, intro: on.some(x => x.classList.contains('in')), loop: on.some(x => !x.classList.contains('in')) });
        }
        requestAnimationFrame(f);
      })();
      const S = window.__game.S; S.mode = 'base'; window.__bwP = window.__game.bigWin(S.bet * 640);
    });
    const shots = [[900, 'big'], [2300, 'mega'], [3500, 'epic'], [5200, 'cult']]; let prev = 0;
    for (const [ms, n] of shots) { await page.waitForTimeout(ms - prev); prev = ms; await page.screenshot({ path: `${OUT}/${tag}_${n}.png` }); }
    await page.waitForFunction(() => document.getElementById('bigWin').classList.contains('hide'), null, { timeout: 15000 });
    const log = await page.evaluate(() => window.__bw);
    const order = []; const first = {};
    for (const r of log) if (r.tier && order[order.length - 1] !== r.tier) { order.push(r.tier); first[r.tier] = r.t; }
    ok(`${tag} tiers in order`, order.join(',') === 'bigWin,megaWin,epicWin,cultWin', order.join(','));
    const hold = ['bigWin', 'megaWin', 'epicWin'].map((k, i) => first[order[i + 1]] - first[k]);
    ok(`${tag} each tier holds ≥1 s`, hold.every(h => h >= 1000), hold.map(h => Math.round(h)).join('/'));
    ok(`${tag} scene matches title`, log.filter(r => r.tier).every(r => r.vid === r.tier), '');
    const playing = order.map(k => { const rs = log.filter(r => r.tier === k); return rs.length > 2 && Math.max(...rs.map(r => r.ct)) > rs[0].ct + 0.2; }); // loops wrap, so the furthest point counts
    ok(`${tag} every tier loop plays`, playing.every(Boolean), playing.join(','));
    // intros: each tier opens on its intro, then its loop takes over; the scene is never empty while the overlay is up
    const intros = order.map(k => { const rs = log.filter(r => r.tier === k); return rs.length && rs[0].intro; });
    ok(`${tag} every tier enters through its intro`, intros.every(Boolean), intros.join(','));
    const cult = log.filter(r => r.tier === 'cultWin'), handoff = cult.findIndex(r => r.loop);
    ok(`${tag} CULT intro hands over to its loop`, handoff > 0 && cult.slice(handoff).every(r => r.loop) && cult[cult.length - 1].n === 1, `loop from row ${handoff} of ${cult.length}`);
    ok(`${tag} scene never empty`, log.filter(r => r.tier).every(r => r.n >= 1), '');
    // max win and bonus total on the scene layout
    await page.evaluate(() => { window.__game.banner('MAX WIN', '25 000× · $25,000.00', 1500, { video: 'assets/overlay/bw_max_loop.webm', poster: 'assets/overlay/bw_max_key.webp', scene: true }); });
    await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${tag}_max.png` }); await page.waitForTimeout(1300);
    await page.evaluate(() => { window.__game.banner('EPIC WIN', '$1,234.00', 1500, { video: 'assets/overlay/bw_epic_loop.webm', poster: 'assets/overlay/bw_epic_key.webp', scene: true }); });
    await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${tag}_bonus_total.png` }); await page.waitForTimeout(1300);
    await page.evaluate(() => { window.__game.banner('NIGHT SHIFT', '10 SPINS', 800, { video: 'assets/overlay/ov_bonus_intro.webm' }); });
    await page.waitForTimeout(400);
    const intro = await page.evaluate(() => ({ scene: document.getElementById('banner').classList.contains('scene'), loop: document.getElementById('bannerVideo').loop, poster: document.getElementById('bannerVideo').getAttribute('poster') }));
    ok(`${tag} bonus intro banner back to full-bleed`, !intro.scene && !intro.loop && !intro.poster, JSON.stringify(intro));
    await page.waitForTimeout(800);
    // a second big win in the same session plays its scene again (v26 left the last tier's video marked on and paused)
    if (vp === VIEW[0]) {
      await page.evaluate(() => { const S = window.__game.S; window.__bwP = window.__game.bigWin(S.bet * 25); });
      await page.waitForTimeout(2000); // past the 1.5 s intro: the loop is on
      const a = await page.evaluate(() => { const v = document.querySelector('#bigScene video.on'); return v ? v.currentTime : -1; });
      await page.waitForTimeout(500);
      const b = await page.evaluate(() => { const v = document.querySelector('#bigScene video.on'); return v ? v.currentTime : -1; });
      ok(`${tag} second big win plays its scene`, a >= 0 && b > a + 0.2, `${a.toFixed(2)} → ${b.toFixed(2)}`);
      await page.evaluate(() => window.__bwP);
    }
    ok(`${tag} no errors`, !errors.length, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // per free spin: a bought bonus shows a big win right after each spin paying 20×+ the bet (not only the SHIFT OVER total)
  {
    const books = JSON.parse(fs.readFileSync(__dirname + '/../src/demo/books_bonus.json'));
    const want = bk => { let tot = 0, mark = 0, inb = false, k = 0; const out = [];
      for (const e of bk.events) {
        if (e.type === 'setTotalWin') tot = e.amount;
        if (e.type === 'freeSpinTrigger') { inb = true; mark = tot; }
        if (e.type === 'wincap') break;
        if (inb && ((e.type === 'updateFreeSpin' && e.amount > 0) || e.type === 'freeSpinEnd')) { k++; if (tot - mark >= 2000) out.push(k); mark = tot; }
      } return out; };
    const bk = books.map(b => ({ b, w: want(b) })).filter(x => x.w.length >= 2 && !x.b.events.some(e => e.type === 'wincap')).sort((a, b) => a.b.events.length - b.b.events.length)[0];
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + '/index.html' + RGS); await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 15000 });
    await page.click('#splashBtn'); await page.waitForTimeout(800);
    await page.evaluate(() => { window.__open = []; const el = document.getElementById('bigWin');
      new MutationObserver(() => { if (!el.classList.contains('hide')) window.__open.push(document.getElementById('fsVal').textContent.split('/')[0]); }).observe(el, { attributes: true, attributeFilter: ['class'] });
      window.__game.S.turbo = true; });
    await ctl('force=' + bk.b.id); page.evaluate(() => window.__game.spin('bonus'));
    await page.waitForFunction(() => window.__game.S.inBonus, null, { timeout: 60000 });
    await page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 400000 });
    const got = [...new Set(await page.evaluate(() => window.__open))].map(Number);
    ok(`bonus book ${bk.b.id}: big win after free spins ${bk.w.join(',')}`, got.join(',') === bk.w.join(','), 'shown after ' + got.join(','));
    ok('bonus run: no errors', !errors.length, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await browser.close();
  const fail = results.filter(r => !r.pass).length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  process.exit(fail ? 1 : 0);
})();
