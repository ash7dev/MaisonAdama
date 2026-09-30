'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Plus, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { productImageUrl } from '@/lib/supabase/storage';
import type { ShopProduct, ShopVariant } from '../queries';
import type { Featured } from '../featured';
import { defaultVariant, useAddToCart } from '../use-add-to-cart';
import ProductVisual, { NIGHT_TONE } from './ProductVisual';

const num = new Intl.NumberFormat('fr-FR');
const final = (v: ShopVariant) => v.price - v.discount;

function PriceFrom({ product }: { product: ShopProduct }) {
  const multiple = product.fromPrice !== product.toPrice;
  return (
    <span className="flex flex-col items-end gap-0.5 whitespace-nowrap">
      <span className={cn('text-base font-bold tabular-nums', product.bestPercent ? 'text-erreur' : 'text-encre')}>
        {multiple && <span className="mr-1 text-xs font-normal text-fumee">dès</span>}
        {formatFCFA(product.fromPrice)}
      </span>
      {product.bestPercent ? <span className="text-xs font-semibold text-erreur">−{product.bestPercent}&nbsp;%</span> : null}
    </span>
  );
}

// -----------------------------------------------------------------------------
//  Vitrine : le produit actif mis en scène
// -----------------------------------------------------------------------------

function Vitrine({ product, index, total, featured }: { product: ShopProduct; index: number; total: number; featured: Featured['reason'] | null }) {
  const { add, addedId } = useAddToCart();
  const [variantId, setVariantId] = useState(() => defaultVariant(product).id);

  // Nouveau produit dans la vitrine : on repart de sa contenance par défaut.
  useEffect(() => setVariantId(defaultVariant(product).id), [product]);

  const variant = product.variants.find((v) => v.id === variantId) ?? defaultVariant(product);
  const added = addedId === variant.id;

  const photo = product.images[0];

  return (
    <section
      aria-label={`Vitrine : ${product.name}`}
      aria-live="polite"
      className="relative flex h-[calc(100dvh-12.75rem)] min-h-[40rem] max-h-[62rem] flex-col overflow-hidden rounded-[40px] bg-[radial-gradient(90%_55%_at_50%_38%,#6B4526_0%,#3A2716_45%,#17100A_100%)] text-sur-oud"
    >
      {/* Scène : la photo bord à bord, fondue dans le sombre ; sinon le flacon dessiné */}
      {photo ? (
        <div key={product.id} className="relative min-h-0 flex-1 motion-safe:animate-fade-in">
          <Image
            src={productImageUrl(photo.path)!}
            alt={photo.alt || product.name}
            fill
            sizes="(min-width: 1024px) 32rem, 1px"
            priority
            className="object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgb(23_16_10/0.6)_0%,rgb(23_16_10/0)_22%,rgb(23_16_10/0)_48%,rgb(23_16_10/0.85)_82%,#17100A_100%)]"
          />
        </div>
      ) : (
        <div key={product.id} className="relative grid min-h-0 flex-1 place-items-center motion-safe:animate-reveal">
          <span aria-hidden="true" className="absolute size-[21rem] rounded-full border border-or-clair/18" />
          <span aria-hidden="true" className="absolute size-60 rounded-full bg-[radial-gradient(circle,rgb(217_180_94/0.28)_0%,transparent_70%)]" />
          <ProductVisual
            name={product.name}
            categorySlug={product.categorySlug}
            seed={product.id}
            sizes="360px"
            tone={NIGHT_TONE}
            bottleClassName="w-[9.5rem] drop-shadow-[0_40px_40px_rgba(0,0,0,0.5)]"
            className="relative size-full bg-transparent"
          />
        </div>
      )}

      <div className="absolute inset-x-8 top-7 z-10 flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 text-[0.6875rem] tracking-[0.3em] text-or-clair">
          N° {String(index + 1).padStart(2, '0')} / {num.format(total)}
          {featured && (
            <span className="rounded-full bg-encre/40 px-3 py-1 tracking-[0.2em] text-sur-oud ring-1 ring-inset ring-or-clair/40 backdrop-blur-sm">
              {featured === 'promo' ? 'EN PROMOTION' : 'LE PRODUIT DU JOUR'}
            </span>
          )}
        </span>
        <span className="flex gap-2">
          {product.isNew && <span className="rounded-full bg-encre/40 px-3 py-1 text-xs font-semibold text-sur-oud backdrop-blur-sm">Nouveau</span>}
          {product.bestPercent ? <span className="rounded-full bg-sur-oud px-3 py-1 text-xs font-bold text-oud">−{product.bestPercent}&nbsp;%</span> : null}
        </span>
      </div>

      <div className={cn('relative z-10 flex flex-col gap-5 px-8 pb-8', photo ? '-mt-28' : '')}>
        <div className="flex flex-col gap-2">
          <span className="text-[0.6875rem] tracking-[0.24em] text-or-clair">{product.categoryName.toUpperCase()}</span>
          <h2 className="line-clamp-2 text-[2.75rem] leading-[0.98] text-sur-oud xl:text-[3.25rem]">{product.name}</h2>
          {product.shortDescription && <p className="line-clamp-2 text-sm leading-relaxed text-sur-oud/75">{product.shortDescription}</p>}
        </div>

        {product.families.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Familles olfactives">
            {product.families.map((f) => (
              <li key={f} className="rounded-full px-3 py-1.5 text-xs text-sur-oud/85 ring-1 ring-inset ring-or-clair/30">
                {f}
              </li>
            ))}
          </ul>
        )}

        {product.variants.length > 1 && (
          <div role="radiogroup" aria-label="Contenance" className="grid grid-cols-3 gap-2">
            {product.variants.slice(0, 6).map((v) => {
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
                    'flex h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.8125rem] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
                    on ? 'bg-or-clair/12 text-sur-oud ring-2 ring-inset ring-or-clair' : 'text-sur-oud/80 ring-1 ring-inset ring-or-clair/30 hover:ring-or-clair/60',
                  )}
                >
                  <strong className="font-semibold">{v.label}</strong>
                  <span className="whitespace-nowrap text-[0.6875rem]">{out ? 'Épuisé' : formatFCFA(final(v))}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={variant.stock <= 0}
            onClick={() => add(product, variant)}
            className={cn(
              'flex h-14 flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[0.9375rem] font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
              added ? 'bg-[#9BC27A] text-encre' : 'bg-sur-oud text-encre hover:bg-paille',
            )}
          >
            {added ? <Check className="size-5" strokeWidth={2.4} aria-hidden="true" /> : <ShoppingBag className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />}
            {variant.stock <= 0 ? 'Épuisé' : added ? 'Ajouté au panier' : (
              <>
                Ajouter · {formatFCFA(final(variant))}
                {variant.discount > 0 && <span className="text-sm font-normal text-fumee line-through">{num.format(variant.price)}</span>}
              </>
            )}
          </button>
          <Link
            href={`/produits/${product.slug}`}
            aria-label={`Voir la fiche de ${product.name}`}
            className="grid size-14 shrink-0 place-items-center rounded-full text-sur-oud ring-1 ring-inset ring-or-clair/35 transition-colors duration-150 hover:bg-sur-oud/10"
          >
            <ArrowRight className="size-5" strokeWidth={1.9} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
//  Index + vitrine
// -----------------------------------------------------------------------------

export default function VitrineIndex({ products, total, featured }: { products: ShopProduct[]; total: number; featured: Featured | null }) {
  const [activeId, setActiveId] = useState(featured?.id ?? products[0]?.id);
  const { add, addedId } = useAddToCart();

  // Nouveaux résultats (filtres) : la vitrine revient au produit mis en avant.
  useEffect(() => {
    setActiveId(featured?.id ?? products[0]?.id);
  }, [products, featured?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIndex = Math.max(0, products.findIndex((p) => p.id === activeId));
  const active = products[activeIndex];
  const rows = useMemo(() => products, [products]);
  if (!active) return null;

  return (
    <div className="grid grid-cols-[minmax(0,30rem)_minmax(0,1fr)] items-start gap-8 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:gap-10">
      <div className="sticky top-[11.25rem]">
        <Vitrine product={active} index={activeIndex} total={total} featured={featured?.id === active.id ? featured.reason : null} />
      </div>

      <section aria-label="Index des créations" className="flex min-w-0 flex-col">
        <div className="grid grid-cols-[2.5rem_4.75rem_minmax(0,1fr)_auto_3rem] gap-4 border-b border-filet px-4 pb-3 text-[0.65625rem] tracking-[0.2em] text-fumee">
          <span>N°</span>
          <span />
          <span>CRÉATION</span>
          <span className="text-right">PRIX</span>
          <span />
        </div>
        <ol className="flex flex-col gap-2 pt-2">
          {rows.map((p, i) => {
            const on = p.id === active.id;
            const single = p.variants.length === 1 ? p.variants[0] : null;
            const justAdded = single && addedId === single.id;
            return (
              <li key={p.id}>
                <article
                  onMouseEnter={() => setActiveId(p.id)}
                  onFocus={() => setActiveId(p.id)}
                  className={cn(
                    'group grid grid-cols-[2.5rem_4.75rem_minmax(0,1fr)_auto_3rem] items-center gap-4 rounded-[26px] px-4 py-3.5 transition-[background-color,box-shadow] duration-200',
                    on ? 'bg-white shadow-[0_18px_40px_rgb(74_46_28/0.12),inset_0_0_0_1px_#D9B45E]' : 'hover:bg-white/60',
                    !p.inStock && 'opacity-60',
                  )}
                >
                  <span className={cn('font-display text-[1.375rem] tabular-nums', on ? 'text-or' : 'text-filet-fort')}>{String(i + 1).padStart(2, '0')}</span>
                  <ProductVisual
                    image={p.images[0]}
                    name={p.name}
                    categorySlug={p.categorySlug}
                    seed={p.id}
                    sizes="76px"
                    bottleClassName="w-[38%]"
                    className="h-[5.75rem] w-[4.75rem] rounded-[18px]"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2 text-[0.65625rem] tracking-[0.2em] text-or-profond">
                      {p.categoryName.toUpperCase()}
                      {p.isNew && <span className="rounded-full bg-paille px-2 py-0.5 text-[0.625rem] font-semibold tracking-normal text-oud">Nouveau</span>}
                      {!p.inStock && <span className="rounded-full bg-sable px-2 py-0.5 text-[0.625rem] font-semibold tracking-normal text-fumee">Épuisé</span>}
                    </span>
                    <Link href={`/produits/${p.slug}`} className="line-clamp-2 font-display text-[1.375rem] leading-tight text-encre decoration-or underline-offset-4 hover:underline xl:text-[1.5rem]">
                      {p.name}
                    </Link>
                    <span className="truncate text-[0.8125rem] text-fumee">
                      {p.variants.map((v) => v.label).join(' · ')}
                      {p.families.length > 0 && <span className="text-filet-fort"> — </span>}
                      {p.families.join(' · ')}
                    </span>
                  </span>
                  <PriceFrom product={p} />
                  <button
                    type="button"
                    disabled={!p.inStock}
                    aria-label={single ? `Ajouter ${p.name} au panier` : `Choisir la contenance de ${p.name}`}
                    onClick={() => (single ? add(p, single) : setActiveId(p.id))}
                    className={cn(
                      'grid size-12 place-items-center rounded-full border transition-colors duration-150 disabled:opacity-40',
                      justAdded ? 'border-succes bg-succes text-white' : 'border-filet bg-lin text-oud hover:border-oud hover:bg-oud hover:text-sur-oud',
                    )}
                  >
                    {justAdded ? <Check className="size-5" strokeWidth={2.4} aria-hidden="true" /> : <Plus className="size-5" strokeWidth={2} aria-hidden="true" />}
                  </button>
                </article>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
