# Fitness Health — TDEE Calculator

A static single-page app that estimates **BMR** (basal metabolic rate) and **TDEE** (total daily energy expenditure) using the revised Harris–Benedict equations (Roza & Shizgal, 1984).

## Open the app

No install or build step. From this folder:

```bash
open index.html
```

Or serve locally if your browser restricts `file://` modules/fonts:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## What it calculates

### BMR

| Sex | Formula |
| --- | --- |
| Men | `BMR = 88.362 + (13.397 × kg) + (4.799 × cm) − (5.677 × age)` |
| Women | `BMR = 447.593 + (9.247 × kg) + (3.098 × cm) − (4.330 × age)` |

### TDEE

`TDEE = BMR × activity multiplier` when an activity level is selected.

| Activity level | Description | Multiplier |
| --- | --- | --- |
| Sedentary | little or no exercise | × 1.2 |
| Lightly active | light exercise / sports 1–3 days / week | × 1.375 |
| Moderately active | moderate exercise / sports 3–5 days / week | × 1.55 |
| Very active | intensive exercise / sports 6–7 days / week | × 1.725 |

## Features

- Metric (kg / cm) by default, with imperial (lb / in) and automatic conversion
- Full calculation breakdown for verification
- Activity reference table with row highlight for the selected level
- Theme: **System** (default), Light, or Dark — preference stored in `localStorage`

## Sample check

Male, 80 kg, 180 cm, age 30, lightly active:

- BMR ≈ **1853.6** kcal/day  
- TDEE ≈ **2548.7** kcal/day (× 1.375)

Estimates only — not medical advice.
