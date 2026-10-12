// Del QA: node tools/qa_del.js BASE_URL OUT_DIR — pose chains run on anchor frames, block classes follow events, screenshots of the block.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
let fails = 0; const ok = (n, p, i = '') => { fails += p ? 0 : 1; console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? '  ' + i : '')); };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 592 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await ctl('balance=1000000000&round=none&currency=USD&social=false&jur=');
  await page.goto(`${BASE}/index.html?sessionID=sess-ok&rgs_url=${BASE.replace(/^https?:\/\//, 'http://')}&lang=en&currency=USD`);
  await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 });
  await page.click('#splashBtn');
  await page.evaluate(() => { window.__seq = []; new MutationObserver(() => window.__seq.push(document.getElementById('del').dataset.state)).observe(document.getElementById('del'), { attributes: true, attributeFilter: ['data-state'] }); });
  await page.waitForTimeout(2500); // preloadAll after lateArt
  const loaded = await page.evaluate(() => Object.keys(DEL.CLIPS).length);
  ok('13 clips known', loaded === 13);
  await page.screenshot({ path: `${OUT}/del_idle_1280.png`, clip: { x: 0, y: 0, width: 420, height: 592 } });
  const chain = async (steps, wait) => { await page.evaluate(() => { window.__seq = []; }); for (const s of steps) { await page.evaluate(x => DEL.set(x), s); await page.waitForTimeout(wait); } return page.evaluate(() => window.__seq); };
  let seq = await chain(['lean'], 1600);
  ok('idle → lean_in → lean loop', seq.join('>') === 'lean_in>lean', seq.join('>'));
  await page.screenshot({ path: `${OUT}/del_lean_1280.png`, clip: { x: 0, y: 0, width: 420, height: 592 } });
  seq = await chain(['idle'], 1600);
  ok('lean → lean_out → idle', seq.join('>') === 'lean_out>idle', seq.join('>'));
  seq = await chain(['cheer'], 3200);
  ok('cheer one-shot returns to idle', seq.join('>') === 'cheer>idle', seq.join('>'));
  seq = await chain(['pause'], 1600); seq = seq.concat(await chain(['cheer'], 4500));
  ok('pause → (out) → cheer → idle', seq.join('>') === 'pause_in>pause>pause_out>cheer>idle', seq.join('>'));
  seq = await chain(['bored'], 2200); seq = seq.concat(await chain(['spin'], 1600));
  ok('bored → spin perks up to idle', seq.join('>') === 'bored_in>bored>bored_out>idle', seq.join('>'));
  seq = await chain(['lean'], 1500); seq = seq.concat(await chain(['wow'], 3600));
  ok('wow interrupts lean and lands on idle', seq.slice(-2).join('>') === 'wow>idle' && seq[0] === 'lean_in', seq.join('>'));
  // block classes
  await page.evaluate(() => DEL.event('spin')); ok('spin shifts the block', await page.evaluate(() => document.getElementById('del').classList.contains('spin')));
  await page.evaluate(() => DEL.event('stop')); ok('stop clears it', await page.evaluate(() => !document.getElementById('del').classList.contains('spin')));
  // a real round with a big win overlay
  await page.evaluate(() => { window.__game.S.turbo = true; });
  await ctl('force=win'); await page.evaluate(() => window.__game.spin()); await page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 60000 });
  const st = await page.evaluate(() => DEL.state());
  ok('after a round Del is idle or settling', ['idle', 'cheer_t', 'bored_in', 'bored_loop'].includes(st.clip), JSON.stringify(st));
  // portrait: no stand
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  ok('portrait hides the stand', await page.evaluate(() => getComputedStyle(document.getElementById('delStand')).display === 'none'));
  await page.screenshot({ path: `${OUT}/del_port_390.png` });
  ok('no page/console errors', errors.length === 0, errors.join(' | '));
  await browser.close(); console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
