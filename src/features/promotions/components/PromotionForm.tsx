'use client';

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PromotionType } from '@prisma/client';
import { AlertCircle, ArrowLeft, Banknote, Info, LoaderCircle, Percent, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { computeBestPrice } from '@/features/pricing/compute-price';
import { useToast } from '@/components/ui/toast';
import { PendingIcon } from '@/components/ui/link-pending';
import { describe, Field, inputClass, inputState, Section } from '@/features/catalog/components/form-ui';
import { savePromotionAction, type PromotionFormState } from '../actions';
import {
  formatDiscount,
  fromDakarInput,
  PROMOTION_LIMITS,
  PROMOTION_STATE_UI,
  promotionInputSchema,
  promotionState,
  toDakarInput,
  toPromotionErrors,
  type PromotionFieldErrors,
  type PromotionInput,
} from '../schemas';
import type { PromotionForEdit, PromotionPickerData } from '../queries';
import ProductPicker from './ProductPicker';

const PERCENT_PRESETS = [10, 15, 20, 25, 30, 50];
const AMOUNT_PRESETS = [1000, 2000, 2500, 5000];

const DAY = 86_400_000;
const shortDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });

/** Maintenant, à la minute (heure de Dakar = UTC). */
function nowInput(): string {
  return toDakarInput(new Date());
}
/** Fin de journée, n jours après la date donnée. */
function endOfDayAfter(start: string, days: number): string {
  const date = new Date(fromDakarInput(start).getTime() + days * DAY);
  return `${date.toISOString().slice(0, 10)}T23:59`;
}
function endOfMonth(start: string): string {
  const d = fromDakarInput(start);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return `${last.toISOString().slice(0, 10)}T23:59`;
}

type PreviewLine = {
  key: string;
  productName: string;
  label: string;
  price: number;
  finalPrice: number;
  discount: number;
  conflict: { kind: 'beaten' | 'replaces'; name: string; discount: number } | null;
};

