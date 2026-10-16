import QRCode from 'qrcode';

/**
 * QR code en tracé SVG (un rectangle par suite de modules sombres) : net à
 * toutes les tailles, sans image intermédiaire.
 */
export function qrPath(text: string): { size: number; d: string } {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  let d = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (data[y * size + x]) {
        const start = x;
        while (x < size && data[y * size + x]) x++;
        d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
      } else x++;
    }
  }
  return { size, d };
}
