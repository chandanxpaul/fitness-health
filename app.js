(() => {
  "use strict";

  const LB_PER_KG = 2.2046226218;
  const CM_PER_IN = 2.54;
  const THEME_KEY = "tdee-theme";
  const KCAL_PER_G_PROTEIN = 4;
  const KCAL_PER_G_CARB = 4;
  const KCAL_PER_G_FAT = 9;
  const CARB_RDA_G = 130;

  const ACTIVITY = {
    sedentary: {
      label: "Sedentary",
      multiplier: 1.2,
      description: "little or no exercise",
      proteinPerKg: 1.2,
    },
    light: {
      label: "Lightly active",
      multiplier: 1.375,
      description: "light exercise / sports 1–3 days / week",
      proteinPerKg: 1.3,
    },
    moderate: {
      label: "Moderately active",
      multiplier: 1.55,
      description: "moderate exercise / sports 3–5 days / week",
      proteinPerKg: 1.45,
    },
    very: {
      label: "Very active",
      multiplier: 1.725,
      description: "intensive exercise / sports 6–7 days / week",
      proteinPerKg: 1.6,
    },
  };

  const GOAL_CALORIE_FACTOR = {
    maintain: 1.0,
    lose: 0.9,
    gain: 1.1,
  };

  const GOAL_FAT_DEFAULT = {
    maintain: 25,
    lose: 20,
    gain: 30,
  };

  const form = document.getElementById("tdee-form");
  const ageInput = document.getElementById("age");
  const weightInput = document.getElementById("weight");
  const heightInput = document.getElementById("height");
  const activitySelect = document.getElementById("activity");
  const weightLabel = document.getElementById("weight-label");
  const heightLabel = document.getElementById("height-label");
  const weightHint = document.getElementById("weight-hint");
  const heightHint = document.getElementById("height-hint");
  const resultsEmpty = document.getElementById("results-empty");
  const results = document.getElementById("results");
  const bmrValue = document.getElementById("bmr-value");
  const bmrNote = document.getElementById("bmr-note");
  const tdeeStat = document.getElementById("tdee-stat");
  const tdeeValue = document.getElementById("tdee-value");
  const tdeeNote = document.getElementById("tdee-note");
  const breakdownList = document.getElementById("breakdown-list");
  const planJump = document.getElementById("plan-jump");
  const planLocked = document.getElementById("plan-locked");
  const planBody = document.getElementById("plan-body");
  const proteinInput = document.getElementById("protein-per-kg");
  const fatInput = document.getElementById("fat-percent");
  const proteinDefaultHint = document.getElementById("protein-default-hint");
  const fatDefaultHint = document.getElementById("fat-default-hint");
  const bmiSummary = document.getElementById("bmi-summary");
  const goalWarning = document.getElementById("goal-warning");
  const intakeValue = document.getElementById("intake-value");
  const intakeNote = document.getElementById("intake-note");
  const proteinGrams = document.getElementById("protein-grams");
  const proteinKcalNote = document.getElementById("protein-kcal-note");
  const fatGrams = document.getElementById("fat-grams");
  const fatKcalNote = document.getElementById("fat-kcal-note");
  const carbGrams = document.getElementById("carb-grams");
  const carbKcalNote = document.getElementById("carb-kcal-note");
  const planNotes = document.getElementById("plan-notes");
  const planBreakdownList = document.getElementById("plan-breakdown-list");
  const themeButtons = document.querySelectorAll(".theme-btn");
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  let hasCalculated = false;
  let lastCalc = null;
  let suppressPlanDefaults = false;

  function getUnits() {
    const checked = form.querySelector('input[name="units"]:checked');
    return checked ? checked.value : "metric";
  }

  function getSex() {
    const checked = form.querySelector('input[name="sex"]:checked');
    return checked ? checked.value : "male";
  }

  function getFormula() {
    const checked = form.querySelector('input[name="formula"]:checked');
    return checked ? checked.value : "mifflin";
  }

  function getGoal() {
    const checked = document.querySelector('input[name="goal"]:checked');
    return checked ? checked.value : "maintain";
  }

  function updateUnitLabels() {
    const imperial = getUnits() === "imperial";
    weightLabel.textContent = imperial ? "Weight (lb)" : "Weight (kg)";
    heightLabel.textContent = imperial ? "Height (in)" : "Height (cm)";
    weightInput.placeholder = imperial ? "lb" : "kg";
    heightInput.placeholder = imperial ? "in" : "cm";
    weightHint.textContent = imperial ? "e.g. 176" : "e.g. 80";
    heightHint.textContent = imperial ? "e.g. 71" : "e.g. 180";
  }

  function convertUnitsPreservingValue(fromUnits, toUnits) {
    if (fromUnits === toUnits) return;

    const weight = Number(weightInput.value);
    const height = Number(heightInput.value);

    if (Number.isFinite(weight) && weight > 0) {
      weightInput.value =
        toUnits === "imperial"
          ? round(weight * LB_PER_KG, 1)
          : round(weight / LB_PER_KG, 1);
    }

    if (Number.isFinite(height) && height > 0) {
      heightInput.value =
        toUnits === "imperial"
          ? round(height / CM_PER_IN, 1)
          : round(height * CM_PER_IN, 1);
    }
  }

  function round(value, digits) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function formatNumber(value, digits = 1) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }

  function setFieldError(id, message) {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}-error`);
    const hint = document.getElementById(`${id}-hint`);
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    error.hidden = false;
    error.textContent = message;
    if (hint) hint.hidden = true;
  }

  function clearFieldError(id) {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}-error`);
    const hint = document.getElementById(`${id}-hint`);
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
    error.hidden = true;
    error.textContent = "";
    if (hint) hint.hidden = false;
  }

  function clearAllErrors() {
    ["age", "weight", "height"].forEach(clearFieldError);
  }

  function validate() {
    clearAllErrors();
    let ok = true;
    const units = getUnits();
    const age = Number(ageInput.value);
    const weight = Number(weightInput.value);
    const height = Number(heightInput.value);

    if (!ageInput.value.trim() || !Number.isFinite(age)) {
      setFieldError("age", "Enter your age in years.");
      ok = false;
    } else if (age < 15 || age > 100 || !Number.isInteger(age)) {
      setFieldError("age", "Use a whole number between 15 and 100.");
      ok = false;
    }

    if (!weightInput.value.trim() || !Number.isFinite(weight)) {
      setFieldError("weight", "Enter your weight.");
      ok = false;
    } else if (weight <= 0) {
      setFieldError("weight", "Weight must be greater than 0.");
      ok = false;
    } else if (units === "metric" && (weight < 30 || weight > 300)) {
      setFieldError("weight", "Use a weight between 30 and 300 kg.");
      ok = false;
    } else if (units === "imperial" && (weight < 66 || weight > 660)) {
      setFieldError("weight", "Use a weight between 66 and 660 lb.");
      ok = false;
    }

    if (!heightInput.value.trim() || !Number.isFinite(height)) {
      setFieldError("height", "Enter your height.");
      ok = false;
    } else if (height <= 0) {
      setFieldError("height", "Height must be greater than 0.");
      ok = false;
    } else if (units === "metric" && (height < 120 || height > 250)) {
      setFieldError("height", "Use a height between 120 and 250 cm.");
      ok = false;
    } else if (units === "imperial" && (height < 47 || height > 98)) {
      setFieldError("height", "Use a height between 47 and 98 in.");
      ok = false;
    }

    return ok;
  }

  function toMetric(units, weight, height) {
    if (units === "metric") {
      return { weightKg: weight, heightCm: height, converted: false };
    }
    return {
      weightKg: weight / LB_PER_KG,
      heightCm: height * CM_PER_IN,
      converted: true,
    };
  }

  function computeMifflin(sex, weightKg, heightCm, age) {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const sexOffset = sex === "male" ? 5 : -161;
    return {
      key: "mifflin",
      name: "Mifflin–St Jeor",
      bmr: base + sexOffset,
      formula:
        sex === "male"
          ? "BMR = (10 × weight kg) + (6.25 × height cm) − (5 × age) + 5"
          : "BMR = (10 × weight kg) + (6.25 × height cm) − (5 × age) − 161",
      kind: "mifflin",
      sexOffset,
    };
  }

  function computeHarris(sex, weightKg, heightCm, age) {
    if (sex === "male") {
      return {
        key: "harris",
        name: "Harris–Benedict (revised)",
        bmr: 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age,
        formula:
          "BMR = 88.362 + (13.397 × weight kg) + (4.799 × height cm) − (5.677 × age)",
        kind: "harris",
        constants: { base: 88.362, w: 13.397, h: 4.799, a: 5.677 },
      };
    }
    return {
      key: "harris",
      name: "Harris–Benedict (revised)",
      bmr: 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age,
      formula:
        "BMR = 447.593 + (9.247 × weight kg) + (3.098 × height cm) − (4.330 × age)",
      kind: "harris",
      constants: { base: 447.593, w: 9.247, h: 3.098, a: 4.33 },
    };
  }

  function computeBmr(formulaKey, sex, weightKg, heightCm, age) {
    return formulaKey === "harris"
      ? computeHarris(sex, weightKg, heightCm, age)
      : computeMifflin(sex, weightKg, heightCm, age);
  }

  function appendFormulaSteps(steps, result, weightKg, heightCm, age) {
    if (result.kind === "mifflin") {
      const wTerm = 10 * weightKg;
      const hTerm = 6.25 * heightCm;
      const aTerm = 5 * age;
      const offsetLabel =
        result.sexOffset >= 0
          ? `+ ${result.sexOffset}`
          : `− ${Math.abs(result.sexOffset)}`;
      steps.push({
        title: `BMR formula (${result.name})`,
        formula: result.formula,
      });
      steps.push({
        title: "Substituted values",
        formula: `BMR = (10 × ${formatNumber(weightKg, 2)}) + (6.25 × ${formatNumber(heightCm, 2)}) − (5 × ${formatNumber(age, 0)}) ${offsetLabel}`,
      });
      steps.push({
        title: "Intermediate terms",
        formula: `${formatNumber(wTerm, 3)} + ${formatNumber(hTerm, 3)} − ${formatNumber(aTerm, 3)} ${offsetLabel} = ${formatNumber(result.bmr, 3)}`,
      });
      return;
    }

    const { constants } = result;
    const wTerm = constants.w * weightKg;
    const hTerm = constants.h * heightCm;
    const aTerm = constants.a * age;
    steps.push({
      title: `BMR formula (${result.name})`,
      formula: result.formula,
    });
    steps.push({
      title: "Substituted values",
      formula: `BMR = ${constants.base} + (${constants.w} × ${formatNumber(weightKg, 2)}) + (${constants.h} × ${formatNumber(heightCm, 2)}) − (${constants.a} × ${formatNumber(age, 0)})`,
    });
    steps.push({
      title: "Intermediate terms",
      formula: `${constants.base} + ${formatNumber(wTerm, 3)} + ${formatNumber(hTerm, 3)} − ${formatNumber(aTerm, 3)} = ${formatNumber(result.bmr, 3)}`,
    });
  }

  function highlightActivity(key) {
    document.querySelectorAll(".activity-table tbody tr").forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.activity === key);
    });
  }

  function renderBreakdown(target, steps) {
    target.innerHTML = "";
    steps.forEach((step) => {
      const li = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = step.title;
      li.appendChild(title);
      if (step.detail) {
        li.appendChild(document.createTextNode(` — ${step.detail}`));
      }
      if (step.formula) {
        const code = document.createElement("span");
        code.className = "formula";
        code.textContent = step.formula;
        li.appendChild(code);
      }
      target.appendChild(li);
    });
  }

  function classifyBmi(bmi) {
    if (bmi < 18.5) {
      return {
        key: "underweight",
        label: "Underweight",
        range: "< 18.5",
      };
    }
    if (bmi < 25) {
      return {
        key: "healthy",
        label: "Healthy weight",
        range: "18.5–24.9",
      };
    }
    if (bmi < 30) {
      return {
        key: "overweight",
        label: "Overweight",
        range: "25.0–29.9",
      };
    }
    return {
      key: "obese",
      label: "Obese",
      range: "≥ 30.0",
    };
  }

  function goalCautionMessage(goal, bmiInfo) {
    if (goal === "lose" && bmiInfo.key === "underweight") {
      return `Your BMI (${formatNumber(bmiInfo.bmi, 1)}) is in the underweight range (${bmiInfo.range}). Losing more weight may not be appropriate — consider confirming this goal with a qualified professional. The plan below still uses your selected goal.`;
    }
    if (
      (goal === "lose" || goal === "gain") &&
      bmiInfo.key === "healthy"
    ) {
      return `Your BMI (${formatNumber(bmiInfo.bmi, 1)}) is already in the healthy range (${bmiInfo.range}). Double-check that you really want to ${goal} weight. The plan below still uses your selected goal.`;
    }
    if (
      goal === "gain" &&
      (bmiInfo.key === "overweight" || bmiInfo.key === "obese")
    ) {
      return `Your BMI (${formatNumber(bmiInfo.bmi, 1)}) is in the ${bmiInfo.label.toLowerCase()} range (${bmiInfo.range}). Gaining more weight may not be appropriate — consider confirming this goal with a qualified professional. The plan below still uses your selected goal.`;
    }
    return "";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyPlanDefaults({ activityKey, goal, resetProtein, resetFat }) {
    suppressPlanDefaults = true;
    if (resetProtein && activityKey && ACTIVITY[activityKey]) {
      proteinInput.value = String(ACTIVITY[activityKey].proteinPerKg);
      proteinDefaultHint.textContent = `(default ${ACTIVITY[activityKey].proteinPerKg})`;
    }
    if (resetFat && goal) {
      fatInput.value = String(GOAL_FAT_DEFAULT[goal]);
      fatDefaultHint.textContent = `(default ${GOAL_FAT_DEFAULT[goal]}%)`;
    }
    suppressPlanDefaults = false;
  }

  function lockPlan() {
    lastCalc = null;
    planLocked.hidden = false;
    planBody.hidden = true;
    planJump.hidden = true;
    goalWarning.hidden = true;
    goalWarning.textContent = "";
    planNotes.innerHTML = "";
    planBreakdownList.innerHTML = "";
  }

  function updatePlan() {
    if (!lastCalc) {
      lockPlan();
      return;
    }

    const goal = getGoal();
    let proteinPerKg = Number(proteinInput.value);
    let fatPercent = Number(fatInput.value);

    if (!Number.isFinite(proteinPerKg)) proteinPerKg = ACTIVITY[lastCalc.activityKey].proteinPerKg;
    if (!Number.isFinite(fatPercent)) fatPercent = GOAL_FAT_DEFAULT[goal];

    proteinPerKg = clamp(round(proteinPerKg, 2), 1.2, 1.6);
    fatPercent = clamp(round(fatPercent, 0), 20, 35);
    proteinInput.value = String(proteinPerKg);
    fatInput.value = String(fatPercent);
    proteinDefaultHint.textContent = `(activity default ${ACTIVITY[lastCalc.activityKey].proteinPerKg})`;
    fatDefaultHint.textContent = `(goal default ${GOAL_FAT_DEFAULT[goal]}%)`;

    const heightM = lastCalc.heightCm / 100;
    const bmi = lastCalc.weightKg / (heightM * heightM);
    const bmiInfo = { ...classifyBmi(bmi), bmi };
    bmiSummary.textContent = `BMI ${formatNumber(bmi, 1)} · ${bmiInfo.label} (WHO ${bmiInfo.range}) · weight ${formatNumber(lastCalc.weightKg, 2)} kg · height ${formatNumber(lastCalc.heightCm, 1)} cm`;

    const caution = goalCautionMessage(goal, bmiInfo);
    if (caution) {
      goalWarning.hidden = false;
      goalWarning.textContent = caution;
    } else {
      goalWarning.hidden = true;
      goalWarning.textContent = "";
    }

    const factor = GOAL_CALORIE_FACTOR[goal];
    let intake = lastCalc.tdee * factor;
    let flooredToBmr = false;
    if (goal === "lose" && intake < lastCalc.bmr) {
      intake = lastCalc.bmr;
      flooredToBmr = true;
    }
    intake = round(intake, 1);

    const proteinG = round(proteinPerKg * lastCalc.weightKg, 1);
    const proteinKcal = round(proteinG * KCAL_PER_G_PROTEIN, 1);
    const fatKcal = round(intake * (fatPercent / 100), 1);
    const fatG = round(fatKcal / KCAL_PER_G_FAT, 1);
    let carbKcal = round(intake - proteinKcal - fatKcal, 1);
    let carbG = round(carbKcal / KCAL_PER_G_CARB, 1);
    let macrosOverflow = false;

    if (carbKcal < 0) {
      macrosOverflow = true;
      carbKcal = 0;
      carbG = 0;
    }

    intakeValue.textContent = formatNumber(intake, 1);
    intakeNote.textContent = flooredToBmr
      ? `Lose target floored at BMR (${formatNumber(lastCalc.bmr, 1)} kcal)`
      : `${goal.charAt(0).toUpperCase()}${goal.slice(1)} · TDEE × ${factor}`;
    proteinGrams.textContent = formatNumber(proteinG, 1);
    proteinKcalNote.textContent = `${formatNumber(proteinKcal, 1)} kcal · ${formatNumber(proteinPerKg, 2)} g/kg`;
    fatGrams.textContent = formatNumber(fatG, 1);
    fatKcalNote.textContent = `${formatNumber(fatKcal, 1)} kcal · ${formatNumber(fatPercent, 0)}%`;
    carbGrams.textContent = formatNumber(carbG, 1);
    carbKcalNote.textContent = `${formatNumber(carbKcal, 1)} kcal · remainder`;

    planNotes.innerHTML = "";
    if (flooredToBmr) {
      appendCallout(
        planNotes,
        `A 10% deficit would be ${formatNumber(lastCalc.tdee * 0.9, 1)} kcal, which is below your BMR (${formatNumber(lastCalc.bmr, 1)} kcal). Intake is capped at BMR for this suggestion.`
      );
    }
    if (macrosOverflow) {
      appendCallout(
        planNotes,
        "Protein and fat calories exceed the daily intake target, so carbs are set to 0 g. Lower protein (g/kg) or fat (%) to free calories for carbs."
      );
    } else if (carbG < CARB_RDA_G) {
      appendCallout(
        planNotes,
        `Suggested carbs (${formatNumber(carbG, 1)} g) are below the common carbohydrate RDA of ${CARB_RDA_G} g/day. This can happen on lower-calorie plans — consider adjusting fat % or protein if needed.`
      );
    }

    const steps = [
      {
        title: "Goal calories",
        detail:
          goal === "maintain"
            ? `Maintain → intake = TDEE = ${formatNumber(lastCalc.tdee, 1)} kcal`
            : goal === "lose"
              ? `Lose → intake = TDEE × 0.9${flooredToBmr ? ", floored at BMR" : ""} = ${formatNumber(intake, 1)} kcal`
              : `Gain → intake = TDEE × 1.1 = ${formatNumber(intake, 1)} kcal`,
        formula: flooredToBmr
          ? `max(TDEE × 0.9, BMR) = max(${formatNumber(lastCalc.tdee * 0.9, 1)}, ${formatNumber(lastCalc.bmr, 1)})`
          : `intake = ${formatNumber(lastCalc.tdee, 1)} × ${factor}`,
      },
      {
        title: "Protein",
        detail: `${formatNumber(proteinPerKg, 2)} g/kg × ${formatNumber(lastCalc.weightKg, 2)} kg = ${formatNumber(proteinG, 1)} g`,
        formula: `${formatNumber(proteinG, 1)} g × ${KCAL_PER_G_PROTEIN} kcal/g = ${formatNumber(proteinKcal, 1)} kcal`,
      },
      {
        title: "Fat",
        detail: `${formatNumber(fatPercent, 0)}% of ${formatNumber(intake, 1)} kcal = ${formatNumber(fatKcal, 1)} kcal`,
        formula: `${formatNumber(fatKcal, 1)} ÷ ${KCAL_PER_G_FAT} = ${formatNumber(fatG, 1)} g`,
      },
      {
        title: "Carbs (remainder)",
        detail: `${formatNumber(intake, 1)} − ${formatNumber(proteinKcal, 1)} − ${formatNumber(fatKcal, 1)} = ${formatNumber(carbKcal, 1)} kcal`,
        formula: `${formatNumber(carbKcal, 1)} ÷ ${KCAL_PER_G_CARB} = ${formatNumber(carbG, 1)} g`,
      },
    ];
    renderBreakdown(planBreakdownList, steps);

    planLocked.hidden = true;
    planBody.hidden = false;
    planJump.hidden = false;
  }

  function appendCallout(container, text) {
    const div = document.createElement("div");
    div.className = "callout callout-warn";
    div.textContent = text;
    container.appendChild(div);
  }

  function calculate() {
    if (!validate()) {
      results.hidden = true;
      resultsEmpty.hidden = false;
      highlightActivity("");
      lockPlan();
      return false;
    }

    const units = getUnits();
    const sex = getSex();
    const formulaKey = getFormula();
    const age = Number(ageInput.value);
    const weight = Number(weightInput.value);
    const height = Number(heightInput.value);
    const activityKey = activitySelect.value;
    const { weightKg, heightCm, converted } = toMetric(units, weight, height);
    const selected = computeBmr(formulaKey, sex, weightKg, heightCm, age);
    const alternateKey = formulaKey === "mifflin" ? "harris" : "mifflin";
    const alternate = computeBmr(alternateKey, sex, weightKg, heightCm, age);
    const bmrRounded = round(selected.bmr, 1);
    const alternateRounded = round(alternate.bmr, 1);

    const steps = [];

    steps.push({
      title: "Inputs",
      detail:
        units === "metric"
          ? `${sex === "male" ? "Male" : "Female"}, ${formatNumber(age, 0)} years, ${formatNumber(weight, 1)} kg, ${formatNumber(height, 1)} cm`
          : `${sex === "male" ? "Male" : "Female"}, ${formatNumber(age, 0)} years, ${formatNumber(weight, 1)} lb, ${formatNumber(height, 1)} in`,
    });

    steps.push({
      title: "Selected formula",
      detail: selected.name,
    });

    if (converted) {
      steps.push({
        title: "Unit conversion",
        detail: `Converted to metric for the formula: ${formatNumber(weightKg, 2)} kg, ${formatNumber(heightCm, 2)} cm`,
        formula: `kg = lb ÷ ${LB_PER_KG}; cm = in × ${CM_PER_IN}`,
      });
    }

    appendFormulaSteps(steps, selected, weightKg, heightCm, age);

    steps.push({
      title: "BMR result",
      detail: `${formatNumber(bmrRounded, 1)} kcal / day (${selected.name})`,
    });

    steps.push({
      title: "Other formula (for comparison)",
      detail: `${alternate.name}: ${formatNumber(alternateRounded, 1)} kcal / day — not used for TDEE`,
    });

    resultsEmpty.hidden = true;
    results.hidden = false;
    bmrValue.textContent = formatNumber(bmrRounded, 1);
    bmrNote.textContent = `${selected.name} · calories burned at rest`;

    if (activityKey && ACTIVITY[activityKey]) {
      const activity = ACTIVITY[activityKey];
      const tdee = round(selected.bmr * activity.multiplier, 1);
      tdeeStat.hidden = false;
      tdeeValue.textContent = formatNumber(tdee, 1);
      tdeeNote.textContent = `${activity.label} maintenance`;
      steps.push({
        title: "Activity multiplier",
        detail: `${activity.label} — ${activity.description}`,
        formula: `TDEE = BMR × ${activity.multiplier}`,
      });
      steps.push({
        title: "TDEE result",
        detail: `${formatNumber(bmrRounded, 1)} × ${activity.multiplier} = ${formatNumber(tdee, 1)} kcal / day`,
      });
      highlightActivity(activityKey);

      const activityChanged =
        !lastCalc || lastCalc.activityKey !== activityKey;
      lastCalc = {
        bmr: bmrRounded,
        tdee,
        weightKg,
        heightCm,
        activityKey,
      };
      applyPlanDefaults({
        activityKey,
        goal: getGoal(),
        resetProtein: activityChanged,
        resetFat: false,
      });
      updatePlan();
    } else {
      tdeeStat.hidden = true;
      steps.push({
        title: "TDEE",
        detail: "Select an activity level to calculate TDEE and unlock the calorie plan.",
      });
      highlightActivity("");
      lockPlan();
    }

    renderBreakdown(breakdownList, steps);
    return true;
  }

  function applyTheme(mode) {
    const resolved =
      mode === "system"
        ? mediaQuery.matches
          ? "dark"
          : "light"
        : mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = mode;
    themeButtons.forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.dataset.themeMode === mode)
      );
    });
  }

  function initTheme() {
    let mode = "system";
    try {
      mode = localStorage.getItem(THEME_KEY) || "system";
    } catch {
      mode = "system";
    }
    if (!["system", "light", "dark"].includes(mode)) mode = "system";
    applyTheme(mode);

    themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.themeMode;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          /* ignore quota / private mode */
        }
        applyTheme(next);
      });
    });

    const onSchemeChange = () => {
      if (document.documentElement.dataset.themeMode === "system") {
        applyTheme("system");
      }
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onSchemeChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(onSchemeChange);
    }
  }

  let previousUnits = getUnits();

  form.addEventListener("change", (event) => {
    if (event.target.name === "units") {
      const next = getUnits();
      convertUnitsPreservingValue(previousUnits, next);
      previousUnits = next;
      updateUnitLabels();
    }

    if (hasCalculated) {
      calculate();
    }
  });

  form.addEventListener("input", (event) => {
    if (!hasCalculated) return;
    if (["age", "weight", "height"].includes(event.target.id)) {
      calculate();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hasCalculated = calculate();
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      previousUnits = "metric";
      hasCalculated = false;
      clearAllErrors();
      updateUnitLabels();
      results.hidden = true;
      resultsEmpty.hidden = false;
      tdeeStat.hidden = true;
      breakdownList.innerHTML = "";
      highlightActivity("");
      document.querySelector('input[name="goal"][value="maintain"]').checked = true;
      applyPlanDefaults({
        activityKey: "sedentary",
        goal: "maintain",
        resetProtein: true,
        resetFat: true,
      });
      lockPlan();
    }, 0);
  });

  document.querySelectorAll('input[name="goal"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!lastCalc) return;
      applyPlanDefaults({
        activityKey: lastCalc.activityKey,
        goal: getGoal(),
        resetProtein: false,
        resetFat: true,
      });
      updatePlan();
    });
  });

  proteinInput.addEventListener("input", () => {
    if (suppressPlanDefaults || !lastCalc) return;
    updatePlan();
  });

  fatInput.addEventListener("input", () => {
    if (suppressPlanDefaults || !lastCalc) return;
    updatePlan();
  });

  initTheme();
  updateUnitLabels();
  applyPlanDefaults({
    activityKey: "sedentary",
    goal: "maintain",
    resetProtein: true,
    resetFat: true,
  });
  lockPlan();
})();
