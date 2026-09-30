import Link from 'next/link';
import { BarChart3, ChevronRight, Inbox, TriangleAlert } from 'lucide-react';
import { PanelEmpty } from '../ui';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_UI } from '@/features/orders/labels';
import type { DashboardData } from '../../queries';
import { money, num } from '../../format';
import { Amount } from './amounts';

const weekdayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Africa/Dakar' });
const weekdayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Africa/Dakar' });
const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

// -----------------------------------------------------------------------------
//  Cette semaine : 7 derniers jours (toujours, quelle que soit la période choisie)
// -----------------------------------------------------------------------------

export function WeekBars({ data }: { data: DashboardData }) {
  const days = data.kpis.daily.slice(-7);
  const total = days.reduce((s, d) => s + d.revenue, 0);
  const max = Math.max(0, ...days.map((d) => d.revenue));
  const best = days.reduce<(typeof days)[number] | null>((b, d) => (d.revenue > 0 && (!b || d.revenue > b.revenue) ? d : b), null);
  const dayOf = (key: string) => new Date(`${key}T12:00:00Z`);

  return (
    <section aria-labelledby="week-title" className="flex flex-col gap-4 rounded-[28px] border border-filet bg-lin p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="week-title" className="text-[1.375rem] leading-tight text-encre">Cette semaine</h2>
        <p className="flex items-baseline gap-1.5">
          <Amount className="font-display text-[1.375rem] leading-none text-encre">{num(total)}</Amount>
          <span className="text-xs text-fumee">FCFA</span>
        </p>
      </div>
      <div
        role="img"
        aria-label={`Chiffre d’affaires des 7 derniers jours : ${days.map((d) => `${weekdayLong.format(dayOf(d.key))} ${money(d.revenue)}`).join(', ')}`}
        className="relative grid h-[140px] grid-cols-7 items-end gap-2"
      >
        {total === 0 && (
          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1.5 pt-3 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-lin text-or-profond ring-1 ring-filet">
              <BarChart3 className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span className="text-[0.8125rem] font-medium text-encre">Vos 7 derniers jours s’afficheront ici</span>
          </div>
        )}
        {days.map((d, i) => {
          const today = i === days.length - 1;
          const isBest = best?.key === d.key;
          return (
            <div key={d.key} className="flex h-full flex-col items-center justify-end gap-2">
              <span
                className={cn('block w-full max-w-[30px] rounded-[10px]', today ? 'bg-or' : isBest ? 'bg-oud' : d.revenue > 0 ? 'bg-paille' : 'bg-filet/60')}
                style={{ height: total === 0 ? `${14 + 16 * (0.5 + 0.5 * Math.sin(i * 0.9))}px` : max > 0 && d.revenue > 0 ? `${Math.max(6, (d.revenue / max) * 110)}px` : '6px' }}
              />
              <span className={cn('whitespace-nowrap text-xs', today ? 'font-bold text-encre' : 'text-fumee')}>
                {today ? 'Auj.' : weekdayShort.format(dayOf(d.key)).replace('.', '')}
              </span>
            </div>
          );
        })}
      </div>
      {total > 0 && <p className="text-xs text-fumee">
        {best ? (
          <>
            Meilleur jour : <strong className="font-semibold text-encre">{weekdayLong.format(dayOf(best.key))} · <Amount>{money(best.revenue)}</Amount></strong>
          </>
        ) : (
          'Aucune vente ces 7 derniers jours.'
        )}
      </p>}
    </section>
  );
}

// -----------------------------------------------------------------------------
//  Activité : dernières commandes, groupées par jour, comme des transactions
// -----------------------------------------------------------------------------

export function ActivityList({ orders, today }: { orders: DashboardData['recent']; today: string }) {
  const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  const groups = new Map<string, DashboardData['recent']>();
  for (const o of orders) {
    const key = o.createdAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const label = (key: string) => (key === today ? 'AUJOURD’HUI' : key === yesterday ? 'HIER' : dayMonth.format(new Date(`${key}T12:00:00Z`)).toUpperCase());

  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="activity-title" className="text-[1.375rem] leading-tight text-encre">Activité</h2>
        <Link href="/admin/commandes" className="text-[0.8125rem] font-semibold text-or-profond">Tout voir</Link>
      </div>
      {orders.length === 0 ? (
        <PanelEmpty icon={<Inbox strokeWidth={1.5} aria-hidden="true" />} title="Aucune commande pour le moment" action={{ href: '/', label: 'Voir la boutique' }}>
          Chaque commande s’affichera ici comme une transaction : client, montant et statut.
        </PanelEmpty>
      ) : (
        [...groups.entries()].map(([key, list]) => (
          <div key={key} className="flex flex-col gap-1.5">
            <span className="px-1 pt-1 text-[0.6875rem] tracking-[0.2em] text-fumee">{label(key)}</span>
            <ul className="rounded-[24px] border border-filet bg-lin px-3.5">
              {list.map((o) => {
                const paid = o.paymentStatus === 'PAYE';
                const initials = o.customerName.split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : '')).join('').toUpperCase();
                return (
                  <li key={o.id} className="border-b border-filet/70 last:border-b-0">
                    <Link href={`/admin/commandes/${o.id}`} className="flex items-center gap-3 py-3">
                      <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-paille font-display text-sm text-oud">{initials}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold text-encre">{o.customerName}</span>
                        <span className="truncate text-xs text-fumee">
                          {o.orderNumber.replace(/^CMD-\d{4}-/, 'CMD-')} · {o.city} · {time.format(new Date(o.createdAt))}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <Amount className={cn('text-sm font-bold', paid ? 'text-succes' : 'text-encre')}>
                          {paid ? '+ ' : ''}
                          {num(o.total)}
                        </Amount>
                        <span className={cn('inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[0.625rem] font-semibold', ORDER_STATUS_UI[o.status].chip)}>
                          {ORDER_STATUS_UI[o.status].label}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
//  Stock bas
// -----------------------------------------------------------------------------

export function LowStockBanner({ data }: { data: DashboardData }) {
  if (data.lowStockCount === 0) return null;
  const first = data.lowStock[0];
  return (
    <Link href="/admin/produits?statut=stock-bas" className="flex items-center gap-3 rounded-[22px] bg-erreur-fond px-4 py-3.5 text-erreur">
      <TriangleAlert className="size-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-sm">
          {data.lowStockCount} contenance{data.lowStockCount > 1 ? 's' : ''} en stock bas
        </strong>
        {first && (
          <span className="truncate text-xs">
            {first.name} {first.label} : {first.daysLeft !== null ? `rupture dans ${first.daysLeft} j` : `${first.stock} restant${first.stock > 1 ? 's' : ''}`}
          </span>
        )}
      </span>
      <span className="flex items-center text-[0.8125rem] font-semibold">
        Réassort <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );
}

