'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Banknote, Check, LoaderCircle, Lock, MessageCircle, ShieldCheck, ShoppingBag, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { parseSenegalPhone, formatSenegalPhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/whatsapp';
import ProductVisual from '@/features/shop/components/ProductVisual';
import { useCartStore } from '@/features/cart/store';
import { validateCartAction, type CartLineStatus } from '@/features/cart/actions';
import { placeOrderAction } from '../actions/place-order.action';

export type CheckoutZone = { id: string; name: string; region: string; defaultFee: number; estimatedDelay: string | null };

const PROFILE_KEY = 'ma-checkout-profile';
const ZONE_KEY = 'ma-delivery-zone';
const IDEMPOTENCY_KEY = 'ma-checkout-key';
const noop = () => () => {};

type Profile = { customerName: string; customerPhone: string; customerEmail: string; city: string; address: string; landmark: string };
type Payment = 'WAVE' | 'A_LA_LIVRAISON';
type Errors = Partial<Record<keyof Profile | 'deliveryZoneId' | 'customerNote' | 'paymentReference', string>>;

const inputClass = (error?: string) =>
  cn(
    'h-[3.25rem] w-full rounded-2xl border bg-white px-4 text-[0.9375rem] text-encre outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fumee/60 focus:border-or focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)]',
    error ? 'border-erreur' : 'border-filet hover:border-filet-fort',
  );

