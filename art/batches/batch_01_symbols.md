# Пачка 01 — символы и рамка ТВ (15 генераций)

Референс для всех: `art/style/KF_04.png` (reference / img2img, сила 0.2–0.35). Для символа P дополнительно `art/style/DEL_REF_04.png`.
Размер: 1:1, 1024×1024 или больше (мастер 512 нужен вдвое меньше, уменьшим сами). ТВ: 3:2.
Негатив (везде): `text, letters, numbers, logo, watermark, signature, real movie titles, real brands, Blockbuster, Hollywood Video, famous characters, blurry, lowres, extra fingers, deformed hands, cropped, frame border`

## Порядок
1. Тесты в минимальном качестве: **L1, M1, H1, W** (4 × 0.5 кр.). Если фон ровно зелёный, силуэт читается при 64 px и материал совпадает с KF_04 — дальше.
2. Остальные 10 символов и ТВ в medium (11 × 1 кр.). Повторы только для тех, что не прошли проверку.
3. Файлы называть по ID: `sym_L1.png` … `sym_R.png`, `tv_frame.png`. Архивом сюда.

## Промпты (копировать целиком)

### 1. L1 — Кнопка ▶ Play
```
chunky rubber TV remote button with an embossed right-pointing triangle play icon, glossy dark plastic, soft green accent, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 2. L2 — Кнопка ■ Stop
```
chunky rubber TV remote button with an embossed square stop icon, glossy dark plastic, soft red accent, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 3. L3 — Кнопка ◀◀ Rew
```
chunky rubber TV remote button with an embossed double left triangle rewind icon, glossy dark plastic, soft blue accent, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 4. L4 — Кнопка ❚❚ Pause
```
chunky rubber TV remote button with an embossed two vertical bars pause icon, glossy dark plastic, soft yellow accent, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 5. M1 — Попкорн
```
striped paper bucket overflowing with buttery popcorn, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 6. M2 — Газировка
```
large waxed paper soda cup with lid and bendy straw, condensation drops, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 7. M3 — Телефон
```
retro 1980s coiled-cord telephone handset in bright red plastic, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 8. H1 — Кассета «Ужасы»
```
VHS rental case standing upright, green clamshell box, abstract original horror cover art with a glowing eye in fog, no text, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 9. H2 — Кассета «Боевик»
```
VHS rental case standing upright, red clamshell box, abstract original action cover art with an explosion silhouette, no text, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 10. H3 — Кассета «Sci-Fi»
```
VHS rental case standing upright, blue clamshell box, abstract original sci-fi cover art with a ringed planet and starfield, no text, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 11. P — Дел
```
bust portrait of the night clerk from the reference sheet, same face and hair, maroon vest, grinning, blowing a pink bubblegum bubble, framed inside a rounded square badge, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 12. W — WILD
```
blank black VHS cassette tape facing camera with a big shiny gold star sticker on the label, golden glow, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 13. S — KEY (scatter)
```
old brass key on a ring with a cyan plastic tag shaped like a cassette, glowing cyan aura, after-hours return box key, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 14. R — REW
```
black VHS cassette tape tilted, magenta glowing double left arrow motion trail, tape spools spinning backwards, match the render style, lighting and material quality of the symbols in the reference key frame, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

### 15. TV — рамка телевизора (3:2, экран пустой зелёный)
```
front view of a chunky 1980s CRT television, matte black plastic cabinet with a horizontal speaker grille strip at the bottom and a thin dark bezel, exactly like the TV in the reference key frame, rounded screen area completely empty and flat pure green #00FF00 for cutout, single object centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```

## Что проверю при приёмке
- альфа после кея чистая, без зелёной каймы; кассеты H1–H3 различимы цветом коробки при 64 px;
- WILD / KEY / REW узнаются мгновенно и отличаются от обычных символов формой и цветом (золото / cyan / magenta);
- ни одной буквы и цифры внутри картинок.
