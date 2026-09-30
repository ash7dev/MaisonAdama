'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Une erreur est survenue</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Désolé, une erreur inattendue est survenue. Notre équipe a été notifiée.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => reset()} className="btn-gold">
            Réessayer
          </button>
          <Link href="/" className="btn-outline">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
