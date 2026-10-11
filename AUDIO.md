# Late Fee Video — AUDIO v0.2

Этап 6. В сборке — звуки, сгенерированные по пачке `audio/batch_01_audio.md` (принята 2026-10-11, исходники в папке проекта `audio/gen_v1`), прогнанные через `frontend/tools/audio/import.py` (нормализация пика 0.89, петли с хвостом 1 с, mp3 128k/96k, обновление audio.json). Запасной комплект — наш офлайн-синтез (`frontend/tools/audio/synth.py`, numpy + scipy), лежит в `audio/synth_v1`. Внешних хостов нет. Лицензию на сгенерированные файлы подтверждает тот, кто генерировал (условия сервиса).

## 1. Звуковая концепция
- Эстетика VHS: мягкий верх (срез 13 кГц), лёгкий wow/flutter на музыке, тонкий шум ленты в петлях, транспорт видеомагнитофона (щелчки, моторчик) в UI.
- База: ночная смена, 90 BPM, Am, синт-поп 1989 (пад, бас на октавах, арпеджио, лёгкая драм-машина, мелодия с вибрато).
- Бонус: 120 BPM, та же тональность и инструменты, плотнее ритм, клэп, открытый хэт — «ускоренная плёнка».
- Big win: 124 BPM, мажорный ход C–Am–F–G, медные стабы и краш.
- Стингеры с «остановкой ленты» (tape stop) на итоге бонуса.

## 2. Файлы
Папка `frontend/src/assets/audio/`, формат MP3 (музыка 128 kbps стерео, sfx 96 kbps моно), манифест `audio.json` (kind, vol, dur, loop). Всего 30 файлов, 1.3 МБ.

Петли отрендерены циклически (хвосты реверба заворачиваются в начало) и сохранены как «петля + 1 с своего начала»; плеер зацикливает отрезок [start, start+loop] внутри декодированного буфера, где start — первый слышимый сэмпл. Так стык не упирается в паддинг MP3-кодека.

### Музыка (стерео, петли)
| Файл | Длительность | Петля | Сцена |
|---|---|---|---|
| mus_base.mp3 | 21.33 с + 1 с | 21.333 с (8 тактов, 90 BPM) | idle, спин, выигрыши в базе |
| mus_bonus.mp3 | 16 с + 1 с | 16.0 с (8 тактов, 120 BPM) | фриспины «Ночная смена» |
| mus_bigwin.mp3 | 7.74 с + 1 с | 7.742 с (4 такта, 124 BPM) | оверлей big win (все тиры) |

### Стингеры (стерео, одиночные, приглушают музыку на свою длину)
| Файл | Длительность | Когда |
|---|---|---|
| stg_bonus_intro.mp3 | 3.6 с | интро бонуса (`freeSpinTrigger` → баннер «Ночная смена») |
| stg_shift_over.mp3 | 3.4 с | итог бонуса SHIFT OVER (`freeSpinEnd`), с tape stop |
| stg_maxwin.mp3 | 5.5 с | плашка max win (`wincap`) |
| bw_tier.mp3 | 1.41 с | старт big win и каждый переход тира при счёте |
| bw_end.mp3 | 1.8 с | конец счёта big win |

### SFX (моно)
| Файл | Длит. | Петля | Событие |
|---|---|---|---|
| ui_click.mp3 | 0.03 с | | ставка ±, закрытие окон, подтверждение покупки |
| ui_toggle.mp3 | 0.12 с | | ante, турбо, звук |
| ui_open.mp3 | 0.29 с | | открытие правил, каталога, автоплея |
| splash_play.mp3 | 1.3 с | | кнопка PLAY на сплэше (кассета входит в магнитофон) |
| spin_start.mp3 | 0.37 с | | старт спина (щелчок + разгон мотора) |
| reel_loop.mp3 | 0.96 с | 0.96 с | барабаны крутятся (мотор + 12 тиков) |
| reel_stop.mp3 | 0.18 с | | остановка барабана |
| reel_stop_s.mp3 | 0.65 с | | остановка барабана с KEY (scatter) |
| antic_loop.mp3 | 2 с | 2.0 с | anticipation: гул ТВ, всплески трекинга, аккорд |
| win_s.mp3 | 0.7 с | | выигрыш < 5× ставки |
| win_m.mp3 | 0.96 с | | выигрыш ≥ 5×, scatter-выплата, выплата перемотки |
| line_tick.mp3 | 0.14 с | | показ каждой линии по очереди |
| count_loop.mp3 | 0.4 с | 0.4 с | счёт суммы big win |
| pause.mp3 | 0.58 с | | PAUSE ❚❚ (стоп-кадр) |
| rec_beep.mp3 | 0.28 с | | запись на плёнку (REC ●) |
| rewind.mp3 | 1.85 с | | перемотка REW ◀◀ (визг ленты + стоп) |
| rew_mult.mp3 | 0.8 с | | рост множителя перемотки |
| second_take.mp3 | 0.1 с | | «Второй дубль» (хлопушка) |
| retrigger.mp3 | 0.81 с | | +спины в бонусе |
| trigger.mp3 | 1.6 с | | 3+ KEY в базе (запуск бонуса) |
| nofunds.mp3 | 0.36 с | | недостаточно средств |
| error.mp3 | 0.8 с | | ошибка RGS/сети (TRACKING ERROR) |

