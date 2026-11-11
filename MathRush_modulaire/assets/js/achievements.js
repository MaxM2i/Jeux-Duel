/* MathRush — trophées calculés à partir de statistiques persistées. */
(() => {
  'use strict';
  const DEFINITIONS = [
    { id: 'first-lesson', title: 'Première leçon', icon: '🎓', description: 'Terminer une première leçon.', test: s => s.soloLessons >= 1 },
    { id: 'precision', title: 'Tireur de précision', icon: '🎯', description: 'Obtenir 90 % ou plus dans une leçon.', test: s => s.highScoreLessons >= 1 },
    { id: 'points-500', title: '500 points', icon: '⭐', description: 'Cumuler 500 points.', test: s => s.points >= 500 },
    { id: 'points-5000', title: 'Collectionneur', icon: '💎', description: 'Cumuler 5 000 points.', test: s => s.points >= 5000 },
    { id: 'pairs-10', title: 'As des paires', icon: '🧩', description: 'Trouver 10 paires dans Duo à gogo.', test: s => s.gogoBest >= 10 },
    { id: 'explorer', title: 'Explorateur', icon: '🚀', description: 'Débloquer le niveau 6 ou une nouvelle section.', test: s => s.section > 1 || s.level > 5 },
    { id: 'streak-10', title: 'En feu', icon: '🔥', description: 'Enchaîner 10 bonnes réponses.', test: s => s.bestStreak >= 10 },
    ...['quick', 'complex', 'rounding', 'coordinates', 'percentages'].map(mode => ({
      id: `specialist-${mode}`, title: `Spécialiste ${({quick:'calcul',complex:'calcul complexe',rounding:'arrondis',coordinates:'coordonnées',percentages:'pourcentages'})[mode]}`,
      icon: '🏅', description: 'Répondre correctement à 20 exercices de cette famille.',
      test: s => (s.modeStats?.[mode]?.correct || 0) >= 20
    })),
    ...['quick', 'complex', 'rounding', 'coordinates', 'percentages'].map(mode => ({
      id: `accurate-${mode}`, title: `Œil de lynx · ${mode}`, icon: '🦉',
      description: 'Atteindre au moins 80 % de réussite sur 20 exercices de cette famille.',
      test: s => {
        const stat = s.modeStats?.[mode] || {};
        return (stat.played || 0) >= 20 && stat.correct / stat.played >= .8;
      }
    }))
  ];
  function getUnlocked(stats) { return DEFINITIONS.filter(item => item.test(stats)); }
  window.MathRushAchievements = Object.freeze({ getUnlocked, definitions: DEFINITIONS });
})();
