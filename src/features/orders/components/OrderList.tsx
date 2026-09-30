'use client';

import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatRelative, hoursSince } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { PendingSpinner } from '@/components/ui/link-pending';
import type { AdminOrderRow } from '../queries';
import { ContactButtons, nextStep, PaymentChip, StatusChip, WAITING_ALERT_HOURS } from './order-ui';
import OrderStepButton from './OrderStepButton';

function itemsSummary(order: AdminOrderRow): string {
  const shown = order.items.map((item) => `${item.quantity > 1 ? `${item.quantity} × ` : ''}${item.productName} ${item.variantLabel}`);
  const more = order._count.items - order.items.length;
  return more > 0 ? `${shown.join(', ')} +${more}` : shown.join(', ');
}

function Waiting({ order }: { order: AdminOrderRow }) {
  const late = order.status === 'EN_ATTENTE' && hoursSince(order.createdAt) >= WAITING_ALERT_HOURS;
  return (
    // Calculé au rendu serveur puis dans le navigateur : quelques secondes d'écart possibles.
    <span suppressHydrationWarning className={cn('flex items-center gap-1 text-[0.8125rem]', late ? 'font-medium text-alerte' : 'text-fumee')}>
      {late && <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />}
      {formatRelative(order.createdAt)}
      {late && <span className="sr-only">(client en attente)</span>}
    </span>
  );
}

/** Liste des commandes : tableau (desktop) et cartes (mobile), étape suivante en un clic. */
export default function OrderList({ orders }: { orders: AdminOrderRow[] }) {
  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────────────── */}
      <div className="hidden rounded-[28px] border border-filet bg-lin lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-filet text-[0.71875rem] uppercase tracking-[0.12em] text-fumee">
              <th scope="col" className="py-3.5 pl-6 pr-3 font-medium">Commande</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Client</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Articles</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Montant</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Statut</th>
              <th scope="col" className="py-3.5 pl-3 pr-6 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const step = nextStep(order.status, order.paymentMethod, order.paymentStatus);
              return (
                <tr key={order.id} className="group border-b border-filet/70 transition-colors duration-150 last:border-b-0 hover:bg-white/50">
                  <td className="py-4 pl-6 pr-3 align-top">
                    <Link href={`/admin/commandes/${order.id}`} className="flex flex-col gap-1 rounded-lg">
                      <span className="flex items-center gap-2 text-[0.9375rem] font-semibold tabular-nums text-encre decoration-or underline-offset-4 group-hover:underline">
                        {order.orderNumber}
                        <PendingSpinner />
                      </span>
                      <Waiting order={order} />
                    </Link>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.9375rem] font-medium text-encre">{order.customerName}</span>
                      <span className="text-[0.8125rem] tabular-nums text-fumee">
                        {formatSenegalPhone(order.customerPhone)} · {order.city}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[16rem] px-3 py-4 align-top">
                    <span className="line-clamp-2 text-[0.8125rem] leading-snug text-encre">{itemsSummary(order)}</span>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="whitespace-nowrap text-[0.9375rem] font-medium tabular-nums text-encre">{formatFCFA(order.total)}</span>
                      <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <StatusChip status={order.status} />
                  </td>
                  <td className="py-4 pl-3 pr-6 align-top">
                    <div className="flex items-center justify-end gap-2">
                      {step && <OrderStepButton orderId={order.id} step={step} size="sm" />}
                      <ContactButtons phone={order.customerPhone} customerName={order.customerName} orderNumber={order.orderNumber} size="sm" />
                      <Link
                        href={`/admin/commandes/${order.id}`}
                        aria-label={`Ouvrir la commande ${order.orderNumber}`}
                        className="grid size-10 place-items-center rounded-full text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre"
                      >
                        <ChevronRight className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile et tablette ──────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {orders.map((order) => {
          const step = nextStep(order.status, order.paymentMethod, order.paymentStatus);
          return (
            <li key={order.id} className="flex flex-col gap-3.5 rounded-3xl border border-filet bg-lin p-4">
              <Link href={`/admin/commandes/${order.id}`} className="flex flex-col gap-3">
                <span className="flex items-start justify-between gap-3">
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-[0.9375rem] font-semibold tabular-nums text-encre">
                      {order.orderNumber}
                      <PendingSpinner />
                    </span>
                    <Waiting order={order} />
                  </span>
                  <StatusChip status={order.status} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[0.9375rem] font-medium text-encre">{order.customerName}</span>
                  <span className="text-[0.8125rem] text-fumee">
                    {order.city} · {order.zoneName}
                  </span>
                </span>
                <span className="line-clamp-2 text-[0.8125rem] leading-snug text-fumee">{itemsSummary(order)}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold tabular-nums text-encre">{formatFCFA(order.total)}</span>
                  <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
                </span>
              </Link>
              <div className="flex items-stretch gap-2 border-t border-filet pt-3.5">
                {step ? (
                  <OrderStepButton orderId={order.id} step={step} className="flex-1" />
                ) : (
                  <Link
                    href={`/admin/commandes/${order.id}`}
                    className="flex h-11 flex-1 items-center justify-center rounded-full border border-filet-fort text-sm font-medium text-oud"
                  >
                    Voir le détail
                  </Link>
                )}
                <ContactButtons phone={order.customerPhone} customerName={order.customerName} orderNumber={order.orderNumber} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
