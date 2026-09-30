'use client';

import { cn } from '@/lib/utils';

/** Primitives visuelles du formulaire produit (admin). */

export const inputClass =
  'w-full rounded-2xl border bg-white/70 px-4 text-[0.9375rem] text-encre outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fumee/55 hover:border-filet-fort focus:border-or focus:bg-white focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)] disabled:opacity-60';

export function inputState(error?: string) {
  return error ? 'border-erreur' : 'border-filet';
}

export function Section({
  id,
  title,
  description,
  children,
  aside,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5 rounded-[28px] border border-filet bg-lin p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 id={`${id}-title`} className="text-title-sm text-encre">
            {title}
          </h2>
          {description && <p className="text-sm leading-relaxed text-fumee">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  optional,
  hint,
  error,
  counter,
  children,
  className,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  counter?: { value: number; max: number };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-encre">
          {label}
          {optional && <span className="ml-1.5 font-normal text-fumee">(facultatif)</span>}
        </label>
        {counter && (
          <span
            className={cn('text-xs tabular-nums', counter.value > counter.max ? 'text-erreur' : 'text-fumee/80')}
            aria-live={counter.value > counter.max ? 'polite' : undefined}
          >
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children}
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="text-sm text-erreur">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-[0.8125rem] leading-relaxed text-fumee">
        {hint}
      </p>
    );
  }
  return null;
}

/** aria-* d'un champ : invalide + description (erreur, sinon aide). */
export function describe(id: string, error?: string, hint?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

/** Pastille sélectionnable (choix unique ou multiple). */
export function ChoiceChip({
  selected,
  onClick,
  children,
  role = 'checkbox',
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: 'checkbox' | 'radio';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-150',
        selected
          ? 'bg-oud font-medium text-sur-oud'
          : 'border border-filet bg-white/60 text-encre hover:border-filet-fort hover:bg-white',
      )}
    >
      {children}
    </button>
  );
}
