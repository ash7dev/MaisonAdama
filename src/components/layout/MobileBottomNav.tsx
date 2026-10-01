// src/components/layout/MobileBottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MOBILE_LINKS, isLinkActive, shouldHideBottomNav } from './nav-config';

/** Même velours que le mur des alcôves. */
const VELVET =
  'linear-gradient(90deg, rgb(0 0 0 / 0.14) 0 1px, transparent 1px 100%) 0 0 / 7px 100%, radial-gradient(120% 140% at 50% 0%, #4A3222 0%, #2B1D12 60%, #1C130C 100%)';

/**
 * Dock mobile « la lampe qui glisse » : capsule de velours flottante, liseré
 * doré ; une pastille couleur paille, éclairée par un fin halo, glisse sous
 * l'onglet actif. « Mon parfum » garde son étincelle dorée.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  if (shouldHideBottomNav(pathname)) return null;

  const activeIndex = MOBILE_LINKS.findIndex((link) => isLinkActive(pathname, link));

  return (
    <>
      {/* Réserve la place du dock : aucun contenu (footer, bouton) ne passe dessous. */}
      <div aria-hidden="true" className="h-[calc(6rem+env(safe-area-inset-bottom))] lg:hidden" />

      <nav
        aria-label="Navigation mobile"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div
          className="pointer-events-auto relative mx-auto max-w-[24rem] rounded-full p-1.5 shadow-[0_18px_40px_rgb(23_16_10/0.45),0_2px_6px_rgb(23_16_10/0.3)] ring-1 ring-inset ring-or/30"
          style={{ background: VELVET }}
        >
          {/* Reflet du liseré, en haut du dock */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-or-clair/60 to-transparent" />

          <ul className="relative grid grid-cols-4">
            {/* La pastille éclairée : glisse sous l'onglet actif */}
            {activeIndex >= 0 && (
              <li
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/4 transition-transform duration-500 ease-out-soft motion-reduce:transition-none"
                style={{ transform: `translateX(${activeIndex * 100}%)` }}
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-b from-[#F6E7C4] to-or-clair shadow-[0_6px_16px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.7)]" />
                <span className="absolute -top-1.5 left-1/2 h-3 w-10 -translate-x-1/2 rounded-full bg-or-clair/70 blur-md" />
                <span className="absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-full bg-or" />
              </li>
            )}

            {MOBILE_LINKS.map((link, i) => {
              const { label, href, icon: Icon } = link;
              const active = i === activeIndex;
              const sparkle = href === '/trouver-mon-parfum';
              return (
                <li key={href} className="relative">
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-[3.625rem] flex-col items-center justify-center gap-1 rounded-full',
                      'text-[0.65625rem] font-semibold tracking-[0.02em]',
                      'transition-[color,transform] duration-300 ease-out-soft active:scale-[0.94] motion-reduce:active:scale-100',
                      'focus-visible:outline-or',
                      active ? 'text-encre' : 'text-sur-oud/65',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-[21px] transition-transform duration-300 ease-out-soft',
                        active && '-translate-y-px',
                        sparkle && !active && 'text-or',
                      )}
                      strokeWidth={active ? 2 : 1.6}
                      aria-hidden="true"
                    />
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
