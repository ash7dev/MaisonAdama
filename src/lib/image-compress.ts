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
  /** Extension du fichier envoyé : WebP si le navigateur sait l'encoder, sinon JPEG. */
  ext: 'webp' | 'jpg';
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

  // Safari (iPhone, iPad, Mac) sait afficher le WebP mais pas l'encoder : toBlob
  // renvoie alors du PNG. Dans ce cas, on passe au JPEG, encodé partout.
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const probe = await encode('image/webp', QUALITIES[0]);
  const webp = probe?.type === 'image/webp';
  const type = webp ? 'image/webp' : 'image/jpeg';
  const ext = webp ? 'webp' : 'jpg';
  // Le JPEG n'a pas de transparence : un PNG détouré aurait un fond noir.
  // On glisse un fond blanc DERRIÈRE l'image (le WebP, lui, garde la transparence).
  if (!webp) {
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
  }

  for (const [i, quality] of QUALITIES.entries()) {
    const blob = i === 0 && webp ? probe : await encode(type, quality);
    if (!blob || blob.type !== type) break;
    if (blob.size <= maxBytes) return { blob, width, height, ext };
  }
  throw new Error('Image trop lourde, même compressée.');
}

/**
 * Raison d'un refus du stockage, en clair. Supabase répond
 * { statusCode, error, message } : on traduit les cas connus et on garde
 * toujours le code et le message d'origine pour le diagnostic.
 */
function uploadRefusal(status: number, body: string): string {
  let detail = '';
  try {
    const json = JSON.parse(body) as { message?: string; error?: string };
    detail = json.message || json.error || '';
  } catch {
    detail = body.slice(0, 160);
  }
  const d = detail.toLowerCase();
  const why =
    d.includes('mime') || d.includes('content type')
      ? 'format refusé par le stockage'
      : d.includes('size') || d.includes('too large') || status === 413
        ? 'photo trop lourde pour le stockage'
        : d.includes('row-level security') || d.includes('unauthorized') || status === 403
          ? 'permission refusée par le stockage (droits admin)'
          : d.includes('exp') || d.includes('jwt') || d.includes('signature')
            ? 'autorisation d’envoi expirée, réessayez'
            : d.includes('exists') || d.includes('duplicate') || status === 409
              ? 'une photo porte déjà ce nom, réessayez'
              : d.includes('bucket') || status === 404
                ? 'espace de stockage introuvable'
                : 'refus du stockage';
  return `Envoi refusé (${status}) : ${why}${detail ? ` — « ${detail} »` : ''}`;
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
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      console.error('Envoi refusé par le stockage', xhr.status, xhr.responseText);
      reject(new Error(uploadRefusal(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi.'));
    xhr.onabort = () => reject(new DOMException('Envoi annulé', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(blob);
  });
}
