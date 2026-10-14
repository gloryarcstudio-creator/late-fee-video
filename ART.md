# Late Fee Video — ART v0.1 (черновик для оценки бюджета)

Статус: этап 4, **стиль утверждён 2026-10-11: KF_04 + DEL_REF_04** (`art/style/`). **Решение: полный вариант (103 картинки + 14 видео).** Идёт серия, пачки промптов в `art/batches/`: пачка 01 принята, **пачка 03 (всё оставшееся одним списком) выдана 2026-10-11**, пачка 02 в неё включена. Здесь перечислены все ассеты, промпты к ним и сколько генераций нужно, чтобы посчитать кредиты Higgsfield.
Правила проекта: прозрачный фон, все состояния на одинаковом холсте, без текста внутри картинок, панели под 9-slice. Сначала используем то, что получается без генерации (код, кадрирование, перекраска), потом один тест в минимальном качестве и только после него серию.

## 1. Style guide (предложение)
**Мир.** Ночная смена в видеопрокате 1989 года. Тёплый свет ламп над стойкой, холодный неон в окне, пластик кассет, ламинат, ковролин. Картинка «как с кассеты»: лёгкое зерно, мягкие блики, хроматический сдвиг по краям. Эффекты VHS (трекинг, шум, скан-лайны, OSD) делаются кодом поверх арта, в самом арте их нет.

**Стиль рендера.** Стилизованный полуреализм: 3D-иллюстрация с ручной покраской, чёткие силуэты, контурный свет. Символы читаются при 64 px.

**Палитра**
| Токен | HEX | Где |
|---|---|---|
| Night | #14121F | фон, тени |
| Shelf | #2B2440 | полки, панели |
| Neon magenta | #FF3D9A | REW, бонус, акценты |
| Neon cyan | #3DE0FF | KEY (scatter), anticipation |
| VHS blue | #1E3BD6 | сплэш «синий экран», OSD-плашки |
| Lamp amber | #FFB547 | WILD, выигрыши, Дел |
| Tape black | #0B0B0E | кассеты, рамка ТВ |
| OSD white | #EAF2FF | OSD-текст |

**Свет.** Основной тёплый сверху-слева (лампа над стойкой), контровой неон magenta/cyan справа.
**Шрифты (локальные woff2, OFL):** VT323 для OSD и счётчиков, Bungee для заголовков big win и названия игры, IBM Plex Sans Condensed для HUD и правил. Все надписи накладываются кодом.

## 2. Общие блоки промптов
**STYLE (добавляется в конец каждого промпта картинки):**
`stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset`

**ISOLATED (для объектов на прозрачном фоне):**
`single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin`
(Зелёный фон потом убирается кодом по контуру. Если модель отдаёт прозрачный PNG, этот блок не нужен.)

**NEGATIVE:**
`text, letters, numbers, logo, watermark, signature, real movie titles, real brands, Blockbuster, Hollywood Video, famous characters, blurry, lowres, extra fingers, deformed hands, cropped, frame border`

**REF(x):** картинка-референс, которую прикладываем к генерации (режим reference / image-to-image с низкой силой 0.2–0.35). REF(KF_04) — для сцены, ТВ, символов, UI, оверлеев; REF(DEL_REF_04) — для всех поз Дела.

**VIDEO (для image-to-video):**
`subtle loopable motion, static camera, no camera movement, keep character design identical, same lighting, 24 fps`

