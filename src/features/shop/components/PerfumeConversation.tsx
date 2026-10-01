'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Gift, PencilLine, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WheelFamily } from '../queries';
import { findPerfumesAction, type PerfumeSelection } from '../actions';
import ShopCard from './ShopCard';
import { FAMILY_HINTS } from '../families';


export type Budget = { key: string; label: string; min: number | undefined; max: number | undefined };
type Step = 1 | 2 | 3 | 4;
type Who = 'femme' | 'homme' | 'offrir' | 'tous';

const WHO: Array<{ key: Who; label: string }> = [
  { key: 'femme', label: 'Pour moi · femme' },
  { key: 'homme', label: 'Pour moi · homme' },
  { key: 'offrir', label: 'Pour offrir' },
  { key: 'tous', label: 'Peu importe' },
];

const TYPING_MS = 650;

function Avatar() {
  return (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#D9B45E,#7E5E1C)] font-display text-[0.8125rem] text-encre">
      MA
    </span>
  );
}

/** Garde-fou : un seul rechargement automatique par session. */
const RELOAD_KEY = 'ma-finder-reload';

function Bot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-[20rem] items-end gap-2.5 motion-safe:animate-reveal">
      <Avatar />
      <div className="rounded-[22px] rounded-bl-md bg-white px-4 py-3 text-[0.9375rem] leading-relaxed text-encre shadow-[0_1px_0_#DCCBAE]">{children}</div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-end gap-2.5" role="status" aria-label="La Maison écrit…">
      <Avatar />
      <div className="flex h-11 items-center gap-1.5 rounded-[22px] rounded-bl-md bg-white px-4 shadow-[0_1px_0_#DCCBAE]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 rounded-full bg-filet-fort motion-safe:animate-bounce" style={{ animationDelay: `${i * 140}ms` }} />
        ))}
      </div>
    </div>
  );
}

