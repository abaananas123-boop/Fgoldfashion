import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  Copy,
  Film,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  KeyActive,
  MediaAsset,
  OrderRecord,
  OrderTrackingRecord,
  Product,
  ProductCategory,
  ProductVariant,
  SiteConfig,
  SubscriberRecord,
  getCategoryFieldLabels,
} from '../types';
import {
  EDITORIAL_LAB_IMAGE_URL,
  HERO_IMAGE_URL,
} from '../data/products';
import { formatPKR } from '../utils/currency';
import {
  MEDIA_FILE_ACCEPT,
  VIDEO_FILE_ACCEPT,
  detectMediaKind,
  uploadMultipleStoreMediaFiles,
  uploadStoreMediaFile,
} from '../utils/imageUpload';
import { FrontPageEditor } from './FrontPageEditor';
import { GalleryPickerModal } from './GalleryPickerModal';
import { ManagerGalleryPanel } from './ManagerGalleryPanel';
import { OrderTrackingAdminPanel } from './OrderTrackingAdminPanel';
import { ResilientImage } from './ResilientImage';
import { SeoMembersEditor } from './SeoMembersEditor';
import { SocialLinksEditor } from './SocialLinksEditor';
import { StatisticsPanel } from './StatisticsPanel';

export type ManagerTab =
  | 'products'
  | 'orders'
  | 'gallery'
  | 'frontpage'
  | 'social'
  | 'seo-members'
  | 'statistics';

export type ProductModalIntent =
  | { type: 'new' }
  | { type: 'edit'; product: Product }
  | null;

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories?: string[];
  subcategoriesMap?: Record<string, string[]>;
  onAddCategory?: (categoryName: string) => boolean | void;
  onAddSubcategory?: (
    parentCategory: string,
    subcategoryName: string
  ) => boolean | void;
  onSaveProduct: (product: Product, isNew: boolean) => void;
  onDeleteProduct: (productId: string) => void;
  onResetCatalog?: () => void;
  siteConfig: SiteConfig;
  onSaveSiteConfig: (next: SiteConfig) => Promise<boolean> | boolean | void;
  onResetSiteConfig: () => Promise<boolean> | void;
  orders: OrderRecord[];
  trackingRecords?: Record<string, OrderTrackingRecord>;
  onPublishOrderTracking?: (
    order: OrderRecord,
    tracking: OrderTrackingRecord
  ) => Promise<void>;
  onCreateManualOrder?: (
    order: OrderRecord,
    initialTracking: OrderTrackingRecord
  ) => Promise<void>;
  subscribers?: SubscriberRecord[];
  onResetSampleOrders: () => void;
  onClearOrders: () => void;
  onDeleteSubscriber?: (subscriberId: string) => void;
  mediaAssets?: MediaAsset[];
  onAddMediaAssets?: (
    items: Array<{
      title: string;
      url: string;
      mediaKind: 'image' | 'video';
      categoryTag: string;
    }>
  ) => Promise<MediaAsset[] | void> | void;
  onUpdateMediaAsset?: (
    assetId: string,
    patch: { title?: string; categoryTag?: string }
  ) => Promise<void> | void;
  onDeleteMediaAssets?: (assetIds: string[]) => Promise<void> | void;
  initialTab?: ManagerTab;
  initialProductIntent?: ProductModalIntent;
}

const STUDIO_IMAGE_PRESETS = [
  {
    label: 'All Departments',
    url: HERO_IMAGE_URL,
  },
  {
    label: 'Party Wear',
    url: '/src/assets/images/product_party_wear_1795171612744.jpg',
  },
  {
    label: 'Bridal Couture',
    url: '/src/assets/images/product_bridal_dress_1795171611227.jpg',
  },
  {
    label: 'Boutique Edit',
    url: '/src/assets/images/product_boutique_clean_1795093197794.jpg',
  },
  {
    label: 'Western Short',
    url: '/src/assets/images/product_western_short_dress_1795171612445.jpg',
  },
  {
    label: 'Western Long',
    url: '/src/assets/images/product_western_dress_1795084481646.jpg',
  },
  {
    label: 'Kids Girl',
    url: '/src/assets/images/product_kids_girl_dress_1795171612075.jpg',
  },
  {
    label: 'Kids Boy',
    url: '/src/assets/images/product_kids_boy_dress_1795171612307.jpg',
  },
  {
    label: 'Women Jewellery',
    url: '/src/assets/images/product_artificial_jewellery_1795093182654.jpg',
  },
  {
    label: 'Mens Jewellery',
    url: '/src/assets/images/product_mens_jewellery_1795171612766.jpg',
  },
  {
    label: 'Eastern Dress',
    url: '/src/assets/images/product_eastern_dress_1795084480580.jpg',
  },
  {
    label: 'Serum Dropper',
    url: '/src/assets/images/product_barrier_serum_1795082515519.jpg',
  },
  {
    label: 'Perfume Flacon',
    url: '/src/assets/images/product_fig_eau_parfum_1795082517674.jpg',
  },
];

function createEmptyProduct(defaultCategory = 'Boutique'): Product {
  const uid = `${Date.now().toString(36)}`;
  return {
    id: `custom-${uid}`,
    name: '',
    subtitle: '',
    category: defaultCategory,
    price: 6500,
    volume: 'Standard Size / 1 Set',
    statusNote: 'New Arrival',
    imageUrl: '/src/assets/images/product_boutique_clean_1795093197794.jpg',
    description: '',
    skinTypes: 'Regular Fit / Everyday Use',
    finish: 'Signature Craft Finish',
    keyActives: [
      {
        name: 'Primary Material & Craft',
        concentration: 'Grade A',
        benefit: 'Designed for lasting quality, comfort, and daily elegance.',
      },
    ],
    fullIngredients: 'Full material, fabric, or ingredient details verified by f. Gold & fashion.',
    howToUse: 'Follow recommended care or usage instructions for lasting quality.',
    variants: [
      {
        id: `var-${uid}-1`,
        name: 'Standard Edition',
        detail: 'Signature store selection',
        priceDelta: 0,
        inStock: true,
      },
    ],
  };
}