## 3. Движок (`frontend/src/js/audio.js`)
- Один AudioContext: master → шины music и sfx. **Один выключатель**: `AUDIO.setMuted()` ведёт master gain к 0; видео в оверлеях всегда `muted`. Состояние запоминается в localStorage (`lfv_muted`), кнопка ♪ показывает его при загрузке.
- Разблокировка контекста в жесте (iOS/Safari): кнопка PLAY на сплэше, плюс любой первый pointerdown/keydown. До разблокировки все вызовы — no-op; в QA-режиме (`window.__fast`) и при скрытой вкладке звук не играет (контекст suspend).
- Музыка по сценам с кроссфейдом 0.8 с: `setMusic('mus_base' | 'mus_bonus' | 'mus_bigwin' | null)`. Повторный вызов того же трека не перезапускает его.
- Стингер: `stinger(name)` играет one-shot и приглушает музыку до 30 % на его длительность, затем возвращает за 0.6 с.
- Петли sfx: `loop(name)` / `stop(name, fade)`; барабанная петля стартует на reveal/respin и глохнет при остановке последнего барабана; anticipation-петля сменяет её, когда останавливается барабан перед «ожидающим».
- Загрузка: манифест + 13 базовых звуков (UI, спин, стопы, выигрыши, mus_base) ждёт сплэш (гонка 4 с, чтобы телефон не висел); остальное докачивается после нажатия PLAY. Декодированные буферы кэшируются.
- Привязка к событиям книг — в `game.js` (`reveal`, `setWin`, `scatterWin`, `freeSpinTrigger`, `freeSpinRetrigger`, `pauseStart/Respin`, `tapeRecord`, `rewind`, `secondTake`, `rewindMult`, `freeSpinEnd`, `wincap`, `bigWin`).

## 4. Проверка
`node frontend/tools/qa_audio.js http://127.0.0.1:8765` (на mock RGS): контекст запускается после сплэша, базовые буферы декодированы, в раунде есть старт/петля/стопы/выигрыш, anticipation-петля, в бонусе интро → mus_bonus → SHIFT OVER → mus_base, перемотка и запись, big win (стингер, музыка, счётчик, финал, возврат), mute/unmute с сохранением, консоль чистая, внешних запросов нет. 13/13 PASS в Chromium.

## 5. Промпты для внешней генерации
Полный список с именами файлов, спецификациями и порядком приёмки: `audio/batch_01_audio.md`. Краткая версия:
Имена файлов и длительности как в §2. Для петель просить «seamless loop, exact N bars at BPM»; для sfx — «mono, dry, no reverb tail beyond X s».
- mus_base: «1989 synth-pop, 90 BPM, A minor, warm analog pad, octave bass, soft drum machine, dreamy lead with vibrato, VHS tape warble, late-night video store, seamless 8-bar loop».
- mus_bonus: «same palette, 120 BPM, driving, clap on 2 and 4, open hats, arpeggios, neon night shift energy, seamless 8-bar loop».
- mus_bigwin: «triumphant 80s synth brass stabs, 124 BPM, C major, crash on bar 1, seamless 4-bar loop».
- stg_bonus_intro: «VCR cassette loads, motor spins up, rising synth arpeggio into a big brass hit, 3.5 s».
- stg_shift_over: «bright bell cascade into a warm chord, then a tape-stop slowdown, 3.4 s».
- stg_maxwin: «huge riser, three ascending brass chords, crash, sparkling bells, 5.5 s».
- bw_tier / bw_end: «short brass hit with crash and bells, 1.6 s» / «bell chord resolution with brass, 1.8 s».
- reel_loop: «VCR motor hum with soft mechanical ticks, 0.96 s seamless loop»; reel_stop: «short mechanical thud with click»; reel_stop_s: «thud plus bright bell and tinsel shimmer».
- antic_loop: «CRT 60 Hz hum, VHS tracking noise bursts, tense held synth chord, 2 s seamless loop».
- rewind: «VHS rewind squeal rising for 1.9 s ending in a mechanical stop»; rec_beep: «two short 1 kHz beeps»; pause: «mechanical pause clunk with a brief buzz».
- UI: «tiny plastic button click», «two-tone toggle click», «short tape-sliding whoosh with a click».

## 6. Открытое
- Громкости (`vol` в audio.json) выставлены по пикам и RMS, не на живом прослушивании; поправить после первого прослушивания на устройстве.
- mus_base из gen_v1 нарастает по плотности внутри петли: стык слышен как возврат к началу фразы. Если будет мешать, запросить ровную версию или взять synth_v1/mus_base.mp3.
- Музыка в idle играет постоянно; если ревью Stake попросит тишину без действия, добавить таймаут затухания.
