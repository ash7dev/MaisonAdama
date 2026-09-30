/**
 * Lien de conversation WhatsApp (wa.me) à partir d'un numéro E.164 (+221…).
 * Renvoie null si aucun numéro n'est configuré : le bouton est alors masqué.
 */
export function whatsappLink(phone: string | null | undefined, message?: string): string | null {
  const digits = phone?.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export const WHATSAPP_DEFAULT_MESSAGE = "Bonjour Maison Adama, j'ai une question sur un produit.";

export const WHATSAPP_NEWS_MESSAGE =
  'Bonjour Maison Adama, je souhaite recevoir les nouveautés et les sélections en avant-première.';
