/** Formats du tableau de bord : espaces insécables, un chiffre ne se coupe jamais. */

const NBSP = ' ';
const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

/** 1245000 → « 1 245 000 » */
export const num = (n: number) => integer.format(Math.round(n));

/** 1245000 → « 1 245 000 FCFA » */
export const money = (n: number) => `${num(n)}${NBSP}FCFA`;

/** Montant court pour les étiquettes de barres : « 86,5 k », « 1,2 M ». */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${oneDecimal.format(n / 1_000_000)}${NBSP}M`;
  if (n >= 1_000) return `${oneDecimal.format(n / 1_000)}${NBSP}k`;
  return num(n);
}

/** 0.18 → « +18 % » ; 0 → « 0 % ». */
export function signedPercent(ratio: number): string {
  const p = Math.round(ratio * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}${NBSP}%`;
}

export const pct = (ratio: number) => percent.format(ratio).replace(' ', NBSP);

/** +6 / −2 / 0 */
export function signed(n: number, suffix = ''): string {
  const r = Math.round(n);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}${suffix ? NBSP + suffix : ''}`;
}

export type Trend = 'up' | 'down' | 'flat';
export const trendOf = (n: number | null): Trend => (n === null || Math.abs(n) < 1e-9 ? 'flat' : n > 0 ? 'up' : 'down');
