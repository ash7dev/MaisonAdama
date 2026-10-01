import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion label="Chargement du conseil de la Maison…" className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-10">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-44 rounded-full" />
        <Skeleton className="h-10 w-3/4 rounded-2xl lg:h-14 lg:w-[28rem]" />
      </div>
      {/* Desktop : la roue et les réponses */}
      <div className="hidden gap-10 lg:grid lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <Skeleton className="aspect-square rounded-full bg-oud/80" />
        <div className="flex flex-col gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-32 rounded-full" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-11 w-28 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Mobile : la conversation */}
      <div className="flex flex-col gap-3 lg:hidden">
        <Skeleton className="h-20 w-5/6 rounded-[22px] bg-oud/80" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-28 rounded-full" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
