import type { Metadata } from 'next';
import { requireAdmin } from '@/features/auth/require-admin';
import { getPromotionPickerData } from '@/features/promotions/queries';
import PromotionForm from '@/features/promotions/components/PromotionForm';

export const metadata: Metadata = {
  title: 'Nouvelle promotion · Administration Maison Adama',
};

export default async function NewPromotionPage() {
  const [, picker] = await Promise.all([requireAdmin(), getPromotionPickerData()]);
  return <PromotionForm picker={picker} />;
}
