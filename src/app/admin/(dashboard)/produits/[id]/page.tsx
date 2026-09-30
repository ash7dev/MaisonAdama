import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/features/auth/require-admin';
import { getProductFormOptions } from '@/features/catalog/queries/get-product-form-options';
import { getProductForEdit } from '@/features/catalog/queries/get-product-for-edit';
import ProductForm from '@/features/catalog/components/ProductForm';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enregistre?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductForEdit(id);
  return { title: `${product ? product.name : 'Produit introuvable'} · Administration Maison Adama` };
}

export default async function EditProductPage({ params, searchParams }: PageProps) {
  const [{ id }, { enregistre }] = await Promise.all([params, searchParams]);
  const [, product, options] = await Promise.all([requireAdmin(), getProductForEdit(id), getProductFormOptions()]);
  if (!product) notFound();

  // Nouvelle version enregistrée → nouvelle clé : le formulaire repart des données fraîches.
  return <ProductForm key={product.updatedAt} options={options} product={product} saved={enregistre === '1'} />;
}
