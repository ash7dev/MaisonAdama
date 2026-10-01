'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Share, SquarePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bandeau « Installer l'app » :
 *  - Android / ordinateur (Chrome, Edge…) : installation en un geste ;
 *  - iPhone / iPad (Safari) : les deux gestes à faire, Safari n'ayant pas de bouton.
 * Discret par principe : jamais si l'app est déjà installée, seulement sur les
 * pages de découverte, après 15 s ou dès la 2e page, et plus avant 14 jours une
 * fois fermé.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const KEY = 'ma-install';
const SNOOZE_DAYS = 14;
const SHOW_ON = [/^\/$/, /^\/boutique/, /^\/collections\//];

function read(): { dismissedAt?: number; installed?: boolean; views?: number } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}
function write(patch: Record<string, unknown>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    /* navigation privée : on ne retient rien */
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState(false);

  // Éligibilité : pas installée, pas fermée récemment ; compte les pages vues.
  useEffect(() => {
    if (isStandalone()) return;
    const state = read();
    if (state.installed) return;
    if (state.dismissedAt && Date.now() - state.dismissedAt < SNOOZE_DAYS * 86_400_000) return;
    const views = (state.views ?? 0) + 1;
    write({ views });

    setIos(isIosSafari());
    const onPrompt = (e: Event) => {
      e.preventDefault(); // on garde la main : le bandeau propose l'installation
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => {
      write({ installed: true });
      setOpen(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const timer = setTimeout(() => setReady(true), views >= 2 ? 1500 : 15_000);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(timer);
    };
  }, []);

  const allowedHere = SHOW_ON.some((re) => re.test(pathname));
  const installable = Boolean(deferred) || ios;
  useEffect(() => {
    setOpen(ready && installable && allowedHere);
  }, [ready, installable, allowedHere]);

  if (!open) return null;

  const dismiss = () => {
    write({ dismissedAt: Date.now() });
    setOpen(false);
  };
  const install = async () => {
    if (!deferred) return setSteps(true);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') write({ installed: true });
    else write({ dismissedAt: Date.now() });
    setOpen(false);
  };

  return (
    <aside
      aria-label="Installer l’application Maison Adama"
      className={cn(
        'fixed z-40 motion-safe:animate-sheet-up',
        'inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))]',
        'lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[25rem]',
      )}
    >
      <div className="flex flex-col gap-3 rounded-[24px] border border-filet bg-lin p-4 shadow-[0_24px_60px_rgb(43_29_18/0.28)]">
        <div className="flex items-start gap-3.5">
          <Image src="/icons/apple-touch-icon.png" alt="" width={56} height={56} className="size-14 shrink-0 rounded-[14px] ring-1 ring-filet" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <strong className="font-display text-[1.125rem] font-normal leading-tight text-encre">L’app Maison Adama</strong>
            <span className="text-[0.8125rem] leading-snug text-fumee">Votre parfumerie sur l’écran d’accueil : plus rapide, et lisible même sans connexion.</span>
          </div>
          <button type="button" onClick={dismiss} aria-label="Fermer" className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-fumee hover:bg-sable hover:text-encre">
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {steps || (ios && !deferred) ? (
          <ol className="flex flex-col gap-2 rounded-2xl bg-sable p-3 text-[0.8125rem] text-encre">
            <li className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lin text-[#0A84FF] ring-1 ring-filet">
                <Share className="size-4" strokeWidth={2} aria-hidden="true" />
              </span>
              Touchez <strong className="font-semibold">Partager</strong> dans la barre de Safari
            </li>
            <li className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lin text-encre ring-1 ring-filet">
                <SquarePlus className="size-4" strokeWidth={2} aria-hidden="true" />
              </span>
              Puis <strong className="font-semibold">Sur l’écran d’accueil</strong>
            </li>
          </ol>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={dismiss} className="h-11 flex-1 rounded-full border border-filet-fort text-sm font-semibold text-oud transition-colors duration-150 hover:bg-sable">
              Plus tard
            </button>
            <button type="button" onClick={install} className="h-11 flex-[1.4] rounded-full bg-oud text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-encre">
              Installer l’app
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
