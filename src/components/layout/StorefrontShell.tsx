// src/components/layout/StorefrontShell.tsx
// Server Component : habillage commun des pages boutique (pas de l'admin).
import { getStoreSettings } from '@/features/settings';
import { getShopFacets } from '@/features/shop/queries';
import { WHATSAPP_DEFAULT_MESSAGE, whatsappLink } from '@/lib/whatsapp';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

export default async function StorefrontShell({ children }: { children: React.ReactNode }) {
  const [settings, facets] = await Promise.all([getStoreSettings(), getShopFacets().catch(() => null)]);
  // Nombre de créations par univers, affiché dans le menu Boutique.
  const universCounts = Object.fromEntries((facets?.univers ?? []).map((u) => [u.slug, u.count]));

  return (
    <>
      <AnnouncementBar />
      <Header whatsappHref={whatsappLink(settings?.whatsappNumber, WHATSAPP_DEFAULT_MESSAGE)} universCounts={universCounts} />
      <main>{children}</main>
      <Footer whatsappNumber={settings?.whatsappNumber} contactPhone={settings?.contactPhone} />
      <MobileBottomNav />
    </>
  );
}
