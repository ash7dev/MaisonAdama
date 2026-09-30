// src/components/layout/nav-config.ts
import { House, LayoutGrid, Sparkles, Info, type LucideIcon } from 'lucide-react';

export type NavLink = {
    label: string;
    href: string;
    /** Préfixes d'URL qui rendent le lien actif. Par défaut : href. */
    match?: string[];
};

export type MobileNavLink = NavLink & { icon: LucideIcon };

/**
 * Desktop : « Boutique » ouvre le menu des univers et collections (bouton, pas
 * lien), puis deux accès : le guide olfactif et l'histoire de la Maison.
 */
export const DESKTOP_LINKS: NavLink[] = [
    { label: 'Trouver mon parfum', href: '/trouver-mon-parfum' },
    { label: 'La Maison', href: '/a-propos' },
];

/** Pages couvertes par le menu Boutique (hors liens desktop dédiés). */
export const SHOP_MATCH = ['/boutique', '/categories', '/collections', '/produits', '/recherche'];

export type ShopCategory = {
    label: string;
    slug: string;
    hint: string;
    /** Fond de la vignette tant qu'il n'y a pas de photo de catégorie. */
    tint: string;
};

export const SHOP_CATEGORIES: ShopCategory[] = [
    { label: 'Parfums', slug: 'parfums', hint: 'Eaux de parfum, extraits', tint: 'bg-paille' },
    { label: 'Muscs', slug: 'muscs', hint: 'Muscs parfumés', tint: 'bg-[#EADFC9]' },
    { label: 'Huiles', slug: 'huiles', hint: 'Huiles parfumées', tint: 'bg-[#DFCDAE]' },
    { label: 'Oud', slug: 'oud', hint: 'Bois et huiles d’oud', tint: 'bg-[#D9C3A0]' },
    { label: 'Encens', slug: 'encens', hint: 'Thiouraye, bakhour', tint: 'bg-[#E3D2B4]' },
];

export const SHOP_COLLECTIONS: NavLink[] = [
    { label: 'Nouveautés', href: '/collections/nouveautes' },
    { label: 'Best-sellers', href: '/collections/best-sellers' },
    { label: 'Idées cadeaux', href: '/collections/idees-cadeaux' },
];

/** Suggestions de la recherche : catégories et synonymes reconnus par la base. */
export const POPULAR_SEARCHES = ['Thiouraye', 'Bakhour', 'Musc', 'Oud', 'Eau de parfum', 'Extrait'];

/**
 * Mobile : les mêmes destinations que la barre desktop, plus l'accueil.
 * Le panier reste dans l'en-tête (en haut à droite, comme sur desktop).
 */
export const MOBILE_LINKS: MobileNavLink[] = [
    { label: 'Accueil', href: '/', icon: House, match: ['/'] },
    {
        label: 'Boutique',
        href: '/boutique',
        icon: LayoutGrid,
        match: ['/boutique', '/categories', '/collections', '/produits', '/recherche'],
    },
    { label: 'Mon parfum', href: '/trouver-mon-parfum', icon: Sparkles },
    { label: 'La Maison', href: '/a-propos', icon: Info },
];

/**
 * Pages où la barre basse disparaît : le checkout doit rester sans distraction,
 * la fiche produit et le panier ont leur propre barre collée en bas.
 */
export const BOTTOM_NAV_HIDDEN_ON = ['/commande', '/admin', '/produits', '/panier'];

export function isLinkActive(pathname: string, link: NavLink): boolean {
    const prefixes = link.match ?? [link.href];
    return prefixes.some((prefix) =>
        prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

/** « Boutique » est actif sur le catalogue, sauf quand un lien dédié l'est déjà. */
export function isShopActive(pathname: string): boolean {
    if (DESKTOP_LINKS.some((link) => isLinkActive(pathname, link))) return false;
    return isLinkActive(pathname, { label: 'Boutique', href: '/boutique', match: SHOP_MATCH });
}

export function shouldHideBottomNav(pathname: string): boolean {
    // "/commande" exact = checkout ; la page de confirmation garde la barre.
    return BOTTOM_NAV_HIDDEN_ON.some((p) =>
        p === '/commande' ? pathname === p : pathname === p || pathname.startsWith(`${p}/`),
    );
}

export function cartLabel(count: number): string {
    return count === 0 ? 'Panier, vide' : `Panier, ${count} article${count > 1 ? 's' : ''}`;
}
