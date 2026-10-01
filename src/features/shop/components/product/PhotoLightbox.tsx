'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { productImageUrl } from '@/lib/supabase/storage';

type Photo = { path: string; alt: string | null };

const ZOOM = 2.5;

/**
 * Visionneuse plein écran : la photo entière (sans recadrage), on glisse d'une
 * photo à l'autre, double-toucher pour zoomer à l'endroit touché puis déplacer
 * au doigt. Fermeture : croix, Échap, ou bouton Retour du téléphone (une
 * entrée d'historique est ajoutée à l'ouverture : on ne quitte pas la fiche).
 */
export default function PhotoLightbox({ photos, name, start, onClose }: { photos: Photo[]; name: string; start: number; onClose: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTap = useRef(0);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const closing = useRef(false);

  // Bouton Retour du téléphone = fermer la visionneuse.
  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (window.history.state?.lightbox) window.history.back();
    else onClose();
  }, [onClose]);

  useEffect(() => {
    window.history.pushState({ ...window.history.state, lightbox: true }, '');
    const onPop = () => {
      closing.current = true;
      onClose();
    };
    window.addEventListener('popstate', onPop);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
      if (e.key === 'ArrowRight') scrollTo(index + 1);
      if (e.key === 'ArrowLeft') scrollTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = overflow;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ouverture directement sur la photo touchée.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = start * el.clientWidth;
  }, [start]);

  function scrollTo(i: number) {
    const el = scroller.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    setZoom(null);
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }

  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  /** Double-toucher : zoom à l'endroit touché, ou retour à la taille normale. */
  const toggleZoom = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (zoom) return setZoom(null);
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({ x: 0, y: 0, ox: ((e.clientX - rect.left) / rect.width) * 100, oy: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.pointerType !== 'touch') return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      toggleZoom(e);
    } else lastTap.current = now;
  };

  // Photo zoomée : on la déplace au doigt (la navigation est suspendue).
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom) drag.current = { x: e.clientX, y: e.clientY, ox: zoom.x, oy: zoom.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!zoom || !drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const limitX = (rect.width * (ZOOM - 1)) / 2;
    const limitY = (rect.height * (ZOOM - 1)) / 2;
    setZoom({
      ...zoom,
      x: Math.max(-limitX, Math.min(limitX, drag.current.ox + e.clientX - drag.current.x)),
      y: Math.max(-limitY, Math.min(limitY, drag.current.oy + e.clientY - drag.current.y)),
    });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Photos de ${name}`} className="fixed inset-0 z-[90] bg-black/95 text-sur-oud motion-safe:animate-fade-in">
      <div
        ref={scroller}
        onScroll={onScroll}
        className={cn(
          'flex h-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          zoom ? 'overflow-hidden' : 'overflow-x-auto',
        )}
      >
        {photos.map((p, i) => (
          <div
            key={p.path}
            className="relative h-full w-full shrink-0 snap-center overflow-hidden [touch-action:pan-x]"
            onDoubleClick={toggleZoom}
            onPointerDown={i === index ? onPointerDown : undefined}
            onPointerMove={i === index ? onPointerMove : undefined}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (drag.current = null)}
            style={zoom && i === index ? { touchAction: 'none' } : undefined}
          >
            <div
              className={cn('absolute inset-0', !drag.current && 'transition-transform duration-300 ease-out-soft')}
              style={
                zoom && i === index
                  ? { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${ZOOM})`, transformOrigin: `${zoom.ox}% ${zoom.oy}%` }
                  : undefined
              }
            >
              <Image
                src={productImageUrl(p.path)!}
                alt={p.alt || `${name}, photo ${i + 1}`}
                fill
                sizes="100vw"
                quality={90}
                priority={i === start}
                className="select-none object-contain"
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>

      {/* En-tête : compteur et fermeture */}
      <div className="pointer-events-none absolute inset-x-3.5 top-[max(0.875rem,env(safe-area-inset-top))] flex items-center justify-between">
        <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold tabular-nums backdrop-blur-md" aria-live="polite">
          {index + 1} / {photos.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={requestClose}
          aria-label="Fermer"
          className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/40 backdrop-blur-md"
        >
          <X className="size-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Points + aide */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
        {photos.length > 1 && (
          <div className="flex gap-1.5" aria-hidden="true">
            {photos.map((p, i) => (
              <span key={p.path} className={cn('h-1.5 rounded-full transition-all duration-300', i === index ? 'w-5 bg-sur-oud' : 'w-1.5 bg-sur-oud/40')} />
            ))}
          </div>
        )}
        <span className="text-xs text-sur-oud/60">{zoom ? 'Double-touchez pour revenir' : 'Double-touchez pour zoomer'}</span>
      </div>
    </div>
  );
}
