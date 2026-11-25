import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { Hero3DShowcaseConfig, Product } from '../types';
import {
  ProductCard3DParts,
  ProductTextureBundle,
  RealProduct3DSlide,
  SculptureVisualOptions,
  buildRealProductSlides,
  createProduct3DSculpture,
  disposeProductSculpture,
  disposeTextureBundle,
  loadProductTextureBundle,
} from '../utils/threeDepartmentModels';

interface Department3DShowcaseProps {
  products: Product[];
  categories: string[];
  activeCategory: string;
  activeSubcategory: string;
  showcaseConfig?: Hero3DShowcaseConfig;
  isAdmin?: boolean;
  onSelectDepartment: (category: string, subcategory?: string) => void;
  onInspectProduct?: (product: Product) => void;
  onNavigateLink?: (url: string) => void;
  onCustomize?: () => void;
}

function wrapSignedDistance(index: number, focus: number, total: number): number {
  if (total <= 0) return 0;
  let d = (index - focus) % total;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

export function Department3DShowcase({
  products,
  categories,
  activeCategory,
  activeSubcategory,
  showcaseConfig,
  isAdmin = false,
  onSelectDepartment,
  onInspectProduct,
  onNavigateLink,
  onCustomize,
}: Department3DShowcaseProps) {
  const slides = useMemo(
    () => buildRealProductSlides(products, categories, showcaseConfig),
    [products, categories, showcaseConfig],
  );

  const visualOptions: SculptureVisualOptions = useMemo(
    () => ({
      frameStyle: showcaseConfig?.frameStyle ?? 'gold',
      aspectShape: showcaseConfig?.aspectShape ?? 'portrait',
      depthLevel: showcaseConfig?.depthLevel ?? 'medium',
    }),
    [
      showcaseConfig?.frameStyle,
      showcaseConfig?.aspectShape,
      showcaseConfig?.depthLevel,
    ],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredRole, setHoveredRole] = useState<'none' | 'center' | 'side'>('none');
  const [isDragging, setIsDragging] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const carouselRootRef = useRef<THREE.Group | null>(null);
  const sculpturesRef = useRef<Map<string, ProductCard3DParts>>(new Map());
  const hitMeshesRef = useRef<THREE.Object3D[]>([]);
  const textureCacheRef = useRef<Map<string, ProductTextureBundle>>(new Map());
  const maxAnisotropyRef = useRef(4);
  const isLowEndRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lightsRef = useRef<{
    hemi: THREE.HemisphereLight;
    key: THREE.DirectionalLight;
    rim: THREE.DirectionalLight;
  } | null>(null);
  const lightingIntensityRef = useRef(
    typeof showcaseConfig?.lightingIntensity === 'number'
      ? showcaseConfig.lightingIntensity
      : 100,
  );
  lightingIntensityRef.current =
    typeof showcaseConfig?.lightingIntensity === 'number'
      ? showcaseConfig.lightingIntensity
      : 100;
  const shadowDepthRef = useRef(
    typeof showcaseConfig?.shadowDepth === 'number'
      ? showcaseConfig.shadowDepth
      : 100,
  );
  shadowDepthRef.current =
    typeof showcaseConfig?.shadowDepth === 'number'
      ? showcaseConfig.shadowDepth
      : 100;
  const prevStyleKeyRef = useRef('');
  const prevSlideImageMapRef = useRef<Map<string, string>>(new Map());

  const slidesRef = useRef<RealProduct3DSlide[]>(slides);
  slidesRef.current = slides;

  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const hoverTiltRef = useRef({ yaw: 0, pitch: 0 });
  const currentTiltRef = useRef({ yaw: 0, pitch: 0 });

  const isDraggingRef = useRef(false);
  const isHoverCanvasRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragLastXRef = useRef(0);
  const dragStartScrollRef = useRef(0);

  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerNdcRef = useRef(new THREE.Vector2());

  const onSelectRef = useRef(onSelectDepartment);
  onSelectRef.current = onSelectDepartment;
  const onNavigateRef = useRef(onNavigateLink);
  onNavigateRef.current = onNavigateLink;
  const onInspectRef = useRef(onInspectProduct);
  onInspectRef.current = onInspectProduct;

  const totalSlides = slides.length;
  const safeActiveIdx =
    totalSlides > 0 ? ((activeIndex % totalSlides) + totalSlides) % totalSlides : 0;
  const activeSlide = slides[safeActiveIdx];

  useEffect(() => {
    if (totalSlides > 0 && activeIndex >= totalSlides) {
      setActiveIndex(0);
      targetScrollRef.current = 0;
      currentScrollRef.current = 0;
    }
  }, [totalSlides, activeIndex]);

  useEffect(() => {
    if (!activeCategory || activeCategory === 'All' || slides.length === 0) return;
    const matchIdx = slides.findIndex((s) => {
      if (s.category !== activeCategory) return false;
      if (activeSubcategory && activeSubcategory !== 'All') {
        return s.subcategory === activeSubcategory;
      }
      return true;
    });
    if (matchIdx >= 0 && matchIdx !== safeActiveIdx) {
      const delta = wrapSignedDistance(matchIdx, targetScrollRef.current, slides.length);
      targetScrollRef.current += delta;
      setActiveIndex(matchIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeSubcategory]);

  const stepToIndex = (targetIdx: number) => {
    if (totalSlides === 0) return;
    const wrapped = ((targetIdx % totalSlides) + totalSlides) % totalSlides;
    const delta = wrapSignedDistance(wrapped, targetScrollRef.current, totalSlides);
    targetScrollRef.current += delta;
    setActiveIndex(wrapped);
  };

  const isEnabled = showcaseConfig?.enabled !== false;
  const hasSlides = slides.length > 0 && Boolean(activeSlide);
  const intervalMs = Math.min(
    15000,
    Math.max(2000, ((showcaseConfig?.intervalSeconds ?? 4) || 4) * 1000),
  );

  // Optional auto-slide carousel timer when enabled in customization settings
  useEffect(() => {
    if (!isEnabled || !showcaseConfig?.autoPlay || totalSlides <= 1) return;
    const timer = window.setInterval(() => {
      if (isDraggingRef.current || isHoverCanvasRef.current) return;
      targetScrollRef.current += 1;
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isEnabled, showcaseConfig?.autoPlay, intervalMs, totalSlides]);

  const handleSlidePrimaryAction = (slide: RealProduct3DSlide) => {
    if (slide.category) {
      onSelectRef.current(slide.category, slide.subcategory);
      return;
    }
    if (slide.targetUrl && onNavigateRef.current) {
      onNavigateRef.current(slide.targetUrl);
      return;
    }
    if (slide.product && onInspectRef.current) {
      onInspectRef.current(slide.product);
    }
  };

  // Initialize Transparent Studio WebGLRenderer whenever visible canvas is mounted
  useEffect(() => {
    if (!isEnabled || !hasSlides) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      const probeCanvas = document.createElement('canvas');
      const probeGl =
        probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      let isSoftware = false;
      if (probeGl) {
        const ext = probeGl.getExtension('WEBGL_debug_renderer_info');
        const str = String(
          ext
            ? probeGl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
            : probeGl.getParameter(probeGl.RENDERER) || '',
        );
        isSoftware = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(str);
      }
      isLowEndRef.current = isSoftware;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !isSoftware,
        powerPreference: isSoftware ? 'default' : 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      isLowEndRef.current ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    maxAnisotropyRef.current = Math.min(
      8,
      renderer.capabilities.getMaxAnisotropy() || 1,
    );

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.35;
    roomEnv.dispose();

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 280);
    renderer.setSize(width, height, false);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 40);
    camera.position.set(0, 0.06, 4.75);
    camera.lookAt(0, -0.04, 0);
    cameraRef.current = camera;

    const hemi = new THREE.HemisphereLight(0xf8f5ef, 0x3b332c, 0.72);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 0.54);
    keyLight.position.set(3.6, 3.2, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf0ece2, 0.24);
    rimLight.position.set(-3.8, 2.0, -2.5);
    scene.add(rimLight);

    lightsRef.current = { hemi, key: keyLight, rim: rimLight };

    const carouselRoot = new THREE.Group();
    scene.add(carouselRoot);
    carouselRootRef.current = carouselRoot;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 260);
      const h = Math.max(entry.contentRect.height, 260);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      const dampScroll = 1 - Math.exp(-9.5 * dt);
      const dampTilt = 1 - Math.exp(-8.0 * dt);

      currentScrollRef.current +=
        (targetScrollRef.current - currentScrollRef.current) * dampScroll;
      currentTiltRef.current.yaw +=
        (hoverTiltRef.current.yaw - currentTiltRef.current.yaw) * dampTilt;
      currentTiltRef.current.pitch +=
        (hoverTiltRef.current.pitch - currentTiltRef.current.pitch) * dampTilt;

      const brightnessFactor = lightingIntensityRef.current / 100;
      const shadowFactor = shadowDepthRef.current / 100;

      if (rendererRef.current) {
        rendererRef.current.toneMappingExposure = 0.68 + brightnessFactor * 0.20;
      }
      if (sceneRef.current) {
        sceneRef.current.environmentIntensity = Math.min(0.65, 0.35 * brightnessFactor);
      }
      if (lightsRef.current) {
        // Higher shadow depth deepens contrast between directional key light & ambient fill
        const hemiContrastScale = Math.max(0.32, 1.12 - shadowFactor * 0.25);
        lightsRef.current.hemi.intensity = 0.72 * brightnessFactor * hemiContrastScale;
        lightsRef.current.key.intensity = 0.54 * brightnessFactor * (0.85 + shadowFactor * 0.15);
        lightsRef.current.rim.intensity = 0.24 * brightnessFactor;
      }

      const list = slidesRef.current;
      const count = list.length;

      if (count > 0) {
        const contactShadowBase = Math.min(1.0, 0.82 * shadowFactor);
        for (let i = 0; i < count; i++) {
          const slide = list[i];
          const parts = sculpturesRef.current.get(slide.id);
          if (!parts) continue;

          const d = wrapSignedDistance(i, currentScrollRef.current, count);
          const absD = Math.abs(d);

          if (absD > 2.45) {
            parts.group.visible = false;
            continue;
          }
          parts.group.visible = true;

          const sign = d === 0 ? 0 : d > 0 ? 1 : -1;
          const x = absD <= 1 ? d * 1.48 : sign * (1.48 + (absD - 1) * 1.05);
          const z = 0.62 - Math.min(2.1, absD * 1.06);
          const scale = Math.max(0.48, 1.0 - absD * 0.25);

          const centerInfluence = Math.max(0, 1 - absD * 1.6);
          const idleFloatY =
            Math.sin(elapsed * 1.6 + i * 0.8) * 0.028 * centerInfluence;
          const arcRotY =
            absD <= 1 ? -d * 0.52 : -sign * (0.52 + (absD - 1) * 0.22);

          parts.group.position.set(x, idleFloatY, z);
          parts.group.scale.setScalar(scale);
          parts.group.rotation.y =
            arcRotY + currentTiltRef.current.yaw * centerInfluence;
          parts.group.rotation.x =
            currentTiltRef.current.pitch * centerInfluence;

          const opacity =
            absD <= 1.2
              ? 1 - absD * 0.12
              : Math.max(0, 1 - (absD - 1.2) * 0.78);
          parts.photoMaterial.opacity = opacity;
          if (parts.frameMaterial.visible) {
            parts.frameMaterial.opacity = opacity;
          }
          parts.backMaterial.opacity = opacity;
          parts.shadowMaterial.opacity = contactShadowBase * opacity;
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      sculpturesRef.current.forEach((parts) => {
        disposeProductSculpture(parts.group);
      });
      sculpturesRef.current.clear();
      hitMeshesRef.current = [];

      textureCacheRef.current.forEach((bundle) => {
        disposeTextureBundle(bundle);
      });
      textureCacheRef.current.clear();

      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      rendererRef.current = null;
      lightsRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      carouselRootRef.current = null;
    };
  }, [isEnabled, hasSlides]);

  // Sync sculptures whenever slides OR visual customization options change
  useEffect(() => {
    const root = carouselRootRef.current;
    if (!root) return;

    let cancelled = false;
    const styleKey = `${visualOptions.frameStyle}:${visualOptions.aspectShape}:${visualOptions.depthLevel}`;
    const styleChanged = prevStyleKeyRef.current !== styleKey;
    prevStyleKeyRef.current = styleKey;

    if (styleChanged) {
      sculpturesRef.current.forEach((parts) => {
        root.remove(parts.group);
        disposeProductSculpture(parts.group);
      });
      sculpturesRef.current.clear();
      prevSlideImageMapRef.current.clear();
    }

    const validIds = new Set(slides.map((s) => s.id));

    sculpturesRef.current.forEach((parts, id) => {
      const nextSlide = slides.find((s) => s.id === id);
      const imageChanged =
        nextSlide && prevSlideImageMapRef.current.get(id) !== nextSlide.imageUrl;
      if (!validIds.has(id) || imageChanged) {
        root.remove(parts.group);
        disposeProductSculpture(parts.group);
        sculpturesRef.current.delete(id);
      }
    });

    for (const slide of slides) {
      if (!sculpturesRef.current.has(slide.id)) {
        prevSlideImageMapRef.current.set(slide.id, slide.imageUrl);
        const cached = textureCacheRef.current.get(slide.imageUrl) ?? null;
        const parts = createProduct3DSculpture(
          slide,
          cached,
          isLowEndRef.current,
          visualOptions,
        );
        sculpturesRef.current.set(slide.id, parts);
        root.add(parts.group);

        if (!cached) {
          loadProductTextureBundle(slide.imageUrl, maxAnisotropyRef.current)
            .then((bundle) => {
              if (cancelled) {
                disposeTextureBundle(bundle);
                return;
              }
              textureCacheRef.current.set(slide.imageUrl, bundle);

              const activeRoot = carouselRootRef.current;
              const existingParts = sculpturesRef.current.get(slide.id);
              if (activeRoot && existingParts) {
                activeRoot.remove(existingParts.group);
                disposeProductSculpture(existingParts.group);
                const upgraded = createProduct3DSculpture(
                  slide,
                  bundle,
                  isLowEndRef.current,
                  visualOptions,
                );
                sculpturesRef.current.set(slide.id, upgraded);
                activeRoot.add(upgraded.group);
                hitMeshesRef.current = Array.from(
                  sculpturesRef.current.values(),
                ).map((p) => p.hitMesh);
              }
            })
            .catch(() => {
              // Keep sculpture visible gracefully if external photo fails CORS/network
            });
        }
      }
    }

    hitMeshesRef.current = Array.from(sculpturesRef.current.values()).map(
      (p) => p.hitMesh,
    );

    return () => {
      cancelled = true;
    };
  }, [slides, visualOptions, isEnabled, hasSlides]);

  const raycastSlideId = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera || hitMeshesRef.current.length === 0) return null;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    pointerNdcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(pointerNdcRef.current, camera);
    const hits = raycasterRef.current.intersectObjects(hitMeshesRef.current, false);
    if (hits.length === 0) return null;

    for (const hit of hits) {
      if (hit.object.parent?.visible) {
        return (hit.object.userData.slideId as string) || null;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragLastXRef.current = e.clientX;
    dragStartScrollRef.current = targetScrollRef.current;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isHoverCanvasRef.current = true;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        hoverTiltRef.current.yaw = nx * 0.24;
        hoverTiltRef.current.pitch = ny * 0.14;
      }
    }

    if (isDraggingRef.current && dragStartRef.current) {
      const dx = e.clientX - dragLastXRef.current;
      dragLastXRef.current = e.clientX;
      targetScrollRef.current -= dx * 0.0085;
      return;
    }

    const hitId = raycastSlideId(e.clientX, e.clientY);
    if (!hitId) {
      if (hoveredRole !== 'none') setHoveredRole('none');
    } else if (activeSlide && hitId === activeSlide.id) {
      if (hoveredRole !== 'center') setHoveredRole('center');
    } else if (hoveredRole !== 'side') {
      setHoveredRole('side');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const start = dragStartRef.current;
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);
    dragStartRef.current = null;

    if (!wasDragging || !start || totalSlides === 0) return;
    const travel = Math.hypot(e.clientX - start.x, e.clientY - start.y);

    if (travel <= 8) {
      targetScrollRef.current = dragStartScrollRef.current;
      const hitId = raycastSlideId(e.clientX, e.clientY);
      if (hitId) {
        const hitIdx = slides.findIndex((s) => s.id === hitId);
        if (hitIdx >= 0) {
          if (hitIdx === safeActiveIdx) {
            handleSlidePrimaryAction(slides[hitIdx]);
          } else {
            stepToIndex(hitIdx);
          }
        }
      }
      return;
    }

    const snapped = Math.round(targetScrollRef.current);
    targetScrollRef.current = snapped;
    const nextIdx = ((snapped % totalSlides) + totalSlides) % totalSlides;
    setActiveIndex(nextIdx);
  };

  const handlePointerLeave = () => {
    isHoverCanvasRef.current = false;
    hoverTiltRef.current.yaw = 0;
    hoverTiltRef.current.pitch = 0;
    setHoveredRole('none');
  };

  if (!isEnabled) {
    if (!isAdmin) return null;
    return onCustomize ? (
      <div className="w-full p-6 border border-dashed border-[#D4D4CE] rounded-xl bg-white/80 text-center space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Hero 3D Slider · Hidden
        </p>
        <p className="text-xs text-[#5A5A56]">
          Visitors currently do not see the 3D showcase slider.
        </p>
        <button
          type="button"
          onClick={onCustomize}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Customize &amp; Show 3D Slider</span>
        </button>
      </div>
    ) : null;
  }

  if (slides.length === 0 || !activeSlide) {
    return isAdmin && onCustomize ? (
      <div className="w-full flex flex-col items-center justify-center p-8 border border-dashed border-[#D4D4CE] rounded-xl bg-white/80 text-center space-y-2">
        <p className="text-xs text-[#5A5A56]">
          No 3D slides active yet. Add pictures, products, or custom texts.
        </p>
        <button
          type="button"
          onClick={onCustomize}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Customize 3D Box &amp; Add Slides</span>
        </button>
      </div>
    ) : null;
  }

  const boxTheme = showcaseConfig?.boxTheme ?? 'transparent';
  const hasCustomBoxStyle = Boolean(
    showcaseConfig?.customBgColor || showcaseConfig?.customBorderColor,
  );
  const isBoxed = boxTheme !== 'transparent' || hasCustomBoxStyle;
  const isDarkTheme = boxTheme === 'obsidian' && !showcaseConfig?.customBgColor;

  const boxThemeClasses = !isBoxed
    ? 'bg-transparent'
    : boxTheme === 'obsidian'
      ? 'rounded-xl border border-[#2F2F2B] bg-[#141413] text-[#F5F4F0] p-4 sm:p-5'
      : boxTheme === 'warm'
        ? 'rounded-xl border border-[#E4DEC9] bg-[#F7F4EC] text-[#141413] p-4 sm:p-5'
        : boxTheme === 'gold'
          ? 'rounded-xl border border-[#C8A860]/70 bg-white text-[#141413] p-4 sm:p-5'
          : 'rounded-xl border border-[#E4E4E0] bg-white text-[#141413] p-4 sm:p-5';

  const containerStyle = {
    ...(showcaseConfig?.customBgColor
      ? { backgroundColor: showcaseConfig.customBgColor }
      : {}),
    ...(showcaseConfig?.customTextColor
      ? { color: showcaseConfig.customTextColor }
      : {}),
    ...(showcaseConfig?.customBorderColor
      ? { borderColor: showcaseConfig.customBorderColor }
      : {}),
  };

  const eyebrowText = showcaseConfig?.eyebrow?.trim() || '';
  const headingText = showcaseConfig?.heading?.trim() || '';
  const descriptionText = showcaseConfig?.description?.trim() || '';
  const showCaptions = showcaseConfig?.showCaptions !== false;
  const showSubtitle = showcaseConfig?.showSubtitle !== false;
  const showCounter = showcaseConfig?.showCounter !== false;
  const showArrows = showcaseConfig?.showArrows !== false;
  const showStepper = showcaseConfig?.showStepper !== false;
  const showHelperText = showcaseConfig?.showHelperText !== false;
  const resolvedHelperText =
    showcaseConfig?.helperText !== undefined
      ? showcaseConfig.helperText.trim()
      : 'Drag sideways for next 3D item · Click center to open';
  const hasCustomTextColor = Boolean(showcaseConfig?.customTextColor);
  const mutedTextClass = hasCustomTextColor
    ? 'opacity-75'
    : isDarkTheme
      ? 'text-[#B8B5AD]'
      : 'text-[#5A5A56]';

  return (
    <div
      aria-label="Interactive 3D Customizable Showcase"
      style={containerStyle}
      className={`relative w-full flex flex-col items-center justify-center transition-colors ${boxThemeClasses}`}
    >
      {/* Direct Admin Customize Trigger right over the top corner of Hero 3D Model */}
      {isAdmin && onCustomize && (
        <div className="w-full flex justify-end mb-1">
          <button
            type="button"
            onClick={onCustomize}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium bg-white border border-[#D4D4CE] text-[#141413] rounded-md shadow-xs hover:border-[#141413] transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3 text-[var(--accent)]" />
            <span>Customize 3D Box &amp; Texts</span>
          </button>
        </div>
      )}

      {/* Optional Editable Header Texts Above 3D Viewport */}
      {(eyebrowText || headingText || descriptionText) && (
        <div className="w-full text-center max-w-lg mb-2 px-2">
          {eyebrowText && (
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                isDarkTheme && !hasCustomTextColor
                  ? 'text-[#E5C887]'
                  : !hasCustomTextColor
                    ? 'text-[var(--accent)]'
                    : ''
              }`}
            >
              {eyebrowText}
            </p>
          )}
          {headingText && (
            <h2
              className={`font-serif text-xl sm:text-2xl font-medium leading-tight mt-0.5 ${
                !hasCustomTextColor
                  ? isDarkTheme
                    ? 'text-[#F5F4F0]'
                    : 'text-[#141413]'
                  : ''
              }`}
            >
              {headingText}
            </h2>
          )}
          {descriptionText && (
            <p className={`text-xs mt-1 ${mutedTextClass}`}>{descriptionText}</p>
          )}
        </div>
      )}

      {/* Transparent 3D Viewport */}
      <div className="relative w-full flex items-center justify-center">
        {showArrows && totalSlides > 1 && (
          <button
            type="button"
            onClick={() => stepToIndex(safeActiveIdx - 1)}
            aria-label="Previous 3D item"
            className="z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4D4CE] bg-white/90 text-[#141413] shadow-sm transition hover:border-[#141413] hover:bg-[#141413] hover:text-white cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={containerRef}
          className="relative h-[300px] sm:h-[340px] lg:h-[370px] w-full flex-1 min-w-0 select-none bg-transparent"
        >
          {webglError ? (
            <button
              type="button"
              onClick={() => handleSlidePrimaryAction(activeSlide)}
              className="w-full h-full flex items-center justify-center cursor-pointer"
            >
              <img
                src={activeSlide.imageUrl}
                alt={activeSlide.title || '3D item preview'}
                className="max-h-full max-w-full object-contain shadow-lg"
              />
            </button>
          ) : (
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              style={{
                touchAction: 'pan-y',
                cursor: isDragging
                  ? 'grabbing'
                  : hoveredRole !== 'none'
                  ? 'pointer'
                  : 'grab',
              }}
              aria-label={`${activeSlide.title || '3D Showcase'} — drag sideways to move to next 3D item or click to open`}
              className="block h-full w-full bg-transparent outline-none"
            />
          )}
        </div>

        {showArrows && totalSlides > 1 && (
          <button
            type="button"
            onClick={() => stepToIndex(safeActiveIdx + 1)}
            aria-label="Next 3D item"
            className="z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4D4CE] bg-white/90 text-[#141413] shadow-sm transition hover:border-[#141413] hover:bg-[#141413] hover:text-white cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Customizable Captions, Helper Text & Navigation Below */}
      {(showCaptions || (showHelperText && resolvedHelperText) || (showStepper && totalSlides > 1)) && (
        <div className="mt-1 flex flex-col items-center text-center max-w-md px-2">
          {showCaptions && (
            <>
              {((showSubtitle && activeSlide.subtitle) || (showCounter && totalSlides > 1)) && (
                <div
                  className={`inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] uppercase ${
                    !hasCustomTextColor
                      ? isDarkTheme
                        ? 'text-[#E5C887]'
                        : 'text-[var(--accent)]'
                      : ''
                  }`}
                >
                  {showSubtitle && activeSlide.subtitle && (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>{activeSlide.subtitle}</span>
                    </>
                  )}
                  {showCounter && totalSlides > 1 && (
                    <span className={`font-normal tabular-nums ${mutedTextClass}`}>
                      ({safeActiveIdx + 1}/{totalSlides})
                    </span>
                  )}
                </div>
              )}

              {(activeSlide.title || activeSlide.priceText) && (
                <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-0.5">
                  {activeSlide.title && (
                    <button
                      type="button"
                      onClick={() => handleSlidePrimaryAction(activeSlide)}
                      className={`font-serif text-lg sm:text-xl font-medium transition-colors cursor-pointer ${
                        !hasCustomTextColor
                          ? isDarkTheme
                            ? 'text-[#F5F4F0] hover:text-[#E5C887]'
                            : 'text-[#141413] hover:text-[var(--accent)]'
                          : 'hover:opacity-80'
                      }`}
                    >
                      {activeSlide.title}
                    </button>
                  )}
                  {activeSlide.priceText && (
                    <span className={`text-xs font-semibold tabular-nums ${mutedTextClass}`}>
                      {activeSlide.priceText}
                    </span>
                  )}
                </div>
              )}

              {(activeSlide.category || activeSlide.targetUrl || activeSlide.ctaLabel || (activeSlide.product && onInspectProduct)) && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                  {(activeSlide.category || activeSlide.targetUrl || activeSlide.ctaLabel) && (
                    <button
                      type="button"
                      onClick={() => handleSlidePrimaryAction(activeSlide)}
                      className={`inline-flex items-center gap-1.5 font-medium border-b pb-0.5 transition-colors cursor-pointer ${
                        !hasCustomTextColor
                          ? isDarkTheme
                            ? 'text-[#F5F4F0] border-[#F5F4F0] hover:text-[#E5C887] hover:border-[#E5C887]'
                            : 'text-[#141413] border-[#141413] hover:text-[var(--accent)] hover:border-[var(--accent)]'
                          : 'border-current hover:opacity-80'
                      }`}
                    >
                      <span>
                        {activeSlide.ctaLabel
                          ? activeSlide.ctaLabel
                          : activeSlide.category
                            ? `Open ${activeSlide.subcategory ?? activeSlide.category}`
                            : 'Explore Link'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {activeSlide.product && onInspectProduct && (
                    <button
                      type="button"
                      onClick={() => onInspectProduct(activeSlide.product!)}
                      className={`inline-flex items-center gap-1 font-medium transition-colors cursor-pointer ${mutedTextClass} hover:opacity-100`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Product</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {showHelperText && resolvedHelperText && (
            <p className={`mt-1.5 text-[11px] ${mutedTextClass}`}>
              {resolvedHelperText}
            </p>
          )}

          {showStepper && totalSlides > 1 && (
            <div className="mt-2.5 flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
              {slides.map((s, idx) => {
                const isSelected = idx === safeActiveIdx;
                const label =
                  s.subcategory ??
                  s.category ??
                  (s.title ? s.title.slice(0, 22) : `Slide ${idx + 1}`);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => stepToIndex(idx)}
                    title={s.title ? `${s.title}${s.subtitle ? ` (${s.subtitle})` : ''}` : `Slide ${idx + 1}`}
                    className={`shrink-0 border-b-2 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? !hasCustomTextColor
                          ? isDarkTheme
                            ? 'border-[#E5C887] text-[#F5F4F0]'
                            : 'border-[#141413] text-[#141413]'
                          : 'border-current'
                        : `border-transparent ${mutedTextClass} hover:border-[#D4D4CE]`
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
