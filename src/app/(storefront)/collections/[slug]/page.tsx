import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoreSettings } from '@/features/settings';
import { whatsappLink } from '@/lib/whatsapp';
import type { ShopParams } from '@/features/shop/params';
import { getCollection, getShopFacets, listShopProducts, type ShopProduct } from '@/features/shop/queries';
import {
  ArrivalJournal,
  CollectionEmpty,
  CollectionHero,
  CollectionOutro,
  CollectionSwitcher,
  GiftAdvice,
  GiftChapters,
  GiftTag,
  HeroChip,
  LatestArrival,
  Podium,
  ProductGrid,
  Ranking,
  SalesCounter,
  giftChapters,
  groupArrivals,
} from '@/features/shop/components/collections';

/**
 * Collections éditoriales. Nouveautés et Best-sellers se calculent seuls
 * (date de mise en ligne, ventes réelles) ; Idées cadeaux suit la sélection
 * de la Maison. Toute autre collection active en base a une page sobre.
 */

type Props = { params: Promise<{ slug: string }> };

const BASE: ShopParams = { familles: [], promo: false, tri: 'pertinence', page: 1 };
const RECENT_DAYS = 90;
const num = new Intl.NumberFormat('fr-FR');

const EDITORIAL: Record<string, { title: string; description: string }> = {
  nouveautes: {
    title: 'Nouveautés',
    description: 'Les dernières créations arrivées à la Maison, jour après jour : parfums, muscs, huiles, oud et thiouraye.',
  },
  'best-sellers': {
    title: 'Best-sellers',
    description: 'Les créations les plus commandées ces 90 derniers jours, classées d’après les vraies ventes de la Maison.',
  },
  'idees-cadeaux': {
    title: 'Idées cadeaux',
    description: 'Des créations choisies pour offrir, classées par budget. Conseil sur WhatsApp, livraison partout au Sénégal.',
  },
};

// Les trois collections éditoriales sont pré-générées ; les autres à la demande.
export const revalidate = 300;

export function generateStaticParams() {
  return Object.keys(EDITORIAL).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const known = EDITORIAL[slug];
  const collection = known ? null : await getCollection(slug);
  const title = known?.title ?? collection?.name;
  if (!title) return {};
  return {
    title: `${title} · Maison Adama`,
    description: known?.description ?? collection?.description ?? undefined,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const page =
    slug === 'nouveautes' ? await Nouveautes() : slug === 'best-sellers' ? await BestSellers() : slug === 'idees-cadeaux' ? await IdeesCadeaux() : await Generic(slug);

  return <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-4 lg:gap-12 lg:px-10 lg:pb-20 lg:pt-8">{page}</div>;
}

function Breadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Fil d’Ariane" className="hidden text-[0.8125rem] text-fumee lg:block">
      <Link href="/" className="hover:text-encre">Accueil</Link> <span className="text-filet-fort">/</span>{' '}
      <Link href="/boutique" className="hover:text-encre">Boutique</Link> <span className="text-filet-fort">/</span>{' '}
      <span className="text-encre">{name}</span>
    </nav>
  );
}

// ═══════════════ Nouveautés : le carnet d'arrivages ═══════════════

async function Nouveautes() {
  const { products } = await listShopProducts({ ...BASE, tri: 'nouveautes' });
  const dated = products.filter((p) => p.publishedAt).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
  const since = Date.now() - RECENT_DAYS * 86_400_000;
  const recent = dated.filter((p) => Date.parse(p.publishedAt!) >= since);
  // Peu d'arrivages récents : on montre quand même les dernières, avec leur vraie date.
  const shown = recent.length >= 4 ? recent : dated.slice(0, 8);
  const days = groupArrivals(shown);
  const latest = shown[0];

  return (
    <>
      <Breadcrumb name="Nouveautés" />
      <CollectionHero
        index="01"
        title="Nouveautés"
        story="Le carnet d’arrivages de la Maison : chaque création y entre à sa date, la plus récente en haut. Revenez souvent, il s’écrit au fil des arrivées."
        meta={
          <>
            <HeroChip>
              <strong className="font-semibold text-sur-oud">{recent.length}</strong> arrivée{recent.length > 1 ? 's' : ''} en {RECENT_DAYS} jours
            </HeroChip>
            {days.length > 0 && <HeroChip>{days.length} date{days.length > 1 ? 's' : ''} au carnet</HeroChip>}
          </>
        }
        aside={latest && <LatestArrival product={latest} />}
      />
      <CollectionSwitcher current="nouveautes" />
      {days.length > 0 ? (
        <ArrivalJournal days={days} />
      ) : (
        <CollectionEmpty
          title="Les premiers arrivages se préparent"
          text="Le carnet s’ouvrira avec la première création mise en ligne. En attendant, la Maison vous conseille sur WhatsApp."
          actions={[{ href: '/boutique', label: 'Voir la boutique' }, { href: '/trouver-mon-parfum', label: 'Trouver mon parfum' }]}
        />
      )}
      <CollectionOutro href="/boutique?tri=nouveautes" label="Toutes les nouveautés dans la boutique" />
    </>
  );
}

// ═══════════════ Best-sellers : le podium ═══════════════

