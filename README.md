# A simple guide to Health & Fitness

A static single-page app that estimates **BMR**, **TDEE**, and a suggested **calorie & macro plan**. Choose **Mifflin–St Jeor** (default) or revised **Harris–Benedict** (Roza & Shizgal, 1984).

## Open the app

No install or build step. From this folder:

```bash
open index.html
```

Or serve locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## BMR formulas

**Mifflin–St Jeor (default)**

| Sex | Formula |
| --- | --- |
| Men | `BMR = (10 × kg) + (6.25 × cm) − (5 × age) + 5` |
| Women | `BMR = (10 × kg) + (6.25 × cm) − (5 × age) − 161` |

**Harris–Benedict (revised)**

| Sex | Formula |
| --- | --- |
| Men | `BMR = 88.362 + (13.397 × kg) + (4.799 × cm) − (5.677 × age)` |
| Women | `BMR = 447.593 + (9.247 × kg) + (3.098 × cm) − (4.330 × age)` |

## TDEE

`TDEE = BMR × activity multiplier` when an activity level is selected.

| Activity level | Multiplier | Default protein |
| --- | --- | --- |
| Sedentary | × 1.2 | 1.2 g/kg |
| Lightly active | × 1.375 | 1.3 g/kg |
| Moderately active | × 1.55 | 1.45 g/kg |
| Very active | × 1.725 | 1.6 g/kg |

## Calorie & macro plan

Requires a calculated TDEE (activity selected).

| Goal | Daily intake |
| --- | --- |
| Maintain | `TDEE × 1.0` |
| Lose | `TDEE × 0.9`, floored at BMR |
| Gain | `TDEE × 1.1` |

- Soft WHO BMI check warns if the goal may not match your BMI band; calculation still proceeds.
- **Protein:** 1.2–1.6 g/kg (default from activity; adjustable).
- **Fat:** 20–35% of intake (defaults: lose 20%, maintain 25%, gain 30%; adjustable).
- **Carbs:** remaining calories ÷ 4. If below the common 130 g RDA, a soft note is shown (value is not forced up).

Energy constants: protein/carbs 4 kcal/g, fat 9 kcal/g.

**Disclaimer:** Suggested calories and macros are estimates only. They are not personalized medical advice and can be adjusted according to medical best practices or guidance from a qualified professional.

## Features

- Formula picker, metric/imperial conversion
- Full BMR/TDEE and plan breakdowns
- Activity reference table with selection highlight
- Theme: System (default), Light, or Dark

## Sample check

Male, 80 kg, 180 cm, age 30, lightly active, Mifflin–St Jeor:

| Metric | Value |
| --- | ---: |
| BMR | **1780.0** kcal |
| TDEE | **2447.5** kcal |
| Lose intake (× 0.9) | **2202.8** kcal |
| Protein @ 1.3 g/kg | **104.0** g |
| Fat @ 20% | **49.0** g |
| Carbs (remainder) | **336.6** g |

Estimates only — not medical advice.
