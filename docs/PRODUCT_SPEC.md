# Tatakae — Spécification produit (référence, texte du demandeur)

Note : la section 3 (cristaux) est absente du texte d'origine ; seul son contenu partiel (puces ci-dessous, sous « ## » vide) subsiste. Hypothèse retenue : cristaux = solde affiché, départ à 0, modèle portefeuille/historique extensible, aucune règle d'attribution, aucune boutique, fonctionnalité isolée. Les maquettes (`internal/refs/*.png`) montrent aussi un écran « Temps d'écran » (30 cristaux = 10 min) : NE PAS l'implémenter (pas de boutique/règle inventée, blocage sans paiement en cristaux).

Demande : tu es développeur senior mobile, product designer et ingénieur d'applications de productivité. Construis une application mobile fonctionnelle de concentration et de suivi des habitudes, identité RPG/anime originale. Utilisable au quotidien, données persistantes, interactions réelles, design soigné.

Les spécifications ci-dessous sont la référence produit. Les images jointes sont des références visuelles : leurs éventuelles incohérences de chiffres ou de disposition ne doivent pas être reproduites.

Le projet doit être versionné pour chaque étape par branche GitHub.

## 1. Façon de travailler

Par défaut :
- React Native avec Expo et TypeScript strict.
- Expo Router pour la navigation.
- SQLite pour les données persistantes.
- Composants et graphiques natifs adaptés à React Native.
- Un development build lorsque les fonctionnalités natives le nécessitent.

Vérifier les versions compatibles et les documentations officielles avant d'ajouter les dépendances. Éviter de multiplier les bibliothèques.

Commencer par résumer brièvement l'architecture, les hypothèses et les étapes. Puis implémenter réellement le produit. Ne pas attendre une validation pour chaque décision réversible.

Travailler par étapes vérifiables. Ne jamais prétendre qu'une fonctionnalité native fonctionne si elle est simulée ou non testée.

Interface en français. Code et types en anglais.

## 2. Concept et périmètre

L'application aide l'utilisateur à :
1. Choisir une tâche ou une habitude.
2. Lancer une session de concentration.
3. Réduire les distractions.
4. Enregistrer le temps réalisé.
5. Observer sa régularité et sa progression.

Univers : entraînement, quêtes, progression d'un personnage de manga/RPG. Illustrations et symboles originaux, sans reprendre personnages, logos ou éléments distinctifs d'une franchise.

Le temps de focus est la mesure principale : du temps chronométré, pas une preuve de travail effectif. La concentration est une appréciation facultative donnée par l'utilisateur.

MVP : sans compte, hors ligne, profil local. Pas de backend, de paiement, de publicité, de guilde, de classement, de coach IA.

## 3. Cristaux (section d'origine manquante — puces conservées)

- afficher le solde dans le bandeau ;
- commencer à zéro en utilisation réelle ;
- conserver un modèle de portefeuille et d'historique extensible ;
- ne pas inventer de boutique ni de règles d'attribution ;
- isoler cette fonctionnalité pour pouvoir la modifier ensuite.

Les soldes visibles dans les maquettes sont uniquement des exemples.

## 4. Direction artistique

Thème bleu des références :
- fond sombre, bleu nuit et noir ;
- bleu électrique comme couleur d'action ;
- texte blanc et gris bleuté ;
- paysage anime original sur toute la surface de l'écran ;
- panneaux sombres légèrement transparents ;
- contours fins, coins légèrement anguleux ;
- icônes cohérentes, typographie nette.

Aucun pixel art. Éviter halos excessifs, énormes badges, cadres épais, panneaux imbriqués, effets de verre trop marqués.

Le paysage reste derrière l'interface. Il ne doit jamais créer une grande zone décorative vide au-dessus du header ou entre le header et le calendrier.

Même paysage sur toutes les pages :
- Accueil et Profil : panneaux ~90 % opaques.
- Quêtes : panneaux presque opaques.
- Stats : fond uni dans les graphiques.
- Focus : paysage davantage assombri.

Respecter les safe areas et tailles réelles d'un téléphone. Prévoir le défilement plutôt que de réduire excessivement la typographie.

Les illustrations servent de fonds ou d'assets. Ne jamais transformer une capture complète de maquette en interface cliquable : textes, boutons, graphiques = vrais composants.

## 5. Navigation et bandeau permanent

Navigation principale : Accueil, Quêtes, Stats, Profil. Le Focus s'ouvre dans un écran dédié.

Un bandeau compact reste visible sur toutes les pages, y compris pendant le Focus.

Première ligne : petite photo modifiable ; pseudo ; niveau ; solde de cristaux.
Deuxième ligne : Aujourd'hui : temps de focus / objectif ; Semaine : temps de focus / objectif.

Cible : ~80–95 points de hauteur hors safe area, ajustable selon lisibilité.

