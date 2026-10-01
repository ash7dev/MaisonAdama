'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mise à jour silencieuse : la page se recharge en arrière-plan (données
 * serveur seulement, sans perdre la saisie ni la position) toutes les
 * `intervalMs`, et dès que l'on revient sur l'onglet. Rien ne se passe
 * tant que l'onglet est masqué : aucune requête inutile.
 */
export default function LiveRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      last.current = Date.now();
      router.refresh();
    };
    const timer = setInterval(refresh, intervalMs);
    // Retour sur l'onglet : on rafraîchit si la dernière mise à jour date de plus de 15 s.
    const onVisible = () => document.visibilityState === 'visible' && Date.now() - last.current > 15_000 && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
