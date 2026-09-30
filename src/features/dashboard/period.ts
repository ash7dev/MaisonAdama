/**
 * Périodes du tableau de bord.
 *
 * Heure de Dakar = UTC+0 toute l'année (pas d'heure d'été) : les bornes calculées
 * ici en UTC sont donc exactement les minuits de Dakar. Les regroupements par
 * jour / mois se font aussi en SQL « AT TIME ZONE 'Africa/Dakar' ».
 *
 * Comparaison « à date » : la période précédente a la même durée écoulée
 * (1er → 30 sept. à 10 h 42 comparé au 1er → 30 août à 10 h 42), sinon un mois
 * en cours paraîtrait toujours en baisse face à un mois complet.
 */

export const DASHBOARD_PERIODS = ['7j', 'mois', 'annee'] as const;
export type DashboardPeriodKey = (typeof DASHBOARD_PERIODS)[number];

export type PeriodBucket = {
  /** 'YYYY-MM-DD' (jour) ou 'YYYY-MM' (mois), identique au to_char SQL. */
  key: string;
  /** Libellé court sous la barre : « 12 », « lun. », « sept. ». */
  label: string;
  /** Libellé complet (infobulle, lecteur d'écran) : « mardi 30 septembre ». */
  fullLabel: string;
  isCurrent: boolean;
  isFuture: boolean;
};

export type DashboardPeriod = {
  key: DashboardPeriodKey;
  /** Libellé du sélecteur et du titre : « 7 jours », « Septembre », « 2026 ». */
  label: string;
  /** « vs les 7 jours précédents », « vs août à la même date »… */
  compareLabel: string;
  bucket: 'day' | 'month';
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  buckets: PeriodBucket[];
};

const DAY = 86_400_000;
const TZ = 'Africa/Dakar';

const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: TZ });
const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: TZ });
const weekdayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: TZ });
const dayFull = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: TZ });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parsePeriod(value: string | string[] | undefined): DashboardPeriodKey {
  const v = Array.isArray(value) ? value[0] : value;
  return DASHBOARD_PERIODS.includes(v as DashboardPeriodKey) ? (v as DashboardPeriodKey) : 'mois';
}

/** Minuit (Dakar) du jour de `date`. */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function resolvePeriod(key: DashboardPeriodKey, now = new Date()): DashboardPeriod {
  const today = startOfDay(now);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  if (key === '7j') {
    const start = new Date(today.getTime() - 6 * DAY);
    const buckets: PeriodBucket[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getTime() + i * DAY);
      return {
        key: dayKey(d),
        label: i === 6 ? 'auj.' : weekdayShort.format(d),
        fullLabel: dayFull.format(d),
        isCurrent: i === 6,
        isFuture: false,
      };
    });
    return {
      key,
      label: '7 jours',
      compareLabel: 'vs les 7 jours précédents',
      bucket: 'day',
      start,
      end: now,
      prevStart: new Date(start.getTime() - 7 * DAY),
      prevEnd: new Date(now.getTime() - 7 * DAY),
      buckets,
    };
  }

  if (key === 'mois') {
    const start = new Date(Date.UTC(y, m, 1));
    const prevStart = new Date(Date.UTC(y, m - 1, 1));
    // Même durée écoulée, sans déborder sur le mois courant (31 mars → fin février).
    const prevEnd = new Date(Math.min(prevStart.getTime() + (now.getTime() - start.getTime()), start.getTime()));
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const buckets: PeriodBucket[] = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(Date.UTC(y, m, i + 1));
      return {
        key: dayKey(d),
        label: String(i + 1),
        fullLabel: dayFull.format(d),
        isCurrent: d.getTime() === today.getTime(),
        isFuture: d.getTime() > today.getTime(),
      };
    });
    return {
      key,
      label: capitalize(monthName.format(now)),
      compareLabel: `vs ${monthName.format(prevStart)} à la même date`,
      bucket: 'day',
      start,
      end: now,
      prevStart,
      prevEnd,
      buckets,
    };
  }

  const start = new Date(Date.UTC(y, 0, 1));
  const prevStart = new Date(Date.UTC(y - 1, 0, 1));
  const prevEnd = new Date(Math.min(prevStart.getTime() + (now.getTime() - start.getTime()), start.getTime()));
  const buckets: PeriodBucket[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, i, 1));
    return {
      key: monthKey(d),
      label: monthShort.format(d).replace('.', ''),
      fullLabel: monthYear.format(d),
      isCurrent: i === m,
      isFuture: i > m,
    };
  });
  return {
    key,
    label: String(y),
    compareLabel: `vs ${y - 1} à la même date`,
    bucket: 'month',
    start,
    end: now,
    prevStart,
    prevEnd,
    buckets,
  };
}
