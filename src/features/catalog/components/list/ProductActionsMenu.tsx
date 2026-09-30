'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Archive, ArchiveRestore, Eye, EyeOff, ExternalLink, LoaderCircle, MoreHorizontal, PencilLine, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { changeProductStatusAction } from '../../actions';
import { PendingIcon } from '@/components/ui/link-pending';
import type { ProductStatusChange } from '../../services/product-status';

const item =
  'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-encre transition-colors duration-150 hover:bg-sable disabled:opacity-50';

/** Menu « … » d'une ligne : voir, publier / retirer, archiver (avec confirmation), restaurer. */
export default function ProductActionsMenu({
  product,
  onResult,
}: {
  product: { id: string; name: string; slug: string; isPublished: boolean; isArchived: boolean };
  onResult: (message: string, tone: 'success' | 'error') => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setConfirmArchive(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && close();
    const onPointerDown = (event: PointerEvent) => !rootRef.current?.contains(event.target as Node) && close();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const run = (change: ProductStatusChange) =>
    startTransition(async () => {
      const result = await changeProductStatusAction(product.id, change);
      setOpen(false);
      setConfirmArchive(false);
      onResult(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
    });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Actions pour ${product.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'grid size-10 place-items-center rounded-full transition-colors duration-150',
          open ? 'bg-oud text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre',
        )}
      >
        {isPending ? (
          <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <MoreHorizontal className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-filet bg-lin p-1.5 shadow-lg motion-safe:animate-reveal"
        >
          {confirmArchive ? (
            <div className="flex flex-col gap-3 p-2.5">
              <p className="text-sm leading-snug text-encre">
                Archiver <strong className="font-medium">{product.name}</strong> ? Il disparaît de la boutique ; ses ventes
                passées sont conservées.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => run('archive')}
                  className="h-10 flex-1 rounded-full bg-erreur px-3 text-sm font-medium text-lin disabled:opacity-60"
                >
                  Archiver
                </button>
                <button type="button" onClick={() => setConfirmArchive(false)} className="h-10 rounded-full px-3 text-sm text-fumee hover:text-encre">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link role="menuitem" href={`/admin/produits/${product.id}`} className={item}>
                <PendingIcon icon={PencilLine} className="size-4 text-or-profond" strokeWidth={1.8} />
                Modifier
              </Link>
              {product.isPublished && (
                <Link role="menuitem" href={`/produits/${product.slug}`} target="_blank" className={item}>
                  <ExternalLink className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                  Voir dans la boutique
                </Link>
              )}
              {!product.isArchived && !product.isPublished && (
                <button type="button" role="menuitem" disabled={isPending} onClick={() => run('publish')} className={item}>
                  <Send className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                  Publier
                </button>
              )}
              {product.isPublished && (
                <button type="button" role="menuitem" disabled={isPending} onClick={() => run('unpublish')} className={item}>
                  <EyeOff className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                  Retirer de la boutique
                </button>
              )}
              {product.isArchived ? (
                <button type="button" role="menuitem" disabled={isPending} onClick={() => run('restore')} className={item}>
                  <ArchiveRestore className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                  Restaurer (en brouillon)
                </button>
              ) : (
                <button type="button" role="menuitem" onClick={() => setConfirmArchive(true)} className={cn(item, 'text-erreur hover:bg-erreur-fond')}>
                  <Archive className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  Archiver…
                </button>
              )}
              {!product.isPublished && !product.isArchived && (
                <p className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-xs text-fumee">
                  <Eye className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                  Brouillon : invisible dans la boutique
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
