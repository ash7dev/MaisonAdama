'use client';

import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Carte d'une section de réglages : pastille, titre, description, contenu, pied. */
export function SettingsSection({
  id,
  icon,
  title,
  description,
  aside,
  footer,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 overflow-hidden rounded-[28px] border border-filet bg-lin">
      <div className="flex flex-col gap-6 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-oud text-sur-oud [&_svg]:size-5">{icon}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={`${id}-title`} className="text-title-sm text-encre">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-fumee">{description}</p>
          </div>
          {aside}
        </div>
        {children}
      </div>
      {footer}
    </section>
  );
}

/**
 * Pied de section : discret quand tout est enregistré, barre d'action dès
 * qu'une modification est en attente.
 */
export function SaveBar({
  dirty,
  pending,
  onCancel,
  savedHint,
  label = 'Enregistrer',
}: {
  dirty: boolean;
  pending: boolean;
  onCancel: () => void;
  savedHint?: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-t px-5 py-3 transition-colors duration-200 sm:px-7',
        dirty ? 'border-or/40 bg-paille/40' : 'border-filet bg-sable/40',
      )}
    >
      <p aria-live="polite" className={cn('text-[0.8125rem]', dirty ? 'font-medium text-encre' : 'text-fumee')}>
        {dirty ? 'Modifications non enregistrées' : savedHint}
      </p>
      {dirty && (
        <div className="flex gap-2 motion-safe:animate-reveal">
          <button type="button" onClick={onCancel} disabled={pending} className="h-11 rounded-full px-4 text-sm text-fumee transition-colors duration-150 hover:text-encre">
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-80"
          >
            {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
            {pending ? 'Enregistrement…' : label}
          </button>
        </div>
      )}
    </div>
  );
}

/** Interrupteur accessible (role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60',
        size === 'md' ? 'h-7 w-12' : 'h-6 w-10',
        checked ? 'bg-succes' : 'bg-filet-fort',
      )}
    >
      <span
        className={cn(
          'absolute top-1 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft',
          size === 'md' ? 'size-5' : 'size-4',
          checked ? (size === 'md' ? 'translate-x-6' : 'translate-x-5') : 'translate-x-1',
        )}
      />
    </button>
  );
}

const savedFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });

export function savedHint(updatedAt: string | null) {
  return updatedAt ? <span suppressHydrationWarning>Enregistré le {savedFormat.format(new Date(updatedAt))}</span> : 'Jamais enregistré';
}
