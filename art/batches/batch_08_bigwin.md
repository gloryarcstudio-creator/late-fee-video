# Пачка 08 — стилизованные big win по тирам

Сейчас: один общий видео-луп `ov_bigwin` (кассета, лучи, лента) на все тиры, тир отличается только перекрашенным бейджем и звёздами. Задача пачки: у каждого тира своя сцена из мира видеопроката, нарастающая по масштабу, плюс вход в сцену и анимированный max win.

| Тир | Порог (× уплаченного) | Сцена | Цвет |
|---|---|---|---|
| BIG WIN | 20× | «Новинка недели»: кассета выезжает из видеомагнитофона прямо в камеру | янтарь, золото |
| MEGA WIN | 50× | «Хит проката»: стопка коробок раскрывается веером под бегущими лампочками | неон magenta |
| EPIC WIN | 100× | «Премьера»: огромный CRT включается, из экрана вылетает вихрь плёнки | cyan + magenta |
| CULT CLASSIC | 500×+ | «Культовая классика»: золотая кассета в витрине на бархате, стекло раскрывается | золото + тёмный пурпур |
| MAX WIN | 15 000× | оживить готовую плашку `ov_maxwin` | золото |

Текст (заголовок тира, сумма, звёзды) я накладываю кодом, в видео его нет.

## Как это будет работать в игре
- На каждый тир два клипа: **intro** 1.5 с (сцена собирается из темноты) → **loop** 4 с (бесшовная петля, пока идёт подсчёт суммы). Последний кадр intro = первый кадр loop = ключевая картинка тира, поэтому стык без среза (как у Дела).
- Подсчёт суммы растёт по тирам: при переходе BIG → MEGA → EPIC → CULT я переключаю петлю через VHS-глитч кодом (полосы трекинга 0.2 с, сдвиг каналов, щелчок), и сцена «перематывается» на следующую. Большой выигрыш проходит лестницу сцен, а не стоит на одной.
- Портрет: видео 16:9 обрезается по центру до трети ширины, поэтому главный объект держим в центральной трети кадра, эффекты могут уходить к краям. Центр кадра на уровне 40–60 % высоты остаётся темнее: там текст.
- Вес: я ужму каждый клип до 960×540, H.264 + VP9, около 300–400 КБ. Восемь клипов тиров ≈ 3 МБ, грузятся после PLAY, телефоны берут только loop (intro заменяется кодовой вспышкой).

## Общие блоки
`STYLE = stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store mood, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset`

`FRAME = 16:9 cinematic frame, pure black background, the main object centered inside the middle third of the frame, light effects may reach the edges, the very center of the frame stays darker and calm for a title overlay, no text`

`VIDEO = static camera, no zoom, no pan, keep the object design identical to the reference, same lighting, 24 fps, no text, no people`

`LOOP = seamless loop that returns exactly to the first frame`

`NEGATIVE = text, letters, numbers, logo, watermark, real movie titles, real brands, Blockbuster, famous characters, people, hands, blurry, lowres, cropped object`

Референс стиля для всех картинок: REF(KF_04) с силой 0.2–0.3, для BIG ещё кадр текущего `ov_bigwin` (кассета должна быть той же).

---

## 1. Ключевые картинки тиров (1920×1080, 4 картинки)

### BW-BIG-KEY → `bw_big_key.png`
```
a chunky black 1980s VHS video cassette recorder seen from the front at the bottom of the frame, a glossy black VHS cassette is sliding out of its slot toward the camera, warm golden light pours out of the cassette windows and the tape reels glow, golden sparks and small rental tickets float upward, soft amber god rays fan out behind the cassette, FRAME, STYLE
```

### BW-MEGA-KEY → `bw_mega_key.png`
```
a tall stack of blank VHS rental boxes with abstract colorful covers fanning out in a wide arc like a deck of cards, framed by a rectangular marquee of glowing magenta neon light bulbs around the edges of the frame, glossy reflections on the boxes, magenta and pink light streaks, popcorn kernels flying, FRAME, STYLE
```

### BW-EPIC-KEY → `bw_epic_key.png`
```
a huge retro CRT television set in the lower middle of the frame, its screen bursting with bright cyan light, a spiral vortex of shiny magnetic tape ribbons and film strips swirls out of the screen toward the camera, popcorn and torn rental tickets caught in the vortex, cyan and magenta neon glow, dramatic light beams, FRAME, STYLE
```

### BW-CULT-KEY → `bw_cult_key.png`
```
a single golden VHS cassette resting on a deep purple velvet pedestal inside an open glass display case, a strong spotlight from above, the glass panels swung open and glinting, a slow tornado of golden film ribbon and gold confetti rises around the pedestal, deep purple shadows, regal museum feeling, FRAME, STYLE
```

