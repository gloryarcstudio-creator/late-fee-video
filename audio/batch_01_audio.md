# Пачка 01 — звук и музыка Late Fee Video (промпты для внешней генерации)

Имена файлов, длительности и петли должны совпадать с `AUDIO.md` §2: готовый файл кладём в `frontend/src/assets/audio/<имя>.mp3` поверх синтезированной версии, код трогать не нужно. Если длительность отличается, поправить `dur` (и `loop`) в `audio.json`.

**Общий стиль (добавлять к каждому промпту):** 1989 video rental store at night, VHS aesthetic, analog synths and drum machine, slightly warm and dull top end (tape), no vocals, no lyrics, no spoken words.

**Форматы:** музыка стерео, 44.1 кГц, mp3 128 kbps или wav (пережмём сами); sfx моно, сухие, без длинного реверб-хвоста. Петли: просить «seamless loop», точное число тактов и BPM; стык проверим скриптом.

**Чем генерировать (на выбор):** музыку и стингеры — сервис генерации музыки по тексту (Suno, Udio, Stable Audio или подобный), sfx — генератор звуковых эффектов по тексту (ElevenLabs SFX или подобный). Стоимость и лицензию проверить в самом сервисе до запуска: нужна лицензия на коммерческое использование в игре.

---

## A. Музыка (3 петли)

| Файл | Длит. | Промпт |
|---|---|---|
| mus_base.mp3 | 21.33 с, 8 тактов, 90 BPM, seamless loop | Late-night 1989 synth-pop instrumental, 90 BPM, A minor, dreamy warm analog pad, octave-pumping synth bass, soft LinnDrum-style drum machine with gated snare, gentle arpeggio, nostalgic lead melody with light vibrato, VHS tape wow and flutter, cozy and slightly melancholic, seamless 8-bar loop, no intro, no outro, no vocals |
| mus_bonus.mp3 | 16.0 с, 8 тактов, 120 BPM, seamless loop | Energetic 1989 synthwave instrumental, 120 BPM, A minor, driving octave bass, punchy drum machine with claps on 2 and 4 and open hi-hats, fast arpeggios, bright neon lead melody, same instruments and key as the base theme but faster and more urgent, like a tape running at double speed, seamless 8-bar loop, no intro, no outro, no vocals |
| mus_bigwin.mp3 | 7.74 с, 4 такта, 124 BPM, seamless loop | Triumphant 80s synth-brass celebration, 124 BPM, C major, chord progression C – Am – F – G, big brass stabs, crash cymbal on the downbeat, sparkling arpeggios, driving drum machine, victorious and fun, seamless 4-bar loop, no vocals |

## B. Стингеры (5 одиночных, стерео)

| Файл | Длит. | Промпт |
|---|---|---|
| stg_bonus_intro.mp3 | 3.6 с | VHS cassette slides into a VCR with a mechanical clunk, motor spins up, a rising synth arpeggio builds for one second and lands on a big 80s brass hit with a crash cymbal, short reverb tail, ends cleanly |
| stg_shift_over.mp3 | 3.4 с | Bright descending synth-bell cascade resolving into a warm major brass chord, then the whole sound slows down like a VHS tape stop, pitch dropping to silence over the last second |
| stg_maxwin.mp3 | 5.5 с | Huge celebratory sting: white-noise riser for 1.5 seconds, then three ascending 80s synth-brass chords each hit with a kick, final chord with a crash cymbal and sparkling high bells, victorious, ends with a short tail |
| bw_tier.mp3 | 1.6 с | Short 80s synth-brass hit with a kick drum, crash cymbal and three quick rising bells, punchy, tight, short tail |
| bw_end.mp3 | 1.8 с | Four rising synth-bell notes resolving into a warm brass chord with a soft kick, satisfying final chord, short tail |

## C. SFX (22 моно, сухие)

| Файл | Длит. | Петля | Промпт |
|---|---|---|---|
| ui_click.mp3 | 0.08 с | | Tiny plastic button click of a VCR remote control, single, dry, very short |
| ui_toggle.mp3 | 0.16 с | | Two-tone plastic switch click, click then a slightly higher click, dry |
| ui_open.mp3 | 0.30 с | | Short whoosh of a cassette sliding in a cardboard sleeve ending with a soft click, dry |
| splash_play.mp3 | 1.3 с | | VHS cassette inserted into a VCR: plastic clunk, tape door closes, mechanism clicks twice, motor spins up briefly, dry |
| spin_start.mp3 | 0.38 с | | VCR play button pressed: firm mechanical click with a low thud and a short motor whirr ramping up, dry |
| reel_loop.mp3 | 0.96 с | seamless | VCR tape transport running: steady low motor hum with twelve evenly spaced soft mechanical ticks per second-ish, seamless loop, dry, constant level |
| reel_stop.mp3 | 0.18 с | | Short mechanical thud with a click, like a VCR head drum stopping, dry, no tail |
| reel_stop_s.mp3 | 0.75 с | | Mechanical thud followed immediately by a bright glass bell and a quick tinsel shimmer, magical but short, dry |
| antic_loop.mp3 | 2.0 с | seamless | Old CRT television 60 Hz hum with bursts of VHS tracking static pulsing about four times per second and a tense sustained synth chord underneath, seamless loop, constant level |
| win_s.mp3 | 0.7 с | | Two quick bright synth-bell notes rising a fourth, small win, short tail |
| win_m.mp3 | 1.1 с | | Four ascending synth-bell notes played fast ending on a sparkling high bell, medium win, short tail |
| line_tick.mp3 | 0.14 с | | Single very short high bell tick with a tiny click, dry |
| count_loop.mp3 | 0.4 с | seamless | Fast mechanical tape-counter ticking, alternating two pitches of plastic clicks about twenty per second, seamless loop, dry |
| pause.mp3 | 0.6 с | | VCR pause button: heavy mechanical clunk with a short electrical buzz that fades in half a second, dry |
| rec_beep.mp3 | 0.35 с | | Two short 1 kHz electronic beeps like a camcorder record indicator, dry |
| rewind.mp3 | 1.9 с | | VHS rewind: tape squeal rising in pitch for 1.5 seconds with a fluttering motor, then a sharp mechanical stop clunk at the end, dry |
| rew_mult.mp3 | 0.8 с | | Five quick ascending synth pluck notes ending on a bright bell, power-up feeling, short tail |
| second_take.mp3 | 0.35 с | | Film clapperboard snap: sharp wooden clap with a short crack, dry |
| retrigger.mp3 | 1.0 с | | Three ascending bright bell notes with a sparkling synth pluck at the end, reward, short tail |
| trigger.mp3 | 1.6 с | | Low thud, then four ascending synth-bell notes and a sustained bright two-note bell chord, feature start, short tail |
| nofunds.mp3 | 0.4 с | | Two short low buzzer tones like an 80s game error, dry |
| error.mp3 | 0.8 с | | Burst of VHS tracking static that stutters about nine times per second and fades out, dry |

---

## Приёмка
1. Положить файлы под теми же именами в `frontend/src/assets/audio/`.
2. `python3 frontend/tools/audio/check_loops.py frontend/src/assets/audio` — длительности, пики, стык петель (скрипт добавлю при приёмке, если понадобится; пока проверяю вручную).
3. `node frontend/tools/qa_audio.js http://127.0.0.1:8765` на mock RGS — сцены и консоль.
4. Если петля не сходится по стыку, прислать wav: подрежу под точное число тактов сам.

Счёт: 3 музыки + 5 стингеров + 22 sfx = 30 генераций (на музыку обычно нужно 2–3 попытки на трек, закладываем ~10 генераций музыки).
