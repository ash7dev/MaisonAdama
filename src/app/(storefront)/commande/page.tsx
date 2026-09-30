import type { Metadata } from 'next';
import { getStoreSettings } from '@/features/settings';
import { getActiveDeliveryZones } from '@/features/delivery';
import { formatSenegalPhone } from '@/lib/phone';
import CheckoutForm from '@/features/checkout/components/CheckoutForm';

export const metadata: Metadata = {
  title: 'Commande · Maison Adama',
  robots: { index: false },
};

export default async function CheckoutPage() {
  const [zones, settings] = await Promise.all([getActiveDeliveryZones(), getStoreSettings()]);
  const wave = settings?.waveMerchantCode ?? null;

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-7 px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-10">
      <header className="flex flex-col gap-2">
        <span className="text-[0.6875rem] tracking-[0.3em] text-or-profond">DERNIÈRE ÉTAPE</span>
        <h1 className="text-[2.25rem] leading-none text-encre lg:text-[3.25rem]">Votre commande</h1>
      </header>
      <CheckoutForm
        zones={zones}
        whatsappNumber={settings?.whatsappNumber ?? null}
        waveNumber={wave ? (wave.startsWith('+221') ? formatSenegalPhone(wave) : wave) : null}
      />
    </div>
  );
}
