import type { Metadata } from 'next';
import Link from 'next/link';
import { PromotionType } from '@prisma/client';
import { CalendarClock, CalendarX2, Plus, SearchX, TicketPercent, ToggleLeft, Zap } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import { requireAdmin } from '@/features/auth/require-admin';
import { listPromotions, type PromotionRow } from '@/features/promotions/queries';
import { promotionState, type PromotionState } from '@/features/promotions/schemas';
import PromotionCard from '@/features/promotions/components/PromotionCard';
import PromotionsToolbar, { type PromotionTypeFilter } from '@/features/promotions/components/PromotionsToolbar';
import { PendingIcon, PendingSpinner } from '@/components/ui/link-pending';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Promotions · Administration Maison Adama',
};

const TABS = [
  { key: 'en-cours', label: 'En cours', state: 'active' },
  { key: 'programmees', label: 'Programmées', state: 'scheduled' },
  { key: 'terminees', label: 'Terminées', state: 'ended' },
  { key: 'desactivees', label: 'Désactivées', state: 'disabled' },
  { key: 'toutes', label: 'Toutes', state: null },
] as const satisfies ReadonlyArray<{ key: string; label: string; state: PromotionState | null }>;

type TabKey = (typeof TABS)[number]['key'];

/** Ordre utile par onglet : ce qui finit bientôt, ce qui commence bientôt… */
function sortFor(state: PromotionState | null) {
  return (a: PromotionRow, b: PromotionRow) => {
    if (state === 'active') return +new Date(a.endsAt) - +new Date(b.endsAt);
    if (state === 'scheduled') return +new Date(a.startsAt) - +new Date(b.startsAt);
    if (state === 'ended') return +new Date(b.endsAt) - +new Date(a.endsAt);
    return +new Date(b.startsAt) - +new Date(a.startsAt);
  };
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Recherche sur le nom de la promotion et des produits ciblés, sans accents. */
function matches(promotion: PromotionRow, q: string): boolean {
  const names = [promotion.name, ...promotion.targets.map((t) => t.product?.name ?? t.variant?.product.name ?? '')];
  return names.some((name) => normalize(name).includes(q));
}

const TYPE_OF: Record<Exclude<PromotionTypeFilter, 'tous'>, PromotionType> = {
  pourcentage: PromotionType.POURCENTAGE,
  montant: PromotionType.MONTANT_FIXE,
};

type ListParams = { tab: TabKey | null; q: string; type: PromotionTypeFilter };

/** URL de la liste avec des filtres modifiés ; les valeurs par défaut sont omises. */
function hrefFor(params: ListParams, changes: Partial<ListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.tab) query.set('statut', next.tab);
  if (next.q) query.set('q', next.q);
  if (next.type !== 'tous') query.set('type', next.type);
  return query.size ? `/admin/promotions?${query}` : '/admin/promotions';
}

const EMPTY_TAB: Record<TabKey, { icon: ReactNode; title: string; description: string }> = {
  'en-cours': {
    icon: <Zap strokeWidth={1.5} aria-hidden="true" />,
    title: 'Aucune promotion en cours',
    description: 'Les prix de la boutique sont affichés sans remise en ce moment.',
  },
  programmees: {
    icon: <CalendarClock strokeWidth={1.5} aria-hidden="true" />,
    title: 'Rien de programmé',
    description: 'Préparez à l’avance vos remises de Tabaski ou de Korité : elles démarreront toutes seules.',
  },
  terminees: {
    icon: <CalendarX2 strokeWidth={1.5} aria-hidden="true" />,
    title: 'Aucune promotion terminée',
    description: 'Les promotions passées restent ici, avec leur bilan, pour être relancées en un clic.',
  },
  desactivees: {
    icon: <ToggleLeft strokeWidth={1.5} aria-hidden="true" />,
    title: 'Aucune promotion désactivée',
    description: 'Une promotion mise en pause apparaît ici, sans effet sur les prix.',
  },
  toutes: {
    icon: <TicketPercent strokeWidth={1.5} aria-hidden="true" />,
    title: 'Aucune promotion',
    description: 'Créez votre première remise.',
  },
};

