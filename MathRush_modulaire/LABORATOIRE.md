# Laboratoire d'exercices MathRush

Ouvre `exercise-lab.html` depuis la racine du projet. Le laboratoire utilise les mêmes générateurs que le jeu et permet de choisir le mode de calcul, le niveau et le mode de jeu (solo, Défi, Multijoueur ou Duo à gogo).

## Catalogue des modèles

Le catalogue de `assets/js/config.js` décrit chaque modèle :
- `modes` : modes de calcul compatibles (calculs rapides, arrondis, PPCM/PGCD, etc.) ;
- `playModes` : modes de jeu où le modèle peut apparaître (`solo`, `duel`, `multiplayer`, `gogo`) ;
- `weight` : poids relatif de tirage parmi les modèles compatibles ;
- `difficultyMin` / `difficultyMax` : niveaux autorisés (0 à 6) ;
- `numberMin` / `numberMax` : plage de nombres visée par le modèle ;
- `enabled` : activation globale.

Le labo affiche une estimation de fréquence relative selon le niveau sélectionné. Modifie un modèle, désactive-le, change ses modes ou duplique-le pour créer une variante. Le champ `type` choisit un générateur déjà pris en charge (`factorTree`, `ppcmChoice`, `pgcdChoice`, `roundingTable`, `baseTen`, `missingBox`, `commonSlider`, etc.). Pour inventer un type d'exercice entièrement nouveau, il faut aussi écrire son générateur dans `assets/js/exercises.js` et son affichage/validation dans `assets/js/app.js`.

Clique sur **Générer le code du catalogue**, puis remplace le bloc `const EXERCISE_MODELS = [...]` dans `assets/js/config.js` par le code exporté. Aucun réglage du labo n'est conservé dans le navigateur.

## Curseur

Règle les bornes, la position initiale, le pas, les couleurs, l'épaisseur, la taille et les repères. Les valeurs non nulles et négatives sont acceptées. Le code du curseur s'intègre séparément dans `assets/js/config.js`, à la place de `const CURSOR_MODEL = null;`.

Les essais du laboratoire ne modifient ni les scores ni la progression. Les réglages ne deviennent actifs dans le jeu qu'après intégration du code source et publication du projet.
