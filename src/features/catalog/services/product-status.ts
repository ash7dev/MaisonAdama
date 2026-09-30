import { withAdmin } from '@/lib/db-context';
import { DomainError } from '@/lib/errors';

export type ProductStatusChange = 'publish' | 'unpublish' | 'archive' | 'restore';

/**
 * Change la visibilité d'un produit, dans une transaction signée (audit).
 *  - publier : exige au moins une photo (règle de l'application) ; la base exige
 *    en plus une contenance active (vérifiée au COMMIT) ;
 *  - archiver : le retire de la boutique sans rien supprimer (historique des ventes intact) ;
 *  - restaurer : le remet en brouillon, jamais directement en ligne.
 */
export async function changeProductStatus(adminId: string, productId: string, change: ProductStatusChange) {
  return withAdmin(adminId, async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        slug: true,
        isPublished: true,
        isArchived: true,
        publishedAt: true,
        category: { select: { slug: true } },
        _count: { select: { images: true } },
        variants: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
    });
    if (!product) throw new DomainError('Ce produit n’existe plus.', 'PRODUCT_NOT_FOUND');

    switch (change) {
      case 'publish':
        if (product.isArchived) throw new DomainError('Restaurez d’abord ce produit archivé.', 'PRODUCT_ARCHIVED');
        if (product._count.images === 0) throw new DomainError('Ajoutez au moins une photo avant de publier.', 'PRODUCT_WITHOUT_IMAGE');
        if (product.variants.length === 0) throw new DomainError('Ajoutez une contenance active avant de publier.', 'PRODUCT_WITHOUT_ACTIVE_VARIANT');
        await tx.product.update({
          where: { id: productId },
          data: { isPublished: true, publishedAt: product.publishedAt ?? new Date() },
        });
        break;
      case 'unpublish':
        await tx.product.update({ where: { id: productId }, data: { isPublished: false } });
        break;
      case 'archive':
        await tx.product.update({ where: { id: productId }, data: { isPublished: false, isArchived: true } });
        break;
      case 'restore':
        await tx.product.update({ where: { id: productId }, data: { isArchived: false } });
        break;
    }

    return { slug: product.slug, categorySlug: product.category.slug };
  });
}