export default async function AdminPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; type?: string }>;
}) {
  const [, promotions, raw] = await Promise.all([requireAdmin(), listPromotions(), searchParams]);

  const q = (raw.q ?? '').trim().slice(0, 80);
  const type: PromotionTypeFilter = raw.type === 'pourcentage' || raw.type === 'montant' ? raw.type : 'tous';
  const hasFilters = Boolean(q) || type !== 'tous';

  // Les compteurs des onglets suivent la recherche et le type.
  const now = new Date();
  const needle = normalize(q);
  const withState = promotions
    .filter((p) => (type === 'tous' || p.type === TYPE_OF[type]) && (!needle || matches(p, needle)))
    .map((p) => ({ promotion: p, state: promotionState(p, now) }));
  const counts = Object.fromEntries(
    TABS.map((tab) => [tab.key, tab.state ? withState.filter((p) => p.state === tab.state).length : withState.length]),
  ) as Record<TabKey, number>;

  // Onglet par défaut : « En cours » s'il y en a, sinon « Toutes ».
  const requested = TABS.find((t) => t.key === raw.statut);
  const tab = requested ?? (counts['en-cours'] > 0 || promotions.length === 0 ? TABS[0] : TABS[4]);
  const params: ListParams = { tab: requested?.key ?? null, q, type };
  const visible = withState
    .filter((p) => !tab.state || p.state === tab.state)
    .map((p) => p.promotion)
    .sort(sortFor(tab.state));

  const activeCount = promotions.filter((p) => promotionState(p, now) === 'active').length;
  const scheduledCount = promotions.filter((p) => promotionState(p, now) === 'scheduled').length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pb-8 lg:pt-3">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 lg:min-h-[72px] lg:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">Promotions</h1>
          <p className="text-sm text-fumee">
            <span className={cn('tabular-nums', activeCount > 0 && 'font-medium text-succes')}>{activeCount}</span> en cours ·{' '}
            <span className="tabular-nums">{scheduledCount}</span> programmée{scheduledCount > 1 ? 's' : ''} · la meilleure remise l’emporte, sans cumul
          </p>
        </div>
        <Link
          href="/admin/promotions/nouvelle"
          className="flex h-12 items-center gap-2 rounded-full bg-oud pl-4 pr-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
        >
          <PendingIcon className="size-[18px]">
            <Plus className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </PendingIcon>
          Nouvelle promotion
        </Link>
      </header>

      <div className="flex flex-col gap-3.5">
        <nav aria-label="Filtrer par état" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          <ul className="flex w-max gap-1.5 rounded-full bg-lin p-1.5 ring-1 ring-inset ring-filet">
            {TABS.map((t) => {
              const active = t.key === tab.key;
              return (
                <li key={t.key}>
                  <Link
                    href={hrefFor(params, { tab: t.key })}
                    scroll={false}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-150',
                      active ? 'bg-oud font-medium text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre',
                    )}
                  >
                    {t.label}
                    <PendingSpinner className={active ? 'text-sur-oud' : undefined} />
                    <span
                      className={cn(
                        'grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                        active ? 'bg-sur-oud/15 text-sur-oud' : t.key === 'en-cours' && counts[t.key] > 0 ? 'bg-succes-fond text-succes' : 'bg-sable text-fumee',
                      )}
                    >
                      {counts[t.key]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <PromotionsToolbar
          initialQuery={q}
          type={type}
          typeHref={{
            tous: hrefFor(params, { type: 'tous' }),
            pourcentage: hrefFor(params, { type: 'pourcentage' }),
            montant: hrefFor(params, { type: 'montant' }),
          }}
        />
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((promotion) => (
            <PromotionCard key={promotion.id} promotion={promotion} />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <ListEmptyState
          tone="welcome"
          icon={<TicketPercent strokeWidth={1.5} aria-hidden="true" />}
          title="Aucune promotion pour le moment"
          description="Tabaski, Korité, fin de série : programmez une remise sur des produits ou des contenances précises. Le prix barré s’affiche tout seul dans la boutique pendant la période choisie."
          action={
            <Link
              href="/admin/promotions/nouvelle"
              className="flex h-11 items-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
            >
              <PendingIcon className="size-4">
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              </PendingIcon>
              Créer une promotion
            </Link>
          }
        />
      ) : hasFilters ? (
        <ListEmptyState
          icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
          title="Aucune promotion ne correspond"
          description={q ? 'Essayez un autre nom de promotion ou de produit.' : 'Aucune promotion de ce type dans cet onglet.'}
          clearHref={hrefFor(params, { q: '', type: 'tous' })}
        />
      ) : (
        <ListEmptyState icon={EMPTY_TAB[tab.key].icon} title={EMPTY_TAB[tab.key].title} description={EMPTY_TAB[tab.key].description} />
      )}
    </div>
  );
}
