import * as THREE from 'three';

// Ombrage « dessin animé » : trois paliers de lumière au lieu d'un dégradé.
let gradient: THREE.DataTexture | null = null;
export function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const materials = new Map<string, THREE.MeshToonMaterial>();
// Matériaux partagés par couleur : beaucoup de personnages, peu de matériaux.
export function toon(color: string, emissive?: string, emissiveIntensity = 1) {
  const key = `${color}|${emissive ?? ''}|${emissiveIntensity}`;
  let material = materials.get(key);
  if (!material) {
    material = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
    if (emissive) {
      material.emissive = new THREE.Color(emissive);
      material.emissiveIntensity = emissiveIntensity;
    }
    materials.set(key, material);
  }
  return material;
}

// Une étiquette dessinée dans un canvas (texte, tampon) : pas de police à télécharger.
export function textTexture(
  lines: string[],
  {
    width = 512,
    height = 256,
    color = '#f2ebe3',
    background = 'transparent',
    font = '700 120px system-ui, sans-serif',
    border,
    rotate = 0,
  }: {
    width?: number;
    height?: number;
    color?: string;
    background?: string;
    font?: string;
    border?: string;
    rotate?: number;
  } = {},
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) {
    if (background !== 'transparent') {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }
    context.translate(width / 2, height / 2);
    context.rotate(rotate);
    if (border) {
      context.strokeStyle = border;
      context.lineWidth = height * 0.06;
      const w = width * 0.86;
      const h = height * 0.7;
      context.beginPath();
      context.roundRect(-w / 2, -h / 2, w, h, height * 0.12);
      context.stroke();
    }
    context.fillStyle = color;
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const lineHeight = height / (lines.length + 0.6);
    lines.forEach((line, index) => {
      context.fillText(line, 0, (index - (lines.length - 1) / 2) * lineHeight);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Bandes de l'auvent d'un étal.
export function stripeTexture(a: string, b: string, stripes = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 16;
  const context = canvas.getContext('2d');
  if (context) {
    for (let index = 0; index < stripes; index += 1) {
      context.fillStyle = index % 2 ? a : b;
      context.fillRect((index * 256) / stripes, 0, 256 / stripes, 16);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
