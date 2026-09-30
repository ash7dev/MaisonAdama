/**
 * Photos produits dans Supabase Storage (bucket public « products »).
 * En base, on stocke le CHEMIN (catalog/2026/<uuid>.webp), jamais l'URL complète :
 * le domaine ou le CDN peuvent changer sans migration de données.
 */

export const PRODUCT_BUCKET = 'products';

/** Formats acceptés à l'import (le navigateur convertit ensuite en WebP). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Taille maximale d'une photo AVANT compression (photo de téléphone). */
export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
/** Taille maximale APRÈS compression (limite du bucket : 5 Mo). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 12;

/** catalog/<année>/<uuid>.webp — seul format de chemin accepté par le serveur. */
export const PRODUCT_IMAGE_PATH = /^catalog\/\d{4}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function newProductImagePath(uuid: string, now = new Date()): string {
  return `catalog/${now.getUTCFullYear()}/${uuid}.webp`;
}

/** URL publique (CDN Supabase) d'une photo, ou null si aucun chemin. */
export function productImageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${PRODUCT_BUCKET}/${storagePath}`;
}
