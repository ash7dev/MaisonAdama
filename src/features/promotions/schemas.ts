import { PromotionType } from '@prisma/client';
import { z } from 'zod';

/**
 * Promotion : UN schéma partagé par le formulaire (erreurs immédiates) et la
 * Server Action (autorité). Les contraintes reprennent celles de la base.
 */

export const PROMOTION_LIMITS = { name: 120, maxPercentage: 90, maxAmount: 10_000_000, maxTargets: 500 } as const;

/** Heure de Dakar = UTC : « 2026-06-12T09:30 » (champ datetime-local) ⇄ Date. */
export function fromDakarInput(value: string): Date {
  return new Date(`${value}:00Z`);
}
export function toDakarInput(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 16);
}

const dakarDateTime = (label: string) =>
  z
    .string({ required_error: `${label} obligatoire.` })
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `${label} invalide.`);

export const promotionInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Donnez un nom à la promotion.').max(PROMOTION_LIMITS.name, `${PROMOTION_LIMITS.name} caractères au maximum.`),
    type: z.nativeEnum(PromotionType),
    value: z.union([z.number(), z.string().trim()]).pipe(
      z.coerce.number({ invalid_type_error: 'Indiquez la remise.' }).int('Nombre entier.').positive('La remise doit être supérieure à 0.'),
    ),
    startsAt: dakarDateTime('Date de début'),
    endsAt: dakarDateTime('Date de fin'),
    isActive: z.boolean(),
    productIds: z.array(z.string().uuid()),
    variantIds: z.array(z.string().uuid()),
  })
  .superRefine((promo, ctx) => {
    if (promo.type === PromotionType.POURCENTAGE && promo.value > PROMOTION_LIMITS.maxPercentage) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: `${PROMOTION_LIMITS.maxPercentage} % au maximum.` });
    }
    if (promo.type === PromotionType.MONTANT_FIXE && promo.value > PROMOTION_LIMITS.maxAmount) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Montant trop élevé.' });
    }
    if (fromDakarInput(promo.endsAt) <= fromDakarInput(promo.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'La fin doit être après le début.' });
    }
    const targets = promo.productIds.length + promo.variantIds.length;
    if (targets === 0) {
      ctx.addIssue({ code: 'custom', path: ['targets'], message: 'Choisissez au moins un produit.' });
    }
    if (targets > PROMOTION_LIMITS.maxTargets) {
      ctx.addIssue({ code: 'custom', path: ['targets'], message: 'Trop de produits sélectionnés.' });
    }
  });

export type PromotionInput = z.input<typeof promotionInputSchema>;
export type ValidPromotionInput = z.output<typeof promotionInputSchema>;

export type PromotionFieldErrors = Record<string, string>;

export function toPromotionErrors(error: z.ZodError): PromotionFieldErrors {
  const errors: PromotionFieldErrors = {};
  for (const issue of error.issues) errors[issue.path.join('.') || 'form'] ??= issue.message;
  return errors;
}

/** « −20 % » ou « −3 000 FCFA » */
export function formatDiscount(type: PromotionType, value: number): string {
  return type === PromotionType.POURCENTAGE ? `−${value} %` : `−${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
}

// -----------------------------------------------------------------------------
//  État d'une promotion (dérivé : jamais stocké)
// -----------------------------------------------------------------------------

export type PromotionState = 'active' | 'scheduled' | 'ended' | 'disabled';

export function promotionState(promo: { isActive: boolean; startsAt: Date | string; endsAt: Date | string }, now = new Date()): PromotionState {
  if (new Date(promo.endsAt) <= now) return 'ended';
  if (!promo.isActive) return 'disabled';
  if (new Date(promo.startsAt) > now) return 'scheduled';
  return 'active';
}

export const PROMOTION_STATE_UI: Record<PromotionState, { label: string; chip: string }> = {
  active: { label: 'En cours', chip: 'bg-succes-fond text-succes' },
  scheduled: { label: 'Programmée', chip: 'bg-[#DCEBF3] text-[#1F5673]' },
  ended: { label: 'Terminée', chip: 'bg-sable text-fumee ring-1 ring-inset ring-filet' },
  disabled: { label: 'Désactivée', chip: 'bg-sable text-fumee border border-dashed border-filet-fort' },
};
