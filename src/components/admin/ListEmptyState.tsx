import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Zone de liste vide, commune aux pages Produits, Commandes et Promotions.
 * Elle occupe la place de la liste (même cadre) : onglets et recherche restent
 * visibles au-dessus, la page garde sa structure quel que soit le contenu.
 *
 * - `tone="welcome"` : rien n'existe encore (pastille oud, texte d'accueil) ;
 * - `tone="neutral"` : onglet vide ou filtres sans résultat.
 */
export default function ListEmptyState({
  icon,
  title,
  description,
  tone = 'neutral',
  action,
  clearHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  tone?: 'welcome' | 'neutral';
  /** Bouton principal (ex. « Ajouter un produit »). */
  action?: React.ReactNode;
  /** Lien « Effacer les filtres » quand une recherche ne donne rien. */
  clearHref?: string;
}) {
  return (
    <section
      aria-live="polite"
      className="flex min-h-[22rem] flex-col items-center justify-center gap-5 rounded-[28px] border border-filet bg-lin px-6 py-14 text-center motion-safe:animate-reveal"
    >
      <span
        className={cn(
          'grid size-16 place-items-center rounded-full [&_svg]:size-7',
          tone === 'welcome' ? 'bg-oud text-sur-oud' : 'bg-sable text-or-profond ring-1 ring-inset ring-filet',
        )}
      >
        {icon}
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-title-sm text-encre">{title}</h2>
        <p className="text-[0.9375rem] leading-relaxed text-fumee">{description}</p>
      </div>
      {(action || clearHref) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {clearHref && (
            <Link
              href={clearHref}
              scroll={false}
              className="flex h-11 items-center rounded-full border border-filet-fort px-5 text-sm font-medium text-oud transition-colors duration-150 hover:bg-white"
            >
              Effacer les filtres
            </Link>
          )}
          {action}
        </div>
      )}
    </section>
  );
}
