import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administration · Maison Adama',
  // L'espace admin n'a rien à faire dans les moteurs de recherche.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
