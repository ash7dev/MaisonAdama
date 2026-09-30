'use client';

import { useState, useTransition } from 'react';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Banknote, LoaderCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatFullDate } from '@/lib/dates';
import { useToast } from '@/components/ui/toast';
import { markOrderPaidAction, markOrderUnpaidAction, refundOrderAction } from '../actions';
import { PaymentChip } from './order-ui';
import type { OrderDetail } from '../queries';

type Confirm = 'refund' | 'unpay' | null;

/** Paiement : vérifier (Wave), encaisser (livraison), rembourser, corriger une erreur. */
export default function PaymentPanel({ order }: { order: OrderDetail }) {
  const notify = useToast();
  const [reference, setReference] = useState(order.paymentReference ?? '');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [isPending, startTransition] = useTransition();

  const isWave = order.paymentMethod === PaymentMethod.WAVE;
  const cancelled = order.status === OrderStatus.ANNULEE;

  const act = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      notify(result.ok ? result.message! : result.error!, result.ok ? 'success' : 'error');
      if (result.ok) setConfirm(null);
    });

  return (
    <section aria-labelledby="payment-title" className="flex flex-col gap-4 rounded-[28px] border border-filet bg-lin p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="payment-title" className="text-title-sm text-encre">
          Paiement
        </h2>
        <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-sable/70 p-3.5">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', isWave ? 'bg-[#DCEBF3] text-[#1F5673]' : 'bg-paille text-or-profond')}>
          {isWave ? <Smartphone className="size-[18px]" strokeWidth={1.7} aria-hidden="true" /> : <Banknote className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-encre">{isWave ? 'Wave (code marchand)' : 'Paiement à la livraison'}</span>
          <span className="text-base font-semibold tabular-nums text-encre">{formatFCFA(order.total)}</span>
        </span>
      </div>

      {/* ── Non payée ──────────────────────────────────────────────── */}
      {order.paymentStatus === PaymentStatus.NON_PAYE && !cancelled && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.8125rem] leading-relaxed text-fumee">
            {isWave ? (
              <>
                Vérifiez dans <strong className="font-medium text-encre">Wave Business</strong> un paiement de{' '}
                <strong className="font-medium text-encre">{formatFCFA(order.total)}</strong> avec la référence{' '}
                <strong className="font-medium tabular-nums text-encre">{order.orderNumber}</strong>.
              </>
            ) : (
              <>Le livreur encaisse {formatFCFA(order.total)} à la remise du colis.</>
            )}
          </p>
          {isWave && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="payment-reference" className="text-[0.8125rem] font-medium text-encre">
                Référence de la transaction Wave <span className="font-normal text-fumee">(facultatif)</span>
              </label>
              <input
                id="payment-reference"
                value={reference}
                maxLength={80}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex. T_ABC123XYZ"
                className="h-11 rounded-xl border border-filet bg-white/80 px-3.5 text-sm tabular-nums text-encre outline-none placeholder:text-fumee/60 focus:border-or"
              />
              {order.paymentReference && (
                <p className="text-xs text-fumee">Indiquée par le client à la commande.</p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => act(() => markOrderPaidAction(order.id, reference))}
            disabled={isPending}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-oud px-5 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:opacity-70"
          >
            {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
            {isWave ? 'Paiement Wave reçu' : 'Marquer comme encaissée'}
          </button>
        </div>
      )}

      {order.paymentStatus === PaymentStatus.NON_PAYE && cancelled && (
        <p className="text-[0.8125rem] text-fumee">Commande annulée : aucun paiement attendu.</p>
      )}

      {/* ── Payée ──────────────────────────────────────────────────── */}
      {order.paymentStatus === PaymentStatus.PAYE && (
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-1.5 text-[0.8125rem]">
            {order.paidAt && (
              <div className="flex justify-between gap-3">
                <dt className="text-fumee">Encaissé</dt>
                <dd className="text-right text-encre" suppressHydrationWarning>{formatFullDate(order.paidAt)}</dd>
              </div>
            )}
            {order.paymentConfirmedBy && (
              <div className="flex justify-between gap-3">
                <dt className="text-fumee">Constaté par</dt>
                <dd className="text-encre">{order.paymentConfirmedBy.fullName}</dd>
              </div>
            )}
            {order.paymentReference && (
              <div className="flex justify-between gap-3">
                <dt className="text-fumee">Référence</dt>
                <dd className="tabular-nums text-encre">{order.paymentReference}</dd>
              </div>
            )}
          </dl>

          {confirm ? (
            <div className="flex flex-col gap-2.5 rounded-2xl bg-sable p-3.5 motion-safe:animate-reveal">
              <p className="text-[0.8125rem] leading-snug text-encre">
                {confirm === 'refund'
                  ? `Confirmer le remboursement de ${formatFCFA(order.total)} au client ?`
                  : 'Annuler ce paiement ? À utiliser seulement pour corriger une erreur de saisie.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => act(() => (confirm === 'refund' ? refundOrderAction(order.id) : markOrderUnpaidAction(order.id)))}
                  disabled={isPending}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-erreur px-4 text-[0.8125rem] font-medium text-lin disabled:opacity-70"
                >
                  {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
                  Confirmer
                </button>
                <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-full px-3 text-[0.8125rem] text-fumee hover:text-encre">
                  Retour
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <button type="button" onClick={() => setConfirm('refund')} className="h-9 text-[0.8125rem] font-medium text-oud underline-offset-4 hover:underline">
                Enregistrer un remboursement
              </button>
              <button type="button" onClick={() => setConfirm('unpay')} className="h-9 text-[0.8125rem] text-fumee underline-offset-4 hover:text-encre hover:underline">
                Erreur de saisie ?
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Remboursée ─────────────────────────────────────────────── */}
      {order.paymentStatus === PaymentStatus.REMBOURSE && order.refundedAt && (
        <p className="text-[0.8125rem] text-fumee" suppressHydrationWarning>
          Remboursée le {formatFullDate(order.refundedAt)}.
        </p>
      )}
    </section>
  );
}
