# Late Fee Video — front end (grey prototype)

- `src/` — the game: `index.html`, `css/game.css`, `js/` (`i18n` strings/money, `audio` Web Audio engine, `del` character state machine, `net` RGS + local demo, `reels`, `game` event player and UI), `demo/` sampled books.
- `tools/sample_books.py PUBLISH_DIR src/demo` — sample real books by lookup weight + tagged scenes; writes `js/mathdata.js` (cost, RTP, max win per mode).
- `tools/mock_rgs.py src src/demo 8765` — mock Stake RGS on the sampled books (`/__ctl?force=<tag|id>`, `/__log`).
- `tools/qa.js http://127.0.0.1:8765 OUT [logic|shots|states|all]` — Playwright checks and screenshots.
- `tools/qa_audio.js http://127.0.0.1:8765` — real-time audio scene checks (music per scene, loops, mute).
- `tools/qa_del.js http://127.0.0.1:8765 OUT` — Del pose chains on anchor frames and character-block events.
- `tools/art/cut_del_strips.py SRC OUT [scale] [mobile]` — Del strips from the 720×1080 animated WebP sources (one shared crop box, rows for long clips).
- `tools/audio/synth.py src/assets/audio [names]` — regenerate the sounds and `audio.json` (see AUDIO.md).
- `tools/scan_books.py PUBLISH_DIR OUT` — full math check (RTP/max/hit per mode, books vs lookup tables, event types) and a real-book set for the mock.
- `tools/qa_stage9.js http://127.0.0.1:PORT OUT OUT/scan.json [suites]` — pre-submission checklist by Engine ID (RGS, bets, restore, social, replay, currencies, 16 languages, console, external hosts).
- `tools/build_fe.py N [--no-demo]` → `fe_build/`; `tools/pack_fe.sh N` → `dist/` zip (<30 MB parts).

Launch with RGS: `index.html?sessionID=sess-ok&rgs_url=http://127.0.0.1:8765&lang=en&currency=USD`. Without params the game runs the local demo; add `?dev=1` (or `#dev`) for scenario buttons.
