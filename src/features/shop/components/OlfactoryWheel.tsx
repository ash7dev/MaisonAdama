'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WheelFamily } from '../queries';

const SIZE = 460;
const C = SIZE / 2;
const R0 = 106;
const R1 = 212;
const GAP = 0.014;
const TONES = ['#E6D3AE', '#EADFC9', '#D9C3A0', '#F1E9DB', '#DFCDAE', '#E3D2B4', '#D9C3A0', '#EADFC9'];

const point = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)] as const;

function segment(i: number, n: number) {
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + GAP;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - GAP;
  const mid = (a0 + a1) / 2;
  const [x0, y0] = point(R1, a0);
  const [x1, y1] = point(R1, a1);
  const [x2, y2] = point(R0, a1);
  const [x3, y3] = point(R0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const d = `M${x0} ${y0} A${R1} ${R1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${R0} ${R0} 0 ${large} 0 ${x3} ${y3} Z`;
  const [lx, ly] = point((R0 + R1) / 2, mid);
  return { d, lx, ly, dx: Math.cos(mid), dy: Math.sin(mid) };
}

/**
 * Roue olfactive : chaque famille est un segment à cocher (plusieurs choix).
 * Le choix vit dans l'URL : la page (serveur) recalcule les résultats.
 */
export default function OlfactoryWheel({
  families,
  selected,
  resultCount,
  buildHref,
  resetHref,
}: {
  families: WheelFamily[];
  selected: string[];
  resultCount: number;
  /** URL avec la liste de familles donnée (calculée par la page serveur). */
  buildHref: Record<string, string>;
  resetHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hovered, setHovered] = useState<string | null>(null);
  const go = (href: string) => startTransition(() => router.replace(href, { scroll: false }));
  const n = families.length;
  const names = families.filter((f) => selected.includes(f.slug)).map((f) => f.name.toLowerCase());

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[28.75rem]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible" role="group" aria-label="Roue olfactive : choisissez une ou plusieurs familles">
        <circle cx={C} cy={C} r={R1 + 12} fill="none" stroke="#DCCBAE" strokeDasharray="2 6" aria-hidden="true" />
        {families.map((f, i) => {
          const s = segment(i, n);
          const on = selected.includes(f.slug);
          const empty = f.count === 0;
          const lift = on ? 10 : hovered === f.slug && !empty ? 6 : 0;
          const toggle = () => !empty && go(buildHref[f.slug]);
          return (
            <g
              key={f.slug}
              role="checkbox"
              aria-checked={on}
              aria-disabled={empty}
              aria-label={`${f.name}, ${empty ? 'bientôt' : `${f.count} création${f.count > 1 ? 's' : ''}`}`}
              tabIndex={empty ? -1 : 0}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle();
                }
              }}
              onMouseEnter={() => setHovered(f.slug)}
              onMouseLeave={() => setHovered(null)}
              className={cn('outline-none transition-transform duration-300 ease-out focus-visible:[&>path]:stroke-or', empty ? 'cursor-not-allowed' : 'cursor-pointer')}
              style={{ transform: `translate(${s.dx * lift}px, ${s.dy * lift}px)` }}
            >
              <path
                d={s.d}
                fill={on ? '#4A2E1C' : empty ? '#F1E9DB' : TONES[i % TONES.length]}
                stroke="#FAF5EC"
                strokeWidth={3}
                className="transition-[fill] duration-200"
              />
              <text x={s.lx} y={s.ly - 3} textAnchor="middle" className="pointer-events-none font-display" fontSize={18} fill={on ? '#F1DDA8' : empty ? '#B7A68A' : '#2B1D12'}>
                {f.name}
              </text>
              <text x={s.lx} y={s.ly + 16} textAnchor="middle" className="pointer-events-none" fontSize={11} fill={on ? '#D9B45E' : '#7A6653'}>
                {empty ? 'bientôt' : `${f.count} création${f.count > 1 ? 's' : ''}`}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Centre : le résultat, en direct */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-[42%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full bg-white text-center shadow-[0_18px_40px_rgb(74_46_28/0.14)]">
        {isPending ? (
          <LoaderCircle className="size-7 text-or-profond motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <span aria-live="polite" className="flex flex-col items-center gap-1">
            <span className="font-display text-[2.75rem] leading-none tabular-nums text-encre">{resultCount}</span>
            <span className="max-w-[9rem] text-xs leading-snug text-fumee">
              {selected.length === 0 ? 'créations · touchez une famille' : `création${resultCount > 1 ? 's' : ''} ${names.slice(0, 2).join(' et ')}${names.length > 2 ? '…' : ''}`}
            </span>
          </span>
        )}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => go(resetHref)}
            className="pointer-events-auto mt-1.5 flex h-8 items-center gap-1.5 rounded-full bg-sable px-3 text-[0.6875rem] font-semibold text-or-profond hover:bg-paille"
          >
            <RotateCcw className="size-3" strokeWidth={2.2} aria-hidden="true" />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
