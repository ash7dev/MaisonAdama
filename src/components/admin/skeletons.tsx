import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

/**
 * Silhouettes des pages admin. Elles reprennent exactement la grille, les rayons
 * et les hauteurs des vraies pages : l'arrivée des données remplit la forme
 * sans rien déplacer.
 */

const page = 'flex flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pb-8 lg:pt-3';

function HeaderSkeleton({ withButton = true, back = false }: { withButton?: boolean; back?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-1 lg:min-h-[72px] lg:items-center">
      <div className="flex flex-col gap-3">
        {back && <Skeleton className="h-4 w-24 rounded-full" />}
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="h-9 w-56 rounded-2xl" />
      </div>
      {withButton && <Skeleton className="h-12 w-44 rounded-full" />}
    </div>
  );
}

/** Tableau de bord (et pages admin sans silhouette dédiée). */
export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Chargement du tableau de bord…">
      {/* Desktop : vue 360 */}
      <div className="hidden flex-col gap-6 px-2 pb-8 pt-3 lg:flex">
        <div className="flex min-h-[72px] items-center justify-between gap-5 px-1">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-44 rounded-full" />
            <Skeleton className="h-9 w-64 rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-11 w-72 rounded-full" />
            <Skeleton className="h-11 w-52 rounded-full" />
            <Skeleton className="h-11 w-44 rounded-full bg-oud/80" />
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_24.5rem] gap-5">
          <div className="flex h-[440px] flex-col justify-between rounded-[32px] bg-oud p-8">
            <div className="flex justify-between">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-3 w-52 rounded-full bg-sur-oud/15" />
                <Skeleton className="h-14 w-80 rounded-2xl bg-sur-oud/15" />
                <Skeleton className="h-6 w-60 rounded-full bg-sur-oud/10" />
              </div>
              <Skeleton className="h-12 w-72 rounded-2xl bg-sur-oud/10" />
            </div>
            <div className="flex h-44 items-end gap-1.5">
              {Array.from({ length: 30 }, (_, i) => (
                <Skeleton key={i} className="flex-1 rounded-md bg-sur-oud/10" style={{ height: `${20 + 60 * (0.5 + 0.5 * Math.sin(i * 0.7))}%` }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-[32px] border border-filet bg-lin p-6">
            <Skeleton className="h-6 w-36 rounded-full" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-3 w-10 rounded-full" />
                <Skeleton className="size-3 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-4/5 rounded-full" />
                  <Skeleton className="h-3 w-3/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[138px] rounded-[26px]" />
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_24.5rem] gap-5">
          <Skeleton className="h-[380px] rounded-[32px]" />
          <Skeleton className="h-[380px] rounded-[32px]" />
        </div>
      </div>

      {/* Mobile : en-tête wallet */}
      <div className="flex flex-col lg:hidden">
        <div className="flex flex-col gap-5 rounded-b-[36px] bg-oud px-5 pb-16 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full bg-sur-oud/20" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-32 rounded-full bg-sur-oud/15" />
              <Skeleton className="h-4 w-40 rounded-full bg-sur-oud/15" />
            </div>
          </div>
          <Skeleton className="h-3 w-40 rounded-full bg-sur-oud/15" />
          <Skeleton className="h-12 w-60 rounded-2xl bg-sur-oud/15" />
          <Skeleton className="h-[70px] w-full rounded-2xl bg-sur-oud/10" />
          <Skeleton className="h-11 w-full rounded-full bg-sur-oud/10" />
        </div>
        <Skeleton className="relative z-10 mx-4 -mt-10 h-[104px] rounded-[28px] bg-lin shadow-[0_18px_40px_rgb(74_46_28/0.14)]" />
        <div className="flex flex-col gap-7 px-4 pb-10 pt-7">
          <Skeleton className="h-[420px] rounded-[32px] bg-lin" />
          <Skeleton className="h-[230px] rounded-[28px]" />
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Liste des produits. */
export function ProductListSkeleton() {
  return (
    <LoadingRegion label="Chargement des produits…" className={page}>
      <HeaderSkeleton />
      <div className="flex flex-col gap-3.5">
        <Skeleton className="h-[52px] w-full max-w-[36rem] rounded-full" />
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <div className="grid grid-cols-2 gap-2.5 sm:flex">
            <Skeleton className="h-12 rounded-full sm:w-44" />
            <Skeleton className="h-12 rounded-full sm:w-44" />
          </div>
        </div>
      </div>

      {/* Desktop : lignes du tableau */}
      <div className="hidden overflow-hidden rounded-[28px] border border-filet bg-lin md:block">
        <div className="h-12 border-b border-filet" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-filet/70 px-5 py-4 last:border-b-0">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="size-14 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-56 rounded-full" />
              <Skeleton className="h-3 w-40 rounded-full" />
            </div>
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        ))}
      </div>

      {/* Mobile : cartes */}
      <div className="flex flex-col gap-3 md:hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-3xl border border-filet bg-lin p-3.5">
            <div className="flex items-start gap-3">
              <Skeleton className="size-16 rounded-[18px]" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-4 w-4/5 rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-6 w-2/3 rounded-full" />
            <Skeleton className="h-11 rounded-2xl" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Formulaire produit (création et modification). */
export function ProductFormSkeleton({ label }: { label: string }) {
  const section = (lines: number) => (
    <div className="flex flex-col gap-5 rounded-[28px] border border-filet bg-lin p-5 sm:p-7">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-44 rounded-lg" />
        <Skeleton className="h-3.5 w-72 max-w-full rounded-full" />
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-28 rounded-full" />
          <Skeleton className="h-12 rounded-2xl" />
        </div>
      ))}
    </div>
  );

  return (
    <LoadingRegion label={label} className="mx-auto max-w-shop px-4 pb-36 pt-6 lg:px-2 lg:pb-10 lg:pt-3">
      <div className="pb-6 lg:pb-5">
        <HeaderSkeleton withButton={false} back />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          {section(3)}
          <div className="flex flex-col gap-5 rounded-[28px] border border-filet bg-lin p-5 sm:p-7">
            <Skeleton className="h-6 w-28 rounded-lg" />
            <Skeleton className="h-44 rounded-3xl" />
          </div>
          {section(2)}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-[28px] bg-oud/90 p-5 sm:p-6">
            <div className="h-6 w-32 rounded-lg bg-sur-oud/15" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-48 rounded-full bg-sur-oud/10" />
            ))}
            <div className="hidden h-12 rounded-full bg-sur-oud/20 lg:block" />
          </div>
          <div className="flex flex-col gap-3 rounded-[28px] border border-filet bg-lin p-5">
            <Skeleton className="h-3 w-40 rounded-full" />
            <Skeleton className="aspect-[4/5] rounded-3xl" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Mon compte. */
