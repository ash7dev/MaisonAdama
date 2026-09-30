import type { Metadata } from 'next';
import Link from 'next/link';
import { Gift, SearchX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GENDER_LABELS, parseShopParams, shopHref, SHOP_GENDERS, SHOP_PAGE_SIZE, type ShopParams } from '@/features/shop/params';
import { getFamilyWheel, getShopFacets, listShopProducts } from '@/features/shop/queries';
import OlfactoryWheel from '@/features/shop/components/OlfactoryWheel';
import ShopCard from '@/features/shop/components/ShopCard';
import PerfumeConversation from '@/features/shop/components/PerfumeConversation';

export const metadata: Metadata = {
  title: 'Trouver mon parfum · Maison Adama',
  description: 'Choisissez les familles olfactives qui vous ressemblent sur la roue : la Maison vous propose ses créations, comme chez le parfumeur.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = '/trouver-mon-parfum';
/** Même logique de filtres que la boutique, sur cette page. */
const href = (p: ShopParams, changes: Partial<ShopParams> = {}) => shopHref(p, changes).replace('/boutique', PATH);

const chip = (on: boolean) =>
  cn(
    'flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[0.8125rem] transition-colors duration-150',
    on ? 'border-oud bg-oud font-semibold text-sur-oud' : 'border-filet bg-lin text-encre hover:border-filet-fort',
  );

export default async function FindMyPerfumePage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = parseShopParams(raw);
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const offrir = one('offrir') === '1';
  const etape = Math.min(4, Math.max(1, Number(one('etape')) || 1)) as 1 | 2 | 3 | 4;
  /** Liens qui gardent « offrir » et l'étape de la conversation. */
  const keep = (url: string, extra: Record<string, string | undefined> = {}) => {
    const [path, query = ''] = url.split('?');
    const q = new URLSearchParams(query);
    const values = { offrir: offrir ? '1' : undefined, etape: one('etape'), ...extra };
    for (const [k, v] of Object.entries(values)) if (v) q.set(k, v);
    const str = q.toString();
    return str ? `${path}?${str}` : path;
  };
  const [families, facets, listing] = await Promise.all([getFamilyWheel(), getShopFacets(), listShopProducts(params)]);

  const selectedNames = families.filter((f) => params.familles.includes(f.slug)).map((f) => f.name);
  // Les créations qui réunissent le plus de familles choisies d'abord (tri stable).
  const products = selectedNames.length
    ? [...listing.products].sort(
        (a, b) => b.families.filter((f) => selectedNames.includes(f)).length - a.families.filter((f) => selectedNames.includes(f)).length,
      )
    : listing.products;

  const toggleHref = Object.fromEntries(
    families.map((f) => [
      f.slug,
      keep(href(params, { familles: params.familles.includes(f.slug) ? params.familles.filter((x) => x !== f.slug) : [...params.familles, f.slug] })),
    ]),
  );
  const resetHref = keep(href(params, { familles: [] }));
  const budgetOn = (b: { min?: number; max?: number }) => params.min === b.min && params.max === b.max;
  const catalogEmpty = facets.total === 0;

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-10">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] tracking-[0.3em] text-or-profond">LE GUIDE DE LA MAISON</span>
          <h1 className="text-[2.25rem] leading-none text-encre lg:text-[3.5rem]">Trouvez votre sillage</h1>
        </div>
        <p className="hidden max-w-md text-[0.9375rem] leading-relaxed text-fumee lg:block lg:text-right">
          Touchez les familles qui vous ressemblent sur la roue, comme chez le parfumeur. La Maison compose la sélection pour vous.
        </p>
      </header>

      <div className="lg:hidden">
        <PerfumeConversation
          families={families}
          budgets={facets.budgets}
          initial={{
            step: etape,
            who: offrir ? 'offrir' : params.pour === 'femme' || params.pour === 'homme' ? params.pour : 'tous',
            familles: params.familles,
            budgetKey: facets.budgets.find((b) => budgetOn(b))?.key ?? null,
          }}
          initialSelection={etape === 4 ? { products: products.slice(0, 8), total: listing.total } : null}
        />
      </div>

      <div className="hidden items-start gap-8 lg:grid lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-10">
        {/* ═══ La roue ═══ */}
        <aside aria-label="Votre sélection" className="flex flex-col gap-7 rounded-[40px] border border-filet bg-lin p-5 lg:sticky lg:top-[6.5rem] lg:p-6">
          <OlfactoryWheel families={families} selected={params.familles} resultCount={listing.total} buildHref={toggleHref} resetHref={resetHref} />

          <div className="flex flex-col gap-3 px-1">
            <h2 className="font-sans text-[0.6875rem] font-semibold tracking-[0.2em] text-or-profond">POUR QUI ?</h2>
            <div className="flex flex-wrap gap-2">
              {SHOP_GENDERS.map((g) => (
                <Link key={g} href={keep(href(params, { pour: params.pour === g ? undefined : g }), { offrir: undefined })} scroll={false} aria-pressed={params.pour === g && !offrir} className={chip(params.pour === g && !offrir)}>
                  {GENDER_LABELS[g]}
                </Link>
              ))}
              <Link
                href={offrir ? href(params) : `${href(params, { pour: undefined })}${href(params, { pour: undefined }).includes('?') ? '&' : '?'}offrir=1`}
                scroll={false}
                aria-pressed={offrir}
                className={chip(offrir)}
              >
                <Gift className="size-3.5" strokeWidth={2} aria-hidden="true" />
                Pour offrir
              </Link>
            </div>
          </div>

          {facets.budgets.length > 0 && (
            <div className="flex flex-col gap-3 px-1">
              <h2 className="font-sans text-[0.6875rem] font-semibold tracking-[0.2em] text-or-profond">QUEL BUDGET ?</h2>
              <div className="flex flex-wrap gap-2">
                {facets.budgets.map((b) => (
                  <Link key={b.key} href={keep(href(params, budgetOn(b) ? { min: undefined, max: undefined } : { min: b.min, max: b.max }))} scroll={false} aria-pressed={budgetOn(b)} className={chip(budgetOn(b))}>
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {facets.univers.length > 1 && (
            <div className="flex flex-col gap-3 px-1">
              <h2 className="font-sans text-[0.6875rem] font-semibold tracking-[0.2em] text-or-profond">UNIVERS</h2>
              <div className="flex flex-wrap gap-2">
                {facets.univers.map((u) => (
                  <Link key={u.slug} href={keep(href(params, { univers: params.univers === u.slug ? undefined : u.slug }))} scroll={false} aria-pressed={params.univers === u.slug} className={chip(params.univers === u.slug)}>
                    {u.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ═══ La sélection ═══ */}
        <section aria-labelledby="selection-title" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-filet pb-4">
            <h2 id="selection-title" className="mr-2 text-[1.75rem] leading-tight text-encre">
              {selectedNames.length || params.pour || params.univers ? 'Votre sillage' : 'Toutes nos créations'}
            </h2>
            {[
              ...families.filter((f) => params.familles.includes(f.slug)).map((f) => ({ label: f.name, to: toggleHref[f.slug] })),
              ...(params.pour ? [{ label: GENDER_LABELS[params.pour], to: href(params, { pour: undefined }) }] : []),
              ...(params.univers ? [{ label: facets.univers.find((u) => u.slug === params.univers)?.name ?? params.univers, to: href(params, { univers: undefined }) }] : []),
            ].map((c) => (
              <Link key={c.label} href={c.to} scroll={false} className="flex h-9 items-center gap-1.5 rounded-full bg-oud pl-3.5 pr-2.5 text-[0.8125rem] font-semibold text-sur-oud">
                {c.label}
                <X className="size-3.5 opacity-70" strokeWidth={2.4} aria-label="retirer" />
              </Link>
            ))}
            <span className="ml-auto text-sm text-fumee">
              <strong className="tabular-nums text-encre">{listing.total}</strong> création{listing.total > 1 ? 's' : ''}
            </span>
          </div>

          {offrir && (
            <Link href="/boutique?collection=idees-cadeaux" className="flex items-center gap-4 rounded-[26px] bg-paille px-5 py-4 text-oud transition-colors duration-150 hover:bg-[#DFC89E]">
              <span className="grid size-11 place-items-center rounded-full bg-lin"><Gift className="size-5" strokeWidth={1.7} aria-hidden="true" /></span>
              <span className="flex flex-1 flex-col gap-0.5"><strong className="font-display text-lg font-normal text-encre">Un parfum à offrir ?</strong><span className="text-[0.8125rem]">Découvrez aussi nos idées cadeaux, prêtes à offrir.</span></span>
              <span className="text-sm font-semibold">Voir →</span>
            </Link>
          )}
          {catalogEmpty || products.length === 0 ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 rounded-[36px] bg-[radial-gradient(90%_70%_at_50%_30%,#6B4526_0%,#3A2716_50%,#17100A_100%)] px-6 py-14 text-center text-sur-oud">
              <span className="grid size-16 place-items-center rounded-full bg-sur-oud/10 text-or-clair ring-1 ring-or-clair/25">
                <SearchX className="size-6" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h3 className="text-[1.75rem] leading-tight">{catalogEmpty ? 'La sélection arrive bientôt' : 'Pas encore de création pour ce sillage'}</h3>
              <p className="max-w-md text-[0.9375rem] leading-relaxed text-sur-oud/75">
                {catalogEmpty ? 'Nos créations seront bientôt en ligne.' : 'Retirez une famille, ou demandez conseil à la Maison sur WhatsApp : nous trouverons votre parfum ensemble.'}
              </p>
              {!catalogEmpty && (
                <Link href={resetHref} scroll={false} className="mt-2 flex h-12 items-center rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre hover:bg-paille">
                  Réinitialiser la roue
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:gap-x-6">
                {products.map((p, i) => (
                  <ShopCard key={p.id} product={p} highlight={selectedNames} priority={i < 3} />
                ))}
              </div>
              {listing.hasMore && (
                <Link
                  href={href(params, { page: params.page + 1 })}
                  scroll={false}
                  className="flex h-[3.25rem] items-center justify-center self-center rounded-full border border-oud px-8 text-sm font-semibold text-oud transition-colors duration-150 hover:bg-oud hover:text-sur-oud"
                >
                  Voir {Math.min(SHOP_PAGE_SIZE, listing.total - products.length)} créations de plus
                </Link>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
