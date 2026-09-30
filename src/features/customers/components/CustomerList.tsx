import Link from 'next/link';
import { ChevronRight, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatRelative } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { PendingSpinner } from '@/components/ui/link-pending';
import { ContactButtons } from '@/features/orders/components/order-ui';
import { CustomerAvatar, SegmentBadges } from '../customer-ui';
import type { AdminCustomerRow } from '../queries';

function LastOrder({ customer }: { customer: AdminCustomerRow }) {
  if (!customer.lastOrderAt) return <span className="text-[0.8125rem] text-fumee">Aucune commande aboutie</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span suppressHydrationWarning className="text-[0.8125rem] text-encre first-letter:uppercase">
        {formatRelative(customer.lastOrderAt)}
      </span>
      {customer.lastCity && <span className="text-[0.8125rem] text-fumee">{customer.lastCity}</span>}
    </span>
  );
}

function OpenOrders({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-[#DCEBF3] px-2 text-[0.71875rem] font-medium text-[#1F5673]">
      {count} en cours
    </span>
  );
}

/** Liste des clients : tableau (desktop) et cartes (mobile). */
export default function CustomerList({ customers }: { customers: AdminCustomerRow[] }) {
  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────────────── */}
      <div className="hidden rounded-[28px] border border-filet bg-lin lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-filet text-[0.71875rem] uppercase tracking-[0.12em] text-fumee">
              <th scope="col" className="py-3.5 pl-6 pr-3 font-medium">Client</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Commandes</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Total dépensé</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Dernière commande</th>
              <th scope="col" className="py-3.5 pl-3 pr-6 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="group border-b border-filet/70 transition-colors duration-150 last:border-b-0 hover:bg-white/50">
                <td className="py-4 pl-6 pr-3 align-middle">
                  <Link href={`/admin/clients/${customer.id}`} className="flex items-center gap-3.5 rounded-lg">
                    <CustomerAvatar name={customer.name} />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex items-center gap-2 text-[0.9375rem] font-medium text-encre decoration-or underline-offset-4 group-hover:underline">
                        <span className="truncate">{customer.name}</span>
                        {customer.hasNote && (
                          <NotebookPen className="size-3.5 shrink-0 text-or-profond" strokeWidth={1.8} aria-label="Note interne" />
                        )}
                        <PendingSpinner />
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.8125rem] tabular-nums text-fumee">{formatSenegalPhone(customer.phone)}</span>
                        <SegmentBadges isLoyal={customer.isLoyal} isNew={customer.isNew} isDormant={customer.isDormant} />
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-4 align-middle">
                  <span className="flex flex-col items-start gap-1.5">
                    <span className="text-[0.9375rem] font-medium tabular-nums text-encre">{customer.ordersCount}</span>
                    <OpenOrders count={customer.openCount} />
                  </span>
                </td>
                <td className="px-3 py-4 align-middle">
                  <span className={cn('whitespace-nowrap text-[0.9375rem] tabular-nums', customer.spent > 0 ? 'font-medium text-encre' : 'text-fumee')}>
                    {formatFCFA(customer.spent)}
                  </span>
                </td>
                <td className="px-3 py-4 align-middle">
                  <LastOrder customer={customer} />
                </td>
                <td className="py-4 pl-3 pr-6 align-middle">
                  <div className="flex items-center justify-end gap-2">
                    <ContactButtons phone={customer.phone} customerName={customer.name} size="sm" />
                    <Link
                      href={`/admin/clients/${customer.id}`}
                      aria-label={`Ouvrir la fiche de ${customer.name}`}
                      className="grid size-10 place-items-center rounded-full text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre"
                    >
                      <ChevronRight className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile et tablette ──────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {customers.map((customer) => (
          <li key={customer.id} className="flex flex-col gap-3.5 rounded-3xl border border-filet bg-lin p-4">
            <Link href={`/admin/clients/${customer.id}`} className="flex items-start gap-3">
              <CustomerAvatar name={customer.name} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2 text-[0.9375rem] font-medium text-encre">
                  <span className="truncate">{customer.name}</span>
                  {customer.hasNote && <NotebookPen className="size-3.5 shrink-0 text-or-profond" strokeWidth={1.8} aria-label="Note interne" />}
                  <PendingSpinner />
                </span>
                <span className="text-[0.8125rem] tabular-nums text-fumee">{formatSenegalPhone(customer.phone)}</span>
                <SegmentBadges isLoyal={customer.isLoyal} isNew={customer.isNew} isDormant={customer.isDormant} className="mt-1" />
              </span>
              <ChevronRight className="mt-3 size-[18px] shrink-0 text-fumee" strokeWidth={1.8} aria-hidden="true" />
            </Link>

            <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-sable/60 px-3.5 py-3">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-fumee">Commandes</dt>
                <dd className="text-[0.9375rem] font-medium tabular-nums text-encre">{customer.ordersCount}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-fumee">Dépensé</dt>
                <dd className="whitespace-nowrap text-[0.9375rem] font-medium tabular-nums text-encre">{formatFCFA(customer.spent)}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-fumee">Dernière</dt>
                <dd suppressHydrationWarning className="truncate text-[0.8125rem] text-encre">
                  {customer.lastOrderAt ? formatRelative(customer.lastOrderAt).replace(/ à \d{2}:\d{2}$/, '') : '—'}
                </dd>
              </div>
            </dl>

            <div className="flex items-center gap-2">
              <OpenOrders count={customer.openCount} />
              <div className="ml-auto flex gap-2">
                <ContactButtons phone={customer.phone} customerName={customer.name} size="sm" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
