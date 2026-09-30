// src/components/layout/AnnouncementTicker.tsx
'use client';

import { useState, useSyncExternalStore } from 'react';
import { Truck, Wallet, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Promise = { icon: LucideIcon; text: string };

const MESSAGES: Promise[] = [
  { icon: Truck, text: 'Livraison partout au Sénégal' },
  { icon: Wallet, text: 'Paiement Wave ou à la livraison' },
];

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * Bandeau mobile : une promesse à la fois, qui entre par le bas pendant que la
 * précédente sort par le haut. Le rythme est porté par l'indicateur de
 * progression (fin d'animation = message suivant) : mettre l'animation en pause
 * met donc aussi la rotation en pause, sans minuterie à synchroniser.
 *
 * Accessibilité : pause au survol, au focus et au toucher ; un tap passe au
 * message suivant ; « réduire les animations » fige le bandeau ; les lecteurs
 * d'écran lisent la liste complète, jamais le défilement.
 */
export default function AnnouncementTicker() {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const count = MESSAGES.length;
  const current = tick % count;
  const previous = (tick - 1 + count) % count;
  const animate = tick > 0 && !reducedMotion;
  const showNext = () => setTick((t) => t + 1);

  return (
    <div data-site-chrome className="bg-oud text-sur-oud md:hidden">
      <ul className="sr-only">
        {MESSAGES.map(({ text }) => (
          <li key={text}>{text}</li>
        ))}
      </ul>

      <button
        type="button"
        onClick={showNext}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-label="Afficher l’information suivante"
        className="relative flex h-9 w-full items-center overflow-hidden px-12 focus-visible:outline-offset-[-3px]"
      >
        <span aria-hidden="true" className="relative h-full w-full">
          {animate && <Message key={`out-${tick}`} promise={MESSAGES[previous]} className="animate-ticker-out" />}
          <Message key={`in-${tick}`} promise={MESSAGES[current]} className={animate ? 'animate-ticker-in' : undefined} />
        </span>

        {/* Indicateur façon « stories » : le segment actif se remplit d'or. */}
        <span aria-hidden="true" className="absolute right-4 top-1/2 flex -translate-y-1/2 gap-1">
          {MESSAGES.map(({ text }, index) => (
            <span key={text} className="relative h-[2px] w-3.5 overflow-hidden rounded-full bg-sur-oud/20">
              {index === current && (
                <span
                  key={tick}
                  onAnimationEnd={reducedMotion ? undefined : showNext}
                  className={cn(
                    'absolute inset-0 origin-left rounded-full bg-or',
                    !reducedMotion && 'animate-ticker-progress',
                    paused && '[animation-play-state:paused]',
                  )}
                />
              )}
            </span>
          ))}
        </span>
      </button>
    </div>
  );
}

function Message({ promise: { icon: Icon, text }, className }: { promise: Promise; className?: string }) {
  return (
    <span className={cn('absolute inset-0 flex items-center justify-center gap-2.5', className)}>
      <span className="grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-or/50">
        <Icon className="size-3 text-or" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="whitespace-nowrap text-[0.75rem] font-medium tracking-[0.06em]">{text}</span>
    </span>
  );
}
