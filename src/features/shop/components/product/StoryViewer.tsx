'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { productImageUrl } from '@/lib/supabase/storage';
import type { ShopProductDetail } from '../../queries';
import ProductVisual, { NIGHT_TONE } from '../ProductVisual';
import { AddButton, PriceBlock, VariantPicker } from './purchase';

const DURATION = 5000;

/**
 * Mode Story plein écran : les photos défilent seules (5 s), un toucher à
 * gauche ou à droite change de photo, un appui long met en pause. La carte en
 * verre dépoli garde le choix de la contenance et l'ajout au panier.
 */
export default function StoryViewer({ product, start, onClose }: { product: ShopProductDetail; start: number; onClose: () => void }) {
  const count = Math.max(1, product.allImages.length);
  const [index, setIndex] = useState(start);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Défilement automatique, avec pause.
  useEffect(() => {
    if (paused || count < 2) return;
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
  }, [index, paused, count]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') { setElapsed(0); setIndex((i) => (i + 1) % count); }
      if (e.key === 'ArrowLeft') { setElapsed(0); setIndex((i) => (i - 1 + count) % count); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [count, onClose]);

  const go = (step: number) => {
    setElapsed(0);
    setIndex((i) => (i + step + count) % count);
  };
  const img = product.allImages[index];

  return (
    <div role="dialog" aria-modal="true" aria-label={`${product.name} en plein écran`} className="fixed inset-0 z-[80] bg-[#17100A] text-sur-oud motion-safe:animate-fade-in">
      {/* Photo */}
      <div key={index} className="absolute inset-0 motion-safe:animate-fade-in">
        {img ? (
          <Image src={productImageUrl(img.path)!} alt={img.alt || product.name} fill sizes="100vw" priority className="object-cover" />
        ) : (
          <ProductVisual name={product.name} categorySlug={product.categorySlug} seed={product.id} sizes="100vw" tone={NIGHT_TONE} bottleClassName="w-[38%] drop-shadow-[0_40px_40px_rgba(0,0,0,0.5)] -translate-y-[12%]" className="size-full" />
        )}
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(23_16_10/0.55)_0%,transparent_22%,transparent_45%,rgb(23_16_10/0.6)_100%)]" />
      </div>

      {/* Zones de toucher : gauche = précédente, droite = suivante ; appui long = pause */}
      {count > 1 && (
        <div className="absolute inset-x-0 top-24 bottom-[48%] flex">
          {[-1, 1].map((step) => (
            <button
              key={step}
              type="button"
              aria-label={step < 0 ? 'Photo précédente' : 'Photo suivante'}
              onClick={() => go(step)}
              onPointerDown={() => setPaused(true)}
              onPointerUp={() => setPaused(false)}
              onPointerLeave={() => setPaused(false)}
              className="h-full flex-1"
            />
          ))}
        </div>
      )}

      {/* Progression */}
      <div className="absolute inset-x-3.5 top-[max(0.875rem,env(safe-area-inset-top))] flex gap-1.5" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-sur-oud/30">
            <span className="block h-full rounded-full bg-sur-oud" style={{ width: i < index ? '100%' : i === index ? `${count < 2 ? 100 : (elapsed / DURATION) * 100}%` : '0%' }} />
          </span>
        ))}
      </div>
      <div className="absolute inset-x-3.5 top-[max(1.75rem,calc(env(safe-area-inset-top)+0.875rem))] flex items-center justify-between">
        <span className="text-xs font-semibold tabular-nums text-sur-oud/80">{index + 1} / {count}</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer" className="grid size-11 place-items-center rounded-full bg-encre/40 backdrop-blur-md">
          <X className="size-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Carte d'achat en verre dépoli */}
      <section className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-4 rounded-[32px] bg-[#21170F]/72 p-5 shadow-[inset_0_0_0_1px_rgb(217_180_94/0.2)] backdrop-blur-xl motion-safe:animate-sheet-up lg:inset-x-auto lg:right-8 lg:w-[26rem]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[0.625rem] tracking-[0.26em] text-or-clair">{product.categoryName.toUpperCase()}</span>
            <h2 className="truncate text-[2rem] leading-none text-sur-oud">{product.name}</h2>
          </div>
        </div>
        {product.families.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {product.families.map((f) => (
              <li key={f} className="rounded-full px-3 py-1 text-xs ring-1 ring-inset ring-or-clair/35">{f}</li>
            ))}
          </ul>
        )}
        <PriceBlock tone="dark" size="md" />
        <VariantPicker tone="dark" />
        <AddButton tone="dark" className={cn('flex-none')} />
      </section>
    </div>
  );
}
