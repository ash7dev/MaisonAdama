'use client';

import { useState, useTransition } from 'react';
import { AtSign, MessageCircle, Phone, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSenegalPhone } from '@/lib/phone';
import { useToast } from '@/components/ui/toast';
import { describe, Field, inputClass, inputState } from '@/features/catalog/components/form-ui';
import { saveStoreInfoAction } from '../actions';
import type { FieldErrors } from '../schemas';
import type { AdminStoreSettings } from '../queries';
import { SaveBar, savedHint, SettingsSection } from './settings-ui';

type Values = { storeName: string; whatsappNumber: string; contactPhone: string; contactEmail: string };

function initialValues(settings: AdminStoreSettings | null): Values {
  return {
    storeName: settings?.storeName ?? 'Maison Adama Tchurayy',
    whatsappNumber: settings?.whatsappNumber ? formatSenegalPhone(settings.whatsappNumber) : '',
    contactPhone: settings?.contactPhone ? formatSenegalPhone(settings.contactPhone) : '',
    contactEmail: settings?.contactEmail ?? '',
  };
}

function IconInput({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-or-profond [&_svg]:size-[18px]">{icon}</span>
      <input {...props} className={cn(props.className, 'pl-11')} />
    </div>
  );
}

/** Nom et contacts : affichés dans l'en-tête, le pied de page et les boutons WhatsApp. */
export default function StoreInfoForm({ settings }: { settings: AdminStoreSettings | null }) {
  const notify = useToast();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(() => initialValues(settings));
  const [updatedAt, setUpdatedAt] = useState(settings?.updatedAt ?? null);
  const [values, setValues] = useState(saved);
  const [errors, setErrors] = useState<FieldErrors>({});

  const dirty = (Object.keys(values) as (keyof Values)[]).some((k) => values[k].trim() !== saved[k].trim());
  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveStoreInfoAction(values, updatedAt);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        notify(result.error, 'error');
        return;
      }
      // Valeurs normalisées (numéros au format lisible).
      const next: Values = {
        storeName: values.storeName.trim(),
        whatsappNumber: values.whatsappNumber.trim() ? formatSenegalPhone(normalize(values.whatsappNumber)) : '',
        contactPhone: values.contactPhone.trim() ? formatSenegalPhone(normalize(values.contactPhone)) : '',
        contactEmail: values.contactEmail.trim().toLowerCase(),
      };
      setSaved(next);
      setValues(next);
      setUpdatedAt(result.updatedAt ?? null);
      setErrors({});
      notify(result.message);
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <SettingsSection
        id="boutique"
        icon={<Store strokeWidth={1.6} aria-hidden="true" />}
        title="Boutique et contacts"
        description="Affichés dans l’en-tête, le pied de page et sur chaque bouton WhatsApp de la boutique."
        footer={
          <SaveBar
            dirty={dirty}
            pending={isPending}
            savedHint={savedHint(updatedAt)}
            onCancel={() => {
              setValues(saved);
              setErrors({});
            }}
          />
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="storeName" label="Nom de la boutique" error={errors.storeName} className="sm:col-span-2">
            <input
              id="storeName"
              value={values.storeName}
              onChange={set('storeName')}
              maxLength={120}
              autoComplete="organization"
              {...describe('storeName', errors.storeName)}
              className={cn(inputClass, inputState(errors.storeName), 'h-12')}
            />
          </Field>
          <Field id="whatsappNumber" label="WhatsApp" optional hint="Les clients vous écrivent ici." error={errors.whatsappNumber}>
            <IconInput
              icon={<MessageCircle strokeWidth={1.7} aria-hidden="true" />}
              id="whatsappNumber"
              type="tel"
              inputMode="tel"
              value={values.whatsappNumber}
              onChange={set('whatsappNumber')}
              placeholder="77 105 92 10"
              autoComplete="tel"
              {...describe('whatsappNumber', errors.whatsappNumber, 'hint')}
              className={cn(inputClass, inputState(errors.whatsappNumber), 'h-12 tabular-nums')}
            />
          </Field>
          <Field id="contactPhone" label="Téléphone" optional hint="Pour les appels." error={errors.contactPhone}>
            <IconInput
              icon={<Phone strokeWidth={1.7} aria-hidden="true" />}
              id="contactPhone"
              type="tel"
              inputMode="tel"
              value={values.contactPhone}
              onChange={set('contactPhone')}
              placeholder="77 105 92 10"
              autoComplete="tel"
              {...describe('contactPhone', errors.contactPhone, 'hint')}
              className={cn(inputClass, inputState(errors.contactPhone), 'h-12 tabular-nums')}
            />
          </Field>
          <Field id="contactEmail" label="E-mail de contact" optional error={errors.contactEmail} className="sm:col-span-2">
            <IconInput
              icon={<AtSign strokeWidth={1.7} aria-hidden="true" />}
              id="contactEmail"
              type="email"
              inputMode="email"
              value={values.contactEmail}
              onChange={set('contactEmail')}
              placeholder="contact@maisonadama.sn"
              autoComplete="email"
              {...describe('contactEmail', errors.contactEmail)}
              className={cn(inputClass, inputState(errors.contactEmail), 'h-12')}
            />
          </Field>
        </div>
        {values.whatsappNumber && !values.contactPhone && (
          <button
            type="button"
            onClick={() => setValues((v) => ({ ...v, contactPhone: v.whatsappNumber }))}
            className="-mt-2 w-fit text-[0.8125rem] font-medium text-or-profond hover:underline"
          >
            Utiliser le numéro WhatsApp pour les appels
          </button>
        )}
      </SettingsSection>
    </form>
  );
}

/** Même règle que le serveur, pour afficher le numéro enregistré sans recharger. */
function normalize(value: string): string {
  const digits = value.replace(/[\s\-.()]/g, '').replace(/^(\+|00)/, '');
  const local = digits.length === 12 && digits.startsWith('221') ? digits.slice(3) : digits;
  return /^(7[015678]|33)\d{7}$/.test(local) ? `+221${local}` : `+${digits}`;
}
