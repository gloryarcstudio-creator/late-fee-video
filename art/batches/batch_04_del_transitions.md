# Пачка 04 — Дел: плавные переходы между позами и живой блок персонажа

Цель: ни одного жёсткого среза между состояниями Дела. Сейчас каждое видео сделано из своей позы, поэтому idle → lean / cheer / wow / rew / pause / bored переключаются скачком (см. `art/ref/del_current_cuts.jpg`: только idle начинается и кончается в хабе).

**Принцип «хаб».** Одна опорная поза — `del_idle.png` (она же кадр 1 и кадр 48 петли `del_idle.mp4`). Каждое новое видео **начинается и заканчивается ровно на этой позе**, а целевая поза проходит в середине. Тогда любой переход = idle-петля → клип → idle-петля без стыка. Карта: `art/ref/del_transition_map.jpg`.

**Режим генерации.** Image-to-video с **первым и последним кадром** (в Higgsfield / Kling / Runway / Luma это «start & end frame», «keyframes», «first/last frame»). Первый и последний кадр: `Late_Fee_Final_Graphics/del_idle.png` (зелёный фон, 1024×1536). Референс персонажа: `art/style/DEL_REF_04.png`. Целевая поза даётся текстом; если сервис принимает средний кадр или image reference — приложить PNG позы из той же папки (`del_lean.png` и т.д.).
Если режима «последний кадр» нет: генерировать только с первым кадром и добавлять в конец промпта `…returns exactly to the starting pose and holds it still for the last 0.5 s`; стык доведу кодом (кроссфейд 150 мс, см. §4).

**Общие параметры видео.** 2:3 (720×1080 или 1024×1536), 24 fps, static camera, зелёный фон #00FF00 как на исходнике, персонаж не выходит из кадра, ступни на месте (ноги не переступают, иначе ленты не совпадут по полу). Хвост промпта у всех одинаковый:
`VIDEO = static camera, no camera movement, no zoom, character stays in frame, feet planted on the same spot, keep the character design, outfit, colors and lighting identical to the reference, flat pure green background stays untouched, no new objects, 24 fps`

---

## 1. Список видео

Полный вариант — 12 клипов; экономный — 7 (помечены ★). Длительности — для нарезки в ленты 12 fps.

| ID | Файл | Кадры first / last | Длит. | Для чего |
|---|---|---|---|---|
| ★ V-CHEER2 | `del_cheer_t.mp4` | idle / idle | 2.5 с | выигрыш (заменяет del_cheer.mp4) |
| ★ V-WOW2 | `del_wow_t.mp4` | idle / idle | 3 с | big win, запуск бонуса (заменяет del_wow.mp4) |
| ★ V-REW2 | `del_rew_t.mp4` | idle / idle | 2.5 с | перемотка (заменяет del_rew.mp4) |
| ★ T-LEAN-IN | `del_lean_in.mp4` | idle / lean | 1 с | anticipation начинается |
| (loop) | `del_lean.mp4` | lean / lean | есть | удержание — текущая петля подходит, если её первый кадр ≈ last frame T-LEAN-IN; иначе V-LEAN-LOOP ниже |
| ★ T-LEAN-OUT | `del_lean_out.mp4` | lean / idle | 1 с | anticipation закончилась |
| V-LEAN-LOOP | `del_lean_loop.mp4` | lean / lean | 2 с, петля | перегенерация удержания от нового кадра lean |
| ★ T-PAUSE-IN | `del_pause_in.mp4` | idle / pause | 1 с | PAUSE ❚❚ |
| V-PAUSE-LOOP | `del_pause_loop.mp4` | pause / pause | 2 с, петля | удержание (экономно: стил del_pause.png + лёгкое дыхание кодом) |
| ★ T-PAUSE-OUT | `del_pause_out.mp4` | pause / idle | 1 с | респин закончился |
| T-BORED-IN | `del_bored_in.mp4` | idle / bored | 1.5 с | проигрыш |
| V-BORED-LOOP | `del_bored_loop.mp4` | bored / bored | 3 с, петля | ждёт следующего спина |
| T-BORED-OUT | `del_bored_out.mp4` | bored / idle | 1 с | нажали спин |

