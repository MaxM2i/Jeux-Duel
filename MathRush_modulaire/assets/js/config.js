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

  window.MathRushConfig = Object.freeze({ MODES, DIFFICULTY, TRACK_STEPS, GAME_RULES, EXERCISES_PER_LEVEL: GAME_RULES.EXERCISES_PER_SESSION, LEVELS_PER_SECTION: GAME_RULES.LEVELS_PER_SECTION, SECTIONS: GAME_RULES.SECTIONS });
})();
