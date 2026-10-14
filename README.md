# Fitness Health — TDEE Calculator

A static single-page app that estimates **BMR** (basal metabolic rate) and **TDEE** (total daily energy expenditure). Choose **Mifflin–St Jeor** (default) or revised **Harris–Benedict** (Roza & Shizgal, 1984).

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

### BMR formulas

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

### TDEE

`TDEE = BMR × activity multiplier` using the BMR from your selected formula.

| Activity level | Description | Multiplier |
| --- | --- | --- |
| Sedentary | little or no exercise | × 1.2 |
| Lightly active | light exercise / sports 1–3 days / week | × 1.375 |
| Moderately active | moderate exercise / sports 3–5 days / week | × 1.55 |
| Very active | intensive exercise / sports 6–7 days / week | × 1.725 |

## Features

- Formula picker: Mifflin–St Jeor (default) or Harris–Benedict
- Metric (kg / cm) by default, with imperial (lb / in) and automatic conversion
- Full calculation breakdown, plus the other formula’s BMR for comparison
- Activity reference table with row highlight for the selected level
- Theme: **System** (default), Light, or Dark — preference stored in `localStorage`

## Sample check

Male, 80 kg, 180 cm, age 30, lightly active:

| Formula | BMR | TDEE (× 1.375) |
| --- | ---: | ---: |
| Mifflin–St Jeor | **1780.0** | **2447.5** |
| Harris–Benedict | **1853.6** | **2548.7** |

Estimates only — not medical advice.
