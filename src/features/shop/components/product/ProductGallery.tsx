'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { productImageUrl } from '@/lib/supabase/storage';
import type { ShopProductDetail } from '../../queries';
import ProductVisual, { NIGHT_TONE } from '../ProductVisual';
import StoryViewer from './StoryViewer';

function Badges({ product, className }: { product: ShopProductDetail; className?: string }) {
  if (!product.bestPercent && !product.isNew) return null;
  return (
    <span className={cn('pointer-events-none absolute z-10 flex gap-2', className)}>
      {product.bestPercent ? <span className="rounded-full bg-sur-oud px-3 py-1 text-[0.8125rem] font-bold text-oud">−{product.bestPercent}&nbsp;%</span> : null}
      {product.isNew && <span className="rounded-full bg-encre/35 px-3 py-1 text-[0.8125rem] font-semibold text-sur-oud backdrop-blur-sm">Nouveau</span>}
    </span>
  );
}

/** Une photo (ou le flacon dessiné) qui remplit son cadre. */
function Slide({ product, index, sizes, priority }: { product: ShopProductDetail; index: number; sizes: string; priority?: boolean }) {
  const img = product.allImages[index];
  if (!img) {
    return (
      <ProductVisual
        name={product.name}
        categorySlug={product.categorySlug}
        seed={product.id}
        sizes={sizes}
        tone={NIGHT_TONE}
        bottleClassName="w-[30%] drop-shadow-[0_40px_40px_rgba(0,0,0,0.5)]"
        className="size-full"
      />
    );
  }
  return <Image src={productImageUrl(img.path)!} alt={img.alt || `${product.name}, photo ${index + 1}`} fill sizes={sizes} priority={priority} className="object-cover" />;
}

export default function ProductGallery({ product }: { product: ShopProductDetail }) {
  const count = Math.max(1, product.allImages.length);
  const [index, setIndex] = useState(0);
  const [story, setStory] = useState<number | null>(null);

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (story !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLElement) || e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, story]);

  return (
    <>
      {/* ═══ Desktop ═══ */}
      <div className={cn('hidden gap-4 lg:grid', count > 1 ? 'grid-cols-[5.25rem_minmax(0,1fr)]' : 'grid-cols-1')}>
        {count > 1 && (
          <div className="flex flex-col gap-3" role="tablist" aria-label="Photos">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  'relative h-[6.5rem] w-[5.25rem] overflow-hidden rounded-[18px] transition-shadow duration-150',
                  i === index ? 'shadow-[0_0_0_2px_#4A2E1C]' : 'shadow-[0_0_0_1px_#DCCBAE] hover:shadow-[0_0_0_1px_#C4AE8A]',
                )}
              >
                <Slide product={product} index={i} sizes="84px" />
              </button>
            ))}
          </div>
        )}
        <div className="group relative aspect-[4/5] overflow-hidden rounded-[36px] bg-oud">
          <Badges product={product} className="left-5 top-5" />
          <div key={index} className="absolute inset-0 motion-safe:animate-fade-in">
            <Slide product={product} index={index} sizes="(min-width: 1280px) 640px, 55vw" priority />
          </div>
          {count > 1 && (
            <>
              <button type="button" aria-label="Photo précédente" onClick={() => go(index - 1)} className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-lin/85 text-oud opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100">
                <ChevronLeft className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Photo suivante" onClick={() => go(index + 1)} className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-lin/85 text-oud opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100">
                <ChevronRight className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <span className="absolute bottom-5 left-5 rounded-full bg-encre/40 px-3 py-1 text-xs font-semibold tabular-nums text-sur-oud backdrop-blur-sm">
                {index + 1} / {count}
              </span>
            </>
          )}
          <button type="button" aria-label="Voir en plein écran" onClick={() => setStory(index)} className="absolute bottom-5 right-5 grid size-12 place-items-center rounded-full bg-encre/35 text-sur-oud backdrop-blur-sm transition-colors hover:bg-encre/55">
            <Expand className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      </div>

      {story !== null && <StoryViewer product={product} start={story} onClose={() => setStory(null)} />}
    </>
  );
}
