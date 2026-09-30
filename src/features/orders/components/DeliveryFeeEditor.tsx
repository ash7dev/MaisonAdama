'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, PencilLine } from 'lucide-react';
import { formatFCFA } from '@/lib/money';
import { useToast } from '@/components/ui/toast';
import { adjustDeliveryFeeAction } from '../actions';

/** Frais de livraison : tarif de la zone, ajustable avec justification (localité éloignée…). */
export default function DeliveryFeeEditor({
  orderId,
  defaultFee,
  fee,
  note,
  editable,
}: {
  orderId: string;
  defaultFee: number;
  fee: number;
  note: string | null;
  editable: boolean;
}) {
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(fee));
  const [reason, setReason] = useState(note ?? '');
  const [isPending, startTransition] = useTransition();

  const nextFee = Number(value);
  const valid = value !== '' && Number.isInteger(nextFee) && nextFee >= 0 && reason.trim().length > 0 && nextFee !== fee;

  const save = () =>
    startTransition(async () => {
      const result = await adjustDeliveryFeeAction(orderId, nextFee, reason);
      notify(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
      if (result.ok) setEditing(false);
    });

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.9375rem] font-medium tabular-nums text-encre">
            {fee !== defaultFee && <span className="mr-1.5 text-fumee line-through decoration-filet-fort">{formatFCFA(defaultFee)}</span>}
            {formatFCFA(fee)}
          </span>
          {fee !== defaultFee && note && <span className="text-[0.8125rem] text-fumee">{note}</span>}
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-oud transition-colors duration-150 hover:bg-sable"
          >
            <PencilLine className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
            Ajuster
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-sable/70 p-3.5 motion-safe:animate-reveal">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="delivery-fee" className="text-[0.8125rem] font-medium text-encre">
          Nouveaux frais <span className="font-normal text-fumee">(tarif de la zone : {formatFCFA(defaultFee)})</span>
        </label>
        <div className="relative">
          <input
            id="delivery-fee"
            inputMode="numeric"
            value={value ? new Intl.NumberFormat('fr-FR').format(Number(value)) : ''}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 7))}
            className="h-11 w-full rounded-xl border border-filet bg-white/80 px-3.5 pr-16 text-sm font-medium tabular-nums text-encre outline-none focus:border-or"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.8125rem] text-fumee">FCFA</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="delivery-fee-reason" className="text-[0.8125rem] font-medium text-encre">
          Raison
        </label>
        <input
          id="delivery-fee-reason"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. Village éloigné, livraison express"
          className="h-11 rounded-xl border border-filet bg-white/80 px-3.5 text-sm text-encre outline-none placeholder:text-fumee/60 focus:border-or"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!valid || isPending}
          className="flex h-10 items-center gap-2 rounded-full bg-oud px-4 text-[0.8125rem] font-medium text-sur-oud disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(String(fee));
            setReason(note ?? '');
          }}
          className="h-10 rounded-full px-3 text-[0.8125rem] text-fumee hover:text-encre"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
