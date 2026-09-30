import type { Metadata } from 'next';
import { requireAdmin } from '@/features/auth/require-admin';
import { getProductFormOptions } from '@/features/catalog/queries/get-product-form-options';
import ProductForm from '@/features/catalog/components/ProductForm';

export const metadata: Metadata = {
  title: 'Nouveau produit · Administration Maison Adama',
};

export default async function NewProductPage() {
  const [, options] = await Promise.all([requireAdmin(), getProductFormOptions()]);
  return <ProductForm options={options} />;
}
