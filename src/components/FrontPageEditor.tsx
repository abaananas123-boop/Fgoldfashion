import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import {
  BodyFontOption,
  CustomHomeSection,
  CustomSectionPlacement,
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  HeadingFontOption,
  HomeBox,
  HomeBoxPlacement,
  HomeLink,
  HomeLinkPlacement,
  HomeThemeConfig,
  Product,
  SiteConfig,
} from '../types';
import {
  EDITORIAL_LAB_IMAGE_URL,
  HERO_IMAGE_URL,
} from '../data/products';
import { HexColorField } from './HexColorField';
import { ResilientImage } from './ResilientImage';
import {
  MEDIA_FILE_ACCEPT,
  uploadMultipleStoreMediaFiles,
  uploadStoreMediaFile,
} from '../utils/imageUpload';

interface FrontPageEditorProps {
  siteConfig: SiteConfig;
  products?: Product[];
  onSaveSiteConfig: (next: SiteConfig) => void;
  onResetSiteConfig: () => void;
}

const ACCENT_PRESETS = [
  { label: 'Deep Plum', hex: '#6D2932' },
  { label: 'Botanical Emerald', hex: '#1B4D3E' },
  { label: 'Burnished Gold', hex: '#8A6220' },
  { label: 'Midnight Slate', hex: '#27364B' },
  { label: 'Classic Obsidian', hex: '#141413' },
];

const HERO_IMAGE_PRESETS = [
  { label: 'All Departments', url: HERO_IMAGE_URL },
  { label: 'Store Craft', url: EDITORIAL_LAB_IMAGE_URL },
  {
    label: 'Boutique Edit',
    url: '/src/assets/images/product_boutique_clean_1795093197794.jpg',
  },
  {
    label: 'Kundan Jewellery',
    url: '/src/assets/images/product_artificial_jewellery_1795093182654.jpg',
  },
];

