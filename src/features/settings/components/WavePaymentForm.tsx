'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { ImageUp, LoaderCircle, QrCode, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSenegalPhone } from '@/lib/phone';
import { compressImage, uploadToSignedUrl } from '@/lib/image-compress';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, productImageUrl } from '@/lib/supabase/storage';
import { useToast } from '@/components/ui/toast';
import { describe, Field, inputClass, inputState } from '@/features/catalog/components/form-ui';
import { createWaveQrUploadAction, discardWaveQrAction, saveWaveAction } from '../actions';
import { normalizeWaveLink, type FieldErrors } from '../schemas';
import type { AdminStoreSettings } from '../queries';
import { SaveBar, savedHint, SettingsSection } from './settings-ui';

type Upload = { status: 'idle' } | { status: 'working'; progress: number; preview: string } | { status: 'error'; message: string };

const WAVE = { ink: 'text-[#1F5673]', bg: 'bg-[#DCEBF3]', solid: 'bg-[#1F5673]' };

/** Numéro ou identifiant Wave, et QR code de paiement : ce que le client voit au moment de payer. */
export default function WavePaymentForm({ settings }: { settings: AdminStoreSettings | null }) {
  const notify = useToast();
  const [isPending, startTransition] = useTransition();
  const initialCode = settings?.waveMerchantCode ? formatSenegalPhone(settings.waveMerchantCode) : '';
  const [saved, setSaved] = useState({ code: initialCode, qr: settings?.waveQrImagePath ?? null, link: settings?.wavePaymentLink ?? '' });
  const [updatedAt, setUpdatedAt] = useState(settings?.updatedAt ?? null);
  const [code, setCode] = useState(saved.code);
  const [qr, setQr] = useState<string | null>(saved.qr);
  const [link, setLink] = useState(saved.link);
  const [upload, setUpload] = useState<Upload>({ status: 'idle' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dirty = code.trim() !== saved.code.trim() || qr !== saved.qr || link.trim() !== saved.link.trim();
  const uploading = upload.status === 'working';
  const qrUrl = upload.status === 'working' ? upload.preview : productImageUrl(qr);

  /** Un QR envoyé mais pas enregistré ne doit pas rester dans le stockage. */
  function discardDraftQr(path: string | null) {
    if (path && path !== saved.qr) void discardWaveQrAction(path);
  }

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setUpload({ status: 'error', message: 'Image JPEG, PNG ou WebP uniquement.' });
      return;
    }
    const preview = URL.createObjectURL(file);
    setUpload({ status: 'working', progress: 0, preview });
    try {
      const compressed = await compressImage(file, MAX_UPLOAD_BYTES);
      const ticket = await createWaveQrUploadAction(compressed.ext);
      if (!ticket.ok) throw new Error(ticket.error);
      await uploadToSignedUrl(ticket.signedUrl, compressed.blob, (progress) => setUpload({ status: 'working', progress, preview }));
      discardDraftQr(qr);
      setQr(ticket.path);
      setUpload({ status: 'idle' });
      setErrors(({ waveQrImagePath: _, ...rest }) => rest);
    } catch (cause) {
      setUpload({ status: 'error', message: cause instanceof Error ? cause.message : 'Envoi impossible.' });
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  function removeQr() {
    discardDraftQr(qr);
    setQr(null);
    setUpload({ status: 'idle' });
  }

  function cancel() {
    discardDraftQr(qr);
    setCode(saved.code);
    setLink(saved.link);
    setQr(saved.qr);
    setUpload({ status: 'idle' });
    setErrors({});
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (uploading) return;
    startTransition(async () => {
      const result = await saveWaveAction({ waveMerchantCode: code, waveQrImagePath: qr, wavePaymentLink: link }, updatedAt);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        notify(result.error, 'error');
        return;
      }
      const next = { code: code.trim(), qr, link: normalizeWaveLink(link) ?? '' };
      setSaved(next);
      setCode(next.code);
      setLink(next.link);
      setUpdatedAt(result.updatedAt ?? null);
      setErrors({});
      notify(result.message);
    });
  }

  const configured = Boolean(code.trim() || qr || link.trim());

  return (
    <form onSubmit={submit} noValidate>
      <SettingsSection
        id="wave"
        icon={<Smartphone strokeWidth={1.6} aria-hidden="true" />}
        title="Paiement Wave"
        description="Le client paie par Wave puis vous vérifiez la réception dans Wave Business avant d’expédier."
        aside={
          <span className={cn('hidden h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium sm:inline-flex', configured ? `${WAVE.bg} ${WAVE.ink}` : 'bg-sable text-fumee')}>
            {configured ? 'Configuré' : 'À configurer'}
          </span>
        }
        footer={<SaveBar dirty={dirty} pending={isPending || uploading} savedHint={savedHint(updatedAt)} onCancel={cancel} />}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex flex-col gap-5">
            <Field
              id="wavePaymentLink"
              label="Lien de paiement Wave Business"
              hint="Recommandé. Dans Wave Business, copiez votre lien marchand : le client paie en un geste, montant déjà rempli."
              error={errors.wavePaymentLink}
            >
              <input
                id="wavePaymentLink"
                type="url"
                inputMode="url"
                value={link}
                maxLength={200}
                onChange={(e) => {
                  setLink(e.target.value);
                  setErrors(({ wavePaymentLink: _, ...rest }) => rest);
                }}
                placeholder="https://pay.wave.com/m/…/c/sn/"
                autoComplete="off"
                spellCheck={false}
                {...describe('wavePaymentLink', errors.wavePaymentLink, 'hint')}
                className={cn(inputClass, inputState(errors.wavePaymentLink), 'h-12')}
              />
            </Field>

            <Field
              id="waveMerchantCode"
              label="Numéro Wave ou identifiant marchand"
              hint="Le numéro qui reçoit les paiements, ou l’identifiant affiché dans Wave Business."
              error={errors.waveMerchantCode}
            >
              <input
                id="waveMerchantCode"
                value={code}
                maxLength={40}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrors(({ waveMerchantCode: _, ...rest }) => rest);
                }}
                placeholder="77 105 92 10"
                autoComplete="off"
                {...describe('waveMerchantCode', errors.waveMerchantCode, 'hint')}
                className={cn(inputClass, inputState(errors.waveMerchantCode), 'h-12 tabular-nums')}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-encre">
                QR code de paiement <span className="font-normal text-fumee">(facultatif)</span>
              </span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void handleFile(e.dataTransfer.files[0]);
                }}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border border-dashed p-3 transition-colors duration-150',
                  dragging ? 'border-or bg-paille/40' : 'border-filet-fort bg-white/50',
                )}
              >
                <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-filet">
                  {qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrUrl} alt="QR code Wave" className={cn('size-full object-contain p-1.5', uploading && 'opacity-50')} />
                  ) : (
                    <QrCode className="size-8 text-filet-fort" strokeWidth={1.3} aria-hidden="true" />
                  )}
                  {uploading && (
                    <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-filet">
                      <span className="block h-full origin-left rounded-full bg-or transition-transform" style={{ transform: `scaleX(${upload.progress})` }} />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="text-[0.8125rem] leading-snug text-fumee">
                    {uploading ? 'Envoi en cours…' : 'Capture d’écran du QR de votre compte Wave. Glissez-la ici ou :'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => inputRef.current?.click()}
                      className="flex h-10 items-center gap-2 rounded-full border border-filet-fort bg-lin px-4 text-[0.8125rem] font-medium text-oud transition-colors duration-150 hover:bg-white disabled:opacity-60"
                    >
                      {uploading ? (
                        <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
                      ) : qr ? (
                        <RefreshCw className="size-4" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <ImageUp className="size-4" strokeWidth={1.8} aria-hidden="true" />
                      )}
                      {qr ? 'Remplacer' : 'Choisir une image'}
                    </button>
                    {qr && !uploading && (
                      <button
                        type="button"
                        onClick={removeQr}
                        aria-label="Retirer le QR code"
                        className="grid size-10 place-items-center rounded-full text-fumee transition-colors duration-150 hover:bg-erreur-fond hover:text-erreur"
                      >
                        <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    void handleFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
              {(upload.status === 'error' || errors.waveQrImagePath) && (
                <p role="alert" className="text-sm text-erreur">
                  {upload.status === 'error' ? upload.message : errors.waveQrImagePath}
                </p>
              )}
            </div>
          </div>

          {/* Aperçu : ce que le client voit à l'étape du paiement */}
          <figure className="flex flex-col gap-2.5">
            <figcaption className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-fumee">Aperçu client</figcaption>
            <div className="flex flex-col items-center gap-3 rounded-[24px] bg-white p-5 text-center shadow-sm ring-1 ring-filet">
              <span className={cn('flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold', WAVE.bg, WAVE.ink)}>
                <Smartphone className="size-3.5" strokeWidth={2} aria-hidden="true" />
                Payer avec Wave
              </span>
              <p className="text-[0.8125rem] leading-snug text-encre">
                Envoyez <strong className="font-semibold tabular-nums">25 000 FCFA</strong>
                {code.trim() ? (
                  <>
                    {' '}
                    au <strong className={cn('font-semibold tabular-nums', WAVE.ink)}>{code.trim()}</strong>
                  </>
                ) : (
                  ' …'
                )}
              </p>
              {qrUrl ? (
                <div className="relative size-32 overflow-hidden rounded-xl ring-1 ring-filet">
                  {upload.status === 'working' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrUrl} alt="" className="size-full object-contain" />
                  ) : (
                    <Image src={qrUrl} alt="" fill sizes="128px" className="object-contain" />
                  )}
                </div>
              ) : (
                <div className="grid size-32 place-items-center rounded-xl border border-dashed border-filet text-[0.6875rem] text-fumee">Sans QR code</div>
              )}
              <p className="text-[0.6875rem] leading-snug text-fumee">Commande préparée dès réception du paiement.</p>
            </div>
          </figure>
        </div>
      </SettingsSection>
    </form>
  );
}