async function BestSellers() {
  const { products } = await listShopProducts(BASE);
  const ranked = products.filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name, 'fr'));
  const units = ranked.reduce((s, p) => s + p.sold, 0);
  const rest = ranked.slice(3, 12);

  return (
    <>
      <Breadcrumb name="Best-sellers" />
      <CollectionHero
        index="02"
        title="Best-sellers"
        story="Ni coup de cœur, ni mise en avant payée : ce classement suit les vraies commandes des 90 derniers jours et change avec elles."
        meta={
          <HeroChip>
            {ranked.length > 0 ? (
              <>
                <strong className="font-semibold text-sur-oud">{ranked.length}</strong> création{ranked.length > 1 ? 's' : ''} classée{ranked.length > 1 ? 's' : ''}
              </>
            ) : (
              'Mis à jour à chaque commande'
            )}
          </HeroChip>
        }
        aside={<SalesCounter units={units} leader={ranked[0]} />}
      />
      <CollectionSwitcher current="best-sellers" />
      <section aria-label="Podium" className="flex flex-col gap-8 pt-6 lg:pt-10">
        <Podium ranked={ranked} />
        {ranked.length === 0 && (
          <p className="mx-auto max-w-md text-center text-[0.9375rem] leading-relaxed text-fumee">
            Aucune commande sur les 90 derniers jours pour l’instant : le podium se remplira tout seul, avec les créations que vous préférez.
          </p>
        )}
      </section>
      {rest.length > 0 && (
        <section aria-labelledby="suite" className="flex flex-col gap-4">
          <h2 id="suite" className="text-[1.5rem] text-encre lg:text-[2rem]">La suite du classement</h2>
          <Ranking ranked={rest} start={4} max={ranked[0].sold} />
        </section>
      )}
      {ranked.length < 3 && products.length > 0 && (
        <section aria-labelledby="attente" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 id="attente" className="text-[1.5rem] text-encre lg:text-[2rem]">En attendant le classement</h2>
            <p className="text-[0.9375rem] text-fumee">Toutes nos créations disponibles, les plus récentes d’abord.</p>
          </div>
          <ProductGrid products={products.filter((p) => !ranked.includes(p)).slice(0, 8)} />
        </section>
      )}
      <CollectionOutro href="/boutique" label="Les plus vendus d’abord, dans la boutique" />
    </>
  );
}

// ═══════════════ Idées cadeaux : chapitres par budget ═══════════════

async function IdeesCadeaux() {
  const [facets, curated, settings] = await Promise.all([
    getShopFacets(),
    listShopProducts({ ...BASE, collection: 'idees-cadeaux' }),
    getStoreSettings(),
  ]);
  // Sélection de la Maison ; tant qu'elle est vide, tout le catalogue disponible.
  const isCurated = curated.total > 0;
  const pool: ShopProduct[] = isCurated ? curated.products : (await listShopProducts(BASE)).products;
  const available = pool.filter((p) => p.inStock);
  const products = [...(available.length ? available : pool)].sort((a, b) => a.fromPrice - b.fromPrice);
  const chapters = giftChapters(products, facets.budgets, isCurated ? '?collection=idees-cadeaux' : '');
  const wa = whatsappLink(settings?.whatsappNumber, 'Bonjour Maison Adama, je cherche un parfum à offrir. Pouvez-vous me conseiller ?');

  return (
    <>
      <Breadcrumb name="Idées cadeaux" />
      <CollectionHero
        index="03"
        title="Idées cadeaux"
        story="Offrir un parfum, c’est offrir un souvenir. Choisissez d’abord votre budget : chaque chapitre rassemble des créations qui font toujours plaisir."
        meta={
          <>
            {products.length > 0 && (
              <HeroChip>
                <strong className="font-semibold text-sur-oud">{products.length}</strong> idée{products.length > 1 ? 's' : ''}
              </HeroChip>
            )}
            {chapters.length > 1 && <HeroChip>{chapters.length} budgets</HeroChip>}
            {products.length > 0 && <HeroChip>Dès {num.format(products[0].fromPrice)}&nbsp;FCFA</HeroChip>}
          </>
        }
        aside={<GiftTag />}
      />
      <CollectionSwitcher current="idees-cadeaux" />
      {chapters.length > 0 ? (
        <GiftChapters chapters={chapters} />
      ) : (
        <CollectionEmpty
          title="La sélection cadeaux se prépare"
          text="La Maison compose ses idées à offrir. Décrivez la personne sur WhatsApp : nous vous conseillons dès aujourd’hui."
          actions={[{ href: '/trouver-mon-parfum?offrir=1', label: 'Trouver son parfum' }, { href: '/boutique', label: 'Voir la boutique' }]}
        />
      )}
      <GiftAdvice whatsapp={wa} />
      <CollectionOutro href={isCurated ? '/boutique?collection=idees-cadeaux' : '/boutique?tri=prix-croissant'} label="Les idées cadeaux dans la boutique" />
    </>
  );
}

// ═══════════════ Autre collection (créée en base) ═══════════════

async function Generic(slug: string) {
  const collection = await getCollection(slug);
  if (!collection) notFound();
  const { products, total } = await listShopProducts({ ...BASE, collection: slug });

  return (
    <>
      <Breadcrumb name={collection.name} />
      <CollectionHero
        index="—"
        title={collection.name}
        story={collection.description ?? 'Une sélection de la Maison, choisie et préparée à Dakar.'}
        meta={
          <HeroChip>
            <strong className="font-semibold text-sur-oud">{total}</strong> création{total > 1 ? 's' : ''}
          </HeroChip>
        }
      />
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <CollectionEmpty
          title="Cette sélection arrive bientôt"
          text="La Maison la prépare. En attendant, découvrez toutes nos créations."
          actions={[{ href: '/boutique', label: 'Voir la boutique' }]}
        />
      )}
      <CollectionOutro href={`/boutique?collection=${encodeURIComponent(slug)}`} label="Cette collection dans la boutique" />
    </>
  );
}
