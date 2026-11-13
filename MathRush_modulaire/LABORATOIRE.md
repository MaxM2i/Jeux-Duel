# Laboratoire d'exercices et intégration du curseur

Ouvre `exercise-lab.html` depuis la racine du projet (ou depuis le site hébergé). Les essais et réglages restent temporaires dans la page : aucun modèle de curseur n'est écrit dans le stockage du navigateur.

## Intégrer un modèle de curseur

1. Dans le laboratoire, règle les bornes, le départ, le pas, l'apparence et les repères.
2. Clique sur **Générer le code d'intégration**, puis copie le bloc proposé.
3. Ouvre `assets/js/config.js`.
4. Remplace `const CURSOR_MODEL = null;` par le bloc généré (`const CURSOR_MODEL = Object.freeze({...});`).
5. Enregistre et publie le projet. Le parcours solo utilisera alors ce modèle pour les exercices à curseur.

Pour revenir aux curseurs natifs, remets `const CURSOR_MODEL = null;`.

Le modèle généré est du code source versionnable : il est donc intégré au projet et non à un navigateur ou à un appareil particulier.
