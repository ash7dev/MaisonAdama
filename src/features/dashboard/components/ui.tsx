import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PendingSpinner } from '@/components/ui/link-pending';
import { DASHBOARD_PERIODS, type DashboardPeriodKey } from '../period';
import type { Trend } from '../format';

/** Carte claire du tableau de bord. */
export function Panel({
  id,
  title,
  aside,
  className,
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn('flex min-w-0 flex-col gap-4 rounded-[32px] border border-filet bg-lin p-6', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-title`} className="text-[1.375rem] leading-tight text-encre">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * État vide d'une carte : pastille, titre, explication et action. Garde la
 * hauteur de la carte pour que la grille reste équilibrée même sans données.
 */
export function PanelEmpty({
  icon,
  title,
  children,
  action,
  tone = 'light',
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl px-6 py-8 text-center',
        tone === 'light' ? 'border border-dashed border-filet-fort bg-sable/50' : 'bg-sur-oud/5',
        className,
      )}
    >
      <span
        className={cn(
          'relative grid size-14 place-items-center rounded-full [&_svg]:size-6',
          tone === 'light' ? 'bg-lin text-or-profond shadow-[0_8px_24px_rgb(74_46_28/0.08)] ring-1 ring-filet' : 'bg-sur-oud/10 text-or-clair',
        )}
      >
        <span aria-hidden="true" className={cn('absolute -inset-2 rounded-full border border-dashed', tone === 'light' ? 'border-filet' : 'border-sur-oud/15')} />
        {icon}
      </span>
      <p className={cn('font-display text-[1.125rem] leading-tight', tone === 'light' ? 'text-encre' : 'text-sur-oud')}>{title}</p>
      {children && <p className={cn('max-w-xs text-[0.8125rem] leading-relaxed', tone === 'light' ? 'text-fumee' : 'text-sur-oud/70')}>{children}</p>}
      {action && (
        <Link
          href={action.href}
          className={cn(
            'mt-1 flex h-10 items-center rounded-full px-4 text-[0.8125rem] font-semibold transition-colors duration-150',
            tone === 'light' ? 'bg-oud text-sur-oud hover:bg-oud-hover' : 'bg-sur-oud text-oud hover:bg-paille',
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

const TREND_CHIP: Record<Trend, string> = {
  up: 'bg-succes-fond text-succes',
  down: 'bg-erreur-fond text-erreur',
  flat: 'bg-sable text-fumee',
};

export function DeltaChip({ trend, children, className }: { trend: Trend; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-[26px] shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold tabular-nums', TREND_CHIP[trend], className)}>
      {children}
    </span>
  );
}

const PERIOD_LABEL: Record<DashboardPeriodKey, string> = { '7j': '7 jours', mois: 'Mois', annee: 'Année' };

/** Choix de la période (dans l'URL : partageable, bouton Retour). */
export function PeriodSwitch({
  current,
  currentLabel,
  tone = 'light',
  labels,
  className,
}: {
  current: DashboardPeriodKey;
  /** Libellé de la période active (« Septembre », « 2026 »). */
  currentLabel?: string;
  tone?: 'light' | 'dark';
  labels?: Partial<Record<DashboardPeriodKey, string>>;
  className?: string;
}) {
  return (
    <nav
      aria-label="Période"
      className={cn(
        'flex gap-1 rounded-full p-1',
        tone === 'light' ? 'bg-lin ring-1 ring-inset ring-filet' : 'bg-sur-oud/8',
        className,
      )}
    >
      {DASHBOARD_PERIODS.map((key) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={key === 'mois' ? '/admin' : `/admin?periode=${key}`}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[0.8125rem] transition-colors duration-150',
              tone === 'light'
                ? active
                  ? 'bg-oud font-semibold text-sur-oud'
                  : 'text-fumee hover:bg-sable hover:text-encre'
                : active
                  ? 'bg-sur-oud font-semibold text-oud'
                  : 'text-sur-oud/75 hover:text-sur-oud',
            )}
          >
            {active && currentLabel ? currentLabel : (labels?.[key] ?? PERIOD_LABEL[key])}
            <PendingSpinner />
          </Link>
        );
      })}
    </nav>
  );
}
