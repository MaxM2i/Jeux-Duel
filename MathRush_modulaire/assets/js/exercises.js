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

  function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

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
    if (mode === 'common-multiples') {
      const limit = difficultyRank <= 1 ? 6 : difficultyRank <= 3 ? 10 : difficultyRank <= 5 ? 12 : 15;
      const a = rand(2, limit), b = rand(2, limit), askPpcm = Math.random() < 0.62;
      const answer = askPpcm ? lcm(a, b) : gcd(a, b);
      const label = askPpcm ? 'plus petit commun multiple' : 'plus grand commun diviseur';
      const wrong = unique([answer + Math.max(1, Math.min(a, b)), Math.max(1, answer - Math.max(1, gcd(a, b))), answer * 2]).filter(n => n !== answer);
      const opts = shuffle([answer, ...wrong].slice(0, 3));
      if (Math.random() < 0.45) {
        const max = Math.max(answer + Math.max(a, b) * 2, 12);
        const step = max <= 30 ? 1 : 2;
        const ticks = [0, Math.round(max / 4 / step) * step, Math.round(max / 2 / step) * step, Math.round(max * 3 / 4 / step) * step, max];
        return { type: 'commonSlider', mode, a, b, askPpcm, label, ans: answer, min: 0, max, step, ticks: [...new Set(ticks)] };
      }
      while (opts.length < 3) opts.push(answer + opts.length + 3);
      return { type: 'choice', mode, prompt: `Sélectionne le ${label} de ${a} et ${b}.`, subLabel: askPpcm ? 'PPCM' : 'PGCD', ans: answer, opts };
    }
    if (mode === 'multiplication-division') {
      const d = window.MathRushConfig.DIFFICULTY[Math.max(0, Math.min(6, difficultyRank))];
      const useDivision = Math.random() < 0.5;
      let a, b, op, answer;
      if (useDivision) { b = pick(d.tables, rand); answer = rand(2, Math.max(3, d.maxFactor)); a = b * answer; op = '÷'; }
      else { a = pick(d.tables, rand); b = rand(2, Math.max(3, d.maxFactor)); answer = a * b; op = '×'; }
      const delta = Math.max(1, Math.min(10, Math.ceil(answer * 0.2)));
      const opts = shuffle(unique([answer, answer + delta, Math.max(0, answer - delta), answer + delta * 2]));
      return { type: 'choice', mode, prompt: `${a} ${op} ${b} = ?`, subLabel: useDivision ? 'Division' : 'Multiplication', a, b, op, ans: answer, opts };
    }
    if (mode === 'percentages') {
      const pct = pick(profile.percentages, rand), base = pick(profile.bases, rand), ans = base * pct / 100, delta = Math.max(1, base / 20);
      return { type: 'percent', mode, pct, base, ans, opts: shuffle(unique([ans, ans + delta, Math.max(0, ans - delta), ans * 2])) };
    }
    throw new Error(`Mode solo inconnu : ${mode}`);
  }

  window.MathRushExercises = Object.freeze({ makeMath, makeVisualExercise, createSoloExercise, gcd, lcm });
})();
