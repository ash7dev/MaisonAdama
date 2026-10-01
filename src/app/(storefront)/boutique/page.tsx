import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { activeFilterCount, parseShopParams, shopHref, SHOP_PAGE_SIZE, type ShopParams } from '@/features/shop/params';
import { SHOP_CATEGORIES } from '@/components/layout/nav-config';
import { getShopFacets, listShopProducts } from '@/features/shop/queries';
import { FilterBar, MobileFilters } from '@/features/shop/components/filters';
import VitrineIndex from '@/features/shop/components/VitrineIndex';
import { pickFeatured } from '@/features/shop/featured';
import MobileProductList from '@/features/shop/components/MobileProductList';
import TrustStrip from '@/features/shop/components/TrustStrip';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DESCRIPTION = 'Parfums, muscs, huiles, oud et thiouraye, choisis et préparés à Dakar. Livraison partout au Sénégal, paiement Wave ou à la livraison.';

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q } = parseShopParams(await searchParams);
  // Une page de résultats n'a pas à être indexée ; la boutique, si.
  return q
    ? { title: `« ${q} » · Recherche · Maison Adama`, robots: { index: false, follow: true } }
    : { title: 'La Boutique · Maison Adama', description: DESCRIPTION, alternates: { canonical: '/boutique' } };
}

const num = new Intl.NumberFormat('fr-FR');

function clearFilters(params: ShopParams): string {
  return shopHref({ ...params, collection: undefined, min: undefined, max: undefined, contenance: undefined, familles: [], pour: undefined, promo: false });
}

