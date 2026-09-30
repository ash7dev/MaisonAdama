'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireAdmin } from '@/features/auth/require-admin';
import { DELIVERY_ZONES_TAG } from '@/features/delivery';
import { withAdmin } from '@/lib/db-context';
import { toDomainError } from '@/lib/db-errors';
import { DomainError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PRODUCT_BUCKET } from '@/lib/supabase/storage';
import { STORE_SETTINGS_TAG } from './index';
import {
  deliveryZoneSchema,
  storeInfoSchema,
  SUGGESTED_ZONES,
  toFieldErrors,
  WAVE_QR_PATH,
  waveSchema,
  type DeliveryZoneInput,
  type FieldErrors,
  type StoreInfoInput,
  type WaveInput,
} from './schemas';

export type SettingsResult = { ok: true; message: string; updatedAt?: string } | { ok: false; error: string; fieldErrors?: FieldErrors };

const STALE = 'Ces réglages ont été modifiés entre-temps : rechargez la page pour voir la dernière version.';

function failure(error: unknown, fallback: string): SettingsResult {
  const domain = toDomainError(error);
  if (domain instanceof DomainError) return { ok: false, error: domain.message };
  console.error(fallback, error);
  return { ok: false, error: fallback };
}

/** Le nom, les contacts et Wave s'affichent dans toute la boutique. */
function revalidateStore() {
  revalidateTag(STORE_SETTINGS_TAG);
  revalidatePath('/', 'layout');
}

function revalidateZones() {
  revalidateTag(DELIVERY_ZONES_TAG);
  revalidatePath('/admin/parametres');
}

const isoDate = z.string().datetime({ offset: true }).nullable();

/** Met à jour la ligne unique (id = 1), ou la crée si elle n'existe pas encore. */
async function writeSettings(adminId: string, expectedUpdatedAt: string | null, data: Prisma.StoreSettingsUpdateInput & { storeName?: string }) {
  return withAdmin(adminId, async (tx) => {
    const current = await tx.storeSettings.findUnique({ where: { id: 1 }, select: { updatedAt: true, storeName: true } });
    if (current && expectedUpdatedAt && current.updatedAt.toISOString() !== expectedUpdatedAt) throw new DomainError(STALE);
    const saved = current
      ? await tx.storeSettings.update({ where: { id: 1 }, data })
      : await tx.storeSettings.create({ data: { id: 1, storeName: data.storeName ?? 'Maison Adama', ...data } as Prisma.StoreSettingsCreateInput });
    return saved.updatedAt.toISOString();
  });
}

// -----------------------------------------------------------------------------
//  Boutique et contacts
// -----------------------------------------------------------------------------

export async function saveStoreInfoAction(input: StoreInfoInput, expectedUpdatedAt: string | null): Promise<SettingsResult> {
  const admin = await requireAdmin();
  const parsed = storeInfoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Certains champs sont à corriger.', fieldErrors: toFieldErrors(parsed.error) };
  if (!isoDate.safeParse(expectedUpdatedAt).success) return { ok: false, error: 'Formulaire illisible, rechargez la page.' };
  try {
    const updatedAt = await writeSettings(admin.id, expectedUpdatedAt, parsed.data);
    revalidateStore();
    return { ok: true, message: 'Informations de la boutique enregistrées.', updatedAt };
  } catch (error) {
    return failure(error, 'Les informations n’ont pas pu être enregistrées.');
  }
}

// -----------------------------------------------------------------------------
//  Paiement Wave
// -----------------------------------------------------------------------------

export type QrUploadTicket = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

export async function createWaveQrUploadAction(): Promise<QrUploadTicket> {
  await requireAdmin();
  const path = `catalog/settings/wave-qr-${randomUUID()}.webp`;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('URL d’envoi refusée', error);
    return { ok: false, error: 'L’envoi d’images est momentanément indisponible.' };
  }
  return { ok: true, path: data.path, signedUrl: data.signedUrl };
}

/** Supprime un QR envoyé mais pas enregistré (ou remplacé). Jamais celui en service. */
export async function discardWaveQrAction(path: string): Promise<void> {
  await requireAdmin();
  if (!WAVE_QR_PATH.test(path)) return;
  const current = await prisma.storeSettings.findUnique({ where: { id: 1 }, select: { waveQrImagePath: true } });
  if (current?.waveQrImagePath === path) return;
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
}

export async function saveWaveAction(input: WaveInput, expectedUpdatedAt: string | null): Promise<SettingsResult> {
  const admin = await requireAdmin();
  const parsed = waveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Certains champs sont à corriger.', fieldErrors: toFieldErrors(parsed.error) };
  if (!isoDate.safeParse(expectedUpdatedAt).success) return { ok: false, error: 'Formulaire illisible, rechargez la page.' };

  try {
    const previous = await prisma.storeSettings.findUnique({ where: { id: 1 }, select: { waveQrImagePath: true } });
    if (parsed.data.waveQrImagePath && parsed.data.waveQrImagePath !== previous?.waveQrImagePath) {
      // Le fichier doit vraiment exister dans le bucket.
      const supabase = await createSupabaseServerClient();
      const folder = 'catalog/settings';
      const file = parsed.data.waveQrImagePath.slice(folder.length + 1);
      const { data } = await supabase.storage.from(PRODUCT_BUCKET).list(folder, { search: file, limit: 1 });
      if (!data?.some((f) => f.name === file)) return { ok: false, error: 'Le QR code n’a pas été reçu : renvoyez l’image.' };
    }

    const updatedAt = await writeSettings(admin.id, expectedUpdatedAt, parsed.data);

    // Ancien QR remplacé ou retiré : on libère le fichier.
    if (previous?.waveQrImagePath && previous.waveQrImagePath !== parsed.data.waveQrImagePath) {
      const supabase = await createSupabaseServerClient();
      await supabase.storage.from(PRODUCT_BUCKET).remove([previous.waveQrImagePath]);
    }
    revalidateStore();
    return { ok: true, message: 'Paiement Wave enregistré.', updatedAt };
  } catch (error) {
    return failure(error, 'Le paiement Wave n’a pas pu être enregistré.');
  }
}

