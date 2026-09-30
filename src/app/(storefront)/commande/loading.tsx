import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion label="Chargement…" className="mx-auto flex max-w-shop flex-col gap-7 px-4 pb-16 pt-6 lg:px-10 lg:pt-10">
      <Skeleton className="h-12 w-72 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
        <div className="flex flex-col gap-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-[32px]" />
          ))}
        </div>
        <Skeleton className="h-[28rem] rounded-[36px] bg-oud/80" />
      </div>
    </LoadingRegion>
  );
}
