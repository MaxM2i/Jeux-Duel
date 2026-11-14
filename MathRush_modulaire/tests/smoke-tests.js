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
      if (exercise.mode === 'coordinates') { assert.ok(!exercise.visual.includes('Échelle : 1 carreau = 1 unité'), 'l’échelle ne doit plus encombrer le graphique'); assert.ok(exercise.visual.includes('--coord-x:'), 'position horizontale du point absente'); }
    }
  }
}

// Catalogue des modèles : chaque variante visuelle doit être générable et mathématiquement cohérente.
const modelCatalog = context.window.MathRushConfig.EXERCISE_MODELS;
assert.ok(Array.isArray(modelCatalog) && modelCatalog.length >= 10, 'catalogue de modèles absent ou incomplet');
for (const model of modelCatalog) {
  assert.ok(model.id && model.label && Array.isArray(model.modes) && Array.isArray(model.playModes) && model.weight >= 0, `métadonnées incomplètes : ${model.id}`);
  assert.ok(model.difficultyMin <= model.difficultyMax && model.numberMin <= model.numberMax, `plage invalide : ${model.id}`);
}
const specialModels = [
  ['cursor-number-line','quick','commonSlider'], ['factor-tree','quick','factorTree'],
  ['ppcm-choice','common-multiples','ppcmChoice'], ['rounding-table','rounding','roundingTable'],
  ['base-ten-blocks','rounding','baseTen'], ['rounding-blocks','rounding','baseTenRounding'],
  ['missing-boxes','quick','missingBox'], ['number-pattern','quick','pattern'],
  ['number-model','quick','model'], ['factor-gap','common-multiples','factors'], ['equation-target','complex','equation']
];
for (const [id,mode,type] of specialModels) {
  const weights = modelCatalog.map(model => model.weight);
  modelCatalog.forEach(model => { model.weight = model.id === id ? 1 : 0; });
  const ex = context.window.MathRushExercises.createSoloExercise(mode, 3, rand, shuffle);
  assert.equal(ex.type, type, `modèle ${id} non utilisé dans le générateur`);
  if (type === 'factorTree') { assert.equal(ex.total, ex.ans * ex.right, 'arbre de facteurs incohérent'); assert.equal(ex.ans,ex.lowerA*ex.lowerB,'branche inférieure incohérente'); }
  if (type === 'ppcmChoice') assert.equal(ex.ans, context.window.MathRushExercises.lcm(ex.a, ex.b), 'PPCM incorrect');
  if (type === 'roundingTable') { assert.equal(ex.ans, ex.rows[2].rounded, 'tableau d’arrondis incohérent'); assert.ok(ex.rows.every(row=>row.expression&&row.difference===row.number-row.fixed), 'calculs du tableau incohérents'); }
  if (type === 'baseTen') { assert.ok(Number.isInteger(ex.ans)&&ex.ans>=0&&ex.ans<=300,'nombre cible des blocs invalide'); assert.equal(ex.opts.length,2,'le modèle doit proposer exactement deux cartes'); assert.ok(ex.opts.includes(ex.ans),'la bonne quantité doit être proposée'); assert.equal(new Set(ex.opts).size,2,'les deux quantités doivent être différentes'); assert.ok(ex.opts.every(n=>Number.isInteger(n)&&n>=0&&n<=300),'quantité de blocs invalide'); }
  if (type === 'baseTen') { for(let rank=0;rank<=6;rank++){const sample=context.window.MathRushExercises.createSoloExercise('rounding',rank,rand,shuffle,'solo');assert.equal(sample.type,'baseTen');assert.equal(sample.opts.length,2);assert.ok(sample.opts.includes(sample.ans));assert.ok(sample.ans>=0&&sample.ans<=300);} }
  if (type === 'baseTenRounding') assert.equal(ex.ans,Math.round(ex.number/100)*100,'arrondi visuel en blocs incorrect');
  if (type === 'commonSlider') assert.equal(ex.ans,Number(ex.expression.split(' × ').reduce((a,b)=>Number(a)*Number(b),1)),'expression du curseur incorrecte');
  if (type === 'missingBox') { const target=Number(ex.prompt.match(/= (\d+)/)[1]); assert.equal(target,ex.a*ex.ans,'produit affiché incohérent'); assert.equal(ex.ans,ex.b,'facteur manquant incorrect'); }
  modelCatalog.forEach((model,index) => { model.weight = weights[index]; });
}