// -----------------------------------------------------------------------------
//  Zones de livraison
// -----------------------------------------------------------------------------

const idSchema = z.string().uuid();

function zoneFailure(error: unknown, fallback: string): SettingsResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return { ok: false, error: 'Une zone porte déjà ce nom.', fieldErrors: { name: 'Une zone porte déjà ce nom.' } };
  }
  return failure(error, fallback);
}

/** Crée (id null) ou modifie une zone. Le tarif ne change jamais les commandes passées. */
export async function saveDeliveryZoneAction(id: string | null, input: DeliveryZoneInput, expectedUpdatedAt: string | null): Promise<SettingsResult> {
  const admin = await requireAdmin();
  const parsed = deliveryZoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Certains champs sont à corriger.', fieldErrors: toFieldErrors(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: 'Zone introuvable.' };

  try {
    await withAdmin(admin.id, async (tx) => {
      if (id === null) {
        const last = await tx.deliveryZone.aggregate({ _max: { position: true } });
        await tx.deliveryZone.create({ data: { ...parsed.data, position: (last._max.position ?? 0) + 1 } });
        return;
      }
      const { count } = await tx.deliveryZone.updateMany({
        where: { id, ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
        data: parsed.data,
      });
      if (count === 0) throw new DomainError(STALE);
    });
    revalidateZones();
    return { ok: true, message: id ? `Zone « ${parsed.data.name} » mise à jour.` : `Zone « ${parsed.data.name} » ajoutée.` };
  } catch (error) {
    return zoneFailure(error, 'La zone n’a pas pu être enregistrée.');
  }
}

export async function toggleDeliveryZoneAction(id: string, isActive: boolean): Promise<SettingsResult> {
  const admin = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: 'Zone introuvable.' };
  try {
    const zone = await withAdmin(admin.id, (tx) => tx.deliveryZone.update({ where: { id }, data: { isActive }, select: { name: true } }));
    revalidateZones();
    return { ok: true, message: isActive ? `« ${zone.name} » est de nouveau proposée.` : `« ${zone.name} » n’est plus proposée au checkout.` };
  } catch (error) {
    return failure(error, 'La zone n’a pas pu être modifiée.');
  }
}

/** Suppression possible seulement si aucune commande n'y a été livrée (sinon : désactiver). */
export async function deleteDeliveryZoneAction(id: string): Promise<SettingsResult> {
  const admin = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: 'Zone introuvable.' };
  try {
    const name = await withAdmin(admin.id, async (tx) => {
      const zone = await tx.deliveryZone.findUnique({ where: { id }, select: { name: true, _count: { select: { orders: true } } } });
      if (!zone) throw new DomainError('Zone introuvable.');
      if (zone._count.orders > 0) throw new DomainError('Des commandes utilisent cette zone : désactivez-la plutôt.');
      await tx.deliveryZone.delete({ where: { id } });
      return zone.name;
    });
    revalidateZones();
    return { ok: true, message: `Zone « ${name} » supprimée.` };
  } catch (error) {
    return failure(error, 'La zone n’a pas pu être supprimée.');
  }
}

/** Nouvel ordre d'affichage au checkout (liste complète des ids). */
export async function reorderDeliveryZonesAction(ids: string[]): Promise<SettingsResult> {
  const admin = await requireAdmin();
  if (!z.array(idSchema).max(200).safeParse(ids).success) return { ok: false, error: 'Ordre invalide.' };
  try {
    await withAdmin(admin.id, async (tx) => {
      for (const [index, id] of ids.entries()) await tx.deliveryZone.update({ where: { id }, data: { position: index + 1 } });
    });
    revalidateZones();
    return { ok: true, message: 'Ordre enregistré.' };
  } catch (error) {
    return failure(error, 'L’ordre n’a pas pu être enregistré.');
  }
}

/** Ajoute les zones proposées manquantes (jamais d'écrasement d'un tarif existant). */
export async function importSuggestedZonesAction(): Promise<SettingsResult> {
  const admin = await requireAdmin();
  try {
    const added = await withAdmin(admin.id, async (tx) => {
      const existing = new Set((await tx.deliveryZone.findMany({ select: { name: true } })).map((z) => z.name));
      const last = await tx.deliveryZone.aggregate({ _max: { position: true } });
      let position = last._max.position ?? 0;
      let count = 0;
      for (const zone of SUGGESTED_ZONES) {
        if (existing.has(zone.name)) continue;
        await tx.deliveryZone.create({ data: { ...zone, position: ++position, isActive: true } });
        count++;
      }
      return count;
    });
    revalidateZones();
    return { ok: true, message: added ? `${added} zone${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''} : vérifiez les tarifs.` : 'Ces zones existent déjà.' };
  } catch (error) {
    return failure(error, 'Les zones n’ont pas pu être ajoutées.');
  }
}
