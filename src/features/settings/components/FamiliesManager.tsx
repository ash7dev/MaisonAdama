'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Flower2, LoaderCircle, PencilLine, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { describe, Field, inputClass, inputState } from '@/features/catalog/components/form-ui';
import { deleteFamilyAction, reorderFamiliesAction, saveFamilyAction, type SettingsResult } from '../actions';
import type { FieldErrors } from '../schemas';
import type { AdminFamily } from '../queries';
import { SettingsSection } from './settings-ui';

// -----------------------------------------------------------------------------
//  Éditeur (ajout ou modification)
// -----------------------------------------------------------------------------

function FamilyEditor({ family, onDone }: { family?: AdminFamily; onDone: (result?: SettingsResult) => void }) {
  const [name, setName] = useState(family?.name ?? '');
  const [hint, setHint] = useState(family?.hint ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const prefix = family ? `family-${family.id}` : 'family-new';

  useEffect(() => nameRef.current?.focus(), []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveFamilyAction(family?.id ?? null, { name, hint });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) onDone(result);
        return;
      }
      onDone(result);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-filet-fort bg-white/60 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <Field id={`${prefix}-name`} label="Nom de la famille" error={errors.name}>
          <input
            ref={nameRef}
            id={`${prefix}-name`}
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              setErrors(({ name: _, ...rest }) => rest);
            }}
            placeholder="Gourmand"
            autoComplete="off"
            {...describe(`${prefix}-name`, errors.name)}
            className={cn(inputClass, inputState(errors.name), 'h-12')}
          />
        </Field>
        <Field id={`${prefix}-hint`} label="Phrase pour le client" hint="Quelques notes, en mots simples." error={errors.hint} optional>
          <input
            id={`${prefix}-hint`}
            value={hint}
            maxLength={80}
            onChange={(e) => {
              setHint(e.target.value);
              setErrors(({ hint: _, ...rest }) => rest);
            }}
            placeholder="Vanille, caramel, praline"
            autoComplete="off"
            {...describe(`${prefix}-hint`, errors.hint, 'hint')}
            className={cn(inputClass, inputState(errors.hint), 'h-12')}
          />
        </Field>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => onDone()} className="h-11 rounded-full px-5 text-sm font-semibold text-fumee hover:bg-sable hover:text-encre">
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending || name.trim().length < 2}
          className="flex h-11 items-center gap-2 rounded-full bg-oud px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:opacity-50"
        >
          {isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          {family ? 'Enregistrer' : 'Ajouter la famille'}
        </button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
//  Liste
// -----------------------------------------------------------------------------

/**
 * Familles olfactives : ajoutées ici, elles sont aussitôt proposées dans le
 * formulaire produit, puis visibles sur la boutique (filtres, roue « Trouver
 * mon parfum », fiches) dès qu'une création les porte.
 */
export default function FamiliesManager({ families: initial }: { families: AdminFamily[] }) {
  const notify = useToast();
  const router = useRouter();
  const [families, setFamilies] = useState(initial);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setFamilies(initial), [initial]);

  function finish(result?: SettingsResult) {
    setEditing(null);
    if (!result) return;
    notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
    if (result.ok) router.refresh();
  }

  function run(action: () => Promise<SettingsResult>, optimistic?: () => void) {
    const before = families;
    optimistic?.();
    startTransition(async () => {
      const result = await action();
      notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
      if (!result.ok) setFamilies(before);
      else router.refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...families];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() => reorderFamiliesAction(next.map((f) => f.id)), () => setFamilies(next));
  }

  return (
    <SettingsSection
      id="familles"
      icon={<Flower2 strokeWidth={1.6} aria-hidden="true" />}
      title="Familles olfactives"
      description="Proposées dans chaque fiche produit, puis sur la boutique : filtres, roue « Trouver mon parfum » et fiches. L’ordre ci-dessous est celui de la roue."
      aside={
        <span className="hidden h-7 shrink-0 items-center rounded-full bg-sable px-3 text-xs font-medium text-fumee sm:inline-flex">
          {families.length} famille{families.length > 1 ? 's' : ''}
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {editing === 'new' ? (
          <FamilyEditor onDone={finish} />
        ) : (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex h-12 items-center justify-center gap-2 self-start rounded-full border border-dashed border-filet-fort px-5 text-sm font-semibold text-oud transition-colors duration-150 hover:border-oud hover:bg-white/60"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" /> Ajouter une famille
          </button>
        )}

        <ol className="flex flex-col divide-y divide-filet rounded-2xl border border-filet bg-white/50">
          {families.map((family, index) =>
            editing === family.id ? (
              <li key={family.id} className="p-2">
                <FamilyEditor family={family} onDone={finish} />
              </li>
            ) : (
              <li key={family.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <span className="w-6 shrink-0 text-center font-display text-sm text-or-profond tabular-nums">{index + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[1.0625rem] text-encre">{family.name}</span>
                  <span className={cn('truncate text-xs', family.hint ? 'text-fumee' : 'italic text-alerte')}>
                    {family.hint ?? 'Sans phrase pour le client'}
                  </span>
                </span>
                <span
                  className={cn(
                    'hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline',
                    family.products ? 'bg-paille text-oud' : 'bg-sable text-fumee',
                  )}
                >
                  {family.products ? `${family.products} création${family.products > 1 ? 's' : ''}` : 'Aucune création'}
                </span>

                {confirming === family.id ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="hidden text-xs text-encre sm:inline">Supprimer ?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(null);
                        run(() => deleteFamilyAction(family.id), () => setFamilies((list) => list.filter((f) => f.id !== family.id)));
                      }}
                      className="h-9 rounded-full bg-erreur px-3.5 text-xs font-semibold text-white"
                    >
                      Oui
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="h-9 rounded-full px-3 text-xs font-semibold text-fumee hover:bg-sable">
                      Non
                    </button>
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center">
                    <IconButton label={`Monter ${family.name}`} disabled={index === 0 || isPending} onClick={() => move(index, -1)}>
                      <ArrowUp className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Descendre ${family.name}`} disabled={index === families.length - 1 || isPending} onClick={() => move(index, 1)}>
                      <ArrowDown className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Modifier ${family.name}`} onClick={() => setEditing(family.id)}>
                      <PencilLine className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={
                        family.products
                          ? `${family.name} est utilisée par ${family.products} création${family.products > 1 ? 's' : ''} : suppression impossible`
                          : `Supprimer ${family.name}`
                      }
                      disabled={family.products > 0 || isPending}
                      onClick={() => setConfirming(family.id)}
                      danger
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </IconButton>
                  </span>
                )}
              </li>
            ),
          )}
          {families.length === 0 && <li className="px-4 py-8 text-center text-sm text-fumee">Aucune famille pour l’instant : ajoutez la première.</li>}
        </ol>
        <p className="text-xs leading-relaxed text-fumee">
          Une famille utilisée par des créations ne peut pas être supprimée : retirez-la d’abord des fiches produit concernées.
        </p>
      </div>
    </SettingsSection>
  );
}

function IconButton({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-10 place-items-center rounded-full text-fumee transition-colors duration-150 disabled:opacity-30',
        danger ? 'hover:bg-erreur-fond hover:text-erreur' : 'hover:bg-sable hover:text-encre',
      )}
    >
      {children}
    </button>
  );
}
