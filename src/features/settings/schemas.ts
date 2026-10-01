import { z } from 'zod';
import { parseSenegalPhone } from '@/lib/phone';

/** Les 14 régions du Sénégal (adresse de livraison). */
export const SENEGAL_REGIONS = [
  'Dakar',
  'Diourbel',
  'Fatick',
  'Kaffrine',
  'Kaolack',
  'Kédougou',
  'Kolda',
  'Louga',
  'Matam',
  'Saint-Louis',
  'Sédhiou',
  'Tambacounda',
  'Thiès',
  'Ziguinchor',
] as const;

export const DELAY_PRESETS = ['24 h', '48 h', '48–72 h', '3 à 5 jours'];

/** Zones proposées au démarrage : tarifs indicatifs, à relire avant d'ouvrir la boutique. */
export const SUGGESTED_ZONES = [
  { name: 'Dakar', region: 'Dakar', defaultFee: 2000, estimatedDelay: '24 h' },
  { name: 'Thiès', region: 'Thiès', defaultFee: 3500, estimatedDelay: '48 h' },
  { name: 'Touba / Mbacké', region: 'Diourbel', defaultFee: 4000, estimatedDelay: '48–72 h' },
  { name: 'Saint-Louis', region: 'Saint-Louis', defaultFee: 4000, estimatedDelay: '48–72 h' },
];

export const MAX_DELIVERY_FEE = 100_000;

/**
 * Numéro de téléphone : sénégalais saisi librement (« 77 105 92 10 »), ou
 * international complet (« +33 6 12 34 56 78 »). Vide = non renseigné.
 */
const optionalPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return null;
    const senegal = parseSenegalPhone(value);
    if (senegal) return senegal;
    const international = value.replace(/[\s\-.()]/g, '').replace(/^00/, '+');
    if (/^\+[1-9]\d{7,14}$/.test(international)) return international;
    ctx.addIssue({ code: 'custom', message: 'Numéro invalide. Ex. 77 105 92 10' });
    return z.NEVER;
  });

export const storeInfoSchema = z.object({
  storeName: z.string().trim().min(1, 'Donnez le nom de la boutique.').max(120, '120 caractères au maximum.'),
  whatsappNumber: optionalPhone,
  contactPhone: optionalPhone,
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, '120 caractères au maximum.')
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Adresse e-mail invalide.')
    .transform((v) => v || null),
});
export type StoreInfoInput = z.input<typeof storeInfoSchema>;

export const WAVE_QR_PATH = /^catalog\/settings\/wave-qr-[0-9a-f-]{36}\.(webp|jpg)$/;

/** Lien marchand Wave Business, rangé sous sa forme canonique (sans montant). */
export const WAVE_LINK = /^https:\/\/pay\.wave\.com\/m\/[A-Za-z0-9_-]+\/c\/[a-z]{2}\/$/;

export function normalizeWaveLink(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const m = url.pathname.match(/^\/m\/([A-Za-z0-9_-]+)\/c\/([a-z]{2})\/?$/i);
    if (url.protocol !== 'https:' || url.hostname !== 'pay.wave.com' || !m) return null;
    return `https://pay.wave.com/m/${m[1]}/c/${m[2].toLowerCase()}/`;
  } catch {
    return null;
  }
}

/** Lien avec le montant pré-rempli (FCFA entiers). */
export function wavePayUrl(link: string, amount: number): string {
  return `${link}?amount=${Math.round(amount)}`;
}

export const waveSchema = z.object({
  waveMerchantCode: z
    .string()
    .trim()
    .max(40, '40 caractères au maximum.')
    .transform((v) => {
      if (!v) return null;
      // Un numéro sénégalais est rangé au format international.
      return parseSenegalPhone(v) ?? v;
    }),
  waveQrImagePath: z
    .string()
    .nullable()
    .refine((v) => v === null || WAVE_QR_PATH.test(v), 'Image du QR code invalide.'),
  wavePaymentLink: z
    .string()
    .trim()
    .max(200, '200 caractères au maximum.')
    .refine((v) => !v || normalizeWaveLink(v) !== null, 'Collez le lien Wave Business, de la forme https://pay.wave.com/m/…/c/sn/')
    .transform((v) => (v ? normalizeWaveLink(v) : null)),
});
export type WaveInput = z.input<typeof waveSchema>;

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(1, 'Nommez la zone.').max(80, '80 caractères au maximum.'),
  region: z.enum(SENEGAL_REGIONS, { message: 'Choisissez une région.' }),
  defaultFee: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? Number(v.replace(/\D/g, '') || NaN) : v))
    .pipe(
      z
        .number({ message: 'Indiquez un tarif.' })
        .int('Montant entier en FCFA.')
        .min(0, 'Le tarif ne peut pas être négatif.')
        .max(MAX_DELIVERY_FEE, 'Tarif trop élevé.'),
    ),
  estimatedDelay: z
    .string()
    .trim()
    .max(40, '40 caractères au maximum.')
    .transform((v) => v || null),
  isActive: z.boolean(),
});
/** Saisie brute (validée côté serveur) : la région arrive d’un <select>. */
export type DeliveryZoneInput = Omit<z.input<typeof deliveryZoneSchema>, 'region'> & { region: string };

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] ??= issue.message;
  }
  return errors;
}
