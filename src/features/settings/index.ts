import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export const STORE_SETTINGS_TAG = 'store-settings';

export type PublicStoreSettings = {
  storeName: string;
  whatsappNumber: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  waveMerchantCode: string | null;
  waveQrImagePath: string | null;
  wavePaymentLink: string | null;
};

const readStoreSettings = unstable_cache(
  // Une erreur remonte : elle n'est jamais mise en cache (voir getStoreSettings).
  async (): Promise<PublicStoreSettings | null> =>
    prisma.storeSettings.findUnique({
      where: { id: 1 },
      select: {
        storeName: true,
        whatsappNumber: true,
        contactPhone: true,
        contactEmail: true,
        waveMerchantCode: true,
        waveQrImagePath: true,
        wavePaymentLink: true,
      },
    }),
  ['store-settings'],
  { revalidate: 300, tags: [STORE_SETTINGS_TAG] },
);

/**
 * Paramètres de la boutique (ligne unique id = 1), mis en cache 5 minutes.
 * L'admin invalide le cache après modification : revalidateTag(STORE_SETTINGS_TAG).
 * Base momentanément indisponible : le site s'affiche sans les contacts, et la
 * lecture suivante réessaie (un échec n'est jamais gardé en cache).
 */
export async function getStoreSettings(): Promise<PublicStoreSettings | null> {
  try {
    return await readStoreSettings();
  } catch (error) {
    console.error('Paramètres boutique indisponibles', error);
    return null;
  }
}
