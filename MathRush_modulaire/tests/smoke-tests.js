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
      if (exercise.mode === 'coordinates') { assert.ok(exercise.visual.includes('Échelle : 1 carreau = 1 unité'), 'échelle du repère absente'); assert.ok(exercise.visual.includes('--coord-x:'), 'position horizontale du point absente'); }
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
assert.ok(appSource.includes('function renderSharedMathModeCards'), 'génération partagée des modes absente');
assert.ok(appSource.includes("renderSharedMathModeCards('duelMathModes'"), 'sélecteur Défi non alimenté');
assert.ok(appSource.includes("renderSharedMathModeCards('mathRoomModes'"), 'sélecteur Multijoueur non alimenté');
assert.ok(appSource.includes('duel-finish-anim'), 'animation de fin du Défi absente');
assert.ok(appSource.includes('podium-stage'), 'podium multijoueur absent');
assert.ok(htmlSource.includes('id=\"duelMathModes\"'), 'conteneur de modes Défi absent');
assert.ok(htmlSource.includes('id=\"mathRoomModes\"'), 'conteneur de modes Multijoueur absent');
assert.ok(htmlSource.includes('id=\"mathPodiumResult\"'), 'conteneur de podium absent');
assert.ok(htmlSource.includes('id=\"gogoSetupControls\"'), 'zone de configuration Duo à gogo absente');
assert.ok(appSource.includes('function formatGogoTime'), 'format de temps Duo à gogo absent');
assert.ok(appSource.includes('finishGogo(true,completedAt)'), 'temps de fin réel du dernier duo non conservé');
assert.ok(appSource.includes('Nouveau record : tu gagnes'), 'comparaison du record Duo à gogo absente');
assert.ok(appSource.includes('gogo-unlocked'), 'affichage du niveau débloqué absent');
assert.ok(htmlSource.includes('id=\"gogoResultPanel\"'), 'panneau de résultat indépendant Duo à gogo absent');
assert.ok(appSource.includes('const sameValue=Number.isFinite(numericA)&&Number.isFinite(numericC)?numericA===numericC:valueA===valueC'), 'validation des paires par égalité mathématique absente');
assert.ok(appSource.includes('function pauseGogo()') && appSource.includes('function resumeGogo()'), 'pause/reprise Duo à gogo absente');
assert.ok(htmlSource.includes('id="gogoPause"') && htmlSource.includes('id="gogoResume"'), 'commandes de pause/reprise Duo à gogo absentes');
assert.ok(appSource.includes('coord-${exercise.x}-${exercise.y}'), 'correspondance compacte des coordonnées absente');
assert.ok(appSource.includes('label=`${exercise.pct} % de ${exercise.base}`'), 'énoncé des pourcentages Duo à gogo absent');
assert.ok(appSource.includes("$('gogoGamePanel').hidden=true"), 'masquage du plateau après la partie absent');
assert.ok(appSource.includes("$('duoGogo').classList.add('gogo-playing')"), 'mise au point du plateau au lancement absente');
assert.ok(appSource.includes('function savePausedGogo()') && appSource.includes('function restorePausedGogo()'), 'sauvegarde/restauration de la pause Duo à gogo absente');
assert.ok(appSource.includes('gogoChangePaused'), 'action de changement d’exercice depuis la pause absente');
assert.ok(appSource.includes('function soloExerciseExplanation()') && appSource.includes('function soloExerciseHint()'), 'aide et indice du parcours solo absents');
assert.ok(htmlSource.includes('id="gogoChangePaused"'), 'bouton changer d’exercice en pause absent');
assert.ok(htmlSource.includes('id="soloExplain"') && htmlSource.includes('id="soloHint"'), 'boutons aide/indice du parcours solo absents');
console.log('MathRush : tests réussis (5 600 exercices, progression, trophées, sélecteurs Défi/Multijoueur et écrans de fin).');
