import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion label="Chargement de la création…" className="mx-auto flex max-w-shop flex-col gap-6 px-4 pb-16 lg:px-10 lg:pt-8">
      <Skeleton className="hidden h-3.5 w-72 rounded-full lg:block" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-12">
        <div className="-mx-4 flex gap-4 lg:mx-0">
          <div className="hidden flex-col gap-3 lg:flex">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[6.5rem] w-[5.25rem] rounded-[18px]" />
            ))}
          </div>
          <Skeleton className="h-[29rem] flex-1 rounded-none bg-oud/80 lg:aspect-[4/5] lg:h-auto lg:rounded-[36px]" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-3 w-48 rounded-full" />
          <Skeleton className="h-12 w-3/4 rounded-2xl" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
          <Skeleton className="h-9 w-56 rounded-full" />
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-[4.5rem] rounded-[20px]" />
            <Skeleton className="h-[4.5rem] rounded-[20px]" />
          </div>
          <Skeleton className="h-14 rounded-full" />
          <Skeleton className="h-32 rounded-[22px]" />
        </div>
      </div>
    </LoadingRegion>
  );
}
