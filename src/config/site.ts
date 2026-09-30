export const siteConfig = {
  name: 'Maison Adama',
  description: 'Haute Parfumerie & Eaux d\'Oud au Sénégal',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://maisonadama.sn',
  ogImage: 'https://maisonadama.sn/og.jpg',
  links: {
    // Source de vérité : StoreSettings (modifiable depuis l'admin) ; valeur de secours.
    whatsapp: 'https://wa.me/221771059210',
  },
  /** Réseaux sociaux (liens nettoyés de leurs paramètres de suivi). */
  socials: {
    instagram: 'https://www.instagram.com/maisonadamathiouraye/',
    tiktok: 'https://www.tiktok.com/@adama.thiouray',
    facebook: 'https://www.facebook.com/share/1BoBX3NFw7/',
  },
};
