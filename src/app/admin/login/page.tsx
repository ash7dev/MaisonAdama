import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ClipboardList, PackageCheck, Tag } from 'lucide-react';
import { getAdminSession } from '@/features/auth/require-admin';
import LoginForm from '@/features/auth/components/LoginForm';

export const metadata: Metadata = {
  title: 'Connexion · Administration Maison Adama',
};

const TASKS = [
  { icon: ClipboardList, label: 'Commandes et paiements Wave' },
  { icon: PackageCheck, label: 'Stock et réassorts' },
  { icon: Tag, label: 'Produits et promotions' },
];

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Déjà connecté en tant qu'admin : directement au tableau de bord.
  if (await getAdminSession()) redirect('/admin');
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh gap-3 bg-sable p-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-4 lg:p-6">
      {/* ── Panneau de marque (desktop) ─────────────────────────────── */}
      <section className="relative hidden flex-col justify-between overflow-hidden rounded-[40px] bg-oud p-10 text-sur-oud lg:flex xl:p-14">
        <Link href="/" className="flex items-center gap-3.5 self-start rounded-full">
          <Image
            src="/images/logomasonAdama.jpg"
            alt=""
            width={112}
            height={112}
            priority
            className="size-14 rounded-full ring-2 ring-or/45"
          />
          <span className="flex flex-col gap-1.5">
            <span className="font-display text-[1.5rem] leading-none">Maison Adama</span>
            <span className="text-[0.59375rem] leading-none tracking-[0.34em] text-or-clair">TCHURAYY · DAKAR</span>
          </span>
        </Link>

        <div className="relative flex max-w-[34rem] flex-col gap-6">
          <p className="text-[0.71875rem] tracking-[0.3em] text-or-clair">ESPACE ADMINISTRATEUR</p>
          <h1 className="text-[3.25rem] leading-[1.04] text-sur-oud">Toute la maison, au même endroit.</h1>
          <ul className="mt-2 flex flex-col gap-3">
            {TASKS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3.5 text-[0.9375rem] text-sur-oud/75">
                <span className="grid size-9 place-items-center rounded-full ring-1 ring-inset ring-sur-oud/20">
                  <Icon className="size-4 text-or-clair" strokeWidth={1.7} aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p
          aria-hidden="true"
          className="pointer-events-none -mx-1 -mb-[0.3em] select-none whitespace-nowrap font-display text-[clamp(5rem,9vw,8.5rem)] leading-[0.9] text-transparent [-webkit-text-stroke:1px_rgb(217_180_94/0.3)]"
        >
          Maison Adama
        </p>
      </section>

      {/* ── Formulaire ──────────────────────────────────────────────── */}
      <section className="flex flex-col rounded-[32px] bg-lin px-5 py-6 sm:px-10 lg:rounded-[40px] lg:px-14 lg:py-10">
        <Link
          href="/"
          className="flex h-11 items-center gap-2 self-start rounded-full pr-3 text-sm text-fumee transition-colors duration-150 hover:text-encre"
        >
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Retour à la boutique
        </Link>

        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-9 py-10">
          {/* Marque (mobile) */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image
              src="/images/logomasonAdama.jpg"
              alt=""
              width={96}
              height={96}
              priority
              className="size-12 rounded-full ring-1 ring-filet"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-[1.25rem] leading-none text-oud">Maison Adama</span>
              <span className="text-[0.5625rem] leading-none tracking-[0.3em] text-or-profond">ADMINISTRATION</span>
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[2.25rem] leading-[1.08] text-encre">Connexion</h2>
            <p className="text-[0.9375rem] leading-relaxed text-fumee">
              Accès réservé à l’équipe Maison Adama.
            </p>
          </div>

          <LoginForm next={next} />
        </div>

        <p className="text-center text-[0.8125rem] leading-relaxed text-fumee">
          Mot de passe oublié ? Contactez le propriétaire de la boutique.
        </p>
      </section>
    </main>
  );
}
