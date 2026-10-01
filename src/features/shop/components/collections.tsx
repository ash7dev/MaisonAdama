import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { TIME_ZONE } from '@/lib/dates';
import { SHOP_COLLECTIONS } from '@/components/layout/nav-config';
import type { ShopFacets, ShopProduct } from '../queries';
import ProductVisual, { NIGHT_TONE } from './ProductVisual';
import ShopCard from './ShopCard';

/**
 * Pages éditoriales des collections. Chaque collection a sa propre mise en
 * scène : le carnet d'arrivages (Nouveautés), le podium (Best-sellers) et les
 * chapitres par budget (Idées cadeaux). Tout est calculé côté serveur.
 */

const num = new Intl.NumberFormat('fr-FR');
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

// -----------------------------------------------------------------------------
//  En-tête commun
// -----------------------------------------------------------------------------

export function CollectionHero({
  index,
  kicker,
  title,
  story,
  meta,
  aside,
}: {
  index: string;
  /** Surtitre ; par défaut « Collection N°xx ». */
  kicker?: string;
  title: string;
  story: string;
  meta?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-[32px] bg-[radial-gradient(120%_95%_at_12%_0%,#6B4526_0%,#3A2716_48%,#17100A_100%)] text-sur-oud lg:rounded-[40px]">
      {/* Numéro de collection géant, en filigrane doré */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.18em] -right-[0.04em] -z-10 select-none font-display text-[11rem] leading-none text-transparent [-webkit-text-stroke:1px_rgb(217_180_94/0.22)] lg:text-[22rem]"
      >
        {index}
      </span>
      <span aria-hidden="true" className="absolute inset-3 -z-10 rounded-[24px] border border-or-clair/15 lg:inset-4 lg:rounded-[30px]" />
      <div className="grid gap-8 px-6 py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-14 lg:px-16 lg:py-16">
        <div className="flex min-w-0 flex-col gap-5">
          <p className="flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-or-clair">
            <span aria-hidden="true" className="h-px w-8 bg-or-clair/60" />
            {kicker ?? `Collection N°${index}`}
          </p>
          <h1 className="text-[2.75rem] leading-[0.95] lg:text-[5rem]">{title}</h1>
          <p className="max-w-xl text-[0.9375rem] leading-relaxed text-sur-oud/75 lg:text-[1.0625rem]">{story}</p>
          {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
        </div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </header>
  );
}

export function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-sur-oud/10 px-3.5 text-[0.8125rem] text-sur-oud/85 ring-1 ring-inset ring-sur-oud/15">
      {children}
    </span>
  );
}

/** Passer d'une collection à l'autre, comme on tourne les pages d'un livre. */
export function CollectionSwitcher({ current }: { current: string }) {
  return (
    <nav aria-label="Collections" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-2 lg:w-full lg:gap-0 lg:border-b lg:border-filet">
        {SHOP_COLLECTIONS.map((c, i) => {
          const on = c.href.endsWith(`/${current}`);
          return (
            <li key={c.href} className="lg:flex-1">
              <Link
                href={c.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[0.8125rem] transition-colors duration-150',
                  'lg:-mb-px lg:h-auto lg:rounded-none lg:border-0 lg:border-b-2 lg:px-0 lg:pb-4 lg:pt-1 lg:text-base',
                  on ? 'border-oud bg-oud font-semibold text-sur-oud lg:bg-transparent lg:text-encre' : 'border-filet bg-lin text-encre lg:border-transparent lg:bg-transparent lg:text-fumee lg:hover:text-encre',
                )}
              >
                <span className={cn('hidden font-display text-[1.375rem] lg:inline', on ? 'text-or-profond' : 'text-filet-fort')}>0{i + 1}</span>
                <span className="lg:font-display lg:text-[1.375rem]">{c.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Pied de collection : retrouver la même sélection dans la boutique, avec les filtres. */
export function CollectionOutro({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-[28px] border border-filet bg-lin px-6 py-5 transition-colors duration-150 hover:border-oud lg:px-8 lg:py-6"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[0.8125rem] text-fumee">Envie de comparer, trier, filtrer ?</span>
        <strong className="font-display text-[1.375rem] font-normal text-encre lg:text-[1.625rem]">{label}</strong>
      </span>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-oud text-sur-oud transition-transform duration-200 group-hover:translate-x-1">
        <ArrowRight className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
    </Link>
  );
}

export function CollectionEmpty({ title, text, actions }: { title: string; text: string; actions: Array<{ href: string; label: string }> }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-[32px] border border-dashed border-filet-fort bg-lin/60 px-6 py-14 text-center">
      <span className="relative grid size-16 place-items-center rounded-full bg-paille text-oud">
        <span aria-hidden="true" className="absolute -inset-3 rounded-full border border-dashed border-or/40" />
        <Sparkles className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="text-[1.75rem] leading-tight text-encre">{title}</h2>
      <p className="max-w-md text-[0.9375rem] leading-relaxed text-fumee">{text}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {actions.map((a, i) => (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              'flex h-12 items-center rounded-full px-6 text-sm font-semibold transition-colors duration-150',
              i === 0 ? 'bg-oud text-sur-oud hover:bg-encre' : 'border border-oud text-oud hover:bg-oud hover:text-sur-oud',
            )}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Fenêtre en arc (clin d'œil aux arches de la Maison) autour d'un visuel produit. */
function ArchVisual({ product, sizes, className, priority }: { product: ShopProduct; sizes: string; className?: string; priority?: boolean }) {
  return (
    <ProductVisual
      image={product.images[0]}
      name={product.name}
      categorySlug={product.categorySlug}
      seed={product.id}
      sizes={sizes}
      priority={priority}
      bottleClassName="w-[38%]"
      className={cn('rounded-b-[24px] rounded-t-[999px]', className)}
    />
  );
}

function Price({ product, className }: { product: ShopProduct; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {product.toPrice > product.fromPrice && <span className="font-normal opacity-70">dès </span>}
      {formatFCFA(product.fromPrice)}
    </span>
  );
}

// -----------------------------------------------------------------------------
//  Nouveautés : le carnet d'arrivages
// -----------------------------------------------------------------------------

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayNum = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, day: 'numeric' });
const monthYear = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, month: 'long', year: 'numeric' });
const weekday = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, weekday: 'long' });
const shortDate = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, day: 'numeric', month: 'short' });

export type ArrivalDay = { key: string; date: Date; products: ShopProduct[] };

/** Regroupe les produits par jour de mise en ligne (heure de Dakar), du plus récent au plus ancien. */
export function groupArrivals(products: ShopProduct[]): ArrivalDay[] {
  const days = new Map<string, ArrivalDay>();
  for (const p of products) {
    if (!p.publishedAt) continue;
    const date = new Date(p.publishedAt);
    const key = dayKey.format(date);
    const day = days.get(key) ?? { key, date, products: [] };
    day.products.push(p);
    days.set(key, day);
  }
  return [...days.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function arrivalLabel(key: string, now = new Date()): string {
  const days = Math.round((Date.parse(dayKey.format(now)) - Date.parse(key)) / 86_400_000);
  if (days <= 0) return 'Arrivé aujourd’hui';
  if (days === 1) return 'Arrivé hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Il y a ${w} semaine${w > 1 ? 's' : ''}`;
  }
  const m = Math.floor(days / 30);
  return m < 12 ? `Il y a ${m} mois` : 'Il y a plus d’un an';
}

export function LatestArrival({ product }: { product: ShopProduct }) {
  return (
    <Link href={`/produits/${product.slug}`} className="group mx-auto flex w-full max-w-[17rem] flex-col items-center gap-4 lg:max-w-none">
      <span className="relative w-full">
        <span aria-hidden="true" className="absolute -inset-2.5 rounded-b-[30px] rounded-t-[999px] border border-or-clair/30" />
        <ArchVisual product={product} sizes="(min-width: 1024px) 352px, 272px" priority className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-[1.02]" />
        {product.publishedAt && (
          // Tampon d'arrivée, comme sur un colis
          <span className="absolute -left-3 top-[42%] grid size-[4.75rem] -rotate-12 place-items-center rounded-full border-2 border-dashed border-or-clair/70 bg-encre/80 text-center text-or-clair backdrop-blur-sm">
            <span className="flex flex-col leading-tight">
              <span className="text-[0.625rem] font-semibold uppercase tracking-[0.18em]">Arrivé</span>
              <span className="whitespace-nowrap font-display text-[0.9375rem]">{shortDate.format(new Date(product.publishedAt))}</span>
            </span>
          </span>
        )}
      </span>
      <span className="flex flex-col items-center gap-1 text-center">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-or-clair">Dernière arrivée</span>
        <span className="font-display text-[1.5rem] leading-tight">{product.name}</span>
        <Price product={product} className="text-sm font-semibold text-sur-oud/80" />
      </span>
    </Link>
  );
}

export function ArrivalJournal({ days }: { days: ArrivalDay[] }) {
  return (
    <ol className="relative flex flex-col">
      {/* Fil du carnet */}
      <span aria-hidden="true" className="absolute bottom-6 left-[0.3125rem] top-3 w-px bg-[linear-gradient(to_bottom,var(--color-or)_0%,var(--color-filet)_30%,var(--color-filet)_85%,transparent)] lg:left-[11.5rem]" />
      {days.map((day, i) => (
        <li key={day.key} className="relative grid gap-5 pb-12 pl-8 last:pb-0 lg:grid-cols-[11.5rem_minmax(0,1fr)] lg:gap-0 lg:pl-0">
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-3 size-[0.6875rem] rounded-full ring-4 ring-sable lg:left-[11.1875rem]',
              i === 0 ? 'bg-or motion-safe:animate-pulse' : 'bg-filet-fort',
            )}
          />
          <div className="flex items-end gap-3 self-start lg:sticky lg:top-32 lg:flex-col lg:items-start lg:gap-1 lg:pr-10">
            <span className="font-display text-[3.5rem] leading-[0.8] text-encre tabular-nums lg:text-[5.5rem]">{dayNum.format(day.date)}</span>
            <span className="flex flex-col gap-0.5 pb-0.5">
              <span className="text-[0.875rem] font-semibold capitalize text-encre">{monthYear.format(day.date)}</span>
              <span className="text-[0.8125rem] capitalize text-fumee">
                {weekday.format(day.date)} · <span className="normal-case">{arrivalLabel(day.key)}</span>
              </span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-5 lg:pl-12">
            <p className="text-[0.8125rem] text-fumee">
              <strong className="font-semibold text-encre">{day.products.length}</strong> création{day.products.length > 1 ? 's' : ''} ajoutée{day.products.length > 1 ? 's' : ''} ce jour-là
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-6">
              {day.products.map((p, j) => (
                <ShopCard key={p.id} product={p} priority={i === 0 && j < 3} />
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// -----------------------------------------------------------------------------
//  Best-sellers : le podium
// -----------------------------------------------------------------------------

const soldLabel = (n: number) => `${num.format(n)} vendu${n > 1 ? 's' : ''}`;

const PODIUM = [
  { rank: 1, order: 'lg:order-2', base: 'h-24 lg:h-32', width: 'col-span-2 lg:col-span-1', visual: 'max-w-[16rem] lg:max-w-[20rem]' },
  { rank: 2, order: 'lg:order-1', base: 'h-16 lg:h-20', width: '', visual: 'max-w-[11rem] lg:max-w-[15rem]' },
  { rank: 3, order: 'lg:order-3', base: 'h-11 lg:h-12', width: '', visual: 'max-w-[11rem] lg:max-w-[15rem]' },
];

export function Podium({ ranked }: { ranked: ShopProduct[] }) {
  return (
    <ol aria-label="Podium des ventes" className="grid grid-cols-2 items-end gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-8">
      {PODIUM.map(({ rank, order, base, width, visual }) => {
        const p = ranked[rank - 1];
        return (
          <li key={rank} className={cn('flex min-w-0 flex-col items-center', order, width)}>
            {p ? (
              <Link href={`/produits/${p.slug}`} className="group flex w-full flex-col items-center gap-3 px-1 text-center">
                <span className={cn('relative w-full', visual)}>
                  {rank === 1 && (
                    <span aria-hidden="true" className="absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(closest-side,rgb(217_180_94/0.45),transparent)] blur-md" />
                  )}
                  <ArchVisual
                    product={p}
                    sizes="(min-width: 1024px) 320px, 45vw"
                    priority={rank === 1}
                    className={cn('aspect-[3/4] w-full transition-transform duration-500 group-hover:-translate-y-1.5', rank === 1 && 'ring-1 ring-or/50')}
                  />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-or-profond">{p.categoryName}</span>
                  <span className={cn('font-display leading-tight text-encre', rank === 1 ? 'text-[1.625rem] lg:text-[2rem]' : 'text-[1.125rem] lg:text-[1.5rem]')}>{p.name}</span>
                  <span className="flex flex-wrap items-center justify-center gap-x-2 text-[0.8125rem]">
                    <span className="whitespace-nowrap font-semibold text-oud">{soldLabel(p.sold)}</span>
                    <span aria-hidden="true" className="text-filet-fort">·</span>
                    <Price product={p} className="text-fumee" />
                  </span>
                </span>
              </Link>
            ) : (
              <div className="flex w-full flex-col items-center gap-3 px-1 text-center">
                <span className={cn('grid aspect-[3/4] w-full place-items-center rounded-b-[24px] rounded-t-[999px] border border-dashed border-filet-fort bg-lin/50', visual)}>
                  <span className="font-display text-[3rem] text-filet-fort">?</span>
                </span>
                <span className="text-[0.8125rem] text-fumee">Place à prendre</span>
              </div>
            )}
            {/* Marche du podium */}
            <span
              aria-label={`${rank}${rank === 1 ? 're' : 'e'} place`}
              className={cn(
                'mt-4 grid w-full place-items-center rounded-t-[18px] font-display text-[2rem] lg:text-[2.75rem]',
                base,
                rank === 1 ? 'bg-oud text-or-clair' : rank === 2 ? 'bg-paille text-oud' : 'bg-lin text-oud ring-1 ring-inset ring-filet',
              )}
            >
              {rank}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Suite du classement : barres proportionnelles aux ventes du n° 1. */
export function Ranking({ ranked, start, max }: { ranked: ShopProduct[]; start: number; max: number }) {
  return (
    <ol className="flex flex-col divide-y divide-filet rounded-[28px] border border-filet bg-lin">
      {ranked.map((p, i) => (
        <li key={p.id}>
          <Link
            href={`/produits/${p.slug}`}
            className="group grid grid-cols-[2rem_3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-sable/60 lg:grid-cols-[3rem_4rem_minmax(0,1fr)_minmax(0,14rem)_auto] lg:gap-5 lg:px-6"
          >
            <span className="font-display text-[1.375rem] text-filet-fort tabular-nums lg:text-[1.75rem]">{start + i}</span>
            <ProductVisual image={p.images[0]} name={p.name} categorySlug={p.categorySlug} seed={p.id} sizes="64px" className="aspect-[4/5] rounded-[14px]" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-display text-[1.0625rem] text-encre lg:text-[1.25rem]">{p.name}</span>
              <span className="truncate text-[0.8125rem] text-fumee">
                {p.categoryName} · <Price product={p} />
              </span>
            </span>
            <span className="hidden items-center gap-3 lg:flex">
              <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-filet">
                <span className="block h-full rounded-full bg-or" style={{ width: `${Math.max(6, (p.sold / max) * 100)}%` }} />
              </span>
            </span>
            <span className="whitespace-nowrap text-right text-[0.8125rem] font-semibold text-oud">{soldLabel(p.sold)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function SalesCounter({ units, leader }: { units: number; leader?: ShopProduct }) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] bg-sur-oud/[0.06] p-6 ring-1 ring-inset ring-sur-oud/10 lg:p-8">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-or-clair">Les 90 derniers jours</span>
      {units > 0 ? (
        <>
          <span className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-display text-[3.5rem] leading-none text-sur-oud tabular-nums lg:text-[4.5rem]">{num.format(units)}</span>
            <span className="text-sm text-sur-oud/70">article{units > 1 ? 's' : ''} parti{units > 1 ? 's' : ''}</span>
          </span>
          {leader && (
            <span className="border-t border-sur-oud/10 pt-4 text-[0.875rem] leading-relaxed text-sur-oud/75">
              En tête : <strong className="font-semibold text-or-clair">{leader.name}</strong>, {soldLabel(leader.sold)}.
            </span>
          )}
        </>
      ) : (
        <>
          <span className="font-display text-[2rem] leading-tight text-sur-oud">Le classement s’écrit</span>
          <span className="text-[0.875rem] leading-relaxed text-sur-oud/70">Il se met à jour tout seul, à chaque commande.</span>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Idées cadeaux : chapitres par budget
// -----------------------------------------------------------------------------

const CHAPTERS = [
  { title: 'Une attention', text: 'Pour dire merci, pour une visite, pour le plaisir d’offrir.' },
  { title: 'Un beau cadeau', text: 'Pour un anniversaire, une fête, une belle occasion.' },
  { title: 'Le grand geste', text: 'Pour marquer les moments qui comptent vraiment.' },
];

export type GiftChapter = { key: string; title: string; text: string; budget: string; href: string; products: ShopProduct[] };

export function giftChapters(products: ShopProduct[], budgets: ShopFacets['budgets'], shopFilter: string): GiftChapter[] {
  if (budgets.length === 0) {
    return products.length
      ? [{ key: 'tous', title: 'Toutes nos idées', text: 'Choisies pour faire plaisir, à tous les budgets.', budget: 'Tous budgets', href: `/boutique${shopFilter}`, products }]
      : [];
  }
  return budgets
    .map((b, i) => {
      const qs = new URLSearchParams(shopFilter.replace(/^\?/, ''));
      if (b.min !== undefined) qs.set('min', String(b.min));
      if (b.max !== undefined) qs.set('max', String(b.max));
      return {
        key: b.key,
        ...CHAPTERS[i],
        budget: b.label,
        href: `/boutique?${qs.toString()}`,
        products: products.filter((p) => (b.min === undefined || p.fromPrice >= b.min) && (b.max === undefined || p.fromPrice <= b.max)),
      };
    })
    .filter((c) => c.products.length > 0);
}

/** Étiquette cadeau dessinée (en-tête de la collection). */
export function GiftTag() {
  return (
    <svg viewBox="0 0 320 300" role="img" aria-label="Étiquette « Pour offrir »" className="mx-auto h-auto w-full max-w-[17rem] lg:max-w-[20rem]">
      <path d="M96 28c-40 6-70 38-58 70 10 26 44 30 70 44" fill="none" stroke="#D9B45E" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      <g transform="rotate(-10 180 170)">
        <path d="M110 110h170a16 16 0 0 1 16 16v108a16 16 0 0 1-16 16H110l-44-70z" fill="#F1DDA8" />
        <path d="M110 118h164a10 10 0 0 1 10 10v104a10 10 0 0 1-10 10H114l-38-62z" fill="none" stroke="#B48A2C" strokeWidth="1" strokeDasharray="4 5" />
        <circle cx="104" cy="180" r="9" fill="#2B1D12" />
        <circle cx="104" cy="180" r="9" fill="none" stroke="#B48A2C" strokeWidth="2" />
        <text x="196" y="170" textAnchor="middle" fontFamily="var(--font-display), serif" fontSize="34" fill="#2B1D12">Pour</text>
        <text x="196" y="210" textAnchor="middle" fontFamily="var(--font-display), serif" fontSize="34" fill="#2B1D12">offrir</text>
      </g>
      <path d="M104 142c20 10 36 26 44 48" fill="none" stroke="#D9B45E" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export function GiftChapters({ chapters }: { chapters: GiftChapter[] }) {
  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      {chapters.map((c, i) => (
        <section key={c.key} aria-labelledby={`chap-${c.key}`} className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
          <div className="self-start lg:sticky lg:top-32">
            {/* Étiquette de chapitre : encoche et œillet, comme un vrai tag cadeau */}
            <div className="relative flex flex-col gap-2 rounded-[22px] bg-paille py-6 pl-12 pr-6 text-oud [clip-path:polygon(2.25rem_0,100%_0,100%_100%,2.25rem_100%,0_50%)]">
              <span aria-hidden="true" className="absolute left-[1.35rem] top-1/2 size-3 -translate-y-1/2 rounded-full bg-sable ring-2 ring-or-profond/50" />
              <span className="font-display text-[0.9375rem] text-or-profond">Chapitre {ROMAN[i]}</span>
              <h2 id={`chap-${c.key}`} className="text-[1.75rem] leading-tight text-encre">{c.title}</h2>
              <span className="whitespace-nowrap text-[0.875rem] font-semibold">{c.budget}</span>
            </div>
            <p className="mt-4 text-[0.875rem] leading-relaxed text-fumee lg:px-2">{c.text}</p>
            <Link href={c.href} className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-oud underline-offset-4 hover:underline lg:px-2">
              Ce budget dans la boutique <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-6">
            {c.products.map((p, j) => (
              <ShopCard key={p.id} product={p} priority={i === 0 && j < 3} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Encart conseil : pour ceux qui ne connaissent pas encore les goûts de la personne. */
export function GiftAdvice({ whatsapp }: { whatsapp: string | null }) {
  return (
    <section className={cn('relative isolate overflow-hidden rounded-[32px] px-6 py-10 text-sur-oud lg:px-14 lg:py-12', NIGHT_TONE.bg)}>
      <span aria-hidden="true" className="absolute -right-16 -top-16 -z-10 size-64 rounded-full border border-or-clair/15" />
      <span aria-hidden="true" className="absolute -right-4 -top-4 -z-10 size-40 rounded-full border border-or-clair/10" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="flex max-w-xl flex-col gap-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-or-clair">Offrir sans se tromper</span>
          <h2 className="text-[1.875rem] leading-tight lg:text-[2.5rem]">Vous ne connaissez pas encore ses goûts ?</h2>
          <p className="text-[0.9375rem] leading-relaxed text-sur-oud/75">
            Répondez à trois questions en pensant à la personne, ou décrivez-la à la Maison : nous vous orientons vers le bon flacon.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
          <Link
            href="/trouver-mon-parfum?offrir=1"
            className="flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-sur-oud px-7 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille"
          >
            <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Trouver son parfum
          </Link>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-sur-oud/30 px-7 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-sur-oud/10"
            >
              <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" />
              Demander conseil
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function ProductGrid({ products }: { products: ShopProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <ShopCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
