'use client';

/**
 * Compression côté navigateur, AVANT l'envoi : une photo de téléphone de 6 Mo
 * devient un WebP d'environ 200–400 Ko en 2000 px, soit un envoi rapide même en
 * 4G, et une boutique qui charge vite. L'orientation EXIF est appliquée
 * (photos prises en portrait).
 */

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
};

const MAX_EDGE = 2000;
const QUALITIES = [0.86, 0.78, 0.7];

export async function compressImage(file: File, maxBytes: number): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new Error('Image illisible : utilisez une photo JPEG, PNG ou WebP.');
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Votre navigateur ne permet pas de préparer l’image.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) break;
    // Safari ancien : pas d'encodeur WebP, toBlob renvoie du PNG.
    if (blob.type !== 'image/webp') throw new Error('Mettez à jour votre navigateur pour envoyer des photos.');
    if (blob.size <= maxBytes) return { blob, width, height };
  }
  throw new Error('Image trop lourde, même compressée.');
}

/**
 * Envoi vers une URL signée Supabase Storage, avec progression.
 * (fetch ne sait pas suivre la progression d'un envoi : XMLHttpRequest, si.)
 */
export function uploadToSignedUrl(
  signedUrl: string,
  blob: Blob,
  onProgress: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('content-type', blob.type);
    // Chemin unique (uuid) : le fichier ne change jamais, cache d'un an.
    xhr.setRequestHeader('cache-control', 'max-age=31536000');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Envoi refusé (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi.'));
    xhr.onabort = () => reject(new DOMException('Envoi annulé', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(blob);
  });
}
