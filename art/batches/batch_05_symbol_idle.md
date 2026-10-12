# Пачка 05 — живые символы: idle-петли для 14 символов

Референс: видео пользователя (кадры `art/ref/symbol_idle_ref.jpg`). Что в нём работает: у каждого стоячего символа своя маленькая петля 1.5–3 с (фонарь качается, пламя на A дрожит, глаза черепа светятся, хвост у Q виляет, на K проскакивают искры), амплитуда малая, силуэт и место символа не меняются, петли в соседних ячейках идут со сдвигом фазы, поэтому поле «дышит», а не дёргается. На спине всё это выключено (блюр), в выигрыше символ подсвечен и анимация крупнее.

**Как делаем у нас.** Как в пачке 04: image-to-video с **первым и последним кадром = PNG символа** (`art/masters/symbols/sym_*.png`, 512×512 на зелёном `#00FF00` или прозрачный → кладём на зелёный), статичная камера, 2 с (если минимум модели 3 с — генерировать 3 с, отрежу и ретаймлю при нарезке), движение в середине, возврат точно в первый кадр. Нарезка в ленты 24 кадра @12 fps, 256×256 на кадр (6144×256, ~300 КБ) и 128×128 для телефонов; всего ≈5 МБ, грузится после PLAY. Промпты ниже; к каждому в конце хвост:
`VIDEO = static camera, no zoom, the object stays exactly in place and keeps its silhouette, same size, same lighting, same materials, subtle loopable motion, returns exactly to the first frame for a seamless loop, flat pure green background stays untouched, no new objects, 24 fps`

Если у сервиса нет режима «последний кадр»: добавить `…and settles back into the exact starting pose for the last 0.5 s`, стык доведу кроссфейдом 100 мс.

## 1. Список и промпты (14 клипов, 2 с каждый)

| ID | Символ | Файл | Движение |
|---|---|---|---|
| V-L1 | PLAY-кнопка | `sym_L1_idle.mp4` | кнопка один раз мягко вдавливается и отпускается, синий треугольник на миг вспыхивает |
| V-L2 | STOP-кнопка | `sym_L2_idle.mp4` | красный колпачок чуть покачивается, по нему пробегает блик |
| V-L3 | REW-кнопка | `sym_L3_idle.mp4` | две стрелки подсвечиваются по очереди справа налево, как бегущий индикатор |
| V-L4 | PAUSE-кнопка | `sym_L4_idle.mp4` | жёлтые полоски мигают по очереди, кнопка чуть вдавливается |
| V-M1 | Попкорн | `sym_M1_idle.mp4` | одно зерно подпрыгивает над ведёрком и падает обратно, ведёрко чуть вздрагивает |
| V-M2 | Стакан | `sym_M2_idle.mp4` | трубочка наклоняется и возвращается, по стенке сползает капля конденсата |
| V-M3 | Телефон | `sym_M3_idle.mp4` | трубка дребезжит как при звонке, витой шнур покачивается |
| V-H1 | Кассета Horror | `sym_H1_idle.mp4` | глаз на обложке моргает и косится вбок, туман на обложке медленно плывёт |
| V-H2 | Кассета Action | `sym_H2_idle.mp4` | взрыв на обложке вспыхивает ярче и гаснет, искры, силуэт чуть сдвигается |
| V-H3 | Кассета Sci-Fi | `sym_H3_idle.mp4` | планета медленно поворачивается, звёзды мерцают |
| V-P | Дел (портрет) | `sym_P_idle.mp4` | надувает пузырь жвачки, пузырь лопается, моргает |
| V-W | WILD (кассета со звездой) | `sym_W_idle.mp4` | звезда на наклейке искрится, катушки внутри кассеты делают полоборота |
| V-S | KEY (ключи) | `sym_S_idle.mp4` | ключи качаются на кольце, бирка-кассета качается в противофазе, золотой блик |
| V-R | REW (кассета) | `sym_R_idle.mp4` | неоновые стрелки пульсируют, катушки крутятся назад |

