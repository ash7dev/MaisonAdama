import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSenegalPhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/whatsapp';
import { ORDER_STATUS_UI } from '../labels';

/** Au-delà, une commande « à confirmer » est signalée : le client attend. */
export const WAITING_ALERT_HOURS = 2;

export function StatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  const ui = ORDER_STATUS_UI[status];
  return (
    <span className={cn('inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-xs font-medium', ui.chip, className)}>
      {ui.label}
    </span>
  );
}

export function paymentChip(method: PaymentMethod, status: PaymentStatus) {
  if (status === PaymentStatus.REMBOURSE) return { label: 'Remboursée', className: 'bg-sable text-fumee ring-1 ring-inset ring-filet' };
  if (status === PaymentStatus.PAYE) return { label: method === PaymentMethod.WAVE ? 'Wave · payé' : 'Payé', className: 'bg-succes-fond text-succes' };
  return method === PaymentMethod.WAVE
    ? { label: 'Wave · à vérifier', className: 'bg-[#DCEBF3] text-[#1F5673]' }
    : { label: 'À la livraison', className: 'bg-sable text-encre ring-1 ring-inset ring-filet' };
}

export function PaymentChip({ method, status, className }: { method: PaymentMethod; status: PaymentStatus; className?: string }) {
  const chip = paymentChip(method, status);
  return (
    <span className={cn('inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-xs font-medium', chip.className, className)}>
      {chip.label}
    </span>
  );
}

export type NextStep =
  | { kind: 'confirm'; label: string }
  | { kind: 'ship'; label: string; warnUnpaidWave: boolean }
  | { kind: 'deliver'; label: string; collect: boolean };

/** L'étape suivante d'une commande, selon son statut et son paiement. */
export function nextStep(status: OrderStatus, method: PaymentMethod, payment: PaymentStatus): NextStep | null {
  switch (status) {
    case OrderStatus.EN_ATTENTE:
      return { kind: 'confirm', label: 'Confirmer' };
    case OrderStatus.CONFIRMEE:
      return {
        kind: 'ship',
        label: 'Expédier',
        warnUnpaidWave: method === PaymentMethod.WAVE && payment === PaymentStatus.NON_PAYE,
      };
    case OrderStatus.EN_LIVRAISON: {
      const collect = method === PaymentMethod.A_LA_LIVRAISON && payment === PaymentStatus.NON_PAYE;
      return { kind: 'deliver', label: collect ? 'Livrée et encaissée' : 'Marquer livrée', collect };
    }
    default:
      return null;
  }
}

/** Appeler / écrire au client, avec un message WhatsApp déjà rédigé. */
export function ContactButtons({
  phone,
  customerName,
  orderNumber,
  size = 'md',
}: {
  phone: string;
  customerName: string;
  /** Sans numéro (fiche client) : message d'accueil neutre. */
  orderNumber?: string;
  size?: 'sm' | 'md';
}) {
  const firstName = customerName.split(' ')[0];
  const whatsapp = whatsappLink(
    phone,
    orderNumber
      ? `Bonjour ${firstName}, c’est Maison Adama. Nous vous contactons au sujet de votre commande ${orderNumber}.`
      : `Bonjour ${firstName}, c’est Maison Adama.`,
  );
  const button = cn(
    'grid shrink-0 place-items-center rounded-full border border-filet bg-lin text-oud transition-colors duration-150 hover:border-filet-fort hover:bg-white',
    size === 'sm' ? 'size-10' : 'size-11',
  );
  const readable = formatSenegalPhone(phone);
  return (
    <>
      <a href={`tel:${phone}`} aria-label={`Appeler ${customerName} au ${readable}`} title={`Appeler · ${readable}`} className={button}>
        <Phone className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
      </a>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Écrire à ${customerName} sur WhatsApp (nouvel onglet)`}
          title="WhatsApp"
          className={button}
        >
          <MessageCircle className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
        </a>
      )}
    </>
  );
}
