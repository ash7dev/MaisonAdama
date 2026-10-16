/** Modèles de story : partagés par le serveur (génération) et le studio de l'admin. */
export const STORY_TEMPLATES = ['couverture', 'arche', 'chiffre', 'cartel'] as const;
export type StoryTemplate = (typeof STORY_TEMPLATES)[number];

export const TEMPLATE_LABELS: Record<StoryTemplate, { name: string; use: string }> = {
  couverture: { name: 'La Couverture', use: 'Photo en grand, façon magazine' },
  arche: { name: 'L’Arche', use: 'La signature de la Maison' },
  chiffre: { name: 'Le Chiffre', use: 'Pour une promotion en cours' },
  cartel: { name: 'Le Cartel', use: 'Pour une nouvelle arrivée' },
};
