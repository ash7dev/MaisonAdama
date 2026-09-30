'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, ChevronDown, LoaderCircle, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import {
  activeFilterCount,
  GENDER_LABELS,
  SHOP_GENDERS,
  SHOP_SORTS,
  shopHref,
  SORT_LABELS,
  type ShopParams,
} from '../params';
import type { ShopFacets } from '../queries';

const num = new Intl.NumberFormat('fr-FR');

/** Navigation « sans rechargement » vers de nouveaux filtres (défilement conservé). */
function useShopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const go = (href: string) => startTransition(() => router.replace(href, { scroll: false }));
  return { go, isPending, pathname };
}

// -----------------------------------------------------------------------------
//  Curseur de prix à deux poignées
// -----------------------------------------------------------------------------

function roundStep(n: number) {
  return Math.round(n / 500) * 500;
}

export function PriceRange({
  bounds,
  value,
  onChange,
}: {
  bounds: { min: number; max: number };
  value: { min: number; max: number };
  onChange: (v: { min: number; max: number }) => void;
}) {
  const span = Math.max(1, bounds.max - bounds.min);
  const left = ((value.min - bounds.min) / span) * 100;
  const right = 100 - ((value.max - bounds.min) / span) * 100;
  const thumb =
    'pointer-events-none absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-[22px] [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-oud [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-[22px] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-oud [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md';
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-6">
        <span className="absolute inset-x-0 top-[10px] h-1 rounded-full bg-filet" />
        <span className="absolute top-[10px] h-1 rounded-full bg-oud" style={{ left: `${left}%`, right: `${right}%` }} />
        <input
          type="range"
          aria-label="Prix minimum"
          min={bounds.min}
          max={bounds.max}
          step={500}
          value={value.min}
          onChange={(e) => onChange({ min: Math.min(Number(e.target.value), value.max), max: value.max })}
          className={thumb}
        />
        <input
          type="range"
          aria-label="Prix maximum"
          min={bounds.min}
          max={bounds.max}
          step={500}
          value={value.max}
          onChange={(e) => onChange({ min: value.min, max: Math.max(Number(e.target.value), value.min) })}
          className={thumb}
        />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {(['min', 'max'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 rounded-2xl border border-filet bg-white px-3.5 py-2">
            <span className="text-[0.6875rem] text-fumee">{k === 'min' ? 'Min.' : 'Max.'}</span>
            <span className="flex items-baseline gap-1">
              <input
                inputMode="numeric"
                value={num.format(value[k])}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, '')) || 0;
                  onChange(k === 'min' ? { min: Math.min(n, value.max), max: value.max } : { min: value.min, max: Math.max(n, value.min) });
                }}
                className="w-full min-w-0 bg-transparent text-sm font-semibold tabular-nums text-encre outline-none"
              />
              <span className="text-xs text-fumee">FCFA</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function pricePresets(bounds: { min: number; max: number }) {
  const third = roundStep(bounds.min + (bounds.max - bounds.min) / 3);
  const twoThirds = roundStep(bounds.min + ((bounds.max - bounds.min) * 2) / 3);
  return [
    { label: `Moins de ${num.format(third)}`, min: undefined, max: third },
    { label: `${num.format(third)} – ${num.format(twoThirds)}`, min: third, max: twoThirds },
    { label: `Plus de ${num.format(twoThirds)}`, min: twoThirds, max: undefined },
  ];
}

// -----------------------------------------------------------------------------
//  Menu déroulant de la barre
// -----------------------------------------------------------------------------

function Dropdown({
  label,
  value,
  active,
  width = 'w-80',
  align = 'left',
  children,
}: {
  label: string;
  value?: string;
  active: boolean;
  width?: string;
  align?: 'left' | 'right';
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[0.8125rem] transition-colors duration-150',
          active || open ? 'border-oud bg-oud text-sur-oud' : 'border-filet bg-white text-encre hover:border-filet-fort',
        )}
      >
        {label}
        {value && <span className="font-semibold">· {value}</span>}
        <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} strokeWidth={2.2} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute top-[calc(100%+10px)] z-40 flex flex-col gap-4 rounded-[26px] border border-filet bg-white p-5 shadow-[0_30px_70px_rgb(43_29_18/0.2)] motion-safe:animate-reveal',
            width,
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[0.8125rem] transition-colors duration-150',
        on ? 'border-oud bg-oud font-semibold text-sur-oud' : 'border-filet bg-lin text-encre hover:border-filet-fort',
      )}
    >
      {on && <Check className="size-3.5" strokeWidth={2.4} aria-hidden="true" />}
      {children}
      {count !== undefined && <span className={cn('text-xs', on ? 'text-sur-oud/70' : 'text-fumee')}>{count}</span>}
    </button>
  );
}

