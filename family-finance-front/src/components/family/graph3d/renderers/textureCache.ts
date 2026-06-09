import * as THREE from 'three';

/** Avatar/initsial/disk teksturalarini keshlovchi va oxirida tozalovchi (leak yo'q). */
export interface TextureCache {
  loadAvatar(url: string): THREE.Texture;
  initialsTexture(initial: string, bg: string): THREE.Texture;
  discTexture(): THREE.Texture;
  dispose(): void;
}

export function createTextureCache(): TextureCache {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const avatars = new Map<string, THREE.Texture>();
  const initials = new Map<string, THREE.Texture>();
  let disc: THREE.Texture | null = null;

  function loadAvatar(url: string): THREE.Texture {
    const cached = avatars.get(url);
    if (cached) return cached;
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    avatars.set(url, tex);
    return tex;
  }

  function initialsTexture(initial: string, bg: string): THREE.Texture {
    const key = `${initial}|${bg}`;
    const cached = initials.get(key);
    if (cached) return cached;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const c = canvas.getContext('2d')!;
    c.fillStyle = bg;
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `bold ${Math.round(size * 0.5)}px Manrope, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(initial, size / 2, size / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    initials.set(key, tex);
    return tex;
  }

  function discTexture(): THREE.Texture {
    if (disc) return disc;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    c.fill();
    disc = new THREE.CanvasTexture(canvas);
    return disc;
  }

  function dispose(): void {
    avatars.forEach((t) => t.dispose());
    initials.forEach((t) => t.dispose());
    disc?.dispose();
    avatars.clear();
    initials.clear();
    disc = null;
  }

  return { loadAvatar, initialsTexture, discTexture, dispose };
}
