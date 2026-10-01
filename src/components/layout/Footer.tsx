// src/components/layout/Footer.tsx
// Server Component : aucun JavaScript envoyé au navigateur (accordéons en <details> natifs).
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MessageCircle, Phone, Plus } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { WHATSAPP_DEFAULT_MESSAGE, WHATSAPP_NEWS_MESSAGE, whatsappLink } from '@/lib/whatsapp';

/**
 * Photo d'ambiance du panneau gauche (desktop), ex. '/images/footer-thiouraye.jpg'.
 * null : panneau uni couleur paille — le design est pensé pour tenir sans photo.
 */
const FOOTER_PHOTO: string | null = null;

type FooterLink = { label: string; href: string };
type FooterColumn = { id: string; title: string; links: FooterLink[] };

const COLUMNS: FooterColumn[] = [
  {
    id: 'boutique',
    title: 'Boutique',
    links: [
      { label: 'Toute la boutique', href: '/boutique' },
      { label: 'Parfums', href: '/boutique?univers=parfums' },
      { label: 'Muscs', href: '/boutique?univers=muscs' },
      { label: 'Huiles', href: '/boutique?univers=huiles' },
      { label: 'Oud', href: '/boutique?univers=oud' },
      { label: 'Encens (thiouraye)', href: '/boutique?univers=encens' },
    ],
  },
  {
    id: 'maison',
    title: 'La Maison',
    links: [
      { label: 'Notre histoire', href: '/a-propos' },
      { label: 'Nouveautés', href: '/collections/nouveautes' },
      { label: 'Best-sellers', href: '/collections/best-sellers' },
      { label: 'Idées cadeaux', href: '/collections/idees-cadeaux' },
    ],
  },
  {
    id: 'aide',
    title: 'Aide',
    links: [
      { label: 'Livraison et paiement', href: '/aide/livraison-et-paiement' },
      { label: 'Comment commander', href: '/aide/comment-commander' },
      { label: 'Questions fréquentes', href: '/aide/questions-frequentes' },
    ],
  },
];

/**
 * Pages légales (CGV, mentions légales, confidentialité) : à ajouter ici dès
 * qu'elles existent. Elles demandent les informations de l'entreprise
 * (raison sociale, NINEA, adresse, responsable de publication).
 */
const LEGAL_LINKS: FooterLink[] = [];

const PAYMENT_METHODS = ['Wave', 'Espèces à la livraison'];

type FooterProps = {
  /** Format +221XXXXXXXXX, issu de StoreSettings */
  whatsappNumber?: string | null;
  contactPhone?: string | null;
};

