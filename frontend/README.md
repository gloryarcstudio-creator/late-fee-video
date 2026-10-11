# Late Fee Video — front end (grey prototype)

- `src/` — the game: `index.html`, `css/game.css`, `js/` (`i18n` strings/money, `audio` Web Audio engine, `net` RGS + local demo, `reels`, `game` event player and UI), `demo/` sampled books.
- `tools/sample_books.py PUBLISH_DIR src/demo` — sample real books by lookup weight + tagged scenes; writes `js/mathdata.js` (cost, RTP, max win per mode).
- `tools/mock_rgs.py src src/demo 8765` — mock Stake RGS on the sampled books (`/__ctl?force=<tag|id>`, `/__log`).
- `tools/qa.js http://127.0.0.1:8765 OUT [logic|shots|states|all]` — Playwright checks and screenshots.
- `tools/qa_audio.js http://127.0.0.1:8765` — real-time audio scene checks (music per scene, loops, mute).
- `tools/audio/synth.py src/assets/audio [names]` — regenerate the sounds and `audio.json` (see AUDIO.md).
- `tools/build_fe.py N [--no-demo]` → `fe_build/`; `tools/pack_fe.sh N` → `dist/` zip (<30 MB parts).

Launch with RGS: `index.html?sessionID=sess-ok&rgs_url=http://127.0.0.1:8765&lang=en&currency=USD`. Without params the game runs the local demo; add `?dev=1` (or `#dev`) for scenario buttons.
