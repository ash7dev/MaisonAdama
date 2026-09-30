'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  AccountSkeleton,
  CustomerDetailSkeleton,
  CustomerListSkeleton,
  DashboardSkeleton,
  OrderDetailSkeleton,
  OrderListSkeleton,
  ProductFormSkeleton,
  ProductListSkeleton,
  PromotionFormSkeleton,
  PromotionListSkeleton,
  SettingsSkeleton,
} from '@/components/admin/skeletons';

/**
 * Navigation admin instantanée.
 *
 * Au clic sur N'IMPORTE QUEL lien interne de l'admin (sidebar, barre du bas, nom
 * d'un produit, numéro de commande, « Nouveau produit », retour…), le contenu
 * bascule IMMÉDIATEMENT sur la silhouette de la page demandée, dans le navigateur,
 * sans attendre le serveur ; les vraies données la remplacent dès qu'elles arrivent.
 * On ne reste jamais sur l'ancienne page en se demandant si le clic a été pris.
 * Les liens ajoutés plus tard en profitent automatiquement.
 */

type NavigationContext = {
  /** Page demandée, en attente d'affichage. */
  pendingHref: string | null;
  navigateTo: (href: string) => void;
};

const Context = createContext<NavigationContext>({ pendingHref: null, navigateTo: () => {} });

export function useAdminNavigation() {
  return useContext(Context);
}

/** Silhouette à afficher pour une adresse (la plus spécifique d'abord). */
function skeletonFor(href: string) {
  if (href === '/admin/produits/nouveau') return <ProductFormSkeleton label="Préparation du formulaire…" />;
  if (/^\/admin\/produits\/[^/]+$/.test(href)) return <ProductFormSkeleton label="Chargement du produit…" />;
  if (href.startsWith('/admin/produits')) return <ProductListSkeleton />;
  if (/^\/admin\/commandes\/[^/]+$/.test(href)) return <OrderDetailSkeleton />;
  if (href.startsWith('/admin/commandes')) return <OrderListSkeleton />;
  if (href === '/admin/promotions/nouvelle') return <PromotionFormSkeleton label="Préparation du formulaire…" />;
  if (/^\/admin\/promotions\/[^/]+$/.test(href)) return <PromotionFormSkeleton label="Chargement de la promotion…" />;
  if (href.startsWith('/admin/promotions')) return <PromotionListSkeleton />;
  if (/^\/admin\/clients\/[^/]+$/.test(href)) return <CustomerDetailSkeleton />;
  if (href.startsWith('/admin/clients')) return <CustomerListSkeleton />;
  if (href.startsWith('/admin/parametres')) return <SettingsSkeleton />;
  if (href.startsWith('/admin/compte')) return <AccountSkeleton />;
  return <DashboardSkeleton />;
}

/** Sécurité : si la navigation n'aboutit pas (réseau coupé), on réaffiche la page. */
const PENDING_TIMEOUT_MS = 20_000;

export function AdminNavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // La nouvelle page est affichée : fin de l'attente.
  useEffect(() => setPendingHref(null), [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = setTimeout(() => setPendingHref(null), PENDING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pendingHref]);

  // Tous les liens internes de l'admin, interceptés en phase de capture (avant le
  // gestionnaire de <Link>, qui annule le comportement par défaut du navigateur).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/admin')) return;
      // Même page (onglets, pagination, filtres) : sa propre silhouette de chargement suffit.
      if (url.pathname === window.location.pathname) return;
      setPendingHref(url.pathname);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      const path = href.split('?')[0];
      if (path !== pathname) setPendingHref(path);
    },
    [pathname],
  );

  return <Context.Provider value={{ navigateTo, pendingHref }}>{children}</Context.Provider>;
}

/** Zone de contenu : la page, ou la silhouette de la page demandée pendant la navigation. */
export function AdminMain({ children }: { children: React.ReactNode }) {
  const { pendingHref } = useContext(Context);
  return <main>{pendingHref ? skeletonFor(pendingHref) : children}</main>;
}
