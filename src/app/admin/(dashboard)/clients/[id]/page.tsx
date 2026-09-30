import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight, ImageIcon, MapPin, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { requireAdmin } from '@/features/auth/require-admin';
import { getCustomerDetail, type CustomerDetail } from '@/features/customers/queries';
import { CustomerAvatar, SegmentBadges } from '@/features/customers/customer-ui';
import CustomerNoteEditor from '@/features/customers/components/CustomerNoteEditor';
import { PaymentChip, StatusChip } from '@/features/orders/components/order-ui';
import { PendingIcon, PendingSpinner } from '@/components/ui/link-pending';
import { formatFCFA } from '@/lib/money';
import { formatRelative } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/whatsapp';
import { productImageUrl } from '@/lib/supabase/storage';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = UUID.test(id) ? await getCustomerDetail(id) : null;
  return { title: `${customer ? customer.name : 'Client introuvable'} · Administration Maison Adama` };
}

const card = 'flex flex-col gap-4 rounded-[28px] border border-filet bg-lin p-5 sm:p-6';
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Dakar' });
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Dakar' });
const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

function itemsSummary(order: CustomerDetail['orders'][number]): string {
  const shown = order.items.map((item) => `${item.quantity > 1 ? `${item.quantity} × ` : ''}${item.productName} ${item.variantLabel}`);
  const more = order._count.items - order.items.length;
  return more > 0 ? `${shown.join(', ')} +${more}` : shown.join(', ');
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: React.ReactNode; tone?: 'oud' }) {
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-3xl p-4 sm:p-5', tone === 'oud' ? 'bg-oud text-sur-oud' : 'border border-filet bg-lin')}>
      <dt className={cn('text-[0.6875rem] font-medium uppercase tracking-[0.16em]', tone === 'oud' ? 'text-sur-oud/70' : 'text-fumee')}>{label}</dt>
      <dd className={cn('font-display text-[1.5rem] leading-none tabular-nums sm:text-[1.75rem]', tone === 'oud' ? 'text-sur-oud' : 'text-encre')}>{value}</dd>
      {hint && <dd className={cn('text-xs', tone === 'oud' ? 'text-sur-oud/70' : 'text-fumee')}>{hint}</dd>}
    </div>
  );
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [, customer] = await Promise.all([requireAdmin(), getCustomerDetail(id)]);
  if (!customer) notFound();

  const { stats } = customer;
  const firstName = customer.name.split(' ')[0];
  const whatsapp = whatsappLink(customer.phone, `Bonjour ${firstName}, c’est Maison Adama.`);
  const phone = formatSenegalPhone(customer.phone);

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pb-8 lg:pt-3">
      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 px-1 lg:min-h-[72px] lg:justify-center">
        <Link href="/admin/clients" className="flex h-9 w-fit items-center gap-1.5 rounded-full pr-2 text-sm text-fumee transition-colors duration-150 hover:text-encre">
          <PendingIcon className="size-4">
            <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </PendingIcon>
          Clients
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <CustomerAvatar name={customer.name} size="lg" />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="truncate text-[1.75rem] leading-none text-encre lg:text-[2.125rem]">{customer.name}</h1>
                <SegmentBadges isLoyal={stats.isLoyal} isNew={stats.isNew} isDormant={stats.isDormant} />
              </div>
              <p className="text-sm text-fumee">
                <span className="tabular-nums text-encre">{phone}</span> · client depuis {monthYear.format(customer.createdAt)}
              </p>
              {customer.aliases.length > 0 && (
                <p className="text-[0.8125rem] text-fumee">
                  A aussi commandé sous : <span className="text-encre">{customer.aliases.join(', ')}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-filet-fort bg-lin px-5 text-sm font-medium text-oud transition-colors duration-150 hover:bg-white sm:flex-none"
            >
              <Phone className="size-4" strokeWidth={1.8} aria-hidden="true" />
              Appeler
            </a>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover sm:flex-none"
              >
                <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" />
                WhatsApp
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Chiffres clés ───────────────────────────────────────────── */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          tone="oud"
          label="Total dépensé"
          value={formatFCFA(stats.spent)}
          hint={stats.savings > 0 ? `dont ${formatFCFA(stats.savings)} de remises` : 'Commandes livrées'}
        />
        <Stat
          label="Commandes"
          value={String(stats.ordersCount)}
          hint={
            stats.openCount > 0 ? (
              <span className="font-medium text-[#1F5673]">
                {stats.openCount} en cours · {formatFCFA(stats.openAmount)}
              </span>
            ) : stats.cancelledCount > 0 ? (
              `+ ${stats.cancelledCount} annulée${stats.cancelledCount > 1 ? 's' : ''}`
            ) : (
              'Aucune en cours'
            )
          }
        />
        <Stat label="Panier moyen" value={stats.averageBasket !== null ? formatFCFA(stats.averageBasket) : '—'} hint="Sur les commandes livrées" />
        <Stat
          label="Livrées"
          value={stats.deliveryRate !== null ? percent.format(stats.deliveryRate) : '—'}
          hint={
            stats.lastOrderAt ? <span suppressHydrationWarning>Dernière commande {formatRelative(stats.lastOrderAt)}</span> : 'Aucune commande aboutie'
          }
        />
      </dl>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        {/* ── Historique ───────────────────────────────────────────── */}
        <section aria-labelledby="orders-title" className={cn(card, 'min-w-0 p-0 sm:p-0')}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 id="orders-title" className="text-title-sm text-encre">
              Historique des commandes
            </h2>
            <span className="text-sm tabular-nums text-fumee">{customer.orders.length}</span>
          </div>
          {customer.orders.length === 0 ? (
            <p className="px-6 pb-8 pt-2 text-center text-sm text-fumee">Aucune commande.</p>
          ) : (
            <ul className="flex flex-col pb-2">
              {customer.orders.map((order) => (
                <li key={order.id} className="border-t border-filet/70 first:border-t-0">
                  <Link
                    href={`/admin/commandes/${order.id}`}
                    className={cn(
                      'group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-white/50 sm:px-6',
                      order.status === 'ANNULEE' && 'opacity-70',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sable text-or-profond">
                      <ShoppingBag className="size-[17px]" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold tabular-nums text-encre decoration-or underline-offset-4 group-hover:underline">
                          {order.orderNumber}
                          <PendingSpinner />
                        </span>
                        <span className="text-[0.8125rem] text-fumee">
                          {shortDate.format(order.createdAt)} · {order.city}
                        </span>
                      </span>
                      <span className="truncate text-[0.8125rem] text-encre">{itemsSummary(order)}</span>
                      <span className="flex flex-wrap gap-1.5 pt-0.5 sm:hidden">
                        <StatusChip status={order.status} />
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                      <span className="text-[0.9375rem] font-medium tabular-nums text-encre">{formatFCFA(order.total)}</span>
                      <span className="flex gap-1.5">
                        <StatusChip status={order.status} />
                        <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.9375rem] font-medium tabular-nums text-encre sm:hidden">{formatFCFA(order.total)}</span>
                    <ChevronRight className="size-[18px] shrink-0 text-fumee" strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Colonne latérale ─────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <CustomerNoteEditor key={customer.updatedAt} customerId={customer.id} initialNote={customer.adminNote} initialUpdatedAt={customer.updatedAt} />

          <section aria-labelledby="favorites-title" className={card}>
            <h2 id="favorites-title" className="text-title-sm text-encre">
              Produits préférés
            </h2>
            {customer.favorites.length === 0 ? (
              <p className="text-sm text-fumee">Apparaîtront après sa première commande.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {customer.favorites.map((product, index) => {
                  const url = productImageUrl(product.storage_path);
                  return (
                    <li key={product.product_id}>
                      <Link href={`/admin/produits/${product.product_id}`} className="group flex items-center gap-3">
                        <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-paille/60">
                          {url ? (
                            <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                          ) : (
                            <ImageIcon className="size-4 text-or-profond/50" strokeWidth={1.4} aria-hidden="true" />
                          )}
                          {index === 0 && customer.favorites.length > 1 && (
                            <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-or ring-2 ring-lin" aria-hidden="true" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium text-encre decoration-or underline-offset-4 group-hover:underline">{product.name}</span>
                          <span className="text-xs text-fumee">
                            {product.quantity} acheté{product.quantity > 1 ? 's' : ''} · {product.orders} commande{product.orders > 1 ? 's' : ''}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="addresses-title" className={card}>
            <h2 id="addresses-title" className="text-title-sm text-encre">
              Adresses de livraison
            </h2>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-fumee">Aucune adresse enregistrée.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {customer.addresses.map((address, index) => (
                  <li key={`${address.region}-${address.city}-${address.address}`} className="flex gap-3">
                    <MapPin className={cn('mt-0.5 size-4 shrink-0', index === 0 ? 'text-or-profond' : 'text-fumee')} strokeWidth={1.8} aria-hidden="true" />
                    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                      <span className="text-encre">{address.address}</span>
                      <span className="text-[0.8125rem] text-fumee">
                        {address.city}, {address.region} · {address.zone_name}
                      </span>
                      {address.landmark && <span className="text-[0.8125rem] italic text-fumee">Repère : {address.landmark}</span>}
                      <span className="text-xs text-fumee">
                        {index === 0 ? 'Dernière utilisée' : `Utilisée ${address.uses} fois`}
                        {index === 0 && address.uses > 1 && ` · ${address.uses} fois`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
