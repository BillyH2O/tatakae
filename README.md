# Tatakae

Application mobile de **focus et d'habitudes** au thème RPG/anime bleu (Expo, React Native, TypeScript strict).
Sans compte, hors ligne, données locales (SQLite). Interface en anglais, code en anglais.

> Statut : étape 06 (timer Focus). Sessions fiables (compte à rebours / chronomètre libre, pause, fin, abandon),
> récupération après fermeture de l'app, bilan de session, pause courte. Home / Stats restent provisoires.
> Les fonctionnalités arrivent étape par étape (une branche / PR par étape, empilées).

## Documentation

- `docs/PRODUCT_SPEC.md` : spécification produit (référence unique).
- `docs/ARCHITECTURE.md` : architecture, schéma SQL, domaine, timer, étapes ; section 11 = écarts constatés.
- `AGENTS.md` et `.cursor/rules/` : contexte et conventions pour les assistants IA.
- Hypothèses produit (XP, niveaux, durées, objectifs par défaut…) : **`src/config/product.ts`** (un seul fichier).

## Ce qui existe à ce stade

- Base SQLite (`tatakae.db`) : schéma v1 complet, migrations versionnées (`PRAGMA user_version`), transactions atomiques sérialisées.
- Domaine pur testé : dates locales (semaine ISO, DST), répartition des sessions à cheval sur minuit, objectifs datés, XP et niveaux.
- Repositories : profil, catégories, objectifs, XP (anti double récompense), réglages, focus par jour.
- Thème bleu (`src/ui/theme/tokens.ts`), paysage partagé assombri selon l'écran, barre d'onglets maison.
- Onboarding : pseudo, photo facultative, objectifs quotidiens/hebdo, catégories seed en une transaction.
- Profil : avatar, pseudo, niveau + barre XP, cristaux (lecture seule), stats cumulées, lien Réglages.
- Réglages : objectifs versionnés (« Applies from today »), catégories (créer, renommer, archiver, réordonner), timer par défaut.
- Bandeau permanent branché sur SQLite (pseudo réel après onboarding ; « Today / Week » avec objectifs).
- Quêtes : tâches (échéance, priorité, complétion, archive), habitudes (jours de la semaine, occurrences matérialisées),
  liste Today (retards, mission, habitudes de la journée) et All ; « Start » ouvre `/focus` (écran placeholder).
- Timer Focus : machine d'état pure (`src/domain/timer/machine.ts`), sessions atomiques et idempotentes
  (`sessionService`), une seule session active (index unique), affichage dérivé des horodatages (jamais d'un
  compteur), répartition minuit/DST, XP unique par session. Au retour dans l'app, un compte à rebours échu est
  clôturé à son échéance ; un chrono libre laissé ouvert demande confirmation avant tout enregistrement. Le bilan
  (note facultative, XP, « Complete quest » explicite, pause de 5 min) réapparaît après un redémarrage tant qu'il
  n'est pas fermé. Les totaux du bandeau incluent la session en cours en direct.
- « Keep screen on » (réglage, désactivé par défaut) et le retour haptique de fin de session sont câblés mais **non
  testés sur appareil**. Le blocage des distractions reste indisponible (« Distraction blocking is not available in
  this version »).
