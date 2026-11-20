# Drôle de Quizz — projet modulaire

## Organisation
- `index.html` : site statique à publier sur GitHub Pages.
- `assets/js/game.js` : moteur existant et règles du jeu, avec commentaires par zones.
- `assets/js/game-config.js` : valeurs stratégiques centralisées.
- `assets/js/player-profile.js` / `assets/css/player-profile.css` : profil évolué fourni.
- `assets/js/settings.js` : paramètres et thème clair/sombre.
- `assets/js/ai-questions.js` : génération IA via le serveur.
- `assets/js/voice.js` : enregistrement, voix personnalisée, lecture et verrouillage des réponses.
- `assets/js/auth.js` : authentification Supabase et sauvegarde initiale du profil.
- `server/` : API Node pour OpenAI et ElevenLabs.
- `supabase/schema.sql` : table de profil protégée par RLS.

## Paramètres à modifier
`assets/js/game-config.js` contient `questions`, `onlineQuestions`, `pointsPerCorrectAnswer`, `answerTimeSeconds`, `voiceEnabled`, `topSignalEnabled` et `theme`. Le panneau ⚙️ permet de modifier les préférences locales. Le temps de réponse commence après l'énoncé et le signal vocal ; `0` signifie illimité.

## A. GitHub Pages
Décompresser le ZIP puis publier `index.html` et `assets/` à la racine du dépôt GitHub Pages. Le site doit conserver cette arborescence.

## B. Supabase (comptes)
1. Créer un projet sur https://supabase.com/.
2. Exécuter `supabase/schema.sql` dans SQL Editor.
3. Dans Project Settings → API, copier l'URL et la clé `anon`/publishable.
4. Renseigner `SUPABASE_CONFIG` dans `assets/js/config.js`.
5. Dans Authentication → URL Configuration, autoriser l'URL de ton GitHub Pages.
6. Le profil local reste accessible sans compte ; une connexion synchronise les données principales dans `player_profiles`.
Ne jamais exposer la clé `service_role`.

## C. Backend Node (Render, Railway ou équivalent)
1. Créer un service Node avec `server/` comme dossier racine.
2. Commande d'installation : `npm install`. Commande de démarrage : `npm start`.
3. Copier `server/.env.example` vers `.env` en local ou saisir les variables dans le panneau secret du fournisseur :
   - `OPENAI_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `FRONTEND_ORIGIN` = URL GitHub Pages exacte
   - `OPENAI_MODEL` (par défaut `gpt-4o-mini`)
4. Déployer puis tester `https://TON-BACKEND/api/health`.
5. Modifier `window.API_BASE_URL` dans `assets/js/config.js` avec l'URL HTTPS du backend.

## D. Voix personnalisée
Dans les paramètres, enregistrer 30 à 60 secondes de sa propre voix, puis terminer l'enregistrement. Le serveur transmet l'échantillon à ElevenLabs pour créer une voix ; l'identifiant vocal est conservé sur l'appareil. Au lancement d'un salon, l'hôte partage cet identifiant aux participants pour qu'ils entendent la même voix. La disponibilité du clonage dépend de l'offre fournisseur. L'échantillon vocal est une donnée personnelle : obtenir le consentement explicite, limiter la conservation et prévoir sa suppression.

## E. Tests
Tester compte/connexion, génération IA, enregistrement vocal, lecture sur deux appareils, déverrouillage des réponses après le « Top », timer, duel local et multijoueur PeerJS sur deux réseaux différents.

## Sécurité et évolutions avant ouverture publique
Les routes IA/voix sont protégées par limitation de débit mais cette première version ne lie pas encore chaque appel à un utilisateur Supabase authentifié. Avant une ouverture publique, ajouter validation du JWT côté serveur, quotas et budgets par utilisateur, journalisation du consentement vocal et suppression des voix à la demande. Les historiques complets de parties ne sont pas encore synchronisés dans le cloud.