Для IN/OUT клипов первый и последний кадр — соответствующие PNG поз (`del_idle.png` ↔ `del_lean.png` и т.д.). Для LOOP — одна и та же поза в начале и конце.

## 2. Промпты видео

### V-CHEER2 → `del_cheer_t.mp4` (first = last = del_idle.png, 2.5 с)
```
starts in the relaxed idle pose, then a quick happy fist pump with the left hand, big grin, small hop, the remote stays in the right hand, settles back down and returns exactly to the starting idle pose, chewing gum, VIDEO
```
### V-WOW2 → `del_wow_t.mp4` (first = last = del_idle.png, 3 с)
```
starts in the relaxed idle pose, eyes go wide, both hands fly up to the head, jaw drops, the pink bubblegum bubble pops flat on the face, an excited little hop, then the hands come down, he wipes the gum back in with a grin and returns exactly to the starting idle pose, VIDEO
```
### V-REW2 → `del_rew_t.mp4` (first = last = del_idle.png, 2.5 с)
```
starts in the relaxed idle pose, raises the remote with both hands, presses it hard twice with both thumbs, arms recoil, head jerks back slightly, determined frown, then relaxes, lowers the remote to the hip and returns exactly to the starting idle pose, VIDEO
```
### T-LEAN-IN → `del_lean_in.mp4` (first = del_idle.png, last = del_lean.png, 1 с)
```
from the relaxed idle pose he leans forward toward the viewer, eyes widen, brings the remote up and grips it with both hands near the chest, holds his breath, ends exactly in the leaning pose, VIDEO
```
### T-LEAN-OUT → `del_lean_out.mp4` (first = del_lean.png, last = del_idle.png, 1 с)
```
from the leaning forward pose he exhales, straightens up, lets the remote drop loosely to the right hip, calm half-smile, ends exactly in the relaxed idle pose, VIDEO
```
### V-LEAN-LOOP → `del_lean_loop.mp4` (first = last = del_lean.png, 2 с, петля)
```
leaning forward, eyes wide, tiny tremble of the hands on the remote, slow blink, holds breath, subtle loopable motion, returns exactly to the starting frame for a seamless loop, VIDEO
```
### T-PAUSE-IN → `del_pause_in.mp4` (first = del_idle.png, last = del_pause.png, 1 с)
```
from the relaxed idle pose he raises the right arm and points the remote straight at the viewer, thumb pressing a button, smug smirk, ends exactly in the pointing pose, VIDEO
```
### T-PAUSE-OUT → `del_pause_out.mp4` (first = del_pause.png, last = del_idle.png, 1 с)
```
from the pointing pose he lowers the remote to the right hip, smirk fades into a calm half-smile, shoulders relax, ends exactly in the relaxed idle pose, VIDEO
```
### V-PAUSE-LOOP → `del_pause_loop.mp4` (first = last = del_pause.png, 2 с, петля)
```
pointing the remote at the viewer, thumb presses the button once, tiny recoil of the wrist, slow blink, chewing gum, subtle loopable motion, returns exactly to the starting frame for a seamless loop, VIDEO
```
### T-BORED-IN → `del_bored_in.mp4` (first = del_idle.png, last = del_bored.png, 1.5 с)
```
from the relaxed idle pose he sighs, shoulders drop, rests his chin on the left hand, unimpressed look, remote hangs in the right hand, ends exactly in the bored pose, VIDEO
```
### V-BORED-LOOP → `del_bored_loop.mp4` (first = last = del_bored.png, 3 с, петля)
```
chin resting on the hand, chews gum slowly, slow blink, eyes drift to the side and back, subtle loopable motion, returns exactly to the starting frame for a seamless loop, VIDEO
```
### T-BORED-OUT → `del_bored_out.mp4` (first = del_bored.png, last = del_idle.png, 1 с)
```
from the bored pose he perks up, lifts the head off the hand, straightens, half-smile, ends exactly in the relaxed idle pose, VIDEO
```

