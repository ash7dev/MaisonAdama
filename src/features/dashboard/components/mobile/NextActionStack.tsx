'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CircleCheck, Clock, ImageIcon, MessageCircle, Phone, Smartphone, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSenegalPhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/whatsapp';
import { productImageUrl } from '@/lib/supabase/storage';
import { nextStep, WAITING_ALERT_HOURS } from '@/features/orders/components/order-ui';
import OrderStepButton from '@/features/orders/components/OrderStepButton';
import type { DashboardData } from '../../queries';
import { money, num } from '../../format';

type Item = DashboardData['queue'][number];
type OrderItem = Extract<Item, { orderId: string }>;

/** « 12 min », « 2 h 40 », « 3 j » */
function waited(since: string): string {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(since).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return minutes % 60 ? `${h} h ${String(minutes % 60).padStart(2, '0')}` : `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

const KIND_UI = {
  confirm: { label: 'À confirmer', chip: 'bg-alerte-fond text-alerte' },
  verify: { label: 'Wave à vérifier', chip: 'bg-[#DCEBF3] text-[#1F5673]' },
  ship: { label: 'À expédier', chip: 'bg-paille text-oud' },
  deliver: { label: 'En livraison', chip: 'bg-[#DCEBF3] text-[#1F5673]' },
  restock: { label: 'Stock bas', chip: 'bg-erreur-fond text-erreur' },
} as const;

function OrderCard({ item }: { item: OrderItem }) {
  const step = nextStep(item.status, item.paymentMethod, item.paymentStatus);
  const late = item.kind === 'confirm' && (Date.now() - new Date(item.since).getTime()) / 3_600_000 >= WAITING_ALERT_HOURS;
  const firstName = item.customerName.split(' ')[0];
  const wa = whatsappLink(item.customerPhone, `Bonjour ${firstName}, c’est Maison Adama. Nous vous contactons au sujet de votre commande ${item.orderNumber}.`);
  const img = productImageUrl(item.firstItem?.storagePath);
  const initials = item.customerName.split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : '')).join('').toUpperCase();

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span suppressHydrationWarning className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold', late ? 'bg-alerte-fond text-alerte' : KIND_UI[item.kind].chip)}>
          {late ? <TriangleAlert className="size-3.5" strokeWidth={2.2} aria-hidden="true" /> : <Clock className="size-3.5" strokeWidth={2.2} aria-hidden="true" />}
          {KIND_UI[item.kind].label} · {waited(item.since)}
        </span>
        <Link href={`/admin/commandes/${item.orderId}`} className="whitespace-nowrap text-xs font-semibold tabular-nums text-fumee hover:text-encre">
          {item.orderNumber.replace(/^CMD-\d{4}-/, 'CMD-')}
        </Link>
      </div>

      <Link href={`/admin/clients/${item.customerId}`} className="flex items-center gap-3.5">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-paille font-display text-[1.1875rem] text-oud">{initials}</span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-display text-[1.375rem] leading-none text-encre">{item.customerName}</span>
          <span className="truncate text-[0.8125rem] text-fumee">
            {item.city} · {item.customerOrders > 1 ? `${item.customerOrders}ᵉ commande` : 'première commande'}
          </span>
        </span>
      </Link>

      <div className="flex items-center gap-3 rounded-[20px] bg-lin p-3">
        <span className="relative grid h-[54px] w-11 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-paille/60">
          {img ? <Image src={img} alt="" fill sizes="44px" className="object-cover" /> : <ImageIcon className="size-4 text-or-profond/50" strokeWidth={1.4} aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-encre">{item.firstItem?.name ?? 'Commande'}</span>
          <span className="truncate text-xs text-fumee">
            {item.firstItem ? `${item.firstItem.label} · ×${item.firstItem.quantity}` : ''}
            {item.otherItems ? ` · +${item.otherItems} article${item.otherItems > 1 ? 's' : ''}` : ''}
          </span>
        </span>
        <span className="flex flex-col items-end gap-0.5">
          <span className="whitespace-nowrap text-base font-bold tabular-nums text-encre">{num(item.total)}</span>
          <span className="whitespace-nowrap text-[0.6875rem] text-fumee">{item.paymentMethod === 'WAVE' ? (item.paymentStatus === 'PAYE' ? 'Wave · payé' : 'Wave') : 'à la livraison'}</span>
        </span>
      </div>

      {item.kind === 'verify' && (
        <p className="rounded-2xl bg-[#DCEBF3] px-3.5 py-3 text-[0.8125rem] leading-snug text-[#1F5673]">
          Cherchez {money(item.total)} dans Wave Business
          {item.paymentReference ? <> · réf. client <strong className="font-semibold">{item.paymentReference}</strong></> : ''}.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <a href={`tel:${item.customerPhone}`} aria-label={`Appeler ${item.customerName} au ${formatSenegalPhone(item.customerPhone)}`} className="flex h-12 items-center justify-center gap-2 rounded-full bg-lin text-sm font-semibold text-oud ring-1 ring-inset ring-filet-fort">
          <Phone className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Appeler
        </a>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-lin text-sm font-semibold text-oud ring-1 ring-inset ring-filet-fort">
            <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" />
            WhatsApp
          </a>
        )}
      </div>

      {item.kind === 'verify' ? (
        <Link href={`/admin/commandes/${item.orderId}`} className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#1F5673] text-[0.9375rem] font-semibold text-white">
          <Smartphone className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          Vérifier le paiement
        </Link>
      ) : step ? (
        <OrderStepButton orderId={item.orderId} step={step} size="lg" className="w-full" />
      ) : null}
    </>
  );
}

function RestockCard({ item }: { item: Extract<Item, { kind: 'restock' }> }) {
  const img = productImageUrl(item.storagePath);
  return (
    <>
      <span className={cn('inline-flex h-7 w-fit items-center gap-1.5 rounded-full px-3 text-xs font-semibold', KIND_UI.restock.chip)}>
        <TriangleAlert className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        {item.daysLeft !== null ? `Rupture dans ${item.daysLeft} j` : 'Stock bas'}
      </span>
      <div className="flex items-center gap-4">
        <span className="relative grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-paille/60">
          {img ? <Image src={img} alt="" fill sizes="64px" className="object-cover" /> : <ImageIcon className="size-5 text-or-profond/50" strokeWidth={1.4} aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-[1.375rem] leading-tight text-encre">{item.name}</span>
          <span className="text-[0.8125rem] text-fumee">{item.label}</span>
        </span>
      </div>
      <p className="flex items-baseline gap-2 rounded-[20px] bg-lin px-4 py-3">
        <span className="font-display text-[2rem] leading-none tabular-nums text-erreur">{item.stock}</span>
        <span className="text-sm text-fumee">en stock{item.daysLeft !== null ? ` · environ ${item.daysLeft} jour${item.daysLeft > 1 ? 's' : ''} de ventes` : ''}</span>
      </p>
      <Link href={`/admin/produits/${item.productId}`} className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-oud text-[0.9375rem] font-semibold text-sur-oud">
        Ajuster le stock
        <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      </Link>
    </>
  );
}

/**
 * Une action à la fois, la plus urgente d'abord. « Plus tard » la renvoie en
 * fin de file (pour cette visite seulement) ; une action faite disparaît au
 * rechargement des données.
 */
export default function NextActionStack({ queue, firstRun = false }: { queue: DashboardData['queue']; firstRun?: boolean }) {
  const [order, setOrder] = useState(() => queue.map((i) => i.key));
  const [index, setIndex] = useState(0);

  // Nouvelles données (action faite, nouvelle commande) : on garde l'ordre choisi, on ajoute le reste.
  useEffect(() => {
    setOrder((current) => {
      const keys = new Set(queue.map((i) => i.key));
      const kept = current.filter((k) => keys.has(k));
      return [...kept, ...queue.map((i) => i.key).filter((k) => !kept.includes(k))];
    });
  }, [queue]);

  const items = useMemo(() => {
    const byKey = new Map(queue.map((i) => [i.key, i]));
    return order.map((k) => byKey.get(k)).filter((i): i is Item => Boolean(i));
  }, [order, queue]);

  const safeIndex = items.length ? Math.min(index, items.length - 1) : 0;
  const item = items[safeIndex];

  if (!item) {
    return (
      <section aria-labelledby="next-title" className="flex flex-col gap-3.5">
        <h2 id="next-title" className="px-1 text-[1.375rem] leading-tight text-encre">Prochaine action</h2>
        <div className="flex flex-col items-center gap-3 rounded-[32px] bg-white px-6 py-10 text-center shadow-[0_24px_50px_rgb(74_46_28/0.1)]">
          <span className="grid size-14 place-items-center rounded-full bg-succes-fond text-succes">
            <CircleCheck className="size-7" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <p className="font-display text-[1.375rem] text-encre">{firstRun ? 'Prête pour la première commande' : 'Tout est à jour'}</p>
          <p className="max-w-xs text-sm text-fumee">
            {firstRun
              ? 'Dès qu’un client commande, la prochaine action (appeler, confirmer, expédier) apparaîtra ici.'
              : 'Aucune commande n’attend, aucun stock bas. Profitez-en.'}
          </p>
        </div>
      </section>
    );
  }

  const later = () => {
    setOrder((current) => [...current.filter((k) => k !== item.key), item.key]);
  };

  return (
    <section aria-labelledby="next-title" className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="next-title" className="text-[1.375rem] leading-tight text-encre">Prochaine action</h2>
        <span aria-live="polite" className="text-[0.8125rem] tabular-nums text-fumee">
          <strong className="text-encre">{safeIndex + 1}</strong> sur {items.length}
        </span>
      </div>

      <div className="relative pb-[22px]">
        {items.length > 2 && <span aria-hidden="true" className="absolute inset-x-7 bottom-0 h-14 rounded-[30px] bg-[#D8C4A0]" />}
        {items.length > 1 && <span aria-hidden="true" className="absolute inset-x-3.5 bottom-[11px] h-14 rounded-[30px] bg-paille" />}
        <article key={item.key} className="relative flex flex-col gap-4 rounded-[32px] bg-white p-5 shadow-[0_24px_50px_rgb(74_46_28/0.16)] motion-safe:animate-reveal">
          {item.kind === 'restock' ? <RestockCard item={item} /> : <OrderCard item={item} />}

          {items.length > 1 && (
            <div className="-mb-1 flex items-center justify-between">
              <button type="button" onClick={later} className="h-10 rounded-full px-1 text-xs text-fumee hover:text-encre">
                Plus tard
              </button>
              <span aria-hidden="true" className="flex items-center gap-[5px]">
                {items.slice(0, 6).map((i, n) => (
                  <span key={i.key} className={cn('h-1.5 rounded-full transition-all duration-200', n === Math.min(safeIndex, 5) ? 'w-[18px] bg-oud' : 'w-1.5 bg-filet-fort')} />
                ))}
              </span>
              <button
                type="button"
                onClick={() => setIndex((safeIndex + 1) % items.length)}
                className="flex h-10 items-center gap-1 rounded-full px-1 text-xs font-semibold text-or-profond hover:text-oud"
              >
                Suivante <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
