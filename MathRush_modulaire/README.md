# MathRush — version modulaire

## Structure

```text
MathRush_modulaire/
├── index.html
└── assets/
    ├── avatar/                 # Tes images d'avatar, non incluses dans l'archive
    ├── css/
    │   ├── mathrush.css        # Styles principaux
    │   └── player-profile.css  # Styles du profil
    └── js/
        ├── config.js           # Catalogue des modes et réglages de difficulté
        ├── exercises.js        # Génération des exercices solo
        ├── progression.js      # Étapes et progression par mode
        ├── achievements.js     # Définition des trophées
        ├── player-profile.js   # Gestion du profil et des avatars
        └── app.js              # Interface, orchestration, duel et multijoueur
```

## Ajouter un type d'exercice

1. Ajouter une entrée dans `MathRushConfig.MODES` dans `assets/js/config.js`.
2. Ajouter un cas dans `createSoloExercise()` dans `assets/js/exercises.js`.
3. Retourner un objet normalisé contenant au minimum :
   - `mode` : identifiant du mode ;
   - `type` : type d'affichage (`choice`, `round`, `coordinates`, `percent`, etc.) ;
   - `ans` : réponse attendue ;
   - `opts` : choix proposés si le type est à choix.
4. Ajouter son rendu dans `renderSolo()` dans `assets/js/app.js` si son type d'affichage est nouveau.
5. Ajouter au besoin ses trophées dans `assets/js/achievements.js`.

## Modifier la difficulté

Les 7 profils de difficulté sont centralisés dans `assets/js/config.js`, tableau `DIFFICULTY`.
Les valeurs `complexA`, `complexB`, `complexC`, `tables`, `maxFactor`, `roundingUnits`,
`coordinateMax`, `percentages` et `bases` contrôlent les générateurs.

La progression calcule un palier à partir de la section et du niveau dans
`assets/js/progression.js` (`difficultyFor`) et l'application appelle ce palier lors de
la création d'un exercice. Le réglage peut être changé sans réécrire les générateurs.

## Progression, statistiques et trophées

- Chaque mode possède maintenant sa propre progression : section, niveau et niveaux terminés.
- Les anciens joueurs sont migrés sans perdre leur progression : l'ancien parcours est repris dans « Tout mélangé ».
- Les autres modes démarrent au niveau 1.
- Chaque mode conserve ses statistiques jouées / réussies.
- Les étapes sont affichées en trois jalons : Découverte (1–5), Entraînement (6–10), Défi (11–15).
- Les trophées sont calculés depuis les statistiques et affichés dans le profil.

## Données et compatibilité

- Sauvegarde locale conservée dans `localStorage` (`mathrush_app_save`).
- Le profil et les avatars utilisent la clé existante `player_profile_v1`.
- Les fichiers d'avatar ne sont pas inclus : copie ton dossier `assets/avatar/` actuel dans ce projet.
- PeerJS est conservé pour les fonctionnalités réseau existantes et nécessite une connexion Internet.
- Cette version reste une application front-end : les sauvegardes restent sur l'appareil / navigateur, sans compte ni synchronisation serveur.

## Lancer et publier

Ouvrir `index.html` via un serveur local ou publier le contenu du dossier à la racine du dépôt GitHub Pages.
Évite d'ouvrir directement le fichier en `file://` pour tester les connexions PeerJS.

## Tests automatisés

Avec Node.js installé, exécuter `npm test` à la racine pour vérifier les générateurs, les jalons et les trophées.
