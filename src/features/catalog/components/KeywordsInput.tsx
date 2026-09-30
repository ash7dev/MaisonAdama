'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PRODUCT_LIMITS } from '../schemas';
import { describe, inputClass, inputState } from './form-ui';

type KeywordsInputProps = {
  id: string;
  value: string[];
  onChange: (keywords: string[]) => void;
  suggestions: string[];
  error?: string;
  hint: string;
};

/** Mots-clés de recherche : saisie + Entrée (ou virgule), suppression par la croix ou Retour arrière. */
export default function KeywordsInput({ id, value, onChange, suggestions, error, hint }: KeywordsInputProps) {
  const [draft, setDraft] = useState('');
  const full = value.length >= PRODUCT_LIMITS.maxKeywords;

  const add = (raw: string) => {
    const keyword = raw.trim().toLowerCase().slice(0, PRODUCT_LIMITS.keyword);
    if (!keyword || value.includes(keyword) || full) return;
    onChange([...value, keyword]);
  };

  const pending = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="flex flex-col gap-2.5">
      <div className={`flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border bg-white/70 p-2 focus-within:border-or focus-within:shadow-[0_0_0_4px_rgb(180_138_44/0.15)] ${inputState(error)}`}>
        {value.map((keyword) => (
          <span key={keyword} className="flex h-8 items-center gap-1 rounded-full bg-paille pl-3 pr-1 text-[0.8125rem] text-oud">
            {keyword}
            <button
              type="button"
              onClick={() => onChange(value.filter((k) => k !== keyword))}
              aria-label={`Retirer le mot-clé ${keyword}`}
              className="grid size-6 place-items-center rounded-full hover:bg-oud/10"
            >
              <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={full}
          onChange={(e) => {
            const next = e.target.value;
            if (next.includes(',')) {
              next.split(',').forEach(add);
              setDraft('');
            } else {
              setDraft(next);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            add(draft);
            setDraft('');
          }}
          placeholder={value.length ? 'Ajouter…' : 'Tapez puis Entrée'}
          enterKeyHint="done"
          {...describe(id, error, hint)}
          className={`${inputClass} h-8 min-w-[8rem] flex-1 border-0 bg-transparent px-2 shadow-none hover:border-0 focus:bg-transparent focus:shadow-none`}
        />
      </div>
      {pending.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.8125rem] text-fumee">Suggestions :</span>
          {pending.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="flex h-8 items-center rounded-full border border-dashed border-filet-fort px-3 text-[0.8125rem] text-encre transition-colors duration-150 hover:border-or hover:bg-white"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-erreur">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-[0.8125rem] leading-relaxed text-fumee">
          {hint}
        </p>
      )}
    </div>
  );
}
