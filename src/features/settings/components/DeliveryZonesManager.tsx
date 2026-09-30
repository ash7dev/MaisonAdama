'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Clock, LoaderCircle, MapPin, MoreHorizontal, PencilLine, Plus, Sparkles, Trash2, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { useToast } from '@/components/ui/toast';
import { describe, Field, inputClass, inputState } from '@/features/catalog/components/form-ui';
import {
  deleteDeliveryZoneAction,
  importSuggestedZonesAction,
  reorderDeliveryZonesAction,
  saveDeliveryZoneAction,
  toggleDeliveryZoneAction,
  type SettingsResult,
} from '../actions';
import { DELAY_PRESETS, SENEGAL_REGIONS, SUGGESTED_ZONES, type FieldErrors } from '../schemas';
import type { AdminDeliveryZone } from '../queries';
import { SettingsSection, Switch } from './settings-ui';

const FEE_PRESETS = [1500, 2000, 2500, 3000, 3500, 4000, 5000];
const number = new Intl.NumberFormat('fr-FR');

const selectChevron: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237A6653' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

type Draft = { name: string; region: string; defaultFee: string; estimatedDelay: string; isActive: boolean };

function toDraft(zone?: AdminDeliveryZone): Draft {
  return {
    name: zone?.name ?? '',
    region: zone?.region ?? 'Dakar',
    defaultFee: zone ? String(zone.defaultFee) : '',
    estimatedDelay: zone?.estimatedDelay ?? '',
    isActive: zone?.isActive ?? true,
  };
}

// -----------------------------------------------------------------------------
//  Éditeur (création ou modification), affiché à la place de la ligne
// -----------------------------------------------------------------------------

