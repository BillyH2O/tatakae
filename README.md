# Tatakae

Application mobile de **focus et d'habitudes** au thème RPG/anime bleu (Expo, React Native, TypeScript strict).
Sans compte, hors ligne, données locales (SQLite). Interface en anglais, code en anglais.

> Statut : étape 05 (quêtes). Tâches et habitudes avec occurrences, écran Quêtes (Today / All), création et détail,
> mission prioritaire, route Focus en stub (timer à l’étape suivante). Home / Stats restent provisoires.
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