function Me({ children, onEdit }: { children: React.ReactNode; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label="Modifier cette réponse"
      className="group flex max-w-[18rem] items-center gap-2 self-end rounded-[22px] rounded-br-md bg-oud px-4 py-3 text-left text-[0.9375rem] font-medium text-sur-oud motion-safe:animate-reveal"
    >
      {children}
      <PencilLine className="size-3.5 shrink-0 opacity-50 group-hover:opacity-100" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

/**
 * « Le conseil de la Maison » : trois questions, comme en boutique.
 * Tout se joue sur place, sans navigation ni rechargement : seule la sélection
 * finale est demandée au serveur (action serveur). L'URL est mise à jour en
 * silence pour que la conversation reste partageable.
 */
const START = { step: 1 as Step, who: 'tous' as Who, familles: [] as string[], budgetKey: null as string | null };

export default function PerfumeConversation({
  families = [],
  budgets = [],
  initial = START,
  initialSelection = null,
}: {
  families?: WheelFamily[];
  budgets?: Budget[];
  initial?: { step: Step; who: Who; familles: string[]; budgetKey: string | null };
  /** Sélection calculée par le serveur quand la page est ouverte directement à l'étape 4. */
  initialSelection?: PerfumeSelection | null;
}) {
  const [step, setStep] = useState<Step>(initial.step);
  const [who, setWho] = useState<Who>(initial.who);
  const [familles, setFamilles] = useState<string[]>(initial.familles);
  const [draft, setDraft] = useState<string[]>(initial.familles);
  const [budgetKey, setBudgetKey] = useState<string | null>(initial.budgetKey);
  const [typing, setTyping] = useState(false);
  const [selection, setSelection] = useState<PerfumeSelection | null>(initialSelection);
  const [isPending, startTransition] = useTransition();
  const liveRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const budget = budgets.find((b) => b.key === budgetKey) ?? null;
  const selectedNames = families.filter((f) => familles.includes(f.slug)).map((f) => f.name);
  const answers = {
    pour: who === 'femme' || who === 'homme' ? who : undefined,
    familles,
    min: budget?.min,
    max: budget?.max,
  } as const;

  // URL mise à jour en silence (partage, bouton Retour), sans navigation.
  useEffect(() => {
    const q = new URLSearchParams();
    if (answers.pour) q.set('pour', answers.pour);
    if (who === 'offrir') q.set('offrir', '1');
    if (familles.length) q.set('familles', familles.join(','));
    if (answers.min !== undefined) q.set('min', String(answers.min));
    if (answers.max !== undefined) q.set('max', String(answers.max));
    if (step > 1) q.set('etape', String(step));
    const url = q.toString() ? `${window.location.pathname}?${q}` : window.location.pathname;
    window.history.replaceState(window.history.state, '', url);
  }, [step, who, familles, budgetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nouvelle question : la Maison « écrit » un instant ; à l'étape 4, elle cherche vraiment.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (step === 4 && initialSelection) return;
    }
    setTyping(true);
    const t = setTimeout(() => setTyping(false), TYPING_MS);
    if (step === 4) search();
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Recherche finale. Un échec (réseau coupé, base injoignable, page ouverte
   * pendant une mise à jour du site) ne casse jamais la page : un réessai
   * automatique, puis la bulle « Réessayer ».
   */
  function search() {
    startTransition(async () => {
      let thrown = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await findPerfumesAction(answers, selectedNames);
          if (!result.failed) {
            setSelection(result);
            try {
              sessionStorage.removeItem(RELOAD_KEY);
            } catch {}
            return;
          }
          thrown = false;
        } catch {
          thrown = true; // réseau coupé, ou site mis à jour pendant la visite
        }
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
      // Action introuvable après une mise à jour du site : on recharge UNE fois.
      // Les réponses sont dans l'adresse (?etape=4…) : la sélection revient
      // directement, calculée par la nouvelle version.
      if (thrown && navigator.onLine) {
        try {
          if (!sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, '1');
            window.location.reload();
            return;
          }
        } catch {
          /* stockage indisponible : on affiche « Réessayer » */
        }
      }
      setSelection({ products: [], total: 0, failed: true });
    });
  }

  // Montre la nouvelle question sans jamais « sauter » : défilement minimal, seulement si elle est cachée.
  useEffect(() => {
    if (typing || step === 1) return;
    const el = liveRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bottomSafe = window.innerHeight - 110; // barre de navigation du bas
    if (rect.bottom > bottomSafe) {
      window.scrollBy({ top: Math.min(rect.bottom - bottomSafe, rect.top - 90), behavior: 'smooth' });
    }
  }, [typing, step, isPending]);

  const goTo = (next: Step) => {
    setStep(next);
    if (next < 4) setSelection(null);
  };

  const restart = () => {
    setWho('tous');
    setFamilles([]);
    setDraft([]);
    setBudgetKey(null);
    setSelection(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const boutiqueHref = (() => {
    const q = new URLSearchParams();
    if (answers.pour) q.set('pour', answers.pour);
    if (familles.length) q.set('familles', familles.join(','));
    if (answers.min !== undefined) q.set('min', String(answers.min));
    if (answers.max !== undefined) q.set('max', String(answers.max));
    return q.toString() ? `/boutique?${q}` : '/boutique';
  })();

  const available = families.filter((f) => f.count > 0);
  const waiting = typing || (step === 4 && (isPending || !selection));
  const whoLabel = WHO.find((w) => w.key === who)?.label;

  return (
    <section aria-label="Le conseil de la Maison" className="flex flex-col gap-4">
      <div className="flex items-center gap-3 pb-1">
        <span className="relative grid size-12 place-items-center rounded-full bg-[linear-gradient(145deg,#D9B45E,#7E5E1C)] font-display text-[1.0625rem] text-encre">
          MA
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-succes ring-2 ring-sable" />
        </span>
        <span className="flex flex-col gap-0.5">
          <strong className="font-display text-[1.25rem] font-normal text-encre">Le conseil de la Maison</strong>
          <span className="text-xs text-fumee">3 questions · 30 secondes</span>
        </span>
        {step > 1 && (
          <button type="button" onClick={restart} className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-lin px-3 text-xs font-semibold text-or-profond ring-1 ring-inset ring-filet">
            <RotateCcw className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
            Recommencer
          </button>
        )}
      </div>

      {/* ── 1. Pour qui ? ── */}
      <Bot>
        Bonjour ! Je vous aide à trouver <strong className="font-semibold">votre</strong> parfum. C’est pour qui ?
      </Bot>
      {step === 1 ? (
        <div className="flex flex-wrap gap-2 pl-11 motion-safe:animate-reveal">
          {WHO.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => {
                setWho(w.key);
                goTo(2);
              }}
              className="flex h-11 items-center gap-2 rounded-full border border-filet bg-lin px-4 text-sm text-encre transition-colors duration-150 active:bg-oud active:text-sur-oud"
            >
              {w.key === 'offrir' && <Gift className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />}
              {w.label}
            </button>
          ))}
        </div>
      ) : (
        <Me onEdit={() => goTo(1)}>{whoLabel}</Me>
      )}

      {/* ── 2. Quelles odeurs ? ── */}
      {step >= 2 && !(step === 2 && typing) && (
        <Bot>
          {who === 'offrir' ? 'Quelle belle attention. Quelles odeurs aime la personne ?' : 'Quelles odeurs vous attirent ?'}{' '}
          <span className="text-fumee">Choisissez-en une ou plusieurs.</span>
        </Bot>
      )}
      {step === 2 && (typing ? <Typing /> : (
        <div className="flex flex-col gap-3 pl-11 motion-safe:animate-reveal">
          <div className="grid grid-cols-2 gap-2">
            {available.map((f) => {
              const on = draft.includes(f.slug);
              return (
                <button
                  key={f.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDraft(on ? draft.filter((x) => x !== f.slug) : [...draft, f.slug])}
                  className={cn(
                    'relative flex min-h-[4.25rem] flex-col items-start justify-center gap-0.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors duration-150',
                    on ? 'bg-oud text-sur-oud' : 'bg-lin text-encre ring-1 ring-inset ring-filet',
                  )}
                >
                  <span className="font-display text-[1.0625rem] leading-tight">{f.name}</span>
                  <span className={cn('text-[0.6875rem] leading-snug', on ? 'text-sur-oud/75' : 'text-fumee')}>{FAMILY_HINTS[f.slug] ?? `${f.count} créations`}</span>
                  {on && <Check className="absolute right-2.5 top-2.5 size-4 text-or-clair" strokeWidth={2.4} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={draft.length === 0}
              onClick={() => {
                setFamilles(draft);
                goTo(3);
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-oud text-sm font-semibold text-sur-oud disabled:opacity-40"
            >
              Valider{draft.length ? ` (${draft.length})` : ''}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setFamilles([]);
                setDraft([]);
                goTo(3);
              }}
              className="h-12 rounded-full border border-filet bg-lin px-4 text-sm text-encre"
            >
              Je ne sais pas
            </button>
          </div>
        </div>
      ))}
      {step > 2 && <Me onEdit={() => goTo(2)}>{selectedNames.length ? selectedNames.join(' · ') : 'Je ne sais pas encore'}</Me>}

      {/* ── 3. Quel budget ? ── */}
      {step >= 3 && !(step === 3 && typing) && <Bot>Très bon choix. Et quel budget prévoyez-vous ?</Bot>}
      {step === 3 && (typing ? <Typing /> : (
        <div className="flex flex-col gap-2 pl-11 motion-safe:animate-reveal">
          {budgets.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                setBudgetKey(b.key);
                goTo(4);
              }}
              className="flex h-12 items-center justify-between rounded-2xl bg-lin px-4 text-sm text-encre ring-1 ring-inset ring-filet active:bg-oud active:text-sur-oud"
            >
              {b.label}
              <ArrowRight className="size-4 text-or-profond" strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setBudgetKey(null);
              goTo(4);
            }}
            className="h-12 rounded-2xl border border-dashed border-filet-fort text-sm text-fumee"
          >
            Peu importe
          </button>
        </div>
      ))}
      {step > 3 && <Me onEdit={() => goTo(3)}>{budget?.label ?? 'Peu importe'}</Me>}

      {/* ── 4. La sélection ── */}
      {step === 4 && (waiting ? <Typing /> : selection && (
        <div className="flex flex-col gap-4">
          <Bot>
            {selection.failed ? (
              <span className="flex flex-col items-start gap-3">
                <span>La Maison n’a pas pu chercher : la connexion a dû faiblir. Vos réponses sont gardées.</span>
                <button
                  type="button"
                  onClick={search}
                  className="flex h-10 items-center gap-2 rounded-full bg-oud px-4 text-sm font-semibold text-sur-oud"
                >
                  <RotateCcw className="size-3.5" strokeWidth={2.2} aria-hidden="true" /> Réessayer
                </button>
              </span>
            ) : selection.total > 0 ? (
              <>
                Voici ce que la Maison vous conseille : <strong className="font-semibold">{selection.total} création{selection.total > 1 ? 's' : ''}</strong>
                {selectedNames.length ? ' dans vos familles préférées' : ''}.
              </>
            ) : (
              <>Je n’ai rien d’exact pour ces réponses. Touchez une réponse pour la modifier, ou écrivez-nous : nous trouverons ensemble.</>
            )}
          </Bot>
          {selection.total > 0 && (
            <>
              <ul className="-mr-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pl-11 pr-4 [scrollbar-width:none] motion-safe:animate-reveal">
                {selection.products.map((p, i) => (
                  <li key={p.id} className="w-[64vw] max-w-[15rem] shrink-0 snap-start">
                    <ShopCard product={p} priority={i < 2} highlight={selectedNames} />
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 pl-11">
                {who === 'offrir' && (
                  <Link href="/boutique?collection=idees-cadeaux" className="flex h-12 items-center justify-center gap-2 rounded-full bg-paille text-sm font-semibold text-oud">
                    <Gift className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    Voir aussi nos idées cadeaux
                  </Link>
                )}
                <Link href={boutiqueHref} className="flex h-12 items-center justify-center gap-2 rounded-full bg-oud text-sm font-semibold text-sur-oud">
                  Voir {selection.total > 1 ? `les ${selection.total} créations` : 'la création'}
                  <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Repère : la dernière bulle, pour le défilement minimal */}
      <div ref={liveRef} aria-hidden="true" />
    </section>
  );
}
