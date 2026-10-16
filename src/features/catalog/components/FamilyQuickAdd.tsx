'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, LoaderCircle, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createFamilyQuickAction } from '@/features/settings/actions';

/**
 * « + Nouvelle famille » dans le formulaire produit : la famille est créée
 * (ou retrouvée si elle existe déjà) et cochée aussitôt, sans quitter la fiche.
 * La phrase pour le client est facultative ici ; Paramètres signale les
 * familles qui n'en ont pas encore.
 */
export default function FamilyQuickAdd({ onAdded }: { onAdded: (family: { id: string; name: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setName('');
    setHint('');
    setError(null);
  };

  function submit() {
    if (name.trim().length < 2 || isPending) return;
    startTransition(async () => {
      const result = await createFamilyQuickAction({ name, hint });
      if (!result.ok) return setError(result.error);
      onAdded(result.family);
      close();
    });
  }

  // Champs à part (pas de <form> imbriqué dans le formulaire produit) : Entrée valide, Échap annule.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-1.5 rounded-full border border-dashed border-filet-fort px-4 text-sm font-medium text-oud transition-colors duration-150 hover:border-oud hover:bg-white/60"
      >
        <Plus className="size-3.5" strokeWidth={2.2} aria-hidden="true" /> Nouvelle famille
      </button>
    );
  }

  return (
    <div role="group" aria-label="Nouvelle famille olfactive" className="flex w-full flex-col gap-2 rounded-2xl border border-filet-fort bg-white/70 p-3 sm:flex-row sm:items-center">
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onKeyDown={onKeyDown}
        maxLength={40}
        placeholder="Nom (ex. Gourmand)"
        aria-label="Nom de la nouvelle famille"
        aria-invalid={error ? true : undefined}
        className={cn('h-11 min-w-0 rounded-xl border bg-lin px-3 text-[0.9375rem] text-encre outline-none focus:border-oud sm:w-48', error ? 'border-erreur' : 'border-filet')}
      />
      <input
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={80}
        placeholder="Phrase pour le client (facultatif)"
        aria-label="Phrase pour le client (facultatif)"
        className="h-11 min-w-0 flex-1 rounded-xl border border-filet bg-lin px-3 text-[0.9375rem] text-encre outline-none focus:border-oud"
      />
      <span className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={name.trim().length < 2 || isPending}
          aria-label="Ajouter la famille"
          className="grid size-11 place-items-center rounded-full bg-oud text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:opacity-40"
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" strokeWidth={2.2} aria-hidden="true" />}
        </button>
        <button type="button" onClick={close} aria-label="Annuler" className="grid size-11 place-items-center rounded-full text-fumee hover:bg-sable hover:text-encre">
          <X className="size-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </span>
      {error && <p className="text-sm text-erreur sm:basis-full">{error}</p>}
    </div>
  );
}
