'use client';

import { VariantUnit } from '@prisma/client';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { defaultVariantLabel, PRODUCT_LIMITS } from '../schemas';
import { describe, FieldMessage, inputClass, inputState } from './form-ui';

export type VariantDraft = {
  key: string;
  /** Contenance déjà enregistrée (modification). */
  id?: string;
  /** Stock actuel d'une contenance enregistrée : lecture seule ici (mouvements tracés depuis la liste). */
  currentStock?: number;
  /** Ventes ou mouvements de stock : elle se désactive, elle ne se supprime pas. */
  hasHistory?: boolean;
  isActive: boolean;
  size: string;
  unit: VariantUnit;
  label: string;
  /** Tant que le libellé n'a pas été retouché, il suit la contenance (« 50 ml »). */
  labelEdited: boolean;
  /** Chiffres uniquement, affichés avec séparateur de milliers. */
  price: string;
  initialStock: string;
  lowStockThreshold: string;
  sku: string;
};

export function newVariant(unit: VariantUnit, size = ''): VariantDraft {
  return {
    key: crypto.randomUUID(),
    size,
    unit,
    label: size ? defaultVariantLabel(size, unit) : '',
    labelEdited: false,
    isActive: true,
    price: '',
    initialStock: '',
    lowStockThreshold: '3',
    sku: '',
  };
}

const UNIT_OPTIONS: Array<{ value: VariantUnit; label: string }> = [
  { value: VariantUnit.ML, label: 'ml' },
  { value: VariantUnit.G, label: 'g' },
  { value: VariantUnit.UNITE, label: 'pièce' },
];

/** Contenances les plus courantes, proposées en un clic. */
const PRESETS: Record<VariantUnit, number[]> = {
  ML: [3, 6, 12, 30, 50, 100],
  G: [25, 50, 100, 250, 500],
  UNITE: [1],
};

const groupDigits = (digits: string) => (digits ? new Intl.NumberFormat('fr-FR').format(Number(digits)) : '');

type VariantsEditorProps = {
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
  errors: Record<string, string>;
  preferredUnit: VariantUnit;
};

