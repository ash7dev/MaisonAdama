import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { whatsappLink, WHATSAPP_DEFAULT_MESSAGE } from '@/lib/whatsapp';
import { getStoreSettings } from '@/features/settings';
import { CollectionHero, HeroChip } from '@/features/shop/components/collections';
import { HelpBreadcrumb, HelpContact, HelpNav } from '@/features/help/components';

export const metadata: Metadata = {
  title: 'Questions fréquentes · Maison Adama',
  description: 'Commande sans compte, paiement Wave ou à la livraison, suivi, livraison au Sénégal : les réponses de la Maison.',
  alternates: { canonical: '/aide/questions-frequentes' },
};

type QA = { q: string; a: React.ReactNode; text: string };
type Group = { id: string; title: string; items: QA[] };

const qa = (q: string, text: string, a?: React.ReactNode): QA => ({ q, text, a: a ?? text });

const GROUPS: Group[] = [
  {
    id: 'commande',
    title: 'Commander',
    items: [
      qa('Faut-il créer un compte ?', 'Non. Votre nom et votre téléphone suffisent pour commander ; l’e-mail est facultatif.'),
      qa(
        'Comment suivre ma commande ?',
        'Après validation, vous arrivez sur une page de suivi avec votre numéro de commande. Gardez son lien : elle indique chaque étape, de la confirmation à la livraison.',
      ),
      qa(
        'La Maison me contacte-t-elle ?',
        'Oui. Chaque commande est confirmée par un appel au numéro que vous avez indiqué, avant la préparation et la livraison.',
      ),
      qa(
        'Puis-je modifier ou annuler ma commande ?',
        'Écrivez à la Maison sur WhatsApp le plus tôt possible, en indiquant votre numéro de commande : elle vous répond et ajuste ce qui peut l’être.',
      ),
      qa('Puis-je commander sur WhatsApp ?', 'Oui. Indiquez la création, la contenance et votre quartier : la Maison vous confirme le prix, la livraison et le paiement.'),
    ],
  },
  {
    id: 'paiement',
    title: 'Payer',
    items: [
      qa('Quels moyens de paiement acceptez-vous ?', 'Wave, ou les espèces à la livraison, au choix au moment de commander.'),
      qa(
        'Comment payer avec Wave ?',
        'Choisissez « Wave » en commandant. La page de confirmation affiche le numéro Wave de la Maison (ou son QR code) et le montant exact ; la préparation commence dès réception du paiement.',
      ),
      qa(
        'Le prix affiché est-il celui que je paie ?',
        'Oui. Les promotions sont déjà déduites et les prix sont revérifiés au moment de valider. Seuls les frais de livraison de votre zone s’ajoutent, et le total s’affiche avant validation.',
      ),
    ],
  },
  {
    id: 'livraison',
    title: 'Être livré',
    items: [
      qa(
        'Où livrez-vous, et à quel prix ?',
        'Les zones desservies, leurs délais et leurs frais sont affichés sur la page Livraison et paiement, et au moment de commander.',
        <>
          Les zones desservies, leurs délais et leurs frais sont affichés sur la page{' '}
          <Link href="/aide/livraison-et-paiement" className="font-semibold text-oud underline underline-offset-4">Livraison et paiement</Link>, et au moment de commander.
        </>,
      ),
      qa(
        'Ma zone n’apparaît pas, que faire ?',
        'Écrivez à la Maison sur WhatsApp avec votre quartier ou votre ville : elle vous dit si une livraison est possible, avec le délai et le prix.',
      ),
      qa('Que dois-je indiquer pour le livreur ?', 'Votre adresse, et si possible un point de repère : tout ce qui aide le livreur à vous trouver du premier coup.'),
    ],
  },
  {
    id: 'creations',
    title: 'Choisir',
    items: [
      qa(
        'Je ne sais pas quoi choisir.',
        'Répondez à trois questions dans « Trouver mon parfum », pour vous ou pour offrir, ou demandez conseil à la Maison sur WhatsApp.',
        <>
          Répondez à trois questions dans{' '}
          <Link href="/trouver-mon-parfum" className="font-semibold text-oud underline underline-offset-4">Trouver mon parfum</Link>, pour vous ou pour offrir, ou demandez conseil à la Maison sur WhatsApp.
        </>,
      ),
      qa('Une création est épuisée.', 'Écrivez à la Maison sur WhatsApp : elle vous prévient à son retour ou vous propose une création proche.'),
      qa('Plusieurs contenances existent-elles ?', 'Selon les créations, oui : les contenances disponibles et leurs prix s’affichent sur chaque fiche produit.'),
    ],
  },
];

export default async function QuestionsFrequentesPage() {
  const settings = await getStoreSettings();
  const wa = whatsappLink(settings?.whatsappNumber, WHATSAPP_DEFAULT_MESSAGE);
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GROUPS.flatMap((g) => g.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.text } }))),
  };

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-4 lg:gap-12 lg:px-10 lg:pb-20 lg:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <HelpBreadcrumb name="Questions fréquentes" />
      <CollectionHero
        index="03"
        kicker="Aide · N°03"
        title="Questions fréquentes"
        story="Les questions qu’on pose le plus souvent à la Maison, avec des réponses claires. Et si la vôtre n’y est pas, une vraie personne vous répond sur WhatsApp."
        meta={
          <>
            <HeroChip>{total} réponses</HeroChip>
            <HeroChip>{GROUPS.length} rubriques</HeroChip>
          </>
        }
      />
      <HelpNav current="questions-frequentes" />

      <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
        {/* Sommaire, comme dans un journal */}
        <nav aria-label="Rubriques" className="self-start lg:sticky lg:top-32">
          <div className="flex flex-col border border-encre bg-lin px-5 pb-2 pt-4 outline outline-1 outline-offset-4 outline-encre">
            <span className="pb-1 font-display text-[1.625rem] text-encre">Sommaire</span>
            {GROUPS.map((g, i) => (
              <a key={g.id} href={`#${g.id}`} className="flex items-baseline gap-2 border-b border-dashed border-filet-fort py-3 last:border-0">
                <span className="w-6 font-display text-sm text-or">0{i + 1}</span>
                <span className="shrink-0 font-display text-[1.1875rem] text-encre">{g.title}</span>
                <span aria-hidden="true" className="flex-1 -translate-y-1 border-b-2 border-dotted border-filet-fort" />
                <span className="text-xs font-semibold text-oud">{g.items.length}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-12">
          {GROUPS.map((g, i) => (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="flex scroll-mt-32 flex-col gap-4">
              <div className="flex items-baseline gap-3 border-b-2 border-encre pb-3">
                <span className="font-display text-[1.25rem] text-or">0{i + 1}</span>
                <h2 id={`${g.id}-title`} className="text-[1.75rem] leading-none text-encre lg:text-[2.25rem]">{g.title}</h2>
              </div>
              <div className="flex flex-col">
                {g.items.map((item) => (
                  <details key={item.q} name={`faq-${g.id}`} className="group border-b border-filet">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
                      <span className="font-display text-[1.125rem] leading-snug text-encre lg:text-[1.3125rem]">{item.q}</span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-inset ring-filet-fort transition-colors duration-150 group-open:bg-oud group-open:text-sur-oud group-open:ring-oud">
                        <Plus className="size-4 transition-transform duration-250 ease-out-soft group-open:rotate-45" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    </summary>
                    <p className="max-w-2xl pb-6 pr-12 text-[0.9375rem] leading-relaxed text-fumee">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <HelpContact whatsapp={wa} phone={settings?.contactPhone ?? null} />
    </div>
  );
}
