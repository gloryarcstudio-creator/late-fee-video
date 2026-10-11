# Пачка 02 — фоны, рамка сцены и UI (12 генераций, ≈12 кредитов)

Референс для всех: `art/style/KF_04.png` (reference / img2img, сила 0.2–0.35). Негатив тот же, что в пачке 01.
Общие блоки: STYLE = `stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset`; ISOLATED = `single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin`.

## Порядок
1. BG-L (2 генерации, 16:9, максимальное разрешение). Выбираем лучший, он идёт референсом для BG-B.
2. BG-B img2img из выбранного BG-L (2 генерации, сила 0.4–0.5).
3. UI: 8 плашек и кнопок по одной генерации в medium. Сначала UI-SPIN как тест семейства: если материал (чёрный пластик + серебро + неон) совпал с рамкой ТВ, остальные семь.
Файлы: `bg_land.png`, `bg_bonus.png`, `ui_spin.png`, `ui_round.png`, `ui_field.png`, `ui_wide.png`, `ui_panel.png`, `ui_counter.png`, `ui_side.png`, `ui_tag.png`. Архивом сюда.

## Промпты

### 1. BG-L — фон лендскейп (16:9, без людей и без телевизора)
```
wide interior of a small 1989 video rental store at night seen from the customer side of the counter, the same store as the reference key frame, empty center where the TV and clerk were, wooden shelves with rows of anonymous VHS boxes with abstract colorful covers, wooden return counter along the bottom edge, ceiling lamp casting warm amber light, window on the right with a dark rainy street and a blank magenta neon sign frame, hanging plant top left, carpet floor, no people, no television, no text, soft depth of field on the background, STYLE
```

### 2. BG-B — фон бонуса (img2img из BG-L)
```
same video rental store after closing time, main ceiling lamp off, room lit only by magenta and cyan neon from the window and a cold blue glow from the center, deeper shadows on the shelves, rain heavier on the window, moody and quiet, no people, no television, no text, STYLE
```

### 3. UI-SPIN — кнопка спина (1:1)
```
large round brushed-aluminum VCR play button with a soft amber glowing ring around the rim, slight bevel, matte black plastic base ring, front view, empty face without any icon, matches the material of the black CRT television in the reference, ISOLATED, STYLE
```

### 4. UI-RND — малая круглая кнопка (1:1)
```
small round black rubber VCR button with a thin brushed-silver bezel, front view, empty face without any icon, ISOLATED, STYLE
```

### 5. UI-FIELD — плашка поля баланса / ставки / выигрыша (4:1)
```
long rectangular black LCD display window set into a dark brushed-silver VCR panel, rounded corners, flat front view, empty center area for text, even straight edges for 9-slice, ISOLATED, STYLE
```

### 6. UI-WIDE — широкая кнопка (4:1)
```
wide rounded rectangular black plastic button with a thin magenta neon edge light, flat front view, empty center area for text, even straight edges for 9-slice, ISOLATED, STYLE
```

### 7. UI-PANEL — панель диалогов (1:1)
```
large square panel styled as the inside of an open black VHS clamshell rental case, dark textured plastic, rounded corners, thin silver inner frame, flat front view, empty center area for text, even straight edges for 9-slice, ISOLATED, STYLE
```

### 8. UI-COUNTER — счётчик ленты (4:1)
```
long tape counter display of a 1980s VCR, dark green-black LCD window inside a brushed-silver bezel with tiny blank buttons on the right, flat front view, empty center area for digits, ISOLATED, STYLE
```

### 9. UI-SIDE — малая плашка фриспинов / множителя (4:3)
```
small rectangular black plastic label plate with a thin cyan neon edge light and rounded corners, flat front view, empty center area for text, even straight edges for 9-slice, ISOLATED, STYLE
```

### 10. UI-TAG — ценник ante (3:2)
```
retro fluorescent orange paper price sticker with a torn edge and a slight curl, blank, flat front view, ISOLATED, STYLE
```

## Что проверю при приёмке
- фон: пустая зона по центру под ТВ и Дела, стойка внизу под HUD, нет надписей на обложках и вывеске;
- плашки: прямые края и чистое поле в центре (иначе 9-slice тянет рисунок);
- кнопки: круглые, без иконок, одинаковый материал с рамкой ТВ.
