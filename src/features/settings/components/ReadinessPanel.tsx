import { Check, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReadinessItem = { key: string; label: string; done: boolean; required: boolean; href: string; hint: string };

/**
 * « Prête à vendre ? » : ce qui manque pour que les clients puissent commander
 * et payer. Se replie en une ligne quand tout est en ordre.
 */
export default function ReadinessPanel({ items }: { items: ReadinessItem[] }) {
  const done = items.filter((i) => i.done).length;
  const blocking = items.filter((i) => i.required && !i.done);
  const ready = blocking.length === 0;

  if (done === items.length) {
    return (
      <p className="flex items-center gap-3 rounded-[28px] bg-succes-fond px-5 py-4 text-sm text-succes">
        <span className="grid size-8 place-items-center rounded-full bg-succes text-white">
          <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span>
          <strong className="font-semibold">Boutique prête à vendre.</strong> Contacts, paiement Wave et livraison sont en place.
        </span>
      </p>
    );
  }

  return (
    <section aria-labelledby="readiness-title" className="flex flex-col gap-4 rounded-[28px] bg-oud p-5 text-sur-oud sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="readiness-title" className="text-title-sm text-sur-oud">
            {ready ? 'Presque prête' : 'Avant d’ouvrir la boutique'}
          </h2>
          <p className="text-sm text-sur-oud/70">
            {ready ? 'Les clients peuvent commander. Quelques détails à compléter.' : `${blocking.length} étape${blocking.length > 1 ? 's' : ''} indispensable${blocking.length > 1 ? 's' : ''} pour recevoir des commandes.`}
          </p>
        </div>
        <span className="font-display text-[1.75rem] leading-none tabular-nums text-sur-oud">
          {done}
          <span className="text-sur-oud/50">/{items.length}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sur-oud/15" aria-hidden="true">
        <div className="h-full origin-left rounded-full bg-or-clair transition-transform duration-500" style={{ transform: `scaleX(${done / items.length})` }} />
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <a
              href={item.href}
              className={cn(
                'flex h-full items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors duration-150',
                item.done ? 'bg-sur-oud/5' : 'bg-sur-oud/10 hover:bg-sur-oud/15',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                  item.done ? 'bg-succes text-white' : item.required ? 'bg-or-clair text-oud' : 'ring-1 ring-inset ring-sur-oud/40',
                )}
              >
                {item.done ? (
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                ) : item.required ? (
                  <CircleAlert className="size-3" strokeWidth={2.5} aria-hidden="true" />
                ) : null}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={cn('text-sm', item.done ? 'text-sur-oud/60 line-through decoration-sur-oud/30' : 'font-medium text-sur-oud')}>
                  {item.label}
                  {!item.done && !item.required && <span className="ml-1.5 font-normal text-sur-oud/50">(conseillé)</span>}
                </span>
                {!item.done && <span className="text-xs leading-snug text-sur-oud/65">{item.hint}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
