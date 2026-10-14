(() => {
  "use strict";

  const LB_PER_KG = 2.2046226218;
  const CM_PER_IN = 2.54;
  const THEME_KEY = "tdee-theme";

  const ACTIVITY = {
    sedentary: {
      label: "Sedentary",
      multiplier: 1.2,
      description: "little or no exercise",
    },
    light: {
      label: "Lightly active",
      multiplier: 1.375,
      description: "light exercise / sports 1–3 days / week",
    },
    moderate: {
      label: "Moderately active",
      multiplier: 1.55,
      description: "moderate exercise / sports 3–5 days / week",
    },
    very: {
      label: "Very active",
      multiplier: 1.725,
      description: "intensive exercise / sports 6–7 days / week",
    },
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
  const themeButtons = document.querySelectorAll(".theme-btn");
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  let hasCalculated = false;

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

  function renderBreakdown(steps) {
    breakdownList.innerHTML = "";
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
      breakdownList.appendChild(li);
    });
  }

  function calculate() {
    if (!validate()) {
      results.hidden = true;
      resultsEmpty.hidden = false;
      highlightActivity("");
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
    } else {
      tdeeStat.hidden = true;
      steps.push({
        title: "TDEE",
        detail: "Select an activity level to calculate TDEE (BMR × multiplier).",
      });
      highlightActivity("");
    }

    renderBreakdown(steps);
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
    } else if (event.target.id === "activity" && activitySelect.value) {
      // no-op until first calculate
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
    }, 0);
  });

  initTheme();
  updateUnitLabels();
})();
