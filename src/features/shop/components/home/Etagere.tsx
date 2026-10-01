import Link from 'next/link';
import { ArrowRight, MessageCircle, Moon, Sparkles, Sun, Sunset } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { NICHES, type HomeData, type Ticket } from '../../home';
import type { ShopProduct } from '../../queries';
import ProductVisual, { NIGHT_TONE, shapeFor } from '../ProductVisual';
import ShelfQuickAdd from './ShelfQuickAdd';
import SpotlightBuy from './SpotlightBuy';
import TonightCarousel from './TonightCarousel';
import { FAMILY_HINTS, familySlug } from '../../families';

/**
 * Page d'accueil « Les alcôves » : un mur de velours sombre où des niches en
 * arche exposent les vraies photos des créations. La grande niche centrale,
 * sous la lampe, accueille le produit du jour ; les petites niches tournent
 * avec elle, chaque jour. Chaque vide a sa mise en scène (niche « arrivage », lampe
 * éteinte, billets « Bientôt »).
 */

const VELVET =
  'linear-gradient(90deg, rgb(0 0 0 / 0.14) 0 1px, transparent 1px 100%) 0 0 / 7px 100%, radial-gradient(100% 80% at 50% 20%, #4A3222 0%, #2B1D12 60%, #1C130C 100%)';

const SMALL = 'h-[11rem] w-[7.5rem] lg:h-[17.5rem] lg:w-[11.25rem]';
const BIG = 'h-[21rem] w-[14.5rem] lg:h-[27.5rem] lg:w-[18rem]';

const priceOf = (p: ShopProduct) => `${p.toPrice > p.fromPrice ? 'dès ' : ''}${formatFCFA(p.fromPrice)}`;

// -----------------------------------------------------------------------------
//  Niches
// -----------------------------------------------------------------------------

/** Rebord de pierre sous chaque niche. */
function Sill() {
  return <span aria-hidden="true" className="relative z-[2] -mt-3 h-3 w-[calc(100%+1.75rem)] rounded-md bg-gradient-to-b from-[#F6EBD6] to-[#B99A6E] shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:-mt-3.5" />;
}

/** L'arche : ombre intérieure et lumière venue du haut, sur la vraie photo. */
function Arch({ product, big }: { product: ShopProduct; big?: boolean }) {
  return (
    <Link
      href={`/produits/${product.slug}`}
      aria-label={`${product.name}, ${priceOf(product)}${product.inStock ? '' : ', épuisé'}`}
      className={cn(
        'group relative z-[1] block overflow-hidden rounded-b-[14px] rounded-t-full bg-encre shadow-[0_0_0_7px_rgb(241_221_168/0.06),0_0_0_8px_rgb(217_180_94/0.35),0_26px_44px_rgb(0_0_0/0.55)] lg:shadow-[0_0_0_10px_rgb(241_221_168/0.06),0_0_0_11px_rgb(217_180_94/0.35),0_30px_50px_rgb(0_0_0/0.55)]',
        big ? BIG : SMALL,
      )}
    >
      <ProductVisual
        image={product.images[0]}
        name={product.name}
        categorySlug={product.categorySlug}
        seed={product.id}
        tone={NIGHT_TONE}
        sizes={big ? '(min-width: 1024px) 288px, 232px' : '(min-width: 1024px) 180px, 120px'}
        priority={big}
        bottleClassName="w-[38%]"
        className={cn('size-full transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]', !product.inStock && 'opacity-60 grayscale')}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 rounded-b-[14px] rounded-t-full shadow-[inset_0_26px_34px_rgb(0_0_0/0.55),inset_0_-8px_16px_rgb(0_0_0/0.25)]',
          big ? 'bg-[linear-gradient(180deg,rgb(255_226_160/0.22),transparent_40%)]' : 'bg-[linear-gradient(180deg,rgb(255_226_160/0.1),transparent_40%)]',
        )}
      />
      {!product.inStock && (
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-encre/80 px-2.5 py-1 text-[0.6875rem] font-semibold text-lin">Épuisé</span>
      )}
      {product.isNew && product.inStock && !big && (
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lin px-2.5 py-1 text-[0.6875rem] font-semibold text-oud">Nouveau</span>
      )}
    </Link>
  );
}