## 3. Что делаем без генерации (0 кредитов)
| Что | Как |
|---|---|
| Полосы трекинга, шум, скан-лайны, хроматический сдвиг | CSS/canvas поверх сцены |
| OSD «PLAY ▶», «PAUSE ❚❚», «◀◀ REW», «● REC», «SECOND TAKE» | шрифт VT323 + плашка VHS blue в коде |
| Сплэш «синий экран», счётчик ленты, счётчики спинов и множителя | код + шрифты |
| Подсветка выигрыша, линии, дрожание замороженных барабанов, перемотка барабанов назад | код (уже в прототипе) |
| Состояния кнопок pressed / disabled / on | из одной картинки: яркость, сдвиг, кольцо в коде; при необходимости img2img |
| Иконки на кнопках (меню, звук, турбо, автоплей, ±) | SVG в коде, одним стилем |
| Блюр символов при вращении | отдельный кадр из того же символа, размытие при сборке (не filter в Safari) |
| Портретный фон | кадрирование/расширение лендскейпа (outpaint только если не хватит) |
| Тиры big win (Big / Mega / Epic / Cult Classic) | одна подложка, перекраска кодом под тир |
| Логотип | шрифт Bungee + сгенерированная эмблема-кассета |

## 4. Ассеты, промпты и число генераций
Колонка «Ген.» — планируемое число генераций: 1 тест в минимальном качестве + серия + запас на неудачи. Размер — мастер (≈2× экранного), итог WebP.

### 4.1 Ключевой кадр и персонаж (делаются первыми, задают стиль)
| ID | Ассет | Размер | Ген. |
|---|---|---|---|
| KF | Ключевой кадр игрового экрана | 1920×1080 | 4 |
| DEL-REF | Дел, лист персонажа (анфас, 3/4, профиль) | 2048×1024 | 4 |

**KF:** `game screen key art for a slot machine, interior of a small 1989 video rental store at night, wooden shelves of anonymous VHS boxes with abstract colorful covers, return counter with an old CRT television in the center whose screen shows a 5x3 grid of slot symbols (remote control buttons, popcorn, soda cup, retro phone, VHS boxes, a blank cassette with a gold star sticker, a brass key), teenage night clerk in a vest with a name badge standing left of the TV chewing gum holding a TV remote, neon OPEN sign glowing magenta in the dark window, empty space at the bottom for UI, ` + STYLE
**DEL-REF:** `character reference sheet, teenage night clerk of a video rental store, 17 years old, androgynous friendly face, messy dark hair, chewing gum, oversized maroon uniform vest over a striped shirt, blank name badge, wristwatch, holding a chunky 1980s TV remote, front view, three-quarter view, side view, neutral pose, consistent design, plain light grey background, ` + STYLE

### 4.2 Фоны и рамка
| ID | Ассет | Размер | Слои / состояния | Ген. |
|---|---|---|---|---|
| BG-L | Фон, лендскейп | 2560×1440 | фон без персонажа и ТВ | 2 |
| BG-B | Фон бонуса (тот же зал, свет выключен, только неон) | 2560×1440 | img2img из BG-L | 2 |
| BG-P | Фон, портрет | 1440×2560 | из BG-L кадрированием; outpaint при нехватке | 1 |
| TV | Рамка ТВ (CRT-корпус, прозрачное окно экрана) | 1600×1100 | normal; bonus-перекраска кодом | 3 |

**BG-L:** `wide interior of a small 1989 video rental store at night, empty center area, wooden shelves with rows of anonymous VHS boxes with abstract colorful covers, return counter at the bottom, ceiling lamp casting warm light, window on the right showing a dark rainy street with a magenta neon OPEN sign, carpet floor, no people, depth of field soft background, ` + STYLE
**BG-B (img2img из BG-L, strength 0.45):** `same video rental store after closing time, main lights off, room lit only by magenta and cyan neon and the glow of a TV, moody, darker shelves, ` + STYLE
**TV (под KF_04):** `front view of a chunky 1980s CRT television, matte black plastic cabinet with a horizontal speaker grille strip at the bottom and a thin dark bezel, exactly like the TV in the reference key frame, rounded screen area completely empty and flat pure green #00FF00 for cutout, ` + ISOLATED + STYLE + REF(KF_04)

