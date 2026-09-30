'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loginAction, type LoginState } from '../actions';

const field =
  'h-14 w-full rounded-2xl border border-filet bg-lin px-4 text-base text-encre outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fumee/60 hover:border-filet-fort focus:border-or focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)]';

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl bg-erreur-fond px-4 py-3.5 text-sm leading-snug text-erreur motion-safe:animate-reveal"
        >
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-encre">
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.email}
          // Nouvelle erreur → nouveau champ : la valeur saisie est bien réaffichée.
          key={state.email ?? ''}
          aria-invalid={Boolean(state.error)}
          placeholder="vous@exemple.com"
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-encre">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            aria-invalid={Boolean(state.error)}
            className={cn(field, 'pr-14')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre"
          >
            {showPassword ? (
              <EyeOff className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
            ) : (
              <Eye className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 flex h-14 items-center justify-between rounded-full bg-oud pl-7 pr-2 text-[0.9375rem] font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-85"
      >
        {isPending ? 'Connexion en cours…' : 'Se connecter'}
        <span className="grid size-10 place-items-center rounded-full bg-sur-oud text-oud">
          {isPending ? (
            <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <ArrowRight className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          )}
        </span>
      </button>
    </form>
  );
}
