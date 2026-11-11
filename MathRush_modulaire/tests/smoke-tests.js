const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {}, Math, console };
vm.createContext(context);
for (const file of ['config.js', 'exercises.js', 'progression.js', 'achievements.js']) {
  vm.runInContext(fs.readFileSync(`${__dirname}/../assets/js/${file}`, 'utf8'), context, { filename: file });
}
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = values => [...values].sort(() => Math.random() - 0.5);

for (let difficulty = 0; difficulty <= 6; difficulty++) {
  for (const mode of ['quick', 'complex', 'rounding', 'coordinates', 'percentages', 'common-multiples', 'multiplication-division', 'mixed']) {
    for (let i = 0; i < 100; i++) {
      const exercise = context.window.MathRushExercises.createSoloExercise(mode, difficulty, rand, shuffle);
      assert.ok(exercise.mode, `mode manquant (${mode}, difficulté ${difficulty})`);
      assert.ok(exercise.type, `type manquant (${mode}, difficulté ${difficulty})`);
      assert.notEqual(exercise.ans, undefined, `réponse manquante (${mode}, difficulté ${difficulty})`);
      if (exercise.type === 'commonSlider') {
        assert.ok(Number.isFinite(exercise.min) && Number.isFinite(exercise.max) && exercise.max > exercise.min, 'curseur PPCM/PGCD invalide');
      } else {
        assert.ok(Array.isArray(exercise.opts) && exercise.opts.length >= 2, 'au moins deux propositions attendues');
      }
      if (exercise.mode === 'rounding') assert.ok(Number.isFinite(exercise.ans));
    }
  }
}

const milestones = context.window.MathRushProgression.getMilestones('quick', {
  section: 1, level: 7, done: ['1-1', '1-2', '1-3', '1-4', '1-5']
});
assert.equal(milestones.length, 3);
assert.equal(milestones[0].done, true);
assert.equal(milestones[1].current, true);

const trophies = context.window.MathRushAchievements.getUnlocked({
  points: 600, soloLessons: 1, highScoreLessons: 1, gogoBest: 10,
  section: 1, level: 6, bestStreak: 10, modeStats: {}
});
assert.ok(trophies.some(trophy => trophy.id === 'first-lesson'));
assert.ok(trophies.some(trophy => trophy.id === 'streak-10'));

const appSource = fs.readFileSync(`${__dirname}/../assets/js/app.js`, 'utf8');
const htmlSource = fs.readFileSync(`${__dirname}/../index.html`, 'utf8');
assert.ok(appSource.includes('function recordCompetitiveResult'), 'enregistrement des statistiques compétitives manquant');
assert.ok(appSource.includes("recordCompetitiveResult('duel'"), 'statistiques des défis absentes');
assert.ok(appSource.includes("recordCompetitiveResult('multiplayer'"), 'statistiques multijoueur absentes');
for (const id of ['profileDuelsPlayed','profileDuelsWon','profileMultiPlayed','profileMultiWon']) {
  assert.ok(htmlSource.includes(`id=\"${id}\"`), `statistique ${id} absente du profil`);
}
console.log('MathRush : tests réussis (5 600 exercices, progression, trophées et statistiques compétitives).');
