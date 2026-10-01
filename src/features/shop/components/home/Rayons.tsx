'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Rayon } from '../../home';
import TonightCarousel from './TonightCarousel';

const VELVET =
  'linear-gradient(90deg, rgb(0 0 0 / 0.14) 0 1px, transparent 1px 100%) 0 0 / 7px 100%, radial-gradient(100% 80% at 50% 20%, #4A3222 0%, #2B1D12 60%, #1C130C 100%)';

/** « Nos muscs arrivent bientôt », « Notre oud arrive bientôt ». */
function soonTitle(r: Rayon): string {
  return r.slug === 'oud' ? 'Notre oud arrive bientôt' : `Nos ${r.label.toLowerCase()} arrivent bientôt`;
}

/**
 * « Les rayons de la Maison » : un onglet par univers, tous visibles. Les
 * créations de chaque rayon sont préparées côté serveur : changer d'onglet est
 * instantané. Un rayon vide montre ses niches en attente et « Être prévenu ».
 */
export default function Rayons({ rayons, whatsapp }: { rayons: Rayon[]; whatsapp: string | null }) {
  const base = useId();
  const [active, setActive] = useState(() => (rayons.find((r) => r.count > 0) ?? rayons[0]).slug);
  const rayon = rayons.find((r) => r.slug === active) ?? rayons[0];
  const fallback = rayons.find((r) => r.count > 0 && r.slug !== rayon.slug);
  const notify = whatsapp
    ? `${whatsapp}?text=${encodeURIComponent(`Bonjour Maison Adama, prévenez-moi à l’arrivée de vos ${rayon.label.toLowerCase()}.`)}`
    : null;

  return (
    <section aria-labelledby={`${base}-title`} className="flex flex-col gap-5 lg:gap-7">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">Les rayons de la Maison</span>
          <h2 id={`${base}-title`} className="text-[1.875rem] leading-none text-encre lg:text-[2.75rem]">
            Explorez par univers
          </h2>
        </div>
        <Link href="/boutique" className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-oud hover:underline">
          <span className="lg:hidden">Boutique</span>
          <span className="hidden lg:inline">Toute la boutique</span>
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {/* Onglets : tous les univers, même vides */}
      <div role="tablist" aria-label="Univers" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
        {rayons.map((r) => {
          const on = r.slug === rayon.slug;
          return (
            <button
              key={r.slug}
              type="button"
              role="tab"
              id={`${base}-tab-${r.slug}`}
              aria-selected={on}
              aria-controls={`${base}-panel`}
              onClick={() => setActive(r.slug)}
              className={cn(
                'flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm transition-colors duration-150 lg:h-12 lg:px-5',
                on ? 'border-oud bg-oud font-semibold text-sur-oud' : 'border-filet bg-lin text-encre hover:border-filet-fort',
              )}
            >
              {r.label}
              <span className={cn('text-xs', on ? 'text-sur-oud/70' : r.count ? 'text-fumee' : 'italic text-or-profond')}>{r.count || 'bientôt'}</span>
            </button>
          );
        })}
      </div>

      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${rayon.slug}`}>
        {rayon.count > 0 ? (
          <TonightCarousel
            key={rayon.slug}
            products={rayon.products}
            total={rayon.count}
            end={{
              href: `/boutique?univers=${rayon.slug}`,
              kicker: rayon.hint,
              label: rayon.count > 1 ? `Voir les ${rayon.count} ${rayon.label.toLowerCase()}` : `Voir le rayon ${rayon.label.toLowerCase()}`,
            }}
          />
        ) : (
          <div
            key={rayon.slug}
            className="relative isolate flex min-h-[22rem] flex-col items-center justify-center gap-6 overflow-hidden rounded-[32px] px-6 py-10 text-center text-sur-oud motion-safe:animate-fade-in lg:min-h-[26rem] lg:rounded-[40px]"
            style={{ background: VELVET }}
          >
            {/* Trois niches en attente */}
            <div aria-hidden="true" className="flex items-end gap-4 lg:gap-6">
              {['h-24 w-16 lg:h-32 lg:w-20', 'h-32 w-20 lg:h-40 lg:w-28', 'h-24 w-16 lg:h-32 lg:w-20'].map((size, i) => (
                <span key={i} className={cn('rounded-b-[10px] rounded-t-full border-[1.5px] border-dashed border-or/40 bg-black/25 shadow-[inset_0_18px_24px_rgb(0_0_0/0.45)]', size)} />
              ))}
            </div>
            <div className="flex max-w-md flex-col gap-2">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or">Rayon {rayon.label} · {rayon.hint}</span>
              <h3 className="text-[1.75rem] leading-tight lg:text-[2.25rem]">{soonTitle(rayon)}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-sur-oud/70">La Maison prépare ce rayon. Laissez-nous votre numéro : vous serez prévenu dès l’arrivage.</p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {notify && (
                <a
                  href={notify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille"
                >
                  <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" /> Être prévenu
                </a>
              )}
              {fallback && (
                <button
                  type="button"
                  onClick={() => setActive(fallback.slug)}
                  className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-sur-oud/30 px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-sur-oud/10"
                >
                  Découvrir nos {fallback.label.toLowerCase()} <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
