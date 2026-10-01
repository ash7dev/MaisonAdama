import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Flame, HandCoins, MessageCircle, PhoneCall, Sparkles, Truck, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { whatsappLink, WHATSAPP_DEFAULT_MESSAGE } from '@/lib/whatsapp';
import { getStoreSettings } from '@/features/settings';
import { getShopFacets } from '@/features/shop/queries';
import { SHOP_CATEGORIES } from '@/components/layout/nav-config';
import { Bottle } from '@/features/shop/components/ProductVisual';
import Cuuraay from '@/features/home/Cuuraay';

export const metadata: Metadata = {
  title: 'La Maison · Maison Adama Tchurayy',
  description:
    'Une parfumerie de Dakar, née du thiouraye : parfums, muscs, huiles, oud et encens choisis et préparés à Dakar, livrés partout au Sénégal.',
  alternates: { canonical: '/a-propos' },
};

export const revalidate = 300;

const VELVET =
  'linear-gradient(90deg, rgb(0 0 0 / 0.14) 0 1px, transparent 1px 100%) 0 0 / 7px 100%, radial-gradient(100% 80% at 70% 30%, #4A3222 0%, #2B1D12 60%, #1C130C 100%)';

const RITUAL = [
  { icon: Flame, title: 'On allume les braises', text: 'Quelques charbons rougissent dans le brûle-parfum en terre.' },
  { icon: Sparkles, title: 'On dépose le thiouraye', text: 'Une pincée de grains parfumés sur les braises, pas davantage.' },
  { icon: Wind, title: 'La fumée parfume', text: 'La maison, les boubous et les draps s’imprègnent, pour des heures.' },
];

const PROMISES = [
  { icon: Sparkles, title: 'Choisis et préparés à Dakar', text: 'Chaque création est sélectionnée et préparée par la Maison.' },
  { icon: PhoneCall, title: 'Chaque commande confirmée', text: 'La Maison vous appelle avant de préparer votre colis.' },
  { icon: Truck, title: 'Livraison partout au Sénégal', text: 'Rapide à Dakar, 48 à 72 h en région.' },
  { icon: HandCoins, title: 'Wave ou à la livraison', text: 'Vous payez comme vous préférez, sans compte à créer.' },
];

