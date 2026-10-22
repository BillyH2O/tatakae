/** All user-facing strings (French). Code, types and SQL stay in English. */
export const fr = {
  app: {
    name: 'Tatakae',
    tagline: 'Focus et habitudes',
  },
  db: {
    loading: 'Ouverture de vos données…',
    errorTitle: 'Impossible d’ouvrir vos données',
    errorBody:
      'Une erreur est survenue en ouvrant la base locale. Vos données n’ont pas été modifiées. Relancez l’application ; si le problème persiste, signalez l’erreur ci-dessous.',
    retry: 'Réessayer',
    ready: (version: number) => `Base locale prête · schéma v${version}`,
  },
} as const;
