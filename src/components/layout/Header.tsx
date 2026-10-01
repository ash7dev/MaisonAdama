// src/components/layout/Header.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronDown, MessageCircle, Search, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartCount } from '@/features/cart/hooks/use-cart-count';
import { DESKTOP_LINKS, isLinkActive, isShopActive, cartLabel } from './nav-config';
import ShopMenu from './ShopMenu';
import SearchDialog from './SearchDialog';

type HeaderProps = {
  /** Lien wa.me construit depuis StoreSettings ; null = bouton masqué. */
  whatsappHref: string | null;
  /** Créations publiées par univers (slug → nombre). */
  universCounts?: Record<string, number>;
};

const SHOP_MENU_ID = 'shop-menu';

const navItem =
  'flex h-11 items-center gap-1.5 rounded-full px-4 text-[0.78125rem] font-medium tracking-[0.14em] uppercase transition-colors duration-150';

/**
 * Header « capsule flottante » : détaché du bord, entièrement arrondi, comme la
 * barre de navigation mobile. Il se resserre au défilement, sans changer de place.
 */
export default function Header({ whatsappHref, universCounts = {} }: HeaderProps) {
  const pathname = usePathname();
  const cartCount = useCartCount();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const capsuleRef = useRef<HTMLDivElement>(null);
  // Menu ouvert au clic (chevron) : il reste ouvert quand la souris s'en va.
  const pinned = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hover = {
    cancel: () => clearTimeout(timer.current),
    // Petit délai : un simple passage de la souris n'ouvre pas le menu.
    enter: () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMenuOpen(true), 150);
    },
    leave: () => {
      clearTimeout(timer.current);
      if (!pinned.current) timer.current = setTimeout(() => setMenuOpen(false), 220);
    },
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Changement de page : le menu se referme.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) pinned.current = false;
  }, [menuOpen]);

  // Menu ouvert : Échap ou clic à l'extérieur le referment.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!capsuleRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const shopActive = isShopActive(pathname);

  return (
    <>
      <header data-site-chrome className="sticky top-0 z-40 px-3 pt-2.5 lg:px-6 lg:pt-3.5">
        <div
          ref={capsuleRef}
          className={cn(
            'relative mx-auto flex items-center gap-3 rounded-full border border-filet bg-lin/90 pl-2.5 pr-1.5 shadow-md backdrop-blur-md lg:gap-6 lg:pl-3.5 lg:pr-2.5',
            'transition-[max-width,height] duration-250 ease-out-soft',
            isScrolled ? 'h-14 max-w-[66rem] lg:h-[62px]' : 'h-[60px] max-w-shop lg:h-[76px]',
          )}
        >
          {/* Marque */}
          <Link
            href="/"
            aria-label="Maison Adama Tchurayy, retour à l'accueil"
            className="flex shrink-0 items-center gap-3 rounded-full"
          >
            <Image
              src="/images/logomasonAdama.jpg"
              alt=""
              width={88}
              height={88}
              priority
              className="size-10 rounded-full ring-1 ring-filet lg:size-11"
            />
            <span className="flex flex-col gap-1">
              <span className="whitespace-nowrap font-display text-[1.25rem] leading-none tracking-[0.03em] text-oud lg:text-[1.3125rem]">
                Maison Adama
              </span>
              <span className="whitespace-nowrap text-[0.5625rem] leading-none tracking-[0.3em] text-or-profond lg:text-[0.59375rem] lg:tracking-[0.32em]">
                TCHURAYY · DAKAR
              </span>
            </span>
          </Link>

          {/* Navigation desktop */}
          <nav aria-label="Navigation principale" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-center gap-1">
              {/* « Boutique » : le mot mène à la boutique, le chevron (ou le survol) ouvre le menu. */}
              <li
                onPointerEnter={(e) => e.pointerType === 'mouse' && hover.enter()}
                onPointerLeave={(e) => e.pointerType === 'mouse' && hover.leave()}
                className={cn(
                  'flex h-11 items-center rounded-full transition-colors duration-150',
                  menuOpen ? 'bg-oud text-sur-oud' : shopActive ? 'bg-sable text-oud' : 'text-fumee hover:bg-sable hover:text-encre',
                )}
              >
                <Link
                  href="/boutique"
                  aria-current={pathname === '/boutique' ? 'page' : undefined}
                  className="flex h-full items-center rounded-full pl-4 pr-1 text-[0.78125rem] font-medium uppercase tracking-[0.14em]"
                >
                  Boutique
                </Link>
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls={SHOP_MENU_ID}
                  aria-label={menuOpen ? 'Fermer le menu Boutique' : 'Ouvrir le menu Boutique : univers et collections'}
                  onClick={() => {
                    pinned.current = !menuOpen;
                    hover.cancel();
                    setMenuOpen((open) => !open);
                  }}
                  className={cn(
                    'mr-1 grid size-9 place-items-center rounded-full transition-colors duration-150',
                    menuOpen ? 'hover:bg-sur-oud/15' : 'hover:bg-lin',
                  )}
                >
                  <ChevronDown
                    className={cn('size-3.5 transition-transform duration-250 ease-out-soft', menuOpen && 'rotate-180')}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              </li>
              {DESKTOP_LINKS.map((link) => {
                const active = isLinkActive(pathname, link);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(navItem, active ? 'bg-sable text-oud' : 'text-fumee hover:bg-sable hover:text-encre')}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Actions — mobile : recherche et panier ; ordinateur : recherche, WhatsApp, panier */}
          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
              aria-label="Rechercher un produit"
              aria-haspopup="dialog"
              className="grid size-11 place-items-center rounded-full bg-sable text-oud transition-colors duration-150 hover:bg-paille lg:bg-transparent lg:hover:bg-sable"
            >
              <Search className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
            </button>

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Écrire sur WhatsApp (nouvel onglet)"
                className="hidden size-11 place-items-center rounded-full text-oud transition-colors duration-150 hover:bg-sable lg:grid"
              >
                <MessageCircle className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
              </a>
            )}

            {/* Panier (mobile) : pastille ronde, nombre d'articles en or */}
            <Link
              href="/panier"
              aria-label={cartLabel(cartCount)}
              className="relative grid size-11 place-items-center rounded-full bg-oud text-sur-oud transition-colors duration-150 hover:bg-oud-hover lg:hidden"
            >
              <ShoppingBag className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
              {cartCount > 0 && (
                <span
                  key={cartCount} // relance l'animation à chaque ajout
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-or px-1 text-[0.625rem] font-bold tabular-nums text-encre ring-2 ring-lin motion-safe:animate-pop"
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            <Link
              href="/panier"
              aria-label={cartLabel(cartCount)}
              className="ml-1.5 hidden h-[52px] items-center gap-2.5 rounded-full bg-oud pl-5 pr-2 text-[0.84375rem] font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover lg:flex"
            >
              <ShoppingBag className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
              <span>Panier</span>
              <span className="grid h-[34px] min-w-[34px] place-items-center rounded-full bg-sur-oud px-2 text-[0.8125rem] font-semibold tabular-nums text-oud">
                {cartCount}
              </span>
            </Link>
          </div>

          {menuOpen && (
            <ShopMenu
              id={SHOP_MENU_ID}
              counts={universCounts}
              onNavigate={() => setMenuOpen(false)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && hover.cancel()}
              onPointerLeave={(e) => e.pointerType === 'mouse' && hover.leave()}
            />
          )}
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
