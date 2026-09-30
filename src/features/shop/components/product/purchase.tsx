'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Check, MessageCircle, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { whatsappLink } from '@/lib/whatsapp';
import type { ShopProductDetail, ShopVariant } from '../../queries';
import { defaultVariant, useAddToCart } from '../../use-add-to-cart';

const num = new Intl.NumberFormat('fr-FR');
const final = (v: ShopVariant) => v.price - v.discount;
const MAX_QTY = 10;

// -----------------------------------------------------------------------------
//  État d'achat partagé : panneau, barre mobile et mode Story
// -----------------------------------------------------------------------------

type PurchaseState = {
  product: ShopProductDetail;
  variant: ShopVariant;
  setVariantId: (id: string) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  add: () => void;
  added: boolean;
  whatsappHref: string | null;
};

const PurchaseContext = createContext<PurchaseState | null>(null);

export function usePurchase() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error('usePurchase hors de ProductPurchaseProvider');
  return ctx;
}

export function ProductPurchaseProvider({
  product,
  whatsappNumber,
  children,
}: {
  product: ShopProductDetail;
  whatsappNumber: string | null;
  children: React.ReactNode;
}) {
  const [variantId, setVariantId] = useState(() => defaultVariant(product).id);
  const [quantity, setQuantityRaw] = useState(1);
  const { add, addedId } = useAddToCart();
  const variant = product.variants.find((v) => v.id === variantId) ?? defaultVariant(product);

  const value = useMemo<PurchaseState>(() => {
    const setQuantity = (n: number) => setQuantityRaw(Math.max(1, Math.min(MAX_QTY, Math.min(n, variant.stock || 1))));
    const message = `Bonjour Maison Adama, je souhaite commander ${product.name} (${variant.label}) à ${formatFCFA(final(variant))}. Est-il disponible ?`;
    return {
      product,
      variant,
      setVariantId: (id) => {
        setVariantId(id);
        setQuantityRaw(1);
      },
      quantity,
      setQuantity,
      add: () => add(product, variant, quantity),
      added: addedId === variant.id,
      whatsappHref: whatsappLink(whatsappNumber, message),
    };
  }, [product, variant, quantity, add, addedId, whatsappNumber]);

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

// -----------------------------------------------------------------------------
//  Morceaux réutilisables
// -----------------------------------------------------------------------------

export function PriceBlock({ tone = 'light', size = 'lg' }: { tone?: 'light' | 'dark'; size?: 'lg' | 'md' }) {
  const { variant } = usePurchase();
  const promo = variant.discount > 0;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
      <span className={cn('whitespace-nowrap font-bold tabular-nums', size === 'lg' ? 'text-[1.875rem]' : 'text-[1.375rem]', promo ? (tone === 'dark' ? 'text-sur-oud' : 'text-erreur') : tone === 'dark' ? 'text-sur-oud' : 'text-encre')}>
        {formatFCFA(final(variant))}
      </span>
      {promo && (
        <>
          <span className={cn('whitespace-nowrap line-through', size === 'lg' ? 'text-[1.0625rem]' : 'text-sm', tone === 'dark' ? 'text-sur-oud/55' : 'text-fumee')}>{formatFCFA(variant.price)}</span>
          <span className={cn('whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold', tone === 'dark' ? 'bg-sur-oud text-oud' : 'bg-erreur-fond text-erreur')}>
            Vous économisez {num.format(variant.discount)}
          </span>
        </>
      )}
    </div>
  );
}

export function VariantPicker({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { product, variant, setVariantId } = usePurchase();
  if (product.variants.length < 2) return null;
  return (
    <div role="radiogroup" aria-label="Contenance" className="grid grid-cols-2 gap-2.5">
      {product.variants.map((v) => {
        const on = v.id === variant.id;
        const out = v.stock <= 0;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={out}
            onClick={() => setVariantId(v.id)}
            className={cn(
              'flex min-h-[4.5rem] flex-col items-start justify-center gap-1 rounded-[20px] px-4 py-2.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
              tone === 'dark'
                ? on ? 'bg-or-clair/12 text-sur-oud ring-2 ring-inset ring-or-clair' : 'text-sur-oud/85 ring-1 ring-inset ring-or-clair/30'
                : on ? 'bg-white text-encre ring-2 ring-inset ring-oud' : 'bg-lin text-encre ring-1 ring-inset ring-filet hover:ring-filet-fort',
            )}
          >
            <strong className="text-base font-semibold">{v.label}</strong>
            <span className="flex flex-wrap items-baseline gap-x-1.5 whitespace-nowrap text-[0.8125rem]">
              {out ? (
                'Épuisé'
              ) : (
                <>
                  <strong className="font-semibold tabular-nums">{formatFCFA(final(v))}</strong>
                  {v.discount > 0 && <span className={cn('line-through', tone === 'dark' ? 'text-sur-oud/50' : 'text-fumee')}>{num.format(v.price)}</span>}
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { quantity, setQuantity, variant } = usePurchase();
  const btn = cn('grid size-11 place-items-center rounded-full transition-colors disabled:opacity-30', tone === 'dark' ? 'text-sur-oud hover:bg-sur-oud/10' : 'text-oud hover:bg-sable');
  return (
    <div role="group" aria-label="Quantité" className={cn('flex items-center rounded-full p-1', tone === 'dark' ? 'ring-1 ring-inset ring-or-clair/30' : 'ring-1 ring-inset ring-filet')}>
      <button type="button" aria-label="Retirer un" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)} className={btn}>
        <Minus className="size-4" strokeWidth={2.2} aria-hidden="true" />
      </button>
      <span aria-live="polite" className={cn('w-7 text-center font-bold tabular-nums', tone === 'dark' ? 'text-sur-oud' : 'text-encre')}>{quantity}</span>
      <button type="button" aria-label="Ajouter un" disabled={quantity >= Math.min(MAX_QTY, variant.stock)} onClick={() => setQuantity(quantity + 1)} className={btn}>
        <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AddButton({ tone = 'light', compact = false, className }: { tone?: 'light' | 'dark'; compact?: boolean; className?: string }) {
  const { add, added, variant, quantity } = usePurchase();
  const out = variant.stock <= 0;
  return (
    <button
      type="button"
      disabled={out}
      onClick={add}
      className={cn(
        'flex h-14 flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[0.9375rem] font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        added ? 'bg-succes text-white' : tone === 'dark' ? 'bg-sur-oud text-encre hover:bg-paille' : 'bg-oud text-sur-oud hover:bg-oud-hover',
        className,
      )}
    >
      {added ? <Check className="size-5" strokeWidth={2.4} aria-hidden="true" /> : <ShoppingBag className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />}
      {out ? 'Épuisé' : added ? 'Ajouté au panier' : compact ? 'Ajouter' : `Ajouter au panier · ${formatFCFA(final(variant) * quantity)}`}
    </button>
  );
}

export function StockLine() {
  const { variant } = usePurchase();
  if (variant.stock <= 0) return <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-erreur"><span className="size-2 rounded-full bg-erreur" />Épuisé pour cette contenance</p>;
  return (
    <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-succes">
      <span className="size-2 rounded-full bg-succes" />
      {variant.stock <= 3 ? `Plus que ${variant.stock} en stock` : 'En stock'} · préparé dès confirmation de votre commande
    </p>
  );
}

export function WhatsAppButton({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { whatsappHref } = usePurchase();
  if (!whatsappHref) return null;
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex h-[3.25rem] items-center justify-center gap-2.5 rounded-full text-sm font-semibold transition-colors duration-150',
        tone === 'dark' ? 'text-sur-oud ring-1 ring-inset ring-or-clair/35 hover:bg-sur-oud/10' : 'text-oud ring-1 ring-inset ring-filet-fort hover:bg-white',
      )}
    >
      <MessageCircle className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
      Commander ou demander conseil sur WhatsApp
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  );
}

// -----------------------------------------------------------------------------
//  Livraison : zone choisie → tarif et délai (données réelles des zones actives)
// -----------------------------------------------------------------------------

export type DeliveryZoneOption = { id: string; name: string; region: string; defaultFee: number; estimatedDelay: string | null };

export function DeliveryEstimator({ zones }: { zones: DeliveryZoneOption[] }) {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const zone = zones.find((z) => z.id === zoneId);
  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-white p-4 ring-1 ring-inset ring-filet">
      <div className="flex items-center gap-3">
        <Truck className="size-5 shrink-0 text-or" strokeWidth={1.7} aria-hidden="true" />
        {zones.length > 0 ? (
          <>
            <label htmlFor="delivery-zone" className="text-sm text-encre">Livraison à</label>
            <select
              id="delivery-zone"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-sm font-bold text-encre underline decoration-filet-fort underline-offset-4 outline-none focus-visible:decoration-or"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <span className="whitespace-nowrap text-sm font-bold tabular-nums text-encre">{zone && (zone.defaultFee === 0 ? 'Offerte' : formatFCFA(zone.defaultFee))}</span>
          </>
        ) : (
          <span className="text-sm text-encre">Livraison partout au Sénégal · frais confirmés à la commande</span>
        )}
      </div>
      {zone?.estimatedDelay && <p className="pl-8 text-[0.8125rem] text-fumee">Délai indicatif : <strong className="font-semibold text-encre">{zone.estimatedDelay}</strong> après confirmation</p>}
      <div className="h-px bg-filet" />
      <p className="flex items-center gap-3 text-[0.8125rem] text-fumee">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/wave.png" alt="" className="size-5 rounded-full object-cover" />
        Payez par <strong className="font-semibold text-encre">Wave</strong> ou <strong className="font-semibold text-encre">à la livraison</strong>
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Panneau d'achat (desktop et feuille mobile)
// -----------------------------------------------------------------------------

export function BuyPanel({ zones }: { zones: DeliveryZoneOption[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="hidden flex-col gap-5 lg:flex">
        <PriceBlock />
        <VariantPicker />
      </div>
      {/* Sur mobile, l'ajout se fait depuis la barre collée en bas. */}
      <div className="hidden gap-2.5 lg:flex">
        <Stepper />
        <AddButton />
      </div>
      <div className="flex items-center gap-3 lg:hidden">
        <span className="text-sm text-fumee">Quantité</span>
        <Stepper />
      </div>
      <StockLine />
      <WhatsAppButton />
      <DeliveryEstimator zones={zones} />
    </div>
  );
}

/** Barre d'achat collée en bas (mobile uniquement). */
export function StickyBuyBar() {
  const { variant, product } = usePurchase();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('story-hero');
    if (!hero) return setShown(true);
    const io = new IntersectionObserver(([e]) => setShown(e.intersectionRatio < 0.15), { threshold: [0, 0.15, 0.5] });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 transition-transform duration-300 ease-out lg:hidden',
        shown ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      )}
    >
    <div className="flex w-full items-center gap-3 border-t border-filet bg-lin/96 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgb(43_29_18/0.08)] backdrop-blur-md lg:hidden">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[0.6875rem] text-fumee">
          {product.variants.length > 1 ? variant.label : product.name}
          {variant.discount > 0 && <span className="ml-1.5 line-through">{num.format(variant.price)}</span>}
        </span>
        <strong className={cn('whitespace-nowrap text-lg tabular-nums', variant.discount > 0 ? 'text-erreur' : 'text-encre')}>{formatFCFA(final(variant))}</strong>
      </span>
      <AddButton compact className="h-[3.25rem]" />
    </div>
    </div>
  );
}
