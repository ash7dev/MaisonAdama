/**
 * Utilitaires transverses
 */

/**
 * Combine des classes CSS conditionnelles (inspiré de clsx / tailwind-merge)
 */
export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Formate une date au format lisible en français
 * Exemple: 2026-09-29 -> "29 septembre 2026 à 19:30"
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Helper de temporisation asynchrone (sleep)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
