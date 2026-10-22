# Tatakae

Application mobile de **focus et d'habitudes** au thème RPG/anime bleu (Expo, React Native, TypeScript strict).
Sans compte, hors ligne, données locales (SQLite). Interface en français, code en anglais.

> Statut : étape 01 (scaffold). Les fonctionnalités arrivent étape par étape (une branche / PR par étape).

## Lancer le projet

Prérequis : Node.js 22+, npm.

```bash
npm install
npm start          # Expo dev server (scanner le QR avec Expo Go) 
npm run web        # version web (utile pour les captures et le développement)
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

Le fond paysage (`assets/images/tatakae-landscape.jpg`) est une illustration anime originale générée par IA
pour ce projet (aucune franchise, aucun personnage, pas de pixel art).
