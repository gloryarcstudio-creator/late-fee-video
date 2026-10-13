# Пачка 06 — живой фон и рамка телевизора

Что анимируем (карта зон: `art/ref/bg_tv_anim_ref.jpg`): фон базы `bg_land` и фон бонуса `bg_bonus` (мастера 2560×1440 в `art/masters/final/bg/`), рамка ТВ `tv_frame` (мастер 1432×1158 с альфой, `art/masters/final/tv_frame.png`). Полки с кассетами (зона E) остаются неподвижными: ТВ и Дел их перекрывают, а генеративное видео любит «плавить» мелкие обложки, поэтому в промптах полки явно запрещаем двигать.

Два пути, выбираем по результату первой пробы:
- **Путь 1, цельное видео фона** (проще всего): image-to-video из мастера фона, первый и последний кадр = мастер, 6 с, статичная камера. Один клип на базу, один на бонус. В игре — `<video muted loop playsinline>` под сценой, 1280×720, 3–5 МБ на клип, только на десктопе; телефоны и reduced-motion остаются на картинке.
- **Путь 2, слои** (если на пробе плывут полки или дрожит общий кадр): отдельные зацикленные элементы на зелёном (неон, окно с дождём, лампа с пылью), я кладу их поверх статичного фона в известные координаты как спрайт-ленты. Легче по весу, работает и на телефонах.

Общие параметры: 24 fps, зелёный фон только для слоёв пути 2, никаких новых объектов и людей, никакого текста. Хвост видео-промптов:
`VIDEO = static camera, no zoom, no pan, seamless loop that returns exactly to the first frame, keep every object in place, keep the lighting and colors of the reference, no new objects, no people, no text, 24 fps`

---

## 1. Путь 1: цельные видео фона (2 клипа, 6 с)

### BG-V-BASE → `bg_land_loop.mp4` (first = last = bg_land.png, 6 с)
```
night interior of a small 1989 video rental store, everything stays in place: rain streaks slowly run down the window glass on the right, the magenta neon sign in the window hums with a faint flicker, the ceiling lamp at the top left sways very slightly and tiny dust motes drift in its warm light, the wet street outside shimmers in the puddles, the glossy counter at the bottom catches a soft moving reflection of the neon, the shelves of VHS boxes do not move at all, subtle ambient motion only, VIDEO
```
### BG-V-BONUS → `bg_bonus_loop.mp4` (first = last = bg_bonus.png, 6 с)
```
same video rental store after closing, lights off, lit by magenta and cyan neon only, everything stays in place: heavier rain runs down the window, the neon sign buzzes and flickers a little more, one distant soft lightning flash outside the window lights the wet street for a moment, cold blue glow pulses gently on the counter, dust drifts in the neon light, the shelves of VHS boxes do not move at all, subtle moody ambient motion, VIDEO
```
Приёмка: полки неподвижны (сравню кадры по маске зоны E), первый и последний кадр совпадают, ширина 1920 или 2560 — ужму до 1280×720 H.264 + VP9 для сборки.

## 2. Путь 2: слои на зелёном (3 клипа по 4 с + 1 картинка)
Кадрируются из мастера (координаты зон на карте), генерируются как отдельные объекты на `#00FF00`, первый = последний кадр = вырезка из мастера.

### EL-NEON → `el_neon_loop.mp4` (вырезка зоны B, 512×512, 4 с)
```
a magenta neon tube sign shaped like a rounded rectangle on a dark rainy window, the neon glow breathes gently and flickers twice like a real gas tube, faint reflection of the glow on the wet glass, VIDEO
```
### EL-RAIN → `el_rain_loop.mp4` (вырезка зоны C, 768×1024, 4 с)
```
rain streaks run down a dark window pane at night with a wet city street and a street lamp outside, drops merge and slide, the street lamp halo flickers slightly, puddle reflections shimmer, the window frame stays still, VIDEO
```
### EL-LAMP → `el_lamp_loop.mp4` (вырезка зоны A, 512×512, 4 с)
```
a warm hanging ceiling lamp with a trailing ivy plant beside it, the lamp sways very slightly on its cord, tiny dust motes drift through the cone of warm light, the leaves barely move, VIDEO
```
### EL-BONUS-GLOW → картинка `el_bonus_glow.png` (1280×720, img2img из bg_bonus, 1 ген.)
Мягкая маска холодного свечения для пульсации кодом: `soft cyan and magenta neon light bloom over a dark room, blurry, no objects, light only`.

## 3. Рамка телевизора (из `tv_frame.png`; 1 клип + 2 картинки)

### TV-V-IDLE → `tv_frame_loop.mp4` (first = last = tv_frame на зелёном, 4 с, петля)
```
front view of a chunky 1980s black CRT television cabinet with an empty flat green screen area, the cabinet stays perfectly still, a small red power LED on the front panel glows and blinks softly once, a faint glossy reflection slowly sweeps across the plastic bezel from left to right, the thin magenta and cyan rim light on the edges breathes gently, the screen area stays flat pure green, VIDEO
```
### TV-WIN → картинка `tv_frame_win.png` (img2img из tv_frame, strength 0.3)
```
the same CRT television cabinet, now with a warm golden light bleeding from the screen onto the bezel and the front panel, the rim light turns gold, same shape, same camera, screen area flat pure green #00FF00
```
### TV-BONUS → картинка `tv_frame_bonus.png` (img2img из tv_frame, strength 0.3)
```
the same CRT television cabinet lit after hours by cold cyan and magenta neon only, stronger neon rim light on the edges, a small red REC-style LED glowing on the front panel, same shape, same camera, screen area flat pure green #00FF00
```
Приёмка: силуэт корпуса и окно экрана совпадают с мастером (маска по альфе), иначе картинки состояний не лягут в рамку.

## 4. Кодом, без кредитов (сделаю при интеграции)
- Рамка: кроссфейд состояний normal → win (0.5 с на выигрыше, назад за 1 с) и normal → bonus на фриспинах; дрожь корпуса 2 px на big win; всплеск статики на экране в первый кадр спина; скан-лайны и «дыхание» свечения экрана уже есть.
- Фон: параллакс 3–4 px за курсором/наклоном телефона (фон, стойка Дела, ТВ на разной глубине); пульс свечения бонуса в такт музыке (по `AUDIO` уровню, без анализа — по BPM 120); мерцание неона в anticipation чаще.
- Телефоны: видео фона не грузим, остаются слои пути 2 (если выбран) и кодовые эффекты.

## 5. Счёт
Путь 1: 2 видео ≈ 9 кредитов (+ повтор, если полки поплыли). Путь 2: 3 видео + 1 картинка ≈ 15. Рамка: 1 видео + 2 картинки ≈ 7. Всего 16–31 кредит. Рекомендую начать с BG-V-BASE одной пробой: если полки стоят, добираем BG-V-BONUS и рамку; если плывут, переходим на путь 2.
