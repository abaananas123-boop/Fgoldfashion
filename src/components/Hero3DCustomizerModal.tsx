import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Layers,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  SunMedium,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  Hero3DAspectShape,
  Hero3DBoxTheme,
  Hero3DDepthLevel,
  Hero3DFrameStyle,
  Hero3DShowcaseConfig,
  Hero3DSlideItem,
  MediaAsset,
  Product,
} from '../types';
import { formatPKR } from '../utils/currency';
import {
  detectMediaKind,
  uploadMultipleStoreMediaFiles,
} from '../utils/imageUpload';
import { pickBestImageUrl } from '../utils/threeDepartmentModels';
import { GalleryPickerModal } from './GalleryPickerModal';
import { HexColorField } from './HexColorField';
import { ResilientImage } from './ResilientImage';

interface Hero3DCustomizerModalProps {
  isOpen: boolean;
  initialConfig?: Hero3DShowcaseConfig;
  products: Product[];
  categories: string[];
  subcategoriesMap: Record<string, string[]>;
  mediaAssets: MediaAsset[];
  onAddMediaAssets?: (
    items: Array<{
      title: string;
      url: string;
      mediaKind: 'image' | 'video';
      categoryTag: string;
    }>
  ) => Promise<MediaAsset[] | void> | void;
  onClose: () => void;
  onSave: (config: Hero3DShowcaseConfig) => Promise<boolean> | boolean | void;
}

const DEFAULT_CONFIG: Hero3DShowcaseConfig = {
  enabled: true,
  eyebrow: '',
  heading: '',
  description: '',
  helperText: 'Drag sideways for next 3D item · Click center to open',
  mode: 'auto-products',
  frameStyle: 'gold',
  aspectShape: 'portrait',
  depthLevel: 'medium',
  boxTheme: 'transparent',
  autoPlay: false,
  intervalSeconds: 4,
  lightingIntensity: 100,
  shadowDepth: 100,
  showCaptions: true,
  showSubtitle: true,
  showCounter: true,
  showArrows: true,
  showStepper: true,
  showHelperText: true,
  items: [],
};

