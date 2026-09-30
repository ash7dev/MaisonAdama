import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion label="Chargement de la collection…" className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-4 lg:gap-12 lg:px-10 lg:pt-8">
      <Skeleton className="hidden h-3.5 w-48 rounded-full lg:block" />
      <Skeleton className="h-[26rem] rounded-[32px] bg-oud/80 lg:h-[30rem] lg:rounded-[40px]" />
      <div className="flex gap-2 lg:gap-10 lg:border-b lg:border-filet lg:pb-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full lg:h-7 lg:w-40" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/5] rounded-[28px]" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
            <Skeleton className="h-5 w-3/4 rounded-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
