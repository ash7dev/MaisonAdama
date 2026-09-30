'use client';

import { useState, useTransition } from 'react';
import { ArrowRight, LoaderCircle, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { confirmOrderAction, deliverOrderAction, shipOrderAction } from '../actions';
import type { NextStep } from './order-ui';

/**
 * Bouton « étape suivante » (liste et détail). Expédier une commande Wave dont le
 * paiement n'est pas vérifié demande une confirmation explicite, en place.
 */
export default function OrderStepButton({
  orderId,
  step,
  size = 'md',
  className,
}: {
  orderId: string;
  step: NextStep;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const notify = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = () =>
    startTransition(async () => {
      const result =
        step.kind === 'confirm'
          ? await confirmOrderAction(orderId)
          : step.kind === 'ship'
            ? await shipOrderAction(orderId)
            : await deliverOrderAction(orderId, step.collect);
      setConfirming(false);
      notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
    });

  const height = size === 'sm' ? 'h-10 px-4 text-[0.8125rem]' : size === 'lg' ? 'h-14 px-6 text-[0.9375rem]' : 'h-11 px-5 text-sm';

  if (confirming) {
    return (
      <div role="group" aria-label="Confirmer l’expédition" className={cn('flex flex-col gap-2 rounded-2xl bg-alerte-fond p-3 motion-safe:animate-reveal', className)}>
        <p className="flex items-start gap-2 text-[0.8125rem] leading-snug text-alerte">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Paiement Wave non vérifié. Expédier quand même ?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={run}
            disabled={isPending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-oud px-4 text-[0.8125rem] font-medium text-sur-oud disabled:opacity-70"
          >
            {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
            Expédier
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-full px-3 text-[0.8125rem] text-fumee hover:text-encre">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (step.kind === 'ship' && step.warnUnpaidWave ? setConfirming(true) : run())}
      disabled={isPending}
      className={cn(
        'group flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-oud font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-80',
        height,
        className,
      )}
    >
      {isPending ? (
        <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
      ) : null}
      {step.label}
      {!isPending && size === 'lg' && (
        <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}
