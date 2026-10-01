import Link from 'next/link';
import { Bell, ExternalLink, Plus, Share2, TicketPercent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import type { DashboardData } from '../../queries';
import { num, signedPercent, trendOf } from '../../format';
import { PeriodSwitch } from '../ui';
import { Amount, AmountsToggle } from './amounts';

const dateLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

const TREND_ON_DARK = {
  up: 'bg-[#9BC27A]/20 text-[#C4DDAE]',
  down: 'bg-[#E07A5F]/20 text-[#F2B8A8]',
  flat: 'bg-sur-oud/10 text-sur-oud/80',
};

/** Courbe lissée du CA par jour (ou mois) écoulé. */
function sparkline(values: number[], width: number, height: number) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  if (max <= 0) return null;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 4 - (v / max) * (height - 10)] as const);
  let d = `M0 ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = ((pts[i - 1][0] + pts[i][0]) / 2).toFixed(1);
    d += ` C${cx} ${pts[i - 1][1].toFixed(1)} ${cx} ${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  return { line: d, area: `${d} L${width} ${height} L0 ${height} Z`, last: pts[pts.length - 1] };
}

/** En-tête « wallet » du mobile : identité, CA de la période, courbe, période, actions rapides. */
export default function WalletHeader({ data, firstName }: { data: DashboardData; firstName: string }) {
  const { revenue, period } = data;
  const trend = trendOf(revenue.change);
  const curve = sparkline(revenue.series.filter((b) => !b.isFuture).map((b) => b.paid + b.pending), 350, 70);
  const toConfirm = data.counts.ordersToConfirm;

  return (
    <>
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-b-[36px] bg-oud px-5 pb-16 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-sur-oud">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-16 size-64 rounded-full border border-or-clair/15" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 top-0 size-40 rounded-full border border-or-clair/10" />

        <div className="relative flex items-center gap-3">
          <Link href="/admin/compte" aria-label="Mon compte" className="grid size-11 shrink-0 place-items-center rounded-full bg-sur-oud font-display text-lg text-oud">
            {firstName.charAt(0).toUpperCase()}
          </Link>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span suppressHydrationWarning className="truncate text-xs text-sur-oud/75 first-letter:uppercase">{dateLong.format(new Date())}</span>
            <span className="truncate text-[1.0625rem] font-semibold">Bonjour {firstName}</span>
          </span>
          <Link
            href="/admin/commandes?statut=a-confirmer"
            aria-label={toConfirm ? `${toConfirm} commande${toConfirm > 1 ? 's' : ''} à confirmer` : 'Commandes'}
            className="relative grid size-11 shrink-0 place-items-center rounded-full bg-sur-oud/10"
          >
            <Bell className="size-5" strokeWidth={1.8} aria-hidden="true" />
            {toConfirm > 0 && <span className="absolute right-[11px] top-[10px] size-2 rounded-full bg-[#E0A24A] ring-2 ring-oud" />}
          </Link>
        </div>

        <div className="relative flex flex-col gap-2">
          <span className="flex items-center gap-1 text-xs tracking-[0.06em] text-sur-oud/75">
            Chiffre d’affaires · {period.label}
            <AmountsToggle className="-my-2" />
          </span>
          <p className="flex items-baseline gap-2">
            <Amount className="font-display text-[2.875rem] leading-[0.95]">{num(revenue.revenue)}</Amount>
            <span className="text-[0.9375rem] text-sur-oud/75">FCFA</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {revenue.change !== null && (
              <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 font-semibold tabular-nums', TREND_ON_DARK[trend])}>
                {trend === 'up' ? '↗ ' : trend === 'down' ? '↘ ' : ''}
                {signedPercent(revenue.change)}
              </span>
            )}
            <span className="text-sur-oud/75">{period.compareLabel}</span>
          </p>
        </div>

        {curve ? (
          <svg viewBox="0 0 350 70" preserveAspectRatio="none" className="relative h-[70px] w-full" aria-hidden="true">
            <defs>
              <linearGradient id="wallet-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#D9B45E" stopOpacity="0.35" />
                <stop offset="1" stopColor="#D9B45E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={curve.area} fill="url(#wallet-fill)" />
            <path d={curve.line} fill="none" stroke="#D9B45E" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <div className="relative flex h-[70px] items-end">
            <span aria-hidden="true" className="absolute inset-x-0 bottom-3 border-t border-dashed border-sur-oud/25" />
            <span className="relative mx-auto mb-5 rounded-full bg-oud px-3 text-xs text-sur-oud/70">La courbe démarre avec votre première vente</span>
          </div>
        )}

        <PeriodSwitch current={period.key} tone="dark" labels={{ '7j': 'Semaine', mois: 'Mois', annee: 'Année' }} className="relative" />
      </header>

      {/* Actions rapides, à cheval sur l'en-tête */}
      <nav aria-label="Actions rapides" className="relative z-10 mx-4 -mt-10 grid grid-cols-4 rounded-[28px] bg-lin px-2 py-4 shadow-[0_18px_40px_rgb(74_46_28/0.14)]">
        {[
          { href: '/admin/produits/nouveau', label: 'Produit', icon: Plus, strong: true },
          { href: '/admin/promotions/nouvelle', label: 'Promo', icon: TicketPercent },
          // Le lien de la boutique, prêt à envoyer sur WhatsApp (client ou Statut).
          {
            href: `https://wa.me/?text=${encodeURIComponent(`Découvrez la Maison Adama Tchurayy : parfums, muscs, huiles, oud et thiouraye, livrés partout au Sénégal. ${siteConfig.url}`)}`,
            label: 'Partager',
            icon: Share2,
            external: true,
          },
          { href: '/', label: 'Boutique', icon: ExternalLink, external: true },
        ].map(({ href, label, icon: Icon, strong, external }) => (
          <Link
            key={label}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="flex flex-col items-center gap-2 text-xs font-medium text-encre"
          >
            <span className={cn('grid size-[52px] place-items-center rounded-full', strong ? 'bg-oud text-sur-oud' : 'bg-paille text-oud')}>
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
