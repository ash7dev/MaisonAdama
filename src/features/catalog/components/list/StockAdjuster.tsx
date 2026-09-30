'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adjustVariantStockAction } from '../../actions';

type Mode = 'restock' | 'correction';

const CORRECTION_REASONS = ['Casse', 'Inventaire', 'Échantillon offert', 'Autre'];

/**
 * Ajustement de stock d'une contenance :
 *  - Réassort : on ajoute ce qui arrive (note facultative) ;
 *  - Correction : on corrige un écart, en plus ou en moins, avec un motif obligatoire.
 * Chaque validation crée un mouvement tracé (qui, quand, pourquoi).
 */
export default function StockAdjuster({
  variantId,
  variantLabel,
  currentStock,
  onDone,
  onCancel,
}: {
  variantId: string;
  variantLabel: string;
  currentStock: number;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>('restock');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const delta = mode === 'restock' ? Math.abs(quantity) : quantity;
  const next = currentStock + delta;
  const correctionNote = [reason, note.trim()].filter(Boolean).join(' — ');
  const invalid =
    delta === 0 || next < 0 || (mode === 'correction' && !correctionNote) || !Number.isInteger(quantity);

  const switchMode = (value: Mode) => {
    setMode(value);
    setError(null);
    if (value === 'restock') setQuantity((q) => Math.max(1, Math.abs(q)));
  };

  const submit = () => {
    if (invalid) return;
    setError(null);
    startTransition(async () => {
      const result = await adjustVariantStockAction(
        variantId,
        mode === 'restock' ? { mode, quantity: delta, note } : { mode, delta, note: correctionNote },
      );
      if (result.ok) onDone(`${variantLabel} : stock ${currentStock} → ${result.data}`);
      else setError(result.error);
    });
  };

  const id = `adjust-${variantId}`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-filet bg-white/80 p-4 motion-safe:animate-reveal">
      <div role="radiogroup" aria-label="Type d’ajustement" className="flex w-fit gap-1 rounded-full bg-sable p-1">
        {(
          [
            ['restock', 'Réassort'],
            ['correction', 'Correction'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => switchMode(value)}
            className={cn(
              'h-9 rounded-full px-4 text-sm transition-colors duration-150',
              mode === value ? 'bg-oud font-medium text-sur-oud' : 'text-fumee hover:text-encre',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-qty`} className="text-[0.8125rem] font-medium text-encre">
            {mode === 'restock' ? 'Quantité reçue' : 'Écart (+ ou −)'}
          </label>
          <div className="flex items-center rounded-full border border-filet bg-lin p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => (mode === 'restock' ? Math.max(1, q - 1) : q - 1))}
              aria-label="Diminuer"
              className="grid size-10 place-items-center rounded-full text-oud transition-colors duration-150 hover:bg-sable"
            >
              <Minus className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <input
              id={`${id}-qty`}
              inputMode="numeric"
              value={mode === 'correction' && quantity > 0 ? `+${quantity}` : String(quantity)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d-]/g, '');
                const parsed = raw === '' || raw === '-' ? 0 : Number.parseInt(raw, 10);
                setQuantity(Number.isNaN(parsed) ? 0 : mode === 'restock' ? Math.abs(parsed) : parsed);
              }}
              className="h-10 w-16 bg-transparent text-center text-base font-medium tabular-nums text-encre outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Augmenter"
              className="grid size-10 place-items-center rounded-full text-oud transition-colors duration-150 hover:bg-sable"
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="flex h-12 items-center gap-2 text-sm text-fumee" aria-live="polite">
          Stock :
          <span className="tabular-nums">{currentStock}</span>→
          <span className={cn('text-base font-semibold tabular-nums', next < 0 ? 'text-erreur' : 'text-encre')}>{next}</span>
        </p>
      </div>

      {mode === 'correction' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[0.8125rem] font-medium text-encre">Motif</legend>
          <div className="flex flex-wrap gap-2">
            {CORRECTION_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(reason === r ? '' : r)}
                className={cn(
                  'h-9 rounded-full px-3.5 text-[0.8125rem] transition-colors duration-150',
                  reason === r ? 'bg-oud text-sur-oud' : 'border border-filet text-encre hover:border-filet-fort',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-note`} className="text-[0.8125rem] font-medium text-encre">
          {mode === 'restock' ? 'Note' : 'Précision'} <span className="font-normal text-fumee">(facultatif)</span>
        </label>
        <input
          id={`${id}-note`}
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'restock' ? 'Ex. Arrivage fournisseur' : 'Ex. Flacon tombé en boutique'}
          className="h-11 rounded-xl border border-filet bg-lin px-3.5 text-sm text-encre outline-none placeholder:text-fumee/60 focus:border-or"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-erreur">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={invalid || isPending}
          className="flex h-11 items-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          Valider
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-full px-4 text-sm text-fumee transition-colors duration-150 hover:text-encre"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
