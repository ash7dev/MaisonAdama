'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, RotateCcw, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage, uploadToSignedUrl } from '@/lib/image-compress';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PRODUCT_IMAGES,
  MAX_SOURCE_IMAGE_BYTES,
  MAX_UPLOAD_BYTES,
} from '@/lib/supabase/storage';
import { createProductImageUploadAction, discardProductImageAction } from '../actions';

export type ImageItem = {
  key: string;
  status: 'preparing' | 'uploading' | 'done' | 'error';
  progress: number;
  previewUrl: string;
  alt: string;
  storagePath?: string;
  width?: number;
  height?: number;
  error?: string;
  /** Fichier d'origine, conservé pour « Réessayer ». */
  file?: File;
  /**
   * Photo déjà rattachée au produit (modification) : la retirer du formulaire ne
   * l'efface du stockage qu'après l'enregistrement, côté serveur.
   */
  persisted?: boolean;
};

type ImageManagerProps = {
  images: ImageItem[];
  onChange: (update: (images: ImageItem[]) => ImageItem[]) => void;
  error?: string;
  productName: string;
};

const MAX_PARALLEL_UPLOADS = 3;

/**
 * Photos du produit : glisser-déposer ou sélection (plusieurs à la fois), compression
 * en WebP dans le navigateur, envoi direct vers Supabase avec progression,
 * réessai, suppression, réorganisation (glisser ou flèches), photo principale,
 * texte alternatif.
 */
