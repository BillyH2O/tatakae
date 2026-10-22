/**
 * Single source of truth for every product assumption of Tatakae.
 * Anything marked "HYPOTHÈSE PRODUIT" is a provisional rule that can be changed here
 * without touching business logic. No product number may live anywhere else.
 */
export const PRODUCT = {
  week: {
    // ISO weekday of the first day of the week (1 = Monday). Calendar logic is Monday-based.
    firstIsoWeekday: 1,
  },
  goals: {
    // HYPOTHÈSE PRODUIT — modifiable : objectifs proposés à l'onboarding (minutes par jour ISO, 'rest' = repos prévu).
    defaultDailyMin: { 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 60, 7: 'rest' },
    // HYPOTHÈSE PRODUIT — modifiable : l'objectif hebdomadaire par défaut est la somme des objectifs quotidiens.
    defaultWeekly: 'sumOfDaily',
  },
  timer: {
    // HYPOTHÈSE PRODUIT — modifiable : durée de focus par défaut (25 min) et préréglages.
    defaultFocusMin: 25,
    focusPresetsMin: [15, 25, 45, 60],
    minFocusMin: 5,
    maxFocusMin: 180,
    customStepMin: 5,
    // HYPOTHÈSE PRODUIT — modifiable : garder l'écran allumé pendant une session (désactivé par défaut).
    keepScreenOnDefault: false,
    // Optional felt-focus rating scale shown on the session summary (1..N).
    ratingMax: 5,
    // HYPOTHÈSE PRODUIT — modifiable : pause courte par défaut (5 min) et préréglages.
    defaultBreakMin: 5,
    breakPresetsMin: [3, 5, 10, 15],
    // HYPOTHÈSE PRODUIT — modifiable : en dessous de cette durée, une session ne peut qu'être abandonnée.
    minCountedSec: 60,
    heartbeatSec: 30,
    // HYPOTHÈSE PRODUIT — modifiable : seuils au-delà desquels un chronomètre libre demande confirmation.
    stopwatchGapConfirmMin: 10,
    stopwatchMaxPlausibleMin: 240,
    stopReasons: ['interrupted', 'tired', 'quest_done', 'other'],
  },
  score: {
    // HYPOTHÈSE PRODUIT — modifiable : seuils de couleur du score quotidien (0–39, 40–79, 80–99, 100).
    buckets: { low: 40, mid: 80, good: 100 },
    display: 'floor',
  },
  radar: {
    windowDays: 14,
    // HYPOTHÈSE PRODUIT — modifiable : nombre minimal de sessions notées avant d'afficher « Force ».
    forceMinRatings: 3,
    mentalMinClosed: 1,
    enduranceMinGoalDays: 1,
    constanceMinDays: 1,
    ratingScale: 20,
  },
  xp: {
    ruleVersion: 'xp-v1',
    // HYPOTHÈSE PRODUIT — modifiable : 1 XP par minute entière de focus enregistrée.
    perFullMinute: 1,
    // HYPOTHÈSE PRODUIT — modifiable : aucun bonus pour cocher une quête.
    questCompletionBonus: 0,
    manualEntriesEarnXp: true,
    // HYPOTHÈSE PRODUIT — modifiable : seuils de niveau triangulaires, N(n) = step × (n−1) × n / 2.
    levelStepXp: 60,
  },
  quests: {
    todayIncludesOverdue: true,
    todayIncludesUndated: false,
    homeListMax: 3,
    occurrenceHorizonDays: 14,
  },
  categories: {
    homeTopN: 3,
    // HYPOTHÈSE PRODUIT — modifiable : palette for new categories (MaterialCommunityIcons keys below).
    colorPalette: [
      '#4C9BFF',
      '#7C6CFF',
      '#38C6D9',
      '#E2B144',
      '#E57AA8',
      '#8BDB9A',
      '#F28C5B',
      '#A3B3CF',
    ],
    iconChoices: [
      'school',
      'hammer-wrench',
      'book-open-variant',
      'run',
      'code-tags',
      'music',
      'palette',
      'heart-pulse',
    ],
    // HYPOTHÈSE PRODUIT — modifiable : catégories proposées à l'onboarding (la clé d'icône est MaterialCommunityIcons).
    seed: [
      { name: 'Studies', icon: 'school' },
      { name: 'Project', icon: 'hammer-wrench' },
      { name: 'Reading', icon: 'book-open-variant' },
      { name: 'Sport', icon: 'run' },
    ],
  },
  crystals: {
    // Section 3 de la spec d'origine absente : solde à 0, aucune règle d'attribution, aucune boutique.
    initialBalance: 0,
    earningRules: [],
    shopEnabled: false,
  },
  stats: { heatmapWeeks: 18, historyPageSize: 20 },
  notifications: { maxHabitReminders: 50 },
  profile: { maxNameLength: 24 },
} as const;

export type ProductConfig = typeof PRODUCT;
