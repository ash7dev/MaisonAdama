import type { Metadata } from 'next';
import { getStoreSettings } from '@/features/settings';
import { getActiveDeliveryZones } from '@/features/delivery';
import { listShopProducts } from '@/features/shop/queries';
import CartView from '@/features/cart/components/CartView';

export const metadata: Metadata = {
  title: 'Votre panier · Maison Adama',
  robots: { index: false },
};

export default async function CartPage() {
  const [zones, settings, suggestions] = await Promise.all([
    getActiveDeliveryZones(),
    getStoreSettings(),
    listShopProducts({ familles: [], promo: false, tri: 'pertinence', page: 1 }),
  ]);

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-7 px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-10">
      <header className="flex flex-col gap-2">
        <span className="text-[0.6875rem] tracking-[0.3em] text-or-profond">VOTRE SÉLECTION</span>
        <h1 className="text-[2.25rem] leading-none text-encre lg:text-[3.25rem]">Votre panier</h1>
      </header>
      <CartView
        zones={zones.map((z) => ({ id: z.id, name: z.name, defaultFee: z.defaultFee, estimatedDelay: z.estimatedDelay }))}
        whatsappNumber={settings?.whatsappNumber ?? null}
        suggestions={suggestions.products.filter((p) => p.inStock).slice(0, 8)}
      />
    </div>
  );
}