## 3. Живой блок персонажа (допущение)

Под «элементом с персонажем» понимаю место, где стоит Дел: сейчас он стоит на пустом полу слева от ТВ. Предлагаю сделать его уголок частью сцены и двигать его целиком. Если имелся в виду другой элемент (например, портрет Дела в символе P или плашка рядом), скажите, допишу.

**3a. Картинка `del_stand.png`** (image, 3:2 1536×1024, референс KF_04, 1–2 генерации). Низкая тележка возврата кассет под левой рукой Дела: деревянная стойка по пояс, на ней стопка VHS, настольная лампа с янтарным абажуром, маленький чёрно-белый телевизор-монитор с «снегом», корзина RETURNS. Без текста.
```
small video rental store side counter, waist-high wooden counter corner with a short stack of blank VHS tapes, a small amber desk lamp, a tiny black-and-white portable CRT monitor showing static, a wire returns basket, no people, no text, no labels, single object group centered, isolated on flat pure green background #00FF00, no shadow on background, full object in frame with 8% margin, stylized semi-realistic 3D illustration, hand-painted textures, 1989 video rental store at night, warm amber key light from top-left, magenta and cyan neon rim light, crisp readable silhouette, subtle film grain, rich but not oversaturated colors, high detail, game asset
```
**3b. Видео `del_stand.mp4`** (image-to-video из del_stand.png, 4 с, петля, 0–1 генерация; экономно — без видео, всё кодом):
```
the desk lamp flickers very slightly, static snow dances on the tiny CRT screen, the top VHS tape on the stack wobbles once, everything else perfectly still, seamless loop, returns exactly to the first frame, VIDEO
```
**3c. Движение блока кодом (0 кредитов), слой `#delBlock` = Дел + стойка + тень:**
- idle: дыхание блока ±2 px по Y с периодом 4 с, в такт петле Дела; лампа — мерцание свечения 0.9–1.0 раз в 1–3 с; «снег» на мини-CRT — canvas-шум 8 fps (как трекинг);
- спин: блок плавно сдвигается на 8 px к телевизору за 300 мс и возвращается после остановки барабанов;
- anticipation: наклон блока на 2° к ТВ + лампа мигает чаще;
- выигрыш: два коротких подскока (6 px, 180 мс), стопка кассет «подпрыгивает» на 2 кадра;
- big win: блок подсвечивается тёплым rim-светом (overlay-градиент 40 %), частицы билетов летят из корзины;
- бонус: свет лампы меняется на холодный (бонусный фон), мини-CRT показывает «REC ●»;
- тень под ногами: эллипс, масштаб следует дыханию (1 → 0.96).
Портрет: стойка прячется (Дел стоит за ТВ, обрезан по бёдра), остаются движение блока и тень.

## 4. Приёмка и интеграция (сделаю сам, без кредитов)
1. Проверка кадров: первый и последний кадр каждого клипа сравниваю с хабом (разница < 3 % по маске) — скрипт в `frontend/tools/art/`. Клип, не вернувшийся в хаб, идёт на перегенерацию или получает кроссфейд.
2. Кей зелёного, общий бокс по `del_still_box` (ступни на одной высоте), нарезка 12 fps в ленты `del_<name>_strip.webp`.
3. Машина состояний Дела в коде: `idle ⇄ {lean, pause, bored}` через IN/OUT клипы, `cheer/wow/rew` — одиночные из хаба в хаб; очередь переходов (новое событие ждёт OUT текущего, кроме big win, который прерывает с кроссфейдом 150 мс); пауза в кадре хаба между клипами невозможна, т.к. idle-петля всегда стартует с хаба.
4. Блок персонажа по §3c; проверка на 8 вьюпортах, без filter на спрайтах (Safari).

## 5. Счёт
Экономно: 7 видео + 1 картинка стойки (2 попытки) ≈ 7 видео и 2 картинки. Полностью: 12 видео + 1–2 картинки + 1 видео стойки. На видео обычно нужна 1 повторная попытка на 2–3 клипа; главное условие приёмки — возврат в хаб, его проверяю скриптом до нарезки.
