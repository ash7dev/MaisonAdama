import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** La recherche vit dans la boutique (filtres, tri, vitrine) : /recherche?q= y renvoie. */
export default async function RecherchePage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  redirect(q ? `/boutique?q=${encodeURIComponent(q.slice(0, 60))}` : '/boutique');
}
