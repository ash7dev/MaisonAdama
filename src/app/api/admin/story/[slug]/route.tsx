import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getAdminSession } from '@/features/auth/require-admin';
import { getStoryData, STORY_TEMPLATES, type StoryTemplate } from '@/features/stories/data';
import { STORY_H, STORY_W, StoryArtwork } from '@/features/stories/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FONT_DIR = join(process.cwd(), 'src/features/stories/fonts');

/** Polices de la Maison (latin + latin étendu), chargées une fois par instance. */
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(
    [
      ['Marcellus', 'Marcellus-Latin.woff', 400],
      ['Marcellus', 'Marcellus-LatinExt.woff', 400],
      ['Schibsted', 'Schibsted-400-Latin.woff', 400],
      ['Schibsted', 'Schibsted-400-LatinExt.woff', 400],
      ['Schibsted', 'Schibsted-600-Latin.woff', 600],
      ['Schibsted', 'Schibsted-600-LatinExt.woff', 600],
    ].map(async ([name, file, weight]) => ({
      name: name as string,
      data: await readFile(join(FONT_DIR, file as string)),
      weight: weight as 400 | 600,
      style: 'normal' as const,
    })),
  );
  return fonts;
}

/**
 * Story d'un produit, au format 1080 × 1920 (PNG), pour les statuts WhatsApp,
 * les stories Instagram et Snapchat. Réservé à l'administration.
 * ?t=couverture|arche|chiffre|cartel · ?p=<n° de photo> · ?dl=1 (téléchargement)
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await getAdminSession())) return new Response('Non autorisé', { status: 401 });

  const { slug } = await params;
  const url = new URL(request.url);
  const t = url.searchParams.get('t') as StoryTemplate | null;
  const template: StoryTemplate = t && STORY_TEMPLATES.includes(t) ? t : 'couverture';
  const photo = Math.max(0, Math.min(11, Number(url.searchParams.get('p')) || 0));

  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return new Response('Produit introuvable', { status: 404 });
  const data = await getStoryData(slug, photo);
  if (!data) return Response.json({ error: 'Cette création n’est pas publiée : publiez-la avant de la partager.' }, { status: 404 });
  if (!data.photo) return Response.json({ error: 'Ajoutez une photo à cette création pour créer sa story.' }, { status: 422 });
  if (template === 'chiffre' && !data.percent) return Response.json({ error: 'Aucune promotion en cours sur cette création.' }, { status: 409 });

  const image = new ImageResponse(<StoryArtwork template={template} data={data} />, {
    width: STORY_W,
    height: STORY_H,
    fonts: await loadFonts(),
  });
  const filename = `maison-adama-${data.slug}-${template}.png`;
  return new Response(image.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${url.searchParams.get('dl') ? 'attachment' : 'inline'}; filename="${filename}"`,
    },
  });
}
