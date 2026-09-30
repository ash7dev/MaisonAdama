'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Montants masquables, comme dans une application bancaire (utile en boutique,
 * devant les clients). Le choix est mémorisé sur l'appareil.
 */
const STORAGE_KEY = 'ma-hide-amounts';
const HiddenContext = createContext<{ hidden: boolean; toggle: () => void }>({ hidden: false, toggle: () => {} });

export function AmountsProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {}
  }, []);

  const toggle = () =>
    setHidden((current) => {
      try {
        localStorage.setItem(STORAGE_KEY, current ? '0' : '1');
      } catch {}
      return !current;
    });

  return <HiddenContext.Provider value={{ hidden, toggle }}>{children}</HiddenContext.Provider>;
}

/** Un montant qui se masque avec l'œil ; toujours sur une seule ligne. */
export function Amount({ children, className }: { children: React.ReactNode; className?: string }) {
  const { hidden } = useContext(HiddenContext);
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {hidden ? <span aria-label="Montant masqué">••••••</span> : children}
    </span>
  );
}

export function AmountsToggle({ className }: { className?: string }) {
  const { hidden, toggle } = useContext(HiddenContext);
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? 'Afficher les montants' : 'Masquer les montants'}
      className={cn('grid size-9 place-items-center rounded-full text-or-clair transition-colors duration-150 hover:bg-sur-oud/10', className)}
    >
      <Icon className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