### V-L1 `sym_L1_idle.mp4` (first = last = sym_L1.png)
```
a chunky 1980s remote control PLAY button, the key presses down softly once and springs back, the blue triangle flashes brighter for a moment, VIDEO
```
### V-L2 `sym_L2_idle.mp4`
```
a chunky 1980s remote control STOP button with a red cap, the cap rocks very slightly, a soft highlight sweeps across the glossy red plastic from left to right, VIDEO
```
### V-L3 `sym_L3_idle.mp4`
```
a chunky 1980s remote control REWIND button with two arrows, the two arrows light up one after the other from right to left like a running indicator, then both fade back, VIDEO
```
### V-L4 `sym_L4_idle.mp4`
```
a chunky 1980s remote control PAUSE button with two yellow bars, the bars blink alternately twice, the key presses down a hair and springs back, VIDEO
```
### V-M1 `sym_M1_idle.mp4`
```
a red and white striped popcorn bucket full of popcorn, a single kernel pops up above the rim and drops back into the pile, the bucket gives a tiny jiggle, VIDEO
```
### V-M2 `sym_M2_idle.mp4`
```
a paper soda cup with a red and white striped straw, the straw tilts a little and comes back, a drop of condensation slides down the side of the cup, VIDEO
```
### V-M3 `sym_M3_idle.mp4`
```
a red rotary-era desk telephone, the handset rattles in its cradle as if ringing, the coiled cord sways gently, then everything settles, VIDEO
```
### V-H1 `sym_H1_idle.mp4`
```
a VHS box with a horror cover showing a large eye in teal mist, the eye blinks once and glances to the side and back, the mist drifts slowly across the cover, VIDEO
```
### V-H2 `sym_H2_idle.mp4`
```
a VHS box with an action movie cover, the explosion on the cover flares brighter with a few sparks and dims back, the silhouette of the hero shifts slightly, VIDEO
```
### V-H3 `sym_H3_idle.mp4`
```
a VHS box with a sci-fi cover showing a ringed planet in space, the planet rotates slowly, stars on the cover twinkle, VIDEO
```
### V-P `sym_P_idle.mp4` (+ REF DEL_REF_04)
```
a rounded portrait tile of a teenage night clerk in a maroon vest, he blows a pink bubblegum bubble that grows and pops flat, blinks and smirks, keeps the same framing and design, VIDEO
```
### V-W `sym_W_idle.mp4`
```
a black VHS cassette with a gold star sticker, the star sparkles with small glints, the two reels inside turn half a rotation, VIDEO
```
### V-S `sym_S_idle.mp4`
```
a brass key with a small cassette-shaped tag on a key ring, the keys swing gently on the ring while the tag swings the opposite way, a gold glint passes over the key, VIDEO
```
### V-R `sym_R_idle.mp4`
```
a black VHS cassette with glowing magenta neon rewind arrows, the arrows pulse twice, the reels inside spin backwards, VIDEO
```

## 2. Экономный вариант (6 видео + код)
Видео: M1, M2, M3, P, S, W (там, где движение внутри предмета). Кодом: кнопки L1–L4 (нажатие = scale 0.96 + вспышка цветным overlay по маске кнопки, блик — градиент-полоса), кассеты H1–H3 и R (медленный блик по обложке, у R пульс стрелок цветным overlay). Выглядит ровнее, чем у референса, но не так «живо».

## 3. Интеграция (сделаю сам)
- В `reels.js` у ячейки появляется слой idle-ленты (`.sym .idle`), стил остаётся под ним; анимация только у видимых 15 ячеек, у каждой свой сдвиг фазы (0–2 с) и случайная пауза 1–3 с между проходами, чтобы поле не моргало синхронно.
- Спин: слой скрыт, видна только размытая лента. Выигрыш: подсветка как сейчас + петля играет без пауз и на 1.3× быстрее. `prefers-reduced-motion` — статика.
- Приёмка: первый и последний кадр против PNG (MAE < 2 %), кей зелёного, общий бокс 512×512 по мастеру, нарезка `tools/art/cut_sym_strips.py`. Проверка веса (≤5 МБ после PLAY) и FPS на 15 анимированных ячейках в Chromium.

## 4. Счёт
По расходу пачки 04 (60,5 кредитов на 11 клипов + стойка + 1 переделка): полная — 14 клипов ≈ 75–85 кредитов с одной переделкой на 3–4 клипа; экономная — 6 клипов ≈ 35. Главное условие приёмки — возврат в первый кадр.
