import { permanentRedirect } from 'next/navigation';

/** Un univers = la boutique filtrée (une seule mise en page catalogue). */
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/boutique?univers=${encodeURIComponent(slug)}`);
}
