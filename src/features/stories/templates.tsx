/* eslint-disable @next/next/no-img-element -- rendu par Satori (next/og), pas par le navigateur */
import { MAX_UPSCALE, type StoryData, type StoryPhoto, type StoryTemplate } from './data';
import { qrPath } from './qr';

/**
 * Les 4 gabarits de story (1080 × 1920), dessinés par Satori. Zones sûres :
 * rien d'important dans les 240 px du haut et du bas. Aucune photo n'est
 * étirée : chaque cadre suit la taille réelle de la photo (agrandissement
 * limité à ×1,25).
 */

export const STORY_W = 1080;
export const STORY_H = 1920;

const C = {
  night: '#140D08',
  velvet: '#2B1D12',
  cream: '#F4E7CC',
  creamSoft: '#E6D3AE',
  muted: '#CDBB9A',
  gold: '#D9B45E',
  goldDeep: '#7E5E1C',
  goldLine: '#B48A2C',
  oud: '#4A2E1C',
  ink: '#2B1D12',
  smoke: '#7A6653',
  brick: '#A3402E',
  paper: '#F1E9DB',
  linen: '#FAF5EC',
};

const nbsp = ' ';
const money = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, nbsp)}${nbsp}FCFA`;
const short = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, nbsp);
const endDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Africa/Dakar' });

/** Taille d'affichage maximale d'une photo pour rester nette. */
const sharpLimit = (p: StoryPhoto, side: 'w' | 'h' | 'min') =>
  (side === 'w' ? p.width : side === 'h' ? p.height : Math.min(p.width, p.height)) * MAX_UPSCALE;

// -----------------------------------------------------------------------------
//  Pièces communes
// -----------------------------------------------------------------------------

function Masthead({ dark, size = 38, overPhoto = false }: { dark: boolean; size?: number; overPhoto?: boolean }) {
  // Ombre seulement sur photo (une valeur vide fait échouer le moteur de rendu).
  const shadow = overPhoto ? { textShadow: '0 2px 22px rgba(0,0,0,0.75)' } : {};
  return (
    <div style={{ position: 'absolute', top: 250, left: 0, width: STORY_W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontFamily: 'Marcellus', fontSize: size, letterSpacing: size * 0.18, color: dark ? C.cream : C.oud, lineHeight: 1, ...shadow }}>MAISON ADAMA</div>
      <div style={{ marginTop: 12, fontSize: 17, fontWeight: 600, letterSpacing: 10.5, paddingLeft: 10.5, color: dark ? C.gold : C.goldDeep, ...shadow }}>TCHURAYY</div>
    </div>
  );
}

function Qr({ url, size, ink, paper, framed = true }: { url: string; size: number; ink: string; paper: string; framed?: boolean }) {
  const { size: n, d } = qrPath(url);
  const pad = framed ? Math.round(size * 0.09) : 0;
  return (
    <div style={{ display: 'flex', width: size, height: size, padding: pad, borderRadius: framed ? 16 : 0, backgroundColor: paper }}>
      <svg width={size - pad * 2} height={size - pad * 2} viewBox={`0 0 ${n} ${n}`}>
        <path d={d} fill={ink} />
      </svg>
    </div>
  );
}

function Price({ data, size, color, wasColor }: { data: StoryData; size: number; color: string; wasColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      {data.fromRange && <div style={{ fontSize: size * 0.42, color: wasColor, marginRight: 12 }}>dès</div>}
      <div style={{ fontFamily: 'Marcellus', fontSize: size, color, lineHeight: 1 }}>{money(data.price)}</div>
      {data.was && <div style={{ marginLeft: 20, fontSize: size * 0.5, color: wasColor, textDecoration: 'line-through' }}>{short(data.was)}</div>}
    </div>
  );
}

const families = (data: StoryData) => data.families.slice(0, 3).join(' · ');

// -----------------------------------------------------------------------------
//  1 · La Couverture
// -----------------------------------------------------------------------------

function Couverture({ data }: { data: StoryData }) {
  const p = data.photo;
  // Photo pleine largeur si elle le permet ; sinon fenêtre à sa taille réelle.
  const fullBleed = p ? sharpLimit(p, 'w') >= STORY_W : false;
  const bleedH = p ? Math.round(Math.min(1440, Math.max(1080, (STORY_W * p.height) / p.width))) : 1080;
  const winW = p && !fullBleed ? Math.round(Math.min(760, sharpLimit(p, 'w'))) : 0;
  const winH = p && !fullBleed ? Math.round(Math.min(860, (winW * p.height) / p.width)) : 0;
  const textTop = fullBleed ? bleedH - 260 : 400 + winH + 70;

  return (
    <div style={{ position: 'relative', display: 'flex', width: STORY_W, height: STORY_H, backgroundColor: C.night, color: C.cream, fontFamily: 'Schibsted' }}>
      {p && fullBleed && (
        <img src={p.src} width={STORY_W} height={bleedH} style={{ position: 'absolute', top: 0, left: 0, width: STORY_W, height: bleedH, objectFit: 'cover' }} />
      )}
      {p && !fullBleed && (
        <img
          src={p.src}
          width={winW}
          height={winH}
          style={{ position: 'absolute', top: 400, left: (STORY_W - winW) / 2, width: winW, height: winH, objectFit: 'cover', borderRadius: 28, boxShadow: '0 40px 80px rgba(0,0,0,0.55)' }}
        />
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: STORY_W, height: 620, backgroundImage: 'linear-gradient(180deg, rgba(20,13,8,0.92) 0%, rgba(20,13,8,0.62) 42%, rgba(20,13,8,0) 100%)' }} />
      {fullBleed && (
        <div style={{ position: 'absolute', top: bleedH - 780, left: 0, width: STORY_W, height: 800, backgroundImage: 'linear-gradient(180deg, rgba(20,13,8,0) 0%, rgba(20,13,8,0.86) 48%, #140D08 78%)' }} />
      )}

      <Masthead dark size={40} overPhoto={fullBleed} />

      <div style={{ position: 'absolute', top: textTop, left: 90, width: STORY_W - 180, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 7, color: C.gold }}>{data.kind.toUpperCase()}</div>
        <div style={{ marginTop: 22, fontFamily: 'Marcellus', fontSize: data.name.length > 16 ? 96 : 120, lineHeight: 0.95 }}>{data.name}</div>
        {data.families.length > 0 && <div style={{ marginTop: 22, fontSize: 32, color: C.creamSoft }}>{families(data)}</div>}
        <div style={{ marginTop: 40, marginBottom: 30, height: 1, backgroundColor: 'rgba(217,180,94,0.35)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Price data={data} size={60} color={C.cream} wasColor={C.muted} />
            <div style={{ marginTop: 12, fontSize: 22, color: C.muted }}>Livraison partout au Sénégal</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Qr url={data.url} size={150} ink={C.night} paper={C.cream} />
            <div style={{ marginTop: 10, fontSize: 18, letterSpacing: 1.4, color: C.muted }}>Scannez pour commander</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  2 · L'Arche
// -----------------------------------------------------------------------------

const VELVET = 'radial-gradient(100% 70% at 50% 32%, #4A3222 0%, #2B1D12 58%, #1C130C 100%)';

function Arche({ data }: { data: StoryData }) {
  const p = data.photo;
  // Arche au format 3:4, réduite si la photo est petite (jamais floue).
  const W = Math.round(p ? Math.min(720, sharpLimit(p, 'w'), sharpLimit(p, 'h') * 0.75) : 720);
  const H = Math.round((W * 4) / 3);
  const left = (STORY_W - W) / 2;
  const top = 400 + (960 - H) / 2;
  const textTop = 1404;

  return (
    <div style={{ position: 'relative', display: 'flex', width: STORY_W, height: STORY_H, backgroundImage: VELVET, color: C.cream, fontFamily: 'Schibsted' }}>
      <Masthead dark size={36} />
      <div style={{ position: 'absolute', top: 180, left: 40, width: 1000, height: 1100, backgroundImage: 'radial-gradient(50% 42% at 50% 42%, rgba(255,232,180,0.30) 0%, rgba(255,232,180,0.12) 55%, rgba(255,232,180,0) 100%)' }} />
      <div style={{ position: 'absolute', top: top - 54, left: 512, width: 56, height: 26, borderRadius: '0 0 28px 28px', backgroundImage: 'linear-gradient(180deg, #F1DDA8, #9C7A2A)', boxShadow: '0 8px 30px rgba(255,214,140,0.9)' }} />
      <div style={{ position: 'absolute', top: top - 18, left: left - 18, width: W + 36, height: H + 36, borderRadius: `${(W + 36) / 2}px ${(W + 36) / 2}px 40px 40px`, border: '1.5px solid rgba(217,180,94,0.45)' }} />
      {p ? (
        <img src={p.src} width={W} height={H} style={{ position: 'absolute', top, left, width: W, height: H, objectFit: 'cover', borderRadius: `${W / 2}px ${W / 2}px 26px 26px`, boxShadow: '0 40px 80px rgba(0,0,0,0.55)' }} />
      ) : (
        <div style={{ position: 'absolute', top, left, width: W, height: H, borderRadius: `${W / 2}px ${W / 2}px 26px 26px`, backgroundColor: C.night }} />
      )}
      <div style={{ position: 'absolute', top, left, width: W, height: H, borderRadius: `${W / 2}px ${W / 2}px 26px 26px`, backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.25) 100%)' }} />

      <div style={{ position: 'absolute', top: textTop, left: 0, width: STORY_W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Marcellus', fontSize: data.name.length > 16 ? 76 : 88, lineHeight: 1 }}>{data.name}</div>
        {data.families.length > 0 && <div style={{ marginTop: 18, fontSize: 21, fontWeight: 600, letterSpacing: 7, paddingLeft: 7, color: C.gold }}>{families(data).toUpperCase()}</div>}
      </div>
      <div style={{ position: 'absolute', top: 1548, left: 110, width: STORY_W - 220, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Price data={data} size={52} color={C.cream} wasColor={C.muted} />
          <div style={{ marginTop: 10, fontSize: 21, color: C.muted }}>{data.kind ? `${data.kind.split(' · ')[0]} · livrée partout au Sénégal` : 'Livrée partout au Sénégal'}</div>
        </div>
        <Qr url={data.url} size={124} ink="#1C130C" paper={C.cream} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  3 · Le Chiffre (promotion)
// -----------------------------------------------------------------------------

function Chiffre({ data }: { data: StoryData }) {
  const p = data.photo;
  const S = Math.round(p ? Math.min(636, sharpLimit(p, 'min')) : 636);
  const frame = S + 24;
  const right = 90;
  const percent = data.percent ?? 0;

  return (
    <div style={{ position: 'relative', display: 'flex', width: STORY_W, height: STORY_H, backgroundImage: 'radial-gradient(120% 80% at 30% 20%, #F7F0E3 0%, #F1E9DB 55%, #E7DAC2 100%)', color: C.ink, fontFamily: 'Schibsted' }}>
      <Masthead dark={false} size={36} />
      <div style={{ position: 'absolute', top: 330, left: 60, display: 'flex', alignItems: 'flex-start', color: 'rgba(180,138,44,0.16)', WebkitTextStroke: `2.5px ${C.goldLine}` }}>
        <div style={{ width: 120, height: 18, marginTop: 205, marginRight: 26, border: `2.5px solid ${C.goldLine}`, backgroundColor: 'rgba(180,138,44,0.16)' }} />
        <div style={{ fontFamily: 'Marcellus', fontSize: 560, lineHeight: 0.8, letterSpacing: -10 }}>{`${percent}`}</div>
        <div style={{ fontFamily: 'Marcellus', fontSize: 220, lineHeight: 0.8, marginLeft: 6 }}>%</div>
      </div>
      <div style={{ position: 'absolute', top: 640 + (636 - S) / 2, right, width: frame, height: frame, padding: 12, display: 'flex', borderRadius: 34, backgroundColor: C.linen, boxShadow: '0 50px 90px rgba(74,46,28,0.28)' }}>
        {p && <img src={p.src} width={S} height={S} style={{ width: S, height: S, objectFit: 'cover', borderRadius: 24 }} />}
      </div>

      <div style={{ position: 'absolute', top: 1350, left: 90, width: STORY_W - 180, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 7, color: C.goldDeep }}>L’OFFRE DE LA MAISON</div>
        <div style={{ marginTop: 18, fontFamily: 'Marcellus', fontSize: data.name.length > 16 ? 80 : 92, lineHeight: 0.98 }}>{data.name}</div>
        <div style={{ marginTop: 34, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Price data={data} size={68} color={C.brick} wasColor={C.smoke} />
            {data.promoEndsAt && <div style={{ marginTop: 14, fontSize: 24, color: '#4A3726' }}>{`Jusqu’au ${endDate.format(data.promoEndsAt)}`}</div>}
          </div>
          <Qr url={data.url} size={124} ink={C.ink} paper={C.linen} />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  4 · Le Cartel (nouveauté)
// -----------------------------------------------------------------------------

function Cartel({ data }: { data: StoryData }) {
  const p = data.photo;
  const win = Math.round(p ? Math.min(480, sharpLimit(p, 'min')) : 480);
  const frame = win + 61 * 2 + 22 * 2;
  const left = (STORY_W - frame) / 2;
  const top = 430;
  const cardTop = top + frame + 72;
  const arrived = data.publishedAt ? dayMonth.format(data.publishedAt).replace('/', '.') : null;

  return (
    <div style={{ position: 'relative', display: 'flex', width: STORY_W, height: STORY_H, backgroundImage: 'radial-gradient(90% 60% at 50% 30%, #F2EADC 0%, #E7DCC8 60%, #DCCDB3 100%)', color: C.ink, fontFamily: 'Schibsted' }}>
      <Masthead dark={false} size={36} />
      <div style={{ position: 'absolute', top: 160, left: 60, width: 960, height: 1100, backgroundImage: 'radial-gradient(50% 42% at 50% 42%, rgba(255,244,215,0.9) 0%, rgba(255,244,215,0.35) 60%, rgba(255,244,215,0) 100%)' }} />
      <div style={{ position: 'absolute', top: 384, left: 390, width: 300, height: 14, borderRadius: 7, backgroundImage: 'linear-gradient(180deg, #F1DDA8, #8A6A22)', boxShadow: '0 10px 26px rgba(180,138,44,0.45)' }} />

      <div style={{ position: 'absolute', top, left, width: frame, height: frame, padding: 22, display: 'flex', backgroundImage: 'linear-gradient(135deg, #F6E3A8 0%, #C9A24A 30%, #8A6A22 55%, #E9CF86 80%, #B48A2C 100%)', boxShadow: '0 40px 70px rgba(74,46,28,0.35)' }}>
        <div style={{ display: 'flex', width: frame - 44, height: frame - 44, padding: 61, backgroundColor: '#FBF8F1' }}>
          {p && <img src={p.src} width={win} height={win} style={{ width: win, height: win, objectFit: 'cover' }} />}
        </div>
      </div>


      <div style={{ position: 'absolute', top: cardTop, left: (STORY_W - 648) / 2, width: 648, padding: '40px 44px 36px', display: 'flex', flexDirection: 'column', backgroundColor: '#FDFBF6', boxShadow: '0 18px 40px rgba(74,46,28,0.18)' }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 5.4, color: C.goldDeep }}>{data.isNew ? 'NOUVELLE ARRIVÉE' : 'LA SÉLECTION DE LA MAISON'}</div>
        <div style={{ marginTop: 14, fontFamily: 'Marcellus', fontSize: data.name.length > 14 ? 72 : 92, lineHeight: 1 }}>{data.name}</div>
        <div style={{ marginTop: 14, fontSize: 26, color: '#6B5A48' }}>{[data.kind.split(' · ')[0], data.families.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</div>
        {data.tagline && <div style={{ marginTop: 6, fontSize: 22, color: C.smoke }}>{data.tagline}</div>}
        <div style={{ marginTop: 30, marginBottom: 26, height: 1, backgroundColor: '#DCCBAE' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Price data={data} size={52} color={C.ink} wasColor={C.smoke} />
            <div style={{ marginTop: 8, fontSize: 20, color: C.smoke }}>Scannez pour découvrir</div>
          </div>
          <Qr url={data.url} size={120} ink={C.ink} paper="#FDFBF6" framed={false} />
        </div>
      </div>
      {arrived && (
        <div style={{ position: 'absolute', top: top + frame - 96, left: left + frame - 96, width: 172, height: 172, borderRadius: 86, border: '3px solid rgba(163,64,46,0.82)', backgroundColor: 'rgba(253,251,246,0.88)', color: 'rgba(163,64,46,0.9)', boxShadow: '0 10px 24px rgba(74,46,28,0.18)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: 3.7 }}>NOUVEAU</div>
          <div style={{ marginTop: 4, fontFamily: 'Marcellus', fontSize: 30 }}>{arrived}</div>
        </div>
      )}
    </div>
  );
}

export function StoryArtwork({ template, data }: { template: StoryTemplate; data: StoryData }) {
  if (template === 'arche') return <Arche data={data} />;
  if (template === 'chiffre') return <Chiffre data={data} />;
  if (template === 'cartel') return <Cartel data={data} />;
  return <Couverture data={data} />;
}
