# Пачка 03 — всё оставшееся одним списком (29 картинок + 7 видео)

Заменяет пачку 02. Одна генерация на позицию (кроме BG-L: две), повторы только там, где не прошла проверка. По измеренной цене это ≈ 29 кредитов на картинки; цену видео запишите с первого клипа.

**Референсы:** `art/style/KF_04.png` для сцены, UI, оверлеев; `art/style/DEL_REF_04.png` для Дела (reference / img2img, сила 0.2–0.35). Видео делаются image-to-video из своей картинки, поэтому сначала картинки раздела C и E, потом видео.
**Негатив (везде):** `text, letters, numbers, logo, watermark, signature, real movie titles, real brands, Blockbuster, Hollywood Video, famous characters, blurry, lowres, extra fingers, deformed hands, cropped, frame border`

**Порядок:** A → B (UI-SPIN первым как тест материала) → C → E → F → D и видео из E. Файлы называть как в колонке «файл», сложить одним архивом.

## Сводная таблица

| ID | Файл | Тип | Формат | Референс |
|---|---|---|---|---|
| BG-L | `bg_land.png` | image ×2 | 16:9, макс. разрешение | KF_04 |
| BG-B | `bg_bonus.png` | img2img из bg_land (сила 0.4–0.5) | 16:9 | выбранный bg_land |
| UI-SPIN | `ui_spin.png` | image | 1:1 | KF_04 |
| UI-RND | `ui_round.png` | image | 1:1 | KF_04 |
| UI-FIELD | `ui_field.png` | image | 4:1 | KF_04 |
| UI-WIDE | `ui_wide.png` | image | 4:1 | KF_04 |
| UI-PANEL | `ui_panel.png` | image | 1:1 | KF_04 |
| UI-COUNTER | `ui_counter.png` | image | 4:1 | KF_04 |
| UI-SIDE | `ui_side.png` | image | 4:3 | KF_04 |
| UI-TAG | `ui_tag.png` | image | 3:2 | KF_04 |
| D-IDLE | `del_idle.png` | image | 2:3 (1024×1536) | DEL_REF_04 |
| D-LEAN | `del_lean.png` | image | 2:3 (1024×1536) | DEL_REF_04 |
| D-CHEER | `del_cheer.png` | image | 2:3 (1024×1536) | DEL_REF_04 |
| D-WOW | `del_wow.png` | image | 2:3 (1024×1536) | DEL_REF_04 |
| D-PAUSE | `del_pause.png` | image | 2:3 (1024×1536) | DEL_REF_04 |
| D-REW | `del_rew.png` | image | 2:3 (1024×1536) | DEL_REF_04 |
| D-BORED | `del_bored.png` | image | 2:3 (1024×1536) | DEL_REF_04 |
| V-IDLE | `del_idle.mp4` | image-to-video из del_idle.png | 4 с, петля | del_idle.png |
| V-LEAN | `del_lean.mp4` | image-to-video из del_lean.png | 2 с | del_lean.png |
| V-CHEER | `del_cheer.mp4` | image-to-video из del_cheer.png | 2 с | del_cheer.png |
| V-WOW | `del_wow.mp4` | image-to-video из del_wow.png | 2 с | del_wow.png |
| V-REW | `del_rew.mp4` | image-to-video из del_rew.png | 2 с | del_rew.png |
| OV-BIG | `ov_bigwin.png` | image | 16:9 | KF_04 |
| V-BIG | `ov_bigwin.mp4` | image-to-video из ov_bigwin.png | 4 с, петля | ov_bigwin.png |
| OV-BADGE | `ov_badge.png` | image | 1:1 | KF_04 |
| OV-MAX | `ov_maxwin.png` | image | 4:3 | KF_04 |
| OV-FS-IN | `ov_bonus_intro.png` | image | 16:9 | KF_04 |
| V-FS-IN | `ov_bonus_intro.mp4` | image-to-video из ov_bonus_intro.png | 3 с | ov_bonus_intro.png |
| BUY-1 | `buy_night.png` | image | 2:3 | KF_04 |
| BUY-2 | `buy_double.png` | image | 2:3 | KF_04 |
| BUY-3 | `buy_director.png` | image | 2:3 | KF_04 |
| LOGO | `logo_emblem.png` | image | 2:1 | KF_04 |
| FX | `fx_particles.png` | image | 1:1 | KF_04 |
| TILE | `tile.png` | image | 1:1 | KF_04 + DEL_REF_04 |
| COVER | `cover.png` | image | 16:9 | KF_04 + DEL_REF_04 |

## Промпты (копировать целиком)

## A. Фоны

