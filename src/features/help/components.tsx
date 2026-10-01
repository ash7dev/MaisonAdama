import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Les trois pages d'aide, reliées par un sommaire commun. */
export const HELP_PAGES = [
  { slug: 'livraison-et-paiement', label: 'Livraison et paiement' },
  { slug: 'comment-commander', label: 'Comment commander' },
  { slug: 'questions-frequentes', label: 'Questions fréquentes' },
] as const;

export type HelpSlug = (typeof HELP_PAGES)[number]['slug'];

export function HelpBreadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Fil d’Ariane" className="hidden text-[0.8125rem] text-fumee lg:block">
      <Link href="/" className="hover:text-encre">Accueil</Link> <span className="text-filet-fort">/</span> <span>Aide</span>{' '}
      <span className="text-filet-fort">/</span> <span className="text-encre">{name}</span>
    </nav>
  );
}

export function HelpNav({ current }: { current: HelpSlug }) {
  return (
    <nav aria-label="Pages d’aide" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-2 lg:w-full lg:gap-0 lg:border-b lg:border-filet">
        {HELP_PAGES.map((p, i) => {
          const on = p.slug === current;
          return (
            <li key={p.slug} className="lg:flex-1">
              <Link
                href={`/aide/${p.slug}`}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[0.8125rem] transition-colors duration-150',
                  'lg:-mb-px lg:h-auto lg:rounded-none lg:border-0 lg:border-b-2 lg:px-0 lg:pb-4 lg:pt-1 lg:text-base',
                  on ? 'border-oud bg-oud font-semibold text-sur-oud lg:bg-transparent lg:text-encre' : 'border-filet bg-lin text-encre lg:border-transparent lg:bg-transparent lg:text-fumee lg:hover:text-encre',
                )}
              >
                <span className={cn('hidden font-display text-[1.375rem] lg:inline', on ? 'text-or-profond' : 'text-filet-fort')}>0{i + 1}</span>
                <span className="lg:font-display lg:text-[1.375rem]">{p.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Encart de fin de page : une vraie personne répond. */
export function HelpContact({ whatsapp, phone }: { whatsapp: string | null; phone: string | null }) {
  if (!whatsapp && !phone) return null;
  return (
    <section className="flex flex-col gap-5 rounded-[28px] border border-filet bg-lin p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">Pas trouvé votre réponse ?</span>
        <h2 className="text-[1.5rem] leading-tight text-encre lg:text-[1.875rem]">Écrivez à la Maison, une vraie personne vous répond.</h2>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-oud px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-encre"
          >
            <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" /> Écrire sur WhatsApp
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="flex h-[3.25rem] items-center justify-center whitespace-nowrap rounded-full border border-filet-fort px-6 text-sm font-semibold tabular-nums text-oud transition-colors duration-150 hover:bg-sable">
            Appeler la Maison
          </a>
        )}
      </div>
    </section>
  );
}

export function HelpSection({ id, kicker, title, children, className }: { id: string; kicker: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">{kicker}</span>
        <h2 id={id} className="text-[1.875rem] leading-none text-encre lg:text-[2.625rem]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
