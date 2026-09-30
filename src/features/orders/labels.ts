import type { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

/** Libellés et pastilles de statut, partagés par tout l'admin. */
export const ORDER_STATUS_UI: Record<OrderStatus, { label: string; chip: string }> = {
  EN_ATTENTE: { label: 'À confirmer', chip: 'bg-alerte-fond text-alerte' },
  CONFIRMEE: { label: 'Confirmée', chip: 'bg-paille text-or-profond' },
  EN_LIVRAISON: { label: 'En livraison', chip: 'bg-oud text-sur-oud' },
  LIVREE: { label: 'Livrée', chip: 'bg-succes-fond text-succes' },
  ANNULEE: { label: 'Annulée', chip: 'bg-erreur-fond text-erreur' },
};

export function paymentLabel(method: PaymentMethod, status: PaymentStatus): string {
  if (status === 'REMBOURSE') return 'Remboursée';
  if (method === 'WAVE') return status === 'PAYE' ? 'Wave · payé' : 'Wave · à vérifier';
  return status === 'PAYE' ? 'Payé à la livraison' : 'À la livraison';
}
