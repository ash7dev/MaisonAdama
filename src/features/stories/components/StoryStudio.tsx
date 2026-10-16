'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ImageIcon, LoaderCircle, Share2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { useToast } from '@/components/ui/toast';
import { getStoryOptionsAction, type StoryOptions } from '../actions';
import { STORY_TEMPLATES, TEMPLATE_LABELS, type StoryTemplate } from '../meta';

/**
 * Studio de story : l'admin choisit le modèle et la photo, voit la story
 * réelle (générée par le serveur, 1080 × 1920), puis la partage depuis son
 * téléphone (WhatsApp, Instagram, Snapchat…) ou la télécharge.
 * Le lien de la création est copié au passage, pour le sticker « Lien ».
 */
export default function StoryStudio({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-11 items-center gap-2 rounded-full bg-oud px-4 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover',
          className,
        )}
      >
        <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" />
        Story
      </button>
      {open && <StudioSheet slug={slug} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

function StudioSheet({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const notify = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<StoryOptions | null | 'loading'>('loading');
  const [template, setTemplate] = useState<StoryTemplate>('couverture');
  const [photo, setPhoto] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'share' | 'download' | null>(null);

  const src = `/api/admin/story/${slug}?t=${template}&p=${photo}`;
  const productUrl = `${siteConfig.url.replace(/\/$/, '')}/produits/${slug}?source=story`;

  useEffect(() => {
    dialog.current?.showModal();
    document.documentElement.style.overflow = 'hidden';
    getStoryOptionsAction(slug).then((o) => {
      setOptions(o);
      // Modèle conseillé : la promo si elle existe, sinon la nouveauté, sinon la couverture.
      if (o?.promo) setTemplate('chiffre');
      else if (o?.isNew) setTemplate('cartel');
    });
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [slug]);

  useEffect(() => {
    setLoaded(false);
    setError(null);
  }, [src]);

  async function fetchStory(download = false): Promise<File> {
    const res = await fetch(`${src}${download ? '&dl=1' : ''}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? 'La story n’a pas pu être créée.');
    }
    const blob = await res.blob();
    return new File([blob], `maison-adama-${slug}-${template}.png`, { type: 'image/png' });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(productUrl);
      return true;
    } catch {
      return false;
    }
  }

  async function share() {
    setBusy('share');
    try {
      const file = await fetchStory();
      const copied = await copyLink();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        notify(copied ? 'Story prête. Le lien est copié : ajoutez-le avec le sticker « Lien » (Instagram, Snapchat).' : 'Story partagée.', 'success');
      } else {
        download(file);
        notify('Ce navigateur ne partage pas d’images : la story est téléchargée, publiez-la depuis vos photos.', 'success');
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return; // partage annulé
      notify(cause instanceof Error ? cause.message : 'Partage impossible.', 'error');
    } finally {
      setBusy(null);
    }
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function onDownload() {
    setBusy('download');
    try {
      download(await fetchStory(true));
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Téléchargement impossible.', 'error');
    } finally {
      setBusy(null);
    }
  }

  const ready = options && options !== 'loading';
  const disabled = (t: StoryTemplate) => t === 'chiffre' && ready && !options.promo;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={`Story de ${name}`}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-sable p-0 text-encre backdrop:bg-encre/50 backdrop:backdrop-blur-sm lg:mx-auto lg:my-auto lg:h-[min(52rem,94dvh)] lg:max-w-[58rem] lg:overflow-hidden lg:rounded-[32px] lg:shadow-lg"
    >
      <div className="flex h-full flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Aperçu */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(90%_70%_at_50%_30%,#3A2716_0%,#17100A_100%)] p-4 lg:p-6">
          <div className="relative aspect-[9/16] h-full max-h-full overflow-hidden rounded-[22px] bg-encre/40 shadow-[0_30px_60px_rgb(0_0_0/0.45)]">
            {error ? (
              <p className="grid h-full place-items-center p-6 text-center text-sm leading-relaxed text-sur-oud/80">{error}</p>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- image générée à la demande, déjà au bon format */}
                <img
                  key={src}
                  src={src}
                  alt={`Aperçu de la story ${TEMPLATE_LABELS[template].name}`}
                  onLoad={() => setLoaded(true)}
                  onError={async () => {
                    const res = await fetch(src).catch(() => null);
                    const body = res ? await res.json().catch(() => null) : null;
                    setError(body?.error ?? 'La story n’a pas pu être créée.');
                  }}
                  className={cn('h-full w-full object-contain transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
                />
                {!loaded && (
                  <span className="absolute inset-0 grid place-items-center text-sur-oud/70">
                    <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Création de la story…</span>
                  </span>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-encre/50 text-sur-oud backdrop-blur-md lg:hidden"
          >
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Réglages et partage */}
        <div className="flex flex-col gap-5 overflow-y-auto border-t border-filet bg-lin p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:border-l lg:border-t-0 lg:p-6">
          <div className="hidden items-start justify-between gap-3 lg:flex">
            <div className="flex flex-col gap-1">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-or-profond">Story</span>
              <h2 className="text-[1.5rem] leading-tight text-encre">{name}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-10 shrink-0 place-items-center rounded-full text-fumee hover:bg-sable hover:text-encre">
              <X className="size-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-encre">Modèle</legend>
            <div className="grid grid-cols-2 gap-2">
              {STORY_TEMPLATES.map((t) => {
                const on = t === template;
                const off = disabled(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    disabled={Boolean(off)}
                    onClick={() => setTemplate(t)}
                    title={off ? 'Aucune promotion en cours sur cette création' : undefined}
                    className={cn(
                      'flex min-h-[4.25rem] flex-col items-start justify-center gap-0.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors duration-150 disabled:opacity-40',
                      on ? 'bg-oud text-sur-oud' : 'bg-white/70 text-encre ring-1 ring-inset ring-filet hover:ring-filet-fort',
                    )}
                  >
                    <span className="font-display text-[1.0625rem] leading-tight">{TEMPLATE_LABELS[t].name}</span>
                    <span className={cn('text-[0.71875rem] leading-snug', on ? 'text-sur-oud/70' : 'text-fumee')}>
                      {off ? 'Aucune promo en cours' : TEMPLATE_LABELS[t].use}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {ready && options.photos > 1 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-encre">Photo</legend>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: options.photos }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={i === photo}
                    onClick={() => setPhoto(i)}
                    className={cn(
                      'flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors duration-150',
                      i === photo ? 'bg-oud font-semibold text-sur-oud' : 'bg-white/70 text-encre ring-1 ring-inset ring-filet',
                    )}
                  >
                    <ImageIcon className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                    {i === 0 ? 'Principale' : `Photo ${i + 1}`}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-auto flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={share}
              disabled={busy !== null || Boolean(error)}
              className="flex h-[3.25rem] items-center justify-center gap-2 rounded-full bg-oud text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:opacity-50"
            >
              {busy === 'share' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Share2 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
              Partager (WhatsApp, Instagram…)
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={busy !== null || Boolean(error)}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-filet-fort text-sm font-semibold text-oud transition-colors duration-150 hover:bg-white disabled:opacity-50"
            >
              {busy === 'download' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" strokeWidth={1.8} aria-hidden="true" />}
              Télécharger l’image
            </button>
            <p className="text-center text-xs leading-relaxed text-fumee">
              Format story 1080 × 1920. Le QR code ouvre la fiche de la création ; son lien est copié pour le sticker « Lien ».
            </p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
