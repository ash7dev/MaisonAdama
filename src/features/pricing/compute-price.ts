import { PromotionType } from '@prisma/client';

export interface ApplicablePromotion {
  id: string;
  name: string;
  type: PromotionType;
  value: number; // % (1-100) or FCFA amount
}

export interface ComputedPrice {
  originalPrice: number; // Base price FCFA
  finalPrice: number;    // Final price after best discount
  discountAmount: number; // Savings FCFA
  appliedPromotion: ApplicablePromotion | null;
}

export function computeBestPrice(
  originalPrice: number,
  promotions: ApplicablePromotion[]
): ComputedPrice {
  if (!promotions || promotions.length === 0) {
    return {
      originalPrice,
      finalPrice: originalPrice,
      discountAmount: 0,
      appliedPromotion: null,
    };
  }

  let maxDiscount = 0;
  let bestPromo: ApplicablePromotion | null = null;

  for (const promo of promotions) {
    let currentDiscount = 0;
    if (promo.type === PromotionType.POURCENTAGE) {
      currentDiscount = Math.round((originalPrice * promo.value) / 100);
    } else if (promo.type === PromotionType.MONTANT_FIXE) {
      currentDiscount = Math.min(originalPrice, promo.value);
    }

    if (currentDiscount > maxDiscount) {
      maxDiscount = currentDiscount;
      bestPromo = promo;
    }
  }

  const finalPrice = Math.max(0, originalPrice - maxDiscount);

  return {
    originalPrice,
    finalPrice,
    discountAmount: maxDiscount,
    appliedPromotion: bestPromo,
  };
}
