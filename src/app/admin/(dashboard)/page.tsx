import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { requireAdmin } from '@/features/auth/require-admin';
import { getDashboard } from '@/features/dashboard/queries';
import { parsePeriod } from '@/features/dashboard/period';
import RevenueHero from '@/features/dashboard/components/RevenueHero';
import {
  BestSellers,
  CategoryDonut,
  KpiGrid,
  OrderHeatmap,
  PromotionPanel,
  RecentOrdersTable,
  TodayFeed,
  ZoneStats,
} from '@/features/dashboard/components/Panels';
import { PeriodSwitch } from '@/features/dashboard/components/ui';
import WalletHeader from '@/features/dashboard/components/mobile/WalletHeader';
import NextActionStack from '@/features/dashboard/components/mobile/NextActionStack';
import { ActivityList, LowStockBanner, WeekBars } from '@/features/dashboard/components/mobile/MobileSections';
import { AmountsProvider } from '@/features/dashboard/components/mobile/amounts';
import { PendingIcon } from '@/components/ui/link-pending';
import LiveRefresh from '@/components/admin/LiveRefresh';

export const metadata: Metadata = {
  title: 'Tableau de bord · Administration Maison Adama',
};

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const [admin, { periode }] = await Promise.all([requireAdmin(), searchParams]);
  const data = await getDashboard(parsePeriod(periode));
  const firstName = admin.fullName.split(' ')[0];

  return (
    <>
      {/* ═══════════════════ Desktop : vue 360 ═══════════════════ */}
      {/* Nouvelles commandes, chiffres du jour : mis à jour en arrière-plan */}
      <LiveRefresh />
      <div className="hidden flex-col gap-6 px-2 pb-8 pt-3 lg:flex">
        <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-5 px-1">
          <div className="flex flex-col gap-2.5">
            <p suppressHydrationWarning className="text-[0.6875rem] tracking-[0.26em] text-or-profond">{today.format(new Date()).toUpperCase()}</p>
            <h1 className="text-[2.25rem] leading-none text-encre">Bonjour {firstName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSwitch current={data.period.key} currentLabel={data.period.label} />
            <Link
              href="/admin/commandes"
              className="flex h-11 items-center gap-2.5 rounded-full bg-lin px-4 text-[0.8125rem] text-fumee ring-1 ring-inset ring-filet transition-colors duration-150 hover:text-encre"
            >
              <Search className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
              Rechercher une commande
            </Link>
            <Link
              href="/admin/produits/nouveau"
              className="flex h-11 items-center gap-2 rounded-full bg-oud pl-4 pr-5 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
            >
              <PendingIcon className="size-4">
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              </PendingIcon>
              Nouveau produit
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_24.5rem] gap-5">
          <RevenueHero data={data} />
          <TodayFeed feed={data.feed} />
        </div>

        <KpiGrid data={data} />

        <div className="grid grid-cols-[minmax(0,1fr)_24.5rem] gap-5">
          <RecentOrdersTable orders={data.recent} />
          <CategoryDonut data={data} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_24.5rem] gap-5">
          <OrderHeatmap heatmap={data.heatmap} />
          <PromotionPanel promotion={data.promotion} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <BestSellers best={data.best} periodLabel={data.period.label} />
          <ZoneStats zones={data.zones} />
        </div>
      </div>

      {/* ═══════════════════ Mobile : l'essentiel ═══════════════════ */}
      <AmountsProvider>
        <div className="flex flex-col lg:hidden">
          <WalletHeader data={data} firstName={firstName} />
          <div className="flex flex-col gap-7 px-4 pb-10 pt-7">
            <NextActionStack queue={data.queue} firstRun={data.recent.length === 0} />
            <WeekBars data={data} />
            <ActivityList orders={data.recent} today={data.today} />
            <LowStockBanner data={data} />
          </div>
        </div>
      </AmountsProvider>
    </>
  );
}