// -----------------------------------------------------------------------------
//  Barre de filtres (desktop)
// -----------------------------------------------------------------------------

export function FilterBar({ params, facets, total }: { params: ShopParams; facets: ShopFacets; total: number }) {
  const { go, isPending } = useShopNav();
  const bounds = { min: roundStep(facets.priceMin) || 0, max: roundStep(facets.priceMax + 499) || 50_000 };
  const [price, setPrice] = useState({ min: params.min ?? bounds.min, max: params.max ?? bounds.max });
  useEffect(() => setPrice({ min: params.min ?? bounds.min, max: params.max ?? bounds.max }), [params.min, params.max]); // eslint-disable-line react-hooks/exhaustive-deps

  const univers = facets.univers.find((u) => u.slug === params.univers);
  const size = facets.sizes.find((s) => s.key === params.contenance);
  const priceValue =
    params.min !== undefined || params.max !== undefined
      ? `${num.format(params.min ?? bounds.min)} – ${num.format(params.max ?? bounds.max)}`
      : undefined;
  const familyValue = params.familles.length
    ? params.familles.length === 1
      ? facets.families.find((f) => f.slug === params.familles[0])?.name
      : `${params.familles.length}`
    : undefined;
  const hasFilters = activeFilterCount(params) > 0 || Boolean(params.univers) || Boolean(params.collection);

  return (
    <div className="sticky top-[6.5rem] z-30 flex flex-wrap items-center gap-2.5 rounded-[28px] border border-filet bg-lin/95 p-2.5 shadow-[0_12px_30px_rgb(74_46_28/0.08)] backdrop-blur-md">
      <Dropdown label="Univers" value={univers?.name} active={Boolean(univers)} width="w-72">
        {(close) => (
          <ul className="flex flex-col gap-1">
            {[{ slug: undefined as string | undefined, name: 'Tous les univers', count: facets.total }, ...facets.univers].map((u) => {
              const on = params.univers === u.slug;
              return (
                <li key={u.slug ?? 'all'}>
                  <button
                    type="button"
                    onClick={() => {
                      go(shopHref(params, { univers: u.slug }));
                      close();
                    }}
                    className={cn('flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm transition-colors duration-150', on ? 'bg-sable font-semibold text-encre' : 'text-encre hover:bg-sable/60')}
                  >
                    <span className="flex-1">{u.name}</span>
                    <span className="text-xs text-fumee">{u.count}</span>
                    {on && <Check className="size-4 text-or-profond" strokeWidth={2.2} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Dropdown>

      <Dropdown label="Prix" value={priceValue} active={Boolean(priceValue)} width="w-[25rem]">
        {(close) => (
          <>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl text-encre">Prix</span>
              <span className="text-xs text-fumee">de {formatFCFA(bounds.min)} à {formatFCFA(bounds.max)}</span>
            </div>
            <PriceRange bounds={bounds} value={price} onChange={setPrice} />
            <div className="flex flex-wrap gap-2">
              {pricePresets(bounds).map((p) => (
                <Chip key={p.label} on={params.min === p.min && params.max === p.max} onClick={() => { go(shopHref(params, { min: p.min, max: p.max })); close(); }}>
                  {p.label}
                </Chip>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-filet pt-3.5">
              <button type="button" onClick={() => { go(shopHref(params, { min: undefined, max: undefined })); close(); }} className="h-10 px-1 text-[0.8125rem] font-semibold text-or-profond">
                Effacer
              </button>
              <button
                type="button"
                onClick={() => {
                  go(shopHref(params, { min: price.min > bounds.min ? price.min : undefined, max: price.max < bounds.max ? price.max : undefined }));
                  close();
                }}
                className="h-11 rounded-full bg-oud px-5 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
              >
                Appliquer
              </button>
            </div>
          </>
        )}
      </Dropdown>

      {facets.sizes.length > 0 && (
        <Dropdown label="Contenance" value={size?.label} active={Boolean(size)} width="w-80">
          {(close) => (
            <div className="flex flex-wrap gap-2">
              {facets.sizes.map((s) => (
                <Chip key={s.key} count={s.count} on={params.contenance === s.key} onClick={() => { go(shopHref(params, { contenance: params.contenance === s.key ? undefined : s.key })); close(); }}>
                  {s.label}
                </Chip>
              ))}
            </div>
          )}
        </Dropdown>
      )}

      {facets.families.length > 0 && (
        <Dropdown label="Famille olfactive" value={familyValue} active={params.familles.length > 0} width="w-[22rem]">
          {() => (
            <>
              <p className="text-xs text-fumee">Plusieurs choix possibles.</p>
              <div className="flex flex-wrap gap-2">
                {facets.families.map((f) => {
                  const on = params.familles.includes(f.slug);
                  return (
                    <Chip
                      key={f.slug}
                      count={f.count}
                      on={on}
                      onClick={() => go(shopHref(params, { familles: on ? params.familles.filter((x) => x !== f.slug) : [...params.familles, f.slug] }))}
                    >
                      {f.name}
                    </Chip>
                  );
                })}
              </div>
            </>
          )}
        </Dropdown>
      )}

      <Dropdown label="Pour" value={params.pour ? GENDER_LABELS[params.pour] : undefined} active={Boolean(params.pour)} width="w-64">
        {(close) => (
          <div className="flex flex-wrap gap-2">
            {SHOP_GENDERS.map((g) => (
              <Chip key={g} on={params.pour === g} onClick={() => { go(shopHref(params, { pour: params.pour === g ? undefined : g })); close(); }}>
                {GENDER_LABELS[g]}
              </Chip>
            ))}
          </div>
        )}
      </Dropdown>

      <button
        type="button"
        aria-pressed={params.promo}
        onClick={() => go(shopHref(params, { promo: !params.promo }))}
        className={cn(
          'flex h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[0.8125rem] transition-colors duration-150',
          params.promo ? 'border-oud bg-oud font-semibold text-sur-oud' : 'border-filet bg-white text-encre hover:border-filet-fort',
        )}
      >
        {params.promo && <Check className="size-3.5" strokeWidth={2.4} aria-hidden="true" />}
        En promotion
      </button>

      {hasFilters && (
        <button type="button" onClick={() => go(shopHref({ ...params, univers: undefined, collection: undefined, min: undefined, max: undefined, contenance: undefined, familles: [], pour: undefined, promo: false }))} className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[0.8125rem] font-semibold text-or-profond hover:text-oud">
          <X className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
          Effacer
        </button>
      )}

      <span aria-live="polite" className="ml-auto flex items-center gap-2 whitespace-nowrap pl-2 text-sm text-fumee">
        {isPending && <LoaderCircle className="size-4 text-or-profond motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
        <strong className="tabular-nums text-encre">{num.format(total)}</strong> création{total > 1 ? 's' : ''}
      </span>

      <Dropdown label="Trier" value={SORT_LABELS[params.tri]} active={false} width="w-60" align="right">
        {(close) => (
          <ul className="flex flex-col gap-1">
            {SHOP_SORTS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => { go(shopHref(params, { tri: s })); close(); }}
                  className={cn('flex h-11 w-full items-center justify-between rounded-2xl px-3 text-left text-sm', params.tri === s ? 'bg-sable font-semibold' : 'hover:bg-sable/60')}
                >
                  {SORT_LABELS[s]}
                  {params.tri === s && <Check className="size-4 text-or-profond" strokeWidth={2.2} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Mobile : boutons Filtres / Tri + feuille de filtres
// -----------------------------------------------------------------------------

export function MobileFilters({ params, facets, total }: { params: ShopParams; facets: ShopFacets; total: number }) {
  const { go, isPending } = useShopNav();
  const bounds = { min: roundStep(facets.priceMin) || 0, max: roundStep(facets.priceMax + 499) || 50_000 };
  const [open, setOpen] = useState<null | 'filters' | 'sort'>(null);
  const [draft, setDraft] = useState(params);
  const [price, setPrice] = useState({ min: params.min ?? bounds.min, max: params.max ?? bounds.max });
  const count = activeFilterCount(params);

  useEffect(() => {
    if (!open) return;
    setDraft(params);
    setPrice({ min: params.min ?? bounds.min, max: params.max ?? bounds.max });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    go(shopHref(draft, { min: price.min > bounds.min ? price.min : undefined, max: price.max < bounds.max ? price.max : undefined }));
    setOpen(null);
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen('filters')}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-oud text-sm font-semibold text-sur-oud"
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.9} aria-hidden="true" />
          Filtres
          {count > 0 && <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-sur-oud px-1.5 text-xs text-oud">{count}</span>}
        </button>
        <button
          type="button"
          onClick={() => setOpen('sort')}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-filet bg-lin text-sm text-encre"
        >
          {isPending ? <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" /> : null}
          {SORT_LABELS[params.tri]}
          <ChevronDown className="size-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button type="button" aria-label="Fermer" onClick={() => setOpen(null)} className="absolute inset-0 bg-encre/50 motion-safe:animate-fade-in" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            className={cn(
              'absolute inset-x-0 bottom-0 flex flex-col rounded-t-[32px] bg-lin shadow-[0_-20px_50px_rgb(0_0_0/0.25)] motion-safe:animate-sheet-up',
              open === 'filters' ? 'max-h-[88dvh]' : '',
            )}
          >
            <span aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-11 rounded-full bg-filet-fort" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <h2 id="sheet-title" className="text-[1.625rem] text-encre">{open === 'filters' ? 'Filtres' : 'Trier par'}</h2>
              <div className="flex items-center gap-1">
                {open === 'filters' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, min: undefined, max: undefined, contenance: undefined, familles: [], pour: undefined, promo: false });
                      setPrice(bounds);
                    }}
                    className="h-10 px-2 text-[0.8125rem] font-semibold text-or-profond"
                  >
                    Tout effacer
                  </button>
                )}
                <button type="button" aria-label="Fermer" onClick={() => setOpen(null)} className="grid size-11 place-items-center rounded-full bg-sable text-oud">
                  <X className="size-4" strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
            </div>

            {open === 'sort' ? (
              <ul className="flex flex-col gap-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1">
                {SHOP_SORTS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => { go(shopHref(params, { tri: s })); setOpen(null); }}
                      className={cn('flex h-14 w-full items-center justify-between rounded-2xl px-4 text-left text-[0.9375rem]', params.tri === s ? 'bg-sable font-semibold' : '')}
                    >
                      {SORT_LABELS[s]}
                      {params.tri === s && <Check className="size-5 text-or-profond" strokeWidth={2.2} aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
                  <Section title="Prix">
                    <PriceRange bounds={bounds} value={price} onChange={setPrice} />
                  </Section>
                  {facets.sizes.length > 0 && (
                    <Section title="Contenance">
                      <div className="flex flex-wrap gap-2">
                        {facets.sizes.map((s) => (
                          <Chip key={s.key} count={s.count} on={draft.contenance === s.key} onClick={() => setDraft({ ...draft, contenance: draft.contenance === s.key ? undefined : s.key })}>
                            {s.label}
                          </Chip>
                        ))}
                      </div>
                    </Section>
                  )}
                  {facets.families.length > 0 && (
                    <Section title="Famille olfactive">
                      <div className="flex flex-wrap gap-2">
                        {facets.families.map((f) => {
                          const on = draft.familles.includes(f.slug);
                          return (
                            <Chip key={f.slug} count={f.count} on={on} onClick={() => setDraft({ ...draft, familles: on ? draft.familles.filter((x) => x !== f.slug) : [...draft.familles, f.slug] })}>
                              {f.name}
                            </Chip>
                          );
                        })}
                      </div>
                    </Section>
                  )}
                  <Section title="Pour">
                    <div role="group" className="grid grid-cols-3 gap-1 rounded-full bg-sable p-1">
                      {SHOP_GENDERS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          aria-pressed={draft.pour === g}
                          onClick={() => setDraft({ ...draft, pour: draft.pour === g ? undefined : g })}
                          className={cn('h-10 rounded-full text-[0.8125rem]', draft.pour === g ? 'bg-white font-semibold text-encre shadow-sm' : 'text-fumee')}
                        >
                          {GENDER_LABELS[g]}
                        </button>
                      ))}
                    </div>
                  </Section>
                  <label className="flex min-h-12 items-center justify-between gap-3">
                    <span className="flex flex-col gap-0.5"><span className="text-[0.9375rem] text-encre">En promotion</span><span className="text-xs text-fumee">Seulement les prix barrés</span></span>
                    <input type="checkbox" role="switch" checked={draft.promo} onChange={(e) => setDraft({ ...draft, promo: e.target.checked })} className="peer sr-only" />
                    <span aria-hidden="true" className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-or', draft.promo ? 'bg-succes' : 'bg-filet-fort')}>
                      <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200', draft.promo ? 'translate-x-6' : 'translate-x-1')} />
                    </span>
                  </label>
                </div>
                <div className="border-t border-filet px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5">
                  <button type="button" onClick={apply} className="h-14 w-full rounded-full bg-oud text-[0.9375rem] font-bold text-sur-oud">
                    Afficher les créations
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{total} créations</span>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-[0.6875rem] font-semibold tracking-[0.2em] text-or-profond">{title.toUpperCase()}</h3>
      {children}
    </div>
  );
}
