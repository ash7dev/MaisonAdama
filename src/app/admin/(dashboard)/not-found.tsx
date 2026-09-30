import Link from 'next/link';
import { SearchX } from 'lucide-react';

/** Ressource introuvable dans l'admin (commande, produit…) : la navigation admin reste en place. */
export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center gap-5 px-4 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-lin text-or-profond ring-1 ring-inset ring-filet">
        <SearchX className="size-7" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-title-md text-encre">Introuvable</h1>
        <p className="text-[0.9375rem] leading-relaxed text-fumee">
          Cette commande ou ce produit n’existe pas, ou le lien est incomplet.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Link href="/admin/commandes" className="flex h-11 items-center rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover">
          Commandes
        </Link>
        <Link href="/admin/produits" className="flex h-11 items-center rounded-full border border-filet-fort px-5 text-sm font-medium text-oud transition-colors duration-150 hover:bg-lin">
          Produits
        </Link>
      </div>
    </div>
  );
}
