'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker (application installable, hors connexion).
 * En développement, on désinscrit tout service worker resté d'un test de
 * production : le cache ne doit jamais masquer une modification en cours.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }
    const register = () => void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
