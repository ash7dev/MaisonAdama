import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, MessageCircle, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import { whatsappLink, WHATSAPP_DEFAULT_MESSAGE } from '@/lib/whatsapp';
import { getStoreSettings } from '@/features/settings';
import { CollectionHero, HeroChip } from '@/features/shop/components/collections';
import { HelpBreadcrumb, HelpContact, HelpNav, HelpSection } from '@/features/help/components';

export const metadata: Metadata = {
  title: 'Comment commander · Maison Adama',
  description: 'Commander en ligne en cinq étapes, sans créer de compte : choix, panier, coordonnées, livraison et paiement, confirmation.',
  alternates: { canonical: '/aide/comment-commander' },
};

/** Miniatures de ce que le client verra réellement à l'écran. */
function Mini({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-[20px] border border-filet bg-white/70 p-4 shadow-[0_12px_30px_rgb(43_29_18/0.08)]">{children}</div>;
}
const field = 'flex h-10 items-center rounded-xl border border-filet bg-lin px-3 text-[0.8125rem] text-fumee';

const STEPS = [
  {
    title: 'Choisissez votre création',
    text: 'Parcourez la boutique par univers, ou répondez à trois questions dans « Trouver mon parfum ». Sur la fiche, choisissez la contenance.',
    links: [
      { href: '/boutique', label: 'La boutique' },
      { href: '/trouver-mon-parfum', label: 'Trouver mon parfum' },
    ],
    mini: (
      <Mini>
        <span className="text-[0.625rem] uppercase tracking-[0.2em] text-or-profond">Contenance</span>
        <span className="grid grid-cols-2 gap-2">
          <span className="flex h-11 flex-col justify-center rounded-xl border-2 border-oud bg-white px-3 text-xs"><strong>50 ml</strong></span>
          <span className="flex h-11 flex-col justify-center rounded-xl border border-filet bg-lin px-3 text-xs">100 ml</span>
        </span>
        <span className="flex h-11 items-center justify-center gap-2 rounded-full bg-oud text-xs font-semibold text-sur-oud">
          <ShoppingBag className="size-4" strokeWidth={1.8} aria-hidden="true" /> Ajouter au panier
        </span>
      </Mini>
    ),
  },
  {
    title: 'Vérifiez votre panier',
    text: 'Ajustez les quantités. Les prix sont revérifiés à chaque passage : promotions comprises, ce que vous voyez est ce que vous payez.',
    links: [{ href: '/panier', label: 'Mon panier' }],
    mini: (
      <Mini>
        <span className="flex items-center justify-between text-[0.8125rem]">
          <span className="font-display text-base text-encre">Votre création</span>
          <span className="flex items-center gap-2 rounded-full border border-filet px-2 py-1 text-xs">− 1 <Plus className="size-3" aria-hidden="true" /></span>
        </span>
        <span className="flex items-center justify-between border-t border-filet pt-2 text-[0.8125rem]"><span className="text-fumee">Sous-total</span><strong className="tabular-nums">prix affiché</strong></span>
      </Mini>
    ),
  },
  {
    title: 'Vos coordonnées',
    text: 'Aucun compte à créer. Votre nom et votre téléphone suffisent ; l’e-mail est facultatif.',
    links: [],
    mini: (
      <Mini>
        <span className={field}>Nom et prénom</span>
        <span className={field}>Téléphone</span>
        <span className={field}>E-mail · facultatif</span>
      </Mini>
    ),
  },
  {
    title: 'Livraison et paiement',
    text: 'Choisissez votre zone et donnez l’adresse avec un point de repère. Payez par Wave ou en espèces à la livraison ; le total, livraison comprise, s’affiche avant de valider.',
    links: [{ href: '/aide/livraison-et-paiement', label: 'Zones, délais et frais' }],
    mini: (
      <Mini>
        <span className={field}>Zone de livraison</span>
        <span className="grid grid-cols-2 gap-2">
          <span className="flex h-11 items-center justify-center rounded-xl border-2 border-[#1F5673] bg-[#DCEBF3] text-xs font-semibold text-[#1F5673]">Wave</span>
          <span className="flex h-11 items-center justify-center rounded-xl border border-filet bg-lin text-xs">À la livraison</span>
        </span>
      </Mini>
    ),
  },
  {
    title: 'Confirmation',
    text: 'Vous recevez un numéro de commande et une page de suivi : gardez son lien. La Maison vous appelle pour confirmer, puis prépare et livre votre colis.',
    links: [],
    mini: (
      <Mini>
        <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-succes"><Check className="size-4" strokeWidth={2.4} aria-hidden="true" /> Commande reçue</span>
        <span className="flex items-center gap-2 text-[0.8125rem] text-fumee"><span className="size-2 rounded-full bg-filet-fort" /> Confirmation par téléphone</span>
        <span className="flex items-center gap-2 text-[0.8125rem] text-fumee"><span className="size-2 rounded-full bg-filet-fort" /> Préparation</span>
        <span className="flex items-center gap-2 text-[0.8125rem] text-fumee"><span className="size-2 rounded-full bg-filet-fort" /> Livraison</span>
      </Mini>
    ),
  },
];

export default async function CommentCommanderPage() {
  const settings = await getStoreSettings();
  const wa = whatsappLink(settings?.whatsappNumber, WHATSAPP_DEFAULT_MESSAGE);
  const order = whatsappLink(settings?.whatsappNumber, 'Bonjour Maison Adama, je souhaite passer une commande.');

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-4 lg:gap-12 lg:px-10 lg:pb-20 lg:pt-8">
      <HelpBreadcrumb name="Comment commander" />
      <CollectionHero
        index="02"
        kicker="Aide · N°02"
        title="Comment commander"
        story="Cinq étapes, quelques minutes, aucun compte à créer. Voici exactement ce que vous verrez à l’écran, de la fiche produit jusqu’à la livraison."
        meta={
          <>
            <HeroChip>5 étapes</HeroChip>
            <HeroChip>Sans compte</HeroChip>
            <HeroChip>Wave ou espèces</HeroChip>
          </>
        }
      />
      <HelpNav current="comment-commander" />

      <HelpSection id="parcours" kicker="Le parcours" title="De l’étagère à votre porte">
        <ol className="relative flex flex-col">
          <span aria-hidden="true" className="absolute bottom-10 left-[1.4375rem] top-6 w-px bg-[linear-gradient(to_bottom,var(--color-or),var(--color-filet)_40%,var(--color-filet)_85%,transparent)] lg:left-[2.4375rem]" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative grid gap-5 pb-12 pl-16 last:pb-0 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:pl-28">
              <span className="absolute left-0 top-0 grid size-12 place-items-center rounded-full bg-oud font-display text-[1.375rem] text-or-clair ring-[6px] ring-sable lg:size-20 lg:text-[2.25rem]">
                {i + 1}
              </span>
              <div className="flex flex-col gap-3 pt-1.5 lg:pt-4">
                <h3 className="text-[1.5rem] leading-tight text-encre lg:text-[2rem]">{s.title}</h3>
                <p className="max-w-xl text-[0.9375rem] leading-relaxed text-fumee lg:text-base">{s.text}</p>
                {s.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {s.links.map((l) => (
                      <Link key={l.href} href={l.href} className="flex h-10 items-center gap-1.5 rounded-full border border-filet-fort px-4 text-[0.8125rem] font-semibold text-oud transition-colors duration-150 hover:bg-lin">
                        {l.label} <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div aria-hidden="true" className="lg:pt-2">{s.mini}</div>
            </li>
          ))}
        </ol>
      </HelpSection>

      {/* ═══ Autres façons ═══ */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-[28px] bg-[radial-gradient(90%_60%_at_50%_40%,#6B4526_0%,#3A2716_45%,#17100A_100%)] p-6 text-sur-oud lg:p-8">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or">Vous préférez écrire ?</span>
          <h2 className="text-[1.625rem] leading-tight lg:text-[2rem]">Commandez directement sur WhatsApp.</h2>
          <p className="text-[0.9375rem] leading-relaxed text-sur-oud/75">Dites-nous la création, la contenance et votre quartier : la Maison vous confirme le prix, la livraison et le paiement.</p>
          {order && (
            <a href={order} target="_blank" rel="noopener noreferrer" className="mt-2 flex h-[3.25rem] items-center justify-center gap-2 self-start rounded-full bg-sur-oud px-6 text-sm font-semibold text-encre transition-colors duration-150 hover:bg-paille">
              <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" /> Commander sur WhatsApp
            </a>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-[28px] border border-filet bg-paille/60 p-6 lg:p-8">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or-profond">Vous hésitez ?</span>
          <h2 className="text-[1.625rem] leading-tight text-encre lg:text-[2rem]">Trois questions, une sélection faite pour vous.</h2>
          <p className="text-[0.9375rem] leading-relaxed text-fumee">Pour vous ou pour offrir : la Maison vous oriente vers les bonnes familles olfactives et le bon budget.</p>
          <Link href="/trouver-mon-parfum" className="mt-2 flex h-[3.25rem] items-center justify-center gap-2 self-start rounded-full bg-oud px-6 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-encre">
            <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" /> Trouver mon parfum
          </Link>
        </div>
      </section>

      <HelpContact whatsapp={wa} phone={settings?.contactPhone ?? null} />
    </div>
  );
}
