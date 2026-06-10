import * as THREE from 'three';

/** Avatar (doiraviy, async) va disk teksturalarini keshlaydi va oxirida tozalaydi (leak yo'q). */
export interface TextureCache {
  /**
   * Doiraviy avatar teksturasi: DARHOL initsial-disk ko'rsatadi (loading holati),
   * rasm yuklangach uni doira ichida (cover-fit) almashtiradi. Xato bo'lsa initsial qoladi.
   */
  avatar(opts: { url?: string; initial: string; bg: string }): THREE.Texture;
  /** Jins-halqa foni uchun oq disk (SpriteMaterial.color bilan bo'yaladi). */
  discTexture(): THREE.Texture;
  dispose(): void;
}

const TEX_SIZE = 128;

function drawInitials(c: CanvasRenderingContext2D, size: number, initial: string, bg: string): void {
  c.clearRect(0, 0, size, size);
  c.fillStyle = bg;
  c.beginPath();
  c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.font = `bold ${Math.round(size * 0.5)}px Manrope, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(initial, size / 2, size / 2 + size * 0.04);
}

function drawCircularImage(c: CanvasRenderingContext2D, size: number, img: HTMLImageElement): void {
  c.clearRect(0, 0, size, size);
  c.save();
  c.beginPath();
  c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  c.clip();
  // cover-fit (rasmni doirani to'liq qoplaydigan qilib markazlash)
  const aspect = img.width / img.height;
  let dw = size;
  let dh = size;
  let dx = 0;
  let dy = 0;
  if (aspect > 1) {
    dw = size * aspect;
    dx = -(dw - size) / 2;
  } else if (aspect < 1) {
    dh = size / aspect;
    dy = -(dh - size) / 2;
  }
  c.drawImage(img, dx, dy, dw, dh);
  c.restore();
}

export function createTextureCache(): TextureCache {
  const cache = new Map<string, THREE.Texture>();
  let disc: THREE.Texture | null = null;

  function avatar({ url, initial, bg }: { url?: string; initial: string; bg: string }): THREE.Texture {
    const key = url ? `url:${url}` : `init:${initial}|${bg}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const c = canvas.getContext('2d')!;
    drawInitials(c, TEX_SIZE, initial, bg); // darhol ko'rinadi (loading/fallback)

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.set(key, tex);

    if (url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        drawCircularImage(c, TEX_SIZE, img);
        tex.needsUpdate = true;
      };
      // onerror — hech narsa qilmaymiz, initsial-disk fallback bo'lib qoladi
      img.src = url;
    }
    return tex;
  }

  function discTexture(): THREE.Texture {
    if (disc) return disc;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    c.fill();
    disc = new THREE.CanvasTexture(canvas);
    return disc;
  }

  function dispose(): void {
    cache.forEach((t) => t.dispose());
    disc?.dispose();
    cache.clear();
    disc = null;
  }

  return { avatar, discTexture, dispose };
}
