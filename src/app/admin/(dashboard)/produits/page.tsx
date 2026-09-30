import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PackageOpen, PackagePlus, Plus, SearchX } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import { requireAdmin } from '@/features/auth/require-admin';
import {
  listAdminProducts,
  listCategoriesForFilter,
  parseProductListParams,
  PRODUCTS_PER_PAGE,
  type ProductListParams,
  type ProductStatusFilter,
} from '@/features/catalog/queries/list-products';
import ProductsToolbar from '@/features/catalog/components/list/ProductsToolbar';
import { PendingIcon } from '@/components/ui/link-pending';
import StatusTabs from '@/features/catalog/components/list/StatusTabs';
import ProductList from '@/features/catalog/components/list/ProductList';
import Pagination from '@/features/catalog/components/list/Pagination';

export const metadata: Metadata = {
  title: 'Produits · Administration Maison Adama',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** URL de la liste avec des filtres modifiés ; les valeurs par défaut sont omises. */
function hrefFor(params: ProductListParams, changes: Partial<ProductListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.status !== 'tous') query.set('statut', next.status);
  if (next.category) query.set('categorie', next.category);
  if (next.sort !== 'recents') query.set('tri', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  return query.size ? `/admin/produits?${query}` : '/admin/produits';
}

const EMPTY_STATUS: Record<ProductStatusFilter, { title: string; description: string }> = {
  tous: { title: 'Aucun produit actif', description: 'Tous vos produits sont archivés : retrouvez-les dans l’onglet Archivés.' },
  publies: { title: 'Rien en boutique', description: 'Publiez un brouillon pour qu’il apparaisse dans la boutique.' },
  brouillons: { title: 'Aucun brouillon', description: 'Tous vos produits sont publiés.' },
  'stock-bas': { title: 'Aucun stock bas', description: 'Toutes vos contenances ont un stock confortable.' },
  archives: { title: 'Aucun produit archivé', description: 'Les produits retirés de la vente sans être supprimés apparaîtront ici.' },
};

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseProductListParams(await searchParams);
  const [, { products, total, statusCounts, pageCount }, categories] = await Promise.all([
    requireAdmin(),
    listAdminProducts(params),
    listCategoriesForFilter(),
  ]);

  // Page au-delà de la dernière (après un filtre ou une suppression) : dernière page.
  if (params.page > pageCount) redirect(hrefFor(params, { page: pageCount }));

  const hasFilters = Boolean(params.q || params.category);
  const catalogIsEmpty = !hasFilters && statusCounts.tous + statusCounts.archives === 0;

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pb-8 lg:pt-3">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 lg:min-h-[72px] lg:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">Produits</h1>
          <p className="text-sm text-fumee">
            <span className="tabular-nums">{statusCounts.publies}</span> en boutique ·{' '}
            <span className="tabular-nums">{statusCounts.brouillons}</span> brouillon{statusCounts.brouillons > 1 ? 's' : ''}
            {statusCounts['stock-bas'] > 0 && (
              <>
                {' · '}
                <Link href={hrefFor(params, { status: 'stock-bas', page: 1 })} className="font-medium text-alerte hover:underline">
                  {statusCounts['stock-bas']} en stock bas
                </Link>
              </>
            )}
          </p>
        </div>
        <Link
          href="/admin/produits/nouveau"
          className="flex h-12 items-center gap-2 rounded-full bg-oud pl-4 pr-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
        >
          <PendingIcon className="size-[18px]">
            <Plus className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </PendingIcon>
          Nouveau produit
        </Link>
      </header>

      <div className="flex flex-col gap-3.5">
        <StatusTabs current={params.status} counts={statusCounts} buildHref={(status) => hrefFor(params, { status, page: 1 })} />
        <ProductsToolbar categories={categories} initial={{ q: params.q, category: params.category, sort: params.sort }} />
      </div>

      {products.length > 0 ? (
        <ProductList products={products} />
      ) : catalogIsEmpty ? (
        <ListEmptyState
          tone="welcome"
          icon={<PackagePlus strokeWidth={1.5} aria-hidden="true" />}
          title="Votre catalogue est vide"
          description="Ajoutez votre premier parfum, musc, huile, oud ou encens : photos, contenances, prix et stock, en une seule page."
          action={
            <Link
              href="/admin/produits/nouveau"
              className="flex h-11 items-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
            >
              <PendingIcon className="size-4">
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              </PendingIcon>
              Ajouter un produit
            </Link>
          }
        />
      ) : hasFilters ? (
        <ListEmptyState
          icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
          title="Aucun produit ne correspond"
          description="Essayez un autre mot ou une autre catégorie."
          clearHref={hrefFor(params, { q: undefined, category: undefined, page: 1 })}
        />
      ) : (
        <ListEmptyState
          icon={<PackageOpen strokeWidth={1.5} aria-hidden="true" />}
          title={EMPTY_STATUS[params.status].title}
          description={EMPTY_STATUS[params.status].description}
        />
      )}

      <Pagination
        page={params.page}
        pageCount={pageCount}
        total={total}
        perPage={PRODUCTS_PER_PAGE}
        buildHref={(page) => hrefFor(params, { page })}
      />
    </div>
  );
}
