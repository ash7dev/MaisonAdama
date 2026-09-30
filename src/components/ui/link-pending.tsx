'use client';

import { useLinkStatus } from 'next/link';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Retour immédiat sur le lien cliqué : tant que la page demandée n'est pas prête,
 * son icône devient un indicateur de chargement. Plus de doute « ai-je bien cliqué ? ».
 * À placer À L'INTÉRIEUR d'un <Link>.
 */
export function PendingIcon({
  children,
  icon: Icon,
  className,
  strokeWidth = 1.7,
}: {
  children?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  strokeWidth?: number;
}) {
  const { pending } = useLinkStatus();
  if (pending) {
    return <LoaderCircle className={cn(className, 'motion-safe:animate-spin')} strokeWidth={2} aria-hidden="true" />;
  }
  if (children) {
    return <>{children}</>;
  }
  if (Icon) {
    return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
  }
  return null;
}

/** Petit indicateur affiché seulement pendant le chargement (liens sans icône). */
export function PendingSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <LoaderCircle
      className={cn('size-3.5 shrink-0 text-or-profond motion-safe:animate-spin', className)}
      strokeWidth={2.2}
      aria-hidden="true"
    />
  );
}
