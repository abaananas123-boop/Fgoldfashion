import * as THREE from 'three';
import {
  Hero3DAspectShape,
  Hero3DDepthLevel,
  Hero3DFrameStyle,
  Hero3DShowcaseConfig,
  Product,
} from '../types';
import { detectMediaKind, normalizeMediaUrl } from './imageUpload';

export interface RealProduct3DSlide {
  id: string;
  kind: 'product' | 'picture';
  product?: Product;
  imageUrl: string;
  category?: string;
  subcategory?: string;
  targetUrl?: string;
  title: string;
  subtitle: string;
  priceText?: string;
  ctaLabel?: string;
}

export interface ProductTextureBundle {
  colorMap: THREE.Texture;
  reliefMap: THREE.DataTexture | null;
  aspect: number;
}

export interface SculptureVisualOptions {
  frameStyle: Hero3DFrameStyle;
  aspectShape: Hero3DAspectShape;
  depthLevel: Hero3DDepthLevel;
}

export function pickBestImageUrl(product: Product): string {
  const candidates: string[] = [];
  if (product.imageUrl) candidates.push(product.imageUrl);
  if (Array.isArray(product.mediaGallery)) {
    for (const img of product.mediaGallery) {
      if (img && !candidates.includes(img)) candidates.push(img);
    }
  }
  for (const raw of candidates) {
    const normalized = normalizeMediaUrl(raw);
    if (normalized && detectMediaKind(normalized) === 'image') {
      return normalized;
    }
  }
  return normalizeMediaUrl(product.imageUrl || candidates[0] || '');
}

/**
 * Builds the ordered slides for the Hero 3D Showcase from either the store manager's
 * fully customized slides (custom uploaded photos + selected products) or all live catalog products.
 */
export function buildRealProductSlides(
  products: Product[],
  categories: string[],
  showcaseConfig?: Hero3DShowcaseConfig,
): RealProduct3DSlide[] {
  const productMap = new Map<string, Product>(
    (products || []).map((p) => [p.id, p]),
  );

  if (
    showcaseConfig?.mode === 'custom' &&
    Array.isArray(showcaseConfig.items) &&
    showcaseConfig.items.length > 0
  ) {
    const customSlides: RealProduct3DSlide[] = [];
    for (const item of showcaseConfig.items) {
      const linkedProduct = item.productId
        ? productMap.get(item.productId)
        : undefined;
      const imageUrl = normalizeMediaUrl(
        item.imageUrl || (linkedProduct ? pickBestImageUrl(linkedProduct) : ''),
      );
      if (!imageUrl) continue;

      const resolvedCategory =
        item.targetCategory?.trim() || linkedProduct?.category || undefined;
      const resolvedSub =
        item.targetSubcategory?.trim() ||
        (linkedProduct?.subcategory && linkedProduct.subcategory !== 'All'
          ? linkedProduct.subcategory
          : undefined);

      const defaultSubtitle = resolvedCategory
        ? resolvedSub
          ? `${resolvedCategory} · ${resolvedSub}`
          : resolvedCategory
        : 'Featured Highlight';

      const defaultPrice = linkedProduct
        ? `PKR ${Number(linkedProduct.price || 0).toLocaleString()}`
        : undefined;

      customSlides.push({
        id: item.id,
        kind: linkedProduct ? 'product' : item.kind,
        product: linkedProduct,
        imageUrl,
        category: resolvedCategory,
        subcategory: resolvedSub,
        targetUrl: item.targetUrl?.trim() || undefined,
        title:
          item.title !== undefined
            ? item.title.trim()
            : linkedProduct?.name || '',
        subtitle:
          item.subtitle !== undefined
            ? item.subtitle.trim()
            : defaultSubtitle,
        priceText:
          item.priceText !== undefined
            ? item.priceText.trim() || undefined
            : defaultPrice,
        ctaLabel: item.ctaLabel?.trim() || undefined,
      });
    }

    if (customSlides.length > 0) {
      return customSlides;
    }
  }

  if (!Array.isArray(products) || products.length === 0) return [];

  const categoryPriority = new Map<string, number>();
  const orderedCats = [...categories].sort((a, b) => {
    const aB = a.trim().toLowerCase() === 'boutique' ? 0 : 1;
    const bB = b.trim().toLowerCase() === 'boutique' ? 0 : 1;
    return aB - bB;
  });
  orderedCats.forEach((cat, idx) => {
    categoryPriority.set(cat.trim().toLowerCase(), idx);
  });

  const sortedProducts = [...products].sort((a, b) => {
    const aCat = a.category.trim().toLowerCase();
    const bCat = b.category.trim().toLowerCase();
    const pa = categoryPriority.get(aCat) ?? 999;
    const pb = categoryPriority.get(bCat) ?? 999;
    if (pa !== pb) return pa - pb;

    if (aCat === 'boutique' && bCat === 'boutique') {
      const scoreSub = (sub?: string) => {
        const s = (sub ?? '').toLowerCase();
        if (s.includes('bridal')) return 0;
        if (s.includes('party')) return 1;
        return 2;
      };
      const sa = scoreSub(a.subcategory);
      const sb = scoreSub(b.subcategory);
      if (sa !== sb) return sa - sb;
    }
    return 0;
  });

  const slides: RealProduct3DSlide[] = [];
  const seenIds = new Set<string>();

  for (const product of sortedProducts) {
    if (!product || seenIds.has(product.id)) continue;
    const imageUrl = pickBestImageUrl(product);
    if (!imageUrl) continue;
    seenIds.add(product.id);

    const sub =
      product.subcategory && product.subcategory !== 'All'
        ? product.subcategory
        : undefined;

    slides.push({
      id: product.id,
      kind: 'product',
      product,
      imageUrl,
      category: product.category,
      subcategory: sub,
      title: product.name,
      subtitle: sub ? `${product.category} · ${sub}` : product.category,
      priceText: `PKR ${(Number(product.price) || 0).toLocaleString()}`,
    });
  }

  return slides;
}

