'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'error';
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** Notifie le résultat d'une action : « Commande confirmée », « Stock mis à jour »… */
export function useToast() {
  return useContext(ToastContext);
}

/**
 * Notifications de l'admin : une à la fois, en bas de l'écran (au-dessus de la
 * barre de navigation mobile), 4,5 s, fermables, annoncées aux lecteurs d'écran.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((message: string, tone: Tone = 'success') => setToast({ id: Date.now(), message, tone }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.tone === 'error' ? 7000 : 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6"
      >
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl py-3 pl-4 pr-2 text-sm shadow-lg motion-safe:animate-reveal',
              toast.tone === 'success' ? 'bg-encre text-lin' : 'bg-erreur text-lin',
            )}
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="mt-px size-4 shrink-0 text-or-clair" strokeWidth={2} aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-px size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Fermer la notification"
              className="-my-1 grid size-7 shrink-0 place-items-center rounded-full text-lin/70 transition-colors hover:bg-lin/10 hover:text-lin"
            >
              <X className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
