'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Info, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, TriangleAlert, Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { whatsappLink } from '@/lib/whatsapp';
import ProductVisual from '@/features/shop/components/ProductVisual';
import ShopCard from '@/features/shop/components/ShopCard';
import type { ShopProduct } from '@/features/shop/queries';
import { useCartStore, type CartItem } from '../store';
import { validateCartAction, type CartLineStatus } from '../actions';

export type CartZone = { id: string; name: string; defaultFee: number; estimatedDelay: string | null };

const ZONE_KEY = 'ma-delivery-zone';
const noop = () => () => {};

type Notice = { kind: 'price' | 'qty' | 'gone'; text: string };

// -----------------------------------------------------------------------------
//  Ligne d'article
// -----------------------------------------------------------------------------

function CartLine({
  item,
  status,
  notice,
  onQty,
  onRemove,
}: {
  item: CartItem;
  status: CartLineStatus | undefined;
  notice: Notice | undefined;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  const unavailable = status ? !status.available || status.stock <= 0 : false;
  const max = status ? Math.max(1, Math.min(10, status.stock)) : 10;
  const unit = item.unitPrice - item.unitDiscount;
  const href = status ? `/produits/${status.slug}` : '#';

  return (
    <li className={cn('flex gap-4 border-b border-filet py-5 first:pt-0 last:border-b-0 sm:gap-5', unavailable && 'opacity-70')}>
      <Link href={href} className="relative shrink-0 overflow-hidden rounded-[20px]" aria-label={item.productName}>
        <ProductVisual
          image={item.imageStoragePath ? { path: item.imageStoragePath, alt: null } : null}
          name={item.productName}
          categorySlug={status?.categorySlug ?? ''}
          seed={item.productId}
          sizes="112px"
          bottleClassName="w-[38%]"
          className="h-[7.25rem] w-[5.75rem] sm:h-[8.5rem] sm:w-[6.75rem]"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {status && <span className="text-[0.625rem] tracking-[0.2em] text-or-profond">{status.categoryName.toUpperCase()}</span>}
            <Link href={href} className="font-display text-[1.25rem] leading-tight text-encre decoration-or underline-offset-4 hover:underline sm:text-[1.375rem]">
              {item.productName}
            </Link>
            <span className="text-[0.8125rem] text-fumee">
              {item.variantLabel}
              {status?.promotionName && item.unitDiscount > 0 && <span className="ml-2 rounded-full bg-erreur-fond px-2 py-0.5 text-[0.6875rem] font-semibold text-erreur">{status.promotionName}</span>}
            </span>
          </div>
          <button type="button" onClick={onRemove} aria-label={`Retirer ${item.productName} du panier`} className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-fumee transition-colors hover:bg-sable hover:text-erreur">
            <X className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>

        {notice && (
          <p className={cn('flex items-start gap-1.5 text-xs leading-snug', notice.kind === 'gone' ? 'text-erreur' : 'text-alerte')}>
            {notice.kind === 'price' ? <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" /> : <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />}
            {notice.text}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
          {unavailable ? (
            <span className="text-[0.8125rem] font-medium text-erreur">Plus disponible pour le moment</span>
          ) : (
            <div role="group" aria-label={`Quantité de ${item.productName}`} className="flex items-center rounded-full bg-lin p-1 ring-1 ring-inset ring-filet">
              <button type="button" aria-label="Retirer un" disabled={item.quantity <= 1} onClick={() => onQty(item.quantity - 1)} className="grid size-9 place-items-center rounded-full text-oud transition-colors hover:bg-sable disabled:opacity-30">
                <Minus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
              </button>
              <span aria-live="polite" className="w-7 text-center text-sm font-bold tabular-nums text-encre">{item.quantity}</span>
              <button type="button" aria-label="Ajouter un" disabled={item.quantity >= max} onClick={() => onQty(item.quantity + 1)} className="grid size-9 place-items-center rounded-full text-oud transition-colors hover:bg-sable disabled:opacity-30">
                <Plus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          )}
          <span className="flex flex-col items-end gap-0.5 whitespace-nowrap">
            {item.unitDiscount > 0 && <span className="text-xs text-fumee line-through">{formatFCFA(item.unitPrice * item.quantity)}</span>}
            <span className={cn('text-base font-bold tabular-nums', item.unitDiscount > 0 ? 'text-erreur' : 'text-encre')}>{formatFCFA(unit * item.quantity)}</span>
            {item.quantity > 1 && <span className="text-[0.6875rem] text-fumee">{formatFCFA(unit)} l’unité</span>}
          </span>
        </div>
      </div>
    </li>
  );
}

// -----------------------------------------------------------------------------
//  Panier
// -----------------------------------------------------------------------------

export default function CartView({
  zones,
  whatsappNumber,
  suggestions,
}: {
  zones: CartZone[];
  whatsappNumber: string | null;
  suggestions: ShopProduct[];
}) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const items = useCartStore((s) => s.items);
  const { updateQuantity, removeItem, restoreItem, refreshItems } = useCartStore.getState();
  const [statuses, setStatuses] = useState<Map<string, CartLineStatus> | null>(null);
  const [notices, setNotices] = useState<Map<string, Notice>>(new Map());
  const [removed, setRemoved] = useState<{ item: CartItem; index: number } | null>(null);
  const [zoneId, setZoneId] = useState<string>('');
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Zone mémorisée (reprise au checkout).
  useEffect(() => {
    let saved = '';
    try {
      saved = localStorage.getItem(ZONE_KEY) ?? '';
    } catch {}
    setZoneId(zones.some((z) => z.id === saved) ? saved : (zones[0]?.id ?? ''));
  }, [zones]);

  // Revérification serveur : prix, promotions, stock, disponibilité.
  const idsKey = items.map((i) => i.variantId).sort().join(',');
  useEffect(() => {
    if (!hydrated || !idsKey) return;
    let cancelled = false;
    validateCartAction(idsKey.split(',')).then((lines) => {
      if (cancelled) return;
      const byId = new Map(lines.map((l) => [l.variantId, l]));
      const current = useCartStore.getState().items;
      const next = new Map<string, Notice>();
      const refresh = [];
      for (const item of current) {
        const s = byId.get(item.variantId);
        if (!s || !s.available || s.stock <= 0) {
          next.set(item.variantId, { kind: 'gone', text: 'Cette création n’est plus disponible : retirez-la pour commander.' });
          continue;
        }
        const oldUnit = item.unitPrice - item.unitDiscount;
        const newUnit = s.unitPrice - s.unitDiscount;
        if (oldUnit !== newUnit) {
          next.set(item.variantId, {
            kind: 'price',
            text: newUnit < oldUnit ? `Bonne nouvelle : le prix est passé de ${formatFCFA(oldUnit)} à ${formatFCFA(newUnit)}.` : `Prix mis à jour : ${formatFCFA(oldUnit)} → ${formatFCFA(newUnit)} (fin de promotion).`,
          });
        }
        if (item.quantity > s.stock) {
          next.set(item.variantId, { kind: 'qty', text: `Plus que ${s.stock} disponible${s.stock > 1 ? 's' : ''} : quantité ajustée.` });
          updateQuantity(item.variantId, s.stock);
        }
        refresh.push({
          variantId: item.variantId,
          productName: s.productName,
          variantLabel: s.variantLabel,
          unitPrice: s.unitPrice,
          unitDiscount: s.unitDiscount,
          imageStoragePath: s.imagePath ?? undefined,
        });
      }
      refreshItems(refresh);
      setStatuses(byId);
      setNotices((prev) => {
        // Les notes de prix restent affichées jusqu'au prochain changement de panier.
        const merged = new Map(next);
        for (const [k, v] of prev) if (!merged.has(k) && v.kind === 'price' && byId.has(k)) merged.set(k, v);
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (item: CartItem) => {
    const index = useCartStore.getState().items.findIndex((i) => i.variantId === item.variantId);
    removeItem(item.variantId);
    setRemoved({ item, index });
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 6000);
  };

  const available = useMemo(
    () => items.filter((i) => {
      const s = statuses?.get(i.variantId);
      return !statuses || (s && s.available && s.stock > 0);
    }),
    [items, statuses],
  );
  const count = available.reduce((n, i) => n + i.quantity, 0);
  const gross = available.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  const savings = available.reduce((n, i) => n + i.unitDiscount * i.quantity, 0);
  const goods = gross - savings;
  const zone = zones.find((z) => z.id === zoneId);
  const total = goods + (zone?.defaultFee ?? 0);
  const blocked = items.length > available.length;

  const whatsappMessage = [
    'Bonjour Maison Adama, je souhaite commander :',
    ...available.map((i) => `• ${i.productName} (${i.variantLabel}) × ${i.quantity} : ${formatFCFA((i.unitPrice - i.unitDiscount) * i.quantity)}`),
    `Total articles : ${formatFCFA(goods)}${zone ? ` · livraison ${zone.name}` : ''}`,
  ].join('\n');
  const wa = whatsappLink(whatsappNumber, whatsappMessage);
  const suggested = suggestions.filter((p) => !items.some((i) => i.productId === p.id)).slice(0, 4);

  // ─── Avant hydratation : squelette (le panier vit dans le navigateur) ───
  if (!hydrated) {
    return (
      <div role="status" aria-busy="true" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <span className="sr-only">Chargement du panier…</span>
        <div className="flex flex-col gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-5">
              <div className="h-[8.5rem] w-[6.75rem] animate-pulse rounded-[20px] bg-filet/50" />
              <div className="flex flex-1 flex-col gap-3 pt-2">
                <div className="h-5 w-1/2 animate-pulse rounded-full bg-filet/50" />
                <div className="h-4 w-1/4 animate-pulse rounded-full bg-filet/50" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-[36px] bg-oud/80" />
      </div>
    );
  }

  // ─── Panier vide ───
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-14">
        {removed && <UndoBar removed={removed} onUndo={() => { restoreItem(removed.item, removed.index); setRemoved(null); }} />}
        <section className="flex min-h-[26rem] flex-col items-center justify-center gap-5 rounded-[40px] bg-[radial-gradient(90%_70%_at_50%_30%,#6B4526_0%,#3A2716_50%,#17100A_100%)] px-6 py-16 text-center text-sur-oud">
          <span className="relative grid size-16 place-items-center rounded-full bg-sur-oud/10 text-or-clair ring-1 ring-or-clair/25">
            <span aria-hidden="true" className="absolute -inset-3 rounded-full border border-dashed border-or-clair/20" />
            <ShoppingBag className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="text-[2rem] leading-tight">Votre panier attend sa première création</h2>
          <p className="max-w-md text-[0.9375rem] leading-relaxed text-sur-oud/75">Parfums, muscs, huiles, oud et thiouraye : laissez-vous guider, ou laissez la Maison vous conseiller.</p>
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/boutique" className="flex h-12 items-center justify-center gap-2 rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre hover:bg-paille">
              Découvrir la boutique <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/trouver-mon-parfum" className="flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-sur-oud ring-1 ring-inset ring-or-clair/40 hover:bg-sur-oud/10">
              <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" /> Trouver mon parfum
            </Link>
          </div>
        </section>
        <Suggestions products={suggestions.slice(0, 4)} title="Les créations du moment" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-14 pb-28 lg:pb-0">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-10">
        {/* ═══ Articles ═══ */}
        <section aria-label="Articles du panier" className="flex flex-col gap-4">
          {removed && <UndoBar removed={removed} onUndo={() => { restoreItem(removed.item, removed.index); setRemoved(null); }} />}
          {blocked && (
            <p className="flex items-start gap-2 rounded-2xl bg-erreur-fond px-4 py-3 text-[0.8125rem] text-erreur">
              <TriangleAlert className="mt-px size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
              Une création n’est plus disponible. Retirez-la pour passer commande.
            </p>
          )}
          <ul className="rounded-[32px] border border-filet bg-lin p-5 sm:p-6">
            {items.map((item) => (
              <CartLine
                key={item.variantId}
                item={item}
                status={statuses?.get(item.variantId)}
                notice={notices.get(item.variantId)}
                onQty={(q) => updateQuantity(item.variantId, q)}
                onRemove={() => remove(item)}
              />
            ))}
          </ul>
          <Link href="/boutique" className="flex h-11 w-fit items-center gap-2 rounded-full px-1 text-sm font-semibold text-or-profond hover:text-oud">
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden="true" /> Continuer mes achats
          </Link>
        </section>

        {/* ═══ Récapitulatif ═══ */}
        <aside aria-labelledby="summary-title" className="flex flex-col gap-5 rounded-[36px] bg-oud p-6 text-sur-oud lg:sticky lg:top-[6.5rem] lg:p-7">
          <div className="flex items-baseline justify-between">
            <h2 id="summary-title" className="text-[1.625rem] leading-tight">Récapitulatif</h2>
            <span className="text-[0.8125rem] text-sur-oud/70">{count} article{count > 1 ? 's' : ''}</span>
          </div>

          <dl className="flex flex-col gap-3 text-[0.9375rem]">
            <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Sous-total</dt><dd className="whitespace-nowrap tabular-nums">{formatFCFA(gross)}</dd></div>
            {savings > 0 && (
              <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Vos économies</dt><dd className="whitespace-nowrap font-semibold tabular-nums text-[#C4DDAE]">−{formatFCFA(savings)}</dd></div>
            )}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-sur-oud/75"><Truck className="size-4 text-or-clair" strokeWidth={1.8} aria-hidden="true" />Livraison</dt>
                <dd className="whitespace-nowrap tabular-nums">{zone ? (zone.defaultFee === 0 ? 'Offerte' : formatFCFA(zone.defaultFee)) : 'À confirmer'}</dd>
              </div>
              {zones.length > 0 && (
                <label className="flex items-center justify-between gap-3 rounded-2xl bg-sur-oud/8 px-3.5 py-2.5 text-[0.8125rem]">
                  <span className="text-sur-oud/70">Zone</span>
                  <select
                    value={zoneId}
                    onChange={(e) => {
                      setZoneId(e.target.value);
                      try { localStorage.setItem(ZONE_KEY, e.target.value); } catch {}
                    }}
                    className="min-w-0 cursor-pointer appearance-none bg-transparent text-right font-semibold text-sur-oud underline decoration-or-clair/50 underline-offset-4 outline-none [&>option]:text-encre"
                  >
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </label>
              )}
              {zone?.estimatedDelay && <p className="text-xs text-sur-oud/60">Délai indicatif : {zone.estimatedDelay} après confirmation</p>}
            </div>
          </dl>

          <div className="flex items-baseline justify-between gap-4 border-t border-sur-oud/15 pt-4">
            <span className="text-sm text-sur-oud/75">Total{zone ? '' : ' (hors livraison)'}</span>
            <span className="whitespace-nowrap font-display text-[2rem] leading-none tabular-nums">{formatFCFA(total)}</span>
          </div>

          <Link
            href="/commande"
            aria-disabled={blocked || count === 0}
            className={cn(
              'flex h-14 items-center justify-center gap-2.5 rounded-full bg-sur-oud text-[0.9375rem] font-bold text-encre transition-colors duration-150 hover:bg-paille',
              (blocked || count === 0) && 'pointer-events-none opacity-50',
            )}
          >
            Passer commande <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-sur-oud ring-1 ring-inset ring-or-clair/35 transition-colors hover:bg-sur-oud/10">
              <MessageCircle className="size-[18px]" strokeWidth={1.8} aria-hidden="true" /> Commander sur WhatsApp
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          )}

          <ul className="flex flex-col gap-2.5 border-t border-sur-oud/15 pt-4 text-[0.8125rem] text-sur-oud/75">
            <li className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/wave.png" alt="" className="size-5 rounded-full object-cover" />
              Paiement Wave ou à la livraison
            </li>
            <li className="flex items-center gap-2.5"><ShieldCheck className="size-5 text-or-clair" strokeWidth={1.6} aria-hidden="true" />Aucun compte à créer · confirmation par téléphone</li>
          </ul>
        </aside>
      </div>

      <Suggestions products={suggested} title="Complétez votre sélection" />

      {/* ═══ Barre collée (mobile) ═══ */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-filet bg-lin/96 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgb(43_29_18/0.08)] backdrop-blur-md lg:hidden">
        <span className="flex min-w-0 flex-col">
          <span className="text-[0.6875rem] text-fumee">Total{zone ? '' : ' hors livraison'} · {count} article{count > 1 ? 's' : ''}</span>
          <strong className="whitespace-nowrap text-lg tabular-nums text-encre">{formatFCFA(total)}</strong>
        </span>
        <Link
          href="/commande"
          aria-disabled={blocked || count === 0}
          className={cn('flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-full bg-oud text-[0.9375rem] font-bold text-sur-oud', (blocked || count === 0) && 'pointer-events-none opacity-50')}
        >
          Commander <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function UndoBar({ removed, onUndo }: { removed: { item: CartItem }; onUndo: () => void }) {
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-encre px-4 py-3 text-sm text-sur-oud motion-safe:animate-reveal">
      <span className="min-w-0 truncate">« {removed.item.productName} » retiré du panier</span>
      <button type="button" onClick={onUndo} className="h-9 shrink-0 rounded-full px-3 font-semibold text-or-clair hover:bg-sur-oud/10">
        Annuler
      </button>
    </div>
  );
}

function Suggestions({ products, title }: { products: ShopProduct[]; title: string }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="suggest-title" className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="suggest-title" className="text-[1.75rem] leading-tight text-encre lg:text-[2.125rem]">{title}</h2>
        <Link href="/boutique" className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-or-profond hover:text-oud">
          Toute la boutique <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
        {products.map((p) => (
          <li key={p.id} className="w-[64vw] max-w-[16rem] shrink-0 snap-start lg:w-auto lg:max-w-none">
            <ShopCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

