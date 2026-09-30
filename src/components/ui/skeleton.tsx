import { cn } from '@/lib/utils';

/**
 * Forme de remplacement pendant le chargement, aux dimensions du contenu final
 * (aucun saut de mise en page à l'arrivée des données). Reflet animé, sauf si
 * l'utilisateur a demandé moins d'animations.
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        'relative overflow-hidden rounded-xl bg-filet/50',
        'before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-lin/70 before:to-transparent motion-safe:before:animate-shimmer',
        className,
      )}
    />
  );
}

/** Conteneur d'une page en chargement : annoncé une seule fois aux lecteurs d'écran. */
export function LoadingRegion({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
