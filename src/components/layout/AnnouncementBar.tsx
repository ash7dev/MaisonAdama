// src/components/layout/AnnouncementBar.tsx
// Server Component : les promesses qui rassurent avant d'acheter, et la
// promotion en cours quand il y en a une.
// Desktop : tout côte à côte. Mobile : une information à la fois (AnnouncementTicker).
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { TopPromotion } from '@/features/shop/home';
import AnnouncementTicker from './AnnouncementTicker';

const PROMISES = [
  'Livraison partout au Sénégal',
  'Paiement Wave ou à la livraison',
  'Chaque commande confirmée par téléphone',
];

export function promoText(promo: TopPromotion): string {
  return `−${promo.percent} % sur ${promo.name}`;
}

export default function AnnouncementBar({ promo }: { promo?: TopPromotion | null }) {
  // Avec une promotion, elle prend la place de la troisième promesse (desktop).
  const promises = promo ? PROMISES.slice(0, 2) : PROMISES;
  return (
    <>
      <AnnouncementTicker promo={promo ? { text: promoText(promo), href: `/produits/${promo.slug}` } : null} />
      <div data-site-chrome className="hidden bg-oud text-sur-oud md:block">
        <ul className="mx-auto flex h-9 max-w-shop items-center justify-center gap-4 px-4 text-[0.78125rem] tracking-[0.04em]">
          {promo && (
            <li className="flex items-center gap-4">
              <Link href={`/produits/${promo.slug}`} className="flex items-center gap-2 font-semibold text-or-clair underline-offset-4 hover:underline">
                <span className="rounded-full bg-or px-2 py-0.5 text-[0.6875rem] font-bold text-encre">Promo</span>
                {promoText(promo)}
                <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
              </Link>
            </li>
          )}
          {promises.map((promise, index) => (
            <li key={promise} className="flex items-center gap-4">
              {(index > 0 || promo) && <span aria-hidden="true" className="size-[3px] rounded-full bg-or" />}
              {promise}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
