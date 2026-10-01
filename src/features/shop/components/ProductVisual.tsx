import Image from 'next/image';
import { cn } from '@/lib/utils';
import { productImageUrl } from '@/lib/supabase/storage';

/**
 * Visuel d'un produit : la photo si elle existe, sinon un flacon dessiné,
 * propre à l'univers, sur un fond de la palette de la Maison. Une boutique
 * sans photo reste ainsi élégante et cohérente.
 */

const SHAPES: Record<string, string> = {
  parfum: 'M22 6h16v12H22z M26 18h8v7h-8z M11 34a9 9 0 0 1 9-9h20a9 9 0 0 1 9 9v48a9 9 0 0 1-9 9H20a9 9 0 0 1-9-9z',
  musc: 'M24 3h12v20H24z M20 23h20v6H20z M17 36a7 7 0 0 1 7-7h12a7 7 0 0 1 7 7v50a7 7 0 0 1-7 7H24a7 7 0 0 1-7-7z',
  huile: 'M27 1h6v11h-6z M21 12h18v15H21z M15 40a13 13 0 0 1 13-13h4a13 13 0 0 1 13 13v42a9 9 0 0 1-9 9H24a9 9 0 0 1-9-9z',
  oud: 'M25 3h10v15H25z M27.5 18h5v9h-5z M30 27c16 0 26 13 26 32S46 92 30 92 4 78 4 59 14 27 30 27z',
  encens: 'M12 38h36v9H12z M15 47h30l-3 38a7 7 0 0 1-7 6H25a7 7 0 0 1-7-6z M19 38c0-13 22-13 22 0z',
};

const TONES = [
  { bg: 'bg-[linear-gradient(160deg,#5A3822_0%,#2B1D12_100%)]', fill: '#D9B45E', shine: 'rgba(241,221,168,.38)' },
  { bg: 'bg-[linear-gradient(160deg,#E6D3AE_0%,#C4AE8A_100%)]', fill: '#4A2E1C', shine: 'rgba(250,245,236,.35)' },
  { bg: 'bg-[linear-gradient(160deg,#FAF5EC_0%,#E6D3AE_100%)]', fill: '#B48A2C', shine: 'rgba(255,255,255,.55)' },
];

export const NIGHT_TONE = { bg: 'bg-[radial-gradient(90%_60%_at_50%_40%,#6B4526_0%,#3A2716_45%,#17100A_100%)]', fill: '#D9B45E', shine: 'rgba(241,221,168,.45)' };

export function shapeFor(categorySlug: string): string {
  if (categorySlug.includes('musc')) return SHAPES.musc;
  if (categorySlug.includes('huile')) return SHAPES.huile;
  if (categorySlug.includes('oud')) return SHAPES.oud;
  if (categorySlug.includes('encens') || categorySlug.includes('thiouraye')) return SHAPES.encens;
  return SHAPES.parfum;
}

/** Teinte stable par produit (même produit = même couleur partout). */
export function toneFor(seed: string) {
  const hash = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
  return TONES[hash % TONES.length];
}

export function Bottle({ categorySlug, fill, shine, className }: { categorySlug: string; fill: string; shine: string; className?: string }) {
  return (
    <svg viewBox="0 0 60 100" aria-hidden="true" className={className}>
      <path d={shapeFor(categorySlug)} fill={fill} />
      <path d="M20 46v32" fill="none" stroke={shine} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductVisual({
  image,
  name,
  categorySlug,
  seed,
  sizes,
  priority = false,
  tone,
  bottleClassName = 'w-[34%]',
  className,
}: {
  image?: { path: string; alt: string | null } | null;
  name: string;
  categorySlug: string;
  seed: string;
  sizes: string;
  priority?: boolean;
  tone?: typeof NIGHT_TONE;
  bottleClassName?: string;
  className?: string;
}) {
  const url = productImageUrl(image?.path);
  const t = tone ?? toneFor(seed);
  return (
    <div className={cn('relative isolate grid place-items-center overflow-hidden', !url && t.bg, className)}>
      {url ? (
        <Image src={url} alt={image?.alt || name} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <>
          <span aria-hidden="true" className="absolute bottom-[13%] left-[30%] right-[30%] h-3.5 rounded-[50%] bg-encre/25 blur-md" />
          <Bottle categorySlug={categorySlug} fill={t.fill} shine={t.shine} className={cn('relative h-auto drop-shadow-[0_18px_16px_rgba(0,0,0,0.22)]', bottleClassName)} />
          <span className="sr-only">{name}</span>
        </>
      )}
    </div>
  );
}
