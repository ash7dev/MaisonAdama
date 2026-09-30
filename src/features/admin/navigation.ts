import { LayoutDashboard, Package, ReceiptText, Settings, Tag, Users, type LucideIcon } from 'lucide-react';

export type AdminNavKey = 'dashboard' | 'orders' | 'products' | 'promotions' | 'clients' | 'settings';

export type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type AdminNavGroup = { title: string; items: AdminNavItem[] };

const ITEMS: Record<AdminNavKey, AdminNavItem> = {
  dashboard: { key: 'dashboard', label: 'Tableau de bord', href: '/admin', icon: LayoutDashboard },
  orders: { key: 'orders', label: 'Commandes', href: '/admin/commandes', icon: ReceiptText },
  products: { key: 'products', label: 'Produits', href: '/admin/produits', icon: Package },
  promotions: { key: 'promotions', label: 'Promotions', href: '/admin/promotions', icon: Tag },
  clients: { key: 'clients', label: 'Clients', href: '/admin/clients', icon: Users },
  settings: { key: 'settings', label: 'Paramètres', href: '/admin/parametres', icon: Settings },
};

/** Sidebar desktop : 6 entrées. Le stock vit dans Produits, le catalogue dans Paramètres. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { title: 'Boutique', items: [ITEMS.dashboard, ITEMS.orders, ITEMS.products, ITEMS.promotions] },
  { title: 'Clientèle', items: [ITEMS.clients] },
  { title: 'Réglages', items: [ITEMS.settings] },
];

/** Barre du bas mobile : 4 destinations + « Plus ». */
export const ADMIN_MOBILE_TABS: AdminNavItem[] = [
  { ...ITEMS.dashboard, label: 'Accueil' },
  ITEMS.orders,
  ITEMS.products,
  ITEMS.clients,
];

/** Contenu du panneau « Plus » (mobile). */
export const ADMIN_MORE_ITEMS: AdminNavItem[] = [ITEMS.promotions, ITEMS.settings];

export function isAdminNavActive(pathname: string, item: AdminNavItem): boolean {
  if (item.href === '/admin') return pathname === '/admin';
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Cookie du choix « sidebar repliée » (lu côté serveur : pas de saut au chargement). */
export const SIDEBAR_COOKIE = 'ma-admin-sidebar';