### 4.3 Символы (14 шт., 512×512, прозрачный фон)
Состояния: normal (генерация), win (свечение и пульс кодом), blur (из normal при сборке). Ген. = 2 на символ, для Дел, WILD, KEY, REW по 3.
Ко всем промптам символов добавляется `match the render style, lighting and material quality of the symbols in the reference key frame` + REF(KF_04). Эталон: попкорн, стакан, телефон, кассеты и ключ уже нарисованы в KF_04.
| ID | Символ | Ген. | Промпт (+ ISOLATED + STYLE) |
|---|---|---|---|
| L1 | Кнопка ▶ Play | 2 | `chunky rubber TV remote button with an embossed right-pointing triangle play icon, glossy dark plastic, soft green accent` |
| L2 | Кнопка ■ Stop | 2 | `chunky rubber TV remote button with an embossed square stop icon, glossy dark plastic, soft red accent` |
| L3 | Кнопка ◀◀ Rew | 2 | `chunky rubber TV remote button with an embossed double left triangle rewind icon, glossy dark plastic, soft blue accent` |
| L4 | Кнопка ❚❚ Pause | 2 | `chunky rubber TV remote button with an embossed two vertical bars pause icon, glossy dark plastic, soft yellow accent` |
| M1 | Попкорн | 2 | `striped paper bucket overflowing with buttery popcorn` |
| M2 | Газировка | 2 | `large waxed paper soda cup with lid and bendy straw, condensation drops` |
| M3 | Телефон | 2 | `retro 1980s coiled-cord telephone handset in bright red plastic` |
| H1 | Кассета «Ужасы» | 2 | `VHS rental case standing upright, green clamshell box, abstract original horror cover art with a glowing eye in fog, no text` |
| H2 | Кассета «Боевик» | 2 | `VHS rental case standing upright, red clamshell box, abstract original action cover art with an explosion silhouette, no text` |
| H3 | Кассета «Sci-Fi» | 2 | `VHS rental case standing upright, blue clamshell box, abstract original sci-fi cover art with a ringed planet and starfield, no text` |
| P | Дел | 3 | `bust portrait of the night clerk from the reference sheet, grinning, blowing a pink bubblegum bubble, framed inside a rounded square badge` (+ референс DEL-REF) |
| W | WILD | 3 | `blank black VHS cassette tape facing camera with a big shiny gold star sticker on the label, golden glow` |
| S | KEY (scatter) | 3 | `old brass key on a ring with a cyan plastic tag shaped like a cassette, glowing cyan aura, after-hours return box key` |
| R | REW | 3 | `black VHS cassette tape tilted, magenta glowing double left arrow motion trail, tape spools spinning backwards` |

### 4.4 Дел: позы и анимации
Позы — картинки 1024×1536 с прозрачным фоном, по референсу DEL-REF. Анимации — image-to-video из позы, затем нарезка в спрайт-ленту (12–16 кадров) или webm.
| ID | Состояние | Картинка, ген. | Видео, ген. | Промпт позы / движения |
|---|---|---|---|---|
| D-IDLE | idle | 2 | 2 (4 с, петля) | `standing behind the counter, relaxed, chewing gum, holding the remote` / `chews gum, blinks, slight sway, loop` |
| D-LEAN | anticipation | 2 | 2 (2 с) | `leaning forward toward the TV, eyes wide, gripping the remote` / `leans in closer, holds breath` |
| D-CHEER | win | 2 | 2 (2 с) | `fist pump, happy grin` / `quick fist pump and grin, returns to pose` |
| D-WOW | big win / бонус | 2 | 2 (2 с) | `both hands on head, jaw dropped, gum bubble pops` / `jaw drops, bubble pops, excited hop` |
| D-PAUSE | PAUSE | 2 | — | `pointing the remote at the TV with thumb on a button, smug` |
| D-REW | REWIND | 2 | 2 (2 с) | `pressing the remote hard with both hands, determined` / `presses remote twice, arm recoils` |
| D-BORED | без выигрыша (редко) | 1 | — | `rests chin on hand, unimpressed, chewing gum` |
Все промпты поз: `full body of the night clerk from the reference sheet, same face, hair, maroon vest, striped shirt, blank badge, wristwatch and sneakers, ` + поза + ISOLATED + STYLE + REF(DEL_REF_04). Пульт всегда в правой руке. Видео: движение + VIDEO.

