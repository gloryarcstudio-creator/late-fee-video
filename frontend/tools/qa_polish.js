// Stage 8 checks: node tools/qa_polish.js BASE_URL OUT_DIR
// per viewport: controls inside the screen, not overlapping each other, not covered (elementFromPoint), min touch size on phones;
// phone boot weight (bytes before PLAY, deferred art not fetched), Space spins once.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const RGS = `?sessionID=sess-ok&rgs_url=${BASE}&lang=en&currency=USD&device=desktop&social=false`;
const VIEW = [[1280, 592], [1024, 576], [800, 450], [400, 225], [390, 844, 1], [320, 568, 1], [430, 932, 1], [812, 375, 1]];
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
const CTRLS = ['balField', 'betField', 'winField', 'menuBtn', 'soundBtn', 'turboBtn', 'autoBtn', 'spinBtn', 'buyBtn', 'betMinus', 'betPlus', 'tape'];

async function open(browser, vp, mobile) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const page = await ctx.newPage(); page.errors = []; page.bytes = 0; page.urls = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('response', async r => { if (page.urls.includes(r.url())) return; page.urls.push(r.url()); try { const b = await r.body(); page.bytes += b.length; } catch (e) {} });
  await page.goto(BASE + '/index.html' + RGS);
  await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 15000 });
  return page;
}

(async () => {
  const browser = await chromium.launch();
  await ctl('balance=1000000000&round=none&force=none&jur=');
  for (const vp of VIEW) {
    const page = await open(browser, vp, vp[2]);
    const tag = `${vp[0]}x${vp[1]}`;
    if (vp[2]) {
      const mb = page.bytes / 1e6;
      const early = page.urls.filter(u => /bg_bonus|del_(lean|cheer|wow|rew|pause|bored)_\w*strip|ov_|\.mp4|\.webm/.test(u));
      ok(`phone boot ${tag}: ${mb.toFixed(2)} MB before PLAY, deferred art not fetched`, early.length === 0 && mb < 6, early.map(u => u.split('/').pop()).join(' '));
    }
    await page.click('#splashBtn'); await page.waitForTimeout(400);
    const m = await page.evaluate(ids => {
      const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { id, l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
      const rs = ids.map(r).filter(x => x.w > 0);
      const out = rs.filter(x => x.l < -1 || x.t < -1 || x.r > innerWidth + 1 || x.b > innerHeight + 1).map(x => x.id);
      const top = ['betField', 'menuBtn', 'soundBtn', 'turboBtn', 'autoBtn', 'spinBtn', 'buyBtn', 'balField', 'winField', 'tape'];
      const ov = [];
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i], b = rs[j]; if (!top.includes(a.id) || !top.includes(b.id)) continue;
        const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ix > 2 && iy > 2) ov.push(a.id + '/' + b.id);
      }
      const covered = ['menuBtn', 'soundBtn', 'turboBtn', 'autoBtn', 'spinBtn', 'buyBtn', 'betMinus', 'betPlus'].filter(id => {
        const b = document.getElementById(id).getBoundingClientRect(); if (!b.width) return false;
        const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !(e && (e.id === id || e.closest('#' + id)));
      });
      const minBtn = Math.min(...['menuBtn', 'soundBtn', 'turboBtn', 'autoBtn', 'spinBtn', 'betMinus', 'betPlus'].map(id => document.getElementById(id).getBoundingClientRect().width));
      return { out, ov, covered, minBtn: Math.round(minBtn) };
    }, CTRLS);
    ok(`layout ${tag}: controls on screen, no overlap, not covered`, !m.out.length && !m.ov.length && !m.covered.length, JSON.stringify(m));
    if (vp[2]) ok(`touch size ${tag}: smallest button ${m.minBtn}px`, m.minBtn >= 28);
    ok(`no console errors ${tag}`, page.errors.length === 0, page.errors.slice(0, 2).join(' | '));
    if (vp[2]) { await page.waitForTimeout(3000); const late = page.urls.filter(u => /bg_bonus|del\/(m\/)?f\/lean_in_0\./.test(u)); ok(`deferred art loads after PLAY ${tag}`, late.length >= 2, late.length + ''); }
    await page.context().close();
  }
  // Space = one spin; held Space does not queue spins
  const page = await open(browser, [1280, 592]); await page.click('#splashBtn'); await page.waitForTimeout(300);
  const before = (await (await fetch(BASE + '/__log')).json()).filter(x => x === '/wallet/play').length;
  await page.keyboard.down('Space'); await page.waitForTimeout(150); await page.keyboard.up('Space');
  await page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 60000 });
  const after = (await (await fetch(BASE + '/__log')).json()).filter(x => x === '/wallet/play').length;
  ok('Space spins once', after - before === 1, `play calls: ${after - before}`);
  await page.context().close();
  await browser.close();
  fs.writeFileSync(OUT + '/polish.json', JSON.stringify(results, null, 1));
  console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
})().catch(e => { console.error('QA crashed:', e.message); process.exit(1); });
