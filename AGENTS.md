# Tatakae — contexte pour agents IA

Application mobile Expo (SDK 58, React Native, TypeScript strict) de focus et d'habitudes, thème RPG/anime bleu. Sans compte, hors ligne, données locales SQLite.

**Avant de coder** : lire [`docs/AGENT_MAP.md`](docs/AGENT_MAP.md) et ouvrir **uniquement** les sections de spec/architecture indiquées pour la tâche. Les règles détaillées sont dans [`.cursor/rules/tatakae.mdc`](.cursor/rules/tatakae.mdc).

Références longues (à utiliser par section, pas en entier) :

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — produit
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — SQL, timer, tests, écarts (§11)

## Commandes

```bash
npm install
npm run check      # tsc --noEmit + expo lint + jest
npm run web        # aperçu web
npx expo install <paquet>   # toujours, jamais npm i pour un module Expo/natif
```

Routes : Expo Router dans `src/app/`. Docs Expo : https://docs.expo.dev/versions/v58.0.0/
