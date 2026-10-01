import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <LoadingRegion label="Chargement de votre commande…" className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-10">
      <Skeleton className="h-64 rounded-[40px] bg-oud/80 lg:h-72" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 rounded-[32px] bg-[#DCEBF3]" />
          <Skeleton className="h-72 rounded-[32px]" />
        </div>
        <Skeleton className="h-80 rounded-[32px] bg-oud/80" />
      </div>
    </LoadingRegion>
  );
}