Le bandeau reste fixe pendant le défilement. Il ne répète pas une grande illustration ou un titre de page.

La photo ouvre le profil. Les statistiques ouvrent la période correspondante.

Les statistiques du bandeau représentent toujours la date actuelle, même si une autre journée est sélectionnée dans le calendrier.

## 6. Accueil

Ordre exact :

### A. Bandeau permanent

### B. Calendrier de la semaine
Immédiatement sous le bandeau, espacement normal. Sept jours, lundi→dimanche. Chaque cellule : jour de semaine ; date ; score quotidien ; couleur associée.

Aujourd'hui sélectionné par défaut, identifiable par un contour. Un toucher sur une date change les quêtes et la répartition par catégorie en dessous. Permettre de consulter les autres semaines.

Score quotidien : `min(100, minutes de focus / objectif quotidien × 100)`. Arrondir uniquement à l'affichage.

Couleurs : 0–39 orange atténué ; 40–79 ambre ; 80–99 vert clair ; 100 vert soutenu.

Cas particuliers : aujourd'hui → score « en cours » ; jour futur → aucun score ; repos prévu → indicateur neutre ; aucun objectif défini → pas de score ; jour passé actif avec objectif mais aucune session → zéro.

La couleur ne doit jamais être le seul moyen de comprendre le résultat. Le score mesure l'atteinte de l'objectif de focus, pas la productivité réelle.

### C. Deux blocs côte à côte
Gauche : « Forme du moment ». Radar à quatre axes : Force, Endurance, Mental, Constance. Porte sur les 14 derniers jours, lié à la date actuelle, indépendant du jour sélectionné.

Droite : « Par catégorie ». Minutes de focus par catégorie pour le jour sélectionné : icône ; nom ; durée ; barre horizontale comparative. Échelle commune (pas des objectifs). Trois principales catégories, « Voir tout » si nécessaire. Inclure « Sans catégorie ».

Petits écrans ou grands textes : empiler les deux blocs plutôt que les rendre illisibles.

### D. Quêtes du jour sélectionné
Tâches et occurrences d'habitudes prévues : titre ; type ou catégorie ; validation ; action pour lancer une session. Courte liste puis « Voir toutes les quêtes ». Éléments terminés repliables. Bouton « Session libre ». Pas de tuiles reproduisant la navigation du footer.

## 7. Radar : règles transparentes

Calculs isolés dans des fonctions pures testables. Fenêtre : 14 derniers jours jusqu'à aujourd'hui.

- Force — concentration ressentie : note facultative 1–5 après chaque session. Score = moyenne des notes × 20. Session non notée ≠ zéro. Afficher le nombre de sessions notées. Avant trois évaluations : « Données insuffisantes ».
- Endurance — volume prévu réalisé : `min(100, temps de focus réalisé / somme des objectifs applicables × 100)`. Aujourd'hui : préciser « en cours ». Exclure jours futurs et jours sans objectif du dénominateur.
- Mental — sessions menées à terme : `sessions chronométrées terminées / sessions chronométrées clôturées × 100`. Exclure : sessions en cours, chronomètres libres, entrées corrigées manuellement. Conserver le motif d'un arrêt anticipé, sans message culpabilisant.
- Constance — rythme respecté : sur les jours passés dont un objectif était prévu : `jours ayant atteint l'objectif / jours prévus × 100`. Exclure repos, jours futurs, aujourd'hui tant qu'il n'est pas terminé.

Pour chaque axe : valeur réelle au toucher ; explication du calcul ; données insuffisantes traitées explicitement ; jamais de faux zéro pour une donnée absente. Si nécessaire, liste textuelle accessible en complément du radar.

## 8. Quêtes : tâches et habitudes

### Tâche ponctuelle
Champs : titre obligatoire ; catégorie facultative ; date facultative ; priorité ; statut ; date de réalisation. Reste ouverte jusqu'à validation explicite.

### Habitude
Champs : titre ; catégorie facultative ; jours prévus de la semaine ; rappel facultatif ; statut actif/archivé. Créer des occurrences distinctes par date. Valider une occurrence ne termine pas l'habitude. MVP : jours précis de la semaine, pas de règles de récurrence complexes.

Une session peut être liée à une tâche ou à une occurrence d'habitude. Terminer le timer ne coche pas automatiquement l'action.

Prévoir : création, modification, archivage ; vues Aujourd'hui et Toutes ; tâches sans date ; choix d'une mission prioritaire ; lancement du focus depuis une quête. Une session a au maximum une catégorie (pas de doubles comptes).

## 9. Pomodoro et sessions

Avant de commencer : sélectionner une quête (facultatif) ; une catégorie ; une durée (25 min par défaut) ou chronomètre libre ; activer le blocage si disponible et autorisé.

Pendant : bandeau permanent ; mission affichée ; grand timer ; Pause / Reprendre / Terminer ; état réel du blocage.

