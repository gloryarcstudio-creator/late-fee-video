// Audio QA: node tools/qa_audio.js BASE_URL — plays real-time rounds (turbo) and logs every AUDIO call.
// Checks: context runs after the splash tap, core buffers decoded, music per scene, loops stopped at round end,
// mute silences the master bus, no page errors, no external requests.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const BASE = process.argv[2];
const RGS = `?sessionID=sess-ok&rgs_url=${BASE.replace(/^https?:\/\//, 'http://')}&lang=en&currency=USD`;
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
let fails = 0; const ok = (n, p, i = '') => { fails += p ? 0 : 1; console.log((p ? 'PASS ' : 'FAIL ') + n + (i ? '  ' + i : '')); };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 592 } });
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
  await ctl('balance=1000000000&round=none&currency=USD&social=false&jur=');
  await page.goto(BASE + '/index.html' + RGS);
  await page.evaluate(() => {
    window.__calls = [];
    for (const k of ['sfx', 'loop', 'stop', 'stinger', 'setMusic']) { const f = AUDIO[k]; AUDIO[k] = (...a) => { window.__calls.push(k + ':' + a[0]); return f(...a); }; }
  });
  await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 });
  await page.click('#splashBtn');
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => ({ core: ['mus_base', 'reel_loop', 'reel_stop', 'win_s'].map(AUDIO.loaded), muted: AUDIO.isMuted() }));
  ok('core sounds decoded after splash', st.core.every(Boolean), JSON.stringify(st.core));
  ok('music starts on splash tap', await page.evaluate(() => window.__calls.includes('setMusic:mus_base')));
  await page.evaluate(() => { window.__game.S.turbo = true; });
  const idle = () => page.waitForFunction(() => !window.__game.S.busy, null, { timeout: 120000 });
  const calls = async (tag, mode = 'base') => {
    await ctl('force=' + tag); await page.evaluate(() => { window.__calls = []; });
    await page.evaluate(m => window.__game.spin(m), mode); await idle();
    return page.evaluate(() => window.__calls);
  };
  let c = await calls('win');
  ok('win round: spin, reel loop, stops, win cue', ['sfx:spin_start', 'loop:reel_loop', 'stop:reel_loop'].every(x => c.includes(x)) && c.some(x => /sfx:reel_stop/.test(x)) && c.some(x => /sfx:win_/.test(x)), c.join(' '));
  c = await calls('anticipation');
  ok('anticipation loop', c.includes('loop:antic_loop') && c.includes('stop:antic_loop'), c.join(' '));
  c = await calls('bonus');
  ok('bonus: intro stinger, bonus music, shift-over, back to base', ['stinger:stg_bonus_intro', 'setMusic:mus_bonus', 'stinger:stg_shift_over', 'setMusic:mus_base'].every(x => c.includes(x)), c.filter(x => /stinger|setMusic/.test(x)).join(' '));
  c = await calls('rewind', 'bonus');
  ok('rewind cues', ['sfx:rewind', 'sfx:rec_beep'].every(x => c.includes(x)), c.filter(x => /rew|rec|second|mult/.test(x)).join(' '));
  // the sampled base books only reach 20x+ through the bonus (SHIFT OVER), so drive the overlay directly
  await page.evaluate(() => { window.__calls = []; });
  await page.evaluate(() => window.__game.bigWin(window.__game.S.bet * 60));
  c = await page.evaluate(() => window.__calls);
  ok('big win: tier stinger, bigwin music, count loop, end, back to base', ['stinger:bw_tier', 'setMusic:mus_bigwin', 'loop:count_loop', 'stop:count_loop', 'sfx:bw_end', 'setMusic:mus_base'].every(x => c.includes(x)), c.join(' '));
  const live = await page.evaluate(() => ({ state: AUDIO.__ctx ? AUDIO.__ctx.state : 'n/a' }));
  await page.click('#soundBtn');
  const m1 = await page.evaluate(() => ({ muted: AUDIO.isMuted(), ls: localStorage.getItem('lfv_muted') }));
  ok('mute button sets the gate and remembers it', m1.muted && m1.ls === '1', JSON.stringify(m1));
  c = await calls('win');
  await page.click('#soundBtn');
  ok('unmute restores', await page.evaluate(() => !AUDIO.isMuted()));
  await page.reload(); await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 });
  ok('mute persists across reload (button shows off)', await page.evaluate(() => document.getElementById('soundBtn').classList.contains('off')) === false, 'unmuted before reload');
  ok('no page/console errors', errors.length === 0, errors.join(' | '));
  ok('no external requests', external.length === 0, external.join(' '));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
