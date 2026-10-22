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
