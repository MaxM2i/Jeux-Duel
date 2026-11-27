# Labo MathRush — guide d'utilisation

Ouvrir `labo.html` à la racine du projet.

## Modifier un modèle

1. Sélectionner un modèle dans la bibliothèque visuelle.
2. Régler taille, disposition, couleurs, bordures, espacement, arrondis, séparateurs, ombres et CSS personnalisé.
3. Choisir les catégories, générateurs de contenu et modes de jeu autorisés.
4. Contrôler l'aperçu en direct.
5. Télécharger `custom-models.js` et `model-custom.css` depuis la zone d'enregistrement.

## Intégrer au jeu

Remplacer les deux fichiers correspondants dans le projet :

- `assets/js/custom-models.js`
- `assets/css/model-custom.css`

`index.html` charge déjà ces deux fichiers au démarrage. Il suffit donc de remplacer les fichiers, sans modifier `config.js` ni `app.js`.

Le fichier JSON est une sauvegarde lisible du catalogue édité.

## Modèles

Les modèles présents dans la bibliothèque principale disposent d'un renderer dans le jeu. La section « Modèles proposés » présente des pistes de nouveaux rendus (boulier, cadre de dix, droite numérique, bandes de fractions, numération, tableau de multiplication, modèle en aire, plan cartésien avancé). Ils sont signalés comme prototypes tant que leur renderer et leur validation de réponse ne sont pas implémentés.


## Combinaisons de contenus et arbres de décomposition

Le modèle `rounding-table` est maintenant un tableau polyvalent : son contenu est sélectionné selon la catégorie active (calculs rapides/complexes, arrondis, pourcentages, PPCM/PGCD, multiplications/divisions, exposants, fractions ou coordonnées). Dans le Labo, la présentation `Tableau` permet d'autoriser ou de retirer les catégories et générateurs compatibles. Les éléments recherchés se règlent avec les cases de réponses disponibles.

La présentation `Arbre de décomposition` expose trois variantes : multiplications, divisions et combinaison des deux. Le Labo règle la variante, le sens des flèches et le nœud masqué. Les exports JS/CSS du Labo doivent être copiés dans `assets/js/custom-models.js` et `assets/css/model-custom.css` pour être chargés au démarrage du jeu.
