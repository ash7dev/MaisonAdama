import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { productImageUrl } from '@/lib/supabase/storage';
import { getStoreSettings } from '@/features/settings';
import { getActiveDeliveryZones } from '@/features/delivery';
import { getRelatedProducts, getShopProduct } from '@/features/shop/queries';
import { FAMILY_HINTS } from '@/features/shop/families';
import ProductGallery from '@/features/shop/components/product/ProductGallery';
import StoryHero from '@/features/shop/components/product/StoryHero';
import { BuyPanel, ProductPurchaseProvider, StickyBuyBar } from '@/features/shop/components/product/purchase';
import ShopCard from '@/features/shop/components/ShopCard';

type PageProps = { params: Promise<{ slug: string }> };

const GENDER: Record<string, string> = { HOMME: 'Homme', FEMME: 'Femme', UNISEXE: 'Mixte' };
const CONCENTRATION: Record<string, string> = { EAU_DE_TOILETTE: 'Eau de toilette', EAU_DE_PARFUM: 'Eau de parfum', EXTRAIT: 'Extrait de parfum' };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) return { title: 'Création introuvable · Maison Adama' };
  const image = productImageUrl(product.allImages[0]?.path);
  const description = product.seoDescription ?? product.shortDescription ?? `${product.name}, ${product.categoryName.toLowerCase()} de la Maison Adama. Livraison partout au Sénégal.`;
  return {
    title: product.seoTitle ?? `${product.name} · Maison Adama`,
    description,
    alternates: { canonical: `/produits/${product.slug}` },
    openGraph: { title: product.name, description, type: 'website', images: image ? [{ url: image }] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) notFound();

  const [related, zones, settings] = await Promise.all([getRelatedProducts(product), getActiveDeliveryZones(), getStoreSettings()]);
  const subtitle = [product.categoryName, product.concentration && CONCENTRATION[product.concentration], product.gender && GENDER[product.gender]].filter(Boolean).join(' · ');

  // Données structurées : prix et disponibilité dans les résultats Google.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? undefined,
    image: product.allImages.map((i) => productImageUrl(i.path)).filter(Boolean),
    category: product.categoryName,
    brand: { '@type': 'Brand', name: 'Maison Adama' },
    offers: product.variants.map((v) => ({
      '@type': 'Offer',
      name: v.label,
      price: v.price - v.discount,
      priceCurrency: 'XOF',
      availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteConfig.url}/produits/${product.slug}`,
    })),
  };

  const familyCards = product.families.map((name, i) => ({ name, hint: FAMILY_HINTS[product.familySlugs[i]] }));

  return (
    <ProductPurchaseProvider product={product} whatsappNumber={settings?.whatsappNumber ?? null}>
      <span data-mobile-chromeless hidden />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <div className="mx-auto flex max-w-shop flex-col gap-14 px-4 pb-32 lg:gap-20 lg:px-10 lg:pb-20 lg:pt-8">
        <div className="flex flex-col gap-5">
          <nav aria-label="Fil d’Ariane" className="hidden text-[0.8125rem] text-fumee lg:block">
            <Link href="/" className="hover:text-encre">Accueil</Link> <span className="text-filet-fort">/</span>{' '}
            <Link href="/boutique" className="hover:text-encre">Boutique</Link> <span className="text-filet-fort">/</span>{' '}
            <Link href={`/boutique?univers=${product.categorySlug}`} className="hover:text-encre">{product.categoryName}</Link> <span className="text-filet-fort">/</span>{' '}
            <span className="text-encre">{product.name}</span>
          </nav>

          <StoryHero product={product} />

          <div className="grid items-start gap-0 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-12">
            <div className="hidden lg:block">
              <ProductGallery product={product} />
            </div>

            {/* Mobile : la feuille remonte sur la photo ; desktop : panneau collant */}
            <section
              id="details"
              aria-labelledby="product-title"
              className="relative -mx-4 -mt-6 flex scroll-mt-4 flex-col gap-6 rounded-t-[30px] bg-sable px-4 pt-7 lg:sticky lg:top-[6.5rem] lg:mx-0 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0"
            >
              <span aria-hidden="true" className="mx-auto -mt-3 h-[5px] w-11 rounded-full bg-filet-fort lg:hidden" />
              <div className="flex flex-col gap-1 lg:hidden">
                <span className="text-[0.6875rem] tracking-[0.22em] text-or-profond">{subtitle.toUpperCase()}</span>
                <h2 id="product-title-mobile" className="text-[1.75rem] leading-tight text-encre">Les détails</h2>
              </div>
              <div className="hidden flex-col gap-2.5 lg:flex">
                <span className="text-[0.6875rem] tracking-[0.22em] text-or-profond">{subtitle.toUpperCase()}</span>
                <h1 id="product-title" className="text-[2.375rem] leading-none text-encre lg:text-[3.375rem]">{product.name}</h1>
                {product.shortDescription && <p className="text-[0.9375rem] leading-relaxed text-fumee lg:text-base">{product.shortDescription}</p>}
              </div>

              {familyCards.length > 0 && (
                <ul aria-label="Familles olfactives" className="flex flex-wrap gap-2">
                  {familyCards.map((f) => (
                    <li key={f.name} className="flex flex-col gap-0.5 rounded-2xl bg-lin px-3.5 py-2.5 ring-1 ring-inset ring-filet">
                      <strong className="font-display text-base font-normal text-encre">{f.name}</strong>
                      {f.hint && <span className="text-[0.71875rem] text-fumee">{f.hint}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <BuyPanel zones={zones} />

              <div className="border-t border-filet">
                {product.description && (
                  <Details title="Description" open>
                    <p className="whitespace-pre-line">{product.description}</p>
                  </Details>
                )}
                <Details title="Livraison et paiement">
                  <p>
                    Nous livrons partout au Sénégal. Votre commande est confirmée par téléphone ou WhatsApp, puis préparée et remise au livreur.
                    {zones.length > 0 && ` Tarifs : ${zones.map((z) => `${z.name} ${z.defaultFee === 0 ? 'offerte' : `${new Intl.NumberFormat('fr-FR').format(z.defaultFee)} FCFA`}`).join(' · ')}.`}
                  </p>
                  <p className="mt-2">Payez par Wave, ou en espèces à la livraison.</p>
                </Details>
              </div>
            </section>
          </div>
        </div>

        {/* ═══ Le mot de la Maison ═══ */}
        {(product.shortDescription || product.description) && (
          <section aria-labelledby="house-title" className="grid gap-8 rounded-[40px] bg-oud px-6 py-12 text-sur-oud lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14 lg:px-14 lg:py-16">
            <div className="flex flex-col gap-5">
              <h2 id="house-title" className="font-sans text-[0.6875rem] font-medium tracking-[0.3em] text-or-clair">LE MOT DE LA MAISON</h2>
              <p className="text-[1.75rem] leading-[1.25] text-sur-oud lg:text-[2.5rem]">« {product.shortDescription ?? product.name} »</p>
              {product.description && product.shortDescription && (
                <p className="line-clamp-6 max-w-2xl whitespace-pre-line text-[0.9375rem] leading-relaxed text-sur-oud/75">{product.description}</p>
              )}
            </div>
            <dl className="grid content-start gap-3">
              {[
                ['Univers', product.categoryName],
                ['Pour', product.gender ? GENDER[product.gender] : null],
                ['Concentration', product.concentration ? CONCENTRATION[product.concentration] : null],
                ['Familles', product.families.join(', ') || null],
                ['Contenances', product.variants.map((v) => v.label).join(' · ')],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-6 border-b border-sur-oud/12 pb-3">
                    <dt className="text-xs tracking-[0.18em] text-or-clair">{String(k).toUpperCase()}</dt>
                    <dd className="text-right text-[0.9375rem] text-sur-oud">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}

        {/* ═══ Vous aimerez aussi ═══ */}
        {related.length > 0 && (
          <section aria-labelledby="related-title" className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="related-title" className="text-[1.75rem] leading-tight text-encre lg:text-[2.125rem]">Vous aimerez aussi</h2>
              <Link href="/boutique" className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-or-profond hover:text-oud">
                Toute la boutique <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
            <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
              {related.map((p) => (
                <li key={p.id} className="w-[64vw] max-w-[16rem] shrink-0 snap-start lg:w-auto lg:max-w-none">
                  <ShopCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <StickyBuyBar />
    </ProductPurchaseProvider>
  );
}

function Details({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group border-b border-filet">
      <summary className="flex h-[3.75rem] cursor-pointer list-none items-center justify-between text-[0.9375rem] font-semibold text-encre [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-5 text-or-profond transition-transform duration-200 group-open:rotate-180" strokeWidth={1.8} aria-hidden="true" />
      </summary>
      <div className="pb-5 text-[0.9375rem] leading-relaxed text-fumee">{children}</div>
    </details>
  );
}