- Notifications locales (`notificationService`, derrière un port `NotificationsPort` ; `expo-notifications` n'est
  touché que dans `src/services/notifications/expoPort.ts`, la version web est un no-op) :
  - fin de session (`session-end`) programmée à l'échéance d'un compte à rebours au démarrage / à la reprise,
    annulée à la pause, à la fin, à l'abandon ; fin de pause (`break-end`) ; resynchronisation idempotente au
    lancement et au retour au premier plan (échéance dépassée : rien n'est planifié) ;
  - rappels d'habitudes : un déclencheur hebdomadaire par jour planifié (jour ISO → jour expo), resynchronisés à
    chaque création / modification / archivage et au lancement, plafonnés à `PRODUCT.notifications.maxHabitReminders`
    (avertissement dans Réglages > Notifications) ; l'heure se saisit en `HH:MM` à la création et sur la fiche habitude ;
  - permission demandée une seule fois, en contexte (premier compte à rebours, ou activation d'un rappel), après la
    création des canaux Android (`timer` HIGH, `reminders` DEFAULT) ; un refus ne bloque jamais le timer ni les
    quêtes ; Réglages > Notifications montre l'état, renvoie vers les réglages système et propose « Allow exact time »
    (Android, `SCHEDULE_EXACT_ALARM` déclaré) ;
  - au premier plan, les alertes de fin de session / pause n'affichent pas de bannière (l'écran réagit déjà), les
    rappels d'habitudes oui.
- **Testé** : calcul des jours (ISO → expo), plan et plafond des rappels, planification / annulation à chaque transition
  (port factice en mémoire), idempotence, permission refusée, échec du planificateur, formes des déclencheurs et des
  canaux avec `expo-notifications` simulé. **Non testé** : l'arrivée réelle d'une notification sur iOS / Android
  (appli fermée, mode économie d'énergie, redémarrage de l'appareil, « Allow exact time »), la boîte de dialogue de
  permission système, la persistance des déclencheurs après redémarrage. Les rappels hebdomadaires n'ont pas non plus
  été observés sur appareil.
- Accueil complet, dans l'ordre de la spec : bandeau, calendrier hebdomadaire (lundi → dimanche, navigation par
  semaine, jour sélectionné, 5 états : futur / repos / sans objectif / aujourd'hui « en cours » / passé), panneaux
  « Current form » (radar 14 jours, indépendant du jour choisi, axes sans assez de données affichés « Not enough data
  (n/3) », jamais 0) et « By category » (jour choisi, top 3 + « See all », « Uncategorized » inclus, échelle commune),
  « Today's quests » (jour choisi, max 3 + « See all quests », terminées repliables) et bouton « Free session ».
  Choisir un jour ne change que les catégories et les quêtes. Score = `min(100, minutes / objectif)`, affiché tronqué
  (99,6 → 99), jamais > 100 ; les panneaux s'empilent sous 420 px de large ou avec une police agrandie (> 1,2).
  - **Testé** : scores / états de cellule, radar (seuils, fenêtre 14 jours, données insuffisantes), répartition par
    catégorie, lectures SQL et cohérence avec les totaux du bandeau, textes et sommets du radar, règle d'empilement.
    **Vérifié à la main sur la version web** : rendu à 360 px (empilé) et sélection d'un jour. **Non testé** : rendu des
    composants en test automatique (aucune bibliothèque de test de composants installée), police × 1,3 sur appareil,
    lecteurs d'écran, iOS / Android.
- **Mode démo** (Réglages > « Data & demo mode ») : bascule sur une base séparée `tatakae-demo.db`, générée au premier
  passage avec ~10 semaines de données aléatoires (sessions avec pauses, arrêts anticipés, notes, XP, une session à
  cheval sur minuit, jours de repos, habitudes cochées ou manquées, tâches faites / en retard / à venir). « Generate new
  sample data » en produit un nouveau jeu ; « Back to my real data » revient à la base réelle, intacte. Un bandeau
  « Demo mode · sample data » reste visible dans l'en-tête. Garde-fous : `seedDemo` refuse toute base autre que la base
  démo, la bascule et la régénération sont refusées pendant une session active, aucun rappel de notification n'est créé
  par la démo. Le choix de base est conservé après rechargement. Le générateur (`src/domain/demoData.ts`) est pur et
  reproductible par graine ; ses paramètres sont dans `PRODUCT.demo`.
  - **Testé** : génération (bornes, cohérence segments/XP, pas de chevauchement, une seule session sur minuit, rien dans
    le futur), garde-fou « base réelle », réinitialisation complète (toutes les tables couvertes), reprise après une
    génération interrompue, refus pendant une session. **Vérifié à la main sur le web** : entrée / sortie du mode démo,
    régénération, base réelle inchangée au retour. **Non testé** : la bascule sur iOS / Android.
- Rien de natif n'est testé (iOS/Android) : seule la version web a été exécutée.

## Lancer le projet

Prérequis : Node.js 22+, npm.

```bash
npm install
npm start          # Expo dev server
npm run web        # version web (utile pour les captures et le développement)
# Le Expo Go des stores n'embarque pas encore le SDK 58 : sur téléphone, utiliser un development build
# (npx expo run:ios / npx expo run:android, ou eas build --profile development).
```

## Qualité

```bash
npm run typecheck  # tsc --noEmit (strict)
npm run lint       # expo lint
npm test           # jest-expo
npm run check      # les trois ci-dessus
```

## Stack

Expo SDK 58, React Native 0.88, Expo Router (`src/app/`), expo-sqlite, react-native-svg, jest-expo.

## Visuel

Le fond paysage (`assets/images/landscape.jpg`) est une illustration anime originale générée par IA
pour ce projet (aucune franchise, aucun personnage, pas de pixel art).
