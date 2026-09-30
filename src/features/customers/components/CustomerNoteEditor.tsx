'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, LoaderCircle, Lock, PencilLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { saveCustomerNoteAction } from '../actions';
import { CUSTOMER_NOTE_MAX } from '../customer-ui';

const IDEAS = ['Appeler après 18 h', 'Livrer au bureau', 'Aime les muscs blancs', 'Payer à la livraison uniquement'];

/**
 * Note interne : lecture posée par défaut, édition sur demande.
 * ⌘/Ctrl + Entrée enregistre, Échap annule.
 */
export default function CustomerNoteEditor({ customerId, initialNote, initialUpdatedAt }: { customerId: string; initialNote: string | null; initialUpdatedAt: string }) {
  const notify = useToast();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState({ note: initialNote ?? '', updatedAt: initialUpdatedAt });
  const [draft, setDraft] = useState(saved.note);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dirty = draft.trim() !== saved.note.trim();

  function open() {
    setEditing(true);
    setError(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  function cancel() {
    setDraft(saved.note);
    setEditing(false);
    setError(null);
  }

  function save() {
    if (!dirty) return setEditing(false);
    startTransition(async () => {
      const result = await saveCustomerNoteAction({ id: customerId, note: draft, expectedUpdatedAt: saved.updatedAt });
      if (!result.ok) {
        setError(result.error);
        notify(result.error, 'error');
        return;
      }
      setSaved({ note: result.note ?? '', updatedAt: result.updatedAt });
      setDraft(result.note ?? '');
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      notify(result.note ? 'Note enregistrée.' : 'Note supprimée.');
    });
  }

  return (
    <section aria-labelledby="note-title" className="flex flex-col gap-3.5 rounded-[28px] border border-filet bg-lin p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="note-title" className="flex items-center gap-2 text-title-sm text-encre">
          Note interne
          {justSaved && <Check className="size-4 text-succes motion-safe:animate-pop" strokeWidth={2.4} aria-label="Enregistrée" />}
        </h2>
        {!editing && saved.note && (
          <button
            type="button"
            onClick={open}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-or-profond transition-colors duration-150 hover:bg-sable"
          >
            <PencilLine className="size-3.5" strokeWidth={1.9} aria-hidden="true" />
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <label htmlFor="customer-note" className="sr-only">
            Note interne
          </label>
          <textarea
            id="customer-note"
            ref={textareaRef}
            value={draft}
            maxLength={CUSTOMER_NOTE_MAX}
            rows={5}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancel();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            }}
            placeholder="Préférences, consignes de livraison, point de repère…"
            aria-invalid={Boolean(error)}
            aria-describedby="customer-note-help"
            className={cn(
              'w-full resize-y rounded-2xl border bg-white/70 px-4 py-3 text-[0.9375rem] leading-relaxed text-encre outline-none transition-colors duration-150 placeholder:text-fumee/60 focus:border-or focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)]',
              error ? 'border-erreur' : 'border-filet',
            )}
          />
          {!draft && (
            <div className="flex flex-wrap gap-1.5">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setDraft(idea)}
                  className="h-8 rounded-full border border-dashed border-filet-fort px-3 text-xs text-fumee transition-colors duration-150 hover:border-or hover:text-encre"
                >
                  {idea}
                </button>
              ))}
            </div>
          )}
          <div id="customer-note-help" className="flex items-center justify-between gap-3 text-xs text-fumee">
            {error ? <span className="text-erreur">{error}</span> : <span className="hidden sm:inline">⌘ Entrée pour enregistrer · Échap pour annuler</span>}
            <span className="ml-auto tabular-nums">
              {draft.length} / {CUSTOMER_NOTE_MAX}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-80 sm:flex-none"
            >
              {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={cancel} disabled={isPending} className="h-11 rounded-full px-4 text-sm text-fumee transition-colors duration-150 hover:text-encre">
              Annuler
            </button>
          </div>
        </div>
      ) : saved.note ? (
        <button
          type="button"
          onClick={open}
          className="whitespace-pre-line rounded-2xl bg-paille/35 px-4 py-3.5 text-left text-[0.9375rem] leading-relaxed text-encre transition-colors duration-150 hover:bg-paille/55"
        >
          {saved.note}
        </button>
      ) : (
        <button
          type="button"
          onClick={open}
          className="flex h-14 items-center gap-2.5 rounded-2xl border border-dashed border-filet-fort px-4 text-left text-sm text-fumee transition-colors duration-150 hover:border-or hover:text-encre"
        >
          <PencilLine className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
          Ajouter une note : préférences, consignes de livraison…
        </button>
      )}

      <p className="flex items-center gap-1.5 text-xs text-fumee">
        <Lock className="size-3" strokeWidth={2} aria-hidden="true" />
        Visible uniquement par l’équipe, jamais par le client.
      </p>
    </section>
  );
}
