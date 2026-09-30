'use client';

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Concentration, Gender, VariantUnit } from '@prisma/client';
import { AlertCircle, Archive, ArrowLeft, Check, CheckCircle2, ExternalLink, ImageIcon, LoaderCircle, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { slugify } from '@/lib/slug';
import { siteConfig } from '@/config/site';
import { productImageUrl } from '@/lib/supabase/storage';
import type { ProductFormOptions } from '../queries/get-product-form-options';
import type { ProductForEdit } from '../queries/get-product-for-edit';
import { createProductAction, updateProductAction, type ProductFormState } from '../actions';
import { defaultVariantLabel, PRODUCT_LIMITS, productInputSchema, toFieldErrors, type FieldErrors, type ProductInput } from '../schemas';
import { ChoiceChip, describe, Field, inputClass, inputState, Section } from './form-ui';
import ImageManager, { type ImageItem } from './ImageManager';
import VariantsEditor, { newVariant, type VariantDraft } from './VariantsEditor';
import KeywordsInput from './KeywordsInput';
import { PendingIcon } from '@/components/ui/link-pending';

const GENDERS: Array<{ value: Gender | ''; label: string }> = [
  { value: Gender.FEMME, label: 'Femme' },
  { value: Gender.HOMME, label: 'Homme' },
  { value: Gender.UNISEXE, label: 'Unisexe' },
  { value: '', label: 'Non précisé' },
];

const CONCENTRATIONS: Array<{ value: Concentration | ''; label: string }> = [
  { value: Concentration.EAU_DE_TOILETTE, label: 'Eau de toilette' },
  { value: Concentration.EAU_DE_PARFUM, label: 'Eau de parfum' },
  { value: Concentration.EXTRAIT, label: 'Extrait' },
  { value: '', label: 'Non précisée' },
];

/** Synonymes proposés selon la catégorie (la recherche de la boutique les exploite). */
const KEYWORD_SUGGESTIONS: Record<string, string[]> = {
  encens: ['thiouraye', 'bakhour', 'encens'],
  oud: ['oud', 'bois d’oud'],
  muscs: ['musc'],
  huiles: ['huile parfumée'],
};

/** Unité proposée par défaut : le poids pour l'encens, le volume ailleurs. */
const preferredUnitFor = (categorySlug?: string) => (categorySlug === 'encens' ? VariantUnit.G : VariantUnit.ML);

type ProductFormProps = {
  options: ProductFormOptions;
  /** Modification : le produit enregistré. Absent : création. */
  product?: ProductForEdit;
  /** Retour d'un enregistrement réussi (bandeau de confirmation). */
  saved?: boolean;
};

/**
 * Formulaire produit, partagé par la création et la modification.
 * Création : se réinitialise entièrement (« Ajouter un autre produit ») en changeant de clé.
 */
export default function ProductForm({ options, product, saved }: ProductFormProps) {
  const [formKey, setFormKey] = useState(0);
  return <ProductFormInner key={formKey} options={options} product={product} saved={saved} onReset={() => setFormKey((k) => k + 1)} />;
}

/** Contenances enregistrées → brouillons du formulaire. */
function variantsFromProduct(product: ProductForEdit): VariantDraft[] {
  return product.variants.map((variant) => ({
    key: variant.id,
    id: variant.id,
    size: variant.size.replace('.', ','),
    unit: variant.unit,
    label: variant.label,
    labelEdited: variant.label !== defaultVariantLabel(variant.size, variant.unit),
    isActive: variant.isActive,
    currentStock: variant.stock,
    hasHistory: variant.hasHistory,
    price: String(variant.price),
    initialStock: '',
    lowStockThreshold: String(variant.lowStockThreshold),
    sku: variant.sku ?? '',
  }));
}

/** Photos enregistrées → éléments de la galerie (déjà envoyées). */
function imagesFromProduct(product: ProductForEdit): ImageItem[] {
  return product.images.map((image) => ({
    key: image.storagePath,
    status: 'done',
    progress: 1,
    previewUrl: productImageUrl(image.storagePath) ?? '',
    alt: image.alt ?? '',
    storagePath: image.storagePath,
    width: image.width ?? 1200,
    height: image.height ?? 1200,
    persisted: true,
  }));
}

function ProductFormInner({ options, product, saved, onReset }: ProductFormProps & { onReset: () => void }) {
  const isEdit = Boolean(product);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ProductFormState, FormData>(
    isEdit ? updateProductAction : createProductAction,
    { status: 'idle' },
  );
  const formRef = useRef<HTMLFormElement>(null);

  // ── État du formulaire (vide en création, pré-rempli en modification) ──
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [brandName, setBrandName] = useState(product?.brandName ?? '');
  const [gender, setGender] = useState<Gender | ''>(product?.gender ?? '');
  const [concentration, setConcentration] = useState<Concentration | ''>(product?.concentration ?? '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [familyIds, setFamilyIds] = useState<string[]>(product?.familyIds ?? []);
  const [collectionIds, setCollectionIds] = useState<string[]>(product?.collectionIds ?? []);
  const [searchKeywords, setSearchKeywords] = useState<string[]>(product?.searchKeywords ?? []);
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? '');
  const [variants, setVariants] = useState<VariantDraft[]>(() => (product ? variantsFromProduct(product) : [newVariant(VariantUnit.ML)]));
  const [images, setImages] = useState<ImageItem[]>(() => (product ? imagesFromProduct(product) : []));
  const [savedBanner, setSavedBanner] = useState(Boolean(saved));

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const category = options.categories.find((c) => c.id === categoryId);
  const preferredUnit = preferredUnitFor(category?.slug);
  // Création : l'adresse suit le nom. Modification : elle est conservée (liens déjà partagés).
  const effectiveSlug = slugEdited ? slug : product ? product.slug : slugify(name);
  const slugChangedOnline = Boolean(product?.isPublished && slugEdited && slug !== product.slug);

  /** Toute modification marque le formulaire comme modifié et efface l'erreur du champ. */
  const touch = (...fields: string[]) => {
    setDirty(true);
    if (fields.some((f) => errors[f])) {
      setErrors((current) => {
        const next = { ...current };
        for (const f of fields) delete next[f];
        return next;
      });
    }
  };

  // ── Protection contre la perte des modifications ────────────────────────
  useEffect(() => {
    if (!dirty || state.status === 'success') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, state.status]);

  // Modification réussie : on recharge la version enregistrée (nouveaux identifiants,
  // nouvelle date de version) avec un bandeau de confirmation.
  useEffect(() => {
    if (!isEdit || state.status !== 'success') return;
    router.replace(`/admin/produits/${state.product.id}?enregistre=1`, { scroll: false });
    router.refresh();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le paramètre « enregistre » ne sert qu'une fois : il disparaît de l'URL.
  useEffect(() => {
    if (saved) window.history.replaceState(null, '', window.location.pathname);
  }, [saved]);

  // ── Erreurs renvoyées par le serveur ────────────────────────────────────
  useEffect(() => {
    if (state.status !== 'error') return;
    setErrors(state.fieldErrors);
    setFormError(state.formError ?? null);
    setAttempt((n) => n + 1);
  }, [state]);

  // Après une tentative en erreur : le premier champ fautif reçoit le focus.
  useEffect(() => {
    if (!attempt) return;
    const form = formRef.current;
    const first = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.images) {
      document.getElementById('images-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dérivés : liste de contrôle et aperçu ───────────────────────────────
  const doneImages = images.filter((image) => image.status === 'done');
  const uploading = images.some((image) => image.status === 'preparing' || image.status === 'uploading');
  const prices = variants.map((v) => Number(v.price)).filter((p) => p > 0);

  const checklist = [
    { label: 'Un nom', done: name.trim().length >= 2 },
    { label: 'Une catégorie', done: Boolean(categoryId) },
    { label: 'Au moins une photo', done: doneImages.length > 0 },
    { label: 'Un prix pour chaque contenance', done: variants.length > 0 && variants.every((v) => Number(v.price) > 0 && Number(v.size.replace(',', '.')) > 0) },
  ];
  const readyToPublish = checklist.every((item) => item.done);

  const priceLabel = useMemo(() => {
    if (!prices.length) return null;
    const min = Math.min(...prices);
    return prices.length > 1 && Math.max(...prices) !== min ? `À partir de ${formatFCFA(min)}` : formatFCFA(min);
  }, [prices]);

  // ── Envoi ───────────────────────────────────────────────────────────────
  function buildPayload(intent: 'draft' | 'publish'): ProductInput {
    return {
      intent,
      name,
      slug: slugEdited ? slug : undefined,
      categoryId,
      brandName,
      gender: gender || undefined,
      concentration: category?.hasConcentration && concentration ? concentration : undefined,
      shortDescription,
      description,
      familyIds,
      collectionIds,
      searchKeywords,
      seoTitle,
      seoDescription,
      variants: variants.map((v) => ({
        key: v.key,
        id: v.id,
        isActive: v.isActive,
        size: v.size.replace(',', '.'),
        unit: v.unit,
        label: v.label || defaultVariantLabel(v.size, v.unit),
        price: v.price,
        initialStock: v.initialStock || '0',
        lowStockThreshold: v.lowStockThreshold || '0',
        sku: v.sku,
      })),
      images: doneImages.map((image) => ({
        storagePath: image.storagePath!,
        alt: image.alt,
        width: image.width!,
        height: image.height!,
      })),
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === 'draft' ? 'draft' : 'publish';

    if (uploading) {
      setFormError('Patientez : des photos sont encore en cours d’envoi.');
      setAttempt((n) => n + 1);
      return;
    }
    if (images.some((image) => image.status === 'error')) {
      setErrors((e) => ({ ...e, images: 'Réessayez ou retirez les photos en erreur.' }));
      setFormError('Certaines photos n’ont pas pu être envoyées.');
      setAttempt((n) => n + 1);
      return;
    }

    const payload = buildPayload(intent);
    const parsed = productInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setFormError('Certains champs sont à corriger.');
      setAttempt((n) => n + 1);
      return;
    }

    setErrors({});
    setFormError(null);
    const formData = new FormData();
    formData.set('payload', JSON.stringify(payload));
    if (product) formData.set('meta', JSON.stringify({ productId: product.id, expectedUpdatedAt: product.updatedAt }));
    startTransition(() => formAction(formData));
  }

  // ── Succès ──────────────────────────────────────────────────────────────
  if (state.status === 'success' && !isEdit) {
    const { product } = state;
    return (
      <div className="mx-auto flex max-w-[40rem] flex-col items-center gap-6 px-4 py-16 text-center motion-safe:animate-reveal">
        <span className="grid size-16 place-items-center rounded-full bg-succes-fond text-succes">
          <CheckCircle2 className="size-8" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-3" role="status">
          <p className="text-[0.6875rem] tracking-[0.26em] text-or-profond">
            {product.isPublished ? 'PRODUIT PUBLIÉ' : 'BROUILLON ENREGISTRÉ'}
          </p>
          <h1 className="text-title-lg text-encre">{product.name}</h1>
          <p className="text-[0.9375rem] leading-relaxed text-fumee">
            {product.isPublished
              ? 'Il est dès maintenant visible dans la boutique.'
              : 'Il n’est pas encore visible dans la boutique. Vous pourrez le publier plus tard.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={onReset}
            className="flex h-12 items-center gap-2 rounded-full bg-oud px-6 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            Ajouter un autre produit
          </button>
          {product.isPublished && (
            <Link
              href={`/produits/${product.slug}`}
              target="_blank"
              className="flex h-12 items-center gap-2 rounded-full border border-filet-fort px-6 text-sm font-medium text-oud transition-colors duration-150 hover:bg-lin"
            >
              Voir dans la boutique
              <ExternalLink className="size-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          )}
          <Link
            href={`/admin/produits/${product.id}`}
            className="flex h-12 items-center rounded-full border border-filet-fort px-6 text-sm font-medium text-oud transition-colors duration-150 hover:bg-lin"
          >
            Modifier ce produit
          </Link>
          <Link
            href="/admin/produits"
            className="flex h-12 items-center rounded-full px-5 text-sm font-medium text-fumee transition-colors duration-150 hover:text-encre"
          >
            Voir tous les produits
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulaire ──────────────────────────────────────────────────────────
  // Libellés des boutons selon la situation du produit.
  const buttons: {
    primary: { intent: 'publish' | 'draft'; label: string; short: string };
    secondary?: { intent: 'draft'; label: string; short: string };
  } = !product
    ? {
        primary: { intent: 'publish', label: 'Publier le produit', short: 'Publier' },
        secondary: { intent: 'draft', label: 'Enregistrer en brouillon', short: 'Brouillon' },
      }
    : product.isArchived
      ? { primary: { intent: 'draft', label: 'Enregistrer', short: 'Enregistrer' } }
      : product.isPublished
        ? {
            primary: { intent: 'publish', label: 'Enregistrer', short: 'Enregistrer' },
            secondary: { intent: 'draft', label: 'Enregistrer et retirer de la boutique', short: 'Retirer' },
          }
        : {
            primary: { intent: 'publish', label: 'Enregistrer et publier', short: 'Publier' },
            secondary: { intent: 'draft', label: 'Enregistrer le brouillon', short: 'Brouillon' },
          };
  const busy = isPending || (isEdit && state.status === 'success');

  const actions = (layout: 'panel' | 'bar') => (
    <div className={cn('flex gap-2.5', layout === 'panel' ? 'flex-col' : 'flex-row')}>
      <button
        type="submit"
        value={buttons.primary.intent}
        disabled={busy}
        className={cn(
          'flex h-12 items-center justify-center gap-2 rounded-full bg-oud px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-80',
          layout === 'bar' && 'flex-[1.3]',
        )}
      >
        {busy && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
        {busy ? 'Enregistrement…' : layout === 'bar' ? buttons.primary.short : buttons.primary.label}
      </button>
      {buttons.secondary && (
        <button
          type="submit"
          value={buttons.secondary.intent}
          disabled={busy}
          className={cn(
            'flex h-12 items-center justify-center rounded-full border border-filet-fort px-5 text-sm font-medium text-oud transition-colors duration-150 hover:bg-white disabled:opacity-60',
            layout === 'bar' && 'flex-1',
          )}
        >
          {layout === 'bar' ? buttons.secondary.short : buttons.secondary.label}
        </button>
      )}
    </div>
  );

  const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Dakar' });
  const statusChip = !product
    ? null
    : product.isArchived
      ? { label: 'Archivé', className: 'bg-sable text-fumee ring-1 ring-inset ring-filet' }
      : product.isPublished
        ? { label: 'Publié', className: 'bg-succes-fond text-succes' }
        : { label: 'Brouillon', className: 'bg-paille text-or-profond' };

  return (
    <div className="mx-auto max-w-shop px-4 pb-36 pt-6 lg:px-2 lg:pb-10 lg:pt-3">
      <header className="flex flex-col gap-3 px-1 pb-6 lg:min-h-[72px] lg:justify-center lg:pb-5">
        <Link
          href="/admin/produits"
          className="flex h-9 w-fit items-center gap-1.5 rounded-full pr-2 text-sm text-fumee transition-colors duration-150 hover:text-encre"
        >
          <PendingIcon icon={ArrowLeft} className="size-4" strokeWidth={1.8} />
          Produits
        </Link>
        {product ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">{product.name}</h1>
                {statusChip && (
                  <span className={cn('flex h-7 items-center rounded-full px-3 text-xs font-medium', statusChip.className)}>{statusChip.label}</span>
                )}
              </div>
              <p className="text-sm text-fumee">
                Créé le {dateFormat.format(new Date(product.createdAt))} · modifié le {dateFormat.format(new Date(product.updatedAt))}
              </p>
            </div>
            {product.isPublished && (
              <Link
                href={`/produits/${product.slug}`}
                target="_blank"
                className="flex h-11 items-center gap-2 rounded-full border border-filet-fort px-4 text-sm font-medium text-oud transition-colors duration-150 hover:bg-lin"
              >
                Voir dans la boutique
                <ExternalLink className="size-4" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            )}
          </div>
        ) : (
          <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">Nouveau produit</h1>
        )}
      </header>

      {savedBanner && !formError && (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-succes-fond px-4 py-3.5 text-sm text-succes motion-safe:animate-reveal">
          <CheckCircle2 className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span className="flex-1">Modifications enregistrées.</span>
          <button type="button" onClick={() => setSavedBanner(false)} aria-label="Fermer" className="-m-1 grid size-7 place-items-center rounded-full hover:bg-succes/10">
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {product?.isArchived && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-sable px-4 py-3.5 text-sm text-encre ring-1 ring-inset ring-filet">
          <Archive className="mt-px size-[18px] shrink-0 text-fumee" strokeWidth={1.8} aria-hidden="true" />
          Ce produit est archivé : invisible dans la boutique. Vous pouvez le modifier ; pour le remettre en vente,
          restaurez-le depuis la liste des produits.
        </div>
      )}

      {formError && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl bg-erreur-fond px-4 py-3.5 text-sm text-erreur motion-safe:animate-reveal">
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {formError}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          {/* ── Informations ─────────────────────────────────────────── */}
          <Section id="info" title="Informations" description="Ce que le client voit en premier.">
            <Field id="name" label="Nom du produit" error={errors.name} counter={name.length > 120 ? { value: name.length, max: PRODUCT_LIMITS.name } : undefined}>
              <input
                id="name"
                value={name}
                maxLength={PRODUCT_LIMITS.name}
                onChange={(e) => {
                  setName(e.target.value);
                  touch('name', 'slug');
                }}
                placeholder="Ex. Oud Royal"
                autoComplete="off"
                {...describe('name', errors.name)}
                className={cn(inputClass, inputState(errors.name), 'h-14 text-base')}
              />
            </Field>

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-medium text-encre">Catégorie</legend>
              <div role="radiogroup" aria-describedby={errors.categoryId ? 'categoryId-error' : undefined} className="flex flex-wrap gap-2">
                {options.categories.map((c) => (
                  <ChoiceChip
                    key={c.id}
                    role="radio"
                    selected={categoryId === c.id}
                    onClick={() => {
                      setCategoryId(c.id);
                      touch('categoryId', 'concentration');
                      if (!c.hasConcentration) setConcentration('');
                      // Contenances encore vierges : l'unité suit la catégorie.
                      const unit = preferredUnitFor(c.slug);
                      setVariants((list) => (list.every((v) => !v.size && !v.price) ? list.map((v) => ({ ...v, unit })) : list));
                    }}
                  >
                    {c.name}
                  </ChoiceChip>
                ))}
              </div>
              {errors.categoryId && (
                <p id="categoryId-error" className="text-sm text-erreur">
                  {errors.categoryId}
                </p>
              )}
            </fieldset>

            <Field id="brandName" label="Marque" optional error={errors.brandName} hint="Laissez vide pour une création artisanale. Une nouvelle marque est créée automatiquement.">
              <input
                id="brandName"
                list="brand-options"
                value={brandName}
                maxLength={PRODUCT_LIMITS.brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  touch('brandName');
                }}
                placeholder="Ex. Maison Adama"
                autoComplete="off"
                {...describe('brandName', errors.brandName, 'brand')}
                className={cn(inputClass, inputState(errors.brandName), 'h-12')}
              />
              <datalist id="brand-options">
                {options.brands.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </Field>

            <Field
              id="shortDescription"
              label="Accroche"
              optional
              error={errors.shortDescription}
              hint="Une ou deux phrases, affichées sous le nom."
              counter={{ value: shortDescription.length, max: PRODUCT_LIMITS.shortDescription }}
            >
              <textarea
                id="shortDescription"
                rows={2}
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value);
                  touch('shortDescription');
                }}
                placeholder="Ex. Un oud profond et ambré, adouci d’une touche de rose."
                {...describe('shortDescription', errors.shortDescription, 'hint')}
                className={cn(inputClass, inputState(errors.shortDescription), 'resize-none py-3 leading-relaxed')}
              />
            </Field>

            <Field
              id="description"
              label="Description détaillée"
              optional
              error={errors.description}
              hint="Notes, tenue, conseils d’utilisation…"
              counter={description.length > 4000 ? { value: description.length, max: PRODUCT_LIMITS.description } : undefined}
            >
              <textarea
                id="description"
                rows={6}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  touch('description');
                }}
                {...describe('description', errors.description, 'hint')}
                className={cn(inputClass, inputState(errors.description), 'min-h-36 resize-y py-3 leading-relaxed')}
              />
            </Field>
          </Section>

          {/* ── Photos ───────────────────────────────────────────────── */}
          <Section
            id="images"
            title="Photos"
            description="La première est la photo principale. Glissez les photos ou utilisez les flèches pour changer l’ordre."
            aside={<span className="shrink-0 text-sm tabular-nums text-fumee">{images.length}/12</span>}
          >
            <ImageManager
              images={images}
              productName={name.trim()}
              error={errors.images}
              onChange={(update) => {
                setImages(update);
                touch('images');
              }}
            />
          </Section>

          {/* ── Contenances & prix ───────────────────────────────────── */}
          <Section id="variants" title="Contenances et prix" description="Chaque contenance a son prix et son stock. Le stock initial est enregistré comme un réassort.">
            <VariantsEditor
              variants={variants}
              preferredUnit={preferredUnit}
              errors={errors}
              onChange={(next) => {
                setVariants(next);
                setDirty(true);
                setErrors((current) => {
                  const cleaned = { ...current };
                  for (const key of Object.keys(cleaned)) if (key.startsWith('variants')) delete cleaned[key];
                  return cleaned;
                });
              }}
            />
          </Section>

          {/* ── Caractéristiques ─────────────────────────────────────── */}
          <Section id="features" title="Caractéristiques" description="Elles alimentent les filtres de la boutique.">
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-medium text-encre">Pour qui ?</legend>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <ChoiceChip key={g.label} role="radio" selected={gender === g.value} onClick={() => { setGender(g.value); touch('gender'); }}>
                    {g.label}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>

            {category?.hasConcentration && (
              <fieldset className="flex flex-col gap-2.5 motion-safe:animate-reveal">
                <legend className="mb-2.5 text-sm font-medium text-encre">Concentration</legend>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {CONCENTRATIONS.map((c) => (
                    <ChoiceChip key={c.label} role="radio" selected={concentration === c.value} onClick={() => { setConcentration(c.value); touch('concentration'); }}>
                      {c.label}
                    </ChoiceChip>
                  ))}
                </div>
                {errors.concentration && <p className="text-sm text-erreur">{errors.concentration}</p>}
              </fieldset>
            )}

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-medium text-encre">
                Familles olfactives <span className="font-normal text-fumee">(plusieurs possibles)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {options.families.map((family) => {
                  const selected = familyIds.includes(family.id);
                  return (
                    <ChoiceChip
                      key={family.id}
                      selected={selected}
                      onClick={() => {
                        setFamilyIds((ids) => (selected ? ids.filter((id) => id !== family.id) : [...ids, family.id]));
                        touch('familyIds');
                      }}
                    >
                      {selected && <Check className="size-3.5" strokeWidth={2.2} aria-hidden="true" />}
                      {family.name}
                    </ChoiceChip>
                  );
                })}
              </div>
              {errors.familyIds && <p className="text-sm text-erreur">{errors.familyIds}</p>}
            </fieldset>

            <div className="flex flex-col gap-2">
              <label htmlFor="searchKeywords" className="text-sm font-medium text-encre">
                Mots-clés de recherche <span className="font-normal text-fumee">(facultatif)</span>
              </label>
              <KeywordsInput
                id="searchKeywords"
                value={searchKeywords}
                onChange={(keywords) => {
                  setSearchKeywords(keywords);
                  touch('searchKeywords');
                }}
                suggestions={KEYWORD_SUGGESTIONS[category?.slug ?? ''] ?? []}
                error={errors.searchKeywords}
                hint="Autres noms sous lesquels vos clients cherchent ce produit : « thiouraye » et « bakhour » mènent au même encens."
              />
            </div>
          </Section>

          {/* ── Référencement ────────────────────────────────────────── */}
          <details className="group rounded-[28px] border border-filet bg-lin" open={Boolean(errors.slug || errors.seoTitle || errors.seoDescription)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-7 [&::-webkit-details-marker]:hidden">
              <span className="flex flex-col gap-1.5">
                <span className="font-display text-title-sm text-encre">Référencement Google</span>
                <span className="text-sm text-fumee">Facultatif : rempli automatiquement si vous le laissez vide.</span>
              </span>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sable text-oud transition-transform duration-250 ease-out-soft group-open:rotate-45">
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              </span>
            </summary>
            <div className="flex flex-col gap-5 px-5 pb-6 sm:px-7 sm:pb-7">
              <Field
                id="slug"
                label="Adresse de la page"
                error={errors.slug}
                hint={
                  product
                    ? 'Conservée si vous renommez le produit, pour ne pas casser les liens déjà partagés.'
                    : 'Générée depuis le nom. Modifiez-la seulement si nécessaire.'
                }
              >
                <div className={cn('flex items-center overflow-hidden rounded-2xl border bg-white/70 focus-within:border-or focus-within:shadow-[0_0_0_4px_rgb(180_138_44/0.15)]', inputState(errors.slug))}>
                  <span className="hidden shrink-0 pl-4 text-sm text-fumee sm:block">{new URL(siteConfig.url).host}/produits/</span>
                  <input
                    id="slug"
                    value={effectiveSlug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'));
                      setSlugEdited(true);
                      touch('slug');
                    }}
                    onBlur={() => slugEdited && setSlug((s) => s.replace(/^-+|-+$/g, ''))}
                    placeholder="oud-royal"
                    {...describe('slug', errors.slug, 'hint')}
                    className="h-12 min-w-0 flex-1 bg-transparent px-4 text-[0.9375rem] text-encre outline-none sm:pl-0.5"
                  />
                </div>
                {slugChangedOnline && (
                  <p role="status" className="flex items-start gap-2 rounded-xl bg-alerte-fond px-3 py-2.5 text-[0.8125rem] text-alerte">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    Produit en ligne : l’ancienne adresse ne fonctionnera plus, les liens déjà partagés (WhatsApp, réseaux) seront cassés.
                  </p>
                )}
              </Field>
              <Field id="seoTitle" label="Titre dans Google" optional error={errors.seoTitle} counter={{ value: seoTitle.length, max: PRODUCT_LIMITS.seoTitle }}>
                <input
                  id="seoTitle"
                  value={seoTitle}
                  onChange={(e) => {
                    setSeoTitle(e.target.value);
                    touch('seoTitle');
                  }}
                  placeholder={name ? `${name} | Maison Adama` : 'Nom du produit | Maison Adama'}
                  {...describe('seoTitle', errors.seoTitle)}
                  className={cn(inputClass, inputState(errors.seoTitle), 'h-12')}
                />
              </Field>
              <Field id="seoDescription" label="Description dans Google" optional error={errors.seoDescription} counter={{ value: seoDescription.length, max: PRODUCT_LIMITS.seoDescription }}>
                <textarea
                  id="seoDescription"
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => {
                    setSeoDescription(e.target.value);
                    touch('seoDescription');
                  }}
                  placeholder={shortDescription || 'Par défaut : l’accroche du produit.'}
                  {...describe('seoDescription', errors.seoDescription)}
                  className={cn(inputClass, inputState(errors.seoDescription), 'resize-none py-3 leading-relaxed')}
                />
              </Field>

              {/* Aperçu du résultat Google */}
              <div className="flex flex-col gap-1 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-filet/60" aria-label="Aperçu dans Google">
                <span className="truncate text-xs text-[#4d5156]">
                  {new URL(siteConfig.url).host} › produits › {effectiveSlug || '…'}
                </span>
                <span className="truncate text-lg leading-snug text-[#1a0dab]">{seoTitle || (name ? `${name} | Maison Adama` : 'Titre du produit')}</span>
                <span className="line-clamp-2 text-sm leading-snug text-[#4d5156]">
                  {seoDescription || shortDescription || 'La description apparaîtra ici.'}
                </span>
              </div>
            </div>
          </details>
        </div>

        {/* ── Panneau latéral ─────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <section aria-labelledby="publish-title" className="flex flex-col gap-4 rounded-[28px] bg-oud p-5 text-sur-oud sm:p-6">
            <div className="flex items-center justify-between">
              <h2 id="publish-title" className="text-title-sm text-sur-oud">
                Publication
              </h2>
              <span
                className={cn(
                  'flex h-7 items-center rounded-full px-3 text-xs font-medium',
                  readyToPublish ? 'bg-succes-fond text-succes' : 'bg-sur-oud/12 text-sur-oud/80',
                )}
              >
                {readyToPublish ? 'Prêt' : `${checklist.filter((c) => c.done).length}/${checklist.length}`}
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full',
                      item.done ? 'bg-or text-encre' : 'ring-1 ring-inset ring-sur-oud/30',
                    )}
                  >
                    {item.done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className={item.done ? 'text-sur-oud' : 'text-sur-oud/65'}>{item.label}</span>
                  <span className="sr-only">{item.done ? '(fait)' : '(à faire)'}</span>
                </li>
              ))}
            </ul>
            <div className="hidden lg:block">{actions('panel')}</div>
            <p className="text-xs leading-relaxed text-sur-oud/55">
              Un brouillon n’est pas visible dans la boutique. Il peut rester incomplet.
            </p>
          </section>

          {/* Aperçu en direct de la carte produit */}
          <section aria-labelledby="preview-title" className="flex flex-col gap-3 rounded-[28px] border border-filet bg-lin p-5">
            <h2 id="preview-title" className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-or-profond">
              Aperçu dans la boutique
            </h2>
            <div className="overflow-hidden rounded-3xl bg-sable">
              <div className="grid aspect-[4/5] place-items-center overflow-hidden bg-paille/60">
                {doneImages[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:)
                  <img src={doneImages[0].previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-10 text-or-profond/40" strokeWidth={1.2} aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col gap-1.5 p-4">
                <span className="text-[0.6875rem] uppercase tracking-[0.2em] text-fumee">{category?.name ?? 'Catégorie'}</span>
                <span className="font-display text-title-sm leading-tight text-encre">{name || 'Nom du produit'}</span>
                <span className="price text-[0.9375rem] text-oud">{priceLabel ?? 'Prix'}</span>
              </div>
            </div>
          </section>

          {/* Collections */}
          {options.collections.length > 0 && (
            <section aria-labelledby="collections-title" className="flex flex-col gap-3 rounded-[28px] border border-filet bg-lin p-5">
              <div className="flex flex-col gap-1">
                <h2 id="collections-title" className="text-title-sm text-encre">
                  Mises en avant
                </h2>
                <p className="text-[0.8125rem] text-fumee">Les collections de la page d’accueil.</p>
              </div>
              <ul className="flex flex-col gap-1">
                {options.collections.map((collection) => {
                  const checked = collectionIds.includes(collection.id);
                  return (
                    <li key={collection.id}>
                      <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-encre transition-colors duration-150 hover:bg-sable">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setCollectionIds((ids) => (checked ? ids.filter((id) => id !== collection.id) : [...ids, collection.id]));
                            touch('collectionIds');
                          }}
                          className="size-[18px] accent-[#4A2E1C]"
                        />
                        {collection.name}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>

        {/* Barre d'actions (mobile) */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-filet bg-lin/95 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
          {actions('bar')}
        </div>
      </form>
    </div>
  );
}
