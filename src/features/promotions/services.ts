import { PromotionType } from '@prisma/client';
import { withAdmin, type Tx } from '@/lib/db-context';
import { DomainError } from '@/lib/errors';
import { formatFCFA } from '@/lib/money';
import { fromDakarInput, type PromotionFieldErrors, type ValidPromotionInput } from './schemas';

/** Erreur rattachée à un champ du formulaire. */
export class PromotionFieldError extends Error {
  constructor(public readonly fieldErrors: PromotionFieldErrors) {
    super(Object.values(fieldErrors)[0]);
    this.name = 'PromotionFieldError';
  }
}

/**
 * Vérifie les cibles (elles existent) et qu'un montant fixe ne rend aucun
 * article gratuit. Renvoie les données prêtes à écrire.
 */
async function checkTargets(tx: Tx, input: ValidPromotionInput) {
  const [products, variants] = await Promise.all([
    tx.product.findMany({
      where: { id: { in: input.productIds } },
      select: { id: true, name: true, variants: { where: { isActive: true }, select: { price: true, label: true } } },
    }),
    tx.productVariant.findMany({
      where: { id: { in: input.variantIds } },
      select: { id: true, productId: true, price: true, label: true, product: { select: { name: true } } },
    }),
  ]);
  if (products.length !== input.productIds.length || variants.length !== input.variantIds.length) {
    throw new PromotionFieldError({ targets: 'Un produit sélectionné n’existe plus. Rechargez la page.' });
  }

  // Une contenance déjà couverte par son produit entier : doublon inutile.
  const wholeProducts = new Set(input.productIds);
  const variantIds = variants.filter((v) => !wholeProducts.has(v.productId)).map((v) => v.id);

  if (input.type === PromotionType.MONTANT_FIXE) {
    const prices = [
      ...products.flatMap((p) => p.variants.map((v) => ({ price: v.price, label: `${p.name} ${v.label}` }))),
      ...variants.map((v) => ({ price: v.price, label: `${v.product.name} ${v.label}` })),
    ];
    const cheapest = prices.sort((a, b) => a.price - b.price)[0];
    if (cheapest && input.value >= cheapest.price) {
      throw new PromotionFieldError({
        value: `Remise trop forte : ${cheapest.label} (${formatFCFA(cheapest.price)}) deviendrait gratuit.`,
      });
    }
  }

  return {
    targets: [
      ...input.productIds.map((productId) => ({ productId })),
      ...variantIds.map((variantId) => ({ variantId })),
    ],
  };
}

function promotionData(input: ValidPromotionInput) {
  return {
    name: input.name,
    type: input.type,
    value: input.value,
    startsAt: fromDakarInput(input.startsAt),
    endsAt: fromDakarInput(input.endsAt),
    isActive: input.isActive,
  };
}

export async function createPromotion(adminId: string, input: ValidPromotionInput) {
  return withAdmin(adminId, async (tx) => {
    const { targets } = await checkTargets(tx, input);
    return tx.promotion.create({
      data: { ...promotionData(input), targets: { create: targets } },
      select: { id: true, name: true },
    });
  });
}

/** Modification : version chargée ≠ version en base → refus (modification concurrente). */
export async function updatePromotion(adminId: string, id: string, expectedUpdatedAt: string, input: ValidPromotionInput) {
  return withAdmin(adminId, async (tx) => {
    const current = await tx.promotion.findUnique({ where: { id }, select: { updatedAt: true, code: true } });
    if (!current || current.code) throw new DomainError('Cette promotion n’existe plus.', 'PROMOTION_NOT_FOUND');
    if (current.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) {
      throw new DomainError('Cette promotion a été modifiée entre-temps. Rechargez la page pour repartir de la dernière version.', 'CONCURRENT_UPDATE');
    }
    const { targets } = await checkTargets(tx, input);
    await tx.promotionTarget.deleteMany({ where: { promotionId: id } });
    return tx.promotion.update({
      where: { id },
      data: { ...promotionData(input), targets: { create: targets } },
      select: { id: true, name: true },
    });
  });
}

export async function setPromotionActive(adminId: string, id: string, isActive: boolean) {
  return withAdmin(adminId, async (tx) => {
    const promo = await tx.promotion.findUnique({ where: { id }, select: { endsAt: true } });
    if (!promo) throw new DomainError('Cette promotion n’existe plus.', 'PROMOTION_NOT_FOUND');
    if (isActive && promo.endsAt <= new Date()) {
      throw new DomainError('Cette promotion est terminée : dupliquez-la pour la relancer avec de nouvelles dates.', 'PROMOTION_ENDED');
    }
    await tx.promotion.update({ where: { id }, data: { isActive } });
  });
}

/**
 * Copie désactivée, mêmes remise et produits, nouvelles dates (à partir de maintenant,
 * même durée) : pour relancer une opération sans tout ressaisir.
 */
export async function duplicatePromotion(adminId: string, id: string) {
  return withAdmin(adminId, async (tx) => {
    const source = await tx.promotion.findUnique({
      where: { id },
      select: { name: true, type: true, value: true, startsAt: true, endsAt: true, targets: { select: { productId: true, variantId: true } } },
    });
    if (!source) throw new DomainError('Cette promotion n’existe plus.', 'PROMOTION_NOT_FOUND');
    const duration = source.endsAt.getTime() - source.startsAt.getTime();
    const start = new Date();
    start.setUTCSeconds(0, 0);
    return tx.promotion.create({
      data: {
        name: `${source.name} (copie)`.slice(0, 120),
        type: source.type,
        value: source.value,
        startsAt: start,
        endsAt: new Date(start.getTime() + duration),
        isActive: false,
        targets: {
          create: source.targets.map((t) => (t.productId ? { productId: t.productId } : { variantId: t.variantId! })),
        },
      },
      select: { id: true },
    });
  });
}

/** Suppression réservée aux promotions jamais utilisées (sinon : désactiver). */
export async function deletePromotion(adminId: string, id: string) {
  return withAdmin(adminId, async (tx) => {
    const used = await tx.orderItem.count({ where: { promotionId: id } });
    if (used > 0) {
      throw new DomainError('Cette promotion figure dans des commandes : désactivez-la plutôt, l’historique est conservé.', 'PROMOTION_USED');
    }
    await tx.promotion.delete({ where: { id } });
  });
}