export function loadProductTextureBundle(
  url: string,
  maxAnisotropy: number,
): Promise<ProductTextureBundle> {
  return new Promise((resolve, reject) => {
    const attemptLoad = (useCors: boolean) => {
      const img = new Image();
      if (useCors) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        const tex = new THREE.Texture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;

        const aspect =
          img.naturalWidth && img.naturalHeight
            ? Math.max(
                0.62,
                Math.min(1.42, img.naturalWidth / img.naturalHeight),
              )
            : 0.78;

        resolve({ colorMap: tex, reliefMap: null, aspect });
      };

      img.onerror = () => {
        if (useCors) {
          attemptLoad(false);
        } else {
          reject(new Error(`Failed to load image texture: ${url}`));
        }
      };

      img.src = url;
    };

    attemptLoad(true);
  });
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 32, 4, 64, 32, 58);
    grad.addColorStop(0, 'rgba(18, 16, 14, 0.42)');
    grad.addColorStop(0.5, 'rgba(18, 16, 14, 0.18)');
    grad.addColorStop(1, 'rgba(18, 16, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function applyConvexArc(geometry: THREE.BufferGeometry, depthOffset: number) {
  const pos = geometry.attributes.position;
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const halfSpan = Math.max(0.01, (maxX - minX) / 2);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = x / halfSpan;
    const arch = (1 - nx * nx) * depthOffset;
    pos.setZ(i, z + arch);
  }
  geometry.computeVertexNormals();
}

export interface ProductCard3DParts {
  group: THREE.Group;
  photoMaterial: THREE.MeshPhysicalMaterial;
  frameMaterial: THREE.MeshStandardMaterial;
  backMaterial: THREE.MeshStandardMaterial;
  shadowMaterial: THREE.MeshBasicMaterial;
  hitMesh: THREE.Mesh;
}

