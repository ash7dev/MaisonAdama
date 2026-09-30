// src/components/layout/AdminSidebar.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccountMenu from '@/features/auth/components/AccountMenu';
import { PendingIcon } from '@/components/ui/link-pending';
import {
  ADMIN_NAV_GROUPS,
  SIDEBAR_COOKIE,
  isAdminNavActive,
  type AdminNavItem,
  type AdminNavKey,
} from '@/features/admin/navigation';

export type AdminBadges = Partial<Record<AdminNavKey, { count: number; tone: 'or' | 'alerte'; label: string }>>;

type AdminSidebarProps = {
  /** Choix mémorisé (cookie), lu côté serveur : pas de saut de largeur au chargement. */
  initialCollapsed: boolean;
  badges: AdminBadges;
  admin: { fullName: string; email: string; roleLabel: string };
};

/**
 * Sidebar admin (desktop) :
 *  - ≥ 1280 px : dépliée (icône + libellé + compteurs), repliable par l'utilisateur ;
 *  - 1024–1279 px : toujours en barre d'icônes, avec info-bulles.
 * Toutes les classes « dépliée / repliée » sont dérivées d'un seul booléen.
 */
export default function AdminSidebar({ initialCollapsed, badges, admin }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // Repliée : barre d'icônes partout. Dépliée : barre d'icônes sous xl, complète au-delà.
  const expandedOnly = collapsed ? 'hidden' : 'hidden xl:flex';
  const railOnly = collapsed ? '' : 'xl:hidden';
  const visuallyHiddenInRail = collapsed ? 'sr-only' : 'max-xl:sr-only';

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/admin; max-age=31536000; samesite=lax`;
  };

  return (
    <aside
      className={cn(
        'sticky top-4 hidden h-[calc(100dvh-2rem)] shrink-0 flex-col gap-6 rounded-[28px] bg-oud px-2.5 pb-3 pt-4 text-sur-oud lg:flex',
        'transition-[width] duration-250 ease-out-soft',
        collapsed ? 'w-20' : 'w-20 xl:w-[272px] xl:px-3.5',
      )}
    >
      {/* Marque + repli */}
      <div className={cn('flex items-center', collapsed ? 'flex-col gap-3' : 'flex-col gap-3 xl:flex-row xl:gap-3 xl:px-1.5')}>
        <Link href="/admin" aria-label="Tableau de bord" className="flex items-center gap-3 rounded-full">
          <Image
            src="/images/logomasonAdama.jpg"
            alt=""
            width={88}
            height={88}
            className="size-11 shrink-0 rounded-full ring-2 ring-or-clair/40"
          />
          <span className={cn('flex-col gap-1', expandedOnly)}>
            <span className="font-display text-[1.25rem] leading-none">Maison Adama</span>
            <span className="text-[0.5625rem] leading-none tracking-[0.3em] text-or-clair">ADMINISTRATION</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
          aria-expanded={!collapsed}
          className="ml-auto hidden size-9 place-items-center rounded-xl text-sur-oud/60 transition-colors duration-150 hover:bg-sur-oud/10 hover:text-sur-oud xl:grid"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Administration" className="flex flex-col gap-5">
        {ADMIN_NAV_GROUPS.map((group, index) => (
          <div key={group.title} className="flex flex-col gap-1">
            <p className={cn('px-3 pb-1.5 text-[0.65625rem] uppercase tracking-[0.26em] text-or-clair/85', expandedOnly)}>
              {group.title}
            </p>
            {index > 0 && <span aria-hidden="true" className={cn('mx-auto mb-1 h-px w-7 bg-sur-oud/15', railOnly)} />}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => (
                <li key={item.key}>
                  <SidebarLink
                    item={item}
                    active={isAdminNavActive(pathname, item)}
                    badge={badges[item.key]}
                    classes={{ expandedOnly, railOnly, visuallyHiddenInRail }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bas : boutique + compte */}
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/"
          target="_blank"
          className={cn(
            'group relative flex h-11 items-center gap-2.5 rounded-[14px] text-[0.84375rem] text-sur-oud/70 transition-colors duration-150 hover:bg-sur-oud/8 hover:text-sur-oud',
            collapsed ? 'justify-center' : 'justify-center xl:justify-start xl:px-3',
          )}
        >
          <ExternalLink className="size-[17px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
          <span className={visuallyHiddenInRail}>Voir la boutique</span>
          <Tooltip className={railOnly}>Voir la boutique</Tooltip>
        </Link>
        <AccountMenu
          variant="sidebar"
          fullName={admin.fullName}
          email={admin.email}
          roleLabel={admin.roleLabel}
          labelClassName={collapsed ? 'hidden' : 'max-xl:hidden'}
        />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  badge,
  classes,
}: {
  item: AdminNavItem;
  active: boolean;
  badge?: AdminBadges[AdminNavKey];
  classes: { expandedOnly: string; railOnly: string; visuallyHiddenInRail: string };
}) {
  const Icon = item.icon;
  const showBadge = badge && badge.count > 0;

  return (
    <Link
      href={item.href}
      prefetch // production : page préchargée dès l'affichage de la sidebar
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[0.90625rem] transition-colors duration-150',
        classes.expandedOnly === 'hidden' ? 'justify-center px-0' : 'max-xl:justify-center max-xl:px-0',
        active ? 'bg-sur-oud font-medium text-oud' : 'text-sur-oud/75 hover:bg-sur-oud/8 hover:text-sur-oud',
      )}
    >
      <PendingIcon icon={Icon} className="size-[19px] shrink-0" strokeWidth={active ? 1.8 : 1.6} />
      <span className={cn('flex-1', classes.visuallyHiddenInRail)}>
        {item.label}
        {showBadge && <span className="sr-only">, {badge.label}</span>}
      </span>

      {showBadge && (
        <>
          {/* Dépliée : pastille avec le nombre */}
          <span
            aria-hidden="true"
            className={cn(
              'h-[22px] min-w-[22px] items-center justify-center gap-1.5 rounded-full px-2 text-[0.71875rem] font-semibold tabular-nums',
              classes.expandedOnly,
              badge.tone === 'or' ? 'bg-or text-encre' : 'bg-[#E0A24A]/20 text-[#E7B465]',
            )}
          >
            {badge.tone === 'alerte' && <span className="size-1.5 rounded-full bg-[#E0A24A]" />}
            {badge.tone === 'alerte' ? `${badge.count} bas` : badge.count}
          </span>
          {/* Repliée : pastille ou point sur l'icône */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute ring-2',
              active ? 'ring-sur-oud' : 'ring-oud',
              classes.railOnly,
              badge.tone === 'or'
                ? 'right-1.5 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-or px-1 text-[0.65625rem] font-semibold tabular-nums text-encre'
                : 'right-3 top-2.5 size-2 rounded-full bg-[#E0A24A]',
            )}
          >
            {badge.tone === 'or' ? badge.count : null}
          </span>
        </>
      )}

      <Tooltip className={classes.railOnly}>
        {item.label}
        {showBadge && ` · ${badge.label}`}
      </Tooltip>
    </Link>
  );
}

/** Info-bulle de la barre d'icônes (survol et focus clavier). */
function Tooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 whitespace-nowrap rounded-xl bg-encre px-3 py-2 text-[0.8125rem] font-normal text-lin opacity-0 shadow-lg transition-opacity duration-150',
        'group-hover:opacity-100 group-focus-visible:opacity-100',
        className,
      )}
    >
      {children}
    </span>
  );
}
