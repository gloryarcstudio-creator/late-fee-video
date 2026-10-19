// Frame-exact recording of Del: node tools/rec_del.js BASE_URL OUT.mp4
// A screen recorder in a headless browser drops and repeats frames, so its videos stutter even when the game does not. Here the
// page runs on a paused clock (Playwright page.clock) that is advanced by exactly 1/60 s per step, and each step is screenshotted,
// so the video shows what the game draws at 60 fps. Del goes idle → lean → idle → cheer → pause → idle → wow. Needs ffmpeg.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [BASE, OUT] = process.argv.slice(2);
const PLAN = [[0, 'idle'], [240, 'lean'], [420, 'idle'], [540, 'cheer'], [780, 'pause'], [900, 'idle'], [1020, 'wow']], N = 1260, SKIP = 30;
(async () => {
  const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(OUT)), 'rec_del_'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`${BASE}/index.html?sessionID=sess-ok&rgs_url=${BASE}&lang=en&currency=USD&device=desktop&social=false`);
  await p.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 });
  await p.click('#splashBtn'); await p.waitForTimeout(8000);           // every clip fetched
  const r = await p.evaluate(() => { const b = document.getElementById('del').getBoundingClientRect(); return { x: Math.max(0, b.x - 60), y: Math.max(0, b.y - 20), w: b.width + 120, h: b.height + 60 }; });
  const clip = { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w / 2) * 2, height: Math.round(r.h / 2) * 2 };
  await p.clock.install(); await p.clock.pauseAt(Date.now() + 1000);
  const plan = new Map(PLAN.map(([k, s]) => [k + SKIP, s]));
  for (let k = 0; k < N + SKIP; k++) {
    if (plan.has(k)) await p.evaluate(s => DEL.set(s), plan.get(k));
    await p.clock.runFor(1000 / 60);
    await p.waitForTimeout(15);                                             // let the frames decoded ahead arrive
    if (k >= SKIP) await p.screenshot({ path: path.join(tmp, `f${String(k - SKIP).padStart(4, '0')}.png`), clip });
  }
  await b.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '60', '-i', path.join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${OUT}: ${N} frames at 60 fps, ${clip.width}x${clip.height}`);
})();
