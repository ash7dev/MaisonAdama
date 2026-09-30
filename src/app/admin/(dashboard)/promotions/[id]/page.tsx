import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/features/auth/require-admin';
import { getPromotionForEdit, getPromotionPickerData } from '@/features/promotions/queries';
import PromotionForm from '@/features/promotions/components/PromotionForm';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const promotion = await getPromotionForEdit(id);
  return { title: `${promotion ? promotion.name : 'Promotion introuvable'} · Administration Maison Adama` };
}

export default async function EditPromotionPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [, promotion, picker] = await Promise.all([requireAdmin(), getPromotionForEdit(id), getPromotionPickerData(id)]);
  if (!promotion) notFound();
  // Nouvelle version enregistrée → nouvelle clé : le formulaire repart des données fraîches.
  return <PromotionForm key={promotion.updatedAt} picker={picker} promotion={promotion} />;
}