export default async function BoutiquePage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseShopParams(await searchParams);
  const [facets, listing] = await Promise.all([getShopFacets(), listShopProducts(params)]);
  const { products, total, hasMore } = listing;
  const catalogEmpty = facets.total === 0;
  const tabs = [{ slug: undefined as string | undefined, name: 'Tout', count: facets.total }, ...facets.univers];
  // Arrivée depuis le menu : la page prend le nom et la phrase de l'univers.
  const universMeta = params.univers
    ? {
        name: facets.univers.find((u) => u.slug === params.univers)?.name ?? SHOP_CATEGORIES.find((c) => c.slug === params.univers)?.label ?? params.univers,
        hint: SHOP_CATEGORIES.find((c) => c.slug === params.univers)?.hint,
      }
    : null;
  const universEmpty = Boolean(universMeta) && !params.q && total === 0 && activeFilterCount(params) === 0 && !params.collection;
  const searchEmpty = Boolean(params.q) && total === 0 && activeFilterCount(params) === 0 && !params.univers;
  const withoutSearch = shopHref({ ...params, q: undefined });

  const empty = catalogEmpty ? (
    <EmptyState
      icon={<Sparkles className="size-6" strokeWidth={1.5} aria-hidden="true" />}
      title="La boutique ouvre bientôt"
      text="Nos parfums, muscs, huiles, oud et thiouraye arrivent. Écrivez-nous sur WhatsApp pour être prévenu en premier."
    />
  ) : universEmpty && universMeta ? (
    <EmptyState
      icon={<Sparkles className="size-6" strokeWidth={1.5} aria-hidden="true" />}
      title={params.univers === 'oud' ? 'Notre oud arrive bientôt' : `Nos ${universMeta.name.toLowerCase()} arrivent bientôt`}
      text="La Maison prépare cet univers. Écrivez-nous sur WhatsApp pour être prévenu en premier, ou découvrez nos autres créations."
      action={{ href: shopHref({ ...params, univers: undefined }), label: 'Voir toute la boutique' }}
    />
  ) : searchEmpty ? (
    <EmptyState
      icon={<SearchX className="size-6" strokeWidth={1.5} aria-hidden="true" />}
      title={`Aucune création pour « ${params.q} »`}
      text="Vérifiez l’orthographe ou essayez un mot plus court : musc, oud, thiouraye, un nom de marque… La Maison peut aussi vous conseiller sur WhatsApp."
      action={{ href: withoutSearch, label: 'Voir toute la boutique' }}
    />
  ) : products.length === 0 ? (
    <EmptyState
      icon={<SearchX className="size-6" strokeWidth={1.5} aria-hidden="true" />}
      title="Aucune création ne correspond"
      text="Élargissez le prix ou retirez un filtre : nos conseils sont aussi sur WhatsApp."
      action={{ href: clearFilters(params), label: 'Effacer les filtres' }}
    />
  ) : null;

  const more = hasMore && (
    <div className="flex flex-col items-center gap-3 pt-4">
      <span className="text-[0.8125rem] text-fumee">
        {num.format(products.length)} sur {num.format(total)} créations
      </span>
      <span aria-hidden="true" className="h-[3px] w-56 overflow-hidden rounded-full bg-filet">
        <span className="block h-full rounded-full bg-oud" style={{ width: `${(products.length / total) * 100}%` }} />
      </span>
      <Link
        href={shopHref(params, { page: params.page + 1 })}
        scroll={false}
        className="flex h-[3.25rem] w-full items-center justify-center rounded-full border border-oud px-8 text-sm font-semibold text-oud transition-colors duration-150 hover:bg-oud hover:text-sur-oud sm:w-auto"
      >
        Voir {Math.min(SHOP_PAGE_SIZE, total - products.length)} créations de plus
      </Link>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-6 px-4 pb-16 pt-6 lg:gap-7 lg:px-10 lg:pb-20 lg:pt-10">
      {/* ═══════════════ En-tête ═══════════════ */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="flex flex-col gap-3">
          <nav aria-label="Fil d’Ariane" className="hidden text-[0.8125rem] text-fumee lg:block">
            <Link href="/" className="hover:text-encre">Accueil</Link> <span className="text-filet-fort">/</span>{' '}
            {params.q ? (
              <>
                <Link href={withoutSearch} className="hover:text-encre">Boutique</Link> <span className="text-filet-fort">/</span>{' '}
                <span className="text-encre">Recherche</span>
              </>
            ) : universMeta ? (
              <>
                <Link href={shopHref({ ...params, univers: undefined })} className="hover:text-encre">Boutique</Link> <span className="text-filet-fort">/</span>{' '}
                <span className="text-encre">{universMeta.name}</span>
              </>
            ) : (
              <span className="text-encre">Boutique</span>
            )}
          </nav>
          <div className="flex items-end justify-between gap-4">
            <h1 className="min-w-0 break-words text-[2.25rem] leading-none text-encre lg:text-[3.5rem]">
              {params.q ? `« ${params.q} »` : universMeta?.name ?? 'La Boutique'}
            </h1>
            <span className="text-[0.8125rem] text-fumee lg:hidden">
              <strong className="tabular-nums text-encre">{num.format(total)}</strong> création{total > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {params.q ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-fumee lg:justify-end lg:text-right">
            <span>
              <strong className="tabular-nums text-encre">{num.format(total)}</strong> création{total > 1 ? 's' : ''} pour votre recherche
            </span>
            <Link href={withoutSearch} scroll={false} className="font-semibold text-oud underline underline-offset-4">
              Effacer la recherche
            </Link>
          </p>
        ) : (
        <p className="hidden max-w-md text-right text-[0.9375rem] leading-relaxed text-fumee lg:block">
          {universMeta?.hint ? `${universMeta.hint}, choisis et préparés à Dakar.` : 'Parfums, muscs, huiles, oud et thiouraye, choisis et préparés à Dakar.'} Survolez une création : elle s’expose dans la vitrine.
        </p>
        )}
      </header>

      {!catalogEmpty && (
        <>
          {/* Univers : grands titres (desktop), pastilles collantes (mobile) */}
          <nav aria-label="Univers" className="hidden flex-wrap items-baseline gap-x-9 gap-y-2 border-b border-filet lg:flex">
            {tabs.map((t) => {
              const on = params.univers === t.slug;
              return (
                <Link
                  key={t.slug ?? 'tout'}
                  href={shopHref(params, { univers: t.slug })}
                  scroll={false}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    '-mb-px border-b-2 pb-3 font-display text-[1.625rem] transition-colors duration-150',
                    on ? 'border-oud text-encre' : 'border-transparent text-fumee hover:text-encre',
                  )}
                >
                  {t.name}
                  <sup className={cn('ml-1 font-sans text-xs', on ? 'text-or-profond' : '')}>{t.count}</sup>
                </Link>
              );
            })}
          </nav>
          <nav aria-label="Univers" className="sticky top-[4.5rem] z-20 -mx-4 overflow-x-auto bg-sable/95 px-4 py-2 backdrop-blur-md [scrollbar-width:none] lg:hidden">
            <ul className="flex w-max gap-2">
              {tabs.map((t) => {
                const on = params.univers === t.slug;
                return (
                  <li key={t.slug ?? 'tout'}>
                    <Link
                      href={shopHref(params, { univers: t.slug })}
                      scroll={false}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[0.8125rem] transition-colors duration-150',
                        on ? 'border-oud bg-oud font-semibold text-sur-oud' : 'border-filet bg-lin text-encre',
                      )}
                    >
                      {t.name}
                      <span className={cn('text-xs', on ? 'text-sur-oud/70' : 'text-fumee')}>{t.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden lg:block">
            <FilterBar params={params} facets={facets} total={total} />
          </div>
          <div className="lg:hidden">
            <MobileFilters params={params} facets={facets} total={total} />
          </div>
        </>
      )}

      {/* ═══════════════ Résultats ═══════════════ */}
      {empty ?? (
        <>
          <div className="hidden lg:block">
            <VitrineIndex products={products} total={total} featured={pickFeatured(products)} />
          </div>
          <div className="lg:hidden">
            <MobileProductList products={products} />
          </div>
          {more}
        </>
      )}

      {/* ═══════════════ Engagements ═══════════════ */}
      <TrustStrip className="mt-6" />
    </div>
  );
}

function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: { href: string; label: string } }) {
  return (
    <section className="flex min-h-[26rem] flex-col items-center justify-center gap-4 rounded-[36px] bg-[radial-gradient(90%_70%_at_50%_30%,#6B4526_0%,#3A2716_50%,#17100A_100%)] px-6 py-14 text-center text-sur-oud">
      <span className="relative grid size-16 place-items-center rounded-full bg-sur-oud/10 text-or-clair ring-1 ring-or-clair/25">
        <span aria-hidden="true" className="absolute -inset-3 rounded-full border border-dashed border-or-clair/20" />
        {icon}
      </span>
      <h2 className="text-[1.75rem] leading-tight">{title}</h2>
      <p className="max-w-md text-[0.9375rem] leading-relaxed text-sur-oud/75">{text}</p>
      {action && (
        <Link href={action.href} scroll={false} className="mt-2 flex h-12 items-center rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille">
          {action.label}
        </Link>
      )}
    </section>
  );
}
