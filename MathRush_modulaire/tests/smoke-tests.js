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
  for (const mode of ['quick', 'complex', 'rounding', 'coordinates', 'percentages', 'common-multiples', 'multiplication-division', 'exponents', 'fractions', 'mixed']) {
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
const cfgArchitecture=context.window.MathRushConfig;
assert.equal(cfgArchitecture.MATH_CATEGORIES.length,10,'les dix catégories doivent être listées, tout mélangé inclus');
assert.ok(cfgArchitecture.MATH_CATEGORIES.find(category=>category.id==='mixed')?.composite,'Tout mélangé doit être identifié comme catégorie composite');
assert.deepEqual([...cfgArchitecture.MATH_CATEGORIES.find(category=>category.id==='mixed').includes].sort(),['common-multiples','complex','coordinates','exponents','fractions','multiplication-division','percentages','quick','rounding'].sort(),'Tout mélangé doit reprendre les neuf catégories');
assert.ok(cfgArchitecture.CONTENT_GENERATORS.length>=12,'catalogue des générateurs de contenu incomplet');
assert.ok(cfgArchitecture.PRESENTATION_MODELS.length>=18,'catalogue des présentations incomplet');
assert.deepEqual(['square-100','square-bar','pie-chart','square-9'].map(id=>cfgArchitecture.PRESENTATION_MODELS.find(model=>model.id===id)?.label),['Carré 100','Carré barré','Camembert','Carré 9'],'les quatre modèles tactiles doivent être nommés');
assert.ok(cfgArchitecture.PRESENTATION_COMPATIBILITY['percentage-of'].includes('blue-white-grid'),'compatibilité pourcentages/grille absente');
assert.ok(cfgArchitecture.CONTENT_GENERATORS.some(x=>x.id==='power-operation'&&x.categories.includes('exponents')),'générateur exposants absent');
assert.ok(cfgArchitecture.CONTENT_GENERATORS.some(x=>x.id==='fraction-of'&&x.categories.includes('fractions')),'générateur fractions absent');
assert.ok(cfgArchitecture.PRESENTATION_COMPATIBILITY['basic-operation'].includes('square-9'),'les modèles tactiles doivent accepter aussi un contenu de calcul simple');
assert.ok(cfgArchitecture.PRESENTATION_COMPATIBILITY['number-value'].includes('square-100'),'les modèles tactiles doivent accepter un contenu numérique');
assert.ok(cfgArchitecture.PRESENTATION_COMPATIBILITY['fraction-of'].includes('square-9'),'compatibilité fraction/carré 9 absente');
assert.ok(cfgArchitecture.PRESENTATION_COMPATIBILITY['fraction-operation'].includes('square-9'),'compatibilité opération/carré 9 absente');
const modelCatalog = context.window.MathRushConfig.EXERCISE_MODELS;
assert.ok(Array.isArray(modelCatalog) && modelCatalog.length >= 10, 'catalogue de modèles absent ou incomplet');
for (const model of modelCatalog) {
  assert.ok(model.id && model.label && Array.isArray(model.modes) && Array.isArray(model.playModes) && model.weight >= 0, `métadonnées incomplètes : ${model.id}`);
  assert.ok(model.difficultyMin <= model.difficultyMax && model.numberMin <= model.numberMax, `plage invalide : ${model.id}`);
  assert.ok(Array.isArray(model.categoryIds) && Array.isArray(model.contentIds) && Array.isArray(model.presentationIds), `axes indépendants absents : ${model.id}`);
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
  if (type === 'baseTen') { assert.ok(Number.isInteger(ex.ans)&&ex.ans>=1&&ex.ans<=30,'nombre cible des blocs invalide'); assert.equal(ex.opts.length,2,'le modèle doit proposer exactement deux cartes'); assert.ok(ex.opts.includes(ex.ans),'la bonne quantité doit être proposée'); assert.equal(new Set(ex.opts).size,2,'les deux quantités doivent être différentes'); assert.ok(ex.opts.every(n=>Number.isInteger(n)&&n>0&&n<=32),'quantité de blocs invalide'); }
  if (type === 'baseTen') { for(let rank=0;rank<=6;rank++){const sample=context.window.MathRushExercises.createSoloExercise('rounding',rank,rand,shuffle,'solo');assert.equal(sample.type,'baseTen');assert.equal(sample.opts.length,2);assert.ok(sample.opts.includes(sample.ans));} }
  if (type === 'baseTenRounding') assert.equal(ex.ans,Math.round(ex.number/100)*100,'arrondi visuel en blocs incorrect');
  if (type === 'commonSlider') assert.equal(ex.ans,Number(ex.expression.split(' × ').reduce((a,b)=>Number(a)*Number(b),1)),'expression du curseur incorrecte');
  if (type === 'missingBox') { assert.ok(ex.prompt.includes('□'),'case manquante absente'); assert.ok(Number.isFinite(ex.ans),'réponse manquante invalide'); assert.ok(ex.opts.includes(ex.ans),'la bonne réponse doit être proposée'); }
  modelCatalog.forEach((model,index) => { model.weight = weights[index]; });
}

// Les modèles tactiles acceptent plusieurs unités et le remplissage par balayage.
{
  const app=fs.readFileSync(`${__dirname}/../assets/js/app.js`,'utf8');
  assert.ok(app.includes("addEventListener('pointerdown'")&&app.includes("addEventListener('pointerover'"),'remplissage tactile par balayage absent');
  assert.ok(app.includes('touch-units-100')&&app.includes('touch-units-bar'),'unités multiples des modèles tactiles absentes');
}


// Régression critique : une opération de fractions doit toujours proposer sa vraie réponse.
{
  const touch=modelCatalog.find(model=>model.id==='fraction-touch-models');
  const snapshot={weight:touch.weight,categoryIds:[...touch.categoryIds],modes:[...touch.modes],contentIds:[...touch.contentIds],presentationIds:[...touch.presentationIds],touchInteraction:touch.touchInteraction,design:{...(touch.design||{})}};
  modelCatalog.forEach(model=>{model.weight=model.id==='fraction-touch-models'?1:0;});
  touch.categoryIds=['fractions'];touch.modes=['fractions'];touch.contentIds=['fraction-operation'];touch.presentationIds=['square-9'];touch.touchInteraction='read';
  for(let i=0;i<1500;i++){
    const ex=context.window.MathRushExercises.createSoloExercise('fractions',3,rand,shuffle,'solo');
    assert.equal(ex.type,'touchModel');
    assert.ok(ex.opts.includes(ex.ans),`réponse ${ex.ans} absente des propositions ${ex.opts} pour ${ex.contentLabel}`);
    assert.equal(ex.displayOpts[ex.opts.indexOf(ex.ans)],ex.answerLabel,'libellé affiché et valeur correcte désynchronisés');
  }
  touch.presentationIds=['pie-chart'];touch.design={pieParts:4};
  for(let i=0;i<300;i++){
    const ex=context.window.MathRushExercises.createSoloExercise('fractions',3,rand,shuffle,'solo');
    assert.equal(ex.touchParts,4,'le nombre de parts du camembert doit respecter le réglage du Labo');
    assert.ok(ex.opts.includes(ex.ans),'le camembert doit proposer la bonne réponse');
  }
  touch.weight=snapshot.weight;touch.categoryIds=snapshot.categoryIds;touch.modes=snapshot.modes;touch.contentIds=snapshot.contentIds;touch.presentationIds=snapshot.presentationIds;touch.touchInteraction=snapshot.touchInteraction;touch.design=snapshot.design;
}

// Les autorisations définies dans le Labo doivent réellement filtrer catégories, contenus et modes.
{
  const touch=modelCatalog.find(model=>model.id==='fraction-touch-models'),weights=modelCatalog.map(model=>model.weight),rules=context.window.MathRushConfig.PRESENTATION_RULES;
  const snapshot={categoryIds:[...touch.categoryIds],modes:[...touch.modes],contentIds:[...touch.contentIds],presentationIds:[...touch.presentationIds]};
  const previous=rules['pie-chart'];
  modelCatalog.forEach(model=>{model.weight=model.id===touch.id?1:0;});
  touch.categoryIds=['fractions','percentages'];touch.modes=['fractions','percentages'];touch.contentIds=['fraction-operation','percentage-of'];touch.presentationIds=['pie-chart'];
  rules['pie-chart']={categories:['percentages'],contents:['percentage-of'],playModes:['solo']};
  assert.throws(()=>context.window.MathRushExercises.createSoloExercise('fractions',2,rand,shuffle,'solo'),'aucun modèle autorisé ne doit pouvoir générer une présentation interdite');
  const allowed=context.window.MathRushExercises.createSoloExercise('percentages',2,rand,shuffle,'solo');
  assert.equal(allowed.type,'touchModel');assert.equal(allowed.presentationId,'pie-chart');assert.equal(allowed.contentId,'percentage-of');
  const duelDenied=context.window.MathRushExercises.createSoloExercise('percentages',2,rand,shuffle,'duel');
  assert.notEqual(duelDenied.presentationId,'pie-chart','un mode de jeu interdit ne doit pas utiliser la présentation');
  if(previous)rules['pie-chart']=previous;else delete rules['pie-chart'];
  touch.categoryIds=snapshot.categoryIds;touch.modes=snapshot.modes;touch.contentIds=snapshot.contentIds;touch.presentationIds=snapshot.presentationIds;
  modelCatalog.forEach((model,index)=>{model.weight=weights[index];});
}

// Les cases à compléter doivent produire une question adaptée à chaque catégorie compatible.
{
  const weights=modelCatalog.map(model=>model.weight);
  const missing=modelCatalog.find(model=>model.id==='missing-boxes');
  modelCatalog.forEach(model=>{model.weight=model.id==='missing-boxes'?1:0;});
  for(const category of ['quick','complex','rounding','percentages','common-multiples','multiplication-division']){
    const ex=context.window.MathRushExercises.createSoloExercise(category,3,rand,shuffle,'solo');
    assert.equal(ex.type,'missingBox',`case à compléter absente pour ${category}`);
    assert.ok(ex.prompt.includes('□'),`élément manquant absent pour ${category}`);
    assert.ok(Number.isFinite(ex.ans),`réponse non numérique pour ${category}`);
    assert.ok(ex.opts.includes(ex.ans),`bonne réponse absente des choix pour ${category}`);
  }
  modelCatalog.forEach((model,index)=>{model.weight=weights[index];});
}

const cursorModel=modelCatalog.find(model=>model.id==='cursor-number-line');
const previousPlayModes=[...cursorModel.playModes],previousWeights=modelCatalog.map(model=>model.weight);cursorModel.playModes=['solo'];
modelCatalog.forEach(model=>{model.weight=model.id==='cursor-number-line'?1:0;});
assert.equal(context.window.MathRushExercises.createSoloExercise('quick',2,rand,shuffle,'solo').type,'commonSlider','modèle curseur absent du parcours solo');
assert.notEqual(context.window.MathRushExercises.createSoloExercise('quick',2,rand,shuffle,'duel').type,'commonSlider','un modèle interdit est apparu en Défi');
cursorModel.playModes=previousPlayModes;
modelCatalog.forEach((model,index)=>{model.weight=previousWeights[index];});

// Les deux nouvelles catégories sont générées dans chaque contexte de jeu.
{
  const weights=modelCatalog.map(model=>model.weight);
  for(const category of ['exponents','fractions']){
    const targetId=category==='exponents'?'exponents':'fraction-touch-models';
    modelCatalog.forEach(model=>{model.weight=model.id===targetId?1:0;});
    for(const playMode of ['solo','duel','multiplayer','gogo']){
      const ex=context.window.MathRushExercises.createSoloExercise(category,2,rand,shuffle,playMode);
      assert.ok(ex.ans!==undefined,`réponse absente pour ${category}/${playMode}`);
      assert.ok(Array.isArray(ex.opts)&&ex.opts.length>=2,`choix absents pour ${category}/${playMode}`);
      if(category==='exponents'){assert.equal(ex.type,'exponent');assert.equal(ex.result,Math.pow(ex.base,ex.exponent));assert.equal(ex.ans,ex.questionKind==='base'?ex.base:ex.questionKind==='exponent'?ex.exponent:ex.result);}
      else{assert.equal(ex.type,'touchModel');assert.ok(['square-100','square-bar','pie-chart','square-9'].includes(ex.presentationId));}
    }
  }
  modelCatalog.forEach((model,index)=>{model.weight=weights[index];});
}
// Les exposants permettent aussi de retrouver la base ou l’exposant manquant.
{
  const weights=modelCatalog.map(model=>model.weight);modelCatalog.forEach(model=>{model.weight=model.id==='exponents'?1:0;});
  const forceBase=(min,max)=>min===0&&max===3?2:min,forceExponent=(min,max)=>min===0&&max===3?3:min;
  const baseQuestion=context.window.MathRushExercises.createSoloExercise('exponents',1,forceBase,shuffle,'solo');
  const exponentQuestion=context.window.MathRushExercises.createSoloExercise('exponents',1,forceExponent,shuffle,'solo');
  assert.equal(baseQuestion.questionKind,'base');assert.equal(baseQuestion.ans,baseQuestion.base);assert.equal(baseQuestion.result,Math.pow(baseQuestion.base,baseQuestion.exponent));
  assert.equal(exponentQuestion.questionKind,'exponent');assert.equal(exponentQuestion.ans,exponentQuestion.exponent);assert.equal(exponentQuestion.result,Math.pow(exponentQuestion.base,exponentQuestion.exponent));
  modelCatalog.forEach((model,index)=>{model.weight=weights[index];});
}
// Vérifie les limites et les quatre rendus tactiles sur leurs contenus compatibles.
{
  const weights=modelCatalog.map(model=>model.weight),touch=modelCatalog.find(model=>model.id==='fraction-touch-models');
  modelCatalog.forEach(model=>{model.weight=model.id===touch.id?1:0;});
  const cases=[['fractions','square-100','fraction-of',1,200],['fractions','square-bar','fraction-of',1,20],['fractions','pie-chart','fraction-of',1,8],['fractions','square-9','fraction-of',1,8],['fractions','square-9','fraction-operation',2,8],['percentages','square-100','percentage-of',1,200],['percentages','square-bar','percentage-of',1,20],['percentages','pie-chart','percentage-of',1,8]];
  for(const [category,presentation,content,min,max] of cases){
    touch.presentationIds=[presentation];touch.contentIds=[content];
    const ex=context.window.MathRushExercises.createSoloExercise(category,2,rand,shuffle,'solo');
    assert.equal(ex.type,'touchModel');assert.equal(ex.presentationId,presentation);assert.ok(ex.touchTarget>=min&&ex.touchTarget<=max,`cible hors plage ${presentation}`);assert.ok(ex.touchMode==='fill'||ex.touchMode==='read');if(presentation==='pie-chart')assert.ok(ex.touchParts>=2&&ex.touchParts<=8,'camembert entre 2 et 8 parts');assert.ok(ex.contentTemplate&&ex.contentSlot,'réglage de contenu du modèle tactile absent');
  }
  // Les deux modèles à unités répétables représentent bien 150 % / 200 % sans plafonner à une unité.
  touch.touchInteraction='fill';touch.contentIds=['number-value'];
  touch.presentationIds=['square-bar'];
  const maxRand=(min,max)=>max;
  const barMulti=context.window.MathRushExercises.createSoloExercise('quick',2,maxRand,shuffle,'solo');
  assert.equal(barMulti.touchTarget,20,'Carré barré doit pouvoir représenter 200 %');
  touch.presentationIds=['square-100'];
  const squareMulti=context.window.MathRushExercises.createSoloExercise('quick',2,maxRand,shuffle,'solo');
  assert.equal(squareMulti.touchTarget,200,'Carré 100 doit pouvoir représenter 200 %');
  touch.presentationIds=['pie-chart'];
  const pieParts=context.window.MathRushExercises.createSoloExercise('quick',2,maxRand,shuffle,'solo');
  assert.ok(pieParts.touchParts>=2&&pieParts.touchParts<=8,'camembert réglable de 2 à 8 parts');
  touch.touchInteraction='random';
  // Fraction équivalente et opération : le résultat doit correspondre à la quantité dessinée.
  touch.presentationIds=['square-9'];touch.contentIds=['fraction-equivalence'];
  const equivalent=context.window.MathRushExercises.createSoloExercise('fractions',2,rand,shuffle,'solo');
  const eq=equivalent.contentLabel.match(/(\d+)\/(\d+) = \?\/(\d+)/);
  assert.ok(eq,'énoncé de fraction équivalente absent');assert.equal(Number(eq[1])*Number(eq[3])/Number(eq[2]),equivalent.ans,'fraction équivalente incorrecte');
  touch.contentIds=['fraction-operation'];
  const operation=context.window.MathRushExercises.createSoloExercise('fractions',2,rand,shuffle,'solo');
  const op=operation.contentLabel.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/);
  assert.ok(op,'opération sur fractions absente');assert.equal(Number(op[1])+Number(op[3]),operation.ans,'addition de fractions incorrecte');
  touch.presentationIds=['square-100'];touch.contentIds=['decimal-value'];
  const decimal=context.window.MathRushExercises.createSoloExercise('fractions',2,rand,shuffle,'solo');assert.ok(decimal.touchTarget>=50&&decimal.touchTarget<=200,'Carré 100 décimal doit pouvoir dépasser une unité à partir de 0,5');
  touch.presentationIds=['square-9'];touch.contentIds=['fraction-of'];touch.touchInteraction='fill';assert.equal(context.window.MathRushExercises.createSoloExercise('fractions',2,rand,shuffle,'solo').touchMode,'fill','mode tactile remplir non configurable');touch.touchInteraction='read';assert.equal(context.window.MathRushExercises.createSoloExercise('fractions',2,rand,shuffle,'solo').touchMode,'read','mode tactile prérempli non configurable');touch.touchInteraction='random';
  // Un modèle tactile accepte également un nombre ou une opération simple sans changer son renderer.
  for(const presentation of ['square-100','square-bar','pie-chart','square-9']){
    touch.presentationIds=[presentation];touch.contentIds=['basic-operation'];
    const ex=context.window.MathRushExercises.createSoloExercise('quick',2,rand,shuffle,'solo');
    assert.equal(ex.type,'touchModel');assert.equal(ex.presentationId,presentation);assert.ok(ex.contentLabel.match(/^\d+ [ +−×] \d+$/),'le modèle doit pouvoir afficher une opération');assert.ok(ex.ans>=1&&ex.ans<=(presentation==='square-100'?200:presentation==='square-bar'?20:8));
    const m=ex.contentLabel.match(/^(\d+) ([+−×]) (\d+)$/),a=Number(m[1]),b=Number(m[3]),expected=m[2]==='+'?a+b:m[2]==='−'?a-b:a*b;assert.equal(ex.ans,expected,'le résultat de l’opération affichée doit correspondre au remplissage');
  }
  modelCatalog.forEach((model,index)=>{model.weight=weights[index];});
  touch.presentationIds=['square-100','square-bar','pie-chart','square-9'];touch.contentIds=['fraction-of','fraction-equivalence','fraction-operation','decimal-value','percentage-of','ratio-proportion','number-value','basic-operation','multi-step-operation','multiplication-product','exact-division','power-operation'];touch.touchInteraction='random';
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
assert.ok(appSource.includes('function touchModelHtml') && appSource.includes('bindTouchModel') && appSource.includes('touchModelHtml(exercise,false)'), 'adaptateur tactile solo/compétitif/Duo à gogo absent');
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

assert.ok(appSource.includes('const samePair=String(a.dataset.pair)===String(c.dataset.pair)') && appSource.includes('(samePair||sameValue)'), 'validation Duo à gogo insensible au formatage des réponses absente');
assert.ok(appSource.includes("const matchValue=exercise.mode==='coordinates'?`coord-${exercise.x}-${exercise.y}`:resultText"), 'clé Duo à gogo non alignée sur la réponse réellement affichée');
assert.ok(appSource.includes('function soloQuestionKey(ex)') && appSource.includes('soloSeenQuestionKeys=new Set()') && appSource.includes('attempt<35'), 'anti-répétition des questions du parcours solo absent');
assert.ok(appSource.includes('if (topStreak) topStreak.textContent = String(currentGlobalStreak)') && appSource.includes("$('journeyStreak').textContent = currentGlobalStreak"), 'synchronisation du compteur de flammes absente');
assert.ok(appSource.includes('points=Math.max(0,points-GAME_RULES.RESCUE_POINT_COST)') && appSource.includes('rescueActive=true') && appSource.includes('rescueCount++;persist()'), 'cycle de rattrapage (coût, nouvelle tentative, comptage) incomplet');

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
assert.ok(appSource.includes('count-blue-block') && appSource.includes("generated.type==='baseTen'"), 'rendu du modèle de comptage de blocs absent');
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

// Régressions : une case à compléter propose toujours la bonne valeur ; le curseur du niveau 1 reste simple.
for(let i=0;i<300;i++){
  const missing=context.window.MathRushExercises.createSoloExercise('quick',0,rand,shuffle,'solo');
  if(missing.type==='missingBox'){
    assert.ok(missing.prompt.includes('□'),'la case vide doit être visible');
    assert.ok(missing.opts.includes(missing.ans),'la valeur manquante doit être proposée');
  }
  if(missing.type==='commonSlider'){
    assert.ok(missing.ans>=0&&missing.ans<=20,'le curseur du premier palier doit rester dans une petite plage positive');
    assert.ok(!missing.expression.includes('×')||missing.expression.split('×').length===2,'le premier palier ne doit pas proposer trois facteurs');
  }
}
// Le camembert doit reprendre exactement le dénominateur de la fraction, et masquer le calcul si le visuel donne la réponse.
{
  const touch=modelCatalog.find(model=>model.id==='fraction-touch-models');
  const snapshot={weight:touch.weight,categoryIds:[...touch.categoryIds],modes:[...touch.modes],contentIds:[...touch.contentIds],presentationIds:[...touch.presentationIds],touchInteraction:touch.touchInteraction,design:{...(touch.design||{})}};
  modelCatalog.forEach(model=>{model.weight=model.id===touch.id?1:0;});
  touch.categoryIds=['fractions'];touch.modes=['fractions'];touch.contentIds=['fraction-operation'];touch.presentationIds=['pie-chart'];touch.touchInteraction='read';touch.design={pieParts:5};
  for(let i=0;i<250;i++){
    const ex=context.window.MathRushExercises.createSoloExercise('fractions',2,rand,shuffle,'solo');
    const denominator=Number(ex.contentLabel.match(/\/(\d+)/)?.[1]);
    assert.equal(ex.touchParts,denominator,'le camembert doit avoir le même nombre de parts que le dénominateur');
    assert.equal(ex.touchParts,5,'le camembert respecte le réglage à 5 parts');
    assert.ok(!ex.prompt.includes(ex.contentLabel),'le calcul ne doit pas être révélé quand le visuel suffit');
    assert.equal(ex.contentSlot,'hidden','le calcul est masqué au-dessus du camembert en mode lecture');
    assert.ok(ex.opts.includes(ex.ans),'la bonne réponse doit rester proposée');
  }
  touch.weight=snapshot.weight;touch.categoryIds=snapshot.categoryIds;touch.modes=snapshot.modes;touch.contentIds=snapshot.contentIds;touch.presentationIds=snapshot.presentationIds;touch.touchInteraction=snapshot.touchInteraction;touch.design=snapshot.design;
}

console.log('MathRush : tests réussis (7 000 exercices, progression, trophées, sélecteurs Défi/Multijoueur et écrans de fin).');

// Régression curseur mobile : aucun padding horizontal ne doit écraser le rail tactile.
const cssSource = require('fs').readFileSync(require('path').join(__dirname, '../assets/css/mathrush.css'), 'utf8');
assert(cssSource.includes('#solo input[type=range].range') && cssSource.includes('padding:0!important'), 'range tactile sans padding');
assert(appSource.includes('answerToastTimer=setTimeout(travel,3000)'), 'feedback visible 3000 ms');
assert(appSource.includes('1050ms cubic-bezier'), 'animation feedback prolongée');

assert.ok(fs.existsSync(`${__dirname}/../labo.html`), 'nouveau fichier Labo absent');
const labSource=fs.readFileSync(`${__dirname}/../labo.html`,'utf8');
assert.ok(appSource.includes('const correct=String(answer)')&&appSource.includes('shuffle([correct,...uniqueDistractors.slice(0,3)])'),'le Défi doit toujours conserver la bonne réponse');
assert.ok(appSource.includes('<svg class="touch-pie-segment-lines"')&&cssSource.includes('.touch-pie-segment-lines circle,.touch-pie-segment-lines line'),'séparations vectorielles du camembert absentes');

assert.ok(labSource.includes('id="modelList"') && labSource.includes('id="previewStage"'), 'bibliothèque visuelle des modèles absente');
assert.ok(labSource.includes('id="categoryChecks"') && labSource.includes('id="contentChecks"') && labSource.includes('id="playChecks"'), 'sélecteurs catégories/contenus/modes absents');
assert.ok(fs.readFileSync(`${__dirname}/../assets/js/exercises.js`,'utf8').includes('rules.playModes.includes(gameContext)'), 'les autorisations de modes du Labo ne sont pas appliquées au générateur');
assert.ok(labSource.includes('id="downloadJs"') && labSource.includes('id="downloadCss"') && labSource.includes('function exportJs()') && labSource.includes('function exportCss()'), 'export des réglages du Labo absent');
assert.ok(labSource.includes('preview-pie') && labSource.includes('preview-square') && labSource.includes('preview-nine') && labSource.includes('preview-tree') && labSource.includes('preview-table') && labSource.includes('preview-boxes'), 'aperçus visuels des modèles absents');
assert.ok(labSource.includes('customCss') && labSource.includes('separatorWidth') && labSource.includes('pieParts'), 'réglages de design du Labo absents');
assert.ok(!labSource.includes('localStorage.setItem') && !labSource.includes('localStorage.getItem'), 'le Labo ne doit pas utiliser le stockage navigateur');
assert.ok(fs.existsSync(`${__dirname}/../assets/js/custom-models.js`) && fs.existsSync(`${__dirname}/../assets/css/model-custom.css`), 'points d’intégration des personnalisations absents');
assert.ok(fs.readFileSync(`${__dirname}/../index.html`,'utf8').includes('assets/js/custom-models.js') && fs.readFileSync(`${__dirname}/../index.html`,'utf8').includes('assets/css/model-custom.css'), 'le jeu ne charge pas les fichiers personnalisés');
assert.ok(appSource.includes('soloRescuePanel') && appSource.includes('Ta partie est en pause') && !appSource.includes('fb.innerHTML+=`<div class="streak-rescue"'), 'panneau de rattrapage séparé ou feedback neutre absent');
assert.ok(appSource.includes('RESCUE_MIN_STREAK') && appSource.includes('rescueStreakBtn') && appSource.includes('currentGlobalStreak'), 'rattrapage de série global absent');
assert.equal(context.window.MathRushConfig.GAME_RULES.RESCUE_MIN_STREAK,20);
assert.equal(context.window.MathRushConfig.GAME_RULES.EXERCISES_PER_SESSION,15);
assert.equal(context.window.MathRushConfig.GAME_RULES.POINTS_CORRECT_ANSWER,100);
assert.equal(context.window.MathRushConfig.GAME_RULES.NEAR_ANSWER_BASE_POINTS,60);
assert.equal(context.window.MathRushConfig.GAME_RULES.RESCUE_POINT_COST,50);
assert.equal(context.window.MathRushConfig.GAME_RULES.SPEED_BONUS_MAX,50);
assert.ok(cssSource.includes('max-width:205px') && cssSource.includes('width:min(100%,130px)'), 'réduction du graphique de coordonnées absente');
