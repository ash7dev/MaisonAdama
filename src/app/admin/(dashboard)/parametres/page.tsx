import type { Metadata } from 'next';
import { requireAdmin } from '@/features/auth/require-admin';
import { getAdminSettings } from '@/features/settings/queries';
import StoreInfoForm from '@/features/settings/components/StoreInfoForm';
import WavePaymentForm from '@/features/settings/components/WavePaymentForm';
import DeliveryZonesManager from '@/features/settings/components/DeliveryZonesManager';
import SettingsNav from '@/features/settings/components/SettingsNav';
import ReadinessPanel, { type ReadinessItem } from '@/features/settings/components/ReadinessPanel';

export const metadata: Metadata = {
  title: 'Paramètres · Administration Maison Adama',
};

export default async function SettingsPage() {
  const [, { settings, zones }] = await Promise.all([requireAdmin(), getAdminSettings()]);

  const activeZones = zones.filter((z) => z.isActive).length;
  const waveReady = Boolean(settings?.waveMerchantCode || settings?.waveQrImagePath);

  const readiness: ReadinessItem[] = [
    {
      key: 'zones',
      label: 'Zones de livraison',
      done: activeZones > 0,
      required: true,
      href: '#livraison',
      hint: 'Sans zone active, le client ne peut pas valider sa commande.',
    },
    {
      key: 'wave',
      label: 'Paiement Wave',
      done: waveReady,
      required: true,
      href: '#wave',
      hint: 'Le numéro ou le QR code à payer, affiché au client.',
    },
    {
      key: 'whatsapp',
      label: 'Numéro WhatsApp',
      done: Boolean(settings?.whatsappNumber),
      required: false,
      href: '#boutique',
      hint: 'Pour que les clients vous écrivent en un clic.',
    },
    {
      key: 'email',
      label: 'E-mail de contact',
      done: Boolean(settings?.contactEmail),
      required: false,
      href: '#boutique',
      hint: 'Pour les clients qui préfèrent écrire un e-mail.',
    },
  ];

  return (
    <div className="flex flex-col gap-5 px-4 pb-16 pt-6 lg:px-2 lg:pb-10 lg:pt-3">
      <header className="flex flex-col gap-2 px-1 lg:min-h-[72px] lg:justify-center">
        <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">Paramètres</h1>
        <p className="text-sm text-fumee">Boutique, paiement et livraison · appliqués immédiatement à la boutique.</p>
      </header>

      <ReadinessPanel items={readiness} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <SettingsNav
          warnings={{
            boutique: !settings?.whatsappNumber,
            wave: !waveReady,
            livraison: activeZones === 0,
          }}
        />
        <div className="flex min-w-0 max-w-4xl flex-col gap-5">
          <StoreInfoForm settings={settings} />
          <WavePaymentForm settings={settings} />
          <DeliveryZonesManager zones={zones} />
        </div>
      </div>
    </div>
  );
}
