import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  Link2,
  Package,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  HeroHighlightSliderConfig,
  HighlightSliderAspect,
  HighlightSliderItem,
  HighlightSliderLayout,
  HighlightSliderTheme,
  MediaAsset,
  Product,
} from '../types';
import { formatPKR } from '../utils/currency';
import {
  MEDIA_FILE_ACCEPT,
  detectMediaKind,
  uploadMultipleStoreMediaFiles,
} from '../utils/imageUpload';
import { normalizeSiteLinkUrl } from '../utils/social';
import { pickBestImageUrl } from '../utils/threeDepartmentModels';
import { DEFAULT_HIGHLIGHT_SLIDER_CONFIG } from './HighlightShowcaseSlider';
import { GalleryPickerModal } from './GalleryPickerModal';
import { HexColorField } from './HexColorField';
import { ResilientImage } from './ResilientImage';

interface HighlightSliderCustomizerModalProps {
  isOpen: boolean;
  initialConfig?: HeroHighlightSliderConfig;
  products: Product[];
  categories: string[];
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
  onSave: (config: HeroHighlightSliderConfig) => Promise<boolean> | void;
}

function createSlideId() {
  return `hl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function HighlightSliderCustomizerModal({
  isOpen,
  initialConfig,
  products,
  categories,
  mediaAssets,
  onAddMediaAssets,
  onClose,
  onSave,
}: HighlightSliderCustomizerModalProps) {
  const [draft, setDraft] = useState<HeroHighlightSliderConfig>(
    DEFAULT_HIGHLIGHT_SLIDER_CONFIG
  );
  const [activeTab, setActiveTab] = useState<'slides' | 'box'>('slides');
  const [productSearch, setProductSearch] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const base = initialConfig ?? DEFAULT_HIGHLIGHT_SLIDER_CONFIG;
    setDraft({
      ...DEFAULT_HIGHLIGHT_SLIDER_CONFIG,
      ...base,
      items: Array.isArray(base.items) ? base.items.map((item) => ({ ...item })) : [],
    });
    setActiveTab('slides');
    setProductSearch('');
    setUrlInput('');
    setUrlTitle('');
    setUploadErr(null);
    setIsSaving(false);
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGalleryOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isGalleryOpen, onClose]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  if (!isOpen) return null;

  const addedProductIds = new Set(
    draft.items
      .filter((item) => item.kind === 'product' && item.productId)
      .map((item) => item.productId!)
  );

  const handleToggleProductSlide = (prod: Product) => {
    if (addedProductIds.has(prod.id)) {
      setDraft((prev) => ({
        ...prev,
        items: prev.items.filter(
          (item) => !(item.kind === 'product' && item.productId === prod.id)
        ),
      }));
      return;
    }
    if (draft.items.length >= 24) return;
    const bestImg = pickBestImageUrl(prod) || prod.imageUrl;
    const newItem: HighlightSliderItem = {
      id: createSlideId(),
      kind: 'product',
      productId: prod.id,
      imageUrl: bestImg,
      mediaKind: detectMediaKind(bestImg) === 'video' ? 'video' : 'image',
      title: prod.name,
      subtitle:
        prod.subcategory && prod.subcategory !== 'All'
          ? `${prod.category} · ${prod.subcategory}`
          : prod.category,
      priceText: formatPKR(prod.price),
      ctaLabel: 'View Product',
    };
    setDraft((prev) => ({
      ...prev,
      enabled: true,
      items: [...prev.items, newItem].slice(0, 24),
    }));
  };

  const handleAddAllProducts = () => {
    const remainingSlots = Math.max(0, 24 - draft.items.length);
    if (remainingSlots === 0) return;
    const additions: HighlightSliderItem[] = [];
    for (const prod of products) {
      if (additions.length >= remainingSlots) break;
      if (addedProductIds.has(prod.id)) continue;
      const bestImg = pickBestImageUrl(prod) || prod.imageUrl;
      if (!bestImg) continue;
      additions.push({
        id: createSlideId(),
        kind: 'product',
        productId: prod.id,
        imageUrl: bestImg,
        mediaKind: detectMediaKind(bestImg) === 'video' ? 'video' : 'image',
        title: prod.name,
        subtitle:
          prod.subcategory && prod.subcategory !== 'All'
            ? `${prod.category} · ${prod.subcategory}`
            : prod.category,
        priceText: formatPKR(prod.price),
        ctaLabel: 'View Product',
      });
    }
    if (additions.length > 0) {
      setDraft((prev) => ({
        ...prev,
        enabled: true,
        items: [...prev.items, ...additions].slice(0, 24),
      }));
    }
  };

  const handleUploadFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    const remaining = Math.max(1, 24 - draft.items.length);
    setUploadErr(null);
    setIsUploading(true);
    setUploadPct(3);

    try {
      const uploaded = await uploadMultipleStoreMediaFiles(files, {
        maxFiles: remaining,
        onProgress: (pct) => setUploadPct(pct),
      });
      if (uploaded.length > 0) {
        const newSlides: HighlightSliderItem[] = uploaded.map((item) => {
          const cleanName = item.fileName
            .replace(/\.[^.]+$/, '')
            .replace(/[_-]+/g, ' ')
            .trim()
            .slice(0, 120);
          return {
            id: createSlideId(),
            kind: 'picture',
            imageUrl: item.url,
            mediaKind: item.mediaKind,
            title: cleanName,
            subtitle: '',
            ctaLabel: '',
            ctaUrl: '',
          };
        });
        setDraft((prev) => ({
          ...prev,
          enabled: true,
          items: [...prev.items, ...newSlides].slice(0, 24),
        }));
        if (onAddMediaAssets) {
          void onAddMediaAssets(
            uploaded.map((u) => ({
              title:
                u.fileName
                  .replace(/\.[^.]+$/, '')
                  .replace(/[_-]+/g, ' ')
                  .trim()
                  .slice(0, 120) || 'Highlight Media',
              url: u.url,
              mediaKind: u.mediaKind,
              categoryTag: 'General',
            }))
          );
        }
      }
    } catch (err) {
      setUploadErr(
        err instanceof Error ? err.message : 'Could not upload selected media.'
      );
    } finally {
      setIsUploading(false);
      setUploadPct(0);
    }
  };

  const handleGallerySelect = (assets: MediaAsset[]) => {
    if (assets.length === 0) return;
    const remaining = Math.max(0, 24 - draft.items.length);
    if (remaining === 0) return;
    const additions: HighlightSliderItem[] = assets.slice(0, remaining).map((asset) => ({
      id: createSlideId(),
      kind: 'picture',
      imageUrl: asset.url,
      mediaKind: asset.mediaKind,
      title: asset.title,
      subtitle: asset.categoryTag !== 'General' ? asset.categoryTag : '',
      ctaLabel: '',
      ctaUrl: '',
    }));
    setDraft((prev) => ({
      ...prev,
      enabled: true,
      items: [...prev.items, ...additions].slice(0, 24),
    }));
  };

  const handleAddUrlSlide = () => {
    const cleanUrl = urlInput.trim();
    if (!cleanUrl || draft.items.length >= 24) return;
    const detected = detectMediaKind(cleanUrl);
    const newItem: HighlightSliderItem = {
      id: createSlideId(),
      kind: 'picture',
      imageUrl: cleanUrl,
      mediaKind: detected === 'video' ? 'video' : 'image',
      title: urlTitle.trim(),
      subtitle: '',
      ctaLabel: '',
      ctaUrl: '',
    };
    setDraft((prev) => ({
      ...prev,
      enabled: true,
      items: [...prev.items, newItem].slice(0, 24),
    }));
    setUrlInput('');
    setUrlTitle('');
  };

  const updateSlide = (id: string, patch: Partial<HighlightSliderItem>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const moveSlide = (idx: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev.items];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, items: next };
    });
  };

  const removeSlide = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleaned: HeroHighlightSliderConfig = {
        ...draft,
        items: draft.items.map((item) => ({
          ...item,
          ctaUrl: item.ctaUrl?.trim()
            ? normalizeSiteLinkUrl(item.ctaUrl.trim())
            : undefined,
        })),
      };
      const ok = await onSave(cleaned);
      if (ok !== false) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customize Highlight Picture and Product Slider"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white border border-[#E4E4E0] rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                Hero Highlight Slider Studio
              </p>
              <h2 className="font-serif text-xl font-medium text-[#141413]">
                Customize Box &amp; Add Pictures or Products
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
                  Customize Box Look
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close customizer"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#EFECE6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'box' ? (
              <div className="space-y-6">
                {/* Visibility & Titles */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#141413]">
                        Show Highlight Slider on Home Page
                      </p>
                      <p className="text-[11px] text-[#5A5A56]">
                        Displays directly below Highlight Boxes on desktop and mobile.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#D4D4CE] rounded-md text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) =>
                          setDraft({ ...draft, enabled: e.target.checked })
                        }
                      />
                      <span>{draft.enabled ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        Small Kicker / Eyebrow
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={draft.eyebrow}
                        onChange={(e) =>
                          setDraft({ ...draft, eyebrow: e.target.value })
                        }
                        placeholder="e.g., Featured Highlights"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        Box Heading
                      </label>
                      <input
                        type="text"
                        maxLength={140}
                        value={draft.heading}
                        onChange={(e) =>
                          setDraft({ ...draft, heading: e.target.value })
                        }
                        placeholder="e.g., Spotlight Pictures & Featured Picks"
                        className="w-full h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Optional Short Note Under Heading
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={draft.description ?? ''}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                      placeholder="Short note about this showcase..."
                      className="w-full h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                {/* Layout, Aspect, Theme */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                    <p className="text-xs font-semibold text-[#141413]">
                      Slider Layout Mode
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'carousel', label: '3-Card Row' },
                          { id: 'compact', label: '4-Card Row' },
                          { id: 'spotlight', label: 'Wide Banner' },
                        ] as Array<{ id: HighlightSliderLayout; label: string }>
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraft({ ...draft, layout: opt.id })}
                          className={`py-2 px-2 text-xs font-medium rounded-md border cursor-pointer ${
                            draft.layout === opt.id
                              ? 'bg-[#141413] text-white border-[#141413]'
                              : 'bg-white text-[#141413] border-[#D4D4CE]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs font-semibold text-[#141413] pt-2">
                      Picture / Product Card Shape
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'portrait', label: 'Portrait 3:4' },
                          { id: 'square', label: 'Square 1:1' },
                          { id: 'landscape', label: 'Photo 4:3' },
                          { id: 'wide', label: 'Wide 16:9' },
                        ] as Array<{ id: HighlightSliderAspect; label: string }>
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setDraft({ ...draft, aspectShape: opt.id })
                          }
                          className={`py-2 px-2 text-xs font-medium rounded-md border cursor-pointer ${
                            draft.aspectShape === opt.id
                              ? 'bg-[#141413] text-white border-[#141413]'
                              : 'bg-white text-[#141413] border-[#D4D4CE]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#141413]">
                        Box Style &amp; Colors
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
                          <span>Reset Custom Colors</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'ivory', label: 'Clean Ivory' },
                          { id: 'warm', label: 'Warm Linen' },
                          { id: 'gold', label: 'Gold Trim' },
                          { id: 'obsidian', label: 'Dark Obsidian' },
                        ] as Array<{ id: HighlightSliderTheme; label: string }>
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraft({ ...draft, boxTheme: opt.id })}
                          className={`py-2 px-2.5 text-xs font-medium rounded-md border cursor-pointer ${
                            draft.boxTheme === opt.id
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
                        label="Box Text Color"
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

                {/* Playback & Display Options */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.autoPlay}
                      onChange={(e) =>
                        setDraft({ ...draft, autoPlay: e.target.checked })
                      }
                    />
                    <span>Auto-Play Slider</span>
                  </label>

                  <div>
                    <label className="block text-[11px] text-[#5A5A56] mb-1">
                      Slide Speed
                    </label>
                    <select
                      value={draft.intervalSeconds}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          intervalSeconds: Number(e.target.value) || 5,
                        })
                      }
                      className="w-full h-8 px-2 text-xs bg-white border border-[#D4D4CE] rounded"
                    >
                      <option value={3}>Fast (3 sec)</option>
                      <option value={5}>Balanced (5 sec)</option>
                      <option value={7}>Relaxed (7 sec)</option>
                      <option value={10}>Slow (10 sec)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showCaptions}
                      onChange={(e) =>
                        setDraft({ ...draft, showCaptions: e.target.checked })
                      }
                    />
                    <span>Show Titles &amp; Prices</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showArrows}
                      onChange={(e) =>
                        setDraft({ ...draft, showArrows: e.target.checked })
                      }
                    />
                    <span>Show Prev / Next Arrows</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Add Pictures or Videos */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#141413]">
                        Add Any Pictures or Videos to Slider
                      </p>
                      <p className="text-[11px] text-[#5A5A56]">
                        Uploaded images &amp; clips are saved to cloud media so they load everywhere.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {isUploading
                            ? `Uploading ${uploadPct}%`
                            : 'Upload Photo / Video'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept={MEDIA_FILE_ACCEPT}
                          disabled={isUploading || draft.items.length >= 24}
                          onChange={handleUploadFiles}
                          className="sr-only"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setIsGalleryOpen(true)}
                        disabled={draft.items.length >= 24}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium bg-white text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Choose from Media Gallery</span>
                      </button>
                    </div>
                  </div>

                  {isUploading && (
                    <progress
                      value={uploadPct}
                      max={100}
                      className="w-full h-1.5 rounded-full overflow-hidden accent-[#141413]"
                    />
                  )}
                  {uploadErr && (
                    <div
                      role="alert"
                      className="p-2.5 text-xs text-[#6D2932] bg-[#6D2932]/10 border border-[#6D2932]/25 rounded"
                    >
                      {uploadErr}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E4E4E0] flex flex-wrap items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-[#5A5A56] shrink-0" />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste image, direct video, or YouTube/Vimeo URL..."
                      className="flex-1 min-w-[200px] h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                    <input
                      type="text"
                      maxLength={120}
                      value={urlTitle}
                      onChange={(e) => setUrlTitle(e.target.value)}
                      placeholder="Optional caption"
                      className="w-40 h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrlSlide}
                      disabled={!urlInput.trim() || draft.items.length >= 24}
                      className="h-8 px-3 inline-flex items-center gap-1 text-xs font-medium bg-white border border-[#D4D4CE] rounded hover:border-[#141413] disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Link</span>
                    </button>
                  </div>
                </div>

                {/* 2. Add Products From Catalog */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#141413]">
                        Add Any Product From Your Catalog ({products.length})
                      </p>
                      <p className="text-[11px] text-[#5A5A56]">
                        Click any product to include or remove it from the Highlight Slider.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#5A5A56] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products..."
                          className="h-8 pl-8 pr-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md w-44"
                        />
                      </div>
                      {products.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAddAllProducts}
                          disabled={draft.items.length >= 24}
                          className="h-8 px-3 text-xs font-medium bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                        >
                          + Add All Products
                        </button>
                      )}
                    </div>
                  </div>

                  {products.length === 0 ? (
                    <p className="text-xs text-[#5A5A56] py-3 text-center bg-white border border-[#E4E4E0] rounded">
                      No products added to your catalog yet. You can add pictures/videos above now, and add products anytime after creating them.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredProducts.map((prod) => {
                        const isSelected = addedProductIds.has(prod.id);
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleToggleProductSlide(prod)}
                            className={`flex items-center gap-2.5 p-2 rounded-md border text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-white border-[#141413] ring-1 ring-[#141413]'
                                : 'bg-white border-[#E4E4E0] hover:border-[#141413]'
                            }`}
                          >
                            <div className="w-10 h-12 rounded bg-[#F2F2F0] overflow-hidden shrink-0">
                              <ResilientImage
                                src={pickBestImageUrl(prod) || prod.imageUrl}
                                alt={prod.name}
                                mode="thumb"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-[#141413] truncate">
                                {prod.name}
                              </p>
                              <p className="text-[11px] text-[#5A5A56] truncate tabular-nums">
                                {prod.category} · {formatPKR(prod.price)}
                              </p>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                                isSelected
                                  ? 'bg-[#141413] border-[#141413] text-white'
                                  : 'border-[#D4D4CE]'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Plus className="w-3 h-3 text-[#5A5A56]" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Active Slides Order & Per-Slide Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                      Your Slider Slides ({draft.items.length}/24)
                    </h3>
                    {draft.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, items: [] })}
                        className="text-xs text-[#6D2932] hover:underline cursor-pointer"
                      >
                        Clear All Slides
                      </button>
                    )}
                  </div>

                  {draft.items.length === 0 ? (
                    <div className="py-10 px-4 text-center border border-dashed border-[#D4D4CE] rounded-lg bg-[#FAFAFA]">
                      <Layers className="w-6 h-6 text-[#8A8A84] mx-auto mb-2" />
                      <p className="text-xs font-medium text-[#141413]">
                        No slides added yet
                      </p>
                      <p className="text-[11px] text-[#5A5A56] mt-0.5">
                        Upload photos/videos or click products above to build your Highlight Slider.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {draft.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white border border-[#E4E4E0] rounded-lg flex flex-col sm:flex-row gap-3 items-start"
                        >
                          <div className="w-20 aspect-[4/3] rounded border border-[#E4E4E0] bg-[#F2F2F0] overflow-hidden shrink-0 relative">
                            <ResilientImage
                              src={item.imageUrl}
                              alt={item.title || `Slide ${idx + 1}`}
                              mode="thumb"
                              expectedKind={
                                item.mediaKind === 'video' ? 'video' : 'auto'
                              }
                              className="w-full h-full object-cover"
                            />
                            {item.mediaKind === 'video' && (
                              <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/75 text-white text-[9px] inline-flex items-center">
                                <Film className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                            <input
                              type="text"
                              maxLength={140}
                              value={item.title ?? ''}
                              onChange={(e) =>
                                updateSlide(item.id, { title: e.target.value })
                              }
                              placeholder="Slide title (optional)"
                              className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                            />
                            <input
                              type="text"
                              maxLength={200}
                              value={item.subtitle ?? ''}
                              onChange={(e) =>
                                updateSlide(item.id, { subtitle: e.target.value })
                              }
                              placeholder="Subtitle or department (optional)"
                              className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                            />
                            <input
                              type="text"
                              maxLength={60}
                              value={item.ctaLabel ?? ''}
                              onChange={(e) =>
                                updateSlide(item.id, { ctaLabel: e.target.value })
                              }
                              placeholder={
                                item.kind === 'product'
                                  ? 'Button text (e.g., View Product)'
                                  : 'Button text (optional)'
                              }
                              className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                            />
                            <input
                              type="text"
                              maxLength={300}
                              value={item.ctaUrl ?? ''}
                              onChange={(e) =>
                                updateSlide(item.id, { ctaUrl: e.target.value })
                              }
                              disabled={item.kind === 'product'}
                              placeholder={
                                item.kind === 'product'
                                  ? 'Opens product details automatically'
                                  : 'Link (#catalog, #category:Boutique, or URL)'
                              }
                              className="h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded disabled:opacity-60"
                            />
                          </div>

                          <div className="flex sm:flex-col items-center gap-1 shrink-0 self-end sm:self-center">
                            <span className="text-[10px] font-medium text-[#5A5A56] inline-flex items-center gap-0.5 mb-0.5">
                              {item.kind === 'product' ? (
                                <Package className="w-3 h-3" />
                              ) : (
                                <ImageIcon className="w-3 h-3" />
                              )}
                              <span>#{idx + 1}</span>
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveSlide(idx, -1)}
                                disabled={idx === 0}
                                aria-label="Move slide up"
                                className="p-1 text-[#5A5A56] hover:text-[#141413] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSlide(idx, 1)}
                                disabled={idx === draft.items.length - 1}
                                aria-label="Move slide down"
                                className="p-1 text-[#5A5A56] hover:text-[#141413] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSlide(item.id)}
                                aria-label="Remove slide"
                                className="p-1 text-[#5A5A56] hover:text-[#6D2932] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-[#E4E4E0] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#5A5A56]">
              Saves directly to your live storefront database across all devices.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] bg-white rounded-md hover:text-[#141413] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || isUploading}
                onClick={() => void handleSave()}
                className="px-5 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Publishing...' : 'Save & Publish Highlight Slider'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <GalleryPickerModal
        isOpen={isGalleryOpen}
        mode="multiple"
        title="Pick Photos & Videos for Highlight Slider"
        mediaAssets={mediaAssets}
        categories={categories}
        onClose={() => setIsGalleryOpen(false)}
        onSelect={handleGallerySelect}
        onAddMediaAssets={onAddMediaAssets}
      />
    </>
  );
}