export function FrontPageEditor({
  siteConfig,
  onSaveSiteConfig,
  onResetSiteConfig,
}: FrontPageEditorProps) {
  const [draft, setDraft] = useState<SiteConfig>(siteConfig);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});
  const [savedNotice, setSavedNotice] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const lastSyncedJsonRef = useRef<string>(JSON.stringify(siteConfig));

  useEffect(() => {
    const incomingJson = JSON.stringify(siteConfig);
    if (incomingJson !== lastSyncedJsonRef.current && uploadingTarget === null) {
      lastSyncedJsonRef.current = incomingJson;
      setDraft(siteConfig);
    }
  }, [siteConfig, uploadingTarget]);

  const currentCategories =
    draft.categories && draft.categories.length > 0
      ? draft.categories
      : DEFAULT_CATEGORIES;
  const currentSubcategories = draft.subcategories ?? DEFAULT_SUBCATEGORIES;

  const handleAddDepartment = () => {
    const trimmed = newCategoryInput.trim().slice(0, 60);
    if (!trimmed) return;
    if (
      currentCategories.some(
        (cat) => cat.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setNewCategoryInput('');
      return;
    }
    setDraft({
      ...draft,
      categories: [...currentCategories, trimmed],
    });
    setNewCategoryInput('');
  };

  const handleAddSubcategoryDraft = (parentCategory: string) => {
    const raw = (subInputs[parentCategory] ?? '').trim().slice(0, 60);
    if (!raw) return;
    const existing = currentSubcategories[parentCategory] ?? [];
    if (existing.some((s) => s.toLowerCase() === raw.toLowerCase())) {
      setSubInputs((prev) => ({ ...prev, [parentCategory]: '' }));
      return;
    }
    setDraft({
      ...draft,
      subcategories: {
        ...currentSubcategories,
        [parentCategory]: [...existing, raw],
      },
    });
    setSubInputs((prev) => ({ ...prev, [parentCategory]: '' }));
  };

  const handleDeleteSubcategoryDraft = (
    parentCategory: string,
    subName: string
  ) => {
    const existing = currentSubcategories[parentCategory] ?? [];
    const nextList = existing.filter((s) => s !== subName);
    const nextMap = { ...currentSubcategories };
    if (nextList.length > 0) {
      nextMap[parentCategory] = nextList;
    } else {
      delete nextMap[parentCategory];
    }
    setDraft({
      ...draft,
      subcategories: nextMap,
    });
  };

  const handleMediaUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    target: 'hero' | 'philosophy' | 'header' | `box:${number}` | `section:${number}`
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    setUploadError(null);
    setUploadingTarget(target);
    setUploadProgress(2);
    try {
      const uploaded =
        files.length === 1
          ? [
              await uploadStoreMediaFile(files[0], {
                onProgress: (pct) => setUploadProgress(pct),
              }),
            ]
          : await uploadMultipleStoreMediaFiles(files, {
              maxFiles: 12,
              onProgress: (pct) => setUploadProgress(pct),
            });
      const urls = uploaded.map((u) => u.url);
      const firstUrl = urls[0];
      if (!firstUrl) return;

      if (target === 'hero') {
        setDraft((prev) => ({
          ...prev,
          hero: { ...prev.hero, imageUrl: firstUrl },
        }));
      } else if (target === 'header') {
        setDraft((prev) => ({
          ...prev,
          headerBackgroundImage: firstUrl,
        }));
      } else if (target === 'philosophy') {
        setDraft((prev) => ({
          ...prev,
          philosophy: { ...prev.philosophy, imageUrl: firstUrl },
        }));
      } else if (target.startsWith('box:')) {
        const boxIdx = Number(target.split(':')[1]);
        setDraft((prev) => ({
          ...prev,
          customBoxes: (prev.customBoxes ?? []).map((b, i) => {
            if (i !== boxIdx) return b;
            const currentMain = b.imageUrl?.trim();
            const nextMain = currentMain || firstUrl;
            const extras = currentMain ? urls : urls.slice(1);
            const nextGallery = Array.from(
              new Set([...(b.mediaGallery ?? []), ...extras].filter((u) => u !== nextMain))
            ).slice(0, 12);
            return {
              ...b,
              imageUrl: nextMain,
              mediaGallery: nextGallery.length > 0 ? nextGallery : undefined,
            };
          }),
        }));
      } else if (target.startsWith('section:')) {
        const secIdx = Number(target.split(':')[1]);
        setDraft((prev) => ({
          ...prev,
          customSections: (prev.customSections ?? []).map((s, i) => {
            if (i !== secIdx) return s;
            const currentMain = s.imageUrl?.trim();
            const nextMain = currentMain || firstUrl;
            const extras = currentMain ? urls : urls.slice(1);
            const nextGallery = Array.from(
              new Set([...(s.mediaGallery ?? []), ...extras].filter((u) => u !== nextMain))
            ).slice(0, 12);
            return {
              ...s,
              imageUrl: nextMain,
              mediaGallery: nextGallery.length > 0 ? nextGallery : undefined,
            };
          }),
        }));
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Could not upload selected photo or video.'
      );
    } finally {
      setUploadingTarget(null);
      setUploadProgress(0);
    }
  };

  const currentTheme: HomeThemeConfig = {
    pageBgColor: '#FAFAFA',
    surfaceColor: '#FFFFFF',
    textColor: '#141413',
    mutedTextColor: '#5A5A56',
    borderColor: '#E4E4E0',
    buttonBgColor: '#141413',
    buttonTextColor: '#FFFFFF',
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Plus Jakarta Sans',
    headingStyle: 'normal',
    headingWeight: 'medium',
    bodyWeight: 'normal',
    headingScale: 'standard',
    ...draft.homeTheme,
  };

  const patchHomeTheme = (patch: Partial<HomeThemeConfig>) => {
    setDraft((prev) => ({
      ...prev,
      homeTheme: {
        ...currentTheme,
        ...prev.homeTheme,
        ...patch,
      },
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSaveSiteConfig({ ...draft, homeSliders: [] });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      {(uploadingTarget !== null || uploadError) && (
        <div className="px-6 pt-3 pb-2 border-b border-[#E4E4E0] bg-[#FAFAFA] space-y-2 shrink-0">
          {uploadingTarget !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#141413]">
                <span>Uploading photo or video...</span>
                <span className="tabular-nums">{uploadProgress}%</span>
              </div>
              <progress
                value={uploadProgress}
                max={100}
                aria-label="Media upload progress"
                className="w-full h-1.5 rounded-full overflow-hidden accent-[#141413]"
              />
            </div>
          )}
          {uploadError && (
            <div
              role="alert"
              className="p-2.5 text-xs text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/25 rounded-md"
            >
              {uploadError}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E0]">
          <p className="text-xs text-[#5A5A56]">
            Customize any headline, photo (any resolution), video (any format), navigation link, highlight box, brand story, or shipping rule.
          </p>
          <button
            type="button"
            onClick={onResetSiteConfig}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] hover:border-[#141413] transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Front Page</span>
          </button>
        </div>

        {/* 1. Store Brand, Accent Color & Navigation */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
            1. Store Identity, Theme Accent &amp; Header Links
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Store Name
              </label>
              <input
                type="text"
                required
                value={draft.storeName}
                onChange={(e) =>
                  setDraft({ ...draft, storeName: e.target.value })
                }
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Footer Tagline
              </label>
              <input
                type="text"
                value={draft.footerTagline}
                onChange={(e) =>
                  setDraft({ ...draft, footerTagline: e.target.value })
                }
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#141413] mb-2">
              Brand Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const isSelected =
                  draft.accentColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, accentColor: preset.hex })
                    }
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] bg-[#FAFAFA] text-[#141413]'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/40"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
              <HexColorField
                label="Brand Accent"
                value={draft.accentColor}
                fallbackColor="#6D2932"
                inline
                onChange={(hex) => setDraft({ ...draft, accentColor: hex })}
              />
            </div>
          </div>

          {/* Header Background Image/Video & Overlay */}
          <div className="pt-4 border-t border-[#F0F0EC] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#141413]">
                Header Background Photo or Video &amp; Contrast
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={draft.headerTextTheme ?? 'dark'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      headerTextTheme: e.target.value as 'dark' | 'light',
                    })
                  }
                  className="h-8 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                >
                  <option value="dark">Light Frosted + Dark Text</option>
                  <option value="light">Dark Scrim + White Text</option>
                </select>
                {draft.headerBackgroundImage && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, headerBackgroundImage: '' })
                    }
                    className="h-8 px-2.5 text-xs text-[#5A5A56] border border-[#D4D4CE] rounded hover:text-[#141413] cursor-pointer"
                  >
                    Clear Media
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={draft.headerBackgroundImage ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, headerBackgroundImage: e.target.value })
                }
                placeholder="Paste header photo/video URL or upload..."
                className="flex-1 min-w-[200px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
              <label className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadingTarget === 'header'
                    ? `Uploading ${uploadProgress}%`
                    : 'Upload Photo / Video'}
                </span>
                <input
                  type="file"
                  accept={MEDIA_FILE_ACCEPT}
                  disabled={uploadingTarget !== null}
                  onChange={(e) => handleMediaUpload(e, 'header')}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {HERO_IMAGE_PRESETS.map((preset) => (
                <button
                  key={`hdr-${preset.url}`}
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, headerBackgroundImage: preset.url })
                  }
                  className="px-2 py-1 text-[11px] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Global Home Page Colors & Typography */}
          <div className="pt-4 border-t border-[#F0F0EC] space-y-3">
            <p className="text-xs font-medium text-[#141413]">
              Home Page Colors, Fonts &amp; Text Styles
            </p>
            <p className="text-[11px] text-[#5A5A56]">
              Type any <span className="font-mono font-semibold text-[#141413]">#hex</span> code (like{' '}
              <span className="font-mono font-semibold text-[#141413]">#698467</span>) to select it automatically.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(
                [
                  ['Page Background', 'pageBgColor'],
                  ['Card Surface', 'surfaceColor'],
                  ['Primary Text', 'textColor'],
                  ['Muted Text', 'mutedTextColor'],
                  ['Borders', 'borderColor'],
                  ['Button Fill', 'buttonBgColor'],
                  ['Button Text', 'buttonTextColor'],
                ] as const
              ).map(([label, key]) => (
                <HexColorField
                  key={key}
                  label={label}
                  value={currentTheme[key]}
                  compact
                  onChange={(hex) => patchHomeTheme({ [key]: hex })}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[11px] text-[#5A5A56] mb-1">
                  Heading Font
                </label>
                <select
                  value={currentTheme.headingFont}
                  onChange={(e) =>
                    patchHomeTheme({
                      headingFont: e.target.value as HeadingFontOption,
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                >
                  <option value="Cormorant Garamond">Cormorant Garamond</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Lora">Lora</option>
                  <option value="Merriweather">Merriweather</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5A5A56] mb-1">
                  Body Font
                </label>
                <select
                  value={currentTheme.bodyFont}
                  onChange={(e) =>
                    patchHomeTheme({
                      bodyFont: e.target.value as BodyFontOption,
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Poppins">Poppins</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Lora">Lora</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5A5A56] mb-1">
                  Heading Style
                </label>
                <select
                  value={currentTheme.headingStyle}
                  onChange={(e) =>
                    patchHomeTheme({
                      headingStyle: e.target.value as HomeThemeConfig['headingStyle'],
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                  <option value="uppercase">UPPERCASE</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5A5A56] mb-1">
                  Heading Weight
                </label>
                <select
                  value={currentTheme.headingWeight}
                  onChange={(e) =>
                    patchHomeTheme({
                      headingWeight: e.target.value as HomeThemeConfig['headingWeight'],
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                >
                  <option value="normal">Regular</option>
                  <option value="medium">Medium</option>
                  <option value="semibold">Semi-Bold</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5A5A56] mb-1">
                  Heading Size
                </label>
                <select
                  value={currentTheme.headingScale}
                  onChange={(e) =>
                    patchHomeTheme({
                      headingScale: e.target.value as HomeThemeConfig['headingScale'],
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                >
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#F0F0EC]">
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Nav Link 1 (All)
              </label>
              <input
                type="text"
                value={draft.navLabels.shopAll}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    navLabels: { ...draft.navLabels, shopAll: e.target.value },
                  })
                }
                className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Nav Link 2 (Boutique)
              </label>
              <input
                type="text"
                value={draft.navLabels.skincare}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    navLabels: { ...draft.navLabels, skincare: e.target.value },
                  })
                }
                className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Nav Link 3 (Jewellery)
              </label>
              <input
                type="text"
                value={draft.navLabels.color}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    navLabels: { ...draft.navLabels, color: e.target.value },
                  })
                }
                className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Nav Link 4 (Our Store)
              </label>
              <input
                type="text"
                value={draft.navLabels.ingredients}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    navLabels: {
                      ...draft.navLabels,
                      ingredients: e.target.value,
                    },
                  })
                }
                className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#F0F0EC] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[#141413]">
                  Store Departments &amp; Categories ({currentCategories.length})
                </p>
                <p className="text-[11px] text-[#5A5A56]">
                  Shown in the top-right Categories button, catalog filter tabs, and product forms.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    categories: [...DEFAULT_CATEGORIES],
                    subcategories: { ...DEFAULT_SUBCATEGORIES },
                  })
                }
                className="text-[11px] font-medium text-[#5A5A56] hover:text-[#141413] underline cursor-pointer"
              >
                Restore Default Departments
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                maxLength={60}
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDepartment();
                  }
                }}
                placeholder="Add new department (e.g., Handbags, Watches, Footwear)"
                className="flex-1 min-w-[200px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
              <button
                type="button"
                onClick={handleAddDepartment}
                disabled={!newCategoryInput.trim()}
                className="inline-flex items-center gap-1 h-9 px-3.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentCategories.map((cat, idx) => {
                const subs = currentSubcategories[cat] ?? [];
                return (
                  <div
                    key={cat}
                    className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#141413]">
                        {cat}
                      </span>
                      {currentCategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextSubs = { ...currentSubcategories };
                            delete nextSubs[cat];
                            setDraft({
                              ...draft,
                              categories: currentCategories.filter(
                                (_, i) => i !== idx
                              ),
                              subcategories: nextSubs,
                            });
                          }}
                          aria-label={`Remove ${cat}`}
                          className="p-1 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {subs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {subs.map((sub) => (
                          <span
                            key={`${cat}-${sub}`}
                            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-[11px] bg-white border border-[#D4D4CE] rounded text-[#141413]"
                          >
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubcategoryDraft(cat, sub)}
                              aria-label={`Remove ${sub} from ${cat}`}
                              className="p-0.5 text-[#8A8A84] hover:text-[var(--accent)] cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={60}
                        value={subInputs[cat] ?? ''}
                        onChange={(e) =>
                          setSubInputs((prev) => ({
                            ...prev,
                            [cat]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubcategoryDraft(cat);
                          }
                        }}
                        placeholder={`Add subcategory in ${cat}...`}
                        className="flex-1 min-w-0 h-8 px-2 text-[11px] bg-white border border-[#D4D4CE] rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubcategoryDraft(cat)}
                        disabled={!(subInputs[cat] ?? '').trim()}
                        className="h-8 px-2.5 text-[11px] font-medium bg-white border border-[#D4D4CE] text-[#141413] rounded hover:border-[#141413] disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Hero Section */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
            2. Front Page Hero Banner &amp; Guarantees
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Hero Eyebrow
              </label>
              <input
                type="text"
                value={draft.hero.eyebrow}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hero: { ...draft.hero, eyebrow: e.target.value },
                  })
                }
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Hero Headline
              </label>
              <input
                type="text"
                value={draft.hero.headline}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hero: { ...draft.hero, headline: e.target.value },
                  })
                }
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#141413] mb-1">
              Hero Subheadline
            </label>
            <textarea
              rows={2}
              value={draft.hero.description}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hero: { ...draft.hero, description: e.target.value },
                })
              }
              className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Primary Button Text
              </label>
              <input
                type="text"
                value={draft.hero.primaryCta}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hero: { ...draft.hero, primaryCta: e.target.value },
                  })
                }
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Secondary Button Text
              </label>
              <input
                type="text"
                value={draft.hero.secondaryCta}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hero: { ...draft.hero, secondaryCta: e.target.value },
                  })
                }
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2 border-t border-[#F0F0EC]">
            <div className="md:col-span-4 aspect-[4/3] rounded-md overflow-hidden border border-[#E4E4E0] bg-[#F2F2F0]">
              <ResilientImage
                src={draft.hero.imageUrl}
                alt="Hero preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:col-span-8 space-y-2.5">
              <label className="block text-xs font-medium text-[#141413]">
                Hero Banner Photo or Video (Any Resolution / Format)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={draft.hero.imageUrl}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      hero: { ...draft.hero, imageUrl: e.target.value },
                    })
                  }
                  placeholder="Paste image/video URL or upload..."
                  className="flex-1 min-w-[180px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                />
                <label className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingTarget === 'hero'
                      ? `Uploading ${uploadProgress}%`
                      : 'Upload Photo / Video'}
                  </span>
                  <input
                    type="file"
                    accept={MEDIA_FILE_ACCEPT}
                    disabled={uploadingTarget !== null}
                    onChange={(e) => handleMediaUpload(e, 'hero')}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HERO_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        hero: { ...draft.hero, imageUrl: preset.url },
                      })
                    }
                    className={`px-2.5 py-1 text-[11px] rounded border cursor-pointer ${
                      draft.hero.imageUrl === preset.url
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] bg-[#FAFAFA] text-[#5A5A56]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F0F0EC]">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <p className="text-xs font-medium text-[#141413]">
                Highlight Boxes Below Hero ({draft.hero.guarantees.length})
              </p>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    hero: {
                      ...draft.hero,
                      guarantees: [
                        ...draft.hero.guarantees,
                        { title: 'New Highlight', subtitle: 'Highlight details' },
                      ],
                    },
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Box</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {draft.hero.guarantees.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-2"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          hero: {
                            ...draft.hero,
                            guarantees: draft.hero.guarantees.map((g, i) =>
                              i === idx ? { ...g, title: e.target.value } : g
                            ),
                          },
                        })
                      }
                      placeholder="Title"
                      className="flex-1 h-8 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          hero: {
                            ...draft.hero,
                            guarantees: draft.hero.guarantees.filter(
                              (_, i) => i !== idx
                            ),
                          },
                        })
                      }
                      aria-label="Delete highlight box"
                      className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.subtitle}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hero: {
                          ...draft.hero,
                          guarantees: draft.hero.guarantees.map((g, i) =>
                            i === idx ? { ...g, subtitle: e.target.value } : g
                          ),
                        },
                      })
                    }
                    placeholder="Subtitle"
                    className="w-full h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Catalog Heading & Shipping / Promo Rules */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
            3. Catalog Header &amp; PKR Shipping / Promo Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Catalog Section Eyebrow
              </label>
              <input
                type="text"
                value={draft.catalogSection.eyebrow}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    catalogSection: {
                      ...draft.catalogSection,
                      eyebrow: e.target.value,
                    },
                  })
                }
                className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Catalog Section Heading
              </label>
              <input
                type="text"
                value={draft.catalogSection.heading}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    catalogSection: {
                      ...draft.catalogSection,
                      heading: e.target.value,
                    },
                  })
                }
                className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#F0F0EC]">
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Free Shipping (Rs.)
              </label>
              <input
                type="number"
                min={0}
                value={draft.checkout.freeShippingThreshold}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    checkout: {
                      ...draft.checkout,
                      freeShippingThreshold: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full h-9 px-2.5 text-xs tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Delivery Fee (Rs.)
              </label>
              <input
                type="number"
                min={0}
                value={draft.checkout.standardShippingFee}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    checkout: {
                      ...draft.checkout,
                      standardShippingFee: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full h-9 px-2.5 text-xs tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Promo Code
              </label>
              <input
                type="text"
                value={draft.checkout.promoCode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    checkout: {
                      ...draft.checkout,
                      promoCode: e.target.value.toUpperCase(),
                    },
                  })
                }
                className="w-full h-9 px-2.5 text-xs uppercase bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                Promo Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={90}
                value={draft.checkout.promoDiscountPercent}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    checkout: {
                      ...draft.checkout,
                      promoDiscountPercent: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full h-9 px-2.5 text-xs tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded"
              />
            </div>
          </div>

          {/* Multi-Coupon Codes */}
          <div className="pt-4 border-t border-[#F0F0EC] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[#141413]">
                  Additional Promo Coupons ({(draft.checkout.coupons ?? []).length}/20)
                </p>
                <p className="text-[11px] text-[#5A5A56]">
                  Optional campaign codes with minimum order PKR rules and expiry dates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = draft.checkout.coupons ?? [];
                  if (current.length >= 20) return;
                  const uid = Date.now().toString(36);
                  setDraft({
                    ...draft,
                    checkout: {
                      ...draft.checkout,
                      coupons: [
                        ...current,
                        {
                          id: `cpn-${uid}`,
                          code: 'EID15',
                          discountPercent: 15,
                          minOrderAmount: 5000,
                          expiresAt: '',
                          active: true,
                        },
                      ],
                    },
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>Add Coupon</span>
              </button>
            </div>

            {(draft.checkout.coupons ?? []).length > 0 && (
              <div className="space-y-2">
                {(draft.checkout.coupons ?? []).map((coupon, idx) => (
                  <div
                    key={coupon.id || idx}
                    className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center p-2.5 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md"
                  >
                    <input
                      type="text"
                      maxLength={30}
                      value={coupon.code}
                      onChange={(e) => {
                        const next = [...(draft.checkout.coupons ?? [])];
                        next[idx] = { ...coupon, code: e.target.value.toUpperCase() };
                        setDraft({ ...draft, checkout: { ...draft.checkout, coupons: next } });
                      }}
                      placeholder="CODE"
                      aria-label="Coupon code"
                      className="sm:col-span-3 h-8 px-2 text-xs uppercase bg-white border border-[#D4D4CE] rounded"
                    />
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={coupon.discountPercent}
                      onChange={(e) => {
                        const next = [...(draft.checkout.coupons ?? [])];
                        next[idx] = {
                          ...coupon,
                          discountPercent: Math.min(90, Math.max(1, Number(e.target.value) || 1)),
                        };
                        setDraft({ ...draft, checkout: { ...draft.checkout, coupons: next } });
                      }}
                      placeholder="% Off"
                      title="Discount percentage"
                      className="sm:col-span-2 h-8 px-2 text-xs tabular-nums bg-white border border-[#D4D4CE] rounded"
                    />
                    <input
                      type="number"
                      min={0}
                      value={coupon.minOrderAmount ?? ''}
                      onChange={(e) => {
                        const next = [...(draft.checkout.coupons ?? [])];
                        const val = Number(e.target.value);
                        next[idx] = {
                          ...coupon,
                          minOrderAmount: e.target.value.trim() === '' || val <= 0 ? undefined : Math.round(val),
                        };
                        setDraft({ ...draft, checkout: { ...draft.checkout, coupons: next } });
                      }}
                      placeholder="Min Rs. (opt)"
                      title="Minimum order PKR"
                      className="sm:col-span-3 h-8 px-2 text-xs tabular-nums bg-white border border-[#D4D4CE] rounded"
                    />
                    <input
                      type="date"
                      value={coupon.expiresAt ?? ''}
                      onChange={(e) => {
                        const next = [...(draft.checkout.coupons ?? [])];
                        next[idx] = { ...coupon, expiresAt: e.target.value };
                        setDraft({ ...draft, checkout: { ...draft.checkout, coupons: next } });
                      }}
                      title="Optional expiry date"
                      className="sm:col-span-2 h-8 px-1.5 text-[11px] bg-white border border-[#D4D4CE] rounded"
                    />
                    <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                      <label className="inline-flex items-center gap-1 text-[11px] text-[#141413] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={coupon.active}
                          onChange={(e) => {
                            const next = [...(draft.checkout.coupons ?? [])];
                            next[idx] = { ...coupon, active: e.target.checked };
                            setDraft({ ...draft, checkout: { ...draft.checkout, coupons: next } });
                          }}
                          className="rounded border-[#D4D4CE]"
                        />
                        <span>On</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (draft.checkout.coupons ?? []).filter((_, i) => i !== idx);
                          setDraft({ ...draft, checkout: { ...draft.checkout, coupons: next } });
                        }}
                        aria-label="Remove coupon"
                        className="p-1 text-[#5A5A56] hover:text-[#6D2932] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* City-Wise Delivery Charges */}
          <div className="pt-4 border-t border-[#F0F0EC] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[#141413]">
                  City-Wise Delivery Rates ({(draft.checkout.cityShippingRates ?? []).length}/40)
                </p>
                <p className="text-[11px] text-[#5A5A56]">
                  Override the default Rs. {draft.checkout.standardShippingFee} shipping fee for specific cities (e.g., Lahore, Karachi, Islamabad).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = draft.checkout.cityShippingRates ?? [];
                  if (current.length >= 40) return;
                  const uid = Date.now().toString(36);
                  setDraft({
                    ...draft,
                    checkout: {
                      ...draft.checkout,
                      cityShippingRates: [
                        ...current,
                        {
                          id: `city-${uid}`,
                          city: 'Lahore',
                          fee: 200,
                          freeAbove: undefined,
                        },
                      ],
                    },
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>Add City Rate</span>
              </button>
            </div>

            {(draft.checkout.cityShippingRates ?? []).length > 0 && (
              <div className="space-y-2">
                {(draft.checkout.cityShippingRates ?? []).map((rate, idx) => (
                  <div
                    key={rate.id || idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md"
                  >
                    <input
                      type="text"
                      maxLength={60}
                      value={rate.city}
                      onChange={(e) => {
                        const next = [...(draft.checkout.cityShippingRates ?? [])];
                        next[idx] = { ...rate, city: e.target.value };
                        setDraft({
                          ...draft,
                          checkout: { ...draft.checkout, cityShippingRates: next },
                        });
                      }}
                      placeholder="City Name (e.g. Lahore)"
                      className="sm:col-span-5 h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                    <input
                      type="number"
                      min={0}
                      value={rate.fee}
                      onChange={(e) => {
                        const next = [...(draft.checkout.cityShippingRates ?? [])];
                        next[idx] = {
                          ...rate,
                          fee: Math.max(0, Math.round(Number(e.target.value) || 0)),
                        };
                        setDraft({
                          ...draft,
                          checkout: { ...draft.checkout, cityShippingRates: next },
                        });
                      }}
                      placeholder="Fee (Rs.)"
                      title="Delivery charge in PKR"
                      className="sm:col-span-3 h-8 px-2.5 text-xs tabular-nums bg-white border border-[#D4D4CE] rounded"
                    />
                    <input
                      type="number"
                      min={0}
                      value={rate.freeAbove ?? ''}
                      onChange={(e) => {
                        const next = [...(draft.checkout.cityShippingRates ?? [])];
                        const val = Number(e.target.value);
                        next[idx] = {
                          ...rate,
                          freeAbove:
                            e.target.value.trim() === '' || val <= 0
                              ? undefined
                              : Math.round(val),
                        };
                        setDraft({
                          ...draft,
                          checkout: { ...draft.checkout, cityShippingRates: next },
                        });
                      }}
                      placeholder="Free above Rs. (opt)"
                      title="Optional city free shipping threshold"
                      className="sm:col-span-3 h-8 px-2.5 text-xs tabular-nums bg-white border border-[#D4D4CE] rounded"
                    />
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const next = (draft.checkout.cityShippingRates ?? []).filter(
                            (_, i) => i !== idx
                          );
                          setDraft({
                            ...draft,
                            checkout: { ...draft.checkout, cityShippingRates: next },
                          });
                        }}
                        aria-label="Remove city rate"
                        className="p-1 text-[#5A5A56] hover:text-[#6D2932] cursor-pointer"
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

        {/* 4. Brand Story / Formulation Section */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
              4. Store Standards &amp; Brand Story Section
            </h3>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
              <input
                type="checkbox"
                checked={draft.philosophy.visible}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    philosophy: {
                      ...draft.philosophy,
                      visible: e.target.checked,
                    },
                  })
                }
                className="rounded border-[#D4D4CE]"
              />
              <span>Show Section on Front Page</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Story Eyebrow
              </label>
              <input
                type="text"
                value={draft.philosophy.eyebrow}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    philosophy: {
                      ...draft.philosophy,
                      eyebrow: e.target.value,
                    },
                  })
                }
                className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Story Headline
              </label>
              <input
                type="text"
                value={draft.philosophy.heading}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    philosophy: {
                      ...draft.philosophy,
                      heading: e.target.value,
                    },
                  })
                }
                className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-3 aspect-[4/3] rounded-md overflow-hidden border border-[#E4E4E0] bg-[#F2F2F0]">
              <ResilientImage
                src={draft.philosophy.imageUrl}
                alt="Story preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:col-span-9 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={draft.philosophy.imageUrl}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    philosophy: {
                      ...draft.philosophy,
                      imageUrl: e.target.value,
                    },
                  })
                }
                placeholder="Story photo or video URL..."
                aria-label="Story photo or video URL"
                className="flex-1 min-w-[200px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
              />
              <label className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadingTarget === 'philosophy'
                    ? `Uploading ${uploadProgress}%`
                    : 'Upload Photo / Video'}
                </span>
                <input
                  type="file"
                  accept={MEDIA_FILE_ACCEPT}
                  disabled={uploadingTarget !== null}
                  onChange={(e) => handleMediaUpload(e, 'philosophy')}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#141413]">
                Story Pillars ({draft.philosophy.pillars.length})
              </p>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    philosophy: {
                      ...draft.philosophy,
                      pillars: [
                        ...draft.philosophy.pillars,
                        { title: 'New Pillar', description: 'Describe your feature or craft standard.' },
                      ],
                    },
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Pillar</span>
              </button>
            </div>
            {draft.philosophy.pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pillar.title}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        philosophy: {
                          ...draft.philosophy,
                          pillars: draft.philosophy.pillars.map((p, i) =>
                            i === idx ? { ...p, title: e.target.value } : p
                          ),
                        },
                      })
                    }
                    className="flex-1 h-8 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        philosophy: {
                          ...draft.philosophy,
                          pillars: draft.philosophy.pillars.filter(
                            (_, i) => i !== idx
                          ),
                        },
                      })
                    }
                    aria-label="Delete pillar"
                    className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={pillar.description}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      philosophy: {
                        ...draft.philosophy,
                        pillars: draft.philosophy.pillars.map((p, i) =>
                          i === idx ? { ...p, description: e.target.value } : p
                        ),
                      },
                    })
                  }
                  className="w-full p-2 text-xs bg-white border border-[#D4D4CE] rounded"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#141413]">
                Proof Metrics ({draft.philosophy.metrics.length})
              </p>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    philosophy: {
                      ...draft.philosophy,
                      metrics: [
                        ...draft.philosophy.metrics,
                        { value: '100%', label: 'New Metric' },
                      ],
                    },
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Metric</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {draft.philosophy.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={metric.value}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          philosophy: {
                            ...draft.philosophy,
                            metrics: draft.philosophy.metrics.map((m, i) =>
                              i === idx ? { ...m, value: e.target.value } : m
                            ),
                          },
                        })
                      }
                      placeholder="98.4%"
                      className="flex-1 h-8 px-2 text-xs font-semibold tabular-nums bg-white border border-[#D4D4CE] rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          philosophy: {
                            ...draft.philosophy,
                            metrics: draft.philosophy.metrics.filter(
                              (_, i) => i !== idx
                            ),
                          },
                        })
                      }
                      aria-label="Delete metric"
                      className="p-1 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={metric.label}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        philosophy: {
                          ...draft.philosophy,
                          metrics: draft.philosophy.metrics.map((m, i) =>
                            i === idx ? { ...m, label: e.target.value } : m
                          ),
                        },
                      })
                    }
                    placeholder="Metric label"
                    className="w-full h-8 px-2 text-xs bg-white border border-[#D4D4CE] rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Custom Home Boxes & Website Links */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
              5. Custom Home Feature Boxes ({(draft.customBoxes ?? []).length}) &amp; Links ({(draft.customLinks ?? []).length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextBox: HomeBox = {
                    id: `box-${Date.now().toString(36)}`,
                    title: 'New Feature Box',
                    description: 'Describe your new offer or service.',
                    placement: 'features',
                  };
                  setDraft({
                    ...draft,
                    customBoxes: [...(draft.customBoxes ?? []), nextBox],
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Box</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextLink: HomeLink = {
                    id: `link-${Date.now().toString(36)}`,
                    label: 'New Link',
                    url: '#catalog',
                    placement: 'quickbar',
                    openInNewTab: false,
                  };
                  setDraft({
                    ...draft,
                    customLinks: [...(draft.customLinks ?? []), nextLink],
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#FAFAFA] text-[#141413] border border-[#D4D4CE] rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Link</span>
              </button>
            </div>
          </div>

          {(draft.customBoxes ?? []).length > 0 && (
            <div className="space-y-2.5">
              {(draft.customBoxes ?? []).map((box, idx) => (
                <div
                  key={box.id}
                  className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={box.title}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customBoxes: (draft.customBoxes ?? []).map((b, i) =>
                            i === idx ? { ...b, title: e.target.value } : b
                          ),
                        })
                      }
                      placeholder="Box title"
                      className="sm:col-span-5 h-8 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded"
                    />
                    <select
                      value={box.placement}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customBoxes: (draft.customBoxes ?? []).map((b, i) =>
                            i === idx
                              ? { ...b, placement: e.target.value as HomeBoxPlacement }
                              : b
                          ),
                        })
                      }
                      className="sm:col-span-3 h-8 px-2 text-xs bg-white border border-[#D4D4CE] rounded"
                    >
                      <option value="hero">Below Hero</option>
                      <option value="catalog">Above Catalog</option>
                      <option value="features">Features Section</option>
                    </select>
                    <input
                      type="text"
                      value={box.linkUrl ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customBoxes: (draft.customBoxes ?? []).map((b, i) =>
                            i === idx ? { ...b, linkUrl: e.target.value } : b
                          ),
                        })
                      }
                      placeholder="Link URL (optional)"
                      className="sm:col-span-3 h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            customBoxes: (draft.customBoxes ?? []).filter(
                              (_, i) => i !== idx
                            ),
                          })
                        }
                        aria-label={`Delete ${box.title}`}
                        className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={box.description}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        customBoxes: (draft.customBoxes ?? []).map((b, i) =>
                          i === idx ? { ...b, description: e.target.value } : b
                        ),
                      })
                    }
                    placeholder="Box description"
                    className="w-full h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={box.imageUrl ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customBoxes: (draft.customBoxes ?? []).map((b, i) =>
                            i === idx ? { ...b, imageUrl: e.target.value } : b
                          ),
                        })
                      }
                      placeholder="Box photo or video URL (optional)"
                      className="flex-1 min-w-[160px] h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                    <label className="inline-flex items-center gap-1 h-8 px-2.5 text-[11px] font-medium bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>
                        {uploadingTarget === `box:${idx}`
                          ? `Uploading ${uploadProgress}%`
                          : 'Upload 1+ Photos / Videos'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingTarget !== null}
                        onChange={(e) => handleMediaUpload(e, `box:${idx}`)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  {(box.mediaGallery ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(box.mediaGallery ?? []).map((mediaUrl, gIdx) => (
                        <div
                          key={`${mediaUrl}-${gIdx}`}
                          className="relative w-14 h-10 rounded border border-[#D4D4CE] bg-white overflow-hidden"
                        >
                          <ResilientImage
                            src={mediaUrl}
                            alt={`Box gallery ${gIdx + 1}`}
                            mode="thumb"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                customBoxes: (draft.customBoxes ?? []).map((b, i) =>
                                  i === idx
                                    ? {
                                        ...b,
                                        mediaGallery: (b.mediaGallery ?? []).filter(
                                          (_, j) => j !== gIdx
                                        ),
                                      }
                                    : b
                                ),
                              })
                            }
                            aria-label="Remove gallery media"
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/95 text-[#141413] flex items-center justify-center text-[10px] leading-none border border-[#D4D4CE] cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(draft.customLinks ?? []).length > 0 && (
            <div className="space-y-2">
              {(draft.customLinks ?? []).map((link, idx) => (
                <div
                  key={link.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md"
                >
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        customLinks: (draft.customLinks ?? []).map((l, i) =>
                          i === idx ? { ...l, label: e.target.value } : l
                        ),
                      })
                    }
                    placeholder="Link label"
                    className="sm:col-span-4 h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        customLinks: (draft.customLinks ?? []).map((l, i) =>
                          i === idx ? { ...l, url: e.target.value } : l
                        ),
                      })
                    }
                    placeholder="https://... or #catalog"
                    className="sm:col-span-4 h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                  />
                  <select
                    value={link.placement}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        customLinks: (draft.customLinks ?? []).map((l, i) =>
                          i === idx
                            ? { ...l, placement: e.target.value as HomeLinkPlacement }
                            : l
                        ),
                      })
                    }
                    className="sm:col-span-3 h-8 px-2 text-xs bg-white border border-[#D4D4CE] rounded"
                  >
                    <option value="quickbar">Quick Bar</option>
                    <option value="hero">Hero</option>
                    <option value="footer">Footer</option>
                  </select>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          customLinks: (draft.customLinks ?? []).filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      aria-label={`Delete ${link.label}`}
                      className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Custom Sections */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
              6. Custom Sections ({(draft.customSections ?? []).length})
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextSection: CustomHomeSection = {
                    id: `sec-${Date.now().toString(36)}`,
                    eyebrow: 'Announcement',
                    heading: 'Custom Storefront Section',
                    body: 'Add custom text, styling, background colors, and links.',
                    placement: 'features',
                    backgroundColor: '#FFFFFF',
                    textColor: '#141413',
                    textAlign: 'left',
                    headingStyle: 'serif',
                  };
                  setDraft({
                    ...draft,
                    customSections: [...(draft.customSections ?? []), nextSection],
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#FAFAFA] text-[#141413] border border-[#D4D4CE] rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Custom Section</span>
              </button>
            </div>
          </div>

          {(draft.customSections ?? []).length > 0 && (
            <div className="space-y-3">
              {(draft.customSections ?? []).map((sec, idx) => (
                <div
                  key={sec.id}
                  className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={sec.heading}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customSections: (draft.customSections ?? []).map(
                            (s, i) =>
                              i === idx ? { ...s, heading: e.target.value } : s
                          ),
                        })
                      }
                      placeholder="Section heading"
                      className="sm:col-span-5 h-8 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded"
                    />
                    <select
                      value={sec.placement}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customSections: (draft.customSections ?? []).map(
                            (s, i) =>
                              i === idx
                                ? {
                                    ...s,
                                    placement: e.target.value as CustomSectionPlacement,
                                  }
                                : s
                          ),
                        })
                      }
                      className="sm:col-span-3 h-8 px-2 text-xs bg-white border border-[#D4D4CE] rounded"
                    >
                      <option value="hero">Below Hero</option>
                      <option value="catalog">Above Catalog</option>
                      <option value="features">Features Section</option>
                    </select>
                    <input
                      type="color"
                      value={sec.backgroundColor || '#FFFFFF'}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customSections: (draft.customSections ?? []).map(
                            (s, i) =>
                              i === idx
                                ? { ...s, backgroundColor: e.target.value }
                                : s
                          ),
                        })
                      }
                      aria-label="Section background color"
                      className="sm:col-span-1 h-8 w-full p-0.5 bg-white border border-[#D4D4CE] rounded cursor-pointer"
                    />
                    <input
                      type="color"
                      value={sec.textColor || '#141413'}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customSections: (draft.customSections ?? []).map(
                            (s, i) =>
                              i === idx ? { ...s, textColor: e.target.value } : s
                          ),
                        })
                      }
                      aria-label="Section text color"
                      className="sm:col-span-1 h-8 w-full p-0.5 bg-white border border-[#D4D4CE] rounded cursor-pointer"
                    />
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            customSections: (draft.customSections ?? []).filter(
                              (_, i) => i !== idx
                            ),
                          })
                        }
                        aria-label={`Delete ${sec.heading}`}
                        className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={sec.body}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        customSections: (draft.customSections ?? []).map((s, i) =>
                          i === idx ? { ...s, body: e.target.value } : s
                        ),
                      })
                    }
                    placeholder="Section text..."
                    className="w-full p-2 text-xs bg-white border border-[#D4D4CE] rounded"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={sec.imageUrl ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customSections: (draft.customSections ?? []).map(
                            (s, i) =>
                              i === idx ? { ...s, imageUrl: e.target.value } : s
                          ),
                        })
                      }
                      placeholder="Section photo or video URL (optional)"
                      className="flex-1 min-w-[160px] h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                    <label className="inline-flex items-center gap-1 h-8 px-2.5 text-[11px] font-medium bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>
                        {uploadingTarget === `section:${idx}`
                          ? `Uploading ${uploadProgress}%`
                          : 'Upload 1+ Photos / Videos'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingTarget !== null}
                        onChange={(e) => handleMediaUpload(e, `section:${idx}`)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  {(sec.mediaGallery ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(sec.mediaGallery ?? []).map((mediaUrl, gIdx) => (
                        <div
                          key={`${mediaUrl}-${gIdx}`}
                          className="relative w-14 h-10 rounded border border-[#D4D4CE] bg-white overflow-hidden"
                        >
                          <ResilientImage
                            src={mediaUrl}
                            alt={`Article gallery ${gIdx + 1}`}
                            mode="thumb"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                customSections: (draft.customSections ?? []).map((s, i) =>
                                  i === idx
                                    ? {
                                        ...s,
                                        mediaGallery: (s.mediaGallery ?? []).filter(
                                          (_, j) => j !== gIdx
                                        ),
                                      }
                                    : s
                                ),
                              })
                            }
                            aria-label="Remove section gallery media"
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/95 text-[#141413] flex items-center justify-center text-[10px] leading-none border border-[#D4D4CE] cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Save Bar */}
      <div className="px-6 py-4 bg-white border-t border-[#E4E4E0] flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-[var(--accent)] font-medium">
          {savedNotice ? 'Front page changes published.' : ''}
        </span>
        <button
          type="submit"
          className="px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
        >
          Save Front Page Changes
        </button>
      </div>
    </form>
  );
}
