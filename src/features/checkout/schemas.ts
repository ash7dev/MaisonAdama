import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import { parseSenegalPhone } from '@/lib/phone';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_LINES_PER_ORDER = 30;

/**
 * Entrée du checkout. Seuls les identifiants et les quantités viennent du
 * navigateur : prix, remises, frais et région sont relus en base.
 */
export const placeOrderSchema = z.object({
  /** Généré par le navigateur à l'ouverture du checkout (crypto.randomUUID()). */
  idempotencyKey: z.string().uuid(),
  customerName: z.string().trim().min(2, 'Indiquez votre nom et prénom.').max(120, '120 caractères au maximum.'),
  customerPhone: z
    .string()
    .transform((value, ctx) => {
      const phone = parseSenegalPhone(value);
      if (!phone) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Numéro sénégalais invalide (ex. 77 123 45 67)' });
        return z.NEVER;
      }
      return phone;
    }),
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(160, '160 caractères au maximum.')
    .optional()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Adresse e-mail invalide (ex. nom@exemple.com).')
    .transform((v) => (v ? v : undefined)),
  deliveryZoneId: z.string().uuid('Choisissez votre zone de livraison.'),
  city: z.string().trim().min(2, 'Indiquez votre ville ou votre quartier.').max(80, '80 caractères au maximum.'),
  address: z.string().trim().min(3, 'Indiquez votre adresse.').max(255, '255 caractères au maximum.'),
  landmark: optionalText(255),
  customerNote: optionalText(1000),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: optionalText(80),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
      }),
    )
    .min(1)
    .max(MAX_LINES_PER_ORDER),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type ValidPlaceOrderInput = z.output<typeof placeOrderSchema>;