function createSlideId() {
  return `h3d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function Hero3DCustomizerModal({
  isOpen,
  initialConfig,
  products,
  categories,
  subcategoriesMap,
  mediaAssets,
  onAddMediaAssets,
  onClose,
  onSave,
}: Hero3DCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'slides' | 'box'>('slides');
  const [draft, setDraft] = useState<Hero3DShowcaseConfig>(DEFAULT_CONFIG);

  // Quick slide composer state
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideKind, setSlideKind] = useState<'picture' | 'product'>('picture');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [slideImageUrl, setSlideImageUrl] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slidePriceText, setSlidePriceText] = useState('');
  const [slideCtaLabel, setSlideCtaLabel] = useState('');
  const [slideTargetCategory, setSlideTargetCategory] = useState('');
  const [slideTargetSubcategory, setSlideTargetSubcategory] = useState('');
  const [slideTargetUrl, setSlideTargetUrl] = useState('');

  // Quick product search list (just like Highlight Slider)
  const [productSearch, setProductSearch] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const imageOnlyGalleryAssets = useMemo(
    () => mediaAssets.filter((a) => a.mediaKind === 'image'),
    [mediaAssets],
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q)),
    );
  }, [products, productSearch]);

  useEffect(() => {
    if (!isOpen) return;
    setDraft({
      enabled: initialConfig?.enabled ?? true,
      eyebrow: initialConfig?.eyebrow ?? '',
      heading: initialConfig?.heading ?? '',
      description: initialConfig?.description ?? '',
      helperText:
        initialConfig?.helperText !== undefined
          ? initialConfig.helperText
          : 'Drag sideways for next 3D item · Click center to open',
      mode: initialConfig?.mode === 'custom' ? 'custom' : 'auto-products',
      frameStyle: initialConfig?.frameStyle ?? 'gold',
      aspectShape: initialConfig?.aspectShape ?? 'portrait',
      depthLevel: initialConfig?.depthLevel ?? 'medium',
      boxTheme: initialConfig?.boxTheme ?? 'transparent',
      customBgColor: initialConfig?.customBgColor,
      customTextColor: initialConfig?.customTextColor,
      customBorderColor: initialConfig?.customBorderColor,
      autoPlay: Boolean(initialConfig?.autoPlay),
      intervalSeconds:
        typeof initialConfig?.intervalSeconds === 'number'
          ? initialConfig.intervalSeconds
          : 4,
      lightingIntensity:
        typeof initialConfig?.lightingIntensity === 'number'
          ? initialConfig.lightingIntensity
          : 100,
      shadowDepth:
        typeof initialConfig?.shadowDepth === 'number'
          ? initialConfig.shadowDepth
          : 100,
      showCaptions: initialConfig?.showCaptions ?? true,
      showSubtitle: initialConfig?.showSubtitle ?? true,
      showCounter: initialConfig?.showCounter ?? true,
      showArrows: initialConfig?.showArrows ?? true,
      showStepper: initialConfig?.showStepper ?? true,
      showHelperText: initialConfig?.showHelperText ?? true,
      items: Array.isArray(initialConfig?.items)
        ? initialConfig.items.map((item) => ({ ...item }))
        : [],
    });
    setActiveTab('slides');
    setSaveErr(null);
    setIsSaving(false);
    resetSlideEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGalleryOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isGalleryOpen, onClose]);

  const resetSlideEditor = () => {
    setEditingSlideId(null);
    setSlideKind('picture');
    setSelectedProductId('');
    setSlideImageUrl('');
    setSlideTitle('');
    setSlideSubtitle('');
    setSlidePriceText('');
    setSlideCtaLabel('');
    setSlideTargetCategory('');
    setSlideTargetSubcategory('');
    setSlideTargetUrl('');
    setUploadErr(null);
  };

  if (!isOpen) return null;

  const addedProductIds = new Set(
    draft.items
      .filter((item) => item.kind === 'product' && item.productId)
      .map((item) => item.productId!),
  );

  const handleToggleProductSlide = (prod: Product) => {
    const existing = draft.items.find(
      (item) => item.kind === 'product' && item.productId === prod.id,
    );
    if (existing) {
      setDraft((prev) => ({
        ...prev,
        mode: 'custom',
        items: prev.items.filter((item) => item.id !== existing.id),
      }));
      return;
    }
    if (draft.items.length >= 16) return;
    const img = pickBestImageUrl(prod);
    if (!img) return;
    const newItem: Hero3DSlideItem = {
      id: createSlideId(),
      kind: 'product',
      productId: prod.id,
      imageUrl: img,
      title: prod.name,
      subtitle:
        prod.subcategory && prod.subcategory !== 'All'
          ? `${prod.category} · ${prod.subcategory}`
          : prod.category,
      priceText: formatPKR(prod.price),
      ctaLabel: '',
      targetCategory: prod.category,
      targetSubcategory:
        prod.subcategory && prod.subcategory !== 'All'
          ? prod.subcategory
          : undefined,
    };
    setDraft((prev) => ({
      ...prev,
      mode: 'custom',
      items: [...prev.items, newItem].slice(0, 16),
    }));
  };

  const handleImportCatalogProducts = () => {
    const existingKeys = new Set(
      draft.items.map((i) => i.productId || i.id),
    );
    const additions: Hero3DSlideItem[] = [];
    for (const prod of products) {
      if (draft.items.length + additions.length >= 16) break;
      if (existingKeys.has(prod.id)) continue;
      const img = pickBestImageUrl(prod);
      if (!img) continue;
      additions.push({
        id: createSlideId(),
        kind: 'product',
        productId: prod.id,
        imageUrl: img,
        title: prod.name,
        subtitle:
          prod.subcategory && prod.subcategory !== 'All'
            ? `${prod.category} · ${prod.subcategory}`
            : prod.category,
        priceText: formatPKR(prod.price),
        ctaLabel: '',
        targetCategory: prod.category,
        targetSubcategory:
          prod.subcategory && prod.subcategory !== 'All'
            ? prod.subcategory
            : undefined,
      });
    }
    setDraft((prev) => ({
      ...prev,
      mode: 'custom',
      items: [...prev.items, ...additions].slice(0, 16),
    }));
  };

  const handlePickProductPreset = (pid: string) => {
    setSelectedProductId(pid);
    const prod = products.find((p) => p.id === pid);
    if (!prod) return;
    setSlideKind('product');
    setSlideImageUrl(pickBestImageUrl(prod));
    setSlideTitle(prod.name);
    setSlideSubtitle(
      prod.subcategory && prod.subcategory !== 'All'
        ? `${prod.category} · ${prod.subcategory}`
        : prod.category,
    );
    setSlidePriceText(formatPKR(prod.price));
    setSlideCtaLabel('');
    setSlideTargetCategory(prod.category);
    setSlideTargetSubcategory(
      prod.subcategory && prod.subcategory !== 'All' ? prod.subcategory : '',
    );
    setSlideTargetUrl('');
  };

  const handleBatchImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const imageFiles = files.filter((f) => !f.type.startsWith('video/'));
    if (imageFiles.length === 0) {
      setUploadErr('Please select image files (JPG, PNG, WebP) for the 3D surface.');
      return;
    }

    const remaining = Math.max(0, 16 - draft.items.length);
    if (remaining === 0) {
      setUploadErr('Maximum of 16 slides reached. Delete one to add more.');
      return;
    }

    setUploadErr(null);
    setIsUploading(true);
    setUploadPct(5);

    try {
      const uploaded = await uploadMultipleStoreMediaFiles(
        imageFiles.slice(0, remaining),
        { onProgress: (pct) => setUploadPct(pct) },
      );

      const additions: Hero3DSlideItem[] = [];
      for (const item of uploaded) {
        if (detectMediaKind(item.url) !== 'image') continue;
        const cleanName = item.fileName
          .replace(/\.[^.]+$/, '')
          .replace(/[_-]+/g, ' ')
          .trim()
          .slice(0, 120);
        additions.push({
          id: createSlideId(),
          kind: 'picture',
          imageUrl: item.url,
          title: cleanName,
          subtitle: '',
          priceText: '',
          ctaLabel: '',
        });
      }

      if (additions.length === 1 && !editingSlideId && !slideImageUrl.trim()) {
        // Also populate preview if user uploaded a single image & wants to customize before/after
        setDraft((prev) => ({
          ...prev,
          mode: 'custom',
          items: [...prev.items, ...additions].slice(0, 16),
        }));
      } else if (additions.length > 0) {
        setDraft((prev) => ({
          ...prev,
          mode: 'custom',
          items: [...prev.items, ...additions].slice(0, 16),
        }));
      }

      if (onAddMediaAssets && additions.length > 0) {
        await onAddMediaAssets(
          additions.map((a) => ({
            title: a.title || '3D Showcase Photo',
            url: a.imageUrl,
            mediaKind: 'image',
            categoryTag: 'General',
          })),
        );
      }
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setIsUploading(false);
      setUploadPct(0);
    }
  };

  const handleAddOrUpdateSlide = () => {
    const cleanImg = slideImageUrl.trim();
    if (!cleanImg) {
      setUploadErr('Please upload, pick from gallery, or paste an image URL.');
      return;
    }

    const nextItem: Hero3DSlideItem = {
      id: editingSlideId || createSlideId(),
      kind: slideKind,
      productId: slideKind === 'product' && selectedProductId ? selectedProductId : undefined,
      imageUrl: cleanImg,
      title: slideTitle.trim(),
      subtitle: slideSubtitle.trim(),
      priceText: slidePriceText.trim(),
      ctaLabel: slideCtaLabel.trim(),
      targetCategory: slideTargetCategory.trim() || undefined,
      targetSubcategory:
        slideTargetCategory.trim() && slideTargetSubcategory.trim()
          ? slideTargetSubcategory.trim()
          : undefined,
      targetUrl: slideTargetUrl.trim() || undefined,
    };

    setDraft((prev) => {
      const exists = prev.items.some((i) => i.id === nextItem.id);
      const nextItems = exists
        ? prev.items.map((i) => (i.id === nextItem.id ? nextItem : i))
        : [...prev.items, nextItem].slice(0, 16);
      return {
        ...prev,
        mode: 'custom',
        items: nextItems,
      };
    });

    resetSlideEditor();
  };

  const handleEditExistingSlide = (item: Hero3DSlideItem) => {
    setEditingSlideId(item.id);
    setSlideKind(item.kind);
    setSelectedProductId(item.productId || '');
    setSlideImageUrl(item.imageUrl);
    setSlideTitle(item.title ?? '');
    setSlideSubtitle(item.subtitle ?? '');
    setSlidePriceText(item.priceText ?? '');
    setSlideCtaLabel(item.ctaLabel ?? '');
    setSlideTargetCategory(item.targetCategory || '');
    setSlideTargetSubcategory(item.targetSubcategory || '');
    setSlideTargetUrl(item.targetUrl || '');
    setUploadErr(null);
  };

  const updateSlideInline = (id: string, patch: Partial<Hero3DSlideItem>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  };

  const moveSlide = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.items.length) return;
    setDraft((prev) => {
      const next = [...prev.items];
      const [removed] = next.splice(index, 1);
      next.splice(target, 0, removed);
      return { ...prev, items: next };
    });
  };

  const removeSlide = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
    if (editingSlideId === id) {
      resetSlideEditor();
    }
  };

  const availableSubcategoriesForSelectedDept = slideTargetCategory
    ? subcategoriesMap[slideTargetCategory] ?? []
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-3d-customizer-title"
    >
      <div className="w-full max-w-4xl bg-white border border-[#E4E4E0] rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with Studio Tabs */}
        <div className="px-6 py-4 bg-[#FAFAFA] border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Interactive Hero 3D Studio
            </p>
            <h2
              id="hero-3d-customizer-title"
              className="font-serif text-xl sm:text-2xl font-medium text-[#141413]"
            >
              Customize 3D Pictures, Texts &amp; Appearance
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('slides')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'slides'
                    ? 'bg-white text-[#141413] shadow-sm'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Pictures &amp; Products ({draft.items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('box')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'box'
                    ? 'bg-white text-[#141413] shadow-sm'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Texts, Box &amp; 3D Look
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close 3D Customizer"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#EFECE6] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'box' ? (
            <div className="space-y-6">
              {/* Visibility & Header / Hint Texts */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#141413]">
                      Show Hero 3D Slider on Home Page
                    </p>
                    <p className="text-[11px] text-[#5A5A56]">
                      Turn off anytime to hide the 3D showcase from storefront visitors.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#D4D4CE] rounded-md text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.enabled !== false}
                      onChange={(e) =>
                        setDraft({ ...draft, enabled: e.target.checked })
                      }
                    />
                    <span>{draft.enabled !== false ? 'Visible' : 'Hidden'}</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-[#E4E4E0] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413]">
                      <Type className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Section &amp; Helper Texts (Add or Clear Anything)</span>
                    </span>
                    {(draft.eyebrow || draft.heading || draft.description || draft.helperText) && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            eyebrow: '',
                            heading: '',
                            description: '',
                            helperText: '',
                          })
                        }
                        className="text-[11px] text-red-700 hover:underline cursor-pointer"
                      >
                        Remove All Header/Hint Texts
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        Top Eyebrow / Kicker (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={draft.eyebrow ?? ''}
                        onChange={(e) =>
                          setDraft({ ...draft, eyebrow: e.target.value })
                        }
                        placeholder="Leave blank for none, or add label..."
                        className="w-full h-9 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        Top Heading Above 3D (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={140}
                        value={draft.heading ?? ''}
                        onChange={(e) =>
                          setDraft({ ...draft, heading: e.target.value })
                        }
                        placeholder="Leave blank for none, or add heading..."
                        className="w-full h-9 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Top Description / Subtitle (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={draft.description ?? ''}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                      placeholder="Leave blank to keep clean, or add a short note..."
                      className="w-full h-9 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Bottom Drag Hint Text (Clear to Remove)
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={draft.helperText ?? ''}
                      onChange={(e) =>
                        setDraft({ ...draft, helperText: e.target.value })
                      }
                      placeholder="Leave blank to remove hint line below 3D..."
                      className="w-full h-9 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Show / Hide Text & UI Elements */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                <p className="text-xs font-semibold text-[#141413]">
                  Show or Remove Elements Around the 3D Slider
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showCaptions !== false}
                      onChange={(e) =>
                        setDraft({ ...draft, showCaptions: e.target.checked })
                      }
                    />
                    <span>Show Slide Title, Price &amp; Button</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showSubtitle !== false}
                      onChange={(e) =>
                        setDraft({ ...draft, showSubtitle: e.target.checked })
                      }
                    />
                    <span>Show Eyebrow Tag Above Title</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showCounter !== false}
                      onChange={(e) =>
                        setDraft({ ...draft, showCounter: e.target.checked })
                      }
                    />
                    <span>Show Slide Number (1/4)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showArrows !== false}
                      onChange={(e) =>
                        setDraft({ ...draft, showArrows: e.target.checked })
                      }
                    />
                    <span>Show Left/Right Arrows</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showHelperText !== false}
                      onChange={(e) =>
                        setDraft({ ...draft, showHelperText: e.target.checked })
                      }
                    />
                    <span>Show Bottom Hint Line</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showStepper !== false}
                      onChange={(e) =>
                        setDraft({ ...draft, showStepper: e.target.checked })
                      }
                    />
                    <span>Show Bottom Quick Tabs</span>
                  </label>
                </div>
              </div>

              {/* 3D Frame, Shape, Depth & Stage Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-[#141413]">
                    3D Frame, Shape &amp; Depth
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#5A5A56] mb-1">
                        Frame Finish
                      </label>
                      <select
                        value={draft.frameStyle}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            frameStyle: e.target.value as Hero3DFrameStyle,
                          }))
                        }
                        className="w-full h-9 px-2 text-xs bg-white border border-[#D4D4CE] rounded-md"
                      >
                        <option value="gold">Champagne Gold</option>
                        <option value="frameless">Frameless</option>
                        <option value="obsidian">Matte Obsidian</option>
                        <option value="silver">Brushed Silver</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#5A5A56] mb-1">
                        Shape Ratio
                      </label>
                      <select
                        value={draft.aspectShape}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            aspectShape: e.target.value as Hero3DAspectShape,
                          }))
                        }
                        className="w-full h-9 px-2 text-xs bg-white border border-[#D4D4CE] rounded-md"
                      >
                        <option value="portrait">Portrait (Tall)</option>
                        <option value="square">Square (1:1)</option>
                        <option value="landscape">Wide (Landscape)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#5A5A56] mb-1">
                        3D Depth
                      </label>
                      <select
                        value={draft.depthLevel}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            depthLevel: e.target.value as Hero3DDepthLevel,
                          }))
                        }
                        className="w-full h-9 px-2 text-xs bg-white border border-[#D4D4CE] rounded-md"
                      >
                        <option value="subtle">Subtle Curve</option>
                        <option value="medium">Balanced 3D</option>
                        <option value="bold">Deep 3D Pop</option>
                      </select>
                    </div>
                  </div>

                  {/* Realism Lighting & Shadow Controls */}
                  <div className="pt-2 border-t border-[#E4E4E0] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#141413]">
                        <SunMedium className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Studio Lighting &amp; Shadows</span>
                      </span>
                      {((draft.lightingIntensity ?? 100) !== 100 ||
                        (draft.shadowDepth ?? 100) !== 100) && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              lightingIntensity: 100,
                              shadowDepth: 100,
                            }))
                          }
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <label
                            htmlFor="hero3d-lighting-slider"
                            className="text-[#5A5A56]"
                          >
                            Studio Light Intensity
                          </label>
                          <span className="font-semibold text-[#141413] tabular-nums">
                            {draft.lightingIntensity ?? 100}%
                          </span>
                        </div>
                        <input
                          id="hero3d-lighting-slider"
                          type="range"
                          min={40}
                          max={160}
                          step={5}
                          value={Math.min(160, draft.lightingIntensity ?? 100)}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              lightingIntensity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#141413] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <label
                            htmlFor="hero3d-shadow-slider"
                            className="text-[#5A5A56]"
                          >
                            Shadow Depth
                          </label>
                          <span className="font-semibold text-[#141413] tabular-nums">
                            {draft.shadowDepth ?? 100}%
                          </span>
                        </div>
                        <input
                          id="hero3d-shadow-slider"
                          type="range"
                          min={0}
                          max={180}
                          step={5}
                          value={draft.shadowDepth ?? 100}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              shadowDepth: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-[#141413] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box Theme & Custom #Hex Colors */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#141413]">
                      3D Stage Box &amp; Colors
                    </p>
                    {(draft.customBgColor ||
                      draft.customTextColor ||
                      draft.customBorderColor) && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            customBgColor: undefined,
                            customTextColor: undefined,
                            customBorderColor: undefined,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Colors</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'transparent', label: 'Floating (Clear)' },
                        { id: 'ivory', label: 'Clean Ivory' },
                        { id: 'warm', label: 'Warm Linen' },
                        { id: 'gold', label: 'Gold Trim' },
                        { id: 'obsidian', label: 'Dark Obsidian' },
                      ] as Array<{ id: Hero3DBoxTheme; label: string }>
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraft({ ...draft, boxTheme: opt.id })}
                        className={`py-2 px-2.5 text-xs font-medium rounded-md border cursor-pointer ${
                          (draft.boxTheme ?? 'transparent') === opt.id
                            ? 'bg-[#141413] text-white border-[#141413]'
                            : 'bg-white text-[#141413] border-[#D4D4CE]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <HexColorField
                      label="Box Background"
                      value={draft.customBgColor || '#FFFFFF'}
                      fallbackColor="#FFFFFF"
                      compact
                      onChange={(hex) =>
                        setDraft({ ...draft, customBgColor: hex })
                      }
                    />
                    <HexColorField
                      label="Text Color"
                      value={draft.customTextColor || '#141413'}
                      fallbackColor="#141413"
                      compact
                      onChange={(hex) =>
                        setDraft({ ...draft, customTextColor: hex })
                      }
                    />
                    <HexColorField
                      label="Border Color"
                      value={draft.customBorderColor || '#E4E4E0'}
                      fallbackColor="#E4E4E0"
                      compact
                      onChange={(hex) =>
                        setDraft({ ...draft, customBorderColor: hex })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Playback Settings */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.autoPlay}
                    onChange={(e) =>
                      setDraft({ ...draft, autoPlay: e.target.checked })
                    }
                  />
                  <span>Auto-Slide 3D Showcase</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-[#5A5A56]">
                    Slide Speed:
                  </label>
                  <select
                    value={draft.intervalSeconds ?? 4}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        intervalSeconds: Number(e.target.value),
                      })
                    }
                    className="h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md"
                  >
                    <option value={2}>Fast (2s)</option>
                    <option value={3}>Quick (3s)</option>
                    <option value={4}>Balanced (4s)</option>
                    <option value={6}>Calm (6s)</option>
                    <option value={8}>Slow (8s)</option>
                    <option value={10}>Very Slow (10s)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Source Mode & Quick Multi-Upload Bar */}
              <div className="p-4 border border-[#E4E4E0] rounded-lg bg-[#FAFAFA] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                    1. 3D Carousel Source
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {isUploading
                          ? `Uploading ${uploadPct}%`
                          : 'Quick Upload Pictures'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploading}
                        onChange={handleBatchImageUpload}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsGalleryOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#D4D4CE] text-[#141413] rounded-md hover:border-[#141413] cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Choose from Gallery</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, mode: 'custom' }))
                    }
                    className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                      draft.mode === 'custom'
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] bg-white text-[#141413] hover:border-[#141413]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Custom Pictures, Products &amp; Texts</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        draft.mode === 'custom' ? 'text-white/80' : 'text-[#5A5A56]'
                      }`}
                    >
                      Full control over each slide, title, price, tag &amp; button
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, mode: 'auto-products' }))
                    }
                    className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                      draft.mode === 'auto-products'
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] bg-white text-[#141413] hover:border-[#141413]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Auto-Sync All Catalog Products</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        draft.mode === 'auto-products'
                          ? 'text-white/80'
                          : 'text-[#5A5A56]'
                      }`}
                    >
                      Automatically shows all store products in 3D
                    </p>
                  </button>
                </div>
              </div>

              {/* Quick Catalog Product Picker */}
              {products.length > 0 && (
                <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-[var(--accent)]" />
                      <p className="text-xs font-semibold text-[#141413]">
                        Quick Add or Remove Store Products ({products.length})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#8A8A84] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products..."
                          className="h-8 pl-8 pr-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleImportCatalogProducts}
                        className="h-8 px-3 text-xs font-medium bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer whitespace-nowrap"
                      >
                        + Add All Products
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                    {filteredProducts.map((prod) => {
                      const isAdded = addedProductIds.has(prod.id);
                      const thumb = pickBestImageUrl(prod);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleToggleProductSlide(prod)}
                          className={`p-2 rounded-md border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                            isAdded
                              ? 'border-[var(--accent)] bg-[#F7F3EF]'
                              : 'border-[#E4E4E0] bg-white hover:border-[#141413]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded overflow-hidden bg-[#F2F2F0] shrink-0">
                            {thumb && (
                              <ResilientImage
                                src={thumb}
                                alt={prod.name}
                                mode="thumb"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[#141413] truncate">
                              {prod.name}
                            </p>
                            <p className="text-[11px] text-[#5A5A56] truncate tabular-nums">
                              {formatPKR(prod.price)}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              isAdded
                                ? 'bg-[var(--accent)] text-white'
                                : 'bg-[#EFECE6] text-[#141413]'
                            }`}
                          >
                            {isAdded ? 'Added' : 'Add'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add / Edit Single Custom Slide + Texts */}
              <div className="p-5 border border-[#E4E4E0] rounded-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-sm font-semibold text-[#141413]">
                      {editingSlideId
                        ? 'Edit 3D Slide & Texts'
                        : 'Add Custom Picture / Product Slide'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSlideKind('picture');
                        setSelectedProductId('');
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded border cursor-pointer ${
                        slideKind === 'picture'
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#D4D4CE] bg-white text-[#141413]'
                      }`}
                    >
                      Custom Picture
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideKind('product')}
                      className={`px-3 py-1 text-xs font-medium rounded border cursor-pointer ${
                        slideKind === 'product'
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#D4D4CE] bg-white text-[#141413]'
                      }`}
                    >
                      Link Store Product
                    </button>
                  </div>
                </div>

                {slideKind === 'product' && (
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Pick Store Product (auto-fills photo, title, price &amp; department)
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handlePickProductPreset(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md"
                    >
                      <option value="">-- Select a product from catalog --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.category}
                          {p.subcategory ? ` · ${p.subcategory}` : ''} (PKR{' '}
                          {p.price.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Image Picker & Preview */}
                  <div className="md:col-span-4 space-y-2.5">
                    <div className="aspect-[4/5] w-full max-h-52 rounded-md border border-[#E4E4E0] bg-[#FAFAFA] overflow-hidden flex items-center justify-center">
                      {slideImageUrl ? (
                        <ResilientImage
                          src={slideImageUrl}
                          alt={slideTitle || '3D Preview'}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center px-4 text-[#8A8A84]">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1.5 opacity-60" />
                          <p className="text-xs">
                            Paste an image URL, pick from gallery, or upload above
                          </p>
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={slideImageUrl}
                      onChange={(e) => setSlideImageUrl(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md"
                    />
                  </div>

                  {/* Fields & Click Destination */}
                  <div className="md:col-span-8 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#141413] mb-1">
                          Display Title (leave blank for none)
                        </label>
                        <input
                          type="text"
                          maxLength={140}
                          value={slideTitle}
                          onChange={(e) => setSlideTitle(e.target.value)}
                          placeholder="Leave empty to hide title"
                          className="w-full h-9 px-2.5 text-sm bg-white border border-[#D4D4CE] rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#141413] mb-1">
                          Eyebrow / Tag (leave blank for none)
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={slideSubtitle}
                          onChange={(e) => setSlideSubtitle(e.target.value)}
                          placeholder="e.g., Bridal Dresses (optional)"
                          className="w-full h-9 px-2.5 text-sm bg-white border border-[#D4D4CE] rounded-md"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#141413] mb-1">
                          Price or Badge Text (Optional)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={slidePriceText}
                          onChange={(e) => setSlidePriceText(e.target.value)}
                          placeholder="e.g., PKR 24,500 or Limited Edition"
                          className="w-full h-9 px-2.5 text-sm bg-white border border-[#D4D4CE] rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#141413] mb-1">
                          Button Text (Optional)
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={slideCtaLabel}
                          onChange={(e) => setSlideCtaLabel(e.target.value)}
                          placeholder="e.g., Shop Now (or leave blank)"
                          className="w-full h-9 px-2.5 text-sm bg-white border border-[#D4D4CE] rounded-md"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#141413] mb-1">
                          Click Opens Department (Optional)
                        </label>
                        <select
                          value={slideTargetCategory}
                          onChange={(e) => {
                            setSlideTargetCategory(e.target.value);
                            setSlideTargetSubcategory('');
                          }}
                          className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md"
                        >
                          <option value="">None / Custom Link Only</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {slideTargetCategory && (
                        <div>
                          <label className="block text-xs font-medium text-[#141413] mb-1">
                            Section Inside {slideTargetCategory}
                          </label>
                          <select
                            value={slideTargetSubcategory}
                            onChange={(e) =>
                              setSlideTargetSubcategory(e.target.value)
                            }
                            className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md"
                          >
                            <option value="">Whole {slideTargetCategory}</option>
                            {availableSubcategoriesForSelectedDept.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {!slideTargetCategory && (
                      <div>
                        <label className="block text-xs font-medium text-[#141413] mb-1">
                          Custom Click Link or Section Anchor (Optional)
                        </label>
                        <input
                          type="text"
                          maxLength={300}
                          value={slideTargetUrl}
                          onChange={(e) => setSlideTargetUrl(e.target.value)}
                          placeholder="e.g., #catalog or https://..."
                          className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md"
                        />
                      </div>
                    )}

                    {uploadErr && (
                      <p className="text-xs text-[#9E2A2B] font-medium">
                        {uploadErr}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddOrUpdateSlide}
                        disabled={!slideImageUrl.trim() || isUploading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--accent)] text-white rounded-md hover:opacity-95 disabled:opacity-45 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {editingSlideId
                            ? 'Update 3D Slide'
                            : 'Add to 3D Carousel'}
                        </span>
                      </button>

                      {editingSlideId && (
                        <button
                          type="button"
                          onClick={resetSlideEditor}
                          className="px-3 py-2 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Custom 3D Slides List with Inline Text Editing */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[#141413]">
                      Your Custom 3D Slides ({draft.items.length}/16)
                    </h4>
                    <p className="text-xs text-[#5A5A56]">
                      {draft.mode === 'custom'
                        ? 'Edit or clear any slide text directly below, reorder slides, or delete.'
                        : 'Currently set to "Auto-Sync All Catalog Products". Switch to "Custom" above to show this list.'}
                    </p>
                  </div>

                  {draft.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, items: [] }));
                        resetSlideEditor();
                      }}
                      className="text-xs font-medium text-red-700 hover:underline cursor-pointer"
                    >
                      Clear All Slides
                    </button>
                  )}
                </div>

                {draft.items.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#D4D4CE] rounded-md text-xs text-[#5A5A56]">
                    No custom 3D slides added yet. Upload pictures above, choose from gallery, or add store products.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {draft.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 border border-[#E4E4E0] rounded-lg bg-white flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                      >
                        <div className="w-16 h-20 rounded border border-[#E4E4E0] overflow-hidden shrink-0 bg-[#FAFAFA]">
                          <ResilientImage
                            src={item.imageUrl}
                            alt={item.title || `3D Slide ${idx + 1}`}
                            mode="thumb"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <input
                            type="text"
                            maxLength={140}
                            value={item.title ?? ''}
                            onChange={(e) =>
                              updateSlideInline(item.id, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Title (blank to hide)"
                            aria-label={`Slide ${idx + 1} title`}
                            className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                          />
                          <input
                            type="text"
                            maxLength={100}
                            value={item.subtitle ?? ''}
                            onChange={(e) =>
                              updateSlideInline(item.id, {
                                subtitle: e.target.value,
                              })
                            }
                            placeholder="Tag / subtitle (blank to hide)"
                            aria-label={`Slide ${idx + 1} tag`}
                            className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                          />
                          <input
                            type="text"
                            maxLength={60}
                            value={item.priceText ?? ''}
                            onChange={(e) =>
                              updateSlideInline(item.id, {
                                priceText: e.target.value,
                              })
                            }
                            placeholder="Price / badge (optional)"
                            aria-label={`Slide ${idx + 1} price`}
                            className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                          />
                          <input
                            type="text"
                            maxLength={60}
                            value={item.ctaLabel ?? ''}
                            onChange={(e) =>
                              updateSlideInline(item.id, {
                                ctaLabel: e.target.value,
                              })
                            }
                            placeholder="Button text (optional)"
                            aria-label={`Slide ${idx + 1} button text`}
                            className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => moveSlide(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Move up"
                            className="p-1.5 text-[#5A5A56] hover:text-[#141413] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlide(idx, 1)}
                            disabled={idx === draft.items.length - 1}
                            aria-label="Move down"
                            className="p-1.5 text-[#5A5A56] hover:text-[#141413] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditExistingSlide(item)}
                            aria-label={`Edit link & image for slide ${idx + 1}`}
                            title="Edit image or link"
                            className="p-1.5 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSlide(item.id)}
                            aria-label={`Delete slide ${idx + 1}`}
                            className="p-1.5 text-[#5A5A56] hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            {saveErr ? (
              <p role="alert" className="text-xs font-medium text-red-700">
                {saveErr}
              </p>
            ) : (
              <p className="text-xs text-[#5A5A56]">
                Changes sync to cloud across all visitor devices immediately on save.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] bg-white rounded-md hover:text-[#141413] disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || isUploading}
              onClick={async () => {
                setSaveErr(null);
                setIsSaving(true);
                try {
                  const res = await onSave(draft);
                  if (res === false) {
                    setSaveErr(
                      'Could not save 3D showcase to cloud. Please check sign-in and try again.',
                    );
                    return;
                  }
                  onClose();
                } catch {
                  setSaveErr(
                    'Could not save 3D showcase to cloud. Please try again.',
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-5 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving to Cloud...' : 'Save 3D Showcase'}
            </button>
          </div>
        </div>
      </div>

      {/* Reusable Manager Media Gallery Picker */}
      <GalleryPickerModal
        isOpen={isGalleryOpen}
        mode="multiple"
        title="Pick Pictures for 3D Slider"
        mediaAssets={imageOnlyGalleryAssets}
        categories={categories}
        onClose={() => setIsGalleryOpen(false)}
        onAddMediaAssets={onAddMediaAssets}
        onSelect={(assets) => {
          if (assets.length === 0) return;
          const remaining = Math.max(0, 16 - draft.items.length);
          const additions: Hero3DSlideItem[] = assets
            .slice(0, remaining)
            .map((asset) => ({
              id: createSlideId(),
              kind: 'picture',
              imageUrl: asset.url,
              title: asset.title,
              subtitle:
                asset.categoryTag && asset.categoryTag !== 'General'
                  ? asset.categoryTag
                  : '',
              priceText: '',
              ctaLabel: '',
            }));
          setDraft((prev) => ({
            ...prev,
            mode: 'custom',
            items: [...prev.items, ...additions].slice(0, 16),
          }));
        }}
      />
    </div>
  );
}
