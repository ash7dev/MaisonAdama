import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hors connexion · Maison Adama',
  robots: { index: false, follow: false },
};

/** Affichée par le service worker quand une page n'est pas disponible hors connexion. */
export default function HorsLignePage() {
  return (
    <div className="mx-auto flex max-w-shop flex-col px-4 pb-16 pt-6 lg:px-10 lg:pt-10">
      <section className="flex min-h-[28rem] flex-col items-center justify-center gap-4 rounded-[36px] bg-[radial-gradient(90%_70%_at_50%_30%,#6B4526_0%,#3A2716_50%,#17100A_100%)] px-6 py-14 text-center text-sur-oud">
        <span className="relative grid size-16 place-items-center rounded-full bg-sur-oud/10 text-or-clair ring-1 ring-or-clair/25">
          <span aria-hidden="true" className="absolute -inset-3 rounded-full border border-dashed border-or-clair/20" />
          <WifiOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h1 className="text-[1.75rem] leading-tight lg:text-[2.25rem]">Vous êtes hors connexion</h1>
        <p className="max-w-md text-[0.9375rem] leading-relaxed text-sur-oud/75">
          Cette page n’est pas encore enregistrée sur votre téléphone. Les pages déjà visitées restent consultables ; votre panier est gardé.
        </p>
        <Link href="/" className="mt-2 flex h-12 items-center rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille">
          Réessayer
        </Link>
      </section>
    </div>
  );
}