### BG-L → `bg_land.png` (image ×2, 16:9, макс. разрешение, референс KF_04)
_2 генерации, выбрать лучшую; она становится референсом для BG-B_
```
wide interior of a small 1989 video rental store at night seen from the customer side of the counter, the same store as the reference key frame, empty center where the TV and clerk were, wooden shelves with rows of anonymous VHS boxes with abstract colorful covers, wooden return counter along the bottom edge, ceiling lamp casting warm amber light, window on the right with a dark rainy street and a blank magenta neon sign frame, hanging plant top left, carpet floor, no people, no television, no text, soft depth of field on the background, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### BG-B → `bg_bonus.png` (img2img из bg_land (сила 0.4–0.5), 16:9, референс выбранный bg_land)
```
same video rental store after closing time, main ceiling lamp off, room lit only by magenta and cyan neon from the window and a cold blue glow from the center, deeper shadows on the shelves, rain heavier on the window, moody and quiet, no people, no television, no text, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

## B. UI (без иконок и текста)

### UI-SPIN → `ui_spin.png` (image, 1:1, референс KF_04)
```
large round brushed-aluminum VCR play button with a soft amber glowing ring around the rim, slight bevel, matte black plastic base ring, front view, empty face without any icon, matches the material of the black CRT television in the reference, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### UI-RND → `ui_round.png` (image, 1:1, референс KF_04)
```
small round black rubber VCR button with a thin brushed-silver bezel, front view, empty face without any icon, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### UI-FIELD → `ui_field.png` (image, 4:1, референс KF_04)
```
long rectangular black LCD display window set into a dark brushed-silver VCR panel, rounded corners, flat front view, empty center area for text, even straight edges for 9-slice, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### UI-WIDE → `ui_wide.png` (image, 4:1, референс KF_04)
```
wide rounded rectangular black plastic button with a thin magenta neon edge light, flat front view, empty center area for text, even straight edges for 9-slice, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### UI-PANEL → `ui_panel.png` (image, 1:1, референс KF_04)
```
large square panel styled as the inside of an open black VHS clamshell rental case, dark textured plastic, rounded corners, thin silver inner frame, flat front view, empty center area for text, even straight edges for 9-slice, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### UI-COUNTER → `ui_counter.png` (image, 4:1, референс KF_04)
```
long tape counter display of a 1980s VCR, dark green-black LCD window inside a brushed-silver bezel with tiny blank buttons on the right, flat front view, empty center area for digits, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### UI-SIDE → `ui_side.png` (image, 4:3, референс KF_04)
```
small rectangular black plastic label plate with a thin cyan neon edge light and rounded corners, flat front view, empty center area for text, even straight edges for 9-slice, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### UI-TAG → `ui_tag.png` (image, 3:2, референс KF_04)
```
retro fluorescent orange paper price sticker with a torn edge and a slight curl, blank, flat front view, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

## C. Дел: позы (картинки)

### D-IDLE → `del_idle.png` (image, 2:3 (1024×1536), референс DEL_REF_04)
```
full body of the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand, standing relaxed behind nothing, weight on one leg, chewing gum, remote held loosely at the hip, calm half-smile, facing the viewer at a slight three-quarter angle, feet fully visible, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### D-LEAN → `del_lean.png` (image, 2:3 (1024×1536), референс DEL_REF_04)
```
full body of the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand, leaning forward toward the viewer, eyes wide, gripping the remote with both hands near the chest, holding breath, facing the viewer at a slight three-quarter angle, feet fully visible, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### D-CHEER → `del_cheer.png` (image, 2:3 (1024×1536), референс DEL_REF_04)
```
full body of the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand, fist pump with the left hand, big happy grin, remote in the right hand, facing the viewer at a slight three-quarter angle, feet fully visible, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### D-WOW → `del_wow.png` (image, 2:3 (1024×1536), референс DEL_REF_04)
```
full body of the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand, both hands on the head, jaw dropped, a popped bubblegum bubble flat on the face, remote still in the right hand, facing the viewer at a slight three-quarter angle, feet fully visible, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### D-PAUSE → `del_pause.png` (image, 2:3 (1024×1536), референс DEL_REF_04)
```
full body of the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand, pointing the remote straight at the viewer with the thumb pressing a button, smug smirk, facing the viewer at a slight three-quarter angle, feet fully visible, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### D-REW → `del_rew.png` (image, 2:3 (1024×1536), референс DEL_REF_04)
```
full body of the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand, pressing the remote hard with both hands, determined frown, leaning back slightly, facing the viewer at a slight three-quarter angle, feet fully visible, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### D-BORED → `del_bored.png` (image, 2:3 (1024×1536), референс DEL_REF_04)
```
full body of the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand, chin resting on the left hand, unimpressed, chewing gum slowly, remote hanging in the right hand, facing the viewer at a slight three-quarter angle, feet fully visible, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

## D. Дел: анимации (image-to-video из поз, 2–4 с)

### V-IDLE → `del_idle.mp4` (image-to-video из del_idle.png, 4 с, петля, референс del_idle.png)
```
chews gum slowly, blinks twice, slight sway of the shoulders, remote taps against the hip, returns exactly to the start pose for a seamless loop, subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps
```

### V-LEAN → `del_lean.mp4` (image-to-video из del_lean.png, 2 с, референс del_lean.png)
```
leans in a little closer, eyes widen, holds breath, tiny tremble of the hands on the remote, subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps
```

### V-CHEER → `del_cheer.mp4` (image-to-video из del_cheer.png, 2 с, референс del_cheer.png)
```
quick fist pump, grin widens, small hop, settles back, subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps
```

### V-WOW → `del_wow.mp4` (image-to-video из del_wow.png, 2 с, референс del_wow.png)
```
jaw drops further, bubblegum pops, excited hop, hands shake on the head, subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps
```

### V-REW → `del_rew.mp4` (image-to-video из del_rew.png, 2 с, референс del_rew.png)
```
presses the remote twice with both thumbs, arms recoil, head jerks back slightly, subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps
```

## E. Оверлеи, покупки, логотип, частицы

### OV-BIG → `ov_bigwin.png` (image, 16:9, референс KF_04)
```
burst of warm golden light rays coming out of an open black VHS cassette in the center, loose magnetic tape ribbons flying outward, dark background, empty center area for a title, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### V-BIG → `ov_bigwin.mp4` (image-to-video из ov_bigwin.png, 4 с, петля, референс ov_bigwin.png)
```
tape ribbons flutter outward, light rays slowly rotate, soft sparkles drift, seamless loop, subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps
```

