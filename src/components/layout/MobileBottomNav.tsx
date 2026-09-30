// src/components/layout/MobileBottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCartCount } from '@/features/cart/hooks/use-cart-count';
import { MOBILE_LINKS, isLinkActive, shouldHideBottomNav, cartLabel } from './nav-config';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const cartCount = useCartCount();

    if (shouldHideBottomNav(pathname)) return null;

    return (
        <>
            {/* Réserve la place du dock : aucun contenu (footer, bouton) ne passe dessous. */}
            <div aria-hidden="true" className="h-[calc(6rem+env(safe-area-inset-bottom))] lg:hidden" />

            <nav
                aria-label="Navigation mobile"
                className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
            >
                <ul className="mx-auto flex max-w-md rounded-[22px] bg-oud p-1.5 shadow-lg">
                    {MOBILE_LINKS.map((link) => {
                        const { label, href, icon: Icon } = link;
                        const active = isLinkActive(pathname, link);
                        const isCart = href === '/panier';

                        return (
                            <li key={href} className="flex-1">
                                <Link
                                    href={href}
                                    aria-current={active ? 'page' : undefined}
                                    aria-label={isCart ? cartLabel(cartCount) : undefined}
                                    className={cn(
                                        'flex h-14 flex-col items-center justify-center gap-1 rounded-2xl',
                                        'text-[0.6875rem] font-medium tracking-[0.01em]',
                                        'transition-colors duration-150 ease-out-soft',
                                        'focus-visible:outline-or',
                                        active
                                            ? 'bg-sur-oud/12 text-sur-oud'
                                            : 'text-sur-oud/65 active:bg-sur-oud/8',
                                    )}
                                >
                                    <span className="relative">
                                        <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} aria-hidden="true" />

                                        {isCart && cartCount > 0 && (
                                            <span
                                                key={cartCount} // relance l'animation à chaque ajout
                                                aria-hidden="true"
                                                className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-or px-1 text-[0.625rem] font-semibold tabular-nums text-encre ring-2 ring-oud motion-safe:animate-pop"
                                            >
                                                {cartCount > 9 ? '9+' : cartCount}
                                            </span>
                                        )}
                                    </span>
                                    <span aria-hidden={isCart ? true : undefined}>{label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}