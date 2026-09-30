'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronsUpDown, KeyRound, LogOut, MonitorSmartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction, logoutEverywhereAction } from '../actions';

type AccountMenuProps = {
  fullName: string;
  email: string;
  roleLabel: string;
  /**
   * topbar : pastille claire, menu vers le bas (header mobile).
   * sidebar : carte sombre en bas de la sidebar, menu vers le haut.
   */
  variant?: 'topbar' | 'sidebar';
  /** Classes appliquées au texte du bouton (le masquer quand la sidebar est repliée). */
  labelClassName?: string;
};

const item =
  'flex h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm text-encre transition-colors duration-150 hover:bg-sable';

/** Menu du compte admin : identité, mot de passe, déconnexion (cet appareil / partout). */
export default function AccountMenu({ fullName, email, roleLabel, variant = 'topbar', labelClassName }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isSidebar = variant === 'sidebar';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const initial = fullName.charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Compte de ${fullName}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center transition-colors duration-150',
          isSidebar
            ? cn(
                'w-full gap-3 rounded-[18px] p-2.5 text-left ring-1 ring-inset ring-sur-oud/12',
                open ? 'bg-sur-oud/15' : 'bg-sur-oud/[0.07] hover:bg-sur-oud/12',
              )
            : cn('h-11 gap-2.5 rounded-full pl-1.5 pr-3 lg:h-12', open ? 'bg-oud text-sur-oud' : 'bg-sable text-oud hover:bg-paille'),
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid shrink-0 place-items-center rounded-full font-display',
            isSidebar ? 'size-[38px] bg-sur-oud text-[1.0625rem] text-oud' : 'size-8 text-[1rem] lg:size-9',
            !isSidebar && (open ? 'bg-sur-oud text-oud' : 'bg-oud text-sur-oud'),
          )}
        >
          {initial}
        </span>
        <span
          className={cn(
            'min-w-0 flex-col gap-1',
            isSidebar ? 'flex flex-1' : 'hidden items-start sm:flex',
            labelClassName,
          )}
        >
          <span className={cn('truncate text-sm font-medium leading-none', isSidebar && 'text-sur-oud')}>{fullName}</span>
          <span className={cn('text-xs leading-none', isSidebar ? 'text-sur-oud/60' : open ? 'text-sur-oud/70' : 'text-fumee')}>
            {roleLabel}
          </span>
        </span>
        {isSidebar ? (
          <ChevronsUpDown className={cn('size-4 shrink-0 text-sur-oud/70', labelClassName)} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <ChevronDown
            className={cn('size-4 transition-transform duration-250 ease-out-soft', open && 'rotate-180')}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          id="account-menu"
          className={cn(
            'absolute z-50 w-[19rem] rounded-[28px] border border-filet bg-lin p-2 shadow-lg motion-safe:animate-reveal',
            isSidebar ? 'bottom-full left-0 mb-2.5' : 'right-0 top-full mt-2.5',
          )}
        >
          <div className="px-3.5 pb-3 pt-2.5">
            <p className="font-display text-[1.25rem] leading-tight text-encre">{fullName}</p>
            <p className="mt-1 truncate text-sm text-fumee">{email}</p>
          </div>
          <div className="border-t border-filet pt-2">
            <Link href="/admin/compte" onClick={() => setOpen(false)} className={item}>
              <KeyRound className="size-[18px] text-or-profond" strokeWidth={1.7} aria-hidden="true" />
              Mon compte et mot de passe
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={item}>
                <LogOut className="size-[18px] text-or-profond" strokeWidth={1.7} aria-hidden="true" />
                Se déconnecter
              </button>
            </form>
            <form action={logoutEverywhereAction}>
              <button type="submit" className={cn(item, 'h-auto items-start py-3')}>
                <MonitorSmartphone className="mt-0.5 size-[18px] shrink-0 text-erreur" strokeWidth={1.7} aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-erreur">Déconnecter tous mes appareils</span>
                  <span className="text-xs text-fumee">Téléphone perdu, ordinateur partagé…</span>
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
