import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion label="Chargement de l’étagère…" className="flex flex-col gap-10 pb-16 lg:gap-16">
      <div className="flex flex-col gap-3 px-4 pt-6 lg:hidden">
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="h-9 w-3/4 rounded-2xl" />
      </div>
      <div className="lg:px-6 lg:pt-7">
        <Skeleton className="h-[34rem] bg-oud/80 lg:mx-auto lg:h-[44rem] lg:max-w-[88rem] lg:rounded-[40px]" />
      </div>
      <div className="mx-auto flex w-full max-w-shop flex-col gap-6 px-4 lg:px-10">
        <Skeleton className="h-9 w-64 rounded-2xl" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 lg:gap-x-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-[4/5] rounded-[28px]" />
              <Skeleton className="h-3 w-1/2 rounded-full" />
              <Skeleton className="h-5 w-3/4 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
