import { cn } from '@/lib/utils';

/**
 * Brûle-parfum en terre (cuuraay) dessiné : couvercle ajouré, braises, frise
 * dorée, et la fumée qui monte doucement (animation coupée si l'appareil
 * demande moins de mouvement).
 */
export default function Cuuraay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 560" aria-hidden="true" className={cn('h-auto overflow-visible', className)}>
      <defs>
        <radialGradient id="cuuraay-ember" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFD28A" />
          <stop offset=".45" stopColor="#F08A3C" stopOpacity=".7" />
          <stop offset="1" stopColor="#F08A3C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cuuraay-clay" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9A6440" />
          <stop offset=".55" stopColor="#6B4526" />
          <stop offset="1" stopColor="#2B1D12" />
        </linearGradient>
        <linearGradient id="cuuraay-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B07A4E" />
          <stop offset="1" stopColor="#5A3822" />
        </linearGradient>
        <filter id="cuuraay-blur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Fumée */}
      <g className="motion-safe:animate-smoke [transform-origin:150px_320px]">
        <g fill="none" stroke="rgb(241 221 168 / 0.28)" strokeWidth="14" strokeLinecap="round" filter="url(#cuuraay-blur)">
          <path d="M150 320C140 260 110 220 120 160S170 80 150 20" />
          <path d="M155 320C185 270 200 220 185 170S205 110 220 70" />
          <path d="M145 320C110 280 90 240 100 200S80 130 70 100" />
        </g>
        <g fill="none" stroke="rgb(241 221 168 / 0.55)" strokeWidth="1.4" strokeLinecap="round">
          <path d="M150 320C140 260 110 220 120 160S170 80 150 20" />
          <path d="M155 320C185 270 200 220 185 170S205 110 220 70" />
          <path d="M145 320C110 280 90 240 100 200S80 130 70 100" />
        </g>
      </g>

      {/* Le brûle-parfum */}
      <g transform="translate(0 230)">
        <ellipse cx="150" cy="96" rx="70" ry="26" fill="url(#cuuraay-ember)" opacity=".9" />
        <path d="M84 150c0-44 30-66 66-66s66 22 66 66z" fill="url(#cuuraay-lid)" />
        <circle cx="150" cy="80" r="9" fill="#5A3822" />
        <g fill="#FFB65C">
          <circle cx="118" cy="128" r="4.5" />
          <circle cx="138" cy="112" r="4.5" />
          <circle cx="162" cy="112" r="4.5" />
          <circle cx="182" cy="128" r="4.5" />
          <circle cx="150" cy="134" r="4.5" />
        </g>
        <path d="M62 160h176l-10 96c-4 34-40 50-78 50s-74-16-78-50z" fill="url(#cuuraay-clay)" />
        <path d="M70 186l14 14 14-14 14 14 14-14 14 14 14-14 14 14 14-14 14 14 14-14 14 14 14-14" fill="none" stroke="#D9B45E" strokeWidth="2.5" strokeLinejoin="round" opacity=".85" />
        <path d="M74 214h152" stroke="#D9B45E" strokeWidth="1.2" opacity=".5" />
        <rect x="56" y="150" width="188" height="14" rx="7" fill="#7A4E2E" />
        <path d="M96 300l-10 22M204 300l10 22M150 306v20" stroke="#3A2716" strokeWidth="9" strokeLinecap="round" />
      </g>
    </svg>
  );
}
