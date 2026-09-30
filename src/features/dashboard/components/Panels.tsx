import Image from 'next/image';
import Link from 'next/link';
import { CalendarClock, Crown, ImageIcon, Inbox, PieChart, Sparkles, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/dates';
import { productImageUrl } from '@/lib/supabase/storage';
import { PaymentChip, StatusChip } from '@/features/orders/components/order-ui';
import { formatDiscount } from '@/features/promotions/schemas';
import type { DashboardData, FeedTone } from '../queries';
import { money, num, pct, signed, signedPercent, trendOf } from '../format';
import { DeltaChip, Panel, PanelEmpty } from './ui';

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Dakar' });

// -----------------------------------------------------------------------------
//  Aujourd'hui
// -----------------------------------------------------------------------------

const FEED_DOT: Record<FeedTone, string> = {
  order: 'border-or',
  wave: 'border-[#1F5673]',
  progress: 'border-oud',
  success: 'border-succes',
  danger: 'border-erreur',
};

export function TodayFeed({ feed }: { feed: DashboardData['feed'] }) {
  return (
    <Panel
      id="today"
      title="Aujourd’hui"
      className="h-full"
      aside={
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-succes">
          <span className="size-[7px] rounded-full bg-succes shadow-[0_0_0_4px_rgb(79_107_58/0.14)]" />
          en direct
        </span>
      }
    >
      {feed.length === 0 ? (
        <PanelEmpty icon={<Sparkles strokeWidth={1.5} aria-hidden="true" />} title="Journée calme pour l’instant">
          Chaque nouvelle commande, confirmation, livraison ou paiement s’inscrira ici en direct.
        </PanelEmpty>
      ) : (
        <ol className="flex flex-col">
          {feed.map((event, i) => (
            <li key={`${event.at}-${i}`}>
              <Link href={`/admin/commandes/${event.orderId}`} className="group grid grid-cols-[2.75rem_1.125rem_minmax(0,1fr)] gap-x-2.5">
                <span className="pt-0.5 text-xs tabular-nums text-fumee">{time.format(new Date(event.at))}</span>
                <span className="flex flex-col items-center">
                  <span className={cn('mt-1 size-[11px] shrink-0 rounded-full border-2 bg-lin', FEED_DOT[event.tone])} />
                  <span className={cn('my-1 w-px flex-1', i === feed.length - 1 ? 'bg-transparent' : 'bg-filet')} />
                </span>
                <span className="flex flex-col gap-0.5 pb-4">
                  <span className="text-sm font-medium text-encre decoration-or underline-offset-4 group-hover:underline">{event.title}</span>
                  <span className="text-xs text-fumee">{event.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <Link href="/admin/commandes" className="mt-auto border-t border-filet pt-3.5 text-[0.8125rem] font-semibold text-or-profond hover:text-oud">
        Toutes les commandes →
      </Link>
    </Panel>
  );
}

// -----------------------------------------------------------------------------
//  Indicateurs
// -----------------------------------------------------------------------------

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 0);
  return (
    <span aria-hidden="true" className="flex h-9 items-end gap-[3px]">
      {values.map((v, i) => (
        <span
          key={i}
          className={cn('block w-1.5 rounded-[3px]', i === values.length - 1 ? 'bg-or' : 'bg-paille')}
          style={{ height: max > 0 ? `${Math.max(12, (v / max) * 100)}%` : '12%' }}
        />
      ))}
    </span>
  );
}

export function KpiGrid({ data }: { data: DashboardData }) {
  const { kpis } = data;
  const daily = kpis.daily;
  const cards = [
    {
      label: 'Commandes',
      value: num(kpis.orders.value),
      unit: '',
      delta: <DeltaChip trend={trendOf(kpis.orders.delta)}>{signed(kpis.orders.delta)}</DeltaChip>,
      bars: daily.map((d) => d.orders),
      hint: `${kpis.orders.confirmed} confirmée${kpis.orders.confirmed > 1 ? 's' : ''} · ${kpis.orders.cancelled} annulée${kpis.orders.cancelled > 1 ? 's' : ''}`,
    },
    {
      label: 'Panier moyen',
      value: kpis.basket.value !== null ? num(kpis.basket.value) : '—',
      unit: kpis.basket.value !== null ? 'FCFA' : '',
      delta: kpis.basket.change !== null ? <DeltaChip trend={trendOf(kpis.basket.change)}>{signedPercent(kpis.basket.change)}</DeltaChip> : null,
      bars: daily.map((d) => d.basket),
      hint:
        kpis.basket.itemsPerOrder !== null
          ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(kpis.basket.itemsPerOrder)} article${kpis.basket.itemsPerOrder >= 2 ? 's' : ''} par commande`
          : 'Aucune commande sur la période',
    },
    {
      label: 'Taux de confirmation',
      value: kpis.confirmation.value !== null ? String(Math.round(kpis.confirmation.value * 100)) : '—',
      unit: kpis.confirmation.value !== null ? '%' : '',
      delta:
        kpis.confirmation.deltaPoints !== null ? (
          <DeltaChip trend={trendOf(kpis.confirmation.deltaPoints)}>{signed(kpis.confirmation.deltaPoints, 'pts')}</DeltaChip>
        ) : null,
      bars: daily.map((d) => d.confirmation),
      hint: 'Confirmées sur les commandes traitées',
    },
    {
      label: 'Nouveaux clients',
      value: num(kpis.newCustomers.value),
      unit: '',
      delta: <DeltaChip trend={trendOf(kpis.newCustomers.delta)}>{signed(kpis.newCustomers.delta)}</DeltaChip>,
      bars: daily.map((d) => d.newCustomers),
      hint: data.repeatRate !== null ? `${pct(data.repeatRate)} des clients reviennent` : 'Première commande sur la période',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
      {cards.map((c) => (
        <section key={c.label} aria-label={c.label} className="flex min-w-0 flex-col gap-3.5 rounded-[26px] border border-filet bg-lin p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-sans text-[0.8125rem] font-normal text-fumee">{c.label}</h3>
            {c.delta}
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="font-display text-[2.125rem] leading-none tabular-nums text-encre">{c.value}</span>
              {c.unit && <span className="text-[0.8125rem] text-fumee">{c.unit}</span>}
            </p>
            <MiniBars values={c.bars} />
          </div>
          <p className="text-xs text-fumee">{c.hint}</p>
        </section>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Dernières commandes
// -----------------------------------------------------------------------------

export function RecentOrdersTable({ orders }: { orders: DashboardData['recent'] }) {
  return (
    <section aria-labelledby="recent-title" className="min-w-0 overflow-hidden rounded-[32px] border border-filet bg-lin">
      <div className="flex items-baseline justify-between gap-4 px-6 pb-3 pt-6">
        <h2 id="recent-title" className="text-[1.375rem] leading-tight text-encre">
          Dernières commandes
        </h2>
        <Link href="/admin/commandes" className="whitespace-nowrap text-[0.8125rem] font-semibold text-or-profond hover:text-oud">
          Toutes les commandes →
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="px-6 pb-6">
          <PanelEmpty icon={<Inbox strokeWidth={1.5} aria-hidden="true" />} title="Aucune commande pour le moment" action={{ href: '/', label: 'Voir la boutique' }}>
            Les commandes passées sur la boutique arriveront ici, avec leur paiement et leur statut.
          </PanelEmpty>
        </div>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-filet text-[0.6875rem] uppercase tracking-[0.12em] text-fumee">
              <th scope="col" className="py-2.5 pl-6 pr-3 font-medium">Commande</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Client</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Montant</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Paiement</th>
              <th scope="col" className="py-2.5 pl-3 pr-6 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="group border-b border-filet/60 transition-colors duration-150 last:border-b-0 hover:bg-white/50">
                <td className="py-3.5 pl-6 pr-3">
                  <Link href={`/admin/commandes/${o.id}`} className="flex flex-col gap-0.5">
                    <span className="whitespace-nowrap font-semibold tabular-nums text-encre decoration-or underline-offset-4 group-hover:underline">{o.orderNumber}</span>
                    <span suppressHydrationWarning className="whitespace-nowrap text-xs text-fumee">{formatRelative(o.createdAt)}</span>
                  </Link>
                </td>
                <td className="px-3 py-3.5">
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-encre">{o.customerName}</span>
                    <span className="text-xs text-fumee">{o.city}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 font-semibold tabular-nums text-encre">{money(o.total)}</td>
                <td className="px-3 py-3.5"><PaymentChip method={o.paymentMethod} status={o.paymentStatus} /></td>
                <td className="py-3.5 pl-3 pr-6"><StatusChip status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
//  Ventes par univers
// -----------------------------------------------------------------------------

const SLICE_COLORS = ['#4A2E1C', '#B48A2C', '#D9B45E', '#C4AE8A', '#1F5673'];

export function CategoryDonut({ data }: { data: DashboardData }) {
  const { slices } = data.categories;
  const circumference = 100;
  let offset = 25;
  return (
    <Panel id="categories" title="Ventes par univers">
      <div className="relative mx-auto size-[184px]">
        <svg viewBox="0 0 42 42" className="size-full" role="img" aria-label={slices.map((s) => `${s.name} ${pct(s.share)}`).join(', ') || 'Aucune vente'}>
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#F1E9DB" strokeWidth="5" />
          {slices.length === 0 && <circle cx="21" cy="21" r="15.915" fill="none" stroke="#DCCBAE" strokeWidth="5" strokeDasharray="1.2 2.4" />}
          {slices.map((s, i) => {
            const len = s.share * circumference;
            const gap = slices.length > 1 ? 0.8 : 0;
            const el = (
              <circle
                key={s.name}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                strokeWidth="5"
                strokeDasharray={`${Math.max(0, len - gap)} ${circumference - Math.max(0, len - gap)}`}
                strokeDashoffset={offset}
              />
            );
            offset -= len;
            return el;
          })}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {slices.length === 0 ? (
            <PieChart className="size-7 text-filet-fort" strokeWidth={1.4} aria-hidden="true" />
          ) : (
            <>
              <span className="font-display text-[1.75rem] leading-none tabular-nums text-encre">{num(data.revenue.orders)}</span>
              <span className="text-xs text-fumee">commande{data.revenue.orders > 1 ? 's' : ''}</span>
            </>
          )}
        </span>
      </div>
      {slices.length === 0 ? (
        <p className="text-center text-[0.8125rem] leading-relaxed text-fumee">
          La répartition entre parfums, oud, muscs, huiles et encens se dessinera dès la première vente.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {slices.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2.5 text-sm">
              <span className="size-2.5 shrink-0 rounded-[4px]" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
              <span className="min-w-0 flex-1 truncate text-encre">{s.name}</span>
              <span className="whitespace-nowrap text-[0.8125rem] tabular-nums text-fumee">{num(s.amount)}</span>
              <span className="w-11 whitespace-nowrap text-right font-semibold tabular-nums text-encre">{pct(s.share)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------
//  Quand vos clients commandent
// -----------------------------------------------------------------------------

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const LEVELS = ['bg-sable ring-1 ring-inset ring-filet', 'bg-paille', 'bg-or-clair', 'bg-or', 'bg-oud'];

export function OrderHeatmap({ heatmap }: { heatmap: DashboardData['heatmap'] }) {
  const peak = heatmap.peak;
  const insight = heatmap.total === 0
    ? 'Tranches de 3 heures, du lundi au dimanche.'
    : !heatmap.reliable
    ? `Tendance visible à partir de 20 commandes (${heatmap.total} sur les 90 derniers jours).`
    : peak
      ? `Pic le ${DAYS_LONG[peak.day]} entre ${peak.slot * 3} h et ${peak.slot * 3 + 3} h : le bon moment pour vos statuts WhatsApp.`
      : '';
  return (
    <Panel
      id="heatmap"
      title="Quand vos clients commandent"
      aside={
        <span aria-hidden="true" className="flex items-center gap-1.5 whitespace-nowrap text-[0.6875rem] text-fumee">
          moins
          {LEVELS.map((l) => (
            <span key={l} className={cn('size-3.5 rounded-[4px]', l)} />
          ))}
          plus
        </span>
      }
    >
      <p className="-mt-2 text-[0.8125rem] text-fumee">{insight} <span className="whitespace-nowrap">90 derniers jours, heure de Dakar.</span></p>
      <div className="relative">
      {heatmap.total === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-lin/70 text-center backdrop-blur-[1px]">
          <span className="grid size-12 place-items-center rounded-full bg-lin text-or-profond shadow-[0_8px_24px_rgb(74_46_28/0.08)] ring-1 ring-filet">
            <CalendarClock className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="font-display text-[1.125rem] text-encre">La carte se dessine avec vos commandes</p>
          <p className="max-w-sm text-[0.8125rem] text-fumee">Vous saurez quels jours et à quelles heures publier vos statuts WhatsApp.</p>
        </div>
      )}
      <div role="table" aria-label="Commandes par jour et par tranche de 3 heures" className="grid grid-cols-[2.5rem_repeat(8,minmax(0,1fr))] gap-1.5 text-[0.6875rem] text-fumee">
        <span role="row" className="contents">
          <span role="columnheader" />
          {Array.from({ length: 8 }, (_, s) => (
            <span role="columnheader" key={s} className="whitespace-nowrap">{s * 3} h</span>
          ))}
        </span>
        {heatmap.grid.map((row, d) => (
          <span role="row" key={d} className="contents">
            <span role="rowheader" className="self-center">{DAYS[d]}</span>
            {row.map((cell, s) => (
              <span
                role="cell"
                key={s}
                title={`${DAYS_LONG[d]} ${s * 3} h – ${s * 3 + 3} h : ${cell.count} commande${cell.count > 1 ? 's' : ''}`}
                aria-label={`${DAYS_LONG[d]} ${s * 3} h à ${s * 3 + 3} h, ${cell.count} commande${cell.count > 1 ? 's' : ''}`}
                className={cn('h-8 rounded-lg', LEVELS[cell.level])}
              />
            ))}
          </span>
        ))}
      </div>
      </div>
    </Panel>
  );
}

// -----------------------------------------------------------------------------
//  Promotion en cours
// -----------------------------------------------------------------------------

export function PromotionPanel({ promotion }: { promotion: DashboardData['promotion'] }) {
  if (!promotion) {
    return (
      <section aria-labelledby="promo-title" className="flex flex-col gap-4 rounded-[32px] border border-dashed border-filet-fort bg-lin p-6">
        <h2 id="promo-title" className="text-[1.375rem] leading-tight text-encre">Promotion en cours</h2>
        <p className="text-sm leading-relaxed text-fumee">Aucune remise active. Tabaski, Korité, fin de série : programmez-la à l’avance, elle démarrera toute seule.</p>
        <Link href="/admin/promotions/nouvelle" className="mt-auto flex h-11 w-fit items-center rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover">
          Créer une promotion
        </Link>
      </section>
    );
  }
  const endsAt = new Date(promotion.endsAt);
  const targets = [
    promotion.products && `${promotion.products} produit${promotion.products > 1 ? 's' : ''}`,
    promotion.variants && `${promotion.variants} contenance${promotion.variants > 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ');
  return (
    <section aria-labelledby="promo-title" className="flex flex-col gap-4 rounded-[32px] bg-paille p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="promo-title" className="text-[1.375rem] leading-tight text-encre">Promotion en cours</h2>
        <span className="whitespace-nowrap rounded-full bg-succes-fond px-2.5 py-1 text-xs font-semibold text-succes">
          {promotion.otherActive ? `+${promotion.otherActive} autre${promotion.otherActive > 1 ? 's' : ''}` : 'Active'}
        </span>
      </div>
      <Link href={`/admin/promotions/${promotion.id}`} className="group flex items-center gap-4">
        <span className="grid h-[72px] min-w-[5.5rem] place-items-center whitespace-nowrap rounded-[22px] bg-oud px-3.5 font-display text-[1.75rem] text-sur-oud">
          {formatDiscount(promotion.type, promotion.value)}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <strong className="truncate text-[1.0625rem] font-semibold text-encre decoration-oud underline-offset-4 group-hover:underline">{promotion.name}</strong>
          <span className="text-[0.8125rem] text-oud">{targets}</span>
        </span>
      </Link>
      <div className="flex flex-col gap-2">
        <span className="h-1.5 overflow-hidden rounded-full bg-oud/15">
          <span className="block h-full origin-left rounded-full bg-oud" style={{ transform: `scaleX(${promotion.progress})` }} />
        </span>
        <span className="flex justify-between gap-3 text-[0.8125rem] text-oud">
          <span suppressHydrationWarning>{remaining(endsAt)}</span>
          <span className="whitespace-nowrap">fin le {dayMonth.format(endsAt)} à {time.format(endsAt)}</span>
        </span>
      </div>
      <dl className="mt-auto grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 rounded-2xl bg-lin/65 px-3.5 py-3">
          <dt className="text-xs text-oud">Commandes</dt>
          <dd className="text-lg font-semibold tabular-nums text-encre">{num(promotion.orders)}</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-lin/65 px-3.5 py-3">
          <dt className="text-xs text-oud">Remises accordées</dt>
          <dd className="whitespace-nowrap text-lg font-semibold tabular-nums text-encre">{num(promotion.discount)}</dd>
        </div>
      </dl>
    </section>
  );
}

function remaining(endsAt: Date): string {
  const minutes = Math.max(1, Math.round((endsAt.getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `Encore ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Encore ${hours} h`;
  return `Encore ${Math.round(hours / 24)} jours`;
}

// -----------------------------------------------------------------------------
//  Meilleures ventes et zones
// -----------------------------------------------------------------------------

export function BestSellers({ best, periodLabel }: { best: DashboardData['best']; periodLabel: string }) {
  const top = best[0]?.quantity ?? 0;
  return (
    <Panel id="best" title="Meilleures ventes" aside={<span className="whitespace-nowrap text-xs text-fumee">unités · {periodLabel.toLowerCase()}</span>}>
      {best.length === 0 ? (
        <PanelEmpty icon={<Crown strokeWidth={1.5} aria-hidden="true" />} title="Le podium est encore libre">
          Vos produits les plus vendus de la période s’afficheront ici, classés par unités.
        </PanelEmpty>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {best.map((b) => {
            const url = productImageUrl(b.storagePath);
            return (
              <li key={b.productId}>
                <Link href={`/admin/produits/${b.productId}`} className="group flex items-center gap-3">
                  <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-paille/60">
                    {url ? <Image src={url} alt="" fill sizes="44px" className="object-cover" /> : <ImageIcon className="size-4 text-or-profond/50" strokeWidth={1.4} aria-hidden="true" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-encre decoration-or underline-offset-4 group-hover:underline">{b.name}</span>
                      <strong className="whitespace-nowrap font-semibold tabular-nums text-encre">{num(b.quantity)}</strong>
                    </span>
                    <span className="h-[5px] overflow-hidden rounded-full bg-sable">
                      <span className="block h-full rounded-full bg-or" style={{ width: `${top ? (b.quantity / top) * 100 : 0}%` }} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export function ZoneStats({ zones }: { zones: DashboardData['zones'] }) {
  const hours = zones.averageDeliveryHours;
  return (
    <Panel
      id="zones"
      title="Livraisons par zone"
      aside={hours !== null ? <span className="whitespace-nowrap text-xs text-fumee">délai moyen {hours < 48 ? `${Math.round(hours)} h` : `${Math.round(hours / 24)} j`}</span> : undefined}
    >
      {zones.zones.length === 0 ? (
        <PanelEmpty icon={<Truck strokeWidth={1.5} aria-hidden="true" />} title="Aucune livraison sur la période" action={{ href: '/admin/parametres#livraison', label: 'Voir mes zones' }}>
          La part de chaque zone et le délai moyen de livraison apparaîtront avec vos premières commandes.
        </PanelEmpty>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {zones.zones.map((z, i) => (
            <li key={z.name} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-3 text-sm">
                <span className="truncate font-medium text-encre">{z.name}</span>
                <span className="whitespace-nowrap tabular-nums text-fumee">
                  {num(z.orders)} commande{z.orders > 1 ? 's' : ''} · <strong className="font-semibold text-encre">{pct(z.share)}</strong>
                </span>
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-sable">
                <span className={cn('block h-full rounded-full', i === 0 ? 'bg-oud' : 'bg-filet-fort')} style={{ width: `${z.share * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {zones.deliverySuccess !== null && (
        <p className="mt-auto rounded-2xl bg-succes-fond px-3.5 py-3 text-[0.8125rem] text-succes">
          {num(zones.delivered)} colis livré{zones.delivered > 1 ? 's' : ''} · {pct(zones.deliverySuccess)} des colis expédiés arrivent à destination.
        </p>
      )}
    </Panel>
  );
}
