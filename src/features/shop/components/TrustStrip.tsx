import Image from 'next/image';
import { Banknote, MessageCircle, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Les trois engagements de la Maison (livraison, paiement, conseil). */
export default function TrustStrip({ className }: { className?: string }) {
  return (
    <section aria-label="Nos engagements" className={cn('grid gap-3 md:grid-cols-3 md:gap-4', className)}>
      {[
        { icon: Truck, title: 'Livraison partout au Sénégal', text: 'Rapide à Dakar, 48 à 72 h en région', tone: 'bg-paille text-oud' },
        { icon: null, title: 'Wave ou paiement à la livraison', text: 'Vous payez comme vous préférez', tone: '' },
        { icon: MessageCircle, title: 'Conseil sur WhatsApp', text: 'Une question ? On vous répond', tone: 'bg-succes-fond text-succes' },
      ].map(({ icon: Icon, title, text, tone }) => (
        <div key={title} className="flex items-center gap-4 rounded-[26px] border border-filet bg-lin p-5">
          {Icon ? (
            <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', tone)}>
              <Icon className="size-[22px]" strokeWidth={1.6} aria-hidden="true" />
            </span>
          ) : (
            // Logo officiel Wave (rond) + pastille « billets » pour le paiement à la livraison.
            <span className="relative size-12 shrink-0">
              <span className="block size-12 overflow-hidden rounded-full shadow-[0_6px_16px_rgb(29_200_255/0.25)]">
                <Image src="/images/wave.png" alt="Wave" width={96} height={96} className="size-full scale-[1.06] object-cover" />
              </span>
              <span className="absolute -bottom-1 -right-1.5 grid size-6 place-items-center rounded-full bg-lin text-succes ring-2 ring-lin">
                <span className="grid size-full place-items-center rounded-full bg-succes-fond">
                  <Banknote className="size-3.5" strokeWidth={2} aria-hidden="true" />
                </span>
              </span>
            </span>
          )}
          <span className="flex flex-col gap-0.5">
            <strong className="text-[0.9375rem] font-semibold text-encre">{title}</strong>
            <span className="text-[0.8125rem] text-fumee">{text}</span>
          </span>
        </div>
      ))}
    </section>
  );
}