export default function PromotionForm({ picker, promotion }: { picker: PromotionPickerData; promotion?: PromotionForEdit }) {
  const isEdit = Boolean(promotion);
  const router = useRouter();
  const notify = useToast();
  const [state, formAction, isPending] = useActionState<PromotionFormState, FormData>(savePromotionAction, { status: 'idle' });
  const formRef = useRef<HTMLFormElement>(null);

  const [initialStart] = useState(() => (promotion ? toDakarInput(promotion.startsAt) : nowInput()));
  const [name, setName] = useState(promotion?.name ?? '');
  const [type, setType] = useState<PromotionType>(promotion?.type ?? PromotionType.POURCENTAGE);
  const [value, setValue] = useState(promotion ? String(promotion.value) : '');
  const [startsAt, setStartsAt] = useState(initialStart);
  const [endsAt, setEndsAt] = useState(promotion ? toDakarInput(promotion.endsAt) : endOfDayAfter(initialStart, 7));
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true);
  const [productIds, setProductIds] = useState(() => new Set(promotion?.productIds ?? []));
  const [variantIds, setVariantIds] = useState(() => new Set(promotion?.variantIds ?? []));
  const [errors, setErrors] = useState<PromotionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showAllPreview, setShowAllPreview] = useState(false);

  const touch = (...fields: string[]) => {
    setDirty(true);
    if (fields.some((f) => errors[f])) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !fields.includes(k))));
  };

  // ── Après enregistrement : retour à la liste ────────────────────────────
  useEffect(() => {
    if (state.status === 'success') {
      notify(state.mode === 'create' ? `« ${state.name} » créée.` : 'Modifications enregistrées.');
      router.push('/admin/promotions');
    } else if (state.status === 'error') {
      setErrors(state.fieldErrors);
      setFormError(state.formError ?? null);
      setAttempt((n) => n + 1);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!attempt) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.targets) {
      document.getElementById('targets-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty || state.status === 'success') return;
    const guard = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, state.status]);

  // ── Aperçu des prix et conflits ─────────────────────────────────────────
  const numericValue = Number(value) || 0;
  const periodValid = /T\d{2}:\d{2}$/.test(startsAt) && /T\d{2}:\d{2}$/.test(endsAt) && fromDakarInput(endsAt) > fromDakarInput(startsAt);

  const preview: PreviewLine[] = useMemo(() => {
    const self = { id: 'self', name: name || 'Cette promotion', type, value: numericValue };
    const start = periodValid ? fromDakarInput(startsAt) : null;
    const end = periodValid ? fromDakarInput(endsAt) : null;
    const lines: PreviewLine[] = [];
    for (const product of picker.products) {
      for (const variant of product.variants) {
        if (!productIds.has(product.id) && !variantIds.has(variant.id)) continue;
        const own = computeBestPrice(variant.price, numericValue > 0 ? [self] : []);
        // Autres promotions actives qui chevauchent la période et visent cet article.
        const rivals = picker.others.filter(
          (o) =>
            (!start || !end || (new Date(o.startsAt) < end && new Date(o.endsAt) > start)) &&
            o.targets.some((t) => t.variantId === variant.id || t.productId === product.id),
        );
        const bestRival = rivals
          .map((o) => ({ name: o.name, discount: computeBestPrice(variant.price, [o]).discountAmount }))
          .sort((a, b) => b.discount - a.discount)[0];
        lines.push({
          key: variant.id,
          productName: product.name,
          label: variant.label,
          price: variant.price,
          finalPrice: own.finalPrice,
          discount: own.discountAmount,
          conflict:
            bestRival && bestRival.discount > 0
              ? { kind: bestRival.discount > own.discountAmount ? 'beaten' : 'replaces', name: bestRival.name, discount: bestRival.discount }
              : null,
        });
      }
    }
    return lines;
  }, [picker, productIds, variantIds, type, numericValue, name, startsAt, endsAt, periodValid]);

  const beaten = preview.filter((l) => l.conflict?.kind === 'beaten').length;
  const free = preview.some((l) => type === PromotionType.MONTANT_FIXE && numericValue >= l.price);
  const futureState = periodValid ? promotionState({ isActive, startsAt: fromDakarInput(startsAt), endsAt: fromDakarInput(endsAt) }) : null;
  const durationDays = periodValid ? Math.max(1, Math.round((fromDakarInput(endsAt).getTime() - fromDakarInput(startsAt).getTime()) / DAY)) : 0;

  // ── Envoi ───────────────────────────────────────────────────────────────
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: PromotionInput = {
      name,
      type,
      value,
      startsAt,
      endsAt,
      isActive,
      productIds: [...productIds],
      variantIds: [...variantIds],
    };
    const parsed = promotionInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(toPromotionErrors(parsed.error));
      setFormError('Certains champs sont à corriger.');
      setAttempt((n) => n + 1);
      return;
    }
    setErrors({});
    setFormError(null);
    const formData = new FormData();
    formData.set('payload', JSON.stringify(payload));
    formData.set('meta', JSON.stringify(promotion ? { id: promotion.id, expectedUpdatedAt: promotion.updatedAt } : null));
    startTransition(() => formAction(formData));
  }

  const busy = isPending || state.status === 'success';
  const saveButton = (className?: string) => (
    <button
      type="submit"
      disabled={busy}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-full bg-oud px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-80',
        className,
      )}
    >
      {busy && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
      {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer la promotion'}
    </button>
  );

  const shownPreview = showAllPreview ? preview : preview.slice(0, 6);

  return (
    <div className="mx-auto max-w-shop px-4 pb-36 pt-6 lg:px-2 lg:pb-10 lg:pt-3">
      <header className="flex flex-col gap-3 px-1 pb-6 lg:min-h-[72px] lg:justify-center lg:pb-5">
        <Link href="/admin/promotions" className="flex h-9 w-fit items-center gap-1.5 rounded-full pr-2 text-sm text-fumee transition-colors duration-150 hover:text-encre">
          <PendingIcon className="size-4">
            <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </PendingIcon>
          Promotions
        </Link>
        <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">{isEdit ? promotion!.name : 'Nouvelle promotion'}</h1>
      </header>

      {promotion?.usedInOrders && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-sable px-4 py-3.5 text-sm text-encre ring-1 ring-inset ring-filet">
          <Info className="mt-px size-[18px] shrink-0 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
          Déjà utilisée dans des commandes : celles-ci gardent leur remise. Vos changements ne valent que pour les prochaines commandes.
        </div>
      )}
      {formError && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl bg-erreur-fond px-4 py-3.5 text-sm text-erreur motion-safe:animate-reveal">
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {formError}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          {/* ── Remise ─────────────────────────────────────────────── */}
          <Section id="discount" title="Remise" description="Le prix barré et le nouveau prix s’affichent automatiquement dans la boutique.">
            <Field id="name" label="Nom de la promotion" error={errors.name} hint="Visible dans l’admin et sur les commandes. Ex. Tabaski 2026, Fin de série oud.">
              <input
                id="name"
                value={name}
                maxLength={PROMOTION_LIMITS.name}
                onChange={(e) => {
                  setName(e.target.value);
                  touch('name');
                }}
                placeholder="Ex. Sélection Tabaski"
                autoComplete="off"
                {...describe('name', errors.name, 'hint')}
                className={cn(inputClass, inputState(errors.name), 'h-14 text-base')}
              />
            </Field>

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-medium text-encre">Type de remise</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    [PromotionType.POURCENTAGE, 'Pourcentage', 'Ex. −20 % sur le prix', Percent],
                    [PromotionType.MONTANT_FIXE, 'Montant fixe', 'Ex. −2 000 FCFA par article', Banknote],
                  ] as const
                ).map(([t, label, hint, Icon]) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => {
                      setType(t);
                      setValue('');
                      touch('value');
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors duration-150',
                      type === t ? 'border-oud bg-oud text-sur-oud' : 'border-filet bg-white/60 text-encre hover:border-filet-fort',
                    )}
                  >
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', type === t ? 'bg-sur-oud text-oud' : 'bg-sable text-or-profond')}>
                      <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{label}</span>
                      <span className={cn('text-xs', type === t ? 'text-sur-oud/70' : 'text-fumee')}>{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Field id="value" label={type === PromotionType.POURCENTAGE ? 'Pourcentage' : 'Montant de la remise'} error={errors.value}>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="relative sm:w-48">
                  <input
                    id="value"
                    inputMode="numeric"
                    value={type === PromotionType.MONTANT_FIXE && value ? new Intl.NumberFormat('fr-FR').format(Number(value)) : value}
                    onChange={(e) => {
                      setValue(e.target.value.replace(/\D/g, '').slice(0, type === PromotionType.POURCENTAGE ? 2 : 8));
                      touch('value');
                    }}
                    placeholder={type === PromotionType.POURCENTAGE ? '20' : '2 000'}
                    {...describe('value', errors.value)}
                    className={cn(inputClass, inputState(errors.value), 'h-14 pr-16 text-lg font-semibold tabular-nums')}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-fumee">
                    {type === PromotionType.POURCENTAGE ? '%' : 'FCFA'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(type === PromotionType.POURCENTAGE ? PERCENT_PRESETS : AMOUNT_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={numericValue === preset}
                      onClick={() => {
                        setValue(String(preset));
                        touch('value');
                      }}
                      className={cn(
                        'h-10 rounded-full px-3.5 text-[0.8125rem] tabular-nums transition-colors duration-150',
                        numericValue === preset ? 'bg-oud text-sur-oud' : 'border border-filet text-encre hover:border-filet-fort',
                      )}
                    >
                      {formatDiscount(type, preset)}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            {free && !errors.value && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-erreur-fond px-3 py-2.5 text-[0.8125rem] text-erreur">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Ce montant rendrait certains articles gratuits : baissez la remise ou retirez-les.
              </p>
            )}
          </Section>

          {/* ── Période ────────────────────────────────────────────── */}
          <Section id="period" title="Période" description="Heure de Dakar. La promotion démarre et s’arrête toute seule.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="startsAt" label="Début" error={errors.startsAt}>
                <input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => {
                    setStartsAt(e.target.value);
                    touch('startsAt', 'endsAt');
                  }}
                  {...describe('startsAt', errors.startsAt)}
                  className={cn(inputClass, inputState(errors.startsAt), 'h-12 tabular-nums')}
                />
              </Field>
              <Field id="endsAt" label="Fin" error={errors.endsAt}>
                <input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  min={startsAt}
                  onChange={(e) => {
                    setEndsAt(e.target.value);
                    touch('endsAt');
                  }}
                  {...describe('endsAt', errors.endsAt)}
                  className={cn(inputClass, inputState(errors.endsAt), 'h-12 tabular-nums')}
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.8125rem] text-fumee">Raccourcis :</span>
              <button
                type="button"
                onClick={() => {
                  setStartsAt(nowInput());
                  touch('startsAt');
                }}
                className="h-9 rounded-full border border-filet px-3.5 text-[0.8125rem] text-encre hover:border-or"
              >
                Dès maintenant
              </button>
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setEndsAt(endOfDayAfter(startsAt, days));
                    touch('endsAt');
                  }}
                  className="h-9 rounded-full border border-filet px-3.5 text-[0.8125rem] text-encre hover:border-or"
                >
                  {days} jours
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEndsAt(endOfMonth(startsAt));
                  touch('endsAt');
                }}
                className="h-9 rounded-full border border-filet px-3.5 text-[0.8125rem] text-encre hover:border-or"
              >
                Fin du mois
              </button>
            </div>
            {periodValid && (
              <p className="rounded-2xl bg-sable/70 px-4 py-3 text-[0.8125rem] text-encre">
                Du <strong className="font-medium">{shortDate.format(fromDakarInput(startsAt))}</strong> au{' '}
                <strong className="font-medium">{shortDate.format(fromDakarInput(endsAt))}</strong> · {durationDays} jour{durationDays > 1 ? 's' : ''}
              </p>
            )}
          </Section>

          {/* ── Produits ───────────────────────────────────────────── */}
          <Section id="targets" title="Produits concernés" description="Des produits entiers, ou des contenances précises.">
            <ProductPicker
              products={picker.products}
              categories={picker.categories}
              productIds={productIds}
              variantIds={variantIds}
              error={errors.targets}
              onChange={(p, v) => {
                setProductIds(p);
                setVariantIds(v);
                touch('targets');
              }}
            />
          </Section>
        </div>

        {/* ── Panneau latéral ───────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <section aria-label="Résumé" className="flex flex-col gap-4 rounded-[28px] bg-oud p-5 text-sur-oud sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-[2rem] leading-none tabular-nums">{numericValue > 0 ? formatDiscount(type, numericValue) : '—'}</span>
              {futureState && (
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', PROMOTION_STATE_UI[futureState].chip)}>
                  {PROMOTION_STATE_UI[futureState].label}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-[0.9375rem] text-sur-oud/85">{name || 'Nom de la promotion'}</p>
            <p className="text-[0.8125rem] text-sur-oud/65">
              {preview.length} article{preview.length > 1 ? 's' : ''} concerné{preview.length > 1 ? 's' : ''}
              {periodValid && ` · ${durationDays} jour${durationDays > 1 ? 's' : ''}`}
            </p>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-sur-oud/8 px-4 py-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Active</span>
                <span className="text-xs text-sur-oud/60">{isActive ? 'S’appliquera pendant la période.' : 'Enregistrée, mais sans effet.'}</span>
              </span>
              <input type="checkbox" role="switch" checked={isActive} onChange={(e) => { setIsActive(e.target.checked); setDirty(true); }} className="peer sr-only" />
              <span aria-hidden="true" className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-or', isActive ? 'bg-succes' : 'bg-sur-oud/25')}>
                <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft', isActive ? 'translate-x-6' : 'translate-x-1')} />
              </span>
            </label>

            <div className="hidden lg:block">{saveButton('w-full bg-sur-oud text-oud hover:bg-paille')}</div>
          </section>

          {/* Aperçu des prix */}
          <section aria-labelledby="preview-title" className="flex flex-col gap-3 rounded-[28px] border border-filet bg-lin p-5">
            <h2 id="preview-title" className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-or-profond">
              Aperçu des prix
            </h2>
            {beaten > 0 && (
              <p className="flex items-start gap-2 rounded-xl bg-alerte-fond px-3 py-2.5 text-[0.8125rem] leading-snug text-alerte">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                {beaten} article{beaten > 1 ? 's ont' : ' a'} déjà une meilleure remise : celle-ci ne s’y appliquera pas.
              </p>
            )}
            {preview.length === 0 ? (
              <p className="py-4 text-center text-[0.8125rem] text-fumee">Choisissez des produits pour voir les nouveaux prix.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-filet/70">
                {shownPreview.map((line) => (
                  <li key={line.key} className="flex flex-col gap-1 py-2.5 first:pt-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[0.8125rem] text-encre">
                        {line.productName} <span className="text-fumee">· {line.label}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                        {line.discount > 0 && <span className="text-xs text-fumee line-through">{formatFCFA(line.price)}</span>}
                        <span className={cn('text-[0.8125rem] font-semibold', line.finalPrice === 0 ? 'text-erreur' : 'text-encre')}>
                          {line.finalPrice === 0 ? 'Gratuit' : formatFCFA(line.finalPrice)}
                        </span>
                      </span>
                    </div>
                    {line.conflict && (
                      <span className={cn('text-xs leading-snug', line.conflict.kind === 'beaten' ? 'text-alerte' : 'text-fumee')}>
                        {line.conflict.kind === 'beaten'
                          ? `« ${line.conflict.name} » fait mieux (−${formatFCFA(line.conflict.discount)}) : elle s’appliquera à la place.`
                          : `Remplace « ${line.conflict.name} » (−${formatFCFA(line.conflict.discount)}), moins avantageuse.`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {preview.length > 6 && (
              <button type="button" onClick={() => setShowAllPreview((v) => !v)} className="h-9 text-[0.8125rem] font-medium text-or-profond hover:underline">
                {showAllPreview ? 'Réduire' : `Voir les ${preview.length} articles`}
              </button>
            )}
          </section>
        </aside>

        {/* Barre d'enregistrement (mobile) */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-filet bg-lin/95 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
          {saveButton('w-full')}
        </div>
      </form>
    </div>
  );
}
