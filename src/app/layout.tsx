import type { Metadata, Viewport } from 'next';
import './globals.css';
import { marcellus, schibsted } from '@/config/fonts';
import PwaRegister from '@/components/PwaRegister';

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
  // Application installable : le manifeste vient de app/manifest.ts.
  applicationName: 'Maison Adama',
  appleWebApp: {
    capable: true,
    title: 'Maison Adama',
    // Barre d'état claire au-dessus du contenu (pas de chevauchement).
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
  // iOS antérieurs à 16.4 : balise historique du mode plein écran.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pas de zoom automatique quand on touche un champ (iOS zoome sous 16 px).
  // Le zoom à deux doigts reste possible sur iPhone (accessibilité).
  maximumScale: 1,
  // Plein écran sur iPhone : les zones sûres sont gérées (barre du bas, etc.).
  viewportFit: 'cover',
  themeColor: '#F1E9DB',
};

const RELOAD_TOP = `try{var n=performance.getEntriesByType('navigation')[0];if(n&&n.type==='reload'&&'scrollRestoration'in history){history.scrollRestoration='manual';window.scrollTo(0,0);addEventListener('load',function(){setTimeout(function(){history.scrollRestoration='auto'},0)})}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${marcellus.variable} ${schibsted.variable}`} suppressHydrationWarning>
      <head>
        {/* Rechargement : la page repart en haut. Sinon le navigateur rétablit l'ancienne
            position sur l'écran de chargement, plus court que la page, et tombe sur le
            footer. Le bouton Retour garde sa position (restauration rétablie après). */}
        <script dangerouslySetInnerHTML={{ __html: RELOAD_TOP }} />
      </head>
      {/* Header et footer : dans (storefront)/layout.tsx, pour ne pas habiller l'admin. */}
      <body suppressHydrationWarning>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
