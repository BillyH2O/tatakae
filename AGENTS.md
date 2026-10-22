# Tatakae — contexte pour agents IA

Application mobile Expo (SDK 58, React Native, TypeScript strict) de focus et d'habitudes, thème RPG/anime bleu. Sans compte, hors ligne, données locales SQLite.

**À lire avant de coder** : `docs/PRODUCT_SPEC.md` (spec produit, référence unique) puis `docs/ARCHITECTURE.md` (décisions techniques, schéma SQL, étapes ; la section 11 liste les écarts).

## Règles non négociables

- UI en **anglais** (décision du propriétaire, prime sur la spec), code/types/SQL en **anglais**. Toutes les chaînes UI dans `src/i18n/en.ts`.
- **Hypothèses produit** (XP, seuils, durées, objectifs par défaut…) uniquement dans `src/config/product.ts`.
- **Logique métier = fonctions pures** dans `src/domain/` (aucun import RN/Expo/DB), avec tests unitaires. Pas de `Date.now()` direct : `Clock` injecté.
- Une seule source pour les totaux (header, Accueil, Stats). Pas de SQL dans `src/app/` ni `src/ui/`.
- Écritures atomiques et idempotentes (transactions via `SqlDb.transaction`), identifiants stables, jamais de double récompense XP.
- **Jamais** d'affichage « Applications bloquées » / « Blocage actif » sans état natif confirmé ; sinon « Blocage non disponible dans cette version ».
- Ne jamais prétendre qu'une fonction native marche si elle n'a pas été testée sur appareil. Pas d'écran « Temps d'écran », pas de règle ni de boutique de cristaux.
- Données de démonstration uniquement via le mode démo explicite (base séparée).

## Commandes

```bash
npm install
npm run check      # tsc --noEmit + expo lint + jest
npm run web        # aperçu web
npx expo install <paquet>   # toujours, jamais npm i pour un module Expo/natif
```

Routes : Expo Router dans `src/app/`. Docs Expo versionnées : https://docs.expo.dev/versions/v58.0.0/ (l'API change à chaque SDK ; ne pas se fier à la mémoire).
