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
};

/**
 * Paramètres de la boutique (ligne unique id = 1), mis en cache 5 minutes.
 * L'admin invalide le cache après modification : revalidateTag(STORE_SETTINGS_TAG).
 * En cas d'indisponibilité de la base, le site s'affiche sans les contacts.
 */
export const getStoreSettings = unstable_cache(
  async (): Promise<PublicStoreSettings | null> => {
    try {
      return await prisma.storeSettings.findUnique({
        where: { id: 1 },
        select: {
          storeName: true,
          whatsappNumber: true,
          contactPhone: true,
          contactEmail: true,
          waveMerchantCode: true,
          waveQrImagePath: true,
        },
      });
    } catch (error) {
      console.error('Paramètres boutique indisponibles', error);
      return null;
    }
  },
  ['store-settings'],
  { revalidate: 300, tags: [STORE_SETTINGS_TAG] },
);
