import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderStatus } from '@prisma/client';
import { ArrowLeft, ChevronRight, Clock, ImageIcon, MapPin, MessageSquareQuote, Tag } from 'lucide-react';
import { requireAdmin } from '@/features/auth/require-admin';
import { getOrderDetail } from '@/features/orders/queries';
import { ORDER_STATUS_UI } from '@/features/orders/labels';
import { ContactButtons, PaymentChip, StatusChip, WAITING_ALERT_HOURS } from '@/features/orders/components/order-ui';
import OrderProgress from '@/features/orders/components/OrderProgress';
import OrderActionsPanel from '@/features/orders/components/OrderActionsPanel';
import PaymentPanel from '@/features/orders/components/PaymentPanel';
import DeliveryFeeEditor from '@/features/orders/components/DeliveryFeeEditor';
import { PendingIcon } from '@/components/ui/link-pending';
import { formatFCFA } from '@/lib/money';
import { formatFullDate, formatRelative, hoursSince } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { productImageUrl } from '@/lib/supabase/storage';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderDetail(id);
  return { title: `${order ? order.orderNumber : 'Commande introuvable'} · Administration Maison Adama` };
}

const card = 'flex flex-col gap-4 rounded-[28px] border border-filet bg-lin p-5 sm:p-6';

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [, order] = await Promise.all([requireAdmin(), getOrderDetail(id)]);
  if (!order) notFound();

  const waitingLong = order.status === OrderStatus.EN_ATTENTE && hoursSince(order.createdAt) >= WAITING_ALERT_HOURS;
  const feeEditable = order.status !== OrderStatus.LIVREE && order.status !== OrderStatus.ANNULEE;
  const repeatCustomer = order.customer._count.orders > 1;

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pb-8 lg:pt-3">
      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 px-1 lg:min-h-[72px] lg:justify-center">
        <Link
          href="/admin/commandes"
          className="flex h-9 w-fit items-center gap-1.5 rounded-full pr-2 text-sm text-fumee transition-colors duration-150 hover:text-encre"
        >
          <PendingIcon className="size-4">
            <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </PendingIcon>
          Commandes
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[1.875rem] leading-none tabular-nums text-encre lg:text-[2.125rem]">{order.orderNumber}</h1>
          <StatusChip status={order.status} />
          <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-fumee" suppressHydrationWarning>
          Passée {formatRelative(order.createdAt)} · {formatFullDate(order.createdAt)}
          {waitingLong && (
            <span className="flex items-center gap-1 font-medium text-alerte">
              <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />
              Le client attend une confirmation
            </span>
          )}
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        {/* ── Colonne d'action (en premier sur mobile) ──────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:order-2">
          <OrderActionsPanel order={order} />

          {/* Client */}
          <section aria-labelledby="customer-title" className={card}>
            <h2 id="customer-title" className="text-title-sm text-encre">
              Client
            </h2>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-paille font-display text-lg text-oud">
                {order.customerName.charAt(0).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[0.9375rem] font-medium text-encre">{order.customerName}</span>
                <span className="text-sm tabular-nums text-fumee">{formatSenegalPhone(order.customerPhone)}</span>
                {order.customerEmail && (
                  <a href={`mailto:${order.customerEmail}`} className="truncate text-sm text-or-profond underline-offset-4 hover:underline">{order.customerEmail}</a>
                )}
              </div>
              <div className="flex gap-2">
                <ContactButtons phone={order.customerPhone} customerName={order.customerName} orderNumber={order.orderNumber} />
              </div>
            </div>
            <p className={cn('rounded-xl px-3 py-2 text-[0.8125rem]', repeatCustomer ? 'bg-succes-fond text-succes' : 'bg-sable text-fumee')}>
              {repeatCustomer
                ? `Déjà ${order.customer._count.orders} commandes passées à la Maison.`
                : 'Première commande de ce client.'}
            </p>
            <Link
              href={`/admin/clients/${order.customer.id}`}
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-filet-fort text-sm font-medium text-oud transition-colors duration-150 hover:bg-white"
            >
              Voir la fiche client
              <PendingIcon className="size-4">
                <ChevronRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
              </PendingIcon>
            </Link>
          </section>

          <PaymentPanel order={order} />
        </aside>

        {/* ── Colonne principale ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-4 lg:order-1 lg:gap-5">
          <section aria-label="Progression" className={card}>
            <OrderProgress order={order} />
          </section>

          {/* Articles */}
          <section aria-labelledby="items-title" className={card}>
            <h2 id="items-title" className="text-title-sm text-encre">
              Articles <span className="font-sans text-sm font-normal text-fumee">({order.items.reduce((n, i) => n + i.quantity, 0)})</span>
            </h2>
            <ul className="flex flex-col divide-y divide-filet/70">
              {order.items.map((item) => {
                const image = productImageUrl(item.product.images[0]?.storagePath);
                return (
                  <li key={item.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/admin/produits/${item.productId}`}
                      className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-paille/60"
                      aria-label={`Fiche produit : ${item.productName}`}
                    >
                      {image ? (
                        <Image src={image} alt="" fill sizes="56px" className="object-cover" />
                      ) : (
                        <ImageIcon className="size-5 text-or-profond/50" strokeWidth={1.4} aria-hidden="true" />
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[0.9375rem] font-medium leading-snug text-encre">
                        {item.productName} <span className="font-normal text-fumee">· {item.variantLabel}</span>
                      </span>
                      <span className="text-[0.8125rem] tabular-nums text-fumee">
                        {item.quantity} × {formatFCFA(item.unitPrice - item.unitDiscount)}
                        {item.unitDiscount > 0 && (
                          <span className="ml-1.5 line-through decoration-filet-fort">{formatFCFA(item.unitPrice)}</span>
                        )}
                      </span>
                      {item.promotionName && (
                        <span className="flex w-fit items-center gap-1 rounded-full bg-paille px-2 py-0.5 text-[0.6875rem] font-medium text-or-profond">
                          <Tag className="size-3" strokeWidth={2} aria-hidden="true" />
                          {item.promotionName}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[0.9375rem] font-medium tabular-nums text-encre">{formatFCFA(item.lineTotal)}</span>
                  </li>
                );
              })}
            </ul>

            <dl className="flex flex-col gap-2 border-t border-filet pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-fumee">Sous-total</dt>
                <dd className="tabular-nums text-encre">{formatFCFA(order.subtotal)}</dd>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-fumee">Remises</dt>
                  <dd className="tabular-nums text-succes">− {formatFCFA(order.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fumee">Livraison</dt>
                <dd className="tabular-nums text-encre">{formatFCFA(order.deliveryFee)}</dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-filet pt-3">
                <dt className="font-medium text-encre">Total</dt>
                <dd className="font-display text-[1.5rem] tabular-nums text-encre">{formatFCFA(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Livraison */}
          <section aria-labelledby="delivery-title" className={card}>
            <h2 id="delivery-title" className="text-title-sm text-encre">
              Livraison
            </h2>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sable text-or-profond">
                <MapPin className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <address className="flex flex-col gap-0.5 text-[0.9375rem] not-italic leading-snug text-encre">
                <span className="font-medium">{order.address}</span>
                <span className="text-fumee">
                  {order.city}, {order.region} · zone {order.zoneName}
                </span>
              </address>
            </div>
            {order.landmark && (
              <p className="rounded-2xl bg-paille/50 px-4 py-3 text-[0.9375rem] leading-snug text-encre">
                <span className="mb-0.5 block text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-or-profond">Point de repère</span>
                {order.landmark}
              </p>
            )}
            {order.customerNote && (
              <p className="flex items-start gap-2.5 rounded-2xl bg-sable/70 px-4 py-3 text-sm leading-relaxed text-encre">
                <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-or-profond" strokeWidth={1.7} aria-hidden="true" />
                <span>
                  <span className="sr-only">Note du client : </span>« {order.customerNote} »
                </span>
              </p>
            )}
            <div className="flex flex-col gap-2 border-t border-filet pt-4">
              <span className="text-[0.8125rem] font-medium text-fumee">Frais de livraison</span>
              <DeliveryFeeEditor
                orderId={order.id}
                defaultFee={order.defaultDeliveryFee}
                fee={order.deliveryFee}
                note={order.deliveryFeeNote}
                editable={feeEditable}
              />
            </div>
          </section>

          {/* Historique */}
          <section aria-labelledby="history-title" className={card}>
            <h2 id="history-title" className="text-title-sm text-encre">
              Historique
            </h2>
            <ol className="flex flex-col">
              {order.statusHistory.map((entry, index) => {
                const last = index === order.statusHistory.length - 1;
                return (
                  <li key={entry.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {!last && <span aria-hidden="true" className="absolute left-[7px] top-5 h-full w-px bg-filet" />}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative mt-1 size-[15px] shrink-0 rounded-full ring-4 ring-lin',
                        entry.toStatus === OrderStatus.ANNULEE ? 'bg-erreur' : last ? 'bg-or' : 'bg-oud',
                      )}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-encre">
                        {entry.fromStatus ? ORDER_STATUS_UI[entry.toStatus].label : 'Commande reçue'}
                      </span>
                      <span className="text-[0.8125rem] text-fumee" suppressHydrationWarning>
                        {formatFullDate(entry.createdAt)} · {entry.admin ? entry.admin.fullName : 'passée sur la boutique'}
                      </span>
                      {entry.note && <span className="text-[0.8125rem] text-encre">{entry.note}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