export default function ImageManager({ images, onChange, error, productName }: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const running = useRef(0);
  const queue = useRef<ImageItem[]>([]);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const update = (key: string, patch: Partial<ImageItem>) =>
    onChange((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  // Libère les aperçus en mémoire en quittant la page.
  useEffect(
    () => () => {
      for (const item of imagesRef.current) if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
      for (const controller of controllers.current.values()) controller.abort();
    },
    [],
  );

  async function processItem(item: ImageItem) {
    const controller = new AbortController();
    controllers.current.set(item.key, controller);
    try {
      update(item.key, { status: 'preparing', progress: 0, error: undefined });
      const compressed = await compressImage(item.file!, MAX_UPLOAD_BYTES);

      const ticket = await createProductImageUploadAction();
      if (!ticket.ok) throw new Error(ticket.error);

      update(item.key, { status: 'uploading', width: compressed.width, height: compressed.height });
      await uploadToSignedUrl(
        ticket.signedUrl,
        compressed.blob,
        (ratio) => update(item.key, { progress: ratio }),
        controller.signal,
      );
      update(item.key, { status: 'done', progress: 1, storagePath: ticket.path, file: undefined });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      update(item.key, { status: 'error', error: cause instanceof Error ? cause.message : 'Envoi impossible.' });
    } finally {
      controllers.current.delete(item.key);
    }
  }

  // File d'attente : 3 envois en parallèle, pour ne pas saturer une connexion mobile.
  function pump() {
    while (running.current < MAX_PARALLEL_UPLOADS && queue.current.length > 0) {
      const next = queue.current.shift()!;
      running.current++;
      processItem(next).finally(() => {
        running.current--;
        pump();
      });
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const room = MAX_PRODUCT_IMAGES - imagesRef.current.length;
    const rejected: string[] = [];
    const accepted: ImageItem[] = [];

    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        rejected.push(`${file.name} : format non pris en charge (JPEG, PNG ou WebP).`);
      } else if (file.size > MAX_SOURCE_IMAGE_BYTES) {
        rejected.push(`${file.name} : fichier trop lourd (25 Mo maximum).`);
      } else if (accepted.length >= room) {
        rejected.push(`${file.name} : ${MAX_PRODUCT_IMAGES} photos au maximum.`);
      } else {
        accepted.push({
          key: crypto.randomUUID(),
          status: 'preparing',
          progress: 0,
          previewUrl: URL.createObjectURL(file),
          alt: '',
          file,
        });
      }
    }

    setNotice(rejected.length ? rejected.join(' ') : null);
    if (accepted.length === 0) return;
    onChange((list) => [...list, ...accepted]);
    queue.current.push(...accepted);
    pump();
  }

  function retry(item: ImageItem) {
    if (!item.file) return;
    queue.current.push(item);
    update(item.key, { status: 'preparing', progress: 0, error: undefined });
    pump();
  }

  function remove(item: ImageItem) {
    controllers.current.get(item.key)?.abort();
    queue.current = queue.current.filter((queued) => queued.key !== item.key);
    if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
    onChange((list) => list.filter((entry) => entry.key !== item.key));
    // Envoyée pendant cette session mais plus utilisée : supprimée du stockage.
    // (Une photo déjà enregistrée n'est supprimée qu'après l'enregistrement.)
    if (item.storagePath && !item.persisted) void discardProductImageAction(item.storagePath);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= imagesRef.current.length || from === to) return;
    onChange((list) => {
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const busy = images.filter((image) => image.status === 'preparing' || image.status === 'uploading').length;
  const full = images.length >= MAX_PRODUCT_IMAGES;

  return (
    <div className="flex flex-col gap-4">
      {/* Zone d'import */}
      {!full && (
        <label
          htmlFor="product-images"
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            if (!event.dataTransfer.files.length) return;
            event.preventDefault();
            setDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
          className={cn(
            'group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 text-center transition-colors duration-150',
            images.length ? 'py-7' : 'py-12',
            dragOver ? 'border-or bg-paille/40' : error ? 'border-erreur/60 bg-erreur-fond/40' : 'border-filet-fort/70 bg-white/50 hover:border-or hover:bg-white/80',
          )}
        >
          <span className="grid size-14 place-items-center rounded-full bg-oud text-sur-oud transition-transform duration-250 ease-out-soft group-hover:scale-105">
            <ImagePlus className="size-6" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[0.9375rem] font-medium text-encre">
              <span className="hidden sm:inline">Glissez vos photos ici ou </span>
              <span className="text-or-profond underline decoration-or/50 underline-offset-4">choisissez des fichiers</span>
            </span>
            <span className="text-[0.8125rem] text-fumee">
              JPEG, PNG ou WebP · jusqu’à {MAX_PRODUCT_IMAGES} photos · fond clair et produit centré conseillés
            </span>
          </span>
          <input
            ref={inputRef}
            id="product-images"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            className="sr-only"
            aria-describedby={error ? 'images-error' : 'images-hint'}
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      )}

      <p id="images-hint" className="sr-only">
        La première photo est la photo principale, affichée dans la boutique.
      </p>
      {error && (
        <p id="images-error" className="text-sm text-erreur">
          {error}
        </p>
      )}
      {notice && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-alerte-fond px-4 py-3 text-sm text-alerte">
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {notice}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {busy > 0 ? `${busy} photo${busy > 1 ? 's' : ''} en cours d’envoi` : ''}
      </p>

      {/* Galerie */}
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.key}
              draggable={image.status === 'done'}
              onDragStart={(event) => {
                setDraggedKey(image.key);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(event) => draggedKey && event.preventDefault()}
              onDrop={(event) => {
                if (!draggedKey) return;
                event.preventDefault();
                move(images.findIndex((i) => i.key === draggedKey), index);
                setDraggedKey(null);
              }}
              onDragEnd={() => setDraggedKey(null)}
              className={cn(
                'flex flex-col gap-2 rounded-[22px] border bg-white/70 p-2 transition-[opacity,border-color] duration-150',
                index === 0 ? 'border-or' : 'border-filet',
                draggedKey === image.key && 'opacity-40',
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-sable">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
                <img
                  src={image.previewUrl}
                  alt=""
                  className={cn('size-full object-cover', image.status !== 'done' && 'opacity-60')}
                />

                {index === 0 && image.status === 'done' && (
                  <span className="absolute left-2 top-2 flex h-7 items-center gap-1 rounded-full bg-oud px-2.5 text-[0.6875rem] font-medium text-sur-oud">
                    <Star className="size-3 fill-current" aria-hidden="true" />
                    Principale
                  </span>
                )}

                {(image.status === 'preparing' || image.status === 'uploading') && (
                  <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5 rounded-xl bg-lin/90 px-3 py-2 backdrop-blur-sm">
                    <span className="flex items-center gap-1.5 text-xs text-encre">
                      <LoaderCircle className="size-3.5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
                      {image.status === 'preparing' ? 'Préparation…' : `Envoi ${Math.round(image.progress * 100)} %`}
                    </span>
                    <span className="h-1 overflow-hidden rounded-full bg-filet">
                      <span
                        className="block h-full origin-left rounded-full bg-or transition-transform duration-150"
                        style={{ transform: `scaleX(${image.status === 'preparing' ? 0.04 : image.progress})` }}
                      />
                    </span>
                  </div>
                )}

                {image.status === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-erreur-fond/90 p-3 text-center">
                    <AlertCircle className="size-5 text-erreur" strokeWidth={1.8} aria-hidden="true" />
                    <span className="text-xs leading-snug text-erreur">{image.error}</span>
                    {image.file && (
                      <button
                        type="button"
                        onClick={() => retry(image)}
                        className="flex h-9 items-center gap-1.5 rounded-full bg-lin px-3 text-xs font-medium text-encre"
                      >
                        <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden="true" />
                        Réessayer
                      </button>
                    )}
                  </div>
                )}
              </div>

              <label htmlFor={`alt-${image.key}`} className="sr-only">
                Description de la photo {index + 1}
              </label>
              <input
                id={`alt-${image.key}`}
                value={image.alt}
                maxLength={200}
                onChange={(event) => update(image.key, { alt: event.target.value })}
                placeholder={productName ? `Ex. ${productName}, flacon de face` : 'Description (facultatif)'}
                className="h-10 w-full rounded-xl border border-transparent bg-sable/60 px-3 text-[0.8125rem] text-encre outline-none placeholder:text-fumee/60 focus:border-or focus:bg-white"
              />

              <div className="flex items-center gap-1">
                <IconButton label="Déplacer vers la gauche" disabled={index === 0} onClick={() => move(index, index - 1)}>
                  <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
                <IconButton label="Déplacer vers la droite" disabled={index === images.length - 1} onClick={() => move(index, index + 1)}>
                  <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
                {index > 0 && image.status === 'done' && (
                  <IconButton label="Choisir comme photo principale" onClick={() => move(index, 0)}>
                    <Star className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                )}
                <IconButton label="Retirer la photo" onClick={() => remove(image)} className="ml-auto text-erreur hover:bg-erreur-fond">
                  <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-9 place-items-center rounded-xl text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre disabled:pointer-events-none disabled:opacity-30',
        className,
      )}
    >
      {children}
    </button>
  );
}
