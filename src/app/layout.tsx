import type { Metadata } from 'next';
import './globals.css';
import { marcellus, schibsted } from '@/config/fonts';

export const metadata: Metadata = {
  title: 'Maison Adama Tchurayy | Haute Parfumerie & Eaux d\'Oud au Sénégal',
  description:
    'Découvrez les créations de luxe de la Maison Adama Tchurayy. Parfums d\'exception, muscs précieux, huiles rares et thouraye royal au Sénégal. Livraison rapide et paiement Wave ou à la livraison.',
  keywords: ['Parfum Sénégal', 'Musc Dakar', 'Oud Sénégal', 'Thiouraye', 'Bakhour', 'Maison Adama'],
  openGraph: {
    title: 'Maison Adama — Parfumerie d\'Exception au Sénégal',
    description: 'Savoir-faire et effluves d\'exception. Commandez en ligne sans création de compte.',
    type: 'website',
    locale: 'fr_SN',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${marcellus.variable} ${schibsted.variable}`} suppressHydrationWarning>
      {/* Header et footer : dans (storefront)/layout.tsx, pour ne pas habiller l'admin. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
