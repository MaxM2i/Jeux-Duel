/* Personnalisations exportées depuis labo.html. Remplacer ce fichier pour intégrer les réglages du Labo. */
(() => {
  const cfg = window.MathRushConfig;
  if (!cfg) return;
  const custom = window.MathRushCustomModels || {};
  Object.assign(cfg.PRESENTATION_DESIGNS, custom.designs || {});
  Object.assign(cfg.PRESENTATION_RULES, custom.rules || {});
})();
