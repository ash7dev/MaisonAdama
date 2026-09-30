/** Espace insécable : un montant ne se coupe jamais en fin de ligne. */
const NBSP = '\u00A0';

/**
 * Formate un montant entier en Francs CFA (XOF / XAF)
 * Exemple: 25000 -> "25 000 FCFA" (espaces insécables : jamais de retour à la ligne)
 */
export function formatFCFA(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0${NBSP}FCFA`;
  }

  const rounded = Math.round(amount);
  const formattedNumber = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(rounded);

  return `${formattedNumber}${NBSP}FCFA`;
}