function SmallNiche({ product }: { product: ShopProduct }) {
  return (
    <div className="flex shrink-0 snap-start flex-col items-center gap-2.5 lg:gap-3">
      <Arch product={product} />
      <Sill />
      <Link
        href={`/produits/${product.slug}`}
        tabIndex={-1}
        className="flex max-w-[9rem] flex-col items-center rounded-[10px] bg-gradient-to-b from-[#F6E7C4] to-or px-3 py-1.5 text-center shadow-[0_6px_14px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_255_255/0.6)] lg:max-w-[12.5rem] lg:px-3.5"
      >
        <span className="w-full truncate font-display text-[0.875rem] text-encre lg:text-base">{product.name}</span>
        <strong className="whitespace-nowrap text-[0.6875rem] tabular-nums text-oud lg:text-xs">{product.inStock ? priceOf(product) : 'Épuisé'}</strong>
      </Link>
    </div>
  );
}

function EmptyNiche({ label, whatsapp, big }: { label: string; whatsapp: string | null; big?: boolean }) {
  const body = (
    <>
      <span className="text-[0.5625rem] font-extrabold tracking-[0.2em] text-or lg:text-[0.625rem]">{big ? 'LA NICHE DU JOUR' : 'ARRIVAGE'}</span>
      <span className={cn('font-display leading-tight text-sur-oud', big ? 'text-xl lg:text-2xl' : 'text-[0.9375rem] lg:text-lg')}>{label}</span>
      {whatsapp && (
        <span className="flex items-center gap-1 text-[0.6875rem] font-semibold text-or-clair lg:text-xs">
          <MessageCircle className="size-3" strokeWidth={2} aria-hidden="true" /> Être prévenu
        </span>
      )}
    </>
  );
  const cls = cn(
    'relative z-[1] flex flex-col items-center justify-center gap-1.5 rounded-b-[14px] rounded-t-full border-[1.5px] border-dashed border-or/40 bg-black/25 px-3 text-center shadow-[inset_0_22px_30px_rgb(0_0_0/0.45)]',
    big ? BIG : SMALL,
  );
  return (
    <div className="flex shrink-0 snap-start flex-col items-center gap-2.5 lg:gap-3">
      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cn(cls, 'transition-colors duration-150 hover:bg-black/35')}>
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
      <Sill />
      {!big && <span className="flex h-10 items-center text-[0.6875rem] text-sur-oud/55 lg:text-xs">Bientôt dans cette niche</span>}
    </div>
  );
}

function Lamp({ on }: { on: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -top-8 left-1/2 h-[16rem] w-[26rem] -translate-x-1/2 lg:-top-10 lg:h-[22rem] lg:w-[34rem]',
          on ? 'bg-[radial-gradient(50%_100%_at_50%_0%,rgb(255_236_190/0.5),transparent_70%)]' : 'bg-[radial-gradient(50%_100%_at_50%_0%,rgb(255_236_190/0.1),transparent_70%)]',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-9 left-1/2 z-[3] h-6 w-12 -translate-x-1/2 rounded-b-full lg:-top-11',
          on ? 'bg-gradient-to-b from-or-clair to-or-profond shadow-[0_6px_26px_rgb(255_210_130/0.95)]' : 'bg-gradient-to-b from-[#8A7448] to-[#4A3A22]',
        )}
      />
    </>
  );
}

