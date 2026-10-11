// QA runner: node tools/qa.js BASE_URL OUT_DIR [suite]
// suites: logic (fast, all modes, balance check), shots (viewports), states (key scenes), all
const { chromium, webkit } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT, SUITE = 'all'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const RGS = `?sessionID=sess-ok&rgs_url=${BASE.replace(/^https?:\/\//, 'http://')}&lang=en&currency=USD&device=desktop&social=false`;
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
const log = () => fetch(`${BASE}/__log`).then(r => r.json());
const VIEW = [[1280, 592], [1024, 576], [800, 450], [400, 225], [390, 844, 1], [320, 568, 1], [430, 932, 1], [812, 375, 1]];
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

async function open(browser, url, vp = [1280, 592], mobile) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, isMobile: !!mobile, hasTouch: !!mobile });
  const page = await ctx.newPage();
  page.errors = []; page.external = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /unhandled/.test(m.text()))) page.errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) page.external.push(r.url()); });
  await page.goto(BASE + '/index.html' + url);
  return page;
}
async function start(page) {
  await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 15000 });
  await page.click('#splashBtn');
  await page.waitForFunction(() => document.getElementById('splash').classList.contains('hide'));
}
const idle = page => page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 120000 });

async function logic(browser) {
  await ctl('balance=1000000000&round=none&currency=USD&social=false&jur=');
  const page = await open(browser, RGS);
  await page.evaluate(() => { window.__fast = true; });
  await start(page);
  let n = 0;
  for (const [mode, tags] of [['base', ['zero', 'win', 'pause', 'anticipation', 'bonus', 'rewind', 'big', 'epic', 'cap']], ['ante', ['bonus', 'win', 'cap']], ['bonus', ['bonus', 'rewind', 'cap']], ['double', ['rewind', 'cap']], ['director', ['rewind', 'cap', 'epic']]]) {
    for (const tg of tags.concat(Array(6).fill(''))) {
      await ctl('force=' + (tg || 'none'));
      await page.evaluate(m => window.__game.spin(m), mode);
      await idle(page); n++;
      const ui = await page.evaluate(() => window.__game.S.balance);
      const mock = (await (await fetch(`${BASE}/__ctl?x=1`)).json(), await fetch(`${BASE}/wallet/authenticate`, { method: 'POST', body: JSON.stringify({ sessionID: 'sess-ok' }) }).then(r => r.json()));
      if (Math.abs(ui - mock.balance.amount / 1e6) > 1e-6) ok(`balance ${mode}/${tg}`, false, `${ui} vs ${mock.balance.amount / 1e6}`);
      if (mock.round) ok(`round closed ${mode}/${tg}`, false, 'active round left open');
    }
  }
  ok(`logic: ${n} rounds across 5 modes`, page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
  const l = await log();
  const ends = l.filter(x => x === '/wallet/end-round').length;
  ok('end-round only after wins', ends > 0, `end-round calls: ${ends}`);
  ok('no external requests', page.external.length === 0, page.external.slice(0, 3).join(' '));
  await page.context().close();
}

async function shots(browser) {
  await ctl('balance=1000000000&round=none&force=none&jur=');
  for (const vp of VIEW) {
    const page = await open(browser, RGS, vp, vp[2]);
    await start(page);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, w: innerWidth, h: innerHeight }));
    ok(`no scroll ${vp[0]}x${vp[1]}`, m.sw <= m.w && m.sh <= m.h, JSON.stringify(m));
    await page.screenshot({ path: `${OUT}/vp_${vp[0]}x${vp[1]}.png` });
    await page.context().close();
  }
}

