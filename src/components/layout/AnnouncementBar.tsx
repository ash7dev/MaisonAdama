// src/components/layout/AnnouncementBar.tsx
// Server Component : les promesses qui rassurent avant d'acheter.
// Desktop : les trois côte à côte. Mobile : une à la fois (AnnouncementTicker).
import AnnouncementTicker from './AnnouncementTicker';

const PROMISES = [
  'Livraison partout au Sénégal',
  'Paiement Wave ou à la livraison',
  'Chaque commande confirmée par téléphone',
];

export default function AnnouncementBar() {
  return (
    <>
      <AnnouncementTicker />
      <div data-site-chrome className="hidden bg-oud text-sur-oud md:block">
        <ul className="mx-auto flex h-9 max-w-shop items-center justify-center gap-4 px-4 text-[0.78125rem] tracking-[0.04em]">
          {PROMISES.map((promise, index) => (
            <li key={promise} className="flex items-center gap-4">
              {index > 0 && <span aria-hidden="true" className="size-[3px] rounded-full bg-or" />}
              {promise}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