function BigNiche({ featured, whatsapp }: { featured: HomeData['featured']; whatsapp: string | null }) {
  const product = featured?.product;
  const was = product?.bestPercent ? Math.round(product.fromPrice / (1 - product.bestPercent / 100)) : null;
  return (
    <div className="relative flex shrink-0 flex-col items-center gap-3 lg:gap-4">
      <Lamp on={Boolean(product)} />
      {product ? (
        <>
          <div className="relative">
            <Arch product={product} big />
            {product.bestPercent ? (
              <span className="absolute -right-4 top-[22%] z-[3] grid size-[3.75rem] -rotate-12 place-items-center rounded-full bg-or-clair text-[0.9375rem] font-extrabold text-encre shadow-[0_10px_24px_rgb(0_0_0/0.4)] lg:size-[4.5rem] lg:text-[1.0625rem]">
                −{product.bestPercent}&nbsp;%
              </span>
            ) : null}
          </div>
          <Sill />
          <div className="relative z-[2] flex w-[16rem] items-center justify-between gap-3 rounded-2xl bg-gradient-to-b from-[#F6E7C4] to-or py-2.5 pl-4 pr-2.5 shadow-[0_10px_22px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(255_255_255/0.6)] lg:w-[19rem] lg:py-3 lg:pl-5 lg:pr-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[0.5625rem] font-extrabold uppercase tracking-[0.2em] text-erreur lg:text-[0.625rem]">
                Produit du jour{product.bestPercent ? ` · −${product.bestPercent}\u00A0%` : ''}
              </span>
              <Link href={`/produits/${product.slug}`} className="truncate font-display text-[1.125rem] leading-tight text-encre hover:underline lg:text-[1.375rem]">
                {product.name}
              </Link>
              <span className="flex items-baseline gap-2 whitespace-nowrap">
                <strong className={cn('text-[0.8125rem] tabular-nums lg:text-sm', product.bestPercent ? 'text-erreur' : 'text-encre')}>{priceOf(product)}</strong>
                {was && <span className="text-[0.6875rem] tabular-nums text-oud/70 line-through lg:text-xs">{formatFCFA(was)}</span>}
              </span>
            </span>
            <ShelfQuickAdd product={product} />
          </div>
        </>
      ) : (
        <EmptyNiche label="La lampe attend sa première création." whatsapp={whatsapp} big />
      )}
    </div>
  );
}

/** Les petites niches : créations, puis univers à venir, puis niches libres. */
function smallNiches(data: HomeData, whatsapp: string | null) {
  const items: React.ReactNode[] = data.niches.map((p) => <SmallNiche key={p.id} product={p} />);
  const soon = data.univers.filter((u) => u.count === 0);
  for (const u of soon) {
    if (items.length >= NICHES) break;
    const wa = whatsapp ? `${whatsapp}?text=${encodeURIComponent(`Bonjour Maison Adama, prévenez-moi à l’arrivée de vos ${u.label.toLowerCase()}.`)}` : null;
    items.push(<EmptyNiche key={u.slug} label={u.label} whatsapp={wa} />);
  }
  while (items.length < NICHES) items.push(<EmptyNiche key={`libre-${items.length}`} label="Prochaine création" whatsapp={null} />);
  return items;
}

