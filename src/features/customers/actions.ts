'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/features/auth/require-admin';
import { withAdmin } from '@/lib/db-context';
import { toDomainError } from '@/lib/db-errors';
import { DomainError } from '@/lib/errors';
import { CUSTOMER_NOTE_MAX } from './customer-ui';

const noteSchema = z.object({
  id: z.string().uuid(),
  note: z.string().max(CUSTOMER_NOTE_MAX, `${CUSTOMER_NOTE_MAX} caractères au maximum.`),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});

export type CustomerNoteResult = { ok: true; updatedAt: string; note: string | null } | { ok: false; error: string };

/**
 * Note interne sur un client (préférences, adresse précise, consignes de livraison…).
 * Jamais visible par le client. Concurrence optimiste : si la note a changé
 * entre-temps (autre onglet, autre admin), on refuse plutôt que d'écraser.
 */
export async function saveCustomerNoteAction(input: { id: string; note: string; expectedUpdatedAt: string }): Promise<CustomerNoteResult> {
  const admin = await requireAdmin();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Note invalide.' };

  const note = parsed.data.note.trim() || null;
  try {
    const saved = await withAdmin(admin.id, async (tx) => {
      const { count } = await tx.customer.updateMany({
        where: { id: parsed.data.id, updatedAt: new Date(parsed.data.expectedUpdatedAt) },
        data: { adminNote: note },
      });
      if (count === 0) {
        const exists = await tx.customer.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
        throw new DomainError(
          exists ? 'La fiche a été modifiée entre-temps : rechargez la page pour voir la dernière version.' : 'Client introuvable.',
        );
      }
      return tx.customer.findUniqueOrThrow({ where: { id: parsed.data.id }, select: { updatedAt: true, adminNote: true } });
    });
    revalidatePath('/admin/clients');
    return { ok: true, updatedAt: saved.updatedAt.toISOString(), note: saved.adminNote };
  } catch (error) {
    const domain = toDomainError(error);
    if (domain instanceof DomainError) return { ok: false, error: domain.message };
    console.error('saveCustomerNoteAction', error);
    return { ok: false, error: 'La note n’a pas pu être enregistrée.' };
  }
}