### 4.5 UI (без текста, иконки кодом)
| ID | Ассет | Размер | Состояния | Ген. |
|---|---|---|---|---|
| UI-SPIN | Кнопка спина: круглая серебристая кнопка видеомагнитофона | 512×512 | normal (ген.), pressed/disabled/stop кодом | 3 |
| UI-RND | Круглая малая кнопка (подложка для иконок) | 256×256 | normal, on — кодом | 2 |
| UI-FIELD | Плашка поля (баланс/ставка/выигрыш), 9-slice | 768×192 | normal | 2 |
| UI-WIDE | Широкая кнопка-плашка (каталог, ante), 9-slice | 768×192 | normal, on — перекраска | 2 |
| UI-PANEL | Панель диалога (правила, покупка, автоплей), 9-slice | 1024×1024 | normal | 2 |
| UI-COUNTER | Плашка счётчика ленты (LCD-окно магнитофона) | 1024×256 | normal | 2 |
| UI-SIDE | Малые плашки фриспинов / множителя / плёнки | 512×384 | normal, pulse кодом | 2 |
| UI-TAG | Ценник «вечерний тариф» для ante | 384×256 | off/on — перекраска | 2 |

Промпты (+ ISOLATED + STYLE, для плашек добавить `flat front view, empty center area for text, even edges for 9-slice`):
- UI-SPIN: `large round brushed-aluminum VCR play button with a soft amber glowing ring, slight bevel, front view`
- UI-RND: `small round black rubber VCR button with a thin silver bezel, front view, empty face`
- UI-FIELD: `rectangular black LCD display window set into a dark silver VCR panel, rounded corners`
- UI-WIDE: `wide rounded rectangular black plastic button with a thin magenta neon edge`
- UI-PANEL: `large panel styled as an open VHS clamshell case interior, dark plastic, subtle texture, rounded corners`
- UI-COUNTER: `long tape counter display of a 1980s VCR, green-black LCD window in a silver bezel`
- UI-SIDE: `small square black plastic label plate with a thin cyan neon edge`
- UI-TAG: `retro fluorescent orange price sticker shape with a torn edge, blank`

### 4.6 Оверлеи, бонус, покупки, логотип
| ID | Ассет | Размер | Ген. | Видео, ген. |
|---|---|---|---|---|
| OV-BIG | Подложка big win: лучи из открытой кассеты, разлетающаяся плёнка | 1920×1080 | 2 | 2 (петля 4 с) |
| OV-BADGE | Наклейки тиров (форма «рейтинг-наклейки», 4 цвета) | 512×512 | 4 (по 1 на тир, остальное перекраской) | — |
| OV-MAX | Плашка max win: золотая кассета в витрине | 1024×768 | 2 | — |
| OV-FS-IN | Интро бонуса «Ночная смена»: рольставня опускается, часы 00:00 без цифр | 1920×1080 | 2 | 2 (3 с) |
| BUY-1/2/3 | Обложки режимов покупки (три кассетных коробки без текста) | 512×768 | 6 | — |
| LOGO | Эмблема логотипа: кассета с неоновым ободом | 1024×512 | 3 | — |
| FX | Частицы выигрыша: билетики, попкорн, обрывки плёнки (лист спрайтов) | 1024×1024 | 2 | — |