const cursorModel=modelCatalog.find(model=>model.id==='cursor-number-line');
const previousPlayModes=[...cursorModel.playModes],previousWeights=modelCatalog.map(model=>model.weight);cursorModel.playModes=['solo'];
modelCatalog.forEach(model=>{model.weight=model.id==='cursor-number-line'?1:0;});
assert.equal(context.window.MathRushExercises.createSoloExercise('quick',2,rand,shuffle,'solo').type,'commonSlider','modèle curseur absent du parcours solo');
assert.notEqual(context.window.MathRushExercises.createSoloExercise('quick',2,rand,shuffle,'duel').type,'commonSlider','un modèle interdit est apparu en Défi');
cursorModel.playModes=previousPlayModes;
modelCatalog.forEach((model,index)=>{model.weight=previousWeights[index];});

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
assert.ok(appSource.includes('createSoloExercise(type,Math.max(0,duelDiff-1),rand,shuffle,gameContext)'), 'catalogue non utilisé dans les Défis et le Multijoueur');
assert.ok(appSource.includes("type === 'baseTenRounding'") && appSource.includes("type === 'roundingTable'") && appSource.includes("type === 'factorTree'"), 'rendu des nouveaux modèles visuels absent');
assert.ok(appSource.includes('renderBaseTenBlocks') && appSource.includes("generated.type==='baseTen'"), 'rendu du modèle de comptage de blocs absent');
assert.ok(appSource.includes('function soloExerciseExplanation()') && appSource.includes('function soloExerciseHint()'), 'aide et indice du parcours solo absents');
assert.ok(htmlSource.includes('id="gogoChangePaused"'), 'bouton changer d’exercice en pause absent');
assert.ok(htmlSource.includes('id="soloExplain"') && htmlSource.includes('id="soloHint"'), 'boutons aide/indice du parcours solo absents');
assert.ok(htmlSource.includes('id="soloHelpClose"'), 'bouton de fermeture de l’aide absent');
assert.ok(htmlSource.includes('id="profileSpeed"'), 'rapidité moyenne absente du profil');
assert.ok(appSource.includes('function recordTiming(') && appSource.includes('function timingSummaryHtml('), 'statistiques de rapidité communes absentes');
assert.ok(appSource.includes('function showAnswerToast(') && appSource.includes('answerFeedbackObserver'), 'feedback central des réponses absent');
assert.ok(appSource.includes('toast-points') && appSource.includes('toast-stars'), 'détail des points et étoiles du feedback absent');
assert.ok(appSource.includes('SPEED_STAR_THRESHOLDS_SECONDS') && appSource.includes('thresholds.findIndex'), 'seuils des cinq étoiles configurables absents');
assert.ok(appSource.includes('SPEED_BONUS_MAX-seconds*GAME_RULES.SPEED_BONUS_PER_SECOND'), 'calcul continu des points bonus de rapidité absent');
const speedRewardMatch=appSource.match(/function getSpeedReward\(elapsedMs\)\{[^\n]+/);
assert.ok(speedRewardMatch,'fonction de calcul des étoiles et du bonus absente');
const getSpeedReward=vm.runInNewContext('(function(){const GAME_RULES={SPEED_STAR_THRESHOLDS_SECONDS:[2,4,6,8,10],SPEED_BONUS_MAX:50,SPEED_BONUS_PER_SECOND:5};return ('+speedRewardMatch[0]+')})()');
for (const [seconds,stars,bonus] of [[0,5,50],[1,5,45],[2,4,40],[3,4,35],[4,3,30],[5,3,25],[6,2,20],[7,2,15],[8,1,10],[9,1,5],[10,0,0]]) { const actual=getSpeedReward(seconds*1000); assert.equal(actual.stars,stars,`étoiles incorrectes à ${seconds}s`); assert.equal(actual.bonus,bonus,`bonus incorrect à ${seconds}s`); }
assert.ok(appSource.includes('Échelle : chaque carreau représente 1 unité'), 'explication de l’échelle dans la bulle Comprendre absente');
assert.ok(appSource.includes('class=\"coordinate-help\"') && appSource.includes('? Comprendre'), 'aide d’échelle pour Défi et Multijoueur absente');
assert.ok(appSource.includes('remainingTimeBonus=completed?Math.max(0,gogoRemaining)*GAME_RULES.GOGO_REMAINING_SECOND_BONUS:0'), 'bonus de points lié au temps restant dans Duo à gogo absent');
assert.ok(appSource.includes('Bonus grâce au temps restant'), 'affichage du bonus de temps restant absent');
assert.ok(appSource.includes('answerToastAnimationTimer') && appSource.includes('1050ms cubic-bezier'), 'animation du feedback vers la jauge absente');
assert.ok(appSource.includes('soloBackHome') && appSource.includes('duelBackHome') && appSource.includes('mathBackHome'), 'boutons retour à l’accueil des modes absents');
assert.ok(appSource.includes("a.classList.add('answer-wrong')") && appSource.includes("'answer-correct'"), 'coloration des cartes Duo à gogo absente');
assert.ok(fs.readFileSync(`${__dirname}/../assets/css/mathrush.css`, 'utf8').includes('.math-answer-toast.visible'), 'style du feedback central absent');
assert.ok(appSource.includes('Moyenne / réponse') && appSource.includes('Plus rapide') && appSource.includes('Plus lente') && appSource.includes('Bonus de rapidité cumulé'), 'détails des statistiques de rapidité absents');
assert.ok(appSource.includes('timingSummaryHtml(soloSessionStats)'), 'statistiques de rapidité solo absentes');
assert.ok(appSource.includes('timingSummaryHtml(localDuelMode?localDuelSessionStats:duelSessionStats)'), 'statistiques de rapidité défi absentes');
assert.ok(appSource.includes('Bonus grâce au temps restant'), 'bonus du temps restant Duo à gogo absent');
assert.ok(appSource.includes('mathPlayerTiming[player.id]'), 'statistiques de rapidité multijoueur absentes');

// Régressions : les cases manquantes attendent le facteur, pas le produit ; le curseur du niveau 1 reste simple.
for(let i=0;i<300;i++){
  const missing=context.window.MathRushExercises.createSoloExercise('quick',0,rand,shuffle,'solo');
  if(missing.type==='missingBox'){
    assert.equal(missing.ans,missing.b,'la case vide doit être le facteur manquant');
    assert.equal(missing.a*missing.ans,Number(missing.prompt.match(/= (\d+)$/)?.[1]),'le produit affiché doit correspondre au facteur manquant');
  }
  if(missing.type==='commonSlider'){
    assert.ok(missing.ans>=0&&missing.ans<=20,'le curseur du premier palier doit rester dans une petite plage positive');
    assert.ok(!missing.expression.includes('×')||missing.expression.split('×').length===2,'le premier palier ne doit pas proposer trois facteurs');
  }
}

// Représentation en base 10 : unités jusqu'à 10, dizaines au-delà, centaines au-delà de 100.
const renderBlocks=context.window.MathRushExercises.renderBaseTenBlocks;
for(const value of [0,1,9,10,11,99,100,109,199,200,201,268,300]){
  const html=renderBlocks(value);
  assert.ok(html.includes(`aria-label="${value} blocs`),`libellé des blocs absent pour ${value}`);
  assert.equal((html.match(/base-ten-hundred-tile/g)||[]).length,Math.floor(value/100),`centaines incorrectes pour ${value}`);
  assert.equal((html.match(/base-ten-ten-rod/g)||[]).length,Math.floor((value%100)/10),`dizaines incorrectes pour ${value}`);
  assert.equal((html.match(/base-ten-unit-cube/g)||[]).length,value%10,`unités incorrectes pour ${value}`);
}
assert.ok(renderBlocks(268).includes('count-hundreds stacked'),'superposition des centaines au-dessus de 200 absente');assert.ok(!renderBlocks(200).includes('stacked'),'les centaines ne doivent pas être superposées à 200 pile');
const tree=context.window.MathRushExercises.renderFactorTree({total:120,left:12,right:10,lowerA:3,lowerB:4});
assert.ok(tree.includes('factor-tree-bracket')&&tree.includes('factor-subtree'),'arbre et crochets horizontaux absents');
const flexible=modelCatalog.find(model=>model.id==='flexible-template');
assert.ok(flexible&&flexible.type==='flexTemplate','modèle polyvalent absent du catalogue');
const patternCases=[['calculation','quick','choice'],['rounding','rounding','round'],['percentage','percentages','percent'],['missingBox','multiplication-division','missingBox'],['equivalent','complex','equation'],['numberModel','quick','model']];
const originalPatterns=[...flexible.contentPatterns];
for(const [pattern,mode,type] of patternCases){
  const weights=modelCatalog.map(m=>m.weight);modelCatalog.forEach(m=>m.weight=m.id===flexible.id?1:0);flexible.contentPatterns=[pattern];
  const ex=context.window.MathRushExercises.createSoloExercise(mode,2,rand,shuffle,'solo');
  assert.equal(ex.type,type,`contenu polyvalent ${pattern} incorrect`);
  modelCatalog.forEach((m,i)=>m.weight=weights[i]);
}
flexible.contentPatterns=originalPatterns;
console.log('MathRush : tests réussis (5 600 exercices, progression, trophées, sélecteurs Défi/Multijoueur et écrans de fin).');

// Régression curseur mobile : aucun padding horizontal ne doit écraser le rail tactile.
const cssSource = require('fs').readFileSync(require('path').join(__dirname, '../assets/css/mathrush.css'), 'utf8');
assert(cssSource.includes('#solo input[type=range].range') && cssSource.includes('padding:0!important'), 'range tactile sans padding');
assert(appSource.includes('answerToastTimer=setTimeout(travel,3000)'), 'feedback visible 3000 ms');
assert(appSource.includes('1050ms cubic-bezier'), 'animation feedback prolongée');

assert.ok(fs.existsSync(`${__dirname}/../exercise-lab.html`), 'laboratoire indépendant des exercices absent');
const labSource=fs.readFileSync(`${__dirname}/../exercise-lab.html`,'utf8');
assert.ok(labSource.includes('id="cursorSettings"') && labSource.includes('id="cursorColor"') && labSource.includes('id="cursorStep"'), 'panneau de réglage du curseur absent');
assert.ok(!labSource.includes('customFieldsPreview') && !labSource.includes('addTextField'), 'ancien panneau de champs de texte encore présent');
assert.ok(labSource.includes('id="addMarker"') && labSource.includes('id="clearMarkers"') && labSource.includes('id="cursorStart"'), 'édition des repères et de la position initiale absente');
assert.ok(labSource.includes('id="catalogPanel"') && labSource.includes('id="modelOverview"') && labSource.includes('id="exportCatalog"') && labSource.includes('id="modelPlayModes"') && labSource.includes('id="testSelectedModel"') && labSource.includes('function syncRuntimeCatalog()'), 'catalogue éditable des modèles absent');
assert.ok(labSource.includes('id="modelPatterns"') && labSource.includes('flexTemplate') && labSource.includes('contentPatterns'), 'choix des familles de contenu du modèle polyvalent absent');
assert.ok(labSource.includes('id="visualSettings"') && labSource.includes('id="exportVisualCss"') && labSource.includes('treeThickness'), 'éditeur CSS visuel du laboratoire absent');
assert.ok(labSource.includes('id="selectedModelPreview"') && labSource.includes('function renderSelectedModelPreview()') && labSource.includes('refreshModelPreview'), 'aperçu visuel vivant du modèle sélectionné absent');
assert.ok(appSource.includes('function renderCursorScale(') && appSource.includes('left:${left}'), 'graduations du curseur non positionnées proportionnellement');
assert.ok(labSource.includes('id="integrationCode"') && labSource.includes('id="generateCode"') && appSource.includes('MathRushConfig.CURSOR_MODEL'), 'export de code du modèle de curseur absent');
assert.ok(!labSource.includes('localStorage.setItem') && !labSource.includes('localStorage.getItem'), 'le laboratoire ne doit pas utiliser le stockage navigateur');
assert.ok(appSource.includes('soloRescuePanel') && appSource.includes('Ta partie est en pause') && !appSource.includes('fb.innerHTML+=`<div class="streak-rescue"'), 'panneau de rattrapage séparé ou feedback neutre absent');
assert.ok(appSource.includes('RESCUE_MIN_STREAK') && appSource.includes('rescueStreakBtn') && appSource.includes('currentGlobalStreak'), 'rattrapage de série global absent');
assert.equal(context.window.MathRushConfig.GAME_RULES.RESCUE_MIN_STREAK,20);
assert.equal(context.window.MathRushConfig.GAME_RULES.EXERCISES_PER_SESSION,15);
assert.equal(context.window.MathRushConfig.GAME_RULES.POINTS_CORRECT_ANSWER,100);
assert.equal(context.window.MathRushConfig.GAME_RULES.NEAR_ANSWER_BASE_POINTS,60);
assert.equal(context.window.MathRushConfig.GAME_RULES.RESCUE_POINT_COST,50);
assert.equal(context.window.MathRushConfig.GAME_RULES.SPEED_BONUS_MAX,50);
assert.ok(cssSource.includes('max-width:205px') && cssSource.includes('width:min(100%,130px)'), 'réduction du graphique de coordonnées absente');
