'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopProduct } from '../../queries';
import ShopCard from '../ShopCard';

/**
 * Une planche qui glisse (« Ce soir sur l'étagère », « Les rayons »).
 * Desktop : 4 créations visibles, flèches. Mobile : une carte et demie,
 * glissement au pouce avec arrêt sur chaque carte, compteur et jauge.
 */
export type CarouselEnd = { href: string; kicker: string; label: string };

export default function TonightCarousel({ products, total, end }: { products: ShopProduct[]; total: number; end?: CarouselEnd }) {
  const last: CarouselEnd = end ?? { href: '/boutique', kicker: 'Toute la boutique', label: `Voir les ${total} création${total > 1 ? 's' : ''}` };
  const track = useRef<HTMLUListElement>(null);
  const count = products.length + 1; // + la carte de fin
  const [state, setState] = useState({ atStart: true, atEnd: count <= 4, index: 1, progress: 0 });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0') : el.clientWidth;
    setState({
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft >= max - 4,
      index: Math.min(count, Math.round(el.scrollLeft / step) + 1),
      progress: max > 0 ? el.scrollLeft / max : 1,
    });
  }, [count]);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.95, behavior: reduce ? 'auto' : 'smooth' });
  };

  const scrollable = !(state.atStart && state.atEnd);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <ul
          ref={track}
          aria-label="Sélection de créations"
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:scroll-px-0 lg:gap-6 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, i) => (
            <li
              key={p.id}
              aria-label={`${i + 1} sur ${count}`}
              className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-[calc((100%-4.5rem)/4)]"
            >
              <ShopCard product={p} />
            </li>
          ))}
          {/* Carte de fin : tout le catalogue, dans la boutique */}
          <li className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-[calc((100%-4.5rem)/4)]">
            <Link
              href={last.href}
              className="group flex aspect-[4/5] flex-col items-center justify-center gap-4 rounded-[28px] bg-[radial-gradient(90%_60%_at_50%_40%,#6B4526_0%,#3A2716_45%,#17100A_100%)] p-6 text-center text-sur-oud"
            >
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or">{last.kicker}</span>
              <span className="font-display text-[1.75rem] leading-tight">{last.label}</span>
              <span className="grid size-12 place-items-center rounded-full bg-sur-oud text-encre transition-transform duration-200 group-hover:translate-x-1">
                <ArrowRight className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
            </Link>
          </li>
        </ul>
        {scrollable && (
          <>
            <ArrowButton side="left" disabled={state.atStart} onClick={() => go(-1)} />
            <ArrowButton side="right" disabled={state.atEnd} onClick={() => go(1)} />
          </>
        )}
      </div>

      {/* La planche, puis le compteur et la jauge */}
      <div aria-hidden="true" className="-mx-4 h-2.5 bg-gradient-to-b from-[#B98556] via-[#7A5030] to-[#3A2716] shadow-[0_12px_20px_rgb(43_29_18/0.25)] lg:mx-0 lg:h-3.5 lg:rounded" />
      {scrollable && (
        <div className="flex items-center gap-4">
          <span className="whitespace-nowrap font-display text-[1.0625rem] tabular-nums text-encre" aria-live="polite">
            {state.index}
            <span className="text-fumee"> / {count}</span>
          </span>
          <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden rounded-full bg-filet">
            <span className="block h-full rounded-full bg-or transition-[width] duration-150" style={{ width: `${Math.max(8, state.progress * 100)}%` }} />
          </span>
        </div>
      )}
    </div>
  );
}

function ArrowButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Créations précédentes' : 'Créations suivantes'}
      className={cn(
        'absolute top-[38%] hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-lin text-oud shadow-[0_12px_30px_rgb(43_29_18/0.2)] ring-1 ring-filet transition duration-200 hover:bg-oud hover:text-sur-oud disabled:pointer-events-none disabled:opacity-0 lg:grid',
        side === 'left' ? '-left-6' : '-right-6',
      )}
    >
      <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
