import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, MessageCircle, PackageCheck, PhoneCall, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { formatFCFA } from '@/lib/money';
import { formatSenegalPhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/whatsapp';
import { productImageUrl } from '@/lib/supabase/storage';
import { getStoreSettings } from '@/features/settings';
import ProductVisual from '@/features/shop/components/ProductVisual';

export const metadata: Metadata = {
  title: 'Commande confirmée · Maison Adama',
  robots: { index: false },
};

type PageProps = { params: Promise<{ token: string }> };

const dateTime = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });

/** Page de confirmation : accessible seulement avec le jeton secret de la commande. */
export default async function OrderConfirmationPage({ params }: PageProps) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { publicToken: token },
      select: {
        orderNumber: true, createdAt: true, status: true, paymentMethod: true, paymentStatus: true, paymentReference: true,
        customerName: true, customerPhone: true, zoneName: true, city: true, address: true, landmark: true,
        subtotal: true, discountTotal: true, deliveryFee: true, total: true,
        items: {
          orderBy: { id: 'asc' },
          select: {
            productName: true, variantLabel: true, quantity: true, lineTotal: true, productId: true,
            product: { select: { slug: true, category: { select: { slug: true } }, images: { orderBy: { position: 'asc' }, take: 1, select: { storagePath: true } } } },
          },
        },
      },
    }),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const firstName = order.customerName.split(' ')[0];
  const wave = order.paymentMethod === 'WAVE';
  const paid = order.paymentStatus === 'PAYE';
  const waveCode = settings?.waveMerchantCode ?? null;
  const waveDisplay = waveCode ? (waveCode.startsWith('+221') ? formatSenegalPhone(waveCode) : waveCode) : null;
  const qr = productImageUrl(settings?.waveQrImagePath);
  const wa = whatsappLink(settings?.whatsappNumber, `Bonjour Maison Adama, je viens de passer la commande ${order.orderNumber}.`);
  const cancelled = order.status === 'ANNULEE';

  const steps = [
    { icon: Check, title: 'Commande reçue', text: dateTime.format(order.createdAt), done: true },
    { icon: PhoneCall, title: 'Confirmation', text: `La Maison vous appelle au ${formatSenegalPhone(order.customerPhone)}`, done: order.status !== 'EN_ATTENTE' },
    { icon: PackageCheck, title: 'Préparation', text: wave && !paid ? 'Dès réception de votre paiement Wave' : 'Emballée avec soin', done: ['EN_LIVRAISON', 'LIVREE'].includes(order.status) },
    { icon: Truck, title: 'Livraison', text: `${order.zoneName} · ${order.city}`, done: order.status === 'LIVREE' },
  ];

  return (
    <div className="mx-auto flex max-w-shop flex-col gap-8 px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-10">
      {/* ═══ Merci ═══ */}
      <section className="relative overflow-hidden rounded-[40px] bg-[radial-gradient(90%_80%_at_50%_0%,#6B4526_0%,#3A2716_55%,#17100A_100%)] px-6 py-12 text-center text-sur-oud lg:py-16">
        <span aria-hidden="true" className="absolute left-1/2 top-6 size-72 -translate-x-1/2 rounded-full border border-or-clair/15" />
        <div className="relative flex flex-col items-center gap-4">
          <span className="grid size-16 place-items-center rounded-full bg-sur-oud text-oud shadow-[0_0_0_8px_rgb(241_221_168/0.12)] motion-safe:animate-pop">
            <Check className="size-8" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="text-[0.6875rem] tracking-[0.3em] text-or-clair">COMMANDE {order.orderNumber}</span>
          <h1 className="text-[2.25rem] leading-tight lg:text-[3.25rem]">{cancelled ? 'Commande annulée' : `Merci ${firstName} !`}</h1>
          <p className="max-w-lg text-[0.9375rem] leading-relaxed text-sur-oud/80">
            {cancelled
              ? 'Cette commande a été annulée. Écrivez-nous pour toute question.'
              : `Votre commande est bien enregistrée. La Maison vous contacte très vite au ${formatSenegalPhone(order.customerPhone)} pour la confirmer.`}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
        <div className="flex flex-col gap-6">
          {/* ═══ Paiement Wave ═══ */}
          {wave && !cancelled && (
            <section aria-labelledby="wave-title" className={cn('flex flex-col gap-5 rounded-[32px] p-6 sm:p-7', paid ? 'bg-succes-fond' : 'bg-[#DCEBF3]')}>
              <h2 id="wave-title" className={cn('flex items-center gap-3 text-[1.5rem] leading-tight', paid ? 'text-succes' : 'text-[#1F5673]')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/wave.png" alt="" className="size-10 rounded-full object-cover" />
                {paid ? 'Paiement Wave reçu' : 'Payez avec Wave'}
              </h2>
              {paid ? (
                <p className="text-[0.9375rem] text-succes">Merci, votre paiement est confirmé. Nous préparons votre commande.</p>
              ) : (
                <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <ol className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed text-[#1F5673]">
                    <li><strong className="font-semibold">1.</strong> Ouvrez l’application Wave.</li>
                    <li>
                      <strong className="font-semibold">2.</strong> Envoyez <strong className="whitespace-nowrap font-bold">{formatFCFA(order.total)}</strong>
                      {waveDisplay ? <> au <strong className="whitespace-nowrap font-bold tabular-nums">{waveDisplay}</strong></> : qr ? ' en scannant le QR code' : ' (numéro communiqué par la Maison)'}.
                    </li>
                    <li><strong className="font-semibold">3.</strong> Indiquez <strong className="font-semibold">{order.orderNumber}</strong> en commentaire, puis gardez votre reçu.</li>
                    {order.paymentReference && <li className="text-sm">Référence indiquée : <strong className="font-semibold">{order.paymentReference}</strong></li>}
                  </ol>
                  {qr && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="QR code Wave de la Maison Adama" className="mx-auto size-40 rounded-2xl bg-white object-contain p-2 shadow-sm" />
                  )}
                </div>
              )}
            </section>
          )}

          {/* ═══ Suivi ═══ */}
          {!cancelled && (
            <section aria-labelledby="steps-title" className="flex flex-col gap-5 rounded-[32px] border border-filet bg-lin p-6 sm:p-7">
              <h2 id="steps-title" className="text-[1.5rem] leading-tight text-encre">La suite</h2>
              <ol className="flex flex-col">
                {steps.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3">
                    <span className="flex flex-col items-center">
                      <span className={cn('grid size-11 place-items-center rounded-full', s.done ? 'bg-oud text-sur-oud' : 'bg-sable text-fumee ring-1 ring-inset ring-filet')}>
                        <s.icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
                      </span>
                      {i < steps.length - 1 && <span className={cn('my-1 w-px flex-1', s.done ? 'bg-oud/40' : 'bg-filet')} />}
                    </span>
                    <span className="flex flex-col gap-0.5 pb-6 pt-2">
                      <strong className={cn('text-[0.9375rem] font-semibold', s.done ? 'text-encre' : 'text-fumee')}>{s.title}</strong>
                      <span className="text-[0.8125rem] text-fumee first-letter:uppercase">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-oud ring-1 ring-inset ring-filet-fort hover:bg-white">
                  <MessageCircle className="size-[18px]" strokeWidth={1.8} aria-hidden="true" /> Une question ? Écrire sur WhatsApp
                </a>
              )}
            </section>
          )}
        </div>

        {/* ═══ Récapitulatif ═══ */}
        <aside aria-labelledby="summary-title" className="flex flex-col gap-5 rounded-[36px] bg-oud p-6 text-sur-oud lg:sticky lg:top-[6.5rem] lg:p-7">
          <h2 id="summary-title" className="text-[1.5rem] leading-tight">Récapitulatif</h2>
          <ul className="flex flex-col gap-3.5">
            {order.items.map((i) => (
              <li key={`${i.productId}-${i.variantLabel}`} className="flex items-center gap-3">
                <span className="relative shrink-0">
                  <ProductVisual image={i.product.images[0] ? { path: i.product.images[0].storagePath, alt: null } : null} name={i.productName} categorySlug={i.product.category.slug} seed={i.productId} sizes="56px" bottleClassName="w-[40%]" className="h-16 w-[3.25rem] rounded-xl" />
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-sur-oud text-[0.6875rem] font-bold text-oud">{i.quantity}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{i.productName}</span>
                  <span className="text-xs text-sur-oud/65">{i.variantLabel}</span>
                </span>
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatFCFA(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2.5 border-t border-sur-oud/15 pt-4 text-[0.9375rem]">
            <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Sous-total</dt><dd className="whitespace-nowrap tabular-nums">{formatFCFA(order.subtotal)}</dd></div>
            {order.discountTotal > 0 && <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Vos économies</dt><dd className="whitespace-nowrap font-semibold tabular-nums text-[#C4DDAE]">−{formatFCFA(order.discountTotal)}</dd></div>}
            <div className="flex justify-between gap-4"><dt className="text-sur-oud/75">Livraison · {order.zoneName}</dt><dd className="whitespace-nowrap tabular-nums">{order.deliveryFee === 0 ? 'Offerte' : formatFCFA(order.deliveryFee)}</dd></div>
          </dl>
          <div className="flex items-baseline justify-between gap-4 border-t border-sur-oud/15 pt-4">
            <span className="text-sm text-sur-oud/75">{wave ? (paid ? 'Payé par Wave' : 'À payer par Wave') : 'À payer à la livraison'}</span>
            <span className="whitespace-nowrap font-display text-[2rem] leading-none tabular-nums">{formatFCFA(order.total)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-sur-oud/8 p-4 text-[0.8125rem] text-sur-oud/80">
            <strong className="font-semibold text-sur-oud">{order.customerName}</strong>
            <span>{order.address}, {order.city}</span>
            {order.landmark && <span>Repère : {order.landmark}</span>}
          </div>
          <Link href="/boutique" className="flex h-12 items-center justify-center rounded-full bg-sur-oud text-sm font-semibold text-encre hover:bg-paille">
            Continuer mes achats
          </Link>
        </aside>
      </div>
    </div>
  );
}
