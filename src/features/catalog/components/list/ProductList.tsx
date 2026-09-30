'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ChevronDown, ImageIcon, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { productImageUrl } from '@/lib/supabase/storage';
import type { AdminProductRow } from '../../queries/list-products';
import ProductActionsMenu from './ProductActionsMenu';
import { PendingSpinner } from '@/components/ui/link-pending';
import StockAdjuster from './StockAdjuster';

type Toast = { message: string; tone: 'success' | 'error'; id: number };

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Dakar' });

/** Résumé d'un produit : fourchette de prix et état du stock (contenances actives). */
function summarize(product: AdminProductRow) {
  const active = product.variants.filter((v) => v.isActive);
  const prices = active.map((v) => v.price);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const totalStock = active.reduce((sum, v) => sum + v.stock, 0);
  const alerts = active.filter((v) => v.stock <= v.lowStockThreshold).length;
  const soldOut = active.length > 0 && active.every((v) => v.stock === 0);

  const price =
    min === null ? '—' : min === max ? formatFCFA(min) : `${new Intl.NumberFormat('fr-FR').format(min)} – ${formatFCFA(max!)}`;
  const stock = soldOut
    ? { label: 'Rupture', className: 'bg-erreur-fond text-erreur' }
    : alerts > 0
      ? { label: `${alerts} bas`, className: 'bg-alerte-fond text-alerte' }
      : null;
  return { price, totalStock, stock, variantCount: product.variants.length };
}

function statusChip(product: AdminProductRow) {
  if (product.isArchived) return { label: 'Archivé', className: 'bg-sable text-fumee ring-1 ring-inset ring-filet' };
  if (product.isPublished) return { label: 'Publié', className: 'bg-succes-fond text-succes' };
  return { label: 'Brouillon', className: 'bg-paille text-or-profond' };
}

function Thumbnail({ product, size }: { product: AdminProductRow; size: 'sm' | 'md' }) {
  const url = productImageUrl(product.images[0]?.storagePath);
  const box = size === 'sm' ? 'size-14 rounded-2xl' : 'size-16 rounded-[18px]';
  return (
    <span className={cn('relative grid shrink-0 place-items-center overflow-hidden bg-paille/60', box)}>
      {url ? (
        <Image src={url} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <ImageIcon className="size-5 text-or-profond/50" strokeWidth={1.4} aria-hidden="true" />
      )}
    </span>
  );
}

