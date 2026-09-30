'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, LoaderCircle, MoreHorizontal, PencilLine, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { productImageUrl } from '@/lib/supabase/storage';
import { useToast } from '@/components/ui/toast';
import { deletePromotionAction, duplicatePromotionAction, togglePromotionAction } from '../actions';
import { formatDiscount, PROMOTION_STATE_UI, promotionState } from '../schemas';
import type { PromotionRow } from '../queries';

const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });

/** « 3 j », « 5 h », « 40 min » */
function duration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} j`;
}

/** Carte d'une promotion : remise, période et progression, produits, bilan, actions. */
export default function PromotionCard({ promotion }: { promotion: PromotionRow }) {
  const notify = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const state = promotionState(promotion, now);
  const ui = PROMOTION_STATE_UI[state];
  const start = new Date(promotion.startsAt);
  const end = new Date(promotion.endsAt);
  const elapsed = Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())));

  const products = promotion.targets.flatMap((t) => (t.product ? [t.product] : []));
  const variants = promotion.targets.flatMap((t) => (t.variant ? [t.variant] : []));
  const thumbs = [...products, ...variants.map((v) => v.product)]
    .filter((p, i, list) => list.findIndex((x) => x.id === p.id) === i)
    .slice(0, 4);
  const used = promotion.usage.orders > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => {
      setMenuOpen(false);
      setConfirmDelete(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && close();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menuOpen]);

  const act = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; id?: string }>, then?: (id?: string) => void) =>
    startTransition(async () => {
      const result = await fn();
      setMenuOpen(false);
      setConfirmDelete(false);
      notify(result.ok ? result.message! : result.error!, result.ok ? 'success' : 'error');
      if (result.ok) then?.(result.id);
    });

  return (
    <article
      className={cn(
        'relative flex flex-col gap-5 rounded-[28px] border bg-lin p-5 transition-shadow duration-150 hover:shadow-md sm:p-6',
        state === 'active' ? 'border-or/50' : 'border-filet',
        (state === 'ended' || state === 'disabled') && 'bg-lin/70',
      )}
    >
      {/* En-tête : remise, nom, état, actions */}
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'flex h-16 min-w-16 shrink-0 items-center justify-center rounded-2xl px-3 font-display text-[1.5rem] leading-none tabular-nums',
            state === 'active' ? 'bg-oud text-sur-oud' : 'bg-sable text-oud',
          )}
        >
          {formatDiscount(promotion.type, promotion.value)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <Link href={`/admin/promotions/${promotion.id}`} className="line-clamp-2 font-display text-title-sm leading-tight text-encre decoration-or underline-offset-4 hover:underline">
            {promotion.name}
          </Link>
          <span className={cn('inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-medium', ui.chip)}>{ui.label}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Interrupteur actif / inactif */}
          {state !== 'ended' && (
            <button
              type="button"
              role="switch"
              aria-checked={promotion.isActive}
              aria-label={promotion.isActive ? 'Désactiver la promotion' : 'Activer la promotion'}
              disabled={isPending}
              onClick={() => act(() => togglePromotionAction(promotion.id, !promotion.isActive))}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60',
                promotion.isActive ? 'bg-succes' : 'bg-filet-fort',
              )}
            >
              <span
                className={cn(
                  'absolute top-1 grid size-5 place-items-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft',
                  promotion.isActive ? 'translate-x-6' : 'translate-x-1',
                )}
              >
                {isPending && <LoaderCircle className="size-3 text-fumee motion-safe:animate-spin" strokeWidth={2.5} aria-hidden="true" />}
              </span>
            </button>
          )}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label={`Actions pour ${promotion.name}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn('grid size-10 place-items-center rounded-full transition-colors', menuOpen ? 'bg-oud text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre')}
            >
              <MoreHorizontal className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-filet bg-lin p-1.5 shadow-lg motion-safe:animate-reveal">
                {confirmDelete ? (
                  <div className="flex flex-col gap-3 p-2.5">
                    <p className="text-sm leading-snug text-encre">Supprimer « {promotion.name} » définitivement ?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isPending}
                        onClick={() => act(() => deletePromotionAction(promotion.id))}
                        className="h-10 flex-1 rounded-full bg-erreur text-sm font-medium text-lin disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-full px-3 text-sm text-fumee hover:text-encre">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link role="menuitem" href={`/admin/promotions/${promotion.id}`} className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-encre hover:bg-sable">
                      <PencilLine className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                      Modifier
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isPending}
                      onClick={() => act(() => duplicatePromotionAction(promotion.id), (id) => id && router.push(`/admin/promotions/${id}`))}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-encre hover:bg-sable disabled:opacity-50"
                    >
                      <Copy className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                      Dupliquer (relancer)
                    </button>
                    {used ? (
                      <p className="px-3 pb-2 pt-1.5 text-xs leading-snug text-fumee">
                        Utilisée dans des commandes : elle ne peut pas être supprimée, désactivez-la.
                      </p>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setConfirmDelete(true)}
                        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-erreur hover:bg-erreur-fond"
                      >
                        <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                        Supprimer…
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Période */}
      <div className="flex flex-col gap-2">
        <p className="text-[0.8125rem] tabular-nums text-fumee" suppressHydrationWarning>
          {dateTime.format(start)} → {dateTime.format(end)}
        </p>
        {state === 'active' && (
          <>
            <div className="h-1.5 overflow-hidden rounded-full bg-filet" aria-hidden="true">
              <div className="h-full origin-left rounded-full bg-or" style={{ transform: `scaleX(${elapsed})` }} />
            </div>
            <p className="text-[0.8125rem] font-medium text-encre" suppressHydrationWarning>
              Encore {duration(end.getTime() - now.getTime())}
            </p>
          </>
        )}
        {state === 'scheduled' && (
          <p className="text-[0.8125rem] font-medium text-[#1F5673]" suppressHydrationWarning>
            Commence dans {duration(start.getTime() - now.getTime())}
          </p>
        )}
        {state === 'disabled' && <p className="text-[0.8125rem] text-fumee">Désactivée : aucune remise appliquée.</p>}
      </div>

      {/* Produits ciblés */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-3">
          {thumbs.map((product) => {
            const url = productImageUrl(product.images[0]?.storagePath);
            return (
              <span key={product.id} className="relative size-10 overflow-hidden rounded-full bg-paille ring-2 ring-lin">
                {url && <Image src={url} alt="" fill sizes="40px" className="object-cover" />}
              </span>
            );
          })}
        </div>
        <p className="text-[0.8125rem] leading-snug text-encre">
          {products.length > 0 && `${products.length} produit${products.length > 1 ? 's' : ''}`}
          {products.length > 0 && variants.length > 0 && ' · '}
          {variants.length > 0 && `${variants.length} contenance${variants.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Bilan */}
      <p className={cn('rounded-2xl px-4 py-3 text-[0.8125rem]', used ? 'bg-paille/50 text-encre' : 'bg-sable/70 text-fumee')}>
        {used ? (
          <>
            Utilisée dans <strong className="font-semibold">{promotion.usage.orders}</strong> commande{promotion.usage.orders > 1 ? 's' : ''} ·{' '}
            <strong className="font-semibold">{formatFCFA(promotion.usage.discount)}</strong> de remises accordées
          </>
        ) : (
          'Pas encore utilisée dans une commande.'
        )}
      </p>
    </article>
  );
}
