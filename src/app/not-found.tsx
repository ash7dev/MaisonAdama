import Link from 'next/link';
import StorefrontShell from '@/components/layout/StorefrontShell';

export default function NotFound() {
  return (
    <StorefrontShell>
      <NotFoundContent />
    </StorefrontShell>
  );
}

function NotFoundContent() {
  return (
    <div className="container" style={{ padding: '100px 24px', textAlign: 'center' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '48px 32px' }}>
        <span className="badge-gold" style={{ marginBottom: '12px', display: 'inline-block' }}>Erreur 404</span>
        <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>Page non trouvée</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn-gold">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