export function CatalogManagerModal({
  isOpen,
  onClose,
  products,
  categories = DEFAULT_CATEGORIES,
  subcategoriesMap = DEFAULT_SUBCATEGORIES,
  onAddCategory,
  onAddSubcategory,
  onSaveProduct,
  onDeleteProduct,
  siteConfig,
  onSaveSiteConfig,
  onResetSiteConfig,
  orders,
  trackingRecords = {},
  onPublishOrderTracking,
  onCreateManualOrder,
  subscribers = [],
  onResetSampleOrders,
  onClearOrders,
  onDeleteSubscriber,
  mediaAssets = [],
  onAddMediaAssets,
  onUpdateMediaAsset,
  onDeleteMediaAssets,
  initialTab = 'products',
  initialProductIntent = null,
}: CatalogManagerModalProps) {
  const [activeTab, setActiveTab] = useState<ManagerTab>(initialTab);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<
    string | null
  >(null);
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [isNewProduct, setIsNewProduct] = useState(true);
  const [draft, setDraft] = useState<Product>(() =>
    createEmptyProduct(categories[0] || 'Boutique')
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<
    'imageUrl' | 'videoUrl' | 'gallery' | null
  >(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [galleryPasteUrl, setGalleryPasteUrl] = useState('');
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);
  const [galleryPickerTarget, setGalleryPickerTarget] = useState<
    'imageUrl' | 'gallery' | 'videoUrl' | null
  >(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [inlineSubcategoryName, setInlineSubcategoryName] = useState('');

  const categoryOptions: ProductCategory[] = Array.from(
    new Set([
      ...categories,
      ...(draft.category?.trim() ? [draft.category.trim()] : []),
    ])
  );
  const subcategoryOptions: string[] = Array.from(
    new Set([
      ...(subcategoriesMap[draft.category] ?? []),
      ...(draft.subcategory?.trim() ? [draft.subcategory.trim()] : []),
    ])
  );
  const fieldLabels = getCategoryFieldLabels(draft.category);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isOpen;
    if (!isOpen) return;
    if (!wasOpen) {
      setActiveTab(initialTab);
      setIsAddingCategory(false);
      setInlineCategoryName('');
      setIsAddingSubcategory(false);
      setInlineSubcategoryName('');
      setFormError(null);
    }
    if (initialTab === 'products' && initialProductIntent?.type === 'new') {
      setDraft(createEmptyProduct(categoriesRef.current[0] || 'Boutique'));
      setIsNewProduct(true);
      setMode('form');
    } else if (
      initialTab === 'products' &&
      initialProductIntent?.type === 'edit'
    ) {
      const target = initialProductIntent.product;
      setDraft({
        ...target,
        variants: target.variants.map((v) => ({ ...v })),
        keyActives: target.keyActives.map((a) => ({ ...a })),
      });
      setIsNewProduct(false);
      setMode('form');
    } else if (!wasOpen) {
      setMode('list');
    }
  }, [isOpen, initialTab, initialProductIntent]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const startNewProduct = () => {
    setDraft(createEmptyProduct(categories[0] || 'Boutique'));
    setIsNewProduct(true);
    setFormError(null);
    setIsAddingCategory(false);
    setMode('form');
  };

  const startEditProduct = (product: Product) => {
    setDraft({
      ...product,
      variants: product.variants.map((v) => ({ ...v })),
      keyActives: product.keyActives.map((a) => ({ ...a })),
    });
    setIsNewProduct(false);
    setFormError(null);
    setMode('form');
  };

  const handleDuplicate = (product: Product) => {
    const uid = Date.now().toString(36);
    const duplicated: Product = {
      ...product,
      id: `${product.id}-copy-${uid}`,
      name: `${product.name} (Copy)`,
      variants: product.variants.map((v, idx) => ({
        ...v,
        id: `${v.id}-copy-${uid}-${idx}`,
      })),
      keyActives: product.keyActives.map((a) => ({ ...a })),
    };
    onSaveProduct(duplicated, true);
  };

  const handleMediaUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    field: 'imageUrl' | 'videoUrl'
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    setFormError(null);
    setUploadingField(field);
    setUploadProgress(2);
    try {
      if (files.length === 1) {
        const uploaded = await uploadStoreMediaFile(files[0], {
          videoOnly: field === 'videoUrl',
          onProgress: (pct) => setUploadProgress(pct),
        });
        setDraft((prev) => ({ ...prev, [field]: uploaded.url }));
        if (onAddMediaAssets) {
          void Promise.resolve(
            onAddMediaAssets([
              {
                title: files[0].name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Product Media',
                url: uploaded.url,
                mediaKind: uploaded.mediaKind,
                categoryTag: draft.category || 'General',
              },
            ])
          ).catch(() => {});
        }
      } else {
        const uploaded = await uploadMultipleStoreMediaFiles(files, {
          videoOnly: field === 'videoUrl',
          onProgress: (pct) => setUploadProgress(pct),
        });
        const [first, ...rest] = uploaded;
        setDraft((prev) => {
          const existingGallery = prev.mediaGallery ?? [];
          const nextGallery = Array.from(
            new Set([...existingGallery, ...rest.map((r) => r.url)])
          ).slice(0, 12);
          return {
            ...prev,
            [field]: first ? first.url : prev[field],
            mediaGallery: nextGallery,
          };
        });
        if (onAddMediaAssets && uploaded.length > 0) {
          void Promise.resolve(
            onAddMediaAssets(
              uploaded.map((u) => ({
                title: u.fileName.replace(/\.[^.]+$/, '').slice(0, 120) || 'Product Media',
                url: u.url,
                mediaKind: u.mediaKind,
                categoryTag: draft.category || 'General',
              }))
            )
          ).catch(() => {});
        }
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Could not upload selected media file.'
      );
    } finally {
      setUploadingField(null);
      setUploadProgress(0);
    }
  };

  const handleBatchGalleryFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    setFormError(null);
    setUploadingField('gallery');
    setUploadProgress(2);
    try {
      const uploaded = await uploadMultipleStoreMediaFiles(fileArr, {
        maxFiles: 12,
        onProgress: (pct) => setUploadProgress(pct),
      });
      if (uploaded.length > 0) {
        setDraft((prev) => {
          const urls = uploaded.map((item) => item.url);
          const nextGallery = Array.from(
            new Set([...(prev.mediaGallery ?? []), ...urls])
          ).slice(0, 12);
          return {
            ...prev,
            mediaGallery: nextGallery,
          };
        });
        if (onAddMediaAssets) {
          void Promise.resolve(
            onAddMediaAssets(
              uploaded.map((item) => ({
                title:
                  item.fileName.replace(/\.[^.]+$/, '').slice(0, 120) ||
                  'Product Media',
                url: item.url,
                mediaKind: item.mediaKind,
                categoryTag: draft.category || 'General',
              }))
            )
          ).catch(() => {});
        }
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Could not upload selected photos or videos.'
      );
    } finally {
      setUploadingField(null);
      setUploadProgress(0);
    }
  };

  const handleCreateProductFromGalleryAssets = (selectedAssets: MediaAsset[]) => {
    if (selectedAssets.length === 0) return;
    const tagSet = new Set(
      selectedAssets
        .map((a) => a.categoryTag)
        .filter((t) => t && t !== 'General' && categories.includes(t))
    );
    const matchedCategory =
      tagSet.size === 1 ? Array.from(tagSet)[0] : categories[0] || 'Boutique';

    const base = createEmptyProduct(matchedCategory);
    const firstImage = selectedAssets.find((a) => a.mediaKind === 'image');
    const firstVideo = selectedAssets.find((a) => a.mediaKind === 'video');
    const primaryUrl = firstImage?.url || selectedAssets[0].url;
    const extras = selectedAssets
      .map((a) => a.url)
      .filter((u) => u && u !== primaryUrl && u !== firstVideo?.url);

    setDraft({
      ...base,
      name: selectedAssets.length === 1 ? selectedAssets[0].title : '',
      imageUrl: primaryUrl,
      videoUrl: firstVideo?.url || '',
      mediaGallery: Array.from(new Set(extras)).slice(0, 12),
    });
    setIsNewProduct(true);
    setFormError(null);
    setActiveTab('products');
    setMode('form');
  };

  const handleApplyGalleryPickerSelection = (picked: MediaAsset[]) => {
    if (picked.length === 0 || !galleryPickerTarget) return;
    if (galleryPickerTarget === 'imageUrl') {
      setDraft((prev) => ({ ...prev, imageUrl: picked[0].url }));
    } else if (galleryPickerTarget === 'videoUrl') {
      setDraft((prev) => ({ ...prev, videoUrl: picked[0].url }));
    } else if (galleryPickerTarget === 'gallery') {
      setDraft((prev) => ({
        ...prev,
        mediaGallery: Array.from(
          new Set([...(prev.mediaGallery ?? []), ...picked.map((p) => p.url)])
        ).slice(0, 12),
      }));
    }
    setGalleryPickerTarget(null);
  };

  const handleGalleryDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingGallery(false);
    if (uploadingField !== null) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleBatchGalleryFiles(e.dataTransfer.files);
    }
  };

  const addGalleryUrlManual = () => {
    const clean = galleryPasteUrl.trim();
    if (!clean) return;
    setDraft((prev) => ({
      ...prev,
      mediaGallery: Array.from(new Set([...(prev.mediaGallery ?? []), clean])).slice(0, 12),
    }));
    setGalleryPasteUrl('');
  };

  const removeGalleryUrl = (urlToRemove: string) => {
    setDraft((prev) => ({
      ...prev,
      mediaGallery: (prev.mediaGallery ?? []).filter((u) => u !== urlToRemove),
    }));
  };

  const setGalleryUrlAsMain = (urlToPromote: string) => {
    setDraft((prev) => {
      const oldMain = prev.imageUrl?.trim();
      const rest = (prev.mediaGallery ?? []).filter((u) => u !== urlToPromote);
      const nextGallery =
        oldMain && oldMain !== urlToPromote
          ? Array.from(new Set([oldMain, ...rest])).slice(0, 12)
          : rest;
      return {
        ...prev,
        imageUrl: urlToPromote,
        mediaGallery: nextGallery,
      };
    });
  };

  const addVariantRow = () => {
    const uid = Date.now().toString(36);
    const next: ProductVariant = {
      id: `var-${uid}-${draft.variants.length + 1}`,
      name: '',
      detail: '',
      hex:
        draft.category === 'Artificial Jewellery' || draft.category === 'Boutique'
          ? '#C59B43'
          : undefined,
      priceDelta: 0,
      inStock: true,
    };
    setDraft((prev) => ({ ...prev, variants: [...prev.variants, next] }));
  };

  const updateVariant = (index: number, patch: Partial<ProductVariant>) => {
    setDraft((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  };

  const removeVariant = (index: number) => {
    if (draft.variants.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const applyVariantPreset = (
    presetType: 'shades' | 'sizes' | 'dress-sizes' | 'baby-ages'
  ) => {
    const uid = Date.now().toString(36);
    if (presetType === 'shades') {
      setDraft((prev) => ({
        ...prev,
        variants: [
          {
            id: `var-${uid}-1`,
            name: '01 Rosewood',
            detail: 'Warm neutral rose',
            hex: '#A15A56',
            inStock: true,
          },
          {
            id: `var-${uid}-2`,
            name: '02 Velvet Plum',
            detail: 'Deep berry undertone',
            hex: '#6D2932',
            inStock: true,
          },
          {
            id: `var-${uid}-3`,
            name: '03 Soft Petal',
            detail: 'Sheer everyday blush',
            hex: '#C47775',
            inStock: true,
          },
        ],
      }));
    } else if (presetType === 'dress-sizes') {
      setDraft((prev) => ({
        ...prev,
        variants: [
          {
            id: `var-${uid}-1`,
            name: 'Small (36" Chest)',
            detail: 'Tailored boutique Small',
            priceDelta: 0,
            inStock: true,
          },
          {
            id: `var-${uid}-2`,
            name: 'Medium (40" Chest)',
            detail: 'Tailored boutique Medium',
            priceDelta: 0,
            inStock: true,
          },
          {
            id: `var-${uid}-3`,
            name: 'Large (44" Chest)',
            detail: 'Tailored boutique Large',
            priceDelta: 0,
            inStock: true,
          },
        ],
      }));
    } else if (presetType === 'baby-ages') {
      setDraft((prev) => ({
        ...prev,
        volume: prev.volume || '1 Month – 10 Years',
        variants: [
          {
            id: `var-${uid}-1`,
            name: '1–12 Months',
            detail: 'Infant fit (56–80 cm)',
            priceDelta: 0,
            inStock: true,
          },
          {
            id: `var-${uid}-2`,
            name: '1–3 Years',
            detail: 'Toddler fit (82–98 cm)',
            priceDelta: 300,
            inStock: true,
          },
          {
            id: `var-${uid}-3`,
            name: '4–6 Years',
            detail: 'Little kids fit (104–116 cm)',
            priceDelta: 700,
            inStock: true,
          },
          {
            id: `var-${uid}-4`,
            name: '7–10 Years',
            detail: 'Junior kids fit (122–140 cm)',
            priceDelta: 1100,
            inStock: true,
          },
        ],
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        variants: [
          {
            id: `var-${uid}-1`,
            name: '30 ml Standard',
            detail: 'Apothecary glass bottle',
            priceDelta: 0,
            inStock: true,
          },
          {
            id: `var-${uid}-2`,
            name: '50 ml Atelier Size',
            detail: 'Extended refillable bottle',
            priceDelta: 4500,
            inStock: true,
          },
        ],
      }));
    }
  };

  const addActiveRow = () => {
    const next: KeyActive = { name: '', concentration: '', benefit: '' };
    setDraft((prev) => ({ ...prev, keyActives: [...prev.keyActives, next] }));
  };

  const updateActive = (index: number, patch: Partial<KeyActive>) => {
    setDraft((prev) => ({
      ...prev,
      keyActives: prev.keyActives.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  };

  const removeActive = (index: number) => {
    if (draft.keyActives.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      keyActives: prev.keyActives.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (uploadingField !== null) {
      setFormError('Please wait for your photo/video upload to finish (100%) before saving.');
      return;
    }
    if (!draft.name.trim()) {
      setFormError('Please enter a product name.');
      return;
    }
    if (!draft.description.trim()) {
      setFormError('Please enter a product description.');
      return;
    }
    if (!Number.isFinite(draft.price) || draft.price <= 0) {
      setFormError('Please enter a valid price in Pakistani Rupees (PKR).');
      return;
    }

    const cleanedVariants = draft.variants
      .filter((v) => v.name.trim().length > 0)
      .map((v, idx) => ({
        ...v,
        id: v.id || `var-${Date.now()}-${idx}`,
        name: v.name.trim(),
        detail: v.detail.trim() || 'Signature finish',
      }));

    if (cleanedVariants.length === 0) {
      setFormError('Include at least one shade or size variant.');
      return;
    }

    const cleanedActives = draft.keyActives
      .filter((a) => a.name.trim().length > 0)
      .map((a) => ({
        name: a.name.trim(),
        concentration: a.concentration.trim() || 'Spec',
        benefit: a.benefit.trim() || 'Verified quality across store standards.',
      }));

    const normalizedStock =
      typeof draft.stockQuantity === 'number' && Number.isFinite(draft.stockQuantity)
        ? Math.max(0, Math.min(100000, Math.round(draft.stockQuantity)))
        : undefined;

    const finalProduct: Product = {
      ...draft,
      name: draft.name.trim(),
      subcategory: draft.subcategory?.trim() || undefined,
      subtitle: draft.subtitle.trim() || `${draft.category} Selection`,
      volume: draft.volume.trim() || 'Standard',
      stockQuantity: normalizedStock,
      statusNote: draft.statusNote?.trim() || undefined,
      imageUrl: draft.imageUrl.trim() || STUDIO_IMAGE_PRESETS[1].url,
      videoUrl: draft.videoUrl?.trim() || undefined,
      mediaGallery:
        draft.mediaGallery && draft.mediaGallery.length > 0
          ? Array.from(
              new Set(
                draft.mediaGallery
                  .map((u) => u.trim())
                  .filter((u) => Boolean(u) && u !== draft.imageUrl.trim())
              )
            ).slice(0, 12)
          : undefined,
      description: draft.description.trim(),
      skinTypes: draft.skinTypes.trim() || 'Standard Fit / Everyday',
      finish: draft.finish.trim() || 'Signature Finish',
      fullIngredients:
        draft.fullIngredients.trim() || 'Full specifications verified in store.',
      howToUse:
        draft.howToUse.trim() || 'Follow standard care or usage guidelines.',
      variants: cleanedVariants,
      keyActives:
        cleanedActives.length > 0
          ? cleanedActives
          : [
              {
                name: 'Primary Material & Craft',
                concentration: 'Grade A',
                benefit: 'Selected for lasting finish and comfort.',
              },
            ],
    };

    onSaveProduct(finalProduct, isNewProduct);
    setMode('list');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Store Catalog Manager"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3 sm:py-0 sm:h-16 bg-white border-b border-[#E4E4E0] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-5 min-w-0 flex-1">
            <h2 className="font-serif text-2xl font-medium text-[#141413] whitespace-nowrap shrink-0">
              Store Manager
            </h2>

            <div
              role="tablist"
              aria-label="Store manager sections"
              className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-md overflow-x-auto max-w-full"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'products'}
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Products ({products.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'orders'}
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Orders &amp; Tracking ({orders.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'gallery'}
                onClick={() => setActiveTab('gallery')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'gallery'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Gallery ({mediaAssets.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'frontpage'}
                onClick={() => setActiveTab('frontpage')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'frontpage'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Front Page Details
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'social'}
                onClick={() => setActiveTab('social')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'social'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Social &amp; WhatsApp
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'seo-members'}
                onClick={() => setActiveTab('seo-members')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'seo-members'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                SEO &amp; Members
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'statistics'}
                onClick={() => setActiveTab('statistics')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'statistics'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                Statistics
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'products' &&
              (mode === 'list' ? (
                <button
                  type="button"
                  onClick={startNewProduct}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-3.5 py-2 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Back to Products
                </button>
              ))}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close store manager"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#F2F2F0] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MANAGER MEDIA GALLERY TAB */}
        {activeTab === 'gallery' && (
          <ManagerGalleryPanel
            mediaAssets={mediaAssets}
            categories={categories}
            products={products}
            onAddMediaAssets={onAddMediaAssets ?? (async () => {})}
            onUpdateMediaAsset={onUpdateMediaAsset ?? (async () => {})}
            onDeleteMediaAssets={onDeleteMediaAssets ?? (async () => {})}
            onCreateProductFromMedia={handleCreateProductFromGalleryAssets}
          />
        )}

        {/* FRONT PAGE EDITOR TAB */}
        {activeTab === 'frontpage' && (
          <FrontPageEditor
            siteConfig={siteConfig}
            products={products}
            onSaveSiteConfig={onSaveSiteConfig}
            onResetSiteConfig={onResetSiteConfig}
          />
        )}

        {/* SOCIAL & WHATSAPP EDITOR TAB */}
        {activeTab === 'social' && (
          <SocialLinksEditor
            siteConfig={siteConfig}
            onSaveSiteConfig={onSaveSiteConfig}
          />
        )}

        {/* SEO & TEAM MEMBERS EDITOR TAB */}
        {activeTab === 'seo-members' && (
          <SeoMembersEditor
            siteConfig={siteConfig}
            onSaveSiteConfig={onSaveSiteConfig}
          />
        )}

        {/* ORDERS & TRACKING PUBLISHER TAB */}
        {activeTab === 'orders' && (
          <OrderTrackingAdminPanel
            orders={orders}
            trackingRecords={trackingRecords}
            storeName={siteConfig.storeName}
            initialSelectedOrderNumber={selectedOrderForTracking}
            onPublishTracking={
              onPublishOrderTracking ?? (async () => {})
            }
            onCreateManualOrder={onCreateManualOrder}
            onResetSampleOrders={onResetSampleOrders}
          />
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <StatisticsPanel
            orders={orders}
            subscribers={subscribers}
            products={products}
            categories={categories}
            accentColor={siteConfig.accentColor}
            storeName={siteConfig.storeName}
            storeWhatsappNumber={siteConfig.socialLinks.whatsappNumber}
            onResetSampleOrders={onResetSampleOrders}
            onClearOrders={onClearOrders}
            onDeleteSubscriber={onDeleteSubscriber}
            onManageOrderTracking={(orderNumber) => {
              setSelectedOrderForTracking(orderNumber);
              setActiveTab('orders');
            }}
          />
        )}

        {/* PRODUCTS LIST VIEW */}
        {activeTab === 'products' && mode === 'list' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E4E0]">
              <p className="text-xs text-[#5A5A56]">
                Add new products across any department, update PKR prices, manage size or color variants, or edit specifications. Changes save automatically to your storefront.
              </p>
              <button
                type="button"
                onClick={startNewProduct}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Product</span>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white border border-[#E4E4E0] rounded-lg">
                <p className="font-serif text-xl text-[#141413] mb-1">
                  No products in catalog yet
                </p>
                <p className="text-xs text-[#5A5A56] mb-4">
                  Click &ldquo;Add New Product&rdquo; to publish your own products, photos, videos, and PKR pricing.
                </p>
                <button
                  type="button"
                  onClick={startNewProduct}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Product</span>
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[#E4E4E0] bg-white border border-[#E4E4E0] rounded-lg">
                {products.map((product) => (
                <li
                  key={product.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-12 rounded overflow-hidden bg-[#F2F2F0] border border-[#E4E4E0] shrink-0">
                      <ResilientImage
                        src={product.imageUrl}
                        alt={product.name}
                        mode="thumb"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-lg font-medium text-[#141413] truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-[#5A5A56] tabular-nums">
                        {product.category}
                        {product.subcategory ? (
                          <>
                            {' '}
                            <span aria-hidden="true">·</span> {product.subcategory}
                          </>
                        ) : null}{' '}
                        <span aria-hidden="true">·</span> {product.volume}{' '}
                        <span aria-hidden="true">·</span>{' '}
                        <span className="font-semibold text-[#141413]">
                          {formatPKR(product.price)}
                        </span>{' '}
                        <span aria-hidden="true">·</span> {product.variants.length}{' '}
                        {product.variants.length === 1 ? 'variant' : 'variants'}
                        {product.videoUrl ? (
                          <>
                            {' '}
                            <span aria-hidden="true">·</span> Video
                          </>
                        ) : null}
                        {typeof product.stockQuantity === 'number' ? (
                          <>
                            {' '}
                            <span aria-hidden="true">·</span>{' '}
                            <span
                              className={
                                product.stockQuantity <= 5
                                  ? 'font-semibold text-[var(--accent)]'
                                  : ''
                              }
                            >
                              {product.stockQuantity === 0
                                ? 'Sold Out'
                                : product.stockQuantity <= 5
                                  ? `${product.stockQuantity} left (Grab Fast)`
                                  : `${product.stockQuantity} in stock`}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditProduct(product)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(product)}
                      title="Duplicate product as starting template"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] hover:border-[#141413] transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(product.id)}
                      aria-label={`Delete ${product.name}`}
                      className="p-2 text-[#5A5A56] hover:text-[#6D2932] border border-transparent hover:border-[#E4E4E0] rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
              </ul>
            )}
          </div>
        )}

        {/* ADD / EDIT FORM VIEW */}
        {activeTab === 'products' && mode === 'form' && (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div
                  role="alert"
                  className="p-3 text-xs text-[#6D2932] bg-[#6D2932]/10 border border-[#6D2932]/25 rounded-md"
                >
                  {formError}
                </div>
              )}

              {/* Section 1: Core Product Info */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                  1. Product Basics &amp; PKR Pricing
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="e.g., Silk Shawl Tote, Kundan Set, or Glow Serum"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Subtitle / Key Note
                    </label>
                    <input
                      type="text"
                      value={draft.subtitle}
                      onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                      placeholder="e.g., Hand-Embroidered Silk or 24K Gold-Plated"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="block text-xs font-medium text-[#141413]">
                        Category
                      </label>
                      {onAddCategory && (
                        <button
                          type="button"
                          onClick={() => setIsAddingCategory((prev) => !prev)}
                          className="text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          {isAddingCategory ? 'Cancel' : '+ New'}
                        </button>
                      )}
                    </div>
                    {isAddingCategory && onAddCategory ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          maxLength={60}
                          value={inlineCategoryName}
                          onChange={(e) => setInlineCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="flex-1 min-w-0 h-10 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const clean = inlineCategoryName.trim().slice(0, 60);
                            if (!clean) return;
                            onAddCategory(clean);
                            setDraft({ ...draft, category: clean, subcategory: '' });
                            setInlineCategoryName('');
                            setIsAddingCategory(false);
                          }}
                          className="h-10 px-2.5 text-xs font-medium bg-[#141413] text-white rounded-md cursor-pointer shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        value={draft.category}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            category: e.target.value as ProductCategory,
                            subcategory: '',
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-medium bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                      >
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="block text-xs font-medium text-[#141413]">
                        Subcategory
                      </label>
                      {onAddSubcategory && (
                        <button
                          type="button"
                          onClick={() => setIsAddingSubcategory((prev) => !prev)}
                          className="text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          {isAddingSubcategory ? 'Cancel' : '+ New'}
                        </button>
                      )}
                    </div>
                    {isAddingSubcategory && onAddSubcategory ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          maxLength={60}
                          value={inlineSubcategoryName}
                          onChange={(e) => setInlineSubcategoryName(e.target.value)}
                          placeholder="Subcategory"
                          className="flex-1 min-w-0 h-10 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const clean = inlineSubcategoryName.trim().slice(0, 60);
                            if (!clean) return;
                            onAddSubcategory(draft.category, clean);
                            setDraft({ ...draft, subcategory: clean });
                            setInlineSubcategoryName('');
                            setIsAddingSubcategory(false);
                          }}
                          className="h-10 px-2.5 text-xs font-medium bg-[#141413] text-white rounded-md cursor-pointer shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        value={draft.subcategory ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            subcategory: e.target.value,
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-medium bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                      >
                        <option value="">General / All</option>
                        {subcategoryOptions.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Price (Rs. PKR) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={draft.price}
                      onChange={(e) =>
                        setDraft({ ...draft, price: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 text-sm tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      {fieldLabels.volumeLabel}
                    </label>
                    <input
                      type="text"
                      value={draft.volume}
                      onChange={(e) => setDraft({ ...draft, volume: e.target.value })}
                      placeholder={fieldLabels.volumePlaceholder}
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Optional Tag
                    </label>
                    <input
                      type="text"
                      value={draft.statusNote ?? ''}
                      onChange={(e) =>
                        setDraft({ ...draft, statusNote: e.target.value })
                      }
                      placeholder="Bestseller"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label
                      htmlFor="product-stock-qty-input"
                      className="block text-xs font-medium text-[#141413] mb-1"
                    >
                      Stock Quantity (Optional — shows &ldquo;Grab fast&rdquo; when 5 or fewer left)
                    </label>
                    <input
                      id="product-stock-qty-input"
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      value={
                        typeof draft.stockQuantity === 'number'
                          ? draft.stockQuantity
                          : ''
                      }
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        setDraft({
                          ...draft,
                          stockQuantity:
                            raw === ''
                              ? undefined
                              : Math.max(0, Math.min(100000, Math.round(Number(raw) || 0))),
                        });
                      }}
                      placeholder="Type quantity (e.g., 5 for low-stock urgency, or leave blank)"
                      className="w-full h-10 px-3 text-sm tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                  <p className="text-[11px] text-[#5A5A56] pb-2">
                    {typeof draft.stockQuantity === 'number' && draft.stockQuantity > 0 && draft.stockQuantity <= 5
                      ? `Customer view will display: "Only ${draft.stockQuantity} left — Grab fast!"`
                      : draft.stockQuantity === 0
                        ? 'Customer view will display: "Sold Out" and pause Quick Add.'
                        : 'Enter 1–5 to highlight urgency on the customer home page.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Describe craftsmanship, design, fit, or key product highlights..."
                    className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                  />
                </div>
              </div>

              {/* Section 2: Primary Photo / Video (Any Resolution or Type) + Dedicated Product Video */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                    2. Product Photos &amp; Videos (Any Resolution or Format)
                  </h3>
                  {uploadingField !== null && (
                    <span className="text-[11px] font-medium tabular-nums text-[#141413]">
                      Uploading {uploadProgress}%
                    </span>
                  )}
                </div>

                {uploadingField !== null && (
                  <div className="space-y-1">
                    <progress
                      value={uploadProgress}
                      max={100}
                      aria-label="Media upload progress"
                      className="w-full h-1.5 rounded-full overflow-hidden accent-[#141413]"
                    />
                  </div>
                )}

                {formError && (
                  <div
                    role="alert"
                    className="p-2.5 text-xs text-[#6D2932] bg-[#6D2932]/10 border border-[#6D2932]/25 rounded-md"
                  >
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  <div className="md:col-span-4 aspect-[4/3] rounded-md overflow-hidden border border-[#E4E4E0] bg-[#F2F2F0]">
                    <ResilientImage
                      src={draft.imageUrl}
                      alt={draft.name || 'Product preview'}
                      fallbackLabel="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="md:col-span-8 space-y-3">
                    <label className="block text-xs font-medium text-[#141413]">
                      Primary Product Photo or Video *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={draft.imageUrl}
                        onChange={(e) =>
                          setDraft({ ...draft, imageUrl: e.target.value })
                        }
                        placeholder="Paste image/video URL (MP4, MOV, WebM, YouTube, Vimeo) or upload..."
                        aria-label="Primary product photo or video URL"
                        className="flex-1 min-w-[200px] h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                      />
                      <label className="inline-flex items-center gap-1.5 h-10 px-3.5 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingField === 'imageUrl'
                            ? `Uploading ${uploadProgress}%`
                            : 'Upload Photo / Video'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept={MEDIA_FILE_ACCEPT}
                          disabled={uploadingField !== null}
                          onChange={(e) => handleMediaUpload(e, 'imageUrl')}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setGalleryPickerTarget('imageUrl')}
                        className="inline-flex items-center gap-1.5 h-10 px-3 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer whitespace-nowrap"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Choose from Gallery</span>
                      </button>
                    </div>

                    <div>
                      <p className="text-[11px] text-[#5A5A56] mb-2">
                        Or pick a studio photography preset:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {STUDIO_IMAGE_PRESETS.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() =>
                              setDraft({ ...draft, imageUrl: preset.url })
                            }
                            className={`px-2.5 py-1.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                              draft.imageUrl === preset.url
                                ? 'border-[#141413] bg-[#141413] text-white'
                                : 'border-[#D4D4CE] bg-[#FAFAFA] text-[#5A5A56] hover:text-[#141413]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Photo & Multi-Video Batch Upload Gallery */}
                <div className="pt-4 border-t border-[#F0F0EC] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-medium text-[#141413]">
                        Additional Photos &amp; Videos Gallery ({(draft.mediaGallery ?? []).length}/12)
                      </label>
                      <p className="text-[11px] text-[#5A5A56]">
                        Select or drag-and-drop one or multiple photos &amp; videos at once for fast parallel upload.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGalleryPickerTarget('gallery')}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer whitespace-nowrap"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Add from Gallery</span>
                      </button>
                      <label className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingField === 'gallery'
                            ? `Uploading ${uploadProgress}%`
                            : 'Upload 1 or More Photos & Videos'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept={MEDIA_FILE_ACCEPT}
                          disabled={uploadingField !== null}
                          onChange={(e) => {
                            if (e.target.files) {
                              void handleBatchGalleryFiles(e.target.files);
                            }
                            e.target.value = '';
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingGallery(true);
                    }}
                    onDragLeave={() => setIsDraggingGallery(false)}
                    onDrop={handleGalleryDrop}
                    className={`p-3.5 rounded-md border border-dashed transition-colors ${
                      isDraggingGallery
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[#D4D4CE] bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={galleryPasteUrl}
                        onChange={(e) => setGalleryPasteUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addGalleryUrlManual();
                          }
                        }}
                        placeholder="Drop photos/videos here, or paste an image/video link and click Add..."
                        className="flex-1 min-w-[200px] h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
                      />
                      <button
                        type="button"
                        onClick={addGalleryUrlManual}
                        disabled={!galleryPasteUrl.trim()}
                        className="h-9 px-3 text-xs font-medium bg-white border border-[#D4D4CE] text-[#141413] rounded-md hover:border-[#141413] disabled:opacity-40 cursor-pointer"
                      >
                        + Add URL
                      </button>
                    </div>

                    {(draft.mediaGallery ?? []).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 mt-3">
                        {(draft.mediaGallery ?? []).map((mediaUrl, idx) => {
                          const isVid = detectMediaKind(mediaUrl) !== 'image';
                          return (
                            <div
                              key={`${mediaUrl}-${idx}`}
                              className="group relative aspect-[4/3] rounded border border-[#D4D4CE] bg-white overflow-hidden"
                            >
                              <ResilientImage
                                src={mediaUrl}
                                alt={`Gallery item ${idx + 1}`}
                                mode="thumb"
                                className="w-full h-full object-cover"
                              />
                              {isVid && (
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-medium inline-flex items-center gap-0.5 pointer-events-none">
                                  <Film className="w-2.5 h-2.5" />
                                  <span>Video</span>
                                </span>
                              )}
                              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => setGalleryUrlAsMain(mediaUrl)}
                                  className="px-1.5 py-0.5 text-[10px] font-medium bg-white/95 text-[#141413] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                                >
                                  Set Main
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeGalleryUrl(mediaUrl)}
                                  aria-label="Remove gallery item"
                                  className="p-1 bg-white/95 text-[#5A5A56] hover:text-[var(--accent)] border border-[#D4D4CE] rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Dedicated Product Showcase Video */}
                <div className="pt-4 border-t border-[#F0F0EC] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-[#141413]">
                      Featured Product Video (Optional — MP4, MOV, WebM, MKV, AVI, YouTube/Vimeo)
                    </label>
                    {draft.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, videoUrl: '' })}
                        className="text-[11px] font-medium text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        Remove Video
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={draft.videoUrl ?? ''}
                      onChange={(e) =>
                        setDraft({ ...draft, videoUrl: e.target.value })
                      }
                      placeholder="Paste any video URL or upload 1+ video files..."
                      aria-label="Additional product showcase video URL"
                      className="flex-1 min-w-[200px] h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                    <label className="inline-flex items-center gap-1.5 h-10 px-3.5 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingField === 'videoUrl'
                          ? `Uploading ${uploadProgress}%`
                          : 'Upload Video(s)'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept={VIDEO_FILE_ACCEPT}
                        disabled={uploadingField !== null}
                        onChange={(e) => handleMediaUpload(e, 'videoUrl')}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setGalleryPickerTarget('videoUrl')}
                      className="inline-flex items-center gap-1.5 h-10 px-3 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer whitespace-nowrap"
                    >
                      <Film className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Pick from Gallery</span>
                    </button>
                  </div>

                  {draft.videoUrl && draft.videoUrl.trim() && (
                    <div className="max-w-sm aspect-[16/9] rounded-md overflow-hidden border border-[#E4E4E0] bg-black">
                      <ResilientImage
                        src={draft.videoUrl.trim()}
                        alt={`${draft.name || 'Product'} video preview`}
                        fallbackLabel="Video Preview"
                        expectedKind="video"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Shades / Size Variants */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                    3. Shades &amp; Size Variants
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyVariantPreset('shades')}
                      className="px-2.5 py-1 text-[11px] font-medium border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                    >
                      Fill Shades
                    </button>
                    <button
                      type="button"
                      onClick={() => applyVariantPreset('sizes')}
                      className="px-2.5 py-1 text-[11px] font-medium border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                    >
                      Fill 30ml / 50ml
                    </button>
                    <button
                      type="button"
                      onClick={() => applyVariantPreset('dress-sizes')}
                      className="px-2.5 py-1 text-[11px] font-medium border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                    >
                      Fill Dress Sizes
                    </button>
                    <button
                      type="button"
                      onClick={() => applyVariantPreset('baby-ages')}
                      className="px-2.5 py-1 text-[11px] font-medium border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                    >
                      Fill 1M – 10Y Sizes
                    </button>
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Variant</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {draft.variants.map((variant, idx) => (
                    <div
                      key={variant.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md"
                    >
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) =>
                          updateVariant(idx, { name: e.target.value })
                        }
                        placeholder="Variant name (e.g. 01 Rosewood)"
                        className="sm:col-span-4 h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <input
                        type="text"
                        value={variant.detail}
                        onChange={(e) =>
                          updateVariant(idx, { detail: e.target.value })
                        }
                        placeholder="Undertone or vessel detail"
                        className="sm:col-span-4 h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <div className="sm:col-span-2 flex items-center gap-1.5">
                        <input
                          type="color"
                          value={variant.hex || '#B87B74'}
                          onChange={(e) =>
                            updateVariant(idx, { hex: e.target.value })
                          }
                          title="Shade swatch color"
                          className="w-8 h-9 p-0.5 bg-white border border-[#D4D4CE] rounded cursor-pointer shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateVariant(idx, {
                              hex: variant.hex ? undefined : '#B87B74',
                            })
                          }
                          className="text-[11px] text-[#5A5A56] hover:text-[#141413] underline cursor-pointer whitespace-nowrap"
                        >
                          {variant.hex ? 'Swatch On' : 'No Swatch'}
                        </button>
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-1.5">
                        <input
                          type="number"
                          value={variant.priceDelta ?? 0}
                          onChange={(e) =>
                            updateVariant(idx, {
                              priceDelta: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="+ Rs."
                          title="Price difference in PKR"
                          className="w-full h-9 px-2 text-xs tabular-nums bg-white border border-[#D4D4CE] rounded"
                        />
                        {draft.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(idx)}
                            aria-label="Remove variant"
                            className="p-1.5 text-[#5A5A56] hover:text-[#6D2932] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Category-Aware Material / Formulation Details */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                    {fieldLabels.sectionTitle}
                  </h3>
                  <button
                    type="button"
                    onClick={addActiveRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{fieldLabels.addItemButton}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      {fieldLabels.audienceLabel}
                    </label>
                    <input
                      type="text"
                      value={draft.skinTypes}
                      onChange={(e) =>
                        setDraft({ ...draft, skinTypes: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      {fieldLabels.finishLabel}
                    </label>
                    <input
                      type="text"
                      value={draft.finish}
                      onChange={(e) =>
                        setDraft({ ...draft, finish: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {draft.keyActives.map((active, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md"
                    >
                      <input
                        type="text"
                        value={active.name}
                        onChange={(e) =>
                          updateActive(idx, { name: e.target.value })
                        }
                        placeholder={fieldLabels.itemNamePlaceholder}
                        className="sm:col-span-4 h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <input
                        type="text"
                        value={active.concentration}
                        onChange={(e) =>
                          updateActive(idx, { concentration: e.target.value })
                        }
                        placeholder={fieldLabels.itemSpecPlaceholder}
                        className="sm:col-span-2 h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <input
                        type="text"
                        value={active.benefit}
                        onChange={(e) =>
                          updateActive(idx, { benefit: e.target.value })
                        }
                        placeholder={fieldLabels.itemBenefitPlaceholder}
                        className="sm:col-span-5 h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <div className="sm:col-span-1 flex justify-end">
                        {draft.keyActives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeActive(idx)}
                            aria-label="Remove item"
                            className="p-1.5 text-[#5A5A56] hover:text-[#6D2932] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      {fieldLabels.usageLabel}
                    </label>
                    <textarea
                      rows={2}
                      value={draft.howToUse}
                      onChange={(e) =>
                        setDraft({ ...draft, howToUse: e.target.value })
                      }
                      className="w-full p-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      {fieldLabels.materialsLabel}
                    </label>
                    <textarea
                      rows={2}
                      value={draft.fullIngredients}
                      onChange={(e) =>
                        setDraft({ ...draft, fullIngredients: e.target.value })
                      }
                      className="w-full p-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="px-6 py-4 bg-white border-t border-[#E4E4E0] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="px-4 py-2.5 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingField !== null}
                className="px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {uploadingField !== null
                  ? `Uploading ${uploadProgress}%...`
                  : isNewProduct
                    ? 'Publish Product to Store'
                    : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      <GalleryPickerModal
        isOpen={galleryPickerTarget !== null}
        mode={galleryPickerTarget === 'gallery' ? 'multiple' : 'single'}
        mediaFilter={galleryPickerTarget === 'videoUrl' ? 'video' : 'all'}
        title={
          galleryPickerTarget === 'gallery'
            ? 'Add Photos & Videos from Manager Gallery'
            : galleryPickerTarget === 'videoUrl'
              ? 'Choose Product Video from Manager Gallery'
              : 'Choose Primary Product Photo from Manager Gallery'
        }
        mediaAssets={mediaAssets}
        categories={categories}
        onClose={() => setGalleryPickerTarget(null)}
        onSelect={handleApplyGalleryPickerSelection}
        onAddMediaAssets={onAddMediaAssets}
      />
    </div>
  );
}
