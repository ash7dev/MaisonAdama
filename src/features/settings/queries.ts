import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/** Tout ce que la page Paramètres affiche, en une fois. */
export const getAdminSettings = cache(async () => {
  const [settings, zones] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: 1 } }),
    prisma.deliveryZone.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        region: true,
        defaultFee: true,
        estimatedDelay: true,
        isActive: true,
        position: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  return {
    settings: settings && { ...settings, updatedAt: settings.updatedAt.toISOString() },
    zones: zones.map(({ _count, updatedAt, ...zone }) => ({ ...zone, orders: _count.orders, updatedAt: updatedAt.toISOString() })),
  };
});

export type AdminSettings = Awaited<ReturnType<typeof getAdminSettings>>;
export type AdminStoreSettings = NonNullable<AdminSettings['settings']>;
export type AdminDeliveryZone = AdminSettings['zones'][number];