function Field({ id, label, optional, hint, error, className, children }: { id: string; label: string; optional?: boolean; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium text-encre">
        {label}
        {optional && <span className="ml-1.5 font-normal text-fumee">(facultatif)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[0.8125rem] text-erreur">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-fumee">{hint}</p>
      ) : null}
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="flex flex-col gap-5 rounded-[32px] border border-filet bg-lin p-5 sm:p-7">
      <h2 id={`step-${n}`} className="flex items-center gap-3 text-[1.5rem] leading-tight text-encre">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full font-sans text-sm font-bold transition-colors duration-200', done ? 'bg-succes text-white' : 'bg-oud text-sur-oud')}>
          {done ? <Check className="size-4" strokeWidth={2.6} aria-hidden="true" /> : n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function CheckoutForm({
  zones,
  whatsappNumber,
  waveNumber,
}: {
  zones: CheckoutZone[];
  whatsappNumber: string | null;
  /** Numéro ou identifiant Wave de la boutique (affiché au client). */
  waveNumber: string | null;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const items = useCartStore((s) => s.items);
  const [statuses, setStatuses] = useState<Map<string, CartLineStatus> | null>(null);
  const [profile, setProfile] = useState<Profile>({ customerName: '', customerPhone: '', customerEmail: '', city: '', address: '', landmark: '' });
  const [zoneId, setZoneId] = useState('');
  const [payment, setPayment] = useState<Payment>('WAVE');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ text: string; cart?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Coordonnées mémorisées sur cet appareil, zone choisie au panier.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as Profile | null;
      if (saved) setProfile((p) => ({ ...p, ...saved, customerPhone: saved.customerPhone ? formatSenegalPhone(saved.customerPhone) : '' }));
      const z = localStorage.getItem(ZONE_KEY);
      if (z && zones.some((x) => x.id === z)) setZoneId(z);
    } catch {}
  }, [zones]);

  // Prix, promotions et stock revérifiés (même calcul que la commande).
  const idsKey = items.map((i) => i.variantId).sort().join(',');
  useEffect(() => {
    if (!hydrated || !idsKey) return;
    let cancelled = false;
    validateCartAction(idsKey.split(',')).then((lines) => {
      if (cancelled) return;
      const byId = new Map(lines.map((l) => [l.variantId, l]));
      useCartStore.getState().refreshItems(
        lines.filter((l) => l.available).map((l) => ({ variantId: l.variantId, unitPrice: l.unitPrice, unitDiscount: l.unitDiscount, productName: l.productName, variantLabel: l.variantLabel, imageStoragePath: l.imagePath ?? undefined })),
      );
      setStatuses(byId);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, idsKey]);

  const problems = useMemo(
    () => (statuses ? items.filter((i) => { const s = statuses.get(i.variantId); return !s || !s.available || s.stock < i.quantity; }) : []),
    [items, statuses],
  );
  const zone = zones.find((z) => z.id === zoneId);
  const gross = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  const savings = items.reduce((n, i) => n + i.unitDiscount * i.quantity, 0);
  const total = gross - savings + (zone?.defaultFee ?? 0);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((p) => ({ ...p, [key]: e.target.value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  const youDone = profile.customerName.trim().length >= 2 && Boolean(parseSenegalPhone(profile.customerPhone));
  const deliveryDone = Boolean(zone) && profile.city.trim().length >= 2 && profile.address.trim().length >= 3;

  function validate(): Errors {
    const e: Errors = {};
    if (profile.customerName.trim().length < 2) e.customerName = 'Indiquez votre nom et prénom.';
    if (!parseSenegalPhone(profile.customerPhone)) e.customerPhone = 'Numéro sénégalais invalide (ex. 77 123 45 67).';
    if (profile.customerEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.customerEmail.trim())) e.customerEmail = 'Adresse e-mail invalide (ex. nom@exemple.com).';
    if (!zone) e.deliveryZoneId = 'Choisissez votre zone de livraison.';
    if (profile.city.trim().length < 2) e.city = 'Indiquez votre ville ou votre quartier.';
    if (profile.address.trim().length < 3) e.address = 'Indiquez votre adresse.';
    return e;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (problems.length) {
      setFormError({ text: 'Un article n’est plus disponible dans la quantité demandée.', cart: true });
      return;
    }

    // Clé d'idempotence : un double clic ou un nouvel essai réseau ne crée pas deux commandes.
    let key = '';
    try {
      key = sessionStorage.getItem(IDEMPOTENCY_KEY) ?? '';
    } catch {}
    if (!key) {
      key = crypto.randomUUID();
      try { sessionStorage.setItem(IDEMPOTENCY_KEY, key); } catch {}
    }

    startTransition(async () => {
      const result = await placeOrderAction({
        idempotencyKey: key,
        customerName: profile.customerName,
        customerPhone: profile.customerPhone,
        customerEmail: profile.customerEmail,
        deliveryZoneId: zoneId,
        city: profile.city,
        address: profile.address,
        landmark: profile.landmark,
        customerNote: note,
        paymentMethod: payment,
        paymentReference: payment === 'WAVE' ? reference : undefined,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError({ text: result.error, cart: ['STOCK_INSUFFICIENT', 'PRICE_CHANGED', 'DISCOUNT_INVALID', 'PRODUCT_UNAVAILABLE'].includes(result.code ?? '') });
        return;
      }
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, customerPhone: parseSenegalPhone(profile.customerPhone) }));
        localStorage.setItem(ZONE_KEY, zoneId);
        sessionStorage.removeItem(IDEMPOTENCY_KEY);
      } catch {}
      useCartStore.getState().clearCart();
      router.replace(`/commande/${result.token}`);
    });
  }

  if (!hydrated) {
    return <div role="status" aria-busy="true" className="h-96 animate-pulse rounded-[32px] bg-filet/40"><span className="sr-only">Chargement…</span></div>;
  }

  if (items.length === 0) {
    return (
      <section className="flex min-h-[22rem] flex-col items-center justify-center gap-4 rounded-[40px] bg-[radial-gradient(90%_70%_at_50%_30%,#6B4526_0%,#3A2716_50%,#17100A_100%)] px-6 py-14 text-center text-sur-oud">
        <ShoppingBag className="size-8 text-or-clair" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-[1.75rem]">Votre panier est vide</h2>
        <p className="max-w-sm text-sur-oud/75">Ajoutez une création pour passer commande.</p>
        <Link href="/boutique" className="mt-2 flex h-12 items-center rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre">Découvrir la boutique</Link>
      </section>
    );
  }

  const noZones = zones.length === 0;
  const waOrder = whatsappLink(
    whatsappNumber,
    ['Bonjour Maison Adama, je souhaite commander :', ...items.map((i) => `• ${i.productName} (${i.variantLabel}) × ${i.quantity}`)].join('\n'),
  );

  const describe = (id: keyof Errors) => ({ 'aria-invalid': errors[id] ? true : undefined, 'aria-describedby': errors[id] ? `${id}-error` : undefined });

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid items-start gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10 lg:pb-0">
      <div className="flex flex-col gap-5">
        {formError && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl bg-erreur-fond px-4 py-3.5 text-sm text-erreur motion-safe:animate-reveal">
            <TriangleAlert className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="flex-1">
              {formError.text}
              {formError.cart && <Link href="/panier" className="ml-1.5 font-semibold underline underline-offset-2">Revoir mon panier</Link>}
            </span>
          </div>
        )}

        {/* ── 1. Vous ── */}
        <Step n={1} title="Vous" done={youDone}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="customerName" label="Nom et prénom" error={errors.customerName}>
              <input id="customerName" value={profile.customerName} onChange={set('customerName')} autoComplete="name" placeholder="Ex. Aïssatou Diop" {...describe('customerName')} className={inputClass(errors.customerName)} />
            </Field>
            <Field id="customerPhone" label="Téléphone" hint="Pour confirmer la commande et la livraison." error={errors.customerPhone}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.9375rem] font-semibold text-fumee">+221</span>
                <input
                  id="customerPhone"
                  type="tel"
                  inputMode="tel"
                  value={profile.customerPhone}
                  onChange={set('customerPhone')}
                  onBlur={() => { const p = parseSenegalPhone(profile.customerPhone); if (p) setProfile((x) => ({ ...x, customerPhone: formatSenegalPhone(p) })); }}
                  autoComplete="tel-national"
                  placeholder="77 123 45 67"
                  {...describe('customerPhone')}
                  aria-describedby={errors.customerPhone ? 'customerPhone-error' : 'customerPhone-hint'}
                  className={cn(inputClass(errors.customerPhone), 'pl-[4.25rem] tabular-nums')}
                />
              </div>
            </Field>
            <Field id="customerEmail" label="E-mail" optional hint="Pour garder une trace écrite de votre commande." error={errors.customerEmail} className="sm:col-span-2">
              <input
                id="customerEmail"
                type="email"
                inputMode="email"
                value={profile.customerEmail}
                onChange={set('customerEmail')}
                autoComplete="email"
                placeholder="nom@exemple.com"
                {...describe('customerEmail')}
                aria-describedby={errors.customerEmail ? 'customerEmail-error' : 'customerEmail-hint'}
                className={inputClass(errors.customerEmail)}
              />
            </Field>
          </div>
        </Step>

        {/* ── 2. Livraison ── */}
        <Step n={2} title="Livraison" done={deliveryDone}>
          <fieldset className="flex flex-col gap-2.5" aria-describedby={errors.deliveryZoneId ? 'deliveryZoneId-error' : undefined}>
            <legend className="mb-2.5 text-sm font-medium text-encre">Zone de livraison</legend>
            {noZones && (
              <div className="flex flex-col gap-3 rounded-2xl bg-alerte-fond p-4 text-[0.875rem] leading-relaxed text-alerte">
                <p className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                  Les zones de livraison ne sont pas encore ouvertes en ligne. Envoyez votre commande sur WhatsApp : la Maison vous confirme la livraison et le paiement.
                </p>
                {waOrder && (
                  <a href={waOrder} target="_blank" rel="noopener noreferrer" className="flex h-11 w-fit items-center gap-2 rounded-full bg-oud px-5 text-sm font-semibold text-sur-oud">
                    <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" /> Commander sur WhatsApp
                  </a>
                )}
              </div>
            )}
            <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2">
              {zones.map((z) => {
                const on = z.id === zoneId;
                return (
                  <button
                    key={z.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setZoneId(z.id);
                      if (errors.deliveryZoneId) setErrors(({ deliveryZoneId: _, ...rest }) => rest);
                    }}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors duration-150',
                      on ? 'bg-white ring-2 ring-inset ring-oud' : cn('bg-white/60 ring-1 ring-inset', errors.deliveryZoneId ? 'ring-erreur' : 'ring-filet hover:ring-filet-fort'),
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-oud' : 'border-filet-fort')}>{on && <span className="size-2 rounded-full bg-oud" />}</span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[0.9375rem] font-semibold text-encre">{z.name}</span>
                        <span className="text-xs text-fumee">{z.region}{z.estimatedDelay ? ` · ${z.estimatedDelay}` : ''}</span>
                      </span>
                    </span>
                    <span className={cn('whitespace-nowrap text-sm font-bold tabular-nums', z.defaultFee === 0 ? 'text-succes' : 'text-encre')}>{z.defaultFee === 0 ? 'Offerte' : formatFCFA(z.defaultFee)}</span>
                  </button>
                );
              })}
            </div>
            {errors.deliveryZoneId && <p id="deliveryZoneId-error" className="text-[0.8125rem] text-erreur">{errors.deliveryZoneId}</p>}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="city" label="Ville ou quartier" error={errors.city}>
              <input id="city" value={profile.city} onChange={set('city')} autoComplete="address-level2" placeholder="Ex. Mermoz, Thiès, Touba…" {...describe('city')} className={inputClass(errors.city)} />
            </Field>
            <Field id="landmark" label="Point de repère" optional>
              <input id="landmark" value={profile.landmark} onChange={set('landmark')} placeholder="Ex. en face de la pharmacie" className={inputClass()} />
            </Field>
          </div>
          <Field id="address" label="Adresse" hint="Rue, numéro, immeuble, étage : tout ce qui aide le livreur." error={errors.address}>
            <input id="address" value={profile.address} onChange={set('address')} autoComplete="street-address" placeholder="Ex. Rue 10, villa 24" {...describe('address')} className={inputClass(errors.address)} />
          </Field>
          <Field id="customerNote" label="Un mot pour la Maison" optional>
            <textarea id="customerNote" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ex. c’est un cadeau, appelez après 18 h…" className={cn(inputClass(), 'h-auto resize-y py-3 leading-relaxed')} />
          </Field>
        </Step>

        {/* ── 3. Paiement ── */}
        <Step n={3} title="Paiement" done={false}>
          <div role="radiogroup" aria-label="Moyen de paiement" className="grid gap-2.5 sm:grid-cols-2">
            {([
              ['WAVE', 'Wave', 'Payez maintenant avec Wave'],
              ['A_LA_LIVRAISON', 'À la livraison', 'En espèces, à la réception'],
            ] as const).map(([key, title, text]) => {
              const on = payment === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPayment(key)}
                  className={cn('flex items-center gap-3.5 rounded-2xl px-4 py-4 text-left transition-colors duration-150', on ? 'bg-white ring-2 ring-inset ring-oud' : 'bg-white/60 ring-1 ring-inset ring-filet hover:ring-filet-fort')}
                >
                  {key === 'WAVE' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/images/wave.png" alt="" className="size-11 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-succes-fond text-succes"><Banknote className="size-5" strokeWidth={1.8} aria-hidden="true" /></span>
                  )}
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[0.9375rem] font-semibold text-encre">{title}</span>
                    <span className="text-xs text-fumee">{text}</span>
                  </span>
                  <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-oud' : 'border-filet-fort')}>{on && <span className="size-2 rounded-full bg-oud" />}</span>
                </button>
              );
            })}
          </div>
          {payment === 'WAVE' ? (
            <div className="flex flex-col gap-4 rounded-2xl bg-[#DCEBF3] p-4 text-[0.875rem] leading-relaxed text-[#1F5673] motion-safe:animate-reveal">
              <p>
                Après validation, envoyez <strong className="font-semibold">{formatFCFA(total)}</strong> par Wave
                {waveNumber ? <> au <strong className="font-semibold tabular-nums">{waveNumber}</strong></> : ''}. Les instructions et le QR code s’affichent sur la page suivante. Nous vérifions la réception, puis préparons votre commande.
              </p>
              <Field id="paymentReference" label="Déjà payé ? Référence de la transaction" optional>
                <input id="paymentReference" value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} placeholder="Ex. numéro de transaction Wave" className={inputClass()} />
              </Field>
            </div>
          ) : (
            <p className="rounded-2xl bg-succes-fond p-4 text-[0.875rem] leading-relaxed text-succes motion-safe:animate-reveal">
              Vous payez <strong className="font-semibold">{formatFCFA(total)}</strong> en espèces au livreur, à la réception de votre commande.
            </p>
          )}
        </Step>
      </div>

      {/* ═══ Récapitulatif ═══ */}
      <aside aria-labelledby="summary-title" className="flex flex-col gap-5 rounded-[36px] bg-oud p-6 text-sur-oud lg:sticky lg:top-[6.5rem] lg:p-7">
        <div className="flex items-baseline justify-between">
          <h2 id="summary-title" className="text-[1.5rem] leading-tight">Votre commande</h2>
          <Link href="/panier" className="flex items-center gap-1 text-[0.8125rem] text-sur-oud/75 underline-offset-4 hover:underline">
            <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden="true" /> Modifier
          </Link>
        </div>
        <ul className="flex flex-col gap-3.5">
          {items.map((i) => {
            const s = statuses?.get(i.variantId);
            const bad = s ? !s.available || s.stock < i.quantity : false;
            return (
              <li key={i.variantId} className="flex items-center gap-3">
                <span className="relative shrink-0">
                  <ProductVisual image={i.imageStoragePath ? { path: i.imageStoragePath, alt: null } : null} name={i.productName} categorySlug={s?.categorySlug ?? ''} seed={i.productId} sizes="56px" bottleClassName="w-[40%]" className="h-16 w-[3.25rem] rounded-xl" />
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-sur-oud text-[0.6875rem] font-bold text-oud">{i.quantity}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{i.productName}</span>
                  <span className={cn('text-xs', bad ? 'font-semibold text-[#F2B8A8]' : 'text-sur-oud/65')}>{bad ? 'Plus disponible dans cette quantité' : i.variantLabel}</span>
                </span>
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatFCFA((i.unitPrice - i.unitDiscount) * i.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="flex flex-col gap-2.5 border-t border-sur-oud/15 pt-4 text-[0.9375rem]">
          <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Sous-total · {count} article{count > 1 ? 's' : ''}</dt><dd className="whitespace-nowrap tabular-nums">{formatFCFA(gross)}</dd></div>
          {savings > 0 && <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Vos économies</dt><dd className="whitespace-nowrap font-semibold tabular-nums text-[#C4DDAE]">−{formatFCFA(savings)}</dd></div>}
          <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Livraison{zone ? ` · ${zone.name}` : ''}</dt><dd className="whitespace-nowrap tabular-nums">{zone ? (zone.defaultFee === 0 ? 'Offerte' : formatFCFA(zone.defaultFee)) : 'Choisissez une zone'}</dd></div>
        </dl>
        <div className="flex items-baseline justify-between gap-4 border-t border-sur-oud/15 pt-4">
          <span className="text-sm text-sur-oud/75">Total à payer</span>
          <span className="whitespace-nowrap font-display text-[2rem] leading-none tabular-nums">{formatFCFA(total)}</span>
        </div>
        {noZones && <p className="rounded-2xl bg-sur-oud/10 px-4 py-3 text-[0.8125rem] leading-relaxed text-sur-oud/85">La commande en ligne s’ouvre dès que les zones de livraison sont configurées. En attendant, commandez sur WhatsApp.</p>}
        <button
          type="submit"
          disabled={isPending || noZones}
          className="hidden h-14 items-center justify-center gap-2.5 rounded-full bg-sur-oud text-[0.9375rem] font-bold text-encre transition-colors duration-150 hover:bg-paille disabled:cursor-not-allowed disabled:opacity-60 lg:flex"
        >
          {isPending ? <LoaderCircle className="size-5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" /> : <Lock className="size-4" strokeWidth={2} aria-hidden="true" />}
          {isPending ? 'Enregistrement…' : `Confirmer la commande · ${formatFCFA(total)}`}
        </button>
        <p className="flex items-start gap-2.5 text-xs leading-relaxed text-sur-oud/65">
          <ShieldCheck className="mt-px size-4 shrink-0 text-or-clair" strokeWidth={1.7} aria-hidden="true" />
          Aucun compte à créer. La Maison vous appelle ou vous écrit pour confirmer avant d’expédier.
        </p>
      </aside>

      {/* ═══ Barre collée (mobile) ═══ */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-filet bg-lin/96 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgb(43_29_18/0.08)] backdrop-blur-md lg:hidden">
        <span className="flex min-w-0 flex-col">
          <span className="text-[0.6875rem] text-fumee">Total à payer</span>
          <strong className="whitespace-nowrap text-lg tabular-nums text-encre">{formatFCFA(total)}</strong>
        </span>
        <button type="submit" disabled={isPending || noZones} className="flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-full bg-oud text-[0.9375rem] font-bold text-sur-oud disabled:opacity-60">
          {isPending ? <LoaderCircle className="size-5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" /> : <Lock className="size-4" strokeWidth={2} aria-hidden="true" />}
          {isPending ? 'Enregistrement…' : 'Confirmer'}
        </button>
      </div>
    </form>
  );
}
