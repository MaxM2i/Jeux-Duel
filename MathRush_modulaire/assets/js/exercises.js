/* MathRush — générateurs d'exercices. Chaque générateur retourne un objet normalisé. */
(() => {
  'use strict';
  const pick = (items, rand) => items[rand(0, items.length - 1)];
  const unique = values => [...new Set(values)];

  function makeMath(difficultyRank, rand) {
    const d = window.MathRushConfig.DIFFICULTY[Math.max(0, Math.min(6, difficultyRank))];
    const op = pick(d.operations, rand);
    let a, b, ans;
    if (op === '+') {
      a = rand(1, Math.max(2, Math.floor(d.maxAdd / 2)));
      b = rand(1, Math.max(1, d.maxAdd - a));
      ans = a + b;
    } else if (op === '−') {
      a = rand(2, d.maxAdd);
      b = rand(1, a - 1);
      ans = a - b;
    } else {
      a = pick(d.tables, rand);
      b = rand(2, d.maxFactor);
      ans = a * b;
    }
    return { a, b, op, ans };
  }

  function makeVisualExercise(type, rand, shuffle) {
    if (type === 'percent') {
      const profile = window.MathRushConfig.DIFFICULTY[2];
      const pct = pick(profile.percentages, rand), base = pick(profile.bases, rand), ans = base * pct / 100;
      const delta = Math.max(1, base / 20);
      return { type, pct, base, ans, opts: shuffle(unique([ans, ans + delta, Math.max(0, ans - delta), ans * 2])) };
    }
    if (type === 'model') {
      const start = rand(2, 8), step = pick([1, 2, 5], rand);
      const vals = [0, 1, 2].map(i => start + i * step), ans = start + 3 * step;
      return { type, vals, ans, opts: shuffle([ans, ans + step, ans - step, ans + 2 * step].map(String)), displayVals: vals.map(String), displayAns: String(ans) };
    }
    if (type === 'factors') {
      const factors = [2, 3, 5, 7], values = [pick(factors, rand), pick(factors, rand), pick(factors, rand)];
      const missingIndex = rand(0, 2), missing = values[missingIndex], known = values.filter((_, i) => i !== missingIndex);
      return { type, a: values[0], b: values[1], c: values[2], missing, known, ans: missing, opts: shuffle(unique([missing, missing + 1, missing + 2, Math.max(2, missing - 1)])) };
    }
    if (type === 'equation') {
      const target = pick([12, 15, 18, 20, 24, 30, 36], rand), pairs = [];
      for (let a = 2; a <= 9; a++) if (target % a === 0) pairs.push([a, target / a]);
      const pair = pick(pairs, rand), good = `${pair[0]} × ${pair[1]}`;
      return { type, target, ans: good, opts: shuffle([good, `${target} ÷ 2`, `${Math.max(1, pair[0] - 1)} × ${pair[1]}`, `${pair[0]} + ${pair[1]}`]) };
    }
    throw new Error(`Type d'exercice visuel inconnu : ${type}`);
  }

  function createSoloExercise(selectedMode, difficultyRank, rand, shuffle) {
    const mode = selectedMode === 'mixed'
      ? pick(window.MathRushConfig.MODES.filter(item => item.id !== 'mixed').map(item => item.id), rand)
      : selectedMode;
    const profile = window.MathRushConfig.DIFFICULTY[Math.max(0, Math.min(6, difficultyRank))];

    if (mode === 'quick') {
      const question = makeMath(difficultyRank, rand), answer = question.ans;
      return { ...question, type: 'choice', mode, prompt: `${question.a} ${question.op} ${question.b} = ?`, ans: answer,
        opts: shuffle(unique([answer, answer + 2, Math.max(0, answer - 2), answer + 5])) };
    }
    if (mode === 'complex') {
      const a = rand(...profile.complexA), b = rand(...profile.complexB), c = rand(...profile.complexC), answer = a * b + c;
      return { type: 'choice', mode, prompt: `${a} × ${b} + ${c} = ?`, ans: answer,
        opts: shuffle(unique([answer, answer + a, Math.max(0, answer - a), answer + a * 2])) };
    }
    if (mode === 'rounding') {
      const unit = pick(profile.roundingUnits, rand), base = rand(2, 99) * unit;
      let offset = rand(-Math.floor(unit / 2) + 1, Math.floor(unit / 2) - 1);
      if (offset === 0) offset = 1;
      const number = Math.max(1, base + offset), answer = Math.round(number / unit) * unit;
      return { type: 'round', mode, number, unit, ans: answer,
        opts: shuffle(unique([answer, Math.max(0, answer - unit), answer + unit, answer + unit * 2])),
        tip: `Arrondis à la ${unit === 10 ? 'dizaine' : unit === 100 ? 'centaine' : 'millier'} la plus proche.` };
    }
    if (mode === 'coordinates') {
      const x = rand(1, profile.coordinateMax), y = rand(1, profile.coordinateMax), label = ['A', 'B', 'C', 'D'][rand(0, 3)], answer = `(${x} ; ${y})`;
      const visual = `<div class="coordinate-plane" role="img" aria-label="Repère quadrillé, point ${label} placé en ${x}, ${y}"><span class="coordinate-point" style="left:${x * 100 / (profile.coordinateMax + 1)}%;bottom:${y * 100 / (profile.coordinateMax + 1)}%">${label}</span></div>`;
      return { type: 'coordinates', mode, prompt: `Quelles sont les coordonnées du point ${label} ?`, visual, ans: answer,
        opts: shuffle(unique([answer, `(${Math.max(0, x - 1)} ; ${y})`, `(${x + 1} ; ${y})`, `(${x} ; ${y + 1})`])) };
    }
    if (mode === 'percentages') {
      const pct = pick(profile.percentages, rand), base = pick(profile.bases, rand), ans = base * pct / 100, delta = Math.max(1, base / 20);
      return { type: 'percent', mode, pct, base, ans, opts: shuffle(unique([ans, ans + delta, Math.max(0, ans - delta), ans * 2])) };
    }
    throw new Error(`Mode solo inconnu : ${mode}`);
  }

  window.MathRushExercises = Object.freeze({ makeMath, makeVisualExercise, createSoloExercise });
})();
