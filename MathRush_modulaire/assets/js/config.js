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
  // Catalogue pilotable depuis exercise-lab.html. Les poids sont relatifs entre modèles compatibles.
  // Les plages de nombres sont des bornes inclusives ; les niveaux vont de 0 à 6.
  const EXERCISE_MODELS = [
    { id:'quick-calculation', label:'Calcul mental classique', type:'choice', modes:['quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:7, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:10000, description:'Additions, soustractions et multiplications.' },
    { id:'complex-calculation', label:'Calcul en plusieurs étapes', type:'choice', modes:['complex','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:1, difficultyMax:6, numberMin:2, numberMax:10000, description:'Respect des priorités opératoires.' },
    { id:'cursor-number-line', label:'Curseur sur règle graduée', type:'commonSlider', modes:['quick','rounding','common-multiples','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:0, difficultyMax:6, numberMin:-1000, numberMax:10000, description:'Placer une valeur sur une droite avec bornes et repères.' },
    { id:'rounding-choice', label:'Arrondi simple', type:'round', modes:['rounding','quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:10, numberMax:100000, description:'Arrondir à la dizaine, centaine ou au millier.' },
    { id:'rounding-table', label:'Tableau d’arrondis', type:'roundingTable', modes:['rounding','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:10, numberMax:100000, description:'Compléter la dernière case d’un tableau de calculs arrondis.' },
    { id:'factor-tree', label:'Arbre de décomposition', type:'factorTree', modes:['quick','common-multiples','multiplication-division','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:12, numberMax:5000, description:'Décomposer un nombre en facteurs et sous-facteurs.' },
    { id:'ppcm-choice', label:'PPCM — choix multiple', type:'ppcmChoice', modes:['common-multiples','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:4, difficultyMin:1, difficultyMax:6, numberMin:2, numberMax:30, description:'Trouver le plus petit commun multiple.' },
    { id:'base-ten-blocks', label:'Associer un nombre à ses blocs bleus', type:'baseTen', modes:['quick','rounding','mixed'], playModes:['solo','duel','multiplayer'], enabled:true, weight:3, difficultyMin:0, difficultyMax:6, numberMin:0, numberMax:300, description:'Un nombre cible et deux propositions visuelles : unités, dizaines et centaines regroupées.' },
    { id:'rounding-blocks', label:'Arrondi à la centaine avec blocs', type:'baseTenRounding', modes:['rounding','quick'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:100, numberMax:999, description:'Arrondir un nombre à la centaine avec une représentation en blocs.' },
    { id:'missing-boxes', label:'Cases à compléter', type:'missingBox', modes:['quick','multiplication-division','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:10000, description:'Retrouver un facteur ou un terme manquant.' },
    { id:'coordinates-grid', label:'Repère de coordonnées', type:'coordinates', modes:['coordinates','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:20, description:'Lire les coordonnées d’un point.' },
    { id:'percent-model', label:'Modèle de pourcentage', type:'percent', modes:['percentages','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:10000, description:'Calculer une fraction d’une quantité.' },
    { id:'common-divisors', label:'PGCD / diviseurs communs', type:'pgcdChoice', modes:['common-multiples','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:3, difficultyMin:1, difficultyMax:6, numberMin:2, numberMax:30, description:'Trouver le plus grand diviseur commun.' },
    { id:'multiplication-division', label:'Multiplication / division', type:'choice', modes:['multiplication-division','quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:5, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:1000, description:'Produits et divisions exactes.' },
    { id:'number-pattern', label:'Suite logique', type:'pattern', modes:['quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:1000, description:'Trouver le terme suivant d’une suite.' },
    { id:'number-model', label:'Modèle à compléter', type:'model', modes:['quick','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:1, numberMax:1000, description:'Reproduire une transformation numérique.' },
    { id:'factor-gap', label:'Facteurs manquants', type:'factors', modes:['common-multiples','multiplication-division'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:1000, description:'Retrouver un facteur dans un produit.' },
    { id:'equation-target', label:'Expression équivalente', type:'equation', modes:['complex','quick'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:2, numberMax:1000, description:'Choisir une expression qui atteint une cible.' },
    { id:'flexible-template', label:'Modèle polyvalent à contenu variable', type:'flexTemplate', contentPatterns:['calculation','rounding','percentage','missingBox','equivalent','numberModel'], modes:['quick','rounding','percentages','multiplication-division','complex','mixed'], playModes:['solo','duel','multiplayer','gogo'], enabled:true, weight:2, difficultyMin:0, difficultyMax:6, numberMin:0, numberMax:10000, description:'Même structure de modèle, contenus variables selon la catégorie de calcul.' }
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

  window.MathRushConfig = Object.freeze({ MODES, DIFFICULTY, TRACK_STEPS, GAME_RULES, EXERCISE_MODELS, CURSOR_MODEL, EXERCISES_PER_LEVEL: GAME_RULES.EXERCISES_PER_SESSION, LEVELS_PER_SECTION: GAME_RULES.LEVELS_PER_SECTION, SECTIONS: GAME_RULES.SECTIONS });
})();
