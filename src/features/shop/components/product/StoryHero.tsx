'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, Maximize2, Share2, ShoppingBag } from 'lucide-react';
import { productImageUrl } from '@/lib/supabase/storage';
import { useCartCount } from '@/features/cart/hooks/use-cart-count';
import { cartLabel } from '@/components/layout/nav-config';
import type { ShopProductDetail } from '../../queries';
import ProductVisual, { NIGHT_TONE } from '../ProductVisual';
import { AddButton, PriceBlock, VariantPicker } from './purchase';
import PhotoLightbox from './PhotoLightbox';

const DURATION = 5000;

async function share(product: ShopProductDetail) {
  try {
    if (navigator.share) await navigator.share({ title: product.name, text: `${product.name} · Maison Adama`, url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
  } catch {
    /* partage annulé */
  }
}

/**
 * Mobile : la fiche s'ouvre en Story plein écran. Les photos défilent seules
 * (5 s, pause si la Story n'est plus visible ou sur appui long), un toucher à
 * gauche / droite change de photo, au centre il l'ouvre en plein écran
 * (visionneuse avec zoom). La carte en verre dépoli porte l'achat ; on glisse
 * vers le haut pour les détails.
 */
export default function StoryHero({ product }: { product: ShopProductDetail }) {
  const count = Math.max(1, product.allImages.length);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const hasPhotos = product.allImages.length > 0;
  const ref = useRef<HTMLElement>(null);
  const cartCount = useCartCount();
  const playing = count > 1 && !held && visible && lightbox === null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio > 0.5), { threshold: [0, 0.5, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now() - elapsed;
    let frame = 0;
    const tick = (now: number) => {
      const e = now - started;
      if (e >= DURATION) {
        setElapsed(0);
        setIndex((i) => (i + 1) % count);
        return;
      }
      setElapsed(e);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, playing, count]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (step: number) => {
    setElapsed(0);
    setIndex((i) => (i + step + count) % count);
  };
  const img = product.allImages[index];

  return (
    <section id="story-hero" ref={ref} aria-label={`${product.name}, photos et achat`} className="relative -mx-4 h-[100svh] min-h-[38rem] overflow-hidden bg-[#17100A] text-sur-oud lg:hidden">
      {/* Photo */}
      <div key={index} className="absolute inset-0 motion-safe:animate-fade-in">
        {img ? (
          <Image src={productImageUrl(img.path)!} alt={img.alt || `${product.name}, photo ${index + 1}`} fill sizes="100vw" priority={index === 0} className="object-cover" />
        ) : (
          <ProductVisual name={product.name} categorySlug={product.categorySlug} seed={product.id} sizes="100vw" tone={NIGHT_TONE} bottleClassName="w-[36%] -translate-y-[18%] drop-shadow-[0_40px_40px_rgba(0,0,0,0.5)]" className="size-full" />
        )}
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(23_16_10/0.55)_0%,transparent_20%,transparent_40%,rgb(23_16_10/0.55)_100%)]" />
      </div>

      {/* Zones de toucher (au-dessus de la carte) : gauche / centre = agrandir / droite */}
      {(count > 1 || hasPhotos) && (
        <div className="absolute inset-x-0 top-28 bottom-[52%] flex">
          {count > 1 && <StoryTap label="Photo précédente" className="w-[30%]" onTap={() => go(-1)} onHold={setHeld} />}
          {hasPhotos && (
            <button type="button" aria-label="Agrandir la photo" onClick={() => setLightbox(index)} className="h-full flex-1" />
          )}
          {count > 1 && <StoryTap label="Photo suivante" className="w-[30%]" onTap={() => go(1)} onHold={setHeld} />}
        </div>
      )}

      {/* Progression + actions */}
      <div className="absolute inset-x-3.5 top-[max(0.75rem,env(safe-area-inset-top))] flex flex-col gap-3">
        {count > 1 && (
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-sur-oud/30">
                <span className="block h-full rounded-full bg-sur-oud" style={{ width: i < index ? '100%' : i === index ? `${(elapsed / DURATION) * 100}%` : '0%' }} />
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <Link href="/boutique" aria-label="Retour à la boutique" className="grid size-11 place-items-center rounded-full bg-encre/40 backdrop-blur-md">
            <ChevronLeft className="size-5" strokeWidth={2} aria-hidden="true" />
          </Link>
          <span className="flex gap-2">
            {hasPhotos && (
              <button type="button" onClick={() => setLightbox(index)} aria-label="Agrandir la photo" className="grid size-11 place-items-center rounded-full bg-encre/40 backdrop-blur-md">
                <Maximize2 className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => share(product)} aria-label="Partager" className="grid size-11 place-items-center rounded-full bg-encre/40 backdrop-blur-md">
              <Share2 className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
            </button>
            <Link href="/panier" aria-label={cartLabel(cartCount)} className="relative grid size-11 place-items-center rounded-full bg-encre/40 backdrop-blur-md">
              <ShoppingBag className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
              {cartCount > 0 && (
                <span key={cartCount} className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-or-clair px-1 text-[0.625rem] font-bold text-encre motion-safe:animate-pop">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </span>
        </div>
      </div>

      {/* Carte d'achat en verre dépoli */}
      <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3.5 rounded-[32px] bg-[#21170F]/72 p-5 shadow-[inset_0_0_0_1px_rgb(217_180_94/0.2)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[0.625rem] tracking-[0.26em] text-or-clair">{product.categoryName.toUpperCase()}</span>
            <h1 className="line-clamp-2 text-[2rem] leading-none text-sur-oud">{product.name}</h1>
          </div>
          {(product.bestPercent || product.isNew) && (
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              {product.bestPercent ? <span className="rounded-full bg-sur-oud px-2.5 py-1 text-xs font-bold text-oud">−{product.bestPercent}&nbsp;%</span> : null}
              {product.isNew && <span className="rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-or-clair/40">Nouveau</span>}
            </span>
          )}
        </div>
        {product.families.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Familles olfactives">
            {product.families.map((f) => (
              <li key={f} className="rounded-full px-3 py-1 text-xs ring-1 ring-inset ring-or-clair/35">{f}</li>
            ))}
          </ul>
        )}
        <PriceBlock tone="dark" size="md" />
        <VariantPicker tone="dark" />
        <AddButton tone="dark" className="flex-none" />
        <a href="#details" className="flex items-center justify-center gap-1.5 pt-0.5 text-xs text-sur-oud/70">
          <ChevronDown className="size-4 motion-safe:animate-bounce" strokeWidth={2} aria-hidden="true" />
          Description, livraison et conseils
        </a>
      </div>

      {lightbox !== null && <PhotoLightbox photos={product.allImages} name={product.name} start={lightbox} onClose={() => setLightbox(null)} />}
    </section>
  );
}

function StoryTap({ label, className, onTap, onHold }: { label: string; className: string; onTap: () => void; onHold: (held: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onTap}
      onPointerDown={() => onHold(true)}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`h-full ${className}`}
    />
  );
}