### OV-BADGE → `ov_badge.png` (image, 1:1, референс KF_04)
_один золотой мастер; Mega/Epic/Cult перекрашиваем кодом_
```
round retro movie rating style sticker, glossy gold vinyl with a thick dark outline and a thin inner ring, blank center, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### OV-MAX → `ov_maxwin.png` (image, 4:3, референс KF_04)
```
golden VHS cassette displayed in a glass showcase under a spotlight, sparkles, dark background, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### OV-FS-IN → `ov_bonus_intro.png` (image, 16:9, референс KF_04)
```
video store front at midnight seen from the street, metal roll-down shutter half closed, blank magenta neon sign frame glowing, wall clock with a blank face through the window, rainy reflections on the pavement, no text, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### V-FS-IN → `ov_bonus_intro.mp4` (image-to-video из ov_bonus_intro.png, 3 с, референс ov_bonus_intro.png)
```
shutter rolls down slowly, neon flickers on, rain falls, puddle reflections ripple, subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps
```

### BUY-1 → `buy_night.png` (image, 2:3, референс KF_04)
```
VHS rental box standing upright with abstract cover art of a night city skyline and a crescent moon, deep blue and magenta, no text, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### BUY-2 → `buy_double.png` (image, 2:3, референс KF_04)
```
VHS rental box standing upright with abstract cover art of two overlapping cinema screens, magenta and cyan, no text, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### BUY-3 → `buy_director.png` (image, 2:3, референс KF_04)
```
VHS rental box standing upright with abstract cover art of a director chair and a clapperboard silhouette, gold and black, no text, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### LOGO → `logo_emblem.png` (image, 2:1, референс KF_04)
```
black VHS cassette seen from the front, edges glowing with magenta and cyan neon, empty white label area, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### FX → `fx_particles.png` (image, 1:1, референс KF_04)
```
sprite sheet grid of small game particles on a flat green background: paper rental tickets, popcorn kernels, short curls of black magnetic tape, gold sparkles, each item separated with clear gaps, 4x4 grid, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

## F. Подача

### TILE → `tile.png` (image, 1:1, референс KF_04 + DEL_REF_04)
```
promotional art, the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand grinning in front of the glowing black CRT TV inside the video rental store, VHS boxes flying around, magenta and cyan neon, empty space at the top for the game title, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### COVER → `cover.png` (image, 16:9, референс KF_04 + DEL_REF_04)
```
promotional wide art, the teenage night clerk from the reference sheet: shaggy dark hair, friendly face, pink bubblegum, maroon uniform vest over a grey-and-cream striped short-sleeve tee, blank white name badge on the vest, black wristwatch, dark jeans, black low-top sneakers, chunky black 1980s TV remote in the right hand leaning on the counter next to the glowing black CRT TV, shelves of VHS boxes, rainy neon window, empty space on the left third for the game title, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

## Что проверю при приёмке
- фоны: пустой центр под ТВ и Дела, стойка внизу, ничего не читается на обложках и вывеске;
- плашки: прямые края и чистое поле в центре, одинаковый материал с рамкой ТВ;
- позы Дела: лицо, причёска, жилет, бейдж, часы и кеды совпадают с листом 04, ступни в кадре, пульт в правой руке;
- видео: без движения камеры, персонаж не «плывёт», idle и big win замыкаются в петлю;
- нигде нет букв и цифр.
