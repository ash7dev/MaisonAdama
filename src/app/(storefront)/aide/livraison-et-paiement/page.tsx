import type { Metadata } from 'next';
import Link from 'next/link';
import { Banknote, Clock, MapPin, PhoneCall, Receipt, Truck } from 'lucide-react';
import { formatFCFA } from '@/lib/money';
import { whatsappLink, WHATSAPP_DEFAULT_MESSAGE } from '@/lib/whatsapp';
import { getStoreSettings } from '@/features/settings';
import { getActiveDeliveryZones } from '@/features/delivery';
import { CollectionHero, HeroChip } from '@/features/shop/components/collections';
import { HelpBreadcrumb, HelpContact, HelpNav, HelpSection } from '@/features/help/components';

export const metadata: Metadata = {
  title: 'Livraison et paiement · Maison Adama',
  description: 'Zones, délais et frais de livraison au Sénégal. Paiement par Wave ou en espèces à la livraison.',
  alternates: { canonical: '/aide/livraison-et-paiement' },
};

export default async function LivraisonPaiementPage() {
  const [zones, settings] = await Promise.all([getActiveDeliveryZones(), getStoreSettings()]);
  const wa = whatsappLink(settings?.whatsappNumber, WHATSAPP_DEFAULT_MESSAGE);
  const cheapest = zones.length ? Math.min(...zones.map((z) => z.defaultFee)) : null;

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-4 lg:gap-12 lg:px-10 lg:pb-20 lg:pt-8">
      <HelpBreadcrumb name="Livraison et paiement" />
      <CollectionHero
        index="01"
        kicker="Aide · N°01"
        title="Livraison et paiement"
        story="Où nous livrons, en combien de temps, à quel prix, et comment régler : tout est ici, tel que vous le verrez au moment de commander."
        meta={
          <>
            <HeroChip>{zones.length ? `${zones.length} zone${zones.length > 1 ? 's' : ''} desservie${zones.length > 1 ? 's' : ''}` : 'Zones en préparation'}</HeroChip>
            {cheapest !== null && <HeroChip>Livraison dès {formatFCFA(cheapest)}</HeroChip>}
            <HeroChip>Wave ou espèces</HeroChip>
          </>
        }
      />
      <HelpNav current="livraison-et-paiement" />

      {/* ═══ Tableau des départs ═══ */}
      <HelpSection id="zones" kicker="Livraison" title="Le tableau des départs">
        <div className="overflow-hidden rounded-[28px] bg-[#17100A] text-sur-oud shadow-[0_24px_60px_rgb(43_29_18/0.25)] ring-1 ring-inset ring-or/20">
          <div className="flex items-center justify-between gap-4 border-b border-or/15 px-5 py-4 lg:px-8">
            <span className="flex items-center gap-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-or">
              <Truck className="size-4" strokeWidth={1.8} aria-hidden="true" /> Départs de Dakar
            </span>
            <span className="flex items-center gap-2 text-xs text-sur-oud/60">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-succes motion-safe:animate-pulse" /> Mis à jour par la Maison
            </span>
          </div>
          {zones.length > 0 ? (
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Zones de livraison, délais et frais</caption>
              <thead>
                <tr className="text-[0.625rem] uppercase tracking-[0.22em] text-sur-oud/50">
                  <th scope="col" className="px-5 py-3 font-medium lg:px-8">Destination</th>
                  <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">Région</th>
                  <th scope="col" className="px-3 py-3 font-medium">Délai</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium lg:px-8">Frais</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className="border-t border-sur-oud/[0.07] transition-colors duration-150 hover:bg-sur-oud/[0.04]">
                    <th scope="row" className="px-5 py-4 font-display text-[1.125rem] font-normal text-sur-oud lg:px-8 lg:text-[1.375rem]">
                      {z.name}
                      <span className="block font-sans text-xs text-sur-oud/50 md:hidden">{z.region}</span>
                    </th>
                    <td className="hidden px-3 py-4 text-sm text-sur-oud/70 md:table-cell">{z.region}</td>
                    <td className="whitespace-nowrap px-3 py-4 font-mono text-sm tracking-wide text-or-clair">{z.estimatedDelay ?? 'À confirmer'}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm font-semibold tracking-wide text-sur-oud lg:px-8">{formatFCFA(z.defaultFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="font-mono text-sm tracking-[0.3em] text-or-clair motion-safe:animate-pulse">— — — AFFICHAGE EN COURS — — —</span>
              <p className="max-w-md text-[0.9375rem] leading-relaxed text-sur-oud/70">
                La Maison prépare ses zones de livraison en ligne. En attendant, elle livre sur commande WhatsApp : écrivez-nous votre quartier, on vous donne le délai et le prix.
              </p>
            </div>
          )}
        </div>
        <ul className="grid gap-3 md:grid-cols-3">
          {[
            { icon: MapPin, title: 'Choisissez votre zone', text: 'Au moment de commander, avec votre adresse et un point de repère pour le livreur.' },
            { icon: Receipt, title: 'Frais affichés avant', text: 'Le total, livraison comprise, s’affiche avant que vous validiez. Aucune surprise.' },
            { icon: PhoneCall, title: 'La Maison vous appelle', text: 'Chaque commande est confirmée par téléphone avant le départ du colis.' },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4 rounded-[22px] border border-filet bg-lin p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paille text-oud">
                <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-1">
                <strong className="text-[0.9375rem] font-semibold text-encre">{title}</strong>
                <span className="text-[0.8125rem] leading-relaxed text-fumee">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </HelpSection>

      {/* ═══ Paiement ═══ */}
      <HelpSection id="paiement" kicker="Paiement" title="Deux façons de régler">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-[28px] bg-[#DCEBF3] p-6 text-[#1F5673] lg:p-8">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/wave.png" alt="" className="size-12 rounded-full object-cover" />
              <div className="flex flex-col">
                <h3 className="text-[1.625rem] leading-tight">Wave</h3>
                <span className="text-[0.8125rem] opacity-80">Payez tout de suite, depuis votre téléphone</span>
              </div>
            </div>
            <ol className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed">
              {[
                'Validez votre commande en choisissant « Wave ».',
                'La page de confirmation affiche un bouton « Payer avec Wave » : Wave s’ouvre avec le montant exact déjà rempli.',
                'Validez le paiement dans l’application Wave, et gardez votre reçu.',
                'La préparation commence dès réception. Vous pouvez aussi indiquer la référence de la transaction au moment de commander.',
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#1F5673] text-xs font-bold text-white">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="flex flex-col gap-5 rounded-[28px] bg-succes-fond p-6 text-succes lg:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-lin">
                <Banknote className="size-6" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div className="flex flex-col">
                <h3 className="text-[1.625rem] leading-tight">À la livraison</h3>
                <span className="text-[0.8125rem] opacity-80">En espèces, quand le colis arrive</span>
              </div>
            </div>
            <ol className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed">
              {[
                'Validez votre commande en choisissant « À la livraison ».',
                'La Maison vous appelle pour confirmer la commande et le créneau.',
                'Vous réglez le livreur en espèces, à la réception du colis.',
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-succes text-xs font-bold text-white">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <p className="mt-auto flex items-center gap-2 text-[0.8125rem] opacity-80">
              <Clock className="size-4" strokeWidth={1.8} aria-hidden="true" /> Le montant à régler reste affiché sur votre page de commande.
            </p>
          </article>
        </div>
        <p className="text-[0.875rem] text-fumee">
          Le prix affiché est celui que vous payez : les promotions sont déjà déduites et revérifiées au moment de valider. Des questions sur une commande ?{' '}
          <Link href="/aide/questions-frequentes" className="font-semibold text-oud underline underline-offset-4">Consultez les questions fréquentes</Link>.
        </p>
      </HelpSection>

      <HelpContact whatsapp={wa} phone={settings?.contactPhone ?? null} />
    </div>
  );
}
