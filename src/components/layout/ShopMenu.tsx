// src/components/layout/ShopMenu.tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bottle } from '@/features/shop/components/ProductVisual';
import { SHOP_CATEGORIES, SHOP_COLLECTIONS } from './nav-config';

type ShopMenuProps = {
  id: string;
  /** Créations publiées par univers : « 4 créations » ou « Bientôt ». */
  counts: Record<string, number>;
  onNavigate: () => void;
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
};

/** Panneau « Boutique » (desktop) : les 5 catégories en vignettes, puis les collections. */
export default function ShopMenu({ id, counts, onNavigate, onPointerEnter, onPointerLeave }: ShopMenuProps) {
  return (
    <div
      id={id}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      // Pont invisible au-dessus du panneau : la souris passe du menu au lien sans le refermer.
      className="absolute inset-x-0 top-full mt-2.5 hidden before:absolute before:inset-x-0 before:-top-3 before:h-3 before:content-[''] grid-cols-[minmax(0,1fr)_18.75rem] gap-7 rounded-[32px] border border-filet bg-lin p-7 shadow-lg motion-safe:animate-reveal lg:grid"
    >
      <ul className="grid grid-cols-5 gap-3.5">
        {SHOP_CATEGORIES.map((category, index) => (
          <li key={category.slug}>
            <Link href={`/boutique?univers=${category.slug}`} onClick={onNavigate} className="group flex flex-col gap-3.5 rounded-[22px]">
              <span
                aria-hidden="true"
                className={cn(
                  'relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[22px] ring-1 ring-inset ring-filet/70',
                  category.tint,
                )}
              >
                <span className="absolute left-4 top-4 text-[0.6875rem] tracking-[0.2em] text-or-profond">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span aria-hidden="true" className="absolute bottom-[17%] left-[32%] right-[32%] h-3 rounded-[50%] bg-encre/20 blur-md" />
                <Bottle
                  categorySlug={category.slug}
                  fill="#7E5E1C"
                  shine="rgba(255,255,255,.55)"
                  className="relative h-auto w-[30%] drop-shadow-[0_14px_14px_rgba(43,29,18,0.22)] transition-transform duration-400 ease-out-soft group-hover:-translate-y-1 group-hover:scale-110"
                />
                <span
                  className={cn(
                    'absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold',
                    counts[category.slug] ? 'bg-lin/85 text-oud' : 'bg-encre/10 text-fumee',
                  )}
                >
                  {counts[category.slug] ? `${counts[category.slug]} création${counts[category.slug] > 1 ? 's' : ''}` : 'Bientôt'}
                </span>
              </span>
              <span className="flex flex-col gap-1 px-1">
                <span className="font-display text-title-sm text-encre decoration-or underline-offset-[6px] group-hover:underline">
                  {category.label}
                </span>
                <span className="text-sm text-fumee">{category.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-5 border-l border-filet py-2 pl-7 pr-2">
        <p className="text-[0.71875rem] tracking-[0.24em] text-or-profond">COLLECTIONS</p>
        <ul className="flex flex-col gap-3.5">
          {SHOP_COLLECTIONS.map((collection) => (
            <li key={collection.href}>
              <Link
                href={collection.href}
                onClick={onNavigate}
                className="font-display text-[1.25rem] text-oud decoration-or underline-offset-[6px] hover:underline"
              >
                {collection.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/boutique"
          onClick={onNavigate}
          className="mt-auto flex h-[50px] items-center justify-between rounded-full bg-sable pl-5 pr-2 text-sm font-medium text-oud transition-colors duration-150 hover:bg-paille"
        >
          Toute la boutique
          <span className="grid size-9 place-items-center rounded-full bg-oud text-sur-oud">
            <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </Link>
      </div>
    </div>
  );
}
