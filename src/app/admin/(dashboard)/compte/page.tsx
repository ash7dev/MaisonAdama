import type { Metadata } from 'next';
import { MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/features/auth/require-admin';
import { logoutEverywhereAction } from '@/features/auth/actions';
import ChangePasswordForm from '@/features/auth/components/ChangePasswordForm';
import { ROLE_LABEL } from '@/features/auth/roles';

export const metadata: Metadata = {
  title: 'Mon compte · Administration Maison Adama',
};

export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-10 lg:px-8 lg:pt-14">
      <div className="flex flex-col gap-2">
        <p className="text-[0.71875rem] tracking-[0.3em] text-or-profond">ADMINISTRATION</p>
        <h1 className="text-title-lg text-encre">Mon compte</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          {/* Identité */}
          <section className="flex flex-col gap-5 rounded-[32px] bg-oud p-7 text-sur-oud">
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-full bg-sur-oud font-display text-[1.5rem] text-oud"
            >
              {admin.fullName.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-title-md text-sur-oud">{admin.fullName}</h2>
              <p className="break-all text-[0.9375rem] text-sur-oud/70">{admin.email}</p>
            </div>
            <p className="flex h-8 items-center gap-2 self-start rounded-full px-3.5 text-xs font-medium ring-1 ring-inset ring-sur-oud/25">
              <ShieldCheck className="size-3.5 text-or-clair" strokeWidth={1.8} aria-hidden="true" />
              {ROLE_LABEL[admin.role]}
            </p>
          </section>

          {/* Sessions */}
          <section className="flex flex-col gap-4 rounded-[32px] border border-filet bg-lin p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-sable">
                <MonitorSmartphone className="size-[18px] text-or-profond" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <h2 className="text-title-sm text-encre">Appareils connectés</h2>
            </div>
            <p className="text-[0.9375rem] leading-relaxed text-fumee">
              Votre session reste ouverte sur chaque appareil jusqu’à ce que vous vous déconnectiez. En cas de
              téléphone perdu ou d’ordinateur partagé, fermez toutes les sessions d’un coup.
            </p>
            <form action={logoutEverywhereAction}>
              <button
                type="submit"
                className="flex h-12 items-center gap-2 rounded-full border border-erreur/40 px-5 text-sm font-medium text-erreur transition-colors duration-150 hover:bg-erreur-fond"
              >
                Déconnecter tous mes appareils
              </button>
            </form>
          </section>
        </div>

        {/* Mot de passe */}
        <section className="flex flex-col gap-6 rounded-[32px] border border-filet bg-lin p-7 lg:p-10">
          <div className="flex flex-col gap-2">
            <h2 className="text-title-md text-encre">Mot de passe</h2>
            <p className="text-[0.9375rem] leading-relaxed text-fumee">
              Après le changement, vos autres appareils devront se reconnecter avec le nouveau mot de passe.
            </p>
          </div>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