Промпты (+ STYLE, для объектов + ISOLATED):
- OV-BIG: `burst of warm golden light rays coming out of an open VHS cassette in the center, loose magnetic tape ribbons flying outward, dark background, empty center for a title`
- OV-BIG видео: `tape ribbons flutter outward, light rays slowly rotate, loop` + VIDEO
- OV-BADGE: `round retro movie rating style sticker, blank center, glossy vinyl, thick outline`
- OV-MAX: `golden VHS cassette displayed in a glass showcase under a spotlight, sparkles`
- OV-FS-IN: `video store front at midnight seen from the street, metal roll-down shutter half closed, neon sign glowing magenta, wall clock with blank face, rainy reflections`
- OV-FS-IN видео: `shutter rolls down, neon flickers on, rain falls` + VIDEO
- BUY-1: `VHS rental box with abstract cover art of a night city skyline and a crescent moon, deep blue and magenta`
- BUY-2: `VHS rental box with abstract cover art of two overlapping cinema screens, magenta and cyan`
- BUY-3: `VHS rental box with abstract cover art of a director chair and a clapperboard silhouette, gold and black`
- LOGO: `black VHS cassette seen from the front, edges glowing with magenta and cyan neon, empty label area`
- FX: `sprite sheet grid of small game particles: paper rental tickets, popcorn kernels, short curls of magnetic tape, each separated, 4x4 grid`

### 4.7 Подача (этап 10)
| ID | Ассет | Размер | Ген. |
|---|---|---|---|
| TILE | Тайл игры | 1024×1024 | 2 |
| COVER | Обложка игры | 1920×1080 | 2 |
TILE / COVER: `promotional art, the night clerk grinning in front of the glowing CRT TV inside the video rental store, VHS boxes flying around, magenta and cyan neon, empty space for the game title` + STYLE (логотип накладывается сверху).

## 5. Итог по генерациям
| Группа | Картинки | Видео |
|---|---|---|
| Ключевой кадр и лист персонажа | 8 | — |
| Фоны и рамка ТВ | 8 | — |
| Символы | 32 | — |
| Дел: позы и анимации | 13 | 10 |
| UI | 17 | — |
| Оверлеи, бонус, покупки, логотип, частицы | 21 | 4 |
| Тайл и обложка | 4 | — |
| **Итого** | **103** | **14** |

**Экономный вариант:** без видео (анимация Дел и оверлеев кодом из поз), по 1 генерации на рядовой символ и UI-плашку. Получается около 70 картинок и 0–2 видео.

**Как перевести в кредиты:** кредиты = картинки × цена картинки + видео × цена видео (видео по 2–5 с). В этом треде инструментов Higgsfield нет, поэтому актуальную цену я проверить не могу. Перед каждым платным вызовом цена проверяется, а сначала делается один тест в минимальном качестве.

## 6. Утверждение стиля ⛔ (2026-10-11, 8 картинок получены)
Файлы: `art/style/KF_01..04.png`, `art/style/DEL_REF_01..04.png`, контакт-листы `art/style/contact_keyframes.jpg`, `art/style/contact_character.jpg`. Номера в парах совпадают (лист сделан по своему кадру).

**Расход (подтверждено балансом):** 7.5 кредита за 8 картинок: 0.5 за экономичный тест, 1.0 за картинку medium (2k). Отсюда прогноз на полный набор: ~100 кредитов на 103 картинки (тесты по 0.5). Цена видео ещё не измерена: нужен один тестовый клип 2–4 с, чтобы закрыть смету по 14 видео.

**Сверка со style guide**
| Пункт | Итог |
|---|---|
| Тёплый ключевой свет + magenta/cyan контровой | PASS во всех четырёх кадрах |
| Без текста (вывеска, бейдж, обложки) | PASS: вывеска пустая, бейдж пустой, обложки абстрактные (проверено на кропах) |
| Телевизор читается как CRT | KF_02 (дерево) и KF_04 (чёрный корпус с решёткой) — PASS; KF_01 и KF_03 — плоская рамка, слабее |
| Стилизованный полуреализм | KF_02/03/04 и листы 02/03/04 — PASS; вариант 01 ближе к фотореализму |
| Лист персонажа: три ракурса, согласованность | 04 — лучший (причёска, жилет, бейдж, часы, кеды совпадают); 03 — ракурс 3/4 почти анфас; 01/02 — пульт и руки меняются между ракурсами |
| Символы в кадре | попкорн, стакан, телефон, кассеты, ключ, кассета со звездой уже читаются при малом размере → эталон рендера для серии символов |