export function createProduct3DSculpture(
  slide: RealProduct3DSlide,
  bundle: ProductTextureBundle | null,
  isLowEnd: boolean,
  options: SculptureVisualOptions = {
    frameStyle: 'gold',
    aspectShape: 'portrait',
    depthLevel: 'medium',
  },
): ProductCard3DParts {
  const group = new THREE.Group();

  // Compute physical 3D dimensions based on customized aspectShape
  let w = 1.78;
  let h = 2.26;
  if (options.aspectShape === 'square') {
    w = 2.02;
    h = 2.02;
  } else if (options.aspectShape === 'landscape') {
    w = 2.38;
    h = 1.68;
  } else {
    const aspect = bundle ? bundle.aspect : 0.8;
    h = 2.28;
    w = Math.max(1.48, Math.min(2.15, h * aspect));
  }

  const curveDepth =
    options.depthLevel === 'subtle'
      ? 0.045
      : options.depthLevel === 'bold'
      ? 0.145
      : 0.095;

  const segX = isLowEnd ? 20 : 40;
  const segY = isLowEnd ? 24 : 48;

  // 1. Matte Anti-Glare Curved 3D Photo Surface (zero white specular sheen, true product colors)
  const photoGeo = new THREE.PlaneGeometry(w, h, segX, segY);
  applyConvexArc(photoGeo, curveDepth);

  const photoMaterial = new THREE.MeshPhysicalMaterial({
    map: bundle ? bundle.colorMap : null,
    color: bundle ? 0xffffff : 0xf4f1ea,
    roughness: 1.0,
    metalness: 0,
    specularIntensity: 0,
    envMapIntensity: 0,
    transparent: true,
    opacity: 1,
  });

  const photoMesh = new THREE.Mesh(photoGeo, photoMaterial);
  photoMesh.userData.slideId = slide.id;
  group.add(photoMesh);

  // 2. Grounded Brushed Metallic / Frameless Perimeter Chassis
  const frameColorHex =
    options.frameStyle === 'obsidian'
      ? 0x1b1917
      : options.frameStyle === 'silver'
      ? 0xc8cdd6
      : 0xc8a45a;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: frameColorHex,
    metalness: options.frameStyle === 'obsidian' ? 0.28 : 0.82,
    roughness: options.frameStyle === 'obsidian' ? 0.62 : isLowEnd ? 0.42 : 0.36,
    envMapIntensity: 0.45,
    transparent: true,
    opacity: options.frameStyle === 'frameless' ? 0 : 1,
    visible: options.frameStyle !== 'frameless',
  });

  if (options.frameStyle !== 'frameless') {
    const railThickness = 0.026;
    const railDepth = 0.068;

    const topBottomGeoTop = new THREE.BoxGeometry(
      w + railThickness * 2,
      railThickness,
      railDepth,
      16,
      1,
      1,
    );
    applyConvexArc(topBottomGeoTop, curveDepth);
    const topRail = new THREE.Mesh(topBottomGeoTop, frameMaterial);
    topRail.position.set(0, h / 2 + railThickness / 2 - 0.002, -0.014);
    group.add(topRail);

    const topBottomGeoBot = topBottomGeoTop.clone();
    const botRail = new THREE.Mesh(topBottomGeoBot, frameMaterial);
    botRail.position.set(0, -h / 2 - railThickness / 2 + 0.002, -0.014);
    group.add(botRail);

    const sideRailGeo = new THREE.BoxGeometry(
      railThickness,
      h + railThickness * 2,
      railDepth,
    );
    const leftRail = new THREE.Mesh(sideRailGeo, frameMaterial);
    leftRail.position.set(-w / 2 - railThickness / 2 + 0.002, 0, -0.014);
    group.add(leftRail);

    const rightRail = new THREE.Mesh(sideRailGeo, frameMaterial);
    rightRail.position.set(w / 2 + railThickness / 2 - 0.002, 0, -0.014);
    group.add(rightRail);
  }

  // 3. Solid Architectural Reverse Side
  const backMaterial = new THREE.MeshStandardMaterial({
    color: options.frameStyle === 'silver' ? 0xe7e9ee : 0x1b1917,
    roughness: 0.65,
    metalness: 0.12,
    transparent: true,
    opacity: 1,
  });
  const backGeo = new THREE.PlaneGeometry(w, h, 16, 1);
  applyConvexArc(backGeo, curveDepth);
  const backMesh = new THREE.Mesh(backGeo, backMaterial);
  backMesh.rotation.y = Math.PI;
  backMesh.position.z = -0.04;
  group.add(backMesh);

  // 4. Invisible Clean Hit Proxy for Fast Reliable Raycasting
  const hitGeo = new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.24);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.userData.slideId = slide.id;
  group.add(hitMesh);

  // 5. Soft Grounded Studio Contact Shadow Beneath Each Floating 3D Product
  const shadowTex = createContactShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.82,
  });
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 1.18, 0.48),
    shadowMaterial,
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, -h / 2 - 0.16, 0.02);
  group.add(shadowPlane);

  return {
    group,
    photoMaterial,
    frameMaterial,
    backMaterial,
    shadowMaterial,
    hitMesh,
  };
}

export function disposeTextureBundle(bundle: ProductTextureBundle) {
  bundle.colorMap.dispose();
  if (bundle.reliefMap) {
    bundle.reliefMap.dispose();
  }
}

export function disposeProductSculpture(group: THREE.Object3D) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const basic = m as THREE.MeshBasicMaterial;
        if (basic.map && !m.userData?.sharedTexture) {
          if (basic.opacity < 0.99 && m.type === 'MeshBasicMaterial') {
            basic.map.dispose();
          }
        }
        m.dispose();
      }
    }
  });
}