export function EtagereWall({ data, whatsapp }: { data: HomeData; whatsapp: string | null }) {
  const empty = data.total === 0;
  const notify = whatsapp ? `${whatsapp}?text=${encodeURIComponent('Bonjour Maison Adama, prévenez-moi dès l’ouverture de la boutique.')}` : null;
  const smalls = smallNiches(data, whatsapp);
  const cta = empty ? (
    notify && (
      <a href={notify} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center gap-2 self-start rounded-full bg-sur-oud px-5 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille lg:h-[3.25rem] lg:px-6">
        <MessageCircle className="size-[18px]" strokeWidth={1.8} aria-hidden="true" /> Être prévenu sur WhatsApp
      </a>
    )
  ) : (
    <Link href="/boutique" className="flex h-12 items-center gap-2 self-start rounded-full bg-sur-oud px-5 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille lg:h-[3.25rem] lg:px-6">
      Toute la boutique <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
    </Link>
  );

  return (
    <section aria-label="Les alcôves de la Maison" className="lg:px-6 lg:pt-7">
      <div className="relative isolate overflow-hidden text-sur-oud lg:mx-auto lg:max-w-[88rem] lg:rounded-[40px]" style={{ background: VELVET }}>
        <div className="flex flex-col gap-4 px-5 pt-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-16 lg:pt-14">
          <div className="flex max-w-[42rem] flex-col gap-3 lg:gap-4">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-or">Les alcôves de la Maison · Dakar</span>
            <h1 className="text-[2.375rem] leading-none lg:text-[4rem]">{empty ? 'Les niches attendent leurs premières créations.' : 'Chaque création a sa niche.'}</h1>
          </div>
          <div className="flex flex-col gap-4 lg:max-w-[22rem]">
            <p className="text-[0.9375rem] leading-relaxed text-sur-oud/70">
              {empty
                ? 'La Maison choisit ses premières créations. Écrivez-nous : vous serez prévenu dès l’ouverture.'
                : 'Nos flacons exposés comme dans une maison de Saint-Louis. La lampe éclaire le produit du jour.'}
            </p>
            {cta}
          </div>
        </div>

        {/* Desktop : deux niches, la grande sous la lampe, deux niches */}
        <div className="hidden items-end justify-center gap-10 px-16 pb-12 pt-24 lg:flex xl:gap-14">
          {smalls.slice(0, 2)}
          <BigNiche featured={data.featured} whatsapp={notify} />
          {smalls.slice(2)}
        </div>

        {/* Mobile : la grande niche, puis les petites à faire glisser */}
        <div className="lg:hidden">
          <div className="flex justify-center pt-16">
            <BigNiche featured={data.featured} whatsapp={notify} />
          </div>
          <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-5 px-5 pb-8 pt-10 [scrollbar-width:none]">{smalls}</div>
        </div>

      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
//  « Sous la lampe » : le gros plan sur la création éclairée
// -----------------------------------------------------------------------------

const dayLabel = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', weekday: 'long', day: 'numeric', month: 'long' });

export function Spotlight({ featured, now }: { featured: NonNullable<HomeData['featured']>; now: Date }) {
  const { product } = featured;
  return (
    <section
      id="sous-la-lampe"
      aria-labelledby="spotlight-title"
      className="relative isolate overflow-hidden rounded-[32px] text-sur-oud lg:rounded-[40px]"
      style={{ background: VELVET }}
    >
      <span aria-hidden="true" className="absolute inset-3 -z-10 rounded-[24px] border border-or-clair/15 lg:inset-4 lg:rounded-[30px]" />
      <div className="grid gap-8 px-5 pb-8 pt-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:px-16 lg:py-16">
        {/* L'arche, sous la lampe */}
        <div className="relative mx-auto w-full max-w-[20rem] lg:max-w-none">
          <span aria-hidden="true" className="absolute -top-7 left-1/2 z-10 h-6 w-12 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-or-clair to-or shadow-[0_6px_26px_rgb(255_210_130/0.9)] lg:-top-9" />
          <span aria-hidden="true" className="absolute -top-4 left-1/2 -z-10 h-[70%] w-[130%] -translate-x-1/2 bg-[radial-gradient(50%_100%_at_50%_0%,rgb(255_226_160/0.35),transparent_70%)]" />
          <span aria-hidden="true" className="absolute -inset-2.5 rounded-b-[34px] rounded-t-full border border-or-clair/30" />
          <ProductVisual
            image={product.images[1] ?? product.images[0]}
            name={product.name}
            categorySlug={product.categorySlug}
            seed={product.id}
            tone={NIGHT_TONE}
            sizes="(min-width: 1024px) 416px, 320px"
            bottleClassName="w-[36%]"
            className="aspect-[4/5] rounded-b-[26px] rounded-t-full"
          />
          {product.bestPercent ? (
            <span className="absolute right-3 top-[18%] grid size-[4.5rem] -rotate-12 place-items-center rounded-full bg-or-clair text-center font-bold text-encre shadow-[0_10px_24px_rgb(0_0_0/0.35)] lg:size-20">
              <span className="text-[1.125rem] leading-none lg:text-xl">−{product.bestPercent}&nbsp;%</span>
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-px w-7 bg-or/70" />Sous la lampe</span>
            <span className="text-sur-oud/50">{dayLabel.format(now)}</span>
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-[0.75rem] uppercase tracking-[0.2em] text-sur-oud/60">{product.categoryName}</span>
            <h2 id="spotlight-title" className="text-[2.5rem] leading-[0.95] lg:text-[4rem]">{product.name}</h2>
          </div>
          {product.shortDescription && <p className="max-w-xl text-[0.9375rem] leading-relaxed text-sur-oud/75 lg:text-[1.0625rem]">{product.shortDescription}</p>}
          {product.families.length > 0 && (
            <ul aria-label="Familles olfactives" className="flex flex-wrap gap-2">
              {product.families.map((f) => (
                <li key={f} className="flex flex-col gap-0.5 rounded-2xl bg-sur-oud/[0.07] px-4 py-2.5 ring-1 ring-inset ring-or/20">
                  <span className="font-display text-base">{f}</span>
                  {FAMILY_HINTS[familySlug(f)] && <span className="text-xs text-sur-oud/60">{FAMILY_HINTS[familySlug(f)]}</span>}
                </li>
              ))}
            </ul>
          )}
          <SpotlightBuy product={product} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-sur-oud/10 pt-5 text-[0.8125rem] text-sur-oud/60">
            <Link href={`/produits/${product.slug}`} className="flex items-center gap-1.5 font-semibold text-or-clair hover:underline">
              Voir la fiche complète <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </Link>
            <span>Demain, la lampe éclairera une autre création.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
//  « Ce soir sur l'étagère »
// -----------------------------------------------------------------------------

const MOMENT_ICON = { 'Ce matin': Sun, 'Cet après-midi': Sunset, 'Ce soir': Moon } as const;

export function Tonight({ products, moment, total }: { products: ShopProduct[]; moment: string; total: number }) {
  const Icon = MOMENT_ICON[moment as keyof typeof MOMENT_ICON] ?? Moon;
  return (
    <section aria-labelledby="tonight" className="flex flex-col gap-5 lg:gap-7">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">
            <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" /> La sélection de la Maison
          </span>
          <h2 id="tonight" className="text-[1.875rem] leading-none text-encre lg:text-[2.75rem]">
            {moment} sur l’étagère
          </h2>
        </div>
        <Link href="/boutique" className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-oud hover:underline">
          <span className="lg:hidden">Boutique</span>
          <span className="hidden lg:inline">Toute la boutique</span>
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <TonightCarousel products={products} total={total} />
    </section>
  );
}

// -----------------------------------------------------------------------------
//  La billetterie
// -----------------------------------------------------------------------------

function TicketCard({ ticket }: { ticket: Ticket }) {
  const dark = ticket.key === 'best-sellers';
  const soon = ticket.stamp?.tone === 'or';
  return (
    <Link
      href={ticket.href}
      className={cn(
        'group relative grid h-[9.5rem] w-[19.75rem] shrink-0 snap-start grid-cols-[3.75rem_minmax(0,1fr)] overflow-hidden rounded-[20px] shadow-[0_18px_40px_rgb(43_29_18/0.14)] ring-1 ring-inset transition-transform duration-300 ease-out-soft hover:-translate-y-1 lg:h-[12.25rem] lg:w-auto lg:grid-cols-[5.75rem_minmax(0,1fr)]',
        dark ? 'bg-encre text-sur-oud ring-or/25' : 'bg-lin text-encre ring-filet',
      )}
    >
      <span className={cn('flex items-center justify-center', dark ? 'bg-oud' : 'bg-paille')}>
        <span className={cn('-rotate-90 whitespace-nowrap font-display text-[1.0625rem] tracking-[0.08em] lg:text-[1.375rem]', dark ? 'text-sur-oud' : 'text-oud')}>N° {ticket.num}</span>
      </span>
      {/* Encoches et perforation */}
      <span aria-hidden="true" className="absolute -top-[11px] left-[calc(3.75rem-11px)] size-[22px] rounded-full bg-sable lg:left-[calc(5.75rem-11px)]" />
      <span aria-hidden="true" className="absolute -bottom-[11px] left-[calc(3.75rem-11px)] size-[22px] rounded-full bg-sable lg:left-[calc(5.75rem-11px)]" />
      <span aria-hidden="true" className="absolute bottom-4 left-[3.75rem] top-4 border-l-2 border-dashed border-filet-fort lg:left-[5.75rem]" />

      <span className="flex min-w-0 items-center gap-3 p-3.5 pl-5 lg:gap-5 lg:p-6 lg:pl-7">
        <span className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
          <span className="text-[0.5625rem] tracking-[0.28em] text-or lg:text-[0.65625rem]">BILLET D’ENTRÉE</span>
          <span className="font-display text-[1.625rem] leading-none lg:text-[2.125rem]">{ticket.name}</span>
          <span className={cn('flex flex-col text-[0.71875rem] leading-snug lg:text-[0.8125rem]', dark ? 'text-sur-oud/70' : 'text-fumee')}>
            <span className="truncate">{ticket.lines[0]}</span>
            <span className="truncate">{ticket.lines[1]}</span>
          </span>
        </span>
        {ticket.product && !soon ? (
          <ProductVisual
            image={ticket.product.images[0]}
            name={ticket.product.name}
            categorySlug={ticket.product.categorySlug}
            seed={ticket.product.id}
            sizes="88px"
            bottleClassName="w-[44%]"
            className="h-[5.25rem] w-[3.6rem] shrink-0 rounded-b-[14px] rounded-t-full lg:h-[8rem] lg:w-[5.5rem]"
          />
        ) : (
          <span className="grid h-[5.25rem] w-[3.6rem] shrink-0 place-items-center rounded-b-[14px] rounded-t-full bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(196_174_138/0.18)_6px_7px)] ring-[1.5px] ring-inset ring-filet-fort lg:h-[8rem] lg:w-[5.5rem]">
            <svg viewBox="0 0 60 100" aria-hidden="true" className="h-auto w-[44%]">
              <path d={shapeFor('parfums')} fill="none" stroke="#B48A2C" strokeWidth="1.6" strokeDasharray="4 4" />
            </svg>
          </span>
        )}
      </span>
      {ticket.stamp && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-4 top-2.5 grid size-[4.25rem] -rotate-[14deg] place-items-center rounded-full border-2 text-center lg:right-5 lg:top-3 lg:size-[5.5rem]',
            ticket.stamp.tone === 'rouge' ? 'border-erreur/75 text-erreur/85' : 'border-or-profond/70 text-or-profond/85',
          )}
        >
          <span className="flex flex-col gap-0.5 text-[0.5rem] font-extrabold tracking-[0.16em] lg:text-[0.59375rem]">
            {ticket.stamp.label}
            <span className="text-[0.8125rem] tracking-[0.04em] lg:text-[0.9375rem]">{ticket.stamp.value}</span>
          </span>
        </span>
      )}
      <span className="sr-only">{ticket.stamp?.label === 'COMPOSTÉ' ? `Arrivage du ${ticket.stamp.value}` : ticket.stamp ? 'Bientôt' : ''}</span>
    </Link>
  );
}

export function Billetterie({ tickets, open }: { tickets: Ticket[]; open: boolean }) {
  return (
    <section aria-labelledby="billets" className="flex flex-col gap-5 lg:gap-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">La billetterie · nos collections</span>
          <h2 id="billets" className="text-[1.875rem] leading-none text-encre lg:text-[2.875rem]">Vos billets d’entrée</h2>
        </div>
        <span className="flex items-center gap-2.5 text-[0.8125rem] text-fumee lg:text-sm">
          <span aria-hidden="true" className={cn('size-2 rounded-full', open ? 'bg-succes ring-4 ring-succes-fond' : 'bg-or ring-4 ring-paille')} />
          {open ? 'Guichet ouvert tous les jours · entrée libre' : 'Ouverture prochaine · guichet en préparation'}
        </span>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
        {tickets.map((t) => (
          <TicketCard key={t.key} ticket={t} />
        ))}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
//  « Vous hésitez devant l'étagère ? »
// -----------------------------------------------------------------------------

export function DoubtBand({ whatsapp }: { whatsapp: string | null }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[radial-gradient(90%_60%_at_50%_40%,#6B4526_0%,#3A2716_45%,#17100A_100%)] px-6 py-8 text-sur-oud lg:rounded-[36px] lg:px-12 lg:py-10">
      <span aria-hidden="true" className="absolute -right-16 -top-16 -z-10 size-60 rounded-full border border-or-clair/20" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="flex max-w-xl flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or">Vous hésitez devant l’étagère ?</span>
          <h2 className="text-[1.625rem] leading-tight lg:text-[2.125rem]">Trois questions, et la Maison vous tend le bon flacon.</h2>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/trouver-mon-parfum"
            className="flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille"
          >
            <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" /> Trouver mon parfum
          </Link>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-sur-oud/30 px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-sur-oud/10"
            >
              <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" /> Demander conseil
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
