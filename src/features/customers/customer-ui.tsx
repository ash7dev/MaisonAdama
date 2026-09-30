import { Crown, Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CUSTOMER_NOTE_MAX = 2000;

// Teintes d'avatar dans la palette de la Maison, choisies de façon stable à partir du nom.
const AVATAR_TONES = [
  'bg-paille text-oud',
  'bg-oud text-sur-oud',
  'bg-sable text-or-profond ring-1 ring-inset ring-filet',
  'bg-[#E9DCC4] text-oud',
  'bg-[#DCEBF3] text-[#1F5673]',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function CustomerAvatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-display leading-none',
        AVATAR_TONES[hash % AVATAR_TONES.length],
        size === 'sm' && 'size-10 text-[0.875rem]',
        size === 'md' && 'size-11 text-[0.9375rem]',
        size === 'lg' && 'size-16 text-[1.375rem] sm:size-[4.5rem] sm:text-[1.5rem]',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Pastilles de segment : fidèle, nouveau, à relancer. */
export function SegmentBadges({
  isLoyal,
  isNew,
  isDormant,
  className,
}: {
  isLoyal: boolean;
  isNew: boolean;
  isDormant: boolean;
  className?: string;
}) {
  if (!isLoyal && !isNew && !isDormant) return null;
  const chip = 'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[0.71875rem] font-medium';
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {isLoyal && (
        <span className={cn(chip, 'bg-paille text-or-profond')}>
          <Crown className="size-3" strokeWidth={2} aria-hidden="true" />
          Fidèle
        </span>
      )}
      {isNew && (
        <span className={cn(chip, 'bg-succes-fond text-succes')}>
          <Sparkles className="size-3" strokeWidth={2} aria-hidden="true" />
          Nouveau
        </span>
      )}
      {isDormant && (
        <span className={cn(chip, 'bg-sable text-fumee ring-1 ring-inset ring-filet')}>
          <Moon className="size-3" strokeWidth={2} aria-hidden="true" />À relancer
        </span>
      )}
    </span>
  );
}