export function AccountSkeleton() {
  return (
    <LoadingRegion label="Chargement du compte…" className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-10 lg:px-8 lg:pt-14">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="h-10 w-52 rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          <div className="h-56 rounded-[32px] bg-oud/90" />
          <Skeleton className="h-52 rounded-[32px]" />
        </div>
        <Skeleton className="h-[30rem] rounded-[32px]" />
      </div>
    </LoadingRegion>
  );
}

/** Liste des commandes. */
export function OrderListSkeleton() {
  return (
    <LoadingRegion label="Chargement des commandes…" className={page}>
      <div className="flex flex-col gap-2.5 px-1 lg:min-h-[72px] lg:justify-center">
        <Skeleton className="h-9 w-48 rounded-2xl" />
        <Skeleton className="h-3.5 w-56 rounded-full" />
      </div>
      <div className="flex flex-col gap-3.5">
        <Skeleton className="h-[52px] w-full max-w-[44rem] rounded-full" />
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 rounded-full sm:w-52" />
        </div>
      </div>
      <div className="hidden overflow-hidden rounded-[28px] border border-filet bg-lin lg:block">
        <div className="h-12 border-b border-filet" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 border-b border-filet/70 px-6 py-5 last:border-b-0">
            <div className="flex w-36 flex-col gap-2">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
            <div className="flex w-44 flex-col gap-2">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
            <Skeleton className="h-3.5 flex-1 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-3xl border border-filet bg-lin p-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-44 rounded-full" />
            <Skeleton className="h-3.5 w-full rounded-full" />
            <div className="flex gap-2 border-t border-filet pt-3.5">
              <Skeleton className="h-11 flex-1 rounded-full" />
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="size-11 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Détail d'une commande. */
export function OrderDetailSkeleton() {
  const block = (h: string) => <Skeleton className={`${h} rounded-[28px]`} />;
  return (
    <LoadingRegion label="Chargement de la commande…" className={page}>
      <div className="flex flex-col gap-3 px-1 lg:min-h-[72px] lg:justify-center">
        <Skeleton className="h-4 w-28 rounded-full" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-56 rounded-2xl" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-72 max-w-full rounded-full" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        <div className="flex flex-col gap-4 lg:order-2">
          <div className="h-52 rounded-[28px] bg-oud/90" />
          {block('h-40')}
          {block('h-56')}
        </div>
        <div className="flex flex-col gap-4 lg:order-1 lg:gap-5">
          {block('h-28')}
          {block('h-72')}
          {block('h-64')}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function PromotionListSkeleton() {
  return (
    <LoadingRegion label="Chargement des promotions…" className={page}>
      <div className="flex flex-wrap items-end justify-between gap-4 px-1 lg:min-h-[72px] lg:items-center">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-9 w-44 rounded-2xl" />
          <Skeleton className="h-3.5 w-64 rounded-full" />
        </div>
        <Skeleton className="h-12 w-52 rounded-full" />
      </div>
      <div className="flex flex-col gap-3.5">
        <Skeleton className="h-[52px] w-full max-w-[40rem] rounded-full" />
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 rounded-full sm:w-60" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-5 rounded-[28px] border border-filet bg-lin p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-20 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2.5 pt-1">
                <Skeleton className="h-5 w-3/4 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-7 w-12 rounded-full" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-52 rounded-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="size-10 rounded-full ring-2 ring-lin" />
                ))}
              </div>
              <Skeleton className="h-3.5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function PromotionFormSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="mx-auto flex max-w-shop flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pt-3">
      <div className="flex flex-col gap-3 px-1 lg:min-h-[72px] lg:justify-center">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-9 w-64 rounded-2xl" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-5 rounded-[28px] border border-filet bg-lin p-5 sm:p-7">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-2.5">
              <Skeleton className="h-[74px] rounded-2xl" />
              <Skeleton className="h-[74px] rounded-2xl" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-14 w-48 rounded-2xl" />
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-16 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-5 rounded-[28px] border border-filet bg-lin p-5 sm:p-7">
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-12 rounded-2xl" />
              <Skeleton className="h-12 rounded-2xl" />
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-[28px] border border-filet bg-lin p-5 sm:p-7">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-12 w-full rounded-full" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="size-11 rounded-xl" />
                <Skeleton className="h-4 flex-1 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex h-72 flex-col gap-4 rounded-[28px] bg-oud/90 p-6">
            <Skeleton className="h-8 w-24 rounded-xl bg-sur-oud/15" />
            <Skeleton className="h-4 w-40 rounded-full bg-sur-oud/15" />
          </div>
          <Skeleton className="h-40 rounded-[28px]" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function CustomerListSkeleton() {
  return (
    <LoadingRegion label="Chargement des clients…" className={page}>
      <div className="flex flex-col gap-2.5 px-1 lg:min-h-[72px] lg:justify-center">
        <Skeleton className="h-9 w-36 rounded-2xl" />
        <Skeleton className="h-3.5 w-72 max-w-full rounded-full" />
      </div>
      <div className="flex flex-col gap-3.5">
        <Skeleton className="h-[52px] w-full max-w-[32rem] rounded-full" />
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 rounded-full sm:w-60" />
        </div>
      </div>
      <div className="hidden overflow-hidden rounded-[28px] border border-filet bg-lin lg:block">
        <div className="h-12 border-b border-filet" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 border-b border-filet/70 px-6 py-4 last:border-b-0">
            <div className="flex flex-1 items-center gap-3.5">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-3 w-28 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-10 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="size-10 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3.5 rounded-3xl border border-filet bg-lin p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-36 rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <LoadingRegion label="Chargement de la fiche client…" className={page}>
      <div className="flex flex-col gap-4 px-1 lg:min-h-[72px] lg:justify-center">
        <Skeleton className="h-4 w-20 rounded-full" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full sm:size-[4.5rem]" />
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-8 w-52 rounded-2xl" />
              <Skeleton className="h-3.5 w-60 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-full sm:w-32" />
            <Skeleton className="h-12 flex-1 rounded-full sm:w-36" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Skeleton className="h-[104px] rounded-3xl bg-oud/80" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-3xl" />
        ))}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        <div className="flex flex-col rounded-[28px] border border-filet bg-lin">
          <div className="px-6 py-6">
            <Skeleton className="h-5 w-56 rounded-full" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 border-t border-filet/70 px-6 py-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-44 rounded-full" />
                <Skeleton className="h-3 w-64 max-w-full rounded-full" />
              </div>
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44 rounded-[28px]" />
          <Skeleton className="h-52 rounded-[28px]" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SettingsSkeleton() {
  return (
    <LoadingRegion label="Chargement des paramètres…" className="flex flex-col gap-5 px-4 pb-16 pt-6 lg:px-2 lg:pb-10 lg:pt-3">
      <div className="flex flex-col gap-2.5 px-1 lg:min-h-[72px] lg:justify-center">
        <Skeleton className="h-9 w-48 rounded-2xl" />
        <Skeleton className="h-3.5 w-80 max-w-full rounded-full" />
      </div>
      <Skeleton className="h-44 rounded-[28px] bg-oud/80" />
      <div className="grid items-start gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <div className="flex gap-1.5 lg:flex-col lg:gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-32 rounded-full lg:w-full lg:rounded-2xl" />
          ))}
        </div>
        <div className="flex max-w-4xl flex-col gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-6 rounded-[28px] border border-filet bg-lin p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <Skeleton className="size-11 rounded-2xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-48 rounded-full" />
                  <Skeleton className="h-3.5 w-full max-w-md rounded-full" />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Skeleton className="h-12 rounded-2xl sm:col-span-2" />
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-12 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
