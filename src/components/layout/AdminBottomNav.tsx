// src/components/layout/AdminBottomNav.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ExternalLink, LogOut, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/features/auth/actions';
import { ADMIN_MOBILE_TABS, ADMIN_MORE_ITEMS, isAdminNavActive, type AdminNavKey } from '@/features/admin/navigation';
import type { AdminBadges } from './AdminSidebar';
import { PendingIcon } from '@/components/ui/link-pending';

type AdminBottomNavProps = {
  badges: AdminBadges;
  admin: { fullName: string; roleLabel: string };
};

/** Formulaires plein écran : /admin/produits/nouveau et /admin/produits/<id>. */
const FOCUS_ROUTES = ['/admin/produits/', '/admin/promotions/'];

const tab =
  'relative flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-[18px] text-[0.6875rem] font-medium transition-colors duration-150';

/** Barre du bas de l'admin (mobile) : Accueil · Commandes · Produits · Clients · Plus. */
export default function AdminBottomNav({ badges, admin }: AdminBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  // Changement de page : le panneau se referme.
  useEffect(() => setMoreOpen(false), [pathname]);

  const moreActive = ADMIN_MORE_ITEMS.some((item) => isAdminNavActive(pathname, item)) || pathname.startsWith('/admin/compte');

  // Formulaires en mode « focus » : leur propre barre d'actions remplace la navigation.
  if (FOCUS_ROUTES.some((route) => pathname.startsWith(route))) return null;

  return (
    <>
      {/* Réserve la place de la barre : aucun contenu ne passe dessous. */}
      <div aria-hidden="true" className="h-[calc(6.5rem+env(safe-area-inset-bottom))] lg:hidden" />

      <nav
        aria-label="Administration"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="mx-auto flex max-w-md rounded-[24px] bg-oud p-1.5 shadow-lg">
          {ADMIN_MOBILE_TABS.map((item) => {
            const active = isAdminNavActive(pathname, item);
            const badge = badges[item.key as AdminNavKey];
            const Icon = item.icon;
            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  aria-label={badge && badge.count > 0 ? `${item.label}, ${badge.label}` : undefined}
                  className={cn(tab, active ? 'bg-sur-oud text-oud' : 'text-sur-oud/68 active:bg-sur-oud/8')}
                >
                  <span className="relative">
                    <PendingIcon icon={Icon} className="size-[21px]" strokeWidth={active ? 1.8 : 1.6} />
                    {badge && badge.count > 0 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute ring-2',
                          active ? 'ring-sur-oud' : 'ring-oud',
                          badge.tone === 'or'
                            ? '-right-3 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-or px-1 text-[0.65625rem] font-semibold tabular-nums text-encre'
                            : '-right-1 -top-0.5 size-2 rounded-full bg-[#E0A24A]',
                        )}
                      >
                        {badge.tone === 'or' ? (badge.count > 9 ? '9+' : badge.count) : null}
                      </span>
                    )}
                  </span>
                  <span aria-hidden={badge && badge.count > 0 ? true : undefined}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(tab, moreActive ? 'bg-sur-oud text-oud' : 'text-sur-oud/68 active:bg-sur-oud/8')}
            >
              <MoreHorizontal className="size-[21px]" strokeWidth={1.8} aria-hidden="true" />
              Plus
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={dialogRef}
        aria-label="Plus"
        onClose={() => setMoreOpen(false)}
        onClick={(event) => event.target === event.currentTarget && setMoreOpen(false)}
        className="fixed inset-x-2 bottom-[max(1rem,env(safe-area-inset-bottom))] top-auto m-0 w-auto max-w-none rounded-[32px] bg-lin p-0 text-encre shadow-lg backdrop:bg-encre/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-reveal lg:hidden"
      >
        <div className="flex flex-col gap-3.5 px-3.5 pb-4 pt-2.5">
          <div className="flex items-center justify-between pl-2">
            <span aria-hidden="true" className="h-[5px] w-10 rounded-full bg-filet" />
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Fermer"
              className="grid size-11 place-items-center rounded-full text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre"
            >
              <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-2.5">
            {ADMIN_MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex h-[104px] flex-col justify-between rounded-[22px] bg-sable p-4 transition-colors duration-150 active:bg-paille"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-oud text-sur-oud">
                      <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="text-[0.9375rem] font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="overflow-hidden rounded-[22px] bg-sable">
            <Link href="/admin/compte" className="flex h-[58px] items-center gap-3 border-b border-filet px-4">
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-oud font-display text-[0.9375rem] text-sur-oud">
                {admin.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[0.9375rem]">Mon compte</span>
                <span className="text-xs text-fumee">Mot de passe, appareils</span>
              </span>
              <ChevronRight className="size-4 text-or" strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <Link href="/" target="_blank" className="flex h-[54px] items-center gap-3 border-b border-filet px-4">
              <ExternalLink className="size-[18px] text-or-profond" strokeWidth={1.6} aria-hidden="true" />
              <span className="text-[0.9375rem]">Voir la boutique</span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex h-[54px] w-full items-center gap-3 px-4 text-left text-erreur">
                <LogOut className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
                <span className="text-[0.9375rem]">Se déconnecter</span>
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
