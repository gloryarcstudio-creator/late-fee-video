// Key scenes at every stage-8 viewport: node tools/qa_scenes.js BASE_URL OUT_DIR [WxH,...]
// splash, pause, bonus (rewind), big win, catalog, rules, autoplay; checks that HUD controls stay clickable after each overlay closes
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT, ONLY] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const RGS = `?sessionID=sess-ok&rgs_url=${BASE}&lang=en&currency=USD&device=desktop&social=false`;
let VIEW = [[1280, 592], [1024, 576], [800, 450], [400, 225], [390, 844, 1], [320, 568, 1], [430, 932, 1], [812, 375, 1]];
if (ONLY) VIEW = VIEW.filter(v => ONLY.split(',').includes(v[0] + 'x' + v[1]));
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const baseBooks = JSON.parse(fs.readFileSync(__dirname + '/../src/demo/books_base.json'));
const pauseId = baseBooks.find(b => b.tags.includes('pause') && !b.tags.includes('bonus')).id;
const idle = p => p.waitForFunction(() => !window.__game.S.busy, null, { timeout: 180000 });
const closeDlg = p => p.click('#dlgBack', { position: { x: 3, y: 3 } });

(async () => {
  const browser = await chromium.launch();
  await ctl('balance=1000000000&round=none&force=none&jur=');
  for (const vp of VIEW) {
    const tag = `${vp[0]}x${vp[1]}`;
    const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, isMobile: !!vp[2], hasTouch: !!vp[2], deviceScaleFactor: vp[2] ? 2 : 1 });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const snap = n => page.screenshot({ path: `${OUT}/${tag}_${n}.png` });
    await page.goto(BASE + '/index.html' + RGS);
    await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 15000 }); await snap('0splash');
    await page.click('#splashBtn'); await page.waitForTimeout(500);
    await ctl('force=' + pauseId); page.evaluate(() => window.__game.spin('base'));
    await page.waitForFunction(() => document.querySelector('#osd.show') && /PAUSE/.test(document.getElementById('osd').textContent), null, { timeout: 30000 });
    await page.waitForTimeout(500); await snap('1pause'); await idle(page);
    await ctl('force=rewind'); page.evaluate(() => window.__game.spin('bonus'));
    await page.waitForSelector('#banner:not(.hide)', { timeout: 30000 }); await page.waitForTimeout(600); await snap('2bonus_intro');
    await page.waitForFunction(() => /REW/.test(document.getElementById('osd').textContent), null, { timeout: 120000 });
    await page.waitForTimeout(450); await snap('3rewind');
    await page.evaluate(() => { window.__fast = true; }); await idle(page); await page.evaluate(() => { window.__fast = false; });
    await page.waitForTimeout(400); await snap('4after_bonus');
    await page.evaluate(() => { const S = window.__game.S; S.mode = 'base'; window.__game.bigWin(S.bet * 120); });
    await page.waitForTimeout(1800); await snap('5bigwin');
    await page.mouse.click(vp[0] / 2, vp[1] / 2); await page.mouse.click(vp[0] / 2, vp[1] / 2); await page.waitForTimeout(500);
    await page.click('#buyBtn'); await page.waitForTimeout(200); await snap('6catalog');
    await page.click('.buy-item[data-mode="double"]'); await page.waitForTimeout(150); await snap('7buy_confirm');
    // the confirmation is its own window over the catalog: whole window on screen, both buttons on top and clickable
    const ask = await page.evaluate(() => { const d = document.getElementById('buyConfirm'), r = d.getBoundingClientRect();
      const hit = id => { const b = document.getElementById(id).getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!(e && e.closest('#' + id)); };
      return { open: !d.classList.contains('hide'), fits: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, yes: hit('buyYes'), no: hit('buyNo') }; });
    ok(`buy confirmation window ${tag}`, ask.open && ask.fits && ask.yes && ask.no, JSON.stringify(ask));
    await page.click('#buyNo'); await page.waitForTimeout(100);
    ok(`cancel returns to the catalog ${tag}`, await page.evaluate(() => document.getElementById('buyConfirm').classList.contains('hide') && !document.getElementById('buyDlg').classList.contains('hide')));
    await closeDlg(page);
    await page.click('#menuBtn'); await page.waitForTimeout(200); await snap('8rules'); await closeDlg(page);
    await page.click('#autoBtn'); await page.waitForTimeout(200); await snap('9autoplay');
    const dlgFits = await page.evaluate(() => { const d = [...document.querySelectorAll('.dlg, .dialog, [role=dialog]')].find(e => e.offsetWidth); if (!d) return 'none'; const r = d.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; });
    ok(`autoplay dialog fits ${tag}`, dlgFits === true, String(dlgFits));
    await closeDlg(page);
    const free = await page.evaluate(() => ['spinBtn', 'menuBtn', 'betPlus'].filter(id => { const b = document.getElementById(id).getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !(e && e.closest('#' + id)); }));
    ok(`HUD clickable after overlays ${tag}`, !free.length, free.join(','));
    ok(`no console errors ${tag}`, !errors.length, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(OUT + '/scenes.json', JSON.stringify(results, null, 1));
  console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
})().catch(e => { console.error('QA crashed:', e.message); process.exit(1); });