Après : minutes réalisées ; note facultative de concentration ; XP gagnée ; possibilité de terminer la quête associée ; proposition de pause.

Pause courte configurable (5 min par défaut). Les pauses ne comptent jamais comme focus. Le cycle suivant démarre uniquement après une action de l'utilisateur.

### Fiabilité du timer
Ne pas dépendre uniquement de `setInterval`. Persister : début de session ; durée prévue ; état ; intervalles de pause ; fin effective. Recalculer l'affichage depuis les horodatages au retour au premier plan.

Une session chronométrée se termine à son échéance, même si l'app reste en arrière-plan. Ne jamais compter du temps au-delà de la durée prévue. Empêcher deux sessions simultanées. Prévenir doubles enregistrements et doubles récompenses lors d'un redémarrage ou d'un double toucher. Une session arrêtée conserve ses minutes réellement effectuées.

Chronomètre libre resté actif après fermeture : demander confirmation du temps au retour si la durée paraît anormale.

Notifications locales de fin lorsque l'environnement le permet. Le refus des notifications ne bloque pas le timer.

## 10. Blocage des distractions

Volontaire et lié à une session. Aucun paiement en cristaux. Séparer : interface ; permissions ; implémentations natives par plateforme.

Vérifier les API et règles officielles actuelles d'iOS et Android. N'inventer aucune API universelle.

Le blocage commence au lancement et est retiré à la pause, à la fin ou à l'abandon. Le réappliquer à la reprise. Prévoir une récupération sûre après fermeture inattendue.

Si la fonctionnalité native ne peut pas être exécutée dans l'environnement disponible : l'indiquer précisément ; garder le reste de l'app fonctionnel ; afficher « Blocage non disponible dans cette version » ; ne jamais afficher « Applications bloquées » sans état natif confirmé ; documenter la configuration et les tests restants.

## 11. Statistiques

Prévoir : sélection semaine/mois ; temps total de focus ; nombre de sessions ; durée moyenne ; histogramme par jour ; progression de l'objectif hebdomadaire ; répartition par catégorie ; heatmap globale de régularité ; historique des sessions.

La fiche d'une habitude a son propre calendrier de réalisation. Distinguer absence, repos prévu, objectif manqué. Permettre les corrections manuelles de sessions et les identifier comme telles. Les totaux du header, de l'accueil et de Stats viennent des mêmes calculs.

## 12. Profil, XP et réglages

Profil : photo modifiable ; pseudo ; niveau ; XP ; cristaux ; statistiques cumulées ; paramètres. Pas de « Skills points » ni de notes de compétence par domaine. Les catégories servent uniquement à organiser les actions et répartir le temps.

Progression provisoire, isolée dans une configuration : 1 XP par minute entière de focus enregistrée ; aucun bonus pour cocher une tâche ; niveau dérivé de seuils configurables ; aucune attribution rétroactive en double. Identifier cette règle comme hypothèse produit modifiable.

Réglages : objectifs quotidiens par jour de semaine ; jours de repos ; objectif hebdomadaire ; durée des sessions et pauses ; catégories personnalisables ; rappels ; blocage ; export et suppression des données.

Un changement d'objectif ne réécrit pas silencieusement les scores des journées passées.

## 13. Données et cas limites

Modèles distincts : profil ; catégorie ; tâche ; habitude ; occurrence d'habitude ; session ; pauses de session ; évaluation de concentration ; objectifs datés ; transactions XP ; portefeuille et transactions de cristaux ; paramètres.

Horodatages stockés correctement ; fuseau local pour les journées. Traiter : session traversant minuit ; changement de semaine ; changement d'heure ; catégories archivées ; absence de données ; restauration après fermeture.

Répartir les minutes d'une session traversant minuit entre les journées concernées. Identifiants stables et opérations atomiques pour l'enregistrement d'une session et de ses récompenses.

Données de démonstration uniquement via un mode démo explicite. Un nouvel utilisateur commence avec des données réelles vides.

## 14. Validation et livraison

Tester en priorité : fiabilité du timer ; pauses et reprise ; fermeture/réouverture ; calculs des scores et totaux ; changement de date ; habitudes récurrentes ; prévention des doublons ; persistance.

Vérifier visuellement sur plusieurs tailles de téléphone : header compact ; calendrier immédiatement dessous ; pas de chevauchement ; libellés lisibles ; cibles tactiles suffisantes ; grands textes ; contraste sur le paysage ; clavier et formulaires.

Livrer : 1) code complet et structuré ; 2) instructions exactes de lancement ; 3) fonctionnalités réellement disponibles ; 4) limitations et dépendances natives restantes ; 5) résumé des vérifications effectuées ; 6) hypothèses produit centralisées et faciles à modifier.

Ne pas conclure après une simple maquette ou un plan. Implémenter le MVP par étapes jusqu'à obtenir une version exécutable et cohérente.