/** Liste des produits : tableau (desktop) et cartes (mobile), contenances dépliables avec stock. */
export default function ProductList({ products }: { products: AdminProductRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (message: string, tone: Toast['tone']) => setToast({ message, tone, id: Date.now() });
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {/* ── Desktop : tableau ───────────────────────────────────────── */}
      <div className="hidden overflow-visible rounded-[28px] border border-filet bg-lin md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-filet text-[0.71875rem] uppercase tracking-[0.12em] text-fumee">
              <th scope="col" className="py-3.5 pl-5 pr-3 font-medium">Produit</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Prix</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Stock</th>
              <th scope="col" className="px-3 py-3.5 font-medium">Statut</th>
              <th scope="col" className="hidden px-3 py-3.5 font-medium xl:table-cell">Modifié</th>
              <th scope="col" className="w-14 py-3.5 pl-3 pr-5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          {products.map((product) => {
            const summary = summarize(product);
            const status = statusChip(product);
            const isOpen = expanded.has(product.id);
            const panelId = `variants-${product.id}`;
            return (
              <tbody key={product.id} className={cn('border-b border-filet/70 last:border-b-0', isOpen && 'bg-white/40')}>
                <tr className="transition-colors duration-150 hover:bg-white/50">
                  <td className="py-3 pl-3 pr-3">
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(product.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={`${isOpen ? 'Masquer' : 'Afficher'} les contenances de ${product.name}`}
                      className="group grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-150 hover:bg-sable"
                    >
                      <ChevronDown
                        className={cn('size-4 text-fumee transition-transform duration-250 ease-out-soft group-hover:text-encre', isOpen && 'rotate-180')}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </button>
                    <Link href={`/admin/produits/${product.id}`} className="group flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl p-1.5 text-left">
                      <Thumbnail product={product} size="sm" />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[0.9375rem] font-medium text-encre decoration-or underline-offset-4 group-hover:underline">{product.name}</span>
                          <PendingSpinner />
                        </span>
                        <span className="truncate text-[0.8125rem] text-fumee">
                          {product.category.name}
                          {product.brand && ` · ${product.brand.name}`}
                          {` · ${summary.variantCount} contenance${summary.variantCount > 1 ? 's' : ''}`}
                          {product._count.images === 0 && <span className="text-alerte"> · sans photo</span>}
                        </span>
                      </span>
                    </Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums text-encre">{summary.price}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-sm tabular-nums text-encre">{summary.totalStock}</span>
                      {summary.stock && (
                        <span className={cn('flex h-6 items-center rounded-full px-2 text-xs font-medium', summary.stock.className)}>{summary.stock.label}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-xs font-medium', status.className)}>{status.label}</span>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-fumee xl:table-cell">{dateFormat.format(product.updatedAt)}</td>
                  <td className="py-3 pl-3 pr-5">
                    <ProductActionsMenu product={product} onResult={notify} />
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={6} id={panelId} className="px-5 pb-5 pt-1">
                      <VariantsPanel product={product} onResult={notify} />
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>

      {/* ── Mobile : cartes ─────────────────────────────────────────── */}
      <ul className="flex flex-col gap-3 md:hidden">
        {products.map((product) => {
          const summary = summarize(product);
          const status = statusChip(product);
          const isOpen = expanded.has(product.id);
          const panelId = `variants-m-${product.id}`;
          return (
            <li key={product.id} className="flex flex-col gap-3 rounded-3xl border border-filet bg-lin p-3.5">
              <div className="flex items-start gap-3">
                <Link href={`/admin/produits/${product.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                  <Thumbnail product={product} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
                    <span className="flex items-start gap-2">
                      <span className="line-clamp-2 text-[0.9375rem] font-medium leading-snug text-encre">{product.name}</span>
                      <PendingSpinner className="mt-1" />
                    </span>
                    <span className="truncate text-[0.8125rem] text-fumee">
                      {product.category.name}
                      {product.brand && ` · ${product.brand.name}`}
                    </span>
                  </span>
                </Link>
                <ProductActionsMenu product={product} onResult={notify} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('flex h-7 items-center rounded-full px-3 text-xs font-medium', status.className)}>{status.label}</span>
                <span className="text-sm tabular-nums text-encre">{summary.price}</span>
                {summary.stock && (
                  <span className={cn('flex h-6 items-center rounded-full px-2 text-xs font-medium', summary.stock.className)}>{summary.stock.label}</span>
                )}
                {product._count.images === 0 && <span className="text-xs text-alerte">Sans photo</span>}
              </div>
              <button
                type="button"
                onClick={() => toggle(product.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex h-11 items-center justify-between rounded-2xl bg-sable px-4 text-sm text-encre"
              >
                <span>
                  Contenances et stock <span className="text-fumee">({summary.variantCount} · {summary.totalStock} en stock)</span>
                </span>
                <ChevronDown className={cn('size-4 text-fumee transition-transform duration-250 ease-out-soft', isOpen && 'rotate-180')} strokeWidth={2} aria-hidden="true" />
              </button>
              {isOpen && (
                <div id={panelId}>
                  <VariantsPanel product={product} onResult={notify} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ── Notification ────────────────────────────────────────────── */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6">
        {toast && (
          <p
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-sm shadow-lg motion-safe:animate-reveal',
              toast.tone === 'success' ? 'bg-encre text-lin' : 'bg-erreur text-lin',
            )}
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="mt-px size-4 shrink-0 text-or-clair" strokeWidth={2} aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-px size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            )}
            {toast.message}
          </p>
        )}
      </div>
    </>
  );
}

/** Contenances d'un produit : prix, stock, seuil, et ajustement de stock sur place. */
function VariantsPanel({ product, onResult }: { product: AdminProductRow; onResult: (message: string, tone: 'success' | 'error') => void }) {
  const [adjusting, setAdjusting] = useState<string | null>(null);

  if (product.variants.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-sable px-4 py-3 text-sm text-fumee">
        <PackageOpen className="size-4" strokeWidth={1.7} aria-hidden="true" />
        Aucune contenance.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2 rounded-2xl bg-sable/70 p-2">
      {product.variants.map((variant) => {
        const low = variant.isActive && variant.stock <= variant.lowStockThreshold;
        const open = adjusting === variant.id;
        return (
          <li key={variant.id} className={cn('flex flex-col gap-2 rounded-xl bg-lin p-3', !variant.isActive && 'opacity-60')}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex min-w-[7rem] flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-encre">
                  {variant.label}
                  {!variant.isActive && <span className="ml-2 text-xs font-normal text-fumee">inactive</span>}
                </span>
                {variant.sku && <span className="text-xs tabular-nums text-fumee">{variant.sku}</span>}
              </span>
              <span className="w-28 text-sm tabular-nums text-encre">{formatFCFA(variant.price)}</span>
              <span className="flex w-36 items-center gap-2">
                <span className={cn('text-lg font-semibold tabular-nums', variant.stock === 0 ? 'text-erreur' : low ? 'text-alerte' : 'text-encre')}>
                  {variant.stock}
                </span>
                <span className="text-xs text-fumee">en stock · alerte à {variant.lowStockThreshold}</span>
              </span>
              <button
                type="button"
                onClick={() => setAdjusting(open ? null : variant.id)}
                aria-expanded={open}
                className={cn(
                  'ml-auto h-10 rounded-full px-4 text-sm font-medium transition-colors duration-150',
                  open ? 'bg-oud text-sur-oud' : 'border border-filet-fort text-oud hover:bg-white',
                )}
              >
                Ajuster le stock
              </button>
            </div>
            {open && (
              <StockAdjuster
                variantId={variant.id}
                variantLabel={`${product.name} ${variant.label}`}
                currentStock={variant.stock}
                onCancel={() => setAdjusting(null)}
                onDone={(message) => {
                  setAdjusting(null);
                  onResult(message, 'success');
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

