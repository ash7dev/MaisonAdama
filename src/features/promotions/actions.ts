'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/features/auth/require-admin';
import { DASHBOARD_TAG } from '@/features/dashboard/queries';
import { SHOP_TAG } from '@/features/shop/queries';
import { toDomainError } from '@/lib/db-errors';
import { DomainError } from '@/lib/errors';
import { promotionInputSchema, toPromotionErrors, type PromotionFieldErrors } from './schemas';
import {
  createPromotion,
  deletePromotion,
  duplicatePromotion,
  PromotionFieldError,
  setPromotionActive,
  updatePromotion,
} from './services';

/** Les prix affichés partout (boutique, admin) dépendent des promotions. */
function revalidatePromotions() {
  revalidateTag(DASHBOARD_TAG); // carte « Promotion en cours »
  revalidateTag(SHOP_TAG); // prix barrés de la boutique
  revalidatePath('/', 'layout');
}

function errorMessage(error: unknown, fallback: string): string {
  const domain = toDomainError(error);
  if (domain instanceof DomainError) return domain.message;
  console.error(fallback, error);
  return fallback;
}

export type PromotionFormState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors: PromotionFieldErrors; formError?: string }
  | { status: 'success'; id: string; name: string; mode: 'create' | 'update' };

const metaSchema = z.object({ id: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }) }).nullable();

export async function savePromotionAction(_previous: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  const admin = await requireAdmin();

  let payload: unknown;
  let meta: unknown;
  try {
    payload = JSON.parse(String(formData.get('payload') ?? ''));
    meta = JSON.parse(String(formData.get('meta') ?? 'null'));
  } catch {
    return { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, rechargez la page.' };
  }

  const parsedMeta = metaSchema.safeParse(meta);
  const parsed = promotionInputSchema.safeParse(payload);
  if (!parsedMeta.success) return { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, rechargez la page.' };
  if (!parsed.success) {
    return { status: 'error', fieldErrors: toPromotionErrors(parsed.error), formError: 'Certains champs sont à corriger.' };
  }

  try {
    const saved = parsedMeta.data
      ? await updatePromotion(admin.id, parsedMeta.data.id, parsedMeta.data.expectedUpdatedAt, parsed.data)
      : await createPromotion(admin.id, parsed.data);
    revalidatePromotions();
    return { status: 'success', id: saved.id, name: saved.name, mode: parsedMeta.data ? 'update' : 'create' };
  } catch (error) {
    if (error instanceof PromotionFieldError) {
      return { status: 'error', fieldErrors: error.fieldErrors, formError: error.message };
    }
    return { status: 'error', fieldErrors: {}, formError: errorMessage(error, 'La promotion n’a pas pu être enregistrée.') };
  }
}

export type PromotionActionResult = { ok: true; message: string; id?: string } | { ok: false; error: string };

async function run(fn: (adminId: string) => Promise<unknown>, message: string): Promise<PromotionActionResult> {
  const admin = await requireAdmin();
  try {
    const result = await fn(admin.id);
    revalidatePromotions();
    const id = result && typeof result === 'object' && 'id' in result ? String(result.id) : undefined;
    return { ok: true, message, id };
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'L’action n’a pas pu être enregistrée.') };
  }
}

export async function togglePromotionAction(id: string, isActive: boolean) {
  return run((adminId) => setPromotionActive(adminId, id, isActive), isActive ? 'Promotion activée.' : 'Promotion désactivée.');
}

export async function duplicatePromotionAction(id: string) {
  return run((adminId) => duplicatePromotion(adminId, id), 'Copie créée (désactivée) : ajustez les dates puis activez-la.');
}

export async function deletePromotionAction(id: string) {
  return run((adminId) => deletePromotion(adminId, id), 'Promotion supprimée.');
}
