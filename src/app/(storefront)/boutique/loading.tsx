import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion label="Chargement de la boutique…" className="mx-auto flex max-w-shop flex-col gap-6 px-4 pb-16 pt-6 lg:gap-7 lg:px-10 lg:pt-10">
      <div className="flex flex-col gap-3">
        <Skeleton className="hidden h-3.5 w-36 rounded-full lg:block" />
        <Skeleton className="h-9 w-56 rounded-2xl lg:h-14 lg:w-96" />
      </div>
      <div className="hidden gap-9 border-b border-filet pb-3 lg:flex">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex gap-2 lg:hidden">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="hidden h-[66px] rounded-[28px] lg:block" />
      <Skeleton className="h-12 rounded-full lg:hidden" />
      <div className="hidden grid-cols-[minmax(0,34rem)_minmax(0,1fr)] gap-10 lg:grid">
        <Skeleton className="h-[40rem] rounded-[40px] bg-oud/80" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-6 w-8 rounded-lg" />
              <Skeleton className="h-[5.75rem] w-[4.75rem] rounded-[18px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-6 w-2/3 rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="size-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-7 lg:hidden">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[16/12] rounded-[26px]" />
            <Skeleton className="h-5 w-2/3 rounded-full" />
            <Skeleton className="h-4 w-1/3 rounded-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