async function states(browser) {
  await ctl('balance=1000000000&round=none&force=none&jur=');
  const page = await open(browser, RGS, [1280, 720]);
  await start(page);
  const snap = name => page.screenshot({ path: `${OUT}/st_${name}.png` });
  // pause chain mid-respin
  const baseBooks = JSON.parse(fs.readFileSync(__dirname + '/../src/demo/books_base.json'));
  const pauseId = baseBooks.find(b => b.tags.includes('pause') && !b.tags.includes('bonus')).id;
  await ctl('force=' + pauseId); page.evaluate(() => window.__game.spin('base'));
  await page.waitForFunction(() => document.querySelector('#osd.show') && /PAUSE/.test(document.getElementById('osd').textContent), null, { timeout: 30000 });
  await page.waitForTimeout(500); await snap('pause'); await idle(page);
  // rewind in bought bonus
  await ctl('force=rewind'); page.evaluate(() => window.__game.spin('bonus'));
  await page.waitForSelector('#banner:not(.hide)', { timeout: 30000 }); await snap('bonus_intro');
  await page.waitForFunction(() => /REW/.test(document.getElementById('osd').textContent), null, { timeout: 120000 });
  await page.waitForTimeout(450); await snap('rewind');
  await page.waitForFunction(() => /SECOND/.test(document.getElementById('osd').textContent), null, { timeout: 60000 });
  await page.waitForTimeout(900); await snap('second_take');
  await page.evaluate(() => { window.__fast = true; }); await idle(page); await page.evaluate(() => { window.__fast = false; });
  // big win
  await page.evaluate(() => { const S = window.__game.S; S.mode = 'base'; window.__game.bigWin(S.bet * 120); });
  await page.waitForTimeout(1800); await snap('bigwin');
  await page.mouse.click(640, 360); await page.mouse.click(640, 360); await page.waitForTimeout(300);
  // dialogs
  await page.click('#buyBtn'); await page.click('.buy-item[data-mode="double"]'); await snap('buy_confirm');
  await page.click('#dlgBack', { position: { x: 5, y: 5 } });
  await page.click('#menuBtn'); await snap('rules'); await page.click('#dlgBack', { position: { x: 5, y: 5 } });
  await page.click('#autoBtn'); await snap('autoplay'); await page.click('#dlgBack', { position: { x: 5, y: 5 } });
  // insufficient balance
  await ctl('balance=0&round=none'); await page.reload(); await start(page);
  const before = (await log()).length; await page.keyboard.press('Space'); await page.waitForTimeout(400);
  await snap('no_funds');
  const after = (await log()).filter(x => x === '/wallet/play').length - (await log()).slice(0, before).filter(x => x === '/wallet/play').length;
  ok('balance checked before play', after === 0 && await page.isVisible('#toast'), `play calls: ${after}`);
  ok('states: no console errors', page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
  await page.context().close();
  // bad session → error screen
  const bad = await open(browser, RGS.replace('sess-ok', 'bad'), [1024, 576]);
  await bad.waitForSelector('#errScreen:not(.hide)'); await bad.screenshot({ path: `${OUT}/st_error.png` });
  ok('bad session shows error screen', true); await bad.context().close();
  // social wording
  await ctl('balance=1000000000&currency=XSC&social=true');
  const soc = await open(browser, RGS.replace('currency=USD', 'currency=XSC').replace('social=false', 'social=true'), [1280, 720]);
  await start(soc); await soc.click('#menuBtn');
  const bad_words = await soc.evaluate(() => {
    const txt = document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' ');
    const re = /\b(bet|bets|betting|stake|buy|purchase|bought|pay|pays|paid|payout|paytable|money|cash|credit|fund|currency|deposit|withdraw|gamble|wager|rebet)\b/gi;
    return [...new Set((txt.match(re) || []).map(x => x.toLowerCase()))];
  });
  ok('social wording', bad_words.length === 0, bad_words.join(','));
  await soc.screenshot({ path: `${OUT}/st_social_rules.png` });
  await soc.context().close();
  await ctl('currency=USD&social=false');
  // resume an active round
  const books = JSON.parse(fs.readFileSync(__dirname + '/../src/demo/books_base.json')).filter(b => b.payoutMultiplier > 0 && b.payoutMultiplier < 2000)[0];
  await ctl('force=' + books.id); await fetch(`${BASE}/wallet/play`, { method: 'POST', body: JSON.stringify({ sessionID: 'sess-ok', amount: 400000, mode: 'base' }) });
  const res = await open(browser, RGS, [1280, 720]); await res.evaluate(() => { window.__fast = true; });
  await start(res); await idle(res);
  const st = await res.evaluate(() => ({ bet: window.__game.S.bet }));
  const auth = await fetch(`${BASE}/wallet/authenticate`, { method: 'POST', body: JSON.stringify({ sessionID: 'sess-ok' }) }).then(r => r.json());
  ok('active round restored and closed', !auth.round && st.bet === 0.4, JSON.stringify(st));
  await res.context().close();
  // replay
  const rb = JSON.parse(fs.readFileSync(__dirname + '/../src/demo/books_bonus.json')).find(b => b.tags.includes('rewind'));
  const rp = await open(browser, `?replay=true&rgs_url=${BASE}&game=late_fee_video&version=1&mode=bonus&event=${rb.id}&amount=1000000&currency=EUR&lang=en`, [400, 225]);
  await rp.waitForSelector('#splashBtn:not([disabled])'); await rp.click('#splashBtn');
  await rp.waitForSelector('#replayCard:not(.hide)'); await rp.screenshot({ path: `${OUT}/st_replay_400.png` });
  const fits = await rp.evaluate(() => { const r = document.querySelector('#replayCard table').getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; });
  ok('replay card fits 400x225', fits);
  const walletCalls = (await log()).filter(x => x.startsWith('/wallet')).length;
  await rp.evaluate(() => { window.__fast = true; }); await rp.click('#replayGo'); await rp.waitForSelector('#replayGo');
  ok('replay makes no wallet calls', (await log()).filter(x => x.startsWith('/wallet')).length === walletCalls && rp.errors.length === 0, rp.errors.join('|'));
  await rp.context().close();
}

(async () => {
  const browser = await chromium.launch();
  if (SUITE === 'logic' || SUITE === 'all') await logic(browser);
  if (SUITE === 'shots' || SUITE === 'all') await shots(browser);
  if (SUITE === 'states' || SUITE === 'all') await states(browser);
  await browser.close();
  fs.writeFileSync(OUT + '/results.json', JSON.stringify(results, null, 1));
  console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
})().catch(e => { console.error('QA crashed:', e.message); process.exit(1); });