export default function VariantsEditor({ variants, onChange, errors, preferredUnit }: VariantsEditorProps) {
  const update = (key: string, patch: Partial<VariantDraft>) =>
    onChange(
      variants.map((variant) => {
        if (variant.key !== key) return variant;
        const next = { ...variant, ...patch };
        if (!next.labelEdited && ('size' in patch || 'unit' in patch)) next.label = defaultVariantLabel(next.size, next.unit);
        return next;
      }),
    );

  const existing = new Set(variants.map((v) => `${Number(v.size.replace(',', '.'))}-${v.unit}`));
  const presets = PRESETS[preferredUnit].filter((size) => !existing.has(`${size}-${preferredUnit}`));
  const full = variants.length >= PRODUCT_LIMITS.maxVariants;

  const addVariant = (size?: number) => {
    if (full) return;
    // Une ligne vide existante est complétée plutôt que d'en ajouter une nouvelle.
    const empty = variants.find((v) => !v.size && !v.price);
    if (size && empty) {
      update(empty.key, { size: String(size), unit: preferredUnit });
      return;
    }
    onChange([...variants, newVariant(preferredUnit, size ? String(size) : '')]);
  };

  return (
    <div className="flex flex-col gap-3">
      {errors.variants && (
        <p id="variants-error" className="text-sm text-erreur">
          {errors.variants}
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {variants.map((variant, index) => {
          const id = (field: string) => `variant-${variant.key}-${field}`;
          const error = (field: string) => errors[`variants.${index}.${field}`];
          return (
            <li
              key={variant.key}
              className={cn('rounded-3xl border p-4 transition-opacity duration-150', variant.isActive ? 'border-filet bg-white/50' : 'border-dashed border-filet-fort bg-sable/50')}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-or-profond">
                  Contenance {index + 1}
                  {variant.label && <span className="normal-case tracking-normal text-fumee">· {variant.label}</span>}
                  {!variant.isActive && (
                    <span className="rounded-full bg-filet px-2 py-0.5 normal-case tracking-normal text-fumee">Retirée de la vente</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  {variant.id && (
                    <button
                      type="button"
                      onClick={() => update(variant.key, { isActive: !variant.isActive })}
                      className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[0.8125rem] text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre"
                    >
                      {variant.isActive ? (
                        <EyeOff className="size-4" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" strokeWidth={1.8} aria-hidden="true" />
                      )}
                      {variant.isActive ? 'Retirer de la vente' : 'Remettre en vente'}
                    </button>
                  )}
                  {variants.length > 1 && !variant.hasHistory && (
                    <button
                      type="button"
                      onClick={() => onChange(variants.filter((v) => v.key !== variant.key))}
                      aria-label={`Supprimer la contenance ${index + 1}`}
                      className="grid size-9 place-items-center rounded-xl text-fumee transition-colors duration-150 hover:bg-erreur-fond hover:text-erreur"
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)]">
                {/* Contenance : valeur + unité */}
                <div className="col-span-2 flex flex-col gap-1.5 md:col-span-1">
                  <label htmlFor={id('size')} className="text-[0.8125rem] font-medium text-encre">
                    Contenance
                  </label>
                  <div className="flex">
                    <input
                      id={id('size')}
                      inputMode="decimal"
                      value={variant.size}
                      onChange={(e) => update(variant.key, { size: e.target.value.replace(/[^\d.,]/g, '') })}
                      placeholder="50"
                      {...describe(id('size'), error('size'))}
                      className={cn(inputClass, inputState(error('size')), 'h-12 rounded-r-none border-r-0 tabular-nums')}
                    />
                    <label htmlFor={id('unit')} className="sr-only">
                      Unité
                    </label>
                    <select
                      id={id('unit')}
                      value={variant.unit}
                      onChange={(e) => update(variant.key, { unit: e.target.value as VariantUnit })}
                      className={cn(inputClass, inputState(error('size')), 'h-12 w-[5.5rem] shrink-0 rounded-l-none bg-sable/60 px-3')}
                    >
                      {UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FieldMessage id={id('size')} error={error('size')} />
                </div>

                {/* Prix */}
                <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                  <label htmlFor={id('price')} className="text-[0.8125rem] font-medium text-encre">
                    Prix
                  </label>
                  <div className="relative">
                    <input
                      id={id('price')}
                      inputMode="numeric"
                      value={groupDigits(variant.price)}
                      onChange={(e) => update(variant.key, { price: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                      placeholder="25 000"
                      {...describe(id('price'), error('price'))}
                      className={cn(inputClass, inputState(error('price')), 'h-12 pr-16 font-medium tabular-nums')}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.8125rem] text-fumee">
                      FCFA
                    </span>
                  </div>
                  <FieldMessage id={id('price')} error={error('price')} />
                </div>

                {/* Stock : initial (nouvelle contenance) ou actuel en lecture seule */}
                {variant.id ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[0.8125rem] font-medium text-encre">Stock actuel</span>
                    <span
                      className="flex h-12 items-center rounded-2xl bg-sable/70 px-4 text-[0.9375rem] font-medium tabular-nums text-encre"
                      title="Ajustez le stock depuis la liste des produits (réassort ou correction, tracés)."
                    >
                      {variant.currentStock ?? 0}
                    </span>
                    <span className="text-xs leading-snug text-fumee">Ajustable depuis la liste</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={id('stock')} className="text-[0.8125rem] font-medium text-encre">
                      Stock initial
                    </label>
                    <input
                      id={id('stock')}
                      inputMode="numeric"
                      value={variant.initialStock}
                      onChange={(e) => update(variant.key, { initialStock: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="0"
                      {...describe(id('stock'), error('initialStock'))}
                      className={cn(inputClass, inputState(error('initialStock')), 'h-12 tabular-nums')}
                    />
                    <FieldMessage id={id('stock')} error={error('initialStock')} />
                  </div>
                )}

                {/* Seuil d'alerte */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={id('threshold')} className="text-[0.8125rem] font-medium text-encre">
                    Alerte à
                  </label>
                  <input
                    id={id('threshold')}
                    inputMode="numeric"
                    value={variant.lowStockThreshold}
                    onChange={(e) => update(variant.key, { lowStockThreshold: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    {...describe(id('threshold'), error('lowStockThreshold'), 'Alerte stock bas à partir de ce nombre.')}
                    className={cn(inputClass, inputState(error('lowStockThreshold')), 'h-12 tabular-nums')}
                  />
                  <FieldMessage id={id('threshold')} error={error('lowStockThreshold')} />
                </div>
              </div>

              {/* Détails : libellé affiché + référence */}
              <details className="group mt-3" open={Boolean(error('label') || error('sku'))}>
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg text-[0.8125rem] font-medium text-or-profond [&::-webkit-details-marker]:hidden">
                  <Plus className="size-3.5 transition-transform duration-150 group-open:rotate-45" strokeWidth={2} aria-hidden="true" />
                  Libellé affiché et référence
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={id('label')} className="text-[0.8125rem] font-medium text-encre">
                      Libellé affiché au client
                    </label>
                    <input
                      id={id('label')}
                      value={variant.label}
                      maxLength={PRODUCT_LIMITS.variantLabel}
                      onChange={(e) => update(variant.key, { label: e.target.value, labelEdited: e.target.value !== '' })}
                      placeholder="Ex. 50 ml, Pot 100 g, Coffret"
                      {...describe(id('label'), error('label'))}
                      className={cn(inputClass, inputState(error('label')), 'h-11')}
                    />
                    <FieldMessage id={id('label')} error={error('label')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={id('sku')} className="text-[0.8125rem] font-medium text-encre">
                      Référence interne (SKU) <span className="font-normal text-fumee">(facultatif)</span>
                    </label>
                    <input
                      id={id('sku')}
                      value={variant.sku}
                      maxLength={PRODUCT_LIMITS.sku}
                      onChange={(e) => update(variant.key, { sku: e.target.value.toUpperCase() })}
                      placeholder="Ex. OUD-ROYAL-50"
                      {...describe(id('sku'), error('sku'))}
                      className={cn(inputClass, inputState(error('sku')), 'h-11 uppercase tabular-nums')}
                    />
                    <FieldMessage id={id('sku')} error={error('sku')} />
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>

      {!full && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => addVariant()}
            className="flex h-11 items-center gap-2 rounded-full bg-sable px-4 text-sm font-medium text-oud transition-colors duration-150 hover:bg-paille"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            Ajouter une contenance
          </button>
          {presets.length > 0 && <span className="px-1 text-[0.8125rem] text-fumee">ou en un clic :</span>}
          {presets.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => addVariant(size)}
              className="flex h-9 items-center rounded-full border border-filet px-3 text-[0.8125rem] text-encre transition-colors duration-150 hover:border-or hover:bg-white"
            >
              + {defaultVariantLabel(size, preferredUnit)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