Приёмка: объект в центральной трети, центр кадра спокойный, нет текста и людей, стиль совпадает с KF_04. Если объект уехал из центра — это не брак, кадрирую сам, но в портрете он должен оставаться целиком.

## 2. Петли тиров (image-to-video, 4 с, first = last = KEY)

### BW-BIG-LOOP → `bw_big_loop.mp4`
```
the cassette stays half out of the recorder slot, its tape reels spin steadily, golden light pulses gently from the cassette windows, god rays slowly rotate behind it, golden sparks and tickets drift upward and fade, VIDEO, LOOP
```

### BW-MEGA-LOOP → `bw_mega_loop.mp4`
```
the fan of VHS boxes sways gently and the boxes shimmer with sliding glossy reflections, the neon bulbs of the marquee chase around the frame in a running light pattern, magenta light streaks sweep across, popcorn keeps popping and floating, VIDEO, LOOP
```

### BW-EPIC-LOOP → `bw_epic_loop.mp4`
```
the television screen flickers with bright cyan light, the vortex of tape ribbons keeps spiraling out of the screen toward the camera, popcorn and tickets orbit in the vortex, light beams pulse with the rhythm, VIDEO, LOOP
```

### BW-CULT-LOOP → `bw_cult_loop.mp4`
```
the golden cassette slowly rotates a little on the velvet pedestal and back, the spotlight shimmers, the golden ribbon tornado keeps rising around the pedestal, gold confetti falls, light glints travel across the open glass panels, VIDEO, LOOP
```

## 3. Входы тиров (image-to-video, 1.5 с, first = чёрный кадр, last = KEY)
Если модель не умеет «первый кадр чёрный», первым кадром даём KEY, затемнённый в 0 % яркости (я подготовлю `bw_<tier>_black.png`).

### BW-BIG-IN → `bw_big_in.mp4`
```
from darkness the recorder lights up, its slot opens and the cassette slides out toward the camera with a burst of golden light, sparks fly, VIDEO
```
### BW-MEGA-IN → `bw_mega_in.mp4`
```
from darkness the marquee bulbs switch on one after another around the frame, the stack of VHS boxes flips open into a wide fan with a flash of magenta light, VIDEO
```
### BW-EPIC-IN → `bw_epic_in.mp4`
```
from darkness the CRT television switches on with a white flash and a collapsing horizontal line, then cyan light floods the screen and the tape vortex bursts out of it, VIDEO
```
### BW-CULT-IN → `bw_cult_in.mp4`
```
from darkness a spotlight snaps on above the pedestal, the glass display case swings open, the golden cassette is revealed with a shower of gold confetti, VIDEO
```

## 4. Max win (image-to-video, 4 с, first = last = `ov_maxwin`)
### BW-MAX-LOOP → `bw_max_loop.mp4`
```
the golden cassette in the showcase stays still, a slow band of light sweeps across the gold surface, warm light rays breathe behind it, gold dust drifts, the glass glints, VIDEO, LOOP
```

## 5. Бейджи тиров (по желанию, 512×512, прозрачный фон)
Сейчас бейдж один, перекрашенный. Если нужны разные формы:
- `badge_big`: круглая наклейка проката с зубчатым краем, янтарь;
- `badge_mega`: звезда-наклейка «хит», magenta;
- `badge_epic`: щит-наклейка с неоновым кантом, cyan;
- `badge_cult`: золотая печать с лентами, пурпур.
Хвост: `blank rental store sticker, no text, glossy vinyl, ISOLATED, STYLE`. Звёзды тира накладываю кодом.

## 6. Кодом, без кредитов
- Лестница тиров во время подсчёта: VHS-глитч между сценами, щелчок перемотки, рост частиц по тиру (билеты → попкорн → лента → золото).
- Тряска рамки ТВ и вспышка экрана на старте big win, OSD «PLAY ▶» в углу, счётчик плёнки крутится вместе с суммой.
- Обычный выигрыш ниже 20×: короткая вспышка OSD и подпрыгивание суммы, без полноэкранной сцены (чтобы не тормозить игру после каждого спина).

## Порядок и счёт генераций
1. Тест: BW-BIG-KEY в минимальном качестве → BW-BIG-LOOP. Проверяю стык, вес и портретный кроп, только потом серия.
2. Серия: остальные 3 KEY, 3 LOOP, 4 IN, MAX-LOOP.
Итого: 4 картинки + 9 видео (+4 картинки, если делаем бейджи; +1 на переделку каждого тира). Стоимость смотрим в Higgsfield перед каждым платным вызовом, я её не знаю.

Сдача: исходники как есть (png, mp4 1080p) в один zip, как в прошлых пачках. Перекодирование, кроп и интеграция — на мне.