**Рекомендация:** пара **KF_04 + DEL_REF_04**. Чёрный CRT попадает в токен Tape black и не спорит с неоном, лицо Дела дружелюбное и стилизованное, лист самый согласованный. Альтернатива: KF_02 + DEL_REF_02, если нужен деревянный корпус ТВ и более «тёплая» лавка.

**Следствия для серии после утверждения**
- TV: промпт меняем под выбранный кадр (чёрный корпус, решётка динамика снизу, без дерева) и добавляем выбранный KF как референс.
- Символы: в каждый промпт добавляется `match the render style of the reference key frame` + выбранный KF референсом. Low-символы остаются кнопками пульта (в кадре нарисован целый пульт, это допустимо как ориентир материала).
- Позы Дела: референс DEL_REF выбранного варианта во всех генерациях; пульт всегда в правой руке.
- Листы не являются техническими модельными листами: мелкие расхождения складок допускаются, проверяем только лицо, причёску, жилет, бейдж, кеды.

## 6a. Приёмка пачки 01 (2026-10-11)
Источники: `art/src/batch01/` (15 PNG на зелёном, 13 кредитов). Мастера с альфой: `art/masters/symbols/sym_*.png` (512×512, квадратный холст по bbox + 6 % поля), `art/masters/scene/tv_frame.png` (1432×1158). Контакт-лист 160/64 px: `art/masters/contact_batch01.jpg`. В сборке: `frontend/src/assets/symbols/*.webp` (q88, 30–54 КБ), `assets/scene/tv_frame.webp` (131 КБ), всего 766 КБ.

| Проверка | Итог |
|---|---|
| Кей: заливка от границы по связному зелёному, despill края, крупнейшая компонента | PASS, остаточного зелёного на краях нет |
| Читаемость при 64 px на тёмном и на синем экране | PASS, все 14 различимы |
| WILD / KEY / REW узнаются мгновенно | PASS по цвету (золото / cyan / magenta). Риск: W и R — обе горизонтальные кассеты, силуэты похожи; различие держится на цвете и свечении выигрыша, при интеграции добавим пульс magenta на R |
| Текст внутри картинок | PASS, цифры на телефоне убраны поставщиком |
| Отклонения | M3 — целый настольный телефон вместо трубки (как в KF_04), принят. H1 перекрашен в бирюзовый вместо зелёного, принят: лучше отличается от H3 и не бьётся кеем |
| Рамка ТВ | окно экрана чистое: доли холста x 0.0915–0.9071, y 0.0984–0.8014; экран 4:3, барабаны стоят в нём с полями сверху/снизу под OSD и плашку выигрыша. Низ корпуса (решётка) уходит под HUD |

