'use server';

import { requireAdmin } from '@/features/auth/require-admin';
import { getStoryOptions } from './data';

export type StoryOptions = NonNullable<Awaited<ReturnType<typeof getStoryOptions>>>;

/** Ce que le studio de story propose pour une création : photos, promo, nouveauté. */
export async function getStoryOptionsAction(slug: string): Promise<StoryOptions | null> {
  await requireAdmin();
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,180}$/.test(slug)) return null;
  return getStoryOptions(slug);
}
