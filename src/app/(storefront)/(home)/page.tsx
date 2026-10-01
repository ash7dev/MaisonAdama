import type { Metadata } from 'next';
import { getStoreSettings } from '@/features/settings';
import { whatsappLink, WHATSAPP_DEFAULT_MESSAGE } from '@/lib/whatsapp';
import { getHomeData, momentOfDay } from '@/features/shop/home';
import { Billetterie, DoubtBand, EtagereWall, Spotlight, Tonight } from '@/features/shop/components/home/Etagere';
import TrustStrip from '@/features/shop/components/TrustStrip';
import Rayons from '@/features/shop/components/home/Rayons';

// Le produit du jour et « Ce soir / Ce matin » suivent l'heure de Dakar.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Maison Adama Tchurayy · Parfumerie à Dakar',
  description:
    'Parfums, muscs, huiles, oud et thiouraye, choisis et préparés à Dakar. Livraison partout au Sénégal, paiement Wave ou à la livraison, conseil sur WhatsApp.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const now = new Date();
  const [data, settings] = await Promise.all([getHomeData(now), getStoreSettings()]);
  const wa = whatsappLink(settings?.whatsappNumber);
  const empty = data.total === 0;

  return (
    <>
      <EtagereWall data={data} whatsapp={wa} />
      <div className="mx-auto flex max-w-shop flex-col gap-14 px-4 pb-16 pt-12 lg:gap-20 lg:px-10 lg:pb-20 lg:pt-20">
        {data.featured && <Spotlight featured={data.featured} now={now} />}
        {data.tonight.length > 0 && <Tonight products={data.tonight} moment={momentOfDay(now)} total={data.total} />}
        <Billetterie tickets={data.tickets} open={!empty} />
        {!empty && <Rayons rayons={data.rayons} whatsapp={wa} />}
        <DoubtBand whatsapp={whatsappLink(settings?.whatsappNumber, WHATSAPP_DEFAULT_MESSAGE)} />
        <TrustStrip />
      </div>
    </>
  );
}
