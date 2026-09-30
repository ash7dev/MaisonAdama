'use client';

import { useState, useTransition } from 'react';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { CircleCheck, LoaderCircle, PackageCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { cancelOrderAction, deliverOrderAction } from '../actions';
import { nextStep } from './order-ui';
import OrderStepButton from './OrderStepButton';
import type { OrderDetail } from '../queries';

const CANCEL_REASONS = ['Client injoignable', 'Demande du client', 'Rupture de stock', 'Adresse non desservie'];

const HINTS: Partial<Record<OrderStatus, string>> = {
  EN_ATTENTE: 'Appelez ou écrivez au client pour valider la commande et l’adresse, puis confirmez.',
  CONFIRMEE: 'Préparez le colis puis confirmez son départ avec le livreur.',
  EN_LIVRAISON: 'Le colis est en route. Marquez-le livré à la remise au client.',
};

/** Action principale de la commande (étape suivante) et annulation motivée. */
export default function OrderActionsPanel({ order }: { order: OrderDetail }) {
  const notify = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isPending, startTransition] = useTransition();

  const step = nextStep(order.status, order.paymentMethod, order.paymentStatus);
  const canCancel = order.status === OrderStatus.EN_ATTENTE || order.status === OrderStatus.CONFIRMEE;
  const paid = order.paymentStatus === PaymentStatus.PAYE;
  const fullReason = [reason, details.trim()].filter(Boolean).join(' — ');

  if (!step && !canCancel) {
    return (
      <section aria-label="Actions" className="flex items-center gap-3 rounded-[28px] border border-filet bg-lin p-5">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full',
            order.status === OrderStatus.LIVREE ? 'bg-succes-fond text-succes' : 'bg-sable text-fumee',
          )}
        >
          {order.status === OrderStatus.LIVREE ? (
            <PackageCheck className="size-5" strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <XCircle className="size-5" strokeWidth={1.7} aria-hidden="true" />
          )}
        </span>
        <p className="text-sm text-encre">
          {order.status === OrderStatus.LIVREE ? 'Commande terminée : livrée au client.' : 'Commande annulée.'}
        </p>
      </section>
    );
  }

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelOrderAction(order.id, fullReason);
      notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
      if (result.ok) setCancelling(false);
    });

  const deliverWithoutCollect = () =>
    startTransition(async () => {
      const result = await deliverOrderAction(order.id, false);
      notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
    });

  return (
    <section aria-labelledby="actions-title" className="flex flex-col gap-4 rounded-[28px] bg-oud p-5 text-sur-oud sm:p-6">
      <div className="flex flex-col gap-1.5">
        <h2 id="actions-title" className="text-title-sm text-sur-oud">
          Prochaine étape
        </h2>
        {HINTS[order.status] && <p className="text-[0.8125rem] leading-relaxed text-sur-oud/70">{HINTS[order.status]}</p>}
      </div>

      {step && (
        <div className="flex flex-col gap-2">
          <OrderStepButton orderId={order.id} step={step} size="lg" className="w-full bg-sur-oud text-oud hover:bg-paille" />
          {step.kind === 'deliver' && step.collect && (
            <button
              type="button"
              onClick={deliverWithoutCollect}
              disabled={isPending}
              className="h-10 rounded-full text-[0.8125rem] text-sur-oud/75 transition-colors duration-150 hover:text-sur-oud disabled:opacity-60"
            >
              Livrée, mais pas encore encaissée
            </button>
          )}
        </div>
      )}

      {canCancel && !cancelling && (
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-full text-[0.8125rem] text-sur-oud/70 transition-colors duration-150 hover:bg-sur-oud/8 hover:text-sur-oud"
        >
          <XCircle className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Annuler la commande
        </button>
      )}

      {canCancel && cancelling && (
        <div className="flex flex-col gap-3.5 rounded-2xl bg-lin p-4 text-encre motion-safe:animate-reveal">
          {paid ? (
            <p className="text-sm leading-relaxed">
              Cette commande est <strong className="font-medium">payée</strong>. Enregistrez d’abord le remboursement (bloc
              Paiement), puis annulez-la.
            </p>
          ) : (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Pourquoi annuler ?</legend>
                <div className="flex flex-wrap gap-2">
                  {CANCEL_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={reason === r}
                      onClick={() => setReason(reason === r ? '' : r)}
                      className={cn(
                        'h-9 rounded-full px-3.5 text-[0.8125rem] transition-colors duration-150',
                        reason === r ? 'bg-oud text-sur-oud' : 'border border-filet hover:border-filet-fort',
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cancel-details" className="text-[0.8125rem] font-medium">
                  Précision {reason ? <span className="font-normal text-fumee">(facultatif)</span> : null}
                </label>
                <input
                  id="cancel-details"
                  value={details}
                  maxLength={200}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Ex. 3 appels sans réponse"
                  className="h-11 rounded-xl border border-filet bg-white/80 px-3.5 text-sm outline-none placeholder:text-fumee/60 focus:border-or"
                />
              </div>
              <p className="flex items-start gap-2 text-[0.8125rem] text-fumee">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-succes" strokeWidth={1.8} aria-hidden="true" />
                Le stock des articles sera remis en rayon automatiquement.
              </p>
            </>
          )}
          <div className="flex gap-2">
            {!paid && (
              <button
                type="button"
                onClick={cancel}
                disabled={!fullReason || isPending}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-erreur px-4 text-sm font-medium text-lin transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
                Annuler la commande
              </button>
            )}
            <button
              type="button"
              onClick={() => setCancelling(false)}
              className="h-11 rounded-full px-4 text-sm text-fumee transition-colors hover:text-encre"
            >
              {paid ? 'Fermer' : 'Retour'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
