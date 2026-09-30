'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { changePasswordAction, type PasswordState } from '../actions';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../password-policy';

const field =
  'h-14 w-full rounded-2xl border bg-lin px-4 pr-14 text-base text-encre outline-none transition-[border-color,box-shadow] duration-150 hover:border-filet-fort focus:border-or focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)]';

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<PasswordState, FormData>(changePasswordAction, {});
  const [visible, setVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const fields: Array<{ name: FieldName; label: string; autoComplete: string; hint?: string }> = [
    { name: 'currentPassword', label: 'Mot de passe actuel', autoComplete: 'current-password' },
    {
      name: 'newPassword',
      label: 'Nouveau mot de passe',
      autoComplete: 'new-password',
      hint: `Au moins ${MIN_PASSWORD_LENGTH} caractères. Une phrase courte et personnelle est idéale.`,
    },
    { name: 'confirmPassword', label: 'Confirmer le nouveau mot de passe', autoComplete: 'new-password' },
  ];

  const strength = Math.min(newPassword.length / (MIN_PASSWORD_LENGTH + 4), 1);

  return (
    // key : un succès vide le formulaire (nouveau montage des champs).
    <form key={state.success ? 'done' : 'form'} action={formAction} className="flex flex-col gap-5" noValidate>
      {state.success && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-succes-fond px-4 py-3.5 text-sm leading-snug text-succes">
          <CheckCircle2 className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Mot de passe modifié. Vos autres appareils ont été déconnectés.
        </div>
      )}
      {state.error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-erreur-fond px-4 py-3.5 text-sm leading-snug text-erreur">
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {state.error}
        </div>
      )}

      {fields.map(({ name, label, autoComplete, hint }) => {
        const error = state.fieldErrors?.[name];
        return (
          <div key={name} className="flex flex-col gap-2">
            <label htmlFor={name} className="text-sm font-medium text-encre">
              {label}
            </label>
            <div className="relative">
              <input
                id={name}
                name={name}
                type={visible ? 'text' : 'password'}
                required
                autoComplete={autoComplete}
                maxLength={MAX_PASSWORD_LENGTH}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
                onChange={name === 'newPassword' ? (e) => setNewPassword(e.target.value) : undefined}
                className={cn(field, error ? 'border-erreur' : 'border-filet')}
              />
              {name === 'currentPassword' && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                  aria-pressed={visible}
                  className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre"
                >
                  {visible ? (
                    <EyeOff className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
                  )}
                </button>
              )}
            </div>

            {name === 'newPassword' && (
              <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-filet">
                <div
                  className={cn(
                    'h-full origin-left rounded-full transition-[transform,background-color] duration-250 ease-out-soft',
                    newPassword.length >= MIN_PASSWORD_LENGTH ? 'bg-succes' : 'bg-or',
                  )}
                  style={{ transform: `scaleX(${strength})` }}
                />
              </div>
            )}

            {error ? (
              <p id={`${name}-error`} className="text-sm text-erreur">
                {error}
              </p>
            ) : (
              hint && (
                <p id={`${name}-hint`} className="text-sm text-fumee">
                  {hint}
                </p>
              )
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 flex h-14 items-center justify-center gap-2.5 rounded-full bg-oud px-7 text-[0.9375rem] font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-85 sm:self-start"
      >
        {isPending && <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />}
        {isPending ? 'Enregistrement…' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}