/** +221771059210 → 77 105 92 10 */
function formatLocalPhone(phone: string): string {
  const m = phone.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

export default function Footer({ whatsappNumber, contactPhone }: FooterProps) {
  const year = new Date().getFullYear();
  const whatsappHref = whatsappLink(whatsappNumber, WHATSAPP_DEFAULT_MESSAGE);
  const newsHref = whatsappLink(whatsappNumber, WHATSAPP_NEWS_MESSAGE);
  const phoneLabel = contactPhone ? formatLocalPhone(contactPhone) : null;

  return (
    <footer className="mt-24 px-3 pb-3 lg:mt-32 lg:px-6 lg:pb-6">
      <div className="mx-auto grid max-w-shop gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.22fr)]">
        {/* ── Panneau image : marque + conseil (desktop) ─────────────────── */}
        <section
          aria-labelledby="footer-advice"
          className="relative hidden flex-col justify-between gap-10 overflow-hidden rounded-[40px] bg-paille p-7 lg:flex"
        >
          {FOOTER_PHOTO && (
            <Image src={FOOTER_PHOTO} alt="" fill sizes="(min-width: 1024px) 45vw, 0px" className="object-cover" />
          )}

          <Link
            href="/"
            className="relative flex items-center gap-3.5 self-start rounded-full bg-lin/85 py-2 pl-2 pr-5 backdrop-blur-sm"
          >
            <Image
              src="/images/logomasonAdama.jpg"
              alt=""
              width={104}
              height={104}
              className="size-[52px] rounded-full"
            />
            <span className="flex flex-col gap-1.5">
              <span className="font-display text-[1.3125rem] leading-none text-oud">Maison Adama</span>
              <span className="text-[0.5625rem] leading-none tracking-[0.32em] text-or-profond">TCHURAYY · DAKAR</span>
            </span>
          </Link>

          <div className="relative flex flex-col gap-3.5 rounded-[30px] bg-lin p-8 shadow-lg">
            <p className="text-[0.6875rem] tracking-[0.3em] text-or-profond">CONSEIL PERSONNALISÉ</p>
            <h2 id="footer-advice" className="text-[2.25rem] leading-[1.1] text-encre">
              Une question sur un parfum ? Adama vous répond.
            </h2>
            {(whatsappHref || phoneLabel) && (
              <div className="mt-2 flex flex-wrap gap-2.5">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-14 items-center gap-3 rounded-full bg-oud pl-6 pr-2 text-[0.9375rem] font-semibold text-sur-oud transition-colors duration-150 hover:bg-oud-hover"
                  >
                    Écrire sur WhatsApp
                    <span className="grid size-10 place-items-center rounded-full bg-sur-oud text-oud">
                      <MessageCircle className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
                    </span>
                  </a>
                )}
                {contactPhone && phoneLabel && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex h-14 items-center gap-2.5 rounded-full border border-filet-fort px-[22px] text-[0.90625rem] tabular-nums text-oud transition-colors duration-150 hover:bg-sable"
                  >
                    <Phone className="size-4 text-or" strokeWidth={1.7} aria-hidden="true" />
                    {phoneLabel}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Panneau oud : navigation, nouveautés, mentions ─────────────── */}
        <div className="relative flex flex-col overflow-hidden rounded-[30px] bg-oud text-sur-oud lg:rounded-[40px] lg:px-13 lg:pt-12">
          {/* Conseil (mobile) */}
          {(whatsappHref || contactPhone) && (
            <section
              aria-labelledby="footer-advice-mobile"
              className="flex flex-col gap-4 border-b border-sur-oud/12 px-5 pb-[22px] pt-[26px] lg:hidden"
            >
              <h2 id="footer-advice-mobile" className="text-[1.5625rem] leading-[1.12] text-sur-oud">
                Une question ? Adama vous répond.
              </h2>
              <div className="flex gap-2">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-[54px] flex-1 items-center justify-center gap-2.5 rounded-full bg-sur-oud text-[0.9375rem] font-semibold text-oud"
                  >
                    <MessageCircle className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
                    Écrire sur WhatsApp
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    aria-label={`Appeler le ${phoneLabel}`}
                    className="grid size-[54px] shrink-0 place-items-center rounded-full ring-1 ring-inset ring-sur-oud/28"
                  >
                    <Phone className="size-[18px] text-or-clair" strokeWidth={1.7} aria-hidden="true" />
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Colonnes (desktop) */}
          <div className="hidden grid-cols-3 gap-8 lg:grid">
            {COLUMNS.map((column) => (
              <nav key={column.id} aria-labelledby={`footer-${column.id}`} className="flex flex-col gap-[18px]">
                <h3
                  id={`footer-${column.id}`}
                  className="font-sans text-[0.71875rem] font-medium uppercase tracking-[0.26em] text-or-clair"
                >
                  {column.title}
                </h3>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[0.9375rem] text-sur-oud/75 decoration-or underline-offset-[6px] transition-colors duration-150 hover:text-sur-oud hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Accordéons (mobile) : un seul ouvert à la fois */}
          <div className="px-5 lg:hidden">
            {COLUMNS.map((column) => (
              <details key={column.id} name="footer-nav" className="group border-b border-sur-oud/12">
                <summary className="flex h-14 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                  <span className="text-[0.71875rem] font-medium uppercase tracking-[0.26em] text-or-clair">{column.title}</span>
                  <span className="grid size-[30px] place-items-center rounded-full ring-1 ring-inset ring-sur-oud/22">
                    <Plus
                      className="size-3.5 transition-transform duration-250 ease-out-soft group-open:rotate-45"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>
                </summary>
                <ul className="grid grid-cols-2 gap-x-3 pb-4">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="flex h-[42px] items-center text-[0.90625rem] text-sur-oud/80">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          {/* Nouveautés sur WhatsApp */}
          {newsHref && (
            <a
              href={newsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group/news flex items-center justify-between gap-4',
                'mx-5 h-[60px] border-b border-sur-oud/12',
                'lg:mx-0 lg:mt-9 lg:h-auto lg:rounded-full lg:border-0 lg:bg-sur-oud/[0.07] lg:py-3 lg:pl-6 lg:pr-3 lg:ring-1 lg:ring-inset lg:ring-sur-oud/14',
              )}
            >
              <span className="flex items-center gap-2.5 lg:flex-col lg:items-start lg:gap-1">
                <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-or lg:hidden" />
                <span className="text-[0.90625rem] lg:font-display lg:text-[1.25rem]">
                  <span className="lg:hidden">Nouveautés en avant-première sur WhatsApp</span>
                  <span className="hidden lg:inline">Les nouveautés, en avant-première</span>
                </span>
                <span className="hidden text-[0.8125rem] text-sur-oud/60 lg:block">
                  Arrivages et nouvelles créations, sur WhatsApp
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-or-clair lg:hidden" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-or px-[18px] text-[0.84375rem] font-semibold text-encre transition-colors duration-150 group-hover/news:bg-or-clair lg:flex">
                Rejoindre
                <ArrowRight className="size-[15px]" strokeWidth={2} aria-hidden="true" />
              </span>
            </a>
          )}

          {/* Paiement, réseaux, mentions */}
          <div className="flex flex-col gap-3.5 px-5 pt-5 lg:mt-7 lg:gap-0 lg:border-t lg:border-sur-oud/12 lg:px-0 lg:pt-0">
            <div className="flex items-center justify-between gap-4 lg:flex-row-reverse lg:py-5">
              <ul className="flex gap-2" aria-label="Réseaux sociaux">
                <SocialLink href={siteConfig.socials.instagram} label="Instagram">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
                </SocialLink>
                <SocialLink href={siteConfig.socials.tiktok} label="TikTok">
                  <path d="M14 3.5v11a3.5 3.5 0 1 1-3.5-3.5" />
                  <path d="M14 3.5c.6 2.6 2.4 4.4 5 4.8" />
                </SocialLink>
                <SocialLink href={siteConfig.socials.facebook} label="Facebook">
                  <path d="M15 3.5h-2a4 4 0 0 0-4 4v3H6.5v3.5H9v6.5h3.5V14H15l.5-3.5h-3v-2.5a1 1 0 0 1 1-1H15.5z" />
                </SocialLink>
              </ul>

              <p className="text-right text-[0.71875rem] leading-normal text-sur-oud/70 lg:hidden">
                Wave
                <br />
                ou espèces à la livraison
              </p>
              <ul className="hidden gap-2 lg:flex" aria-label="Moyens de paiement acceptés">
                {PAYMENT_METHODS.map((method) => (
                  <li
                    key={method}
                    className="flex h-[30px] items-center rounded-full px-[13px] text-xs font-medium text-sur-oud/85 ring-1 ring-inset ring-sur-oud/22"
                  >
                    {method}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.71875rem] text-sur-oud/50 lg:justify-between lg:text-[0.78125rem]">
              <p>© {year} Maison Adama Tchurayy · Dakar</p>
              {LEGAL_LINKS.length > 0 && (
                <ul className="flex gap-3.5 lg:gap-[18px]">
                  {LEGAL_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="transition-colors duration-150 hover:text-sur-oud">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Signature : le nom gravé au trait d'or, coupé par le bord */}
          <p
            aria-hidden="true"
            className="pointer-events-none -mb-[0.16em] mt-4 select-none whitespace-nowrap text-center font-display text-[4rem] leading-[0.9] text-transparent [-webkit-text-stroke:1px_rgb(217_180_94/0.32)] lg:-mx-1 lg:mt-auto lg:pt-6 lg:text-left lg:text-[clamp(6rem,8.5vw,8rem)]"
          >
            Maison Adama
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (nouvel onglet)`}
        className="grid size-11 place-items-center rounded-full text-sur-oud ring-1 ring-inset ring-sur-oud/22 transition-colors duration-150 hover:bg-sur-oud/8 lg:size-10"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-[17px]"
        >
          {children}
        </svg>
      </a>
    </li>
  );
}
