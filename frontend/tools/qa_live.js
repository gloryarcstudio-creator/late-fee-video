// Living scene QA (batch 06): node tools/qa_live.js BASE_URL OUT_DIR — background and TV-frame loops on desktop, stills on phones and
// under reduced motion, bonus crossfade, win plate, spin burst, parallax; screenshots of the scene.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
let fails = 0; const ok = (n, p, i = '') => { fails += p ? 0 : 1; console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? '  ' + i : '')); };
const URL = `${BASE}/index.html?sessionID=sess-ok&rgs_url=${BASE.replace(/^https?:\/\//, 'http://')}&lang=en&currency=USD`;
async function open(browser, viewport, opts = {}) {
  const page = await browser.newPage({ viewport, ...opts });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await ctl('balance=1000000000&round=none&force=none&jur=');
  await page.goto(URL); await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 }); await page.click('#splashBtn');
  await page.waitForTimeout(3500); // lateArt + video start
  return { page, errors };
}
const vid = (page, sel) => page.evaluate(s => { const v = document.querySelector(s); return v ? { on: v.classList.contains('on'), paused: v.paused, t: v.currentTime, src: v.currentSrc, op: getComputedStyle(v).opacity } : null; }, sel);
(async () => {
  const browser = await chromium.launch();
  // desktop
  let { page, errors } = await open(browser, { width: 1280, height: 720 });
  const t0 = Date.now(); await page.waitForFunction(() => document.querySelector('#bg video.base.on') && document.querySelector('#tvFrame video.loop.on'), null, { timeout: 20000 }).catch(() => {});
  console.log('loops started after PLAY: ' + (Date.now() - t0 + 3500) + ' ms'); await page.waitForTimeout(800);
  let b = await vid(page, '#bg video.base'), tv = await vid(page, '#tvFrame video.loop');
  ok('desktop: base background loop plays', b && b.on && !b.paused && b.t > 0, JSON.stringify(b));
  ok('desktop: TV frame loop plays with alpha', tv && tv.on && !tv.paused && tv.t > 0, JSON.stringify(tv));
  ok('desktop: stage.live', await page.evaluate(() => document.getElementById('stage').classList.contains('live')));
  await page.screenshot({ path: `${OUT}/live_base_1280.png` });
  // reels still visible through the frame (the screen window of the alpha loop is transparent): a symbol pixel is not black
  const px = await page.evaluate(() => { const r = document.querySelector('.reel').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  const shot = await page.screenshot({ clip: { x: px[0] - 2, y: px[1] - 2, width: 4, height: 4 } });
  const { PNG } = (() => { try { return require(require('child_process').execSync('npm root -g').toString().trim() + '/pngjs'); } catch (e) { return {}; } })();
  if (PNG) { const im = PNG.sync.read(shot); const sum = im.data[0] + im.data[1] + im.data[2]; ok('desktop: reel symbol visible through the frame loop', sum > 60, 'rgb sum ' + sum); }
  // parallax
  await page.mouse.move(100, 100); await page.waitForTimeout(100); const tr1 = await page.evaluate(() => document.getElementById('bg').style.transform);
  await page.mouse.move(1180, 620); await page.waitForTimeout(100); const tr2 = await page.evaluate(() => document.getElementById('bg').style.transform);
  ok('desktop: pointer parallax moves #bg', tr1 && tr2 && tr1 !== tr2, tr1 + ' | ' + tr2);
  // spin: burst at start, gold plate while wins show
  await page.evaluate(() => { window.__seq = []; new MutationObserver(() => window.__seq.push(document.getElementById('tv').className)).observe(document.getElementById('tv'), { attributes: true, attributeFilter: ['class'] }); window.__game.S.turbo = true; });
  await ctl('force=win'); page.evaluate(() => { window.__game.spin(); });
  await page.waitForTimeout(90); await page.screenshot({ path: `${OUT}/live_burst_1280.png`, clip: { x: 220, y: 0, width: 840, height: 720 } });
  await page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 60000 });
  ok('spin: static burst class seen', await page.evaluate(() => window.__seq.some(c => /burst/.test(c))), await page.evaluate(() => window.__seq.join(',')));
  ok('win: frame plate on', await page.evaluate(() => document.getElementById('stage').classList.contains('tvwin') && +getComputedStyle(document.querySelector('#tvFrame .st.win')).opacity > 0.3), await page.evaluate(() => getComputedStyle(document.querySelector('#tvFrame .st.win')).opacity));
  // the TV loop really moves: sample the top bezel of the video twice
  const bez = () => page.evaluate(() => { const v = document.querySelector('#tvFrame video.loop'); const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 1432, 60, 0, 0, 128, 8); return Array.from(g.getImageData(0, 0, 128, 8).data); });
  const s1 = await bez(); await page.waitForTimeout(1500); const s2 = await bez();
  const dsum = s1.reduce((a, x, i) => a + Math.abs(x - s2[i]), 0);
  ok('TV loop: bezel pixels change over time', dsum > 500, 'diff ' + dsum);
  await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/live_win_1280.png`, clip: { x: 220, y: 0, width: 840, height: 720 } });
  // bonus: cold plate + bonus video fade in, base video pauses
  await ctl('force=rewind'); page.evaluate(() => window.__game.spin('bonus'));
  await page.waitForFunction(() => document.getElementById('stage').classList.contains('bonus'), null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const bv = await vid(page, '#bg video.bonus'); b = await vid(page, '#bg video.base');
  ok('bonus: bonus background loop plays and is visible', bv && bv.on && !bv.paused && bv.op === '1', JSON.stringify(bv));
  ok('bonus: base loop paused after the crossfade', b && b.paused, JSON.stringify(b));
  ok('bonus: cold frame plate on', await page.evaluate(() => getComputedStyle(document.querySelector('#tvFrame .st.bonus')).opacity === '1'));
  await page.waitForSelector('#banner:not(.hide)', { timeout: 30000 }).catch(() => {}); await page.click('#banner').catch(() => {});
  await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}/live_bonus_1280.png` });
  await page.evaluate(() => { window.__fast = true; }); await page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 120000 }); await page.evaluate(() => { window.__fast = false; });
  await page.waitForTimeout(1500);
  b = await vid(page, '#bg video.base'); const bv2 = await vid(page, '#bg video.bonus');
  ok('after bonus: base loop back, bonus loop paused and hidden', b && !b.paused && bv2 && bv2.paused && bv2.op === '0', JSON.stringify(b) + ' ' + JSON.stringify(bv2));
  ok('desktop: no page errors', errors.length === 0, errors.join(' | '));
  await page.close();
  // phone portrait: stills only
  ({ page, errors } = await open(browser, { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }));
  ok('phone: no background video created', await page.evaluate(() => document.querySelectorAll('#bg video').length === 0));
  ok('phone: TV loop not loaded', await page.evaluate(() => !document.querySelector('#tvFrame video.loop').getAttribute('src')));
  ok('phone: no page errors', errors.length === 0, errors.join(' | '));
  await page.close();
  // reduced motion on desktop: stills only
  ({ page, errors } = await open(browser, { width: 1280, height: 720 }, { reducedMotion: 'reduce' }));
  ok('reduced motion: no background video', await page.evaluate(() => document.querySelectorAll('#bg video').length === 0));
  ok('reduced motion: TV loop not loaded', await page.evaluate(() => !document.querySelector('#tvFrame video.loop').getAttribute('src')));
  await page.close();
  await browser.close();
  console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