Геометрия в коде (`frontend/src/js/game.js`, `layout()`): ячейка 120 px в лендскейпе и 112 px в портрете, рамка считается от размера барабанов, экран (#screen) — синяя трубка со скан-лайнами кодом, в бонусе перекрашивается в фиолетовый.

## 6b. Приёмка пачки 03 — финальная графика (2026-10-11)
Источник: `Late_Fee_Final_Graphics.zip` (29 картинок + 7 видео, 47.5 кредитов; всего на проект 68). Сконвертированные ассеты: `art/masters/final/` (копия того, что стоит в сборке) и контакт-лист `art/masters/final/contact_batch03.jpg`. В сборке `frontend/src/assets/`: 8.8 МБ вместе с видео.

| Группа | Что сделано | Итог |
|---|---|---|
| Фоны | bg_land / bg_bonus 2560 px + копии 1280 px для телефонов; бонусный фон кроссфейдом 0.8 с | PASS |
| Дел | 7 поз откеены в общий бокс (один холст, низ по полу); 5 видео → спрайт-ленты 12 fps (idle 48 кадров, lean/cheer/wow/rew по 24), запуск через `steps()`, одноразовые позы сами возвращаются в idle; pause и bored — стилы | PASS, без filter на слоях спрайтов |
| UI-плашки | field, wide, panel, counter, side — 9-slice через border-image; spin и round — картинки, состояния (hover, on, disabled) кодом; поставленные `ui_states/` и `alpha/` не использованы | PASS |
| Диалоги | общая панель ui_panel 9-slice; обложки покупок (night/double/director) в каталоге | PASS |
| Оверлеи | big win: видео-луп (mp4 H.264 + webm VP9 для сборок без H.264) + бейдж по тиру (big/mega/epic/cult, тиры сделаны сдвигом оттенка из одного бейджа) + частицы (билеты, попкорн, лента, искры, 4×4); интро бонуса — видео в баннере; max win — плашка-картинка | PASS |
| Прочее | логотип на сплэше, бирка ante у поля ставки, счётчик плёнки на плашке counter; прелоад расширен (фон, idle-лента, логотип, UI) | PASS |
| QA | 18/18 PASS, 8 вьюпортов без скролла, состояния: `qa/stage5/final/` | PASS |

Решения: кей делаем сами из зелёных исходников (чище, чем поставленная альфа); состояния кнопок только кодом; видео Дела режем в ленты, а не играем как video (прозрачность, Safari). Отклонение: в HUD лендскейпа кнопки ужаты до 58 px и поля до 160 px, иначе не влезало в 1024 px рабочей ширины.

## 7. Порядок генерации
1. KF и DEL-REF → ⛔ утверждение стиля. **Сделано: KF_04 + DEL_REF_04.**
2. Символы по одному тесту на группу (L, M, H, спец), затем серия. **Сделано: пачка 01 принята и стоит в прототипе.**
3–6. Всё оставшееся — **пачка 03 принята и стоит в прототипе** (`art/batches/batch_03_final_all.md`, 29 картинок + 7 видео, см. §6b). Рамка ТВ получена в пачке 01.
4. Позы Дел, затем видео (только после проверки поз).
5. Оверлеи, покупки, логотип, частицы.
6. Тайл и обложка (этап 10).

## 7. Пачка 04: переходы Дела и живой блок персонажа — принята 2026-10-12
Принцип «хаб»: все клипы начинаются и заканчиваются на опорной позе (del_idle.png), поза — в середине; состояния с удержанием (lean, pause, bored) = IN + LOOP + OUT. Получено 13 клипов (12 новых + idle, приведённый к опорному кадру) и стойка возврата; первый и последний кадр каждого клипа совпадают с опорными PNG (MAE 0), ступни на одной высоте. Исходники и проверки: `art/masters/final/del_b04/` (anchors, stand_layers, manifest, checks).
В игре: `frontend/src/assets/del/` — 13 лент с кадром 384×754 @12 fps (плотная обрезка исходников 720×1080, Дел ≈740 px; lossy WebP q82, 9.6 МБ; idle в 2 ряда по 24, остальные в один ряд; нарезка `frontend/tools/art/cut_del_strips.py`) и `m/` 288×566 для телефонов (6.8 МБ), `del_stand.webp`; `js/del.js` — машина состояний (idle ⇄ lean/pause/bored через in/loop/out, cheer/rew из хаба в хаб, wow прерывает с кроссфейдом 150 мс, выход из петли на границе прохода или с кроссфейдом), блок персонажа (Дел и тень двигаются: сдвиг на спине, наклон в anticipation, подскок на выигрыше, rim-свет на big win; стойка стоит на месте: мерцание лампы, шум на мини-CRT с canvas, REC в бонусе); `css/del.css`. В портрете стойка и тень скрыты. Промпты: `art/batches/batch_04_del_transitions.md`, карта `art/ref/del_transition_map.jpg`.

## 8. Пачка 05: живые символы (idle-петли) — промпты выданы 2026-10-12
По референсу пользователя (`art/ref/symbol_idle_ref.jpg`): у каждого стоячего символа своя короткая петля. План, промпты и интеграция: `art/batches/batch_05_symbol_idle.md`.
**Принято 2026-10-13 (частично).** Пришёл экономный вариант: видео (Kling 3.0, 31,5 кредита) только у M1, M2, M3, P, S, W; у L1–L4, H1–H3 и R — локальная анимация поверх стила (нажатие и вспышка кнопок, блики, пульс стрелок), движение почти незаметное (у L3, R, H1–H3 среднее отклонение кадра < 2/255). Мастера пачки не совпадают с нашими стилами по масштабу, поэтому ленты перерезаны из mp4 на зелёном `tools/art/cut_sym_strips.py` с выравниванием по нашим мастерам (первый кадр отличается от стила на 3–9/255). В игре: `frontend/src/assets/symbols/idle/` (14 лент 24 кадра 256×256, 3.5 МБ, `m/` 128×128, 1.3 МБ, `idle.json`), грузятся после PLAY; петли только на 3 видимых рядах; одинаковые символы идут синхронно (общие часы, фаза по типу символа), после прохода пауза 2 с, на спине выключены. Исходники: `art/masters/final/sym_b05/`. **Пачка 05b принята 2026-10-13:** 8 недостающих клипов (L1–L4, H1–H3, R; Kling 3.0, 36 кредитов) сгенерированы от наших игровых стилов, неподвижный корпус сохранён композитингом из мастера, поэтому ленты встали без перерезки (альфа совпадает со стилом, первый кадр отличается только сжатием 3–7/255, стык петли < 1/255). Движение: нажатие и вспышка кнопок, бегущие стрелки REW-кнопки, мигание полосок PAUSE, глаз Horror, взрыв Action, планета Sci-Fi, стрелки и катушки REW. Все 14 символов живут: `frontend/src/assets/symbols/idle/` 4.7 МБ (десктоп 3.4 + телефон 1.3). Исходники: `art/masters/final/sym_b05b/`.

## 9. Пачка 06: живой фон и рамка ТВ — принята 2026-10-14, в сборке v15
Пришёл путь 1: `bg_land_loop` и `bg_bonus_loop` (1280×720, 24 fps, 6 с, Kling 3.0; неподвижные зоны возвращены из мастера по `motion_mask.png`, первый = последний кадр) и `tv_frame_loop` (1432×1158, 4 с, lossless на зелёном: блик по корпусу, дыхание rim-света, импульс LED), плюс пластины состояний `tv_frame_win` / `tv_frame_bonus` с альфой, идентичной нашей `tv_frame.webp` (расхождение альфы 0.14/255). Проверка: движение внутри маски 4.4, вне маски 1.1 (шум кодека, полки стоят), шов петли 2.2, альфа петли после VP9 0.007. 18 кредитов.
Интеграция: фоны перекодированы в H.264 crf 21 + VP9 (0.5–0.9 МБ на клип), рамка размыта с зелёного по альфе мастера и закодирована в VP9 с альфой (223 КБ); `LIVE` в game.js создаёт `<video>` только на десктопе (телефоны, портрет, reduced motion и быстрый режим QA остаются на картинках), кадр петли рамки проверяется на холсте (окно экрана должно быть прозрачным, иначе видео снимается), кроссфейд базы и бонуса 0.8 с с паузой невидимого клипа, пластина win на 0.5 с (слабая при выигрыше < 5 ставок), пластина bonus с пульсом 120 BPM, всплеск статики на экране в первые кадры спина, параллакс фона 8×6 px за курсором. Мастера: `art/masters/final/bg_tv_b06/`. QA: `tools/qa_live.js`.
Правка v16: Дел опущен за стойку проката (срез фона `counter_land/bonus.webp`, строки 1122–1440 мастера, перед #del и под счётчиком ленты, позиционируется в layout() по той же center/cover-геометрии, что #bg, следует за параллаксом и кроссфейдом бонуса); шов проверен попиксельно на 5 размерах окна. Рамка замороженных барабанов и anticipation — скруглённое свечение по колонкам.
