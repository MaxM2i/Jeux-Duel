/* Paramètres du jeu : édition provisoire, sauvegarde explicite et retour arrière sécurisé. */
(() => {
 const $ = id => document.getElementById(id);
 const config = window.QuizConfig;
 const fields = ['themeMode','defaultQuestionCount','defaultTimeLimit','voiceEnabled','topSignalEnabled'];

 // Valeurs réellement enregistrées, conservées pendant toute la session d'édition.
 let savedSnapshot = null;

 function snapshotFromConfig() {
   return {
     theme: config.theme,
     questions: config.questions,
     answerTimeSeconds: config.answerTimeSeconds,
     pointsPerCorrectAnswer: config.pointsPerCorrectAnswer,
     voiceEnabled: config.voiceEnabled,
     topSignalEnabled: config.topSignalEnabled
   };
 }

 function applyTheme(value) {
   const dark = value === 'dark' ||
     (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
   document.documentElement.dataset.theme = dark ? 'dark' : 'light';
 }

 function readDraft() {
   return {
     theme: $('themeMode').value,
     questions: Math.min(50, Math.max(5, Number($('defaultQuestionCount').value) || 15)),
     answerTimeSeconds: Math.min(180, Math.max(0, Number($('defaultTimeLimit').value) || 0)),
     // La valeur de points reste conservée en arrière-plan, le contrôle est temporairement masqué.
     pointsPerCorrectAnswer: savedSnapshot.pointsPerCorrectAnswer,
     voiceEnabled: $('voiceEnabled').checked,
     topSignalEnabled: $('topSignalEnabled').checked
   };
 }

 function fillForm(values) {
   $('themeMode').value = values.theme;
   $('defaultQuestionCount').value = values.questions;
   $('defaultTimeLimit').value = values.answerTimeSeconds;
   $('defaultPoints').value = values.pointsPerCorrectAnswer;
   $('voiceEnabled').checked = values.voiceEnabled;
   $('topSignalEnabled').checked = values.topSignalEnabled;
   applyTheme(values.theme);
 }

 function isDirty() {
   if (!savedSnapshot) return false;
   return JSON.stringify(readDraft()) !== JSON.stringify(savedSnapshot);
 }

 function open() {
   savedSnapshot = snapshotFromConfig();
   fillForm(savedSnapshot);
   $('settingsStatus').textContent = '';
   document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
   $('settingsScreen').classList.add('active');
   window.scrollTo(0, 0);
 }

 function beforeHome() {
   if (!isDirty()) {
     // Même sans changement, réappliquer le thème sauvegardé et nettoyer le formulaire.
     fillForm(savedSnapshot || snapshotFromConfig());
     return true;
   }
   const abandon = window.confirm(
     'Tu as des paramètres non enregistrés.\\n\\nAbandonner les modifications et revenir au menu ?'
   );
   if (!abandon) return false;

   // On restaure intégralement les valeurs précédemment enregistrées.
   fillForm(savedSnapshot);
   $('settingsStatus').textContent = '';
   return true;
 }

 $('openSettings').addEventListener('click', open);
 $('themeMode').addEventListener('change', event => applyTheme(event.target.value));

 $('saveSettings').addEventListener('click', () => {
   const draft = readDraft();
   config.save(draft);
   savedSnapshot = snapshotFromConfig();
   fillForm(savedSnapshot);
   $('settingsStatus').textContent = 'Paramètres enregistrés sur cet appareil.';
 });

 // Chargement initial du thème et des valeurs sauvegardées.
 savedSnapshot = snapshotFromConfig();
 fillForm(savedSnapshot);

 window.QuizSettings = { beforeHome, isDirty, open };
})();