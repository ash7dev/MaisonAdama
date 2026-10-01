import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';

export const DELIVERY_ZONES_TAG = 'delivery-zones';

/** Zones proposées au checkout (actives, dans l'ordre choisi par l'admin), en cache. */
export const getActiveDeliveryZones = unstable_cache(
  async () =>
    withDbRetry(() =>
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, region: true, defaultFee: true, estimatedDelay: true },
      }),
    ),
  ['delivery-zones-active'],
  { revalidate: 300, tags: [DELIVERY_ZONES_TAG] },
);
