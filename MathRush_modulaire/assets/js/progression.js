/* MathRush — progression solo indépendante par famille d'exercices. */
(() => {
  'use strict';
  function getMilestones(modeId, track) {
    const steps = window.MathRushConfig.TRACK_STEPS;
    const section = Number(track.section) || 1;
    const level = Number(track.level) || 1;
    const done = new Set(track.done || []);
    return steps.map((step, index) => {
      const first = index * 5 + 1, last = first + 4;
      const completed = Array.from({ length: 5 }, (_, i) => done.has(`${section}-${first + i}`)).every(Boolean);
      return {
        number: index + 1,
        title: step.title,
        description: step.description,
        range: `Niveaux ${first} à ${last}`,
        done: completed,
        current: level >= first && level <= last
      };
    });
  }
  function difficultyFor(section, level) {
    // Niveau de base volontairement plus accessible dans tous les modes.
    return Math.max(0, Math.min(6, Math.floor(((level || 1) - 1) / 4) + Math.floor(((section || 1) - 1) / 6) - 1));
  }
  window.MathRushProgression = Object.freeze({ getMilestones, difficultyFor });
})();