function ZoneEditor({ zone, onDone }: { zone?: AdminDeliveryZone; onDone: (result?: SettingsResult) => void }) {
  const [draft, setDraft] = useState(() => toDraft(zone));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const prefix = zone ? `zone-${zone.id}` : 'zone-new';

  useEffect(() => nameRef.current?.focus(), []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveDeliveryZoneAction(zone?.id ?? null, draft, zone?.updatedAt ?? null);
      if (!result.ok && result.fieldErrors) {
        setErrors(result.fieldErrors);
        return;
      }
      onDone(result);
    });
  }

  const fee = Number(draft.defaultFee) || 0;

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && onDone()}
      noValidate
      className="flex flex-col gap-5 rounded-3xl border border-or/50 bg-white/70 p-4 shadow-sm motion-safe:animate-reveal sm:p-5"
    >
      <p className="text-sm font-medium text-encre">{zone ? `Modifier « ${zone.name} »` : 'Nouvelle zone'}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-name`} label="Nom affiché au client" error={errors.name}>
          <input
            ref={nameRef}
            id={`${prefix}-name`}
            value={draft.name}
            maxLength={80}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex. Dakar, Touba / Mbacké"
            autoComplete="off"
            {...describe(`${prefix}-name`, errors.name)}
            className={cn(inputClass, inputState(errors.name), 'h-12')}
          />
        </Field>
        <Field id={`${prefix}-region`} label="Région" error={errors.region}>
          <select
            id={`${prefix}-region`}
            value={draft.region}
            onChange={(e) => set('region', e.target.value)}
            style={selectChevron}
            {...describe(`${prefix}-region`, errors.region)}
            className={cn(inputClass, inputState(errors.region), 'h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10')}
          >
            {SENEGAL_REGIONS.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field id={`${prefix}-fee`} label="Frais de livraison" hint="Ajustables ensuite commande par commande si besoin." error={errors.defaultFee}>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-44 sm:shrink-0">
            <input
              id={`${prefix}-fee`}
              inputMode="numeric"
              value={draft.defaultFee ? number.format(fee) : ''}
              onChange={(e) => set('defaultFee', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="2 000"
              {...describe(`${prefix}-fee`, errors.defaultFee, 'hint')}
              className={cn(inputClass, inputState(errors.defaultFee), 'h-12 pr-16 font-semibold tabular-nums')}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-fumee">FCFA</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FEE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={fee === preset && draft.defaultFee !== ''}
                onClick={() => set('defaultFee', String(preset))}
                className={cn(
                  'h-9 rounded-full px-3 text-[0.8125rem] tabular-nums transition-colors duration-150',
                  fee === preset && draft.defaultFee !== '' ? 'bg-oud text-sur-oud' : 'border border-filet text-encre hover:border-filet-fort',
                )}
              >
                {number.format(preset)}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={draft.defaultFee === '0'}
              onClick={() => set('defaultFee', '0')}
              className={cn(
                'h-9 rounded-full px-3 text-[0.8125rem] transition-colors duration-150',
                draft.defaultFee === '0' ? 'bg-succes text-white' : 'border border-filet text-encre hover:border-filet-fort',
              )}
            >
              Offerte
            </button>
          </div>
        </div>
      </Field>

      <Field id={`${prefix}-delay`} label="Délai annoncé" optional error={errors.estimatedDelay}>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            id={`${prefix}-delay`}
            value={draft.estimatedDelay}
            maxLength={40}
            onChange={(e) => set('estimatedDelay', e.target.value)}
            placeholder="Ex. 24 h"
            autoComplete="off"
            {...describe(`${prefix}-delay`, errors.estimatedDelay)}
            className={cn(inputClass, inputState(errors.estimatedDelay), 'h-12 sm:w-44 sm:shrink-0')}
          />
          <div className="flex flex-wrap gap-1.5">
            {DELAY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={draft.estimatedDelay === preset}
                onClick={() => set('estimatedDelay', preset)}
                className={cn(
                  'h-9 rounded-full px-3 text-[0.8125rem] transition-colors duration-150',
                  draft.estimatedDelay === preset ? 'bg-oud text-sur-oud' : 'border border-filet text-encre hover:border-filet-fort',
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </Field>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-sable/60 px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-encre">Proposée au checkout</span>
          <span className="text-xs text-fumee">{draft.isActive ? 'Les clients peuvent la choisir.' : 'Masquée, sans effet sur les commandes passées.'}</span>
        </span>
        <Switch checked={draft.isActive} onChange={(v) => set('isActive', v)} label="Proposée au checkout" />
      </label>

      {zone && zone.orders > 0 && (
        <p className="rounded-xl bg-sable px-3.5 py-2.5 text-[0.8125rem] text-fumee">
          {zone.orders} commande{zone.orders > 1 ? 's' : ''} passée{zone.orders > 1 ? 's' : ''} dans cette zone : elles gardent leur tarif d’origine.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 items-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:cursor-wait disabled:opacity-80"
        >
          {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          {zone ? 'Enregistrer' : 'Ajouter la zone'}
        </button>
        <button type="button" onClick={() => onDone()} disabled={isPending} className="h-11 rounded-full px-4 text-sm text-fumee transition-colors duration-150 hover:text-encre">
          Annuler
        </button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
//  Ligne d'une zone
// -----------------------------------------------------------------------------

function ZoneRow({
  zone,
  index,
  count,
  busy,
  onEdit,
  onToggle,
  onMove,
  onDelete,
}: {
  zone: AdminDeliveryZone;
  index: number;
  count: number;
  busy: boolean;
  onEdit: () => void;
  onToggle: (next: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => {
      setMenuOpen(false);
      setConfirmDelete(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && close();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menuOpen]);

  const item = 'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-encre hover:bg-sable disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <li className={cn('flex min-w-0 items-center gap-2.5 rounded-3xl border bg-white/60 p-3 transition-colors duration-150 sm:gap-4 sm:pl-4', zone.isActive ? 'border-filet' : 'border-dashed border-filet-fort bg-transparent')}>
      <span className={cn('hidden size-10 shrink-0 place-items-center rounded-full sm:grid', zone.isActive ? 'bg-paille text-oud' : 'bg-sable text-fumee')}>
        <MapPin className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
      </span>

      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className={cn('truncate text-[0.9375rem] font-medium', zone.isActive ? 'text-encre' : 'text-fumee')}>{zone.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-fumee">
          <span className={cn('font-semibold tabular-nums sm:hidden', zone.defaultFee === 0 ? 'text-succes' : 'text-encre')}>
            {zone.defaultFee === 0 ? 'Offerte' : formatFCFA(zone.defaultFee)}
          </span>
          <span>{zone.region}</span>
          {zone.estimatedDelay && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" strokeWidth={2} aria-hidden="true" />
              {zone.estimatedDelay}
            </span>
          )}
          {zone.orders > 0 && <span>· {zone.orders} commande{zone.orders > 1 ? 's' : ''}</span>}
          {!zone.isActive && <span className="font-medium">· Masquée</span>}
        </span>
      </button>

      <span className={cn('hidden shrink-0 text-right text-[0.9375rem] font-semibold tabular-nums sm:block', zone.defaultFee === 0 ? 'text-succes' : 'text-encre')}>
        {zone.defaultFee === 0 ? 'Offerte' : formatFCFA(zone.defaultFee)}
      </span>

      <Switch size="sm" checked={zone.isActive} disabled={busy} onChange={onToggle} label={zone.isActive ? `Masquer ${zone.name} au checkout` : `Proposer ${zone.name} au checkout`} />

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label={`Actions pour ${zone.name}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
          className={cn('grid size-10 place-items-center rounded-full transition-colors', menuOpen ? 'bg-oud text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre')}
        >
          <MoreHorizontal className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-60 rounded-2xl border border-filet bg-lin p-1.5 shadow-lg motion-safe:animate-reveal">
            {confirmDelete ? (
              <div className="flex flex-col gap-3 p-2.5">
                <p className="text-sm leading-snug text-encre">Supprimer « {zone.name} » ?</p>
                <div className="flex gap-2">
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }} className="h-10 flex-1 rounded-full bg-erreur text-sm font-medium text-lin">
                    Supprimer
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-full px-3 text-sm text-fumee hover:text-encre">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }} className={item}>
                  <PencilLine className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                  Modifier
                </button>
                <button type="button" role="menuitem" disabled={index === 0 || busy} onClick={() => { setMenuOpen(false); onMove(-1); }} className={item}>
                  <ArrowUp className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                  Monter
                </button>
                <button type="button" role="menuitem" disabled={index === count - 1 || busy} onClick={() => { setMenuOpen(false); onMove(1); }} className={item}>
                  <ArrowDown className="size-4 text-or-profond" strokeWidth={1.8} aria-hidden="true" />
                  Descendre
                </button>
                {zone.orders > 0 ? (
                  <p className="px-3 pb-2 pt-1.5 text-xs leading-snug text-fumee">Utilisée par des commandes : masquez-la plutôt que de la supprimer.</p>
                ) : (
                  <button type="button" role="menuitem" onClick={() => setConfirmDelete(true)} className={cn(item, 'text-erreur hover:bg-erreur-fond')}>
                    <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    Supprimer…
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// -----------------------------------------------------------------------------
//  Section complète
// -----------------------------------------------------------------------------

export default function DeliveryZonesManager({ zones: initialZones }: { zones: AdminDeliveryZone[] }) {
  const router = useRouter();
  const notify = useToast();
  const [zones, setZones] = useState(initialZones);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [isPending, startTransition] = useTransition();

  // Données fraîches du serveur après chaque action.
  useEffect(() => setZones(initialZones), [initialZones]);

  const active = zones.filter((z) => z.isActive);

  function run(action: () => Promise<SettingsResult>, optimistic?: () => void) {
    optimistic?.();
    startTransition(async () => {
      const result = await action();
      notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
      if (!result.ok) setZones(initialZones);
      router.refresh();
    });
  }

  function finishEdit(result?: SettingsResult) {
    if (result) {
      notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
      if (!result.ok) return;
      router.refresh();
    }
    setEditing(null);
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...zones];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    run(() => reorderDeliveryZonesAction(next.map((z) => z.id)), () => setZones(next));
  }

  return (
    <SettingsSection
      id="livraison"
      icon={<Truck strokeWidth={1.6} aria-hidden="true" />}
      title="Zones de livraison"
      description="Les zones et tarifs proposés au client. Un changement de tarif ne touche jamais les commandes déjà passées."
      aside={
        zones.length > 0 && editing !== 'new' ? (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-oud pl-3.5 pr-4.5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover sm:flex"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            Ajouter
          </button>
        ) : undefined
      }
    >
      {zones.length === 0 && editing !== 'new' ? (
        <div className="flex flex-col gap-5 rounded-3xl border border-dashed border-or/60 bg-paille/25 p-5 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <p className="text-[0.9375rem] font-medium text-encre">Aucune zone : les clients ne peuvent pas encore commander.</p>
            <p className="text-sm text-fumee">Partez des zones proposées ci-dessous (tarifs indicatifs, modifiables), ou créez les vôtres.</p>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUGGESTED_ZONES.map((zone) => (
              <li key={zone.name} className="flex items-center justify-between gap-3 rounded-2xl bg-lin px-4 py-3 ring-1 ring-inset ring-filet">
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-encre">{zone.name}</span>
                  <span className="text-xs text-fumee">{zone.estimatedDelay}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-encre">{formatFCFA(zone.defaultFee)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(importSuggestedZonesAction)}
              className="flex h-11 items-center gap-2 rounded-full bg-oud px-5 text-sm font-medium text-sur-oud transition-colors duration-150 hover:bg-oud-hover disabled:opacity-70"
            >
              {isPending ? <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" /> : <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" />}
              Ajouter ces 4 zones
            </button>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="flex h-11 items-center gap-2 rounded-full border border-filet-fort px-5 text-sm font-medium text-oud transition-colors duration-150 hover:bg-white"
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              Créer ma zone
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {editing === 'new' && <ZoneEditor onDone={finishEdit} />}
          <ul className="flex flex-col gap-2.5">
            {zones.map((zone, index) =>
              editing === zone.id ? (
                <li key={zone.id}>
                  <ZoneEditor zone={zone} onDone={finishEdit} />
                </li>
              ) : (
                <ZoneRow
                  key={zone.id}
                  zone={zone}
                  index={index}
                  count={zones.length}
                  busy={isPending}
                  onEdit={() => setEditing(zone.id)}
                  onToggle={(next) =>
                    run(
                      () => toggleDeliveryZoneAction(zone.id, next),
                      () => setZones((list) => list.map((z) => (z.id === zone.id ? { ...z, isActive: next } : z))),
                    )
                  }
                  onMove={(direction) => move(index, direction)}
                  onDelete={() => run(() => deleteDeliveryZoneAction(zone.id), () => setZones((list) => list.filter((z) => z.id !== zone.id)))}
                />
              ),
            )}
          </ul>
          {editing !== 'new' && (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="flex h-12 items-center justify-center gap-2 rounded-3xl border border-dashed border-filet-fort text-sm font-medium text-oud transition-colors duration-150 hover:border-or hover:bg-white/60 sm:hidden"
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              Ajouter une zone
            </button>
          )}
        </div>
      )}

      {/* Aperçu du checkout */}
      {zones.length > 0 && (
        <div className="flex flex-col gap-3 rounded-3xl bg-sable/60 p-4 sm:p-5">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-fumee">Aperçu client · étape livraison</p>
          {active.length === 0 ? (
            <p className="text-sm font-medium text-alerte">Toutes les zones sont masquées : personne ne peut commander.</p>
          ) : (
            <div role="presentation" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {active.slice(0, 4).map((zone, index) => (
                <div key={zone.id} className={cn('flex items-center gap-3 rounded-2xl bg-lin px-4 py-3 ring-1 ring-inset', index === 0 ? 'ring-2 ring-oud' : 'ring-filet')}>
                  <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border-2', index === 0 ? 'border-oud' : 'border-filet-fort')}>
                    {index === 0 && <span className="size-1.5 rounded-full bg-oud" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-encre">{zone.name}</span>
                    {zone.estimatedDelay && <span className="text-xs text-fumee">Livraison en {zone.estimatedDelay}</span>}
                  </span>
                  <span className={cn('text-sm font-semibold tabular-nums', zone.defaultFee === 0 ? 'text-succes' : 'text-encre')}>
                    {zone.defaultFee === 0 ? 'Offerte' : formatFCFA(zone.defaultFee)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {active.length > 4 && <p className="text-xs text-fumee">+ {active.length - 4} autre{active.length - 4 > 1 ? 's' : ''}</p>}
        </div>
      )}
    </SettingsSection>
  );
}