export default async function LaMaisonPage() {
  const [facets, settings] = await Promise.all([getShopFacets().catch(() => null), getStoreSettings()]);
  const counts = new Map((facets?.univers ?? []).map((u) => [u.slug, u.count]));
  const wa = whatsappLink(settings?.whatsappNumber, WHATSAPP_DEFAULT_MESSAGE);

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-16 px-4 pb-16 pt-4 lg:gap-24 lg:px-10 lg:pb-20 lg:pt-8">
      {/* ═══ Ouverture : le brûle-parfum ═══ */}
      <section
        aria-labelledby="maison-title"
        className="relative isolate overflow-hidden rounded-[32px] text-sur-oud lg:rounded-[40px]"
        style={{ background: VELVET }}
      >
        <span aria-hidden="true" className="absolute inset-3 -z-10 rounded-[24px] border border-or-clair/15 lg:inset-4 lg:rounded-[30px]" />
        <div className="grid items-end gap-6 px-6 pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:px-16 lg:pt-16">
          <div className="flex flex-col gap-5 pb-2 lg:pb-16">
            <p className="flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-or-clair">
              <span aria-hidden="true" className="h-px w-8 bg-or-clair/60" />
              La Maison · Dakar
            </p>
            <h1 id="maison-title" className="text-[2.75rem] leading-[0.95] lg:text-[4.75rem]">
              Une parfumerie de Dakar, née du thiouraye.
            </h1>
            <p className="max-w-xl text-[0.9375rem] leading-relaxed text-sur-oud/75 lg:text-[1.0625rem]">
              Maison Adama Tchurayy choisit et prépare à Dakar des parfums, des muscs, des huiles, de l’oud et du thiouraye. Une Maison où chaque
              création est choisie avec soin, et où l’on prend le temps de vous conseiller.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link href="/boutique" className="flex h-[3.25rem] items-center gap-2 rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille">
                Entrer dans la boutique <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link href="/trouver-mon-parfum" className="flex h-[3.25rem] items-center gap-2 rounded-full border border-sur-oud/30 px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-sur-oud/10">
                <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" /> Trouver mon parfum
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-[15rem] lg:w-[20rem]">
            <span aria-hidden="true" className="absolute bottom-[12%] left-1/2 -z-10 h-40 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(240_140_60/0.35),transparent)] blur-xl" />
            <Cuuraay className="w-full" />
          </div>
        </div>
      </section>

      {/* ═══ Le nom ═══ */}
      <section aria-labelledby="nom-title" className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">Le nom</span>
          <h2 id="nom-title" className="text-[2.25rem] leading-none text-encre lg:text-[3.25rem]">
            Tchurayy
          </h2>
        </div>
        <div className="flex flex-col gap-4 text-[1rem] leading-relaxed text-fumee lg:text-[1.125rem]">
          <p>
            <strong className="font-semibold text-encre">Tchurayy, c’est le thiouraye</strong> : l’encens du Sénégal, un mélange de bois et de
            grains parfumés que l’on fait brûler pour parfumer la maison et les vêtements.
          </p>
          <p>
            Un geste du quotidien et des grands jours, transmis de génération en génération. La Maison en a fait son nom, et le point de départ de
            toutes ses créations.
          </p>
        </div>
      </section>

      {/* ═══ Le rituel ═══ */}
      <section aria-labelledby="rituel-title" className="flex flex-col gap-6 lg:gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">Le rituel</span>
          <h2 id="rituel-title" className="text-[1.875rem] leading-none text-encre lg:text-[2.75rem]">
            Le thiouraye, en trois gestes
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3 lg:gap-6">
          {RITUAL.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] border border-filet bg-lin p-6 lg:p-8">
              <span aria-hidden="true" className="absolute -right-2 -top-6 font-display text-[7rem] leading-none text-paille/70">
                {i + 1}
              </span>
              <span className="relative grid size-12 place-items-center rounded-2xl bg-oud text-or-clair">
                <Icon className="size-[22px]" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="relative flex flex-col gap-1.5">
                <strong className="font-display text-[1.375rem] font-normal leading-tight text-encre">{title}</strong>
                <span className="text-[0.9375rem] leading-relaxed text-fumee">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/boutique?univers=encens" className="flex items-center gap-2 self-start text-sm font-semibold text-oud underline-offset-4 hover:underline">
          Le thiouraye et les encens de la Maison <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </section>

      {/* ═══ Les univers ═══ */}
      <section aria-labelledby="univers-title" className="flex flex-col gap-6 lg:gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">Les univers</span>
          <h2 id="univers-title" className="text-[1.875rem] leading-none text-encre lg:text-[2.75rem]">
            Cinq façons de se parfumer
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-5 lg:gap-4">
          {SHOP_CATEGORIES.map((c, i) => {
            const count = counts.get(c.slug) ?? 0;
            return (
              <li key={c.slug} className={cn(i === 4 && 'col-span-2 md:col-span-1')}>
                <Link
                  href={`/boutique?univers=${c.slug}`}
                  className="group flex h-full flex-col gap-4 rounded-[24px] border border-filet bg-lin p-4 transition-colors duration-150 hover:border-oud lg:p-5"
                >
                  <span className={cn('grid aspect-[4/3] place-items-center rounded-[18px]', c.tint)}>
                    <Bottle categorySlug={c.slug} fill="#4A2E1C" shine="rgba(250,245,236,.35)" className="h-auto w-[26%] transition-transform duration-300 group-hover:-translate-y-1" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <strong className="font-display text-[1.25rem] font-normal text-encre">{c.label}</strong>
                    <span className="text-[0.8125rem] text-fumee">{c.hint}</span>
                    <span className={cn('pt-1 text-xs font-semibold', count ? 'text-oud' : 'italic text-or-profond')}>
                      {count ? `${count} création${count > 1 ? 's' : ''}` : 'Bientôt'}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ═══ Ce que la Maison promet ═══ */}
      <section aria-labelledby="promesses-title" className="flex flex-col gap-6 lg:gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">Nos engagements</span>
          <h2 id="promesses-title" className="text-[1.875rem] leading-none text-encre lg:text-[2.75rem]">
            Ce que la Maison promet
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3 rounded-[24px] border border-filet bg-lin p-5 lg:p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-paille text-oud">
                <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <strong className="text-[0.9375rem] font-semibold text-encre">{title}</strong>
              <span className="text-[0.8125rem] leading-relaxed text-fumee">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ Conseil ═══ */}
      <section
        className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[32px] px-6 py-10 text-sur-oud lg:flex-row lg:items-center lg:justify-between lg:rounded-[40px] lg:px-14 lg:py-12"
        style={{ background: VELVET }}
      >
        <div className="flex max-w-xl flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or">Une vraie personne vous répond</span>
          <h2 className="text-[1.75rem] leading-tight lg:text-[2.375rem]">Une question, un cadeau à choisir ? Écrivez à la Maison.</h2>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille">
              <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" /> Écrire sur WhatsApp
            </a>
          )}
          <Link href="/aide/questions-frequentes" className="flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-sur-oud/30 px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-sur-oud/10">
            Questions fréquentes
          </Link>
        </div>
      </section>
    </div>
  );
}
