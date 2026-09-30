import { OrderStatus } from '@prisma/client';
import { Check, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/dates';
import type { OrderDetail } from '../queries';

const STEPS = [
  { status: OrderStatus.EN_ATTENTE, label: 'Reçue', date: (o: OrderDetail) => o.createdAt },
  { status: OrderStatus.CONFIRMEE, label: 'Confirmée', date: (o: OrderDetail) => o.confirmedAt },
  { status: OrderStatus.EN_LIVRAISON, label: 'En livraison', date: (o: OrderDetail) => o.shippedAt },
  { status: OrderStatus.LIVREE, label: 'Livrée', date: (o: OrderDetail) => o.deliveredAt },
];

/** Frise de progression : étapes franchies (datées), étape en cours, étapes à venir. */
export default function OrderProgress({ order }: { order: OrderDetail }) {
  if (order.status === OrderStatus.ANNULEE) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-erreur-fond px-4 py-3.5 text-erreur">
        <CircleX className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium">Commande annulée {order.cancelledAt && formatRelative(order.cancelledAt)}</span>
          {order.cancelReason && <span className="text-erreur/85">Motif : {order.cancelReason}</span>}
          <span className="text-erreur/85">Le stock des articles a été remis en rayon.</span>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.status === order.status);

  return (
    <ol className="grid grid-cols-4" aria-label="Progression de la commande">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const date = step.date(order);
        return (
          <li key={step.status} className="relative flex flex-col items-center gap-2 text-center" aria-current={current ? 'step' : undefined}>
            {/* Trait vers l'étape suivante */}
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn('absolute left-1/2 top-[15px] h-0.5 w-full', index < currentIndex ? 'bg-or' : 'bg-filet')}
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-8 place-items-center rounded-full text-xs font-semibold',
                done ? 'bg-oud text-sur-oud' : 'bg-lin text-fumee ring-2 ring-inset ring-filet',
                current && 'ring-4 ring-or/30',
              )}
            >
              {done && !current ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : index + 1}
            </span>
            <span className={cn('text-[0.8125rem] leading-tight', done ? 'font-medium text-encre' : 'text-fumee')}>{step.label}</span>
            <span suppressHydrationWarning className="min-h-4 text-[0.6875rem] leading-tight text-fumee">
              {done && date ? formatRelative(date) : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
