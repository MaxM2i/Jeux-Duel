/* MathRush — catalogue centralisé des modes et réglages.
   Pour ajouter un mode : ajouter une entrée à MODES, puis son générateur dans exercises.js. */
(() => {
  'use strict';

  // Règles du jeu regroupées ici : modifie ces valeurs pour équilibrer MathRush sans fouiller app.js.
  const GAME_RULES = Object.freeze({
    EXERCISES_PER_SESSION: 15,
    LEVELS_PER_SECTION: 15,
    SECTIONS: 15,
    HIGH_SCORE_MIN_CORRECT: 14,
    POINTS_CORRECT_ANSWER: 100,
    NEAR_ANSWER_BASE_POINTS: 60,
    NEAR_ANSWER_BONUS_MAX: 25,
    POINTS_FIRST_CORRECT_BONUS: 50,
    DUEL_ROUNDS: 10,
    MULTIPLAYER_ROUNDS: 10,
    GOGO_REMAINING_SECOND_BONUS: 10,
    STREAK_BONUS_PER_ANSWER: 5,
    STREAK_BONUS_CAP: 40,
    RESCUE_MIN_STREAK: 20,
    RESCUE_POINT_COST: 50,
    RESCUE_AD_ENABLED: false,
    SPEED_BONUS_MAX: 50,
    SPEED_BONUS_PER_SECOND: 5,
    SPEED_STAR_THRESHOLDS_SECONDS: [2, 4, 6, 8, 10]
  });

  // Architecture indépendante : catégorie mathématique -> contenu généré -> présentation.
  // Les identifiants restent stables pour le laboratoire, les variantes et les exports.
  const MATH_CATEGORIES = [
    {id:'quick',label:'Calculs rapides'}, {id:'complex',label:'Calculs complexes'},
    {id:'rounding',label:'Arrondis'}, {id:'coordinates',label:'Coordonnées'},
    {id:'percentages',label:'Pourcentages'}, {id:'common-multiples',label:'PPCM / PGCD'},
    {id:'multiplication-division',label:'Multiplication et division'}
  ];
  const CONTENT_GENERATORS = [
    {id:'basic-operation',label:'Opération simple',categories:['quick','multiplication-division']},
    {id:'multi-step-operation',label:'Calcul à plusieurs étapes',categories:['complex']},
    {id:'rounded-number',label:'Nombre ou calcul à arrondir',categories:['rounding']},
    {id:'point-read',label:'Lire les coordonnées',categories:['coordinates']},
    {id:'point-place',label:'Placer un point',categories:['coordinates']},
    {id:'segment-distance',label:'Segments et distances',categories:['coordinates']},
    {id:'percentage-of',label:'Calculer un pourcentage',categories:['percentages']},
    {id:'ratio-proportion',label:'Rapport et proportion',categories:['percentages']},
    {id:'common-multiple',label:'PPCM',categories:['common-multiples']},
    {id:'common-divisor',label:'PGCD',categories:['common-multiples']},
    {id:'multiplication-product',label:'Produit',categories:['multiplication-division','quick']},
    {id:'exact-division',label:'Division exacte',categories:['multiplication-division','quick']},
    {id:'factor-decomposition',label:'Décomposition en facteurs',categories:['common-multiples','multiplication-division']},
    {id:'equivalent-expression',label:'Expression équivalente',categories:['quick','complex','multiplication-division']},
    {id:'missing-elements',label:'Éléments manquants',categories:['quick','complex','rounding','percentages','multiplication-division','common-multiples']}
  ];
  const PRESENTATION_MODELS = [
    {id:'choice',label:'Choix de réponses'}, {id:'cursor',label:'Curseur / règle graduée'},
    {id:'table',label:'Tableau'}, {id:'boxes',label:'Cases à compléter'},
    {id:'missing-boxes',label:'Cases à trous'}, {id:'equivalent',label:'Expressions équivalentes'},
    {id:'blue-blocks',label:'Blocs bleus'}, {id:'blue-white-grid',label:'Grille bleue et blanche'},
    {id:'symbols',label:'Symboles'}, {id:'factor-tree',label:'Arbre de décomposition'},
    {id:'coordinate-grid',label:'Repère graphique'}, {id:'vertical-operation',label:'Opération posée'},
    {id:'horizontal-operation',label:'Opération horizontale'}, {id:'model-grid',label:'Modèle à compléter'}
  ];
  const PRESENTATION_COMPATIBILITY = {
    'basic-operation':['choice','cursor','table','boxes','missing-boxes','horizontal-operation','vertical-operation'],
    'multi-step-operation':['choice','table','boxes','missing-boxes','horizontal-operation','vertical-operation'],
    'rounded-number':['choice','cursor','table','boxes','missing-boxes','blue-blocks'],
    'point-read':['choice','coordinate-grid','boxes'], 'point-place':['coordinate-grid','cursor'],
    'segment-distance':['coordinate-grid','boxes','choice'],
    'percentage-of':['choice','cursor','table','boxes','missing-boxes','blue-blocks','blue-white-grid','symbols'],
    'ratio-proportion':['table','boxes','blue-blocks','blue-white-grid','symbols','model-grid'],
    'common-multiple':['choice','cursor','table','boxes','missing-boxes','factor-tree'],
    'common-divisor':['choice','cursor','table','boxes','missing-boxes','factor-tree'],
    'multiplication-product':['choice','cursor','table','boxes','missing-boxes','factor-tree','vertical-operation'],
    'exact-division':['choice','cursor','table','boxes','missing-boxes','factor-tree','vertical-operation'],
    'factor-decomposition':['factor-tree','boxes','table'],
    'equivalent-expression':['choice','equivalent','boxes','table'],
    'missing-elements':['boxes','missing-boxes','table','cursor','equivalent']
  };

  // Catalogue pilotable depuis exercise-lab.html. Les poids sont relatifs entre modèles compatibles.
  // Les plages de nombres sont des bornes inclusives ; les niveaux vont de 0 à 6.
  const EXERCISE_MODELS = [
    { id:'quick-calculation', label:'Calcul mental classique', type:'choice', modes:['quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:7, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:10000, description:'Additions, soustractions et multiplications.' , categoryIds:["quick", "multiplication-division"], contentIds:["basic-operation"], presentationIds:["choice", "cursor", "table", "boxes", "missing-boxes"]},
    { id:'complex-calculation', label:'Calcul en plusieurs étapes', type:'choice', modes:['complex','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:1, difficultyMax:6, numberMin:2, numberMax:10000, description:'Respect des priorités opératoires.' , categoryIds:["complex"], contentIds:["multi-step-operation"], presentationIds:["choice", "table", "boxes", "missing-boxes"]},
    { id:'cursor-number-line', label:'Curseur sur règle graduée', type:'commonSlider', modes:['quick','rounding','common-multiples','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:0, difficultyMax:6, numberMin:-1000, numberMax:10000, description:'Placer une valeur sur une droite avec bornes et repères.' , categoryIds:["quick", "rounding", "common-multiples"], contentIds:["basic-operation", "rounded-number", "common-multiple"], presentationIds:["cursor"]},
    { id:'rounding-choice', label:'Arrondi simple', type:'round', modes:['rounding','quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:10, numberMax:100000, description:'Arrondir à la dizaine, centaine ou au millier.' , categoryIds:["rounding"], contentIds:["rounded-number"], presentationIds:["choice", "cursor"]},
    { id:'rounding-table', label:'Tableau d’arrondis', type:'roundingTable', modes:['rounding','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:10, numberMax:100000, description:'Compléter la dernière case d’un tableau de calculs arrondis.' , categoryIds:["rounding"], contentIds:["rounded-number"], presentationIds:["table"]},
    { id:'factor-tree', label:'Arbre de décomposition', type:'factorTree', modes:['quick','common-multiples','multiplication-division','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:12, numberMax:5000, description:'Décomposer un nombre en facteurs et sous-facteurs.' , categoryIds:["quick", "common-multiples", "multiplication-division"], contentIds:["factor-decomposition"], presentationIds:["factor-tree"]},
    { id:'ppcm-choice', label:'PPCM — choix multiple', type:'ppcmChoice', modes:['common-multiples','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:4, difficultyMin:1, difficultyMax:6, numberMin:2, numberMax:30, description:'Trouver le plus petit commun multiple.' , categoryIds:["common-multiples"], contentIds:["common-multiple"], presentationIds:["choice"]},
    { id:'base-ten-blocks', label:'Associer un nombre à ses blocs bleus', type:'baseTen', modes:['quick','rounding','mixed'], playModes:['solo','duel','multiplayer'], enabled:true, weight:3, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:30, description:'Un nombre cible et deux propositions visuelles : choisir celle qui contient exactement autant de blocs bleus.' , categoryIds:["quick", "rounding", "percentages"], contentIds:["basic-operation", "ratio-proportion"], presentationIds:["blue-blocks", "blue-white-grid"]},
    { id:'rounding-blocks', label:'Arrondi à la centaine avec blocs', type:'baseTenRounding', modes:['rounding','quick'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:100, numberMax:999, description:'Arrondir un nombre à la centaine avec une représentation en blocs.' , categoryIds:["rounding"], contentIds:["rounded-number"], presentationIds:["blue-blocks"]},
    { id:'missing-boxes', label:'Cases à compléter', type:'missingBox', modes:['quick','multiplication-division','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:10000, description:'Retrouver un facteur ou un terme manquant.' , categoryIds:["quick", "complex", "rounding", "percentages", "multiplication-division"], contentIds:["missing-elements"], presentationIds:["boxes", "missing-boxes"]},
    { id:'coordinates-grid', label:'Repère de coordonnées', type:'coordinates', modes:['coordinates','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:20, description:'Lire les coordonnées d’un point.' , categoryIds:["coordinates"], contentIds:["point-read", "point-place", "segment-distance"], presentationIds:["coordinate-grid"]},
    { id:'percent-model', label:'Modèle de pourcentage', type:'percent', modes:['percentages','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:10000, description:'Calculer une fraction d’une quantité.' , categoryIds:["percentages"], contentIds:["percentage-of", "ratio-proportion"], presentationIds:["choice", "table", "blue-blocks", "blue-white-grid", "symbols"]},
    { id:'common-divisors', label:'PGCD / diviseurs communs', type:'pgcdChoice', modes:['common-multiples','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:2, numberMax:30, description:'Trouver le plus grand diviseur commun.' , categoryIds:["common-multiples"], contentIds:["common-divisor"], presentationIds:["choice", "factor-tree"]},
    { id:'multiplication-division', label:'Multiplication / division', type:'choice', modes:['multiplication-division','quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:1000, description:'Produits et divisions exactes.' , categoryIds:["multiplication-division", "quick"], contentIds:["multiplication-product", "exact-division"], presentationIds:["choice", "vertical-operation", "horizontal-operation"]},
    { id:'number-pattern', label:'Suite logique', type:'pattern', modes:['quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:1000, description:'Trouver le terme suivant d’une suite.' , categoryIds:["quick", "complex"], contentIds:["basic-operation"], presentationIds:["model-grid", "boxes"]},
    { id:'number-model', label:'Modèle à compléter', type:'model', modes:['quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:1000, description:'Reproduire une transformation numérique.' , categoryIds:["quick", "complex"], contentIds:["basic-operation", "equivalent-expression"], presentationIds:["model-grid", "boxes"]},
    { id:'factor-gap', label:'Facteurs manquants', type:'factors', modes:['common-multiples','multiplication-division'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:1000, description:'Retrouver un facteur dans un produit.' , categoryIds:["quick", "common-multiples", "multiplication-division"], contentIds:["factor-decomposition", "missing-elements"], presentationIds:["factor-tree", "boxes"]},
    { id:'equation-target', label:'Expression équivalente', type:'equation', modes:['complex','quick'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:1000, description:'Choisir une expression qui atteint une cible.' , categoryIds:["quick", "complex", "multiplication-division"], contentIds:["equivalent-expression"], presentationIds:["equivalent", "choice"]}
  ];

  // Modèle de curseur actif : remplace cet objet par le code exporté depuis exercise-lab.html.
  // null = conserver les bornes, repères et couleurs définis par chaque générateur.
  const CURSOR_MODEL = null;

  const MODES = [
    { id: 'quick', label: 'Calculs rapides', mark: '+', description: 'Additions, soustractions et multiplications', family: 'calcul' },
    { id: 'complex', label: 'Calculs complexes', mark: '×+', description: 'Opérations en plusieurs étapes', family: 'calcul' },
    { id: 'rounding', label: 'Calculs arrondis', mark: '≈', description: 'Dizaines et centaines', family: 'nombres' },
    { id: 'coordinates', label: 'Placer les coordonnées', mark: 'x,y', description: 'Lire un point sur un repère', family: 'géométrie' },
    { id: 'percentages', label: 'Pourcentages', mark: '%', description: 'Calculer une part', family: 'proportionnalité' },
    { id: 'common-multiples', label: 'PPCM / PGCD', mark: '÷', description: 'Multiples et diviseurs communs', family: 'arithmétique' },
    { id: 'multiplication-division', label: 'Multiplication / division', mark: '×÷', description: 'Maîtriser les produits et les partages', family: 'calcul' },
    { id: 'mixed', label: 'Tout mélangé', mark: '?', description: 'Un exercice différent à chaque question', family: 'mixte' }
  ];

  // Un profil par palier. Les bornes sont volontairement lisibles et modifiables.
  const DIFFICULTY = [
    { name: 'Découverte', operations: ['+', '×'], maxAdd: 20, tables: [2, 3, 4, 5, 10], maxFactor: 5, complexA: [3, 8], complexB: [2, 5], complexC: [2, 10], roundingUnits: [10], coordinateMax: 4, percentages: [10, 50], bases: [20, 40, 60, 80, 100] },
    { name: 'Facile', operations: ['+', '×'], maxAdd: 50, tables: [2, 3, 4, 5, 10], maxFactor: 8, complexA: [3, 10], complexB: [2, 7], complexC: [2, 15], roundingUnits: [10], coordinateMax: 6, percentages: [5, 10, 25, 50], bases: [20, 40, 60, 80, 100, 200] },
    { name: 'Intermédiaire', operations: ['+', '−', '×'], maxAdd: 100, tables: [2, 3, 4, 5, 6, 8, 10], maxFactor: 10, complexA: [4, 12], complexB: [2, 9], complexC: [2, 20], roundingUnits: [10, 100], coordinateMax: 8, percentages: [5, 10, 20, 25, 50], bases: [20, 40, 60, 80, 100, 200] },
    { name: 'Confirmé', operations: ['+', '−', '×'], maxAdd: 500, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12], maxFactor: 12, complexA: [5, 15], complexB: [2, 10], complexC: [5, 30], roundingUnits: [10, 100], coordinateMax: 10, percentages: [5, 10, 15, 20, 25, 50, 75], bases: [40, 60, 80, 100, 200, 400] },
    { name: 'Avancé', operations: ['+', '−', '×'], maxAdd: 1500, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15], maxFactor: 15, complexA: [8, 18], complexB: [3, 12], complexC: [10, 50], roundingUnits: [10, 100, 1000], coordinateMax: 12, percentages: [5, 10, 12, 15, 20, 25, 30, 50, 75], bases: [50, 80, 100, 200, 400, 800] },
    { name: 'Expert', operations: ['+', '−', '×'], maxAdd: 5000, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25], maxFactor: 20, complexA: [10, 25], complexB: [4, 15], complexC: [20, 100], roundingUnits: [10, 100, 1000], coordinateMax: 20, percentages: [5, 10, 12, 15, 20, 25, 30, 40, 50, 75], bases: [100, 200, 400, 800, 1000] },
    { name: 'Maître', operations: ['+', '−', '×'], maxAdd: 10000, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25], maxFactor: 30, complexA: [12, 30], complexB: [5, 18], complexC: [30, 150], roundingUnits: [10, 100, 1000], coordinateMax: 20, percentages: [1, 5, 10, 12, 15, 20, 25, 30, 40, 50, 75], bases: [100, 200, 400, 800, 1000, 2000] }
  ];

  const TRACK_STEPS = [
    { title: 'Découverte', description: 'Comprendre les bases et prendre confiance' },
    { title: 'Entraînement', description: 'Répéter les méthodes et gagner en régularité' },
    { title: 'Défi', description: 'Résoudre des exercices plus exigeants' }
  ];

  window.MathRushConfig = Object.freeze({ MODES, DIFFICULTY, TRACK_STEPS, GAME_RULES, EXERCISE_MODELS, MATH_CATEGORIES, CONTENT_GENERATORS, PRESENTATION_MODELS, PRESENTATION_COMPATIBILITY, CURSOR_MODEL, EXERCISES_PER_LEVEL: GAME_RULES.EXERCISES_PER_SESSION, LEVELS_PER_SECTION: GAME_RULES.LEVELS_PER_SECTION, SECTIONS: GAME_RULES.SECTIONS });
})();
