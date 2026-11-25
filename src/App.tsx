import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Heart,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { BUILTIN_PRODUCT_IDS } from './data/products';
import { DEFAULT_SITE_CONFIG } from './data/defaultSiteConfig';
import { DEFAULT_ORDERS } from './data/defaultOrders';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  buildInitialOrderTracking,
  db,
  findHero3DShowcaseRuleViolation,
  findHeroHighlightSliderRuleViolation,
  findSiteConfigRuleViolation,
  handleFirestoreError,
  isAdminUser,
  normalizeOrderTrackingId,
  sanitizeHero3DShowcaseForFirestore,
  sanitizeHeroHighlightSliderForFirestore,
  sanitizeMediaAssetForFirestore,
  sanitizeOrderForFirestore,
  sanitizeOrderTrackingForFirestore,
  sanitizeProductForFirestore,
  sanitizeSiteConfigForFirestore,
  sanitizeSubscriberForFirestore,
  signInAsAdmin,
  signOutAccount,
  toValidFirestoreId,
} from './firebase';
import {
  CampaignBannerConfig,
  CartItem,
  CategoryFilter,
  CustomHomeSection,
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  Hero3DShowcaseConfig,
  HeroGuarantee,
  HeroHighlightSliderConfig,
  HomeBox,
  HomeLink,
  HomeThemeConfig,
  MarketplaceShortcutTile,
  MediaAsset,
  OrderRecord,
  OrderTrackingRecord,
  PhilosophyPillar,
  Product,
  ProofMetric,
  SiteConfig,
  SiteVisibilityConfig,
  SortOption,
  SubscriberRecord,
  isKidsCategory,
} from './types';
import { CustomHomeSections } from './components/CustomHomeSections';
import { Header } from './components/Header';
import { Hero, buildDefaultShortcutTiles } from './components/Hero';
import { Hero3DCustomizerModal } from './components/Hero3DCustomizerModal';
import { HighlightShowcaseSlider, DEFAULT_HIGHLIGHT_SLIDER_CONFIG } from './components/HighlightShowcaseSlider';
import { HighlightSliderCustomizerModal } from './components/HighlightSliderCustomizerModal';
import { HomeCustomBoxes } from './components/HomeCustomBoxes';
import { HomeManagerBar } from './components/HomeManagerBar';
import {
  HomeQuickComposerModal,
  QuickComposerState,
} from './components/HomeQuickComposerModal';
import { HomeQuickLinksBar } from './components/HomeQuickLinksBar';
import { MarketplaceShowcaseSection } from './components/MarketplaceShowcaseSection';
import { MarketplaceVouchersStrip } from './components/MarketplaceVouchersStrip';
import { BottomAppBar } from './components/BottomAppBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer, OrderDispatchResult } from './components/CartDrawer';
import {
  CatalogManagerModal,
  ManagerTab,
  ProductModalIntent,
} from './components/CatalogManagerModal';
import { PhilosophySection } from './components/PhilosophySection';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { Footer } from './components/Footer';

const STORAGE_KEYS = {
  catalog: 'fgold_catalog_pkr_v1',
  boutiqueMigrated: 'fgold_boutique_jewellery_v2',
  subcategoriesMigrated: 'fgold_subcategories_v3',
  siteConfig: 'fgold_site_config_v1',
  cart: 'olenna_cart_v1',
  wishlist: 'olenna_wishlist_v1',
  order: 'olenna_latest_order_v1',
  collectedPromo: 'fgold_collected_promo_v1',
};

const LEGACY_REMOVED_CATEGORIES = new Set<string>(['Lips & Cheeks', 'Complexion']);
const LEGACY_REMOVED_IDS = new Set<string>([
  'velvet-lip-stain',
  'luminous-skin-tint',
  'mineral-cheek-veil',
  ...BUILTIN_PRODUCT_IDS,
]);

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCategoriesList(raw?: string[]): string[] {
  const source = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_CATEGORIES;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of source) {
    const trimmed = String(item || '').trim().slice(0, 60);
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
    if (result.length >= 40) break;
  }
  return result.length > 0 ? result : [...DEFAULT_CATEGORIES];
}

function normalizeSubcategoriesMap(
  raw?: Record<string, string[]>
): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') {
    const defaults: Record<string, string[]> = {};
    for (const [key, list] of Object.entries(DEFAULT_SUBCATEGORIES)) {
      defaults[key] = [...list];
    }
    return defaults;
  }

  const result: Record<string, string[]> = {};
  for (const [rawKey, rawList] of Object.entries(raw)) {
    const cleanKey = String(rawKey || '').trim().slice(0, 60);
    if (!cleanKey || !Array.isArray(rawList)) continue;
    const seen = new Set<string>();
    const cleanedList: string[] = [];
    for (const item of rawList) {
      const cleanItem = String(item || '').trim().slice(0, 60);
      if (cleanItem && !seen.has(cleanItem.toLowerCase())) {
        seen.add(cleanItem.toLowerCase());
        cleanedList.push(cleanItem);
      }
      if (cleanedList.length >= 30) break;
    }
    if (cleanedList.length > 0) {
      result[cleanKey] = cleanedList;
    }
  }

  return result;
}

function mergeSiteConfig(stored: Partial<SiteConfig> = {}): SiteConfig {
  const legacyNames = new Set([
    'Olenna',
    'Olenna Cosmetics',
    'f.fold&fashion',
  ]);
  const resolvedStoreName =
    stored.storeName && !legacyNames.has(stored.storeName)
      ? stored.storeName
      : DEFAULT_SITE_CONFIG.storeName;
  const resolvedWhatsappMessage =
    stored.socialLinks?.whatsappMessage &&
    !stored.socialLinks.whatsappMessage.includes('f.fold&fashion')
      ? stored.socialLinks.whatsappMessage
      : DEFAULT_SITE_CONFIG.socialLinks.whatsappMessage;

  const mergedNav = { ...DEFAULT_SITE_CONFIG.navLabels, ...stored.navLabels };
  if (stored.navLabels?.skincare === 'Skincare') {
    mergedNav.skincare = DEFAULT_SITE_CONFIG.navLabels.skincare;
    if (
      stored.navLabels?.color === 'Color' ||
      stored.navLabels?.color === 'Boutique'
    ) {
      mergedNav.color = DEFAULT_SITE_CONFIG.navLabels.color;
    }
  } else if (mergedNav.color === 'Color') {
    mergedNav.color = DEFAULT_SITE_CONFIG.navLabels.color;
  }
  if (
    mergedNav.ingredients === 'Atelier' ||
    mergedNav.ingredients === 'Ingredients'
  ) {
    mergedNav.ingredients = DEFAULT_SITE_CONFIG.navLabels.ingredients;
  }

  const rawHero = stored.hero;
  const isLegacyCosmeticsHero =
    !rawHero ||
    rawHero.imageUrl === '/src/assets/images/hero_cosmetics_atelier_1795082514915.jpg' ||
    rawHero.secondaryCta === 'Shop Skincare' ||
    rawHero.eyebrow?.includes('Beauty Atelier') ||
    rawHero.eyebrow?.includes('Botanical Skincare Atelier');
  const mergedHero = isLegacyCosmeticsHero
    ? DEFAULT_SITE_CONFIG.hero
    : { ...DEFAULT_SITE_CONFIG.hero, ...rawHero };

  const rawPhilosophy = stored.philosophy;
  const isLegacyCosmeticsPhilosophy =
    !rawPhilosophy ||
    rawPhilosophy.imageUrl === '/src/assets/images/editorial_botanical_lab_1795082517410.jpg' ||
    rawPhilosophy.eyebrow === 'Formulation Standards';
  const mergedPhilosophy = isLegacyCosmeticsPhilosophy
    ? DEFAULT_SITE_CONFIG.philosophy
    : { ...DEFAULT_SITE_CONFIG.philosophy, ...rawPhilosophy };

  const isLegacyTagline =
    !stored.footerTagline ||
    stored.footerTagline.includes('Cosmetics, Dresses & Baby Wear') ||
    stored.footerTagline.includes('botanical skincare crafted');

  return {
    ...DEFAULT_SITE_CONFIG,
    ...stored,
    storeName: resolvedStoreName,
    footerTagline: isLegacyTagline
      ? DEFAULT_SITE_CONFIG.footerTagline
      : stored.footerTagline!,
    navLabels: mergedNav,
    categories: normalizeCategoriesList(stored.categories),
    subcategories: normalizeSubcategoriesMap(stored.subcategories),
    hero: mergedHero,
    headerBackgroundImage:
      stored.headerBackgroundImage ?? DEFAULT_SITE_CONFIG.headerBackgroundImage ?? '',
    headerTextTheme: stored.headerTextTheme === 'light' ? 'light' : 'dark',
    catalogSection:
      stored.catalogSection?.eyebrow === 'Curated Formulations' ||
      stored.catalogSection?.eyebrow === 'Curated Collection'
        ? DEFAULT_SITE_CONFIG.catalogSection
        : {
            ...DEFAULT_SITE_CONFIG.catalogSection,
            ...stored.catalogSection,
          },
    featuresSection: {
      ...DEFAULT_SITE_CONFIG.featuresSection!,
      ...stored.featuresSection,
    },
    philosophy: mergedPhilosophy,
    checkout: {
      ...DEFAULT_SITE_CONFIG.checkout,
      ...stored.checkout,
      campaignBanner: {
        ...DEFAULT_SITE_CONFIG.checkout.campaignBanner,
        ...stored.checkout?.campaignBanner,
      },
    },
    socialLinks: {
      ...DEFAULT_SITE_CONFIG.socialLinks,
      ...stored.socialLinks,
      whatsappMessage: resolvedWhatsappMessage,
      accounts:
        stored.socialLinks?.accounts ?? DEFAULT_SITE_CONFIG.socialLinks.accounts,
    },
    seo: {
      ...DEFAULT_SITE_CONFIG.seo!,
      ...stored.seo,
    },
    teamMembers:
      stored.teamMembers ?? DEFAULT_SITE_CONFIG.teamMembers ?? [],
    customBoxes: stored.customBoxes ?? DEFAULT_SITE_CONFIG.customBoxes ?? [],
    customLinks: stored.customLinks ?? DEFAULT_SITE_CONFIG.customLinks ?? [],
    homeSliders: [],
    customSections: Array.isArray(stored.customSections)
      ? stored.customSections
      : DEFAULT_SITE_CONFIG.customSections ?? [],
    homeTheme: {
      ...DEFAULT_SITE_CONFIG.homeTheme!,
      ...stored.homeTheme,
    },
    visibility: {
      ...DEFAULT_SITE_CONFIG.visibility!,
      ...stored.visibility,
    },
    hero3dShowcase:
      stored.hero3dShowcase ?? DEFAULT_SITE_CONFIG.hero3dShowcase,
  };
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = readJsonStorage<Product[] | null>(STORAGE_KEYS.catalog, null);
    if (!stored) return [];
    return stored.filter(
      (p) =>
        Boolean(p.category?.trim()) &&
        !LEGACY_REMOVED_CATEGORIES.has(p.category) &&
        !LEGACY_REMOVED_IDS.has(p.id)
    );
  });
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() =>
    mergeSiteConfig(readJsonStorage<Partial<SiteConfig>>(STORAGE_KEYS.siteConfig, {}))
  );
  const [hero3dShowcaseDoc, setHero3dShowcaseDoc] = useState<
    Hero3DShowcaseConfig | undefined
  >(undefined);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const product of products) {
      if (product.variants[0]) {
        defaults[product.id] = product.variants[0].id;
      }
    }
    return defaults;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    readJsonStorage<CartItem[]>(STORAGE_KEYS.cart, [])
  );
  const [wishlist, setWishlist] = useState<string[]>(() =>
    readJsonStorage<string[]>(STORAGE_KEYS.wishlist, [])
  );
  const [latestOrder, setLatestOrder] = useState<OrderRecord | null>(() =>
    readJsonStorage<OrderRecord | null>(STORAGE_KEYS.order, null)
  );
  const [collectedPromoCode, setCollectedPromoCode] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.collectedPromo);
    } catch {
      return null;
    }
  });
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [trackingRecords, setTrackingRecords] = useState<
    Record<string, OrderTrackingRecord>
  >({});
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [trackingLoaded, setTrackingLoaded] = useState(false);
  const trackingCreatedAtRef = useRef<Record<string, unknown>>({});
  const backfilledTrackingIdsRef = useRef<Set<string>>(new Set());
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingLookupSeed, setTrackingLookupSeed] = useState('');
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [productsSynced, setProductsSynced] = useState(false);
  const [productsEmptyInCloud, setProductsEmptyInCloud] = useState(false);
  const [staleCloudProductIds, setStaleCloudProductIds] = useState<string[]>([]);
  const [configSynced, setConfigSynced] = useState(false);
  const [configEmptyInCloud, setConfigEmptyInCloud] = useState(false);

  const migratedCloudCategoriesRef = useRef(false);
  const seededConfigRef = useRef(false);
  const seededOrdersRef = useRef(false);

  const isAdmin = isAdminUser(authUser);

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<ManagerTab>('products');
  const [productModalIntent, setProductModalIntent] =
    useState<ProductModalIntent>(null);
  const [drawerInitialView, setDrawerInitialView] = useState<'bag' | 'receipt'>('bag');
  const [isHomeEditMode, setIsHomeEditMode] = useState(false);
  const [is3DCustomizerOpen, setIs3DCustomizerOpen] = useState(false);
  const [heroHighlightSliderDoc, setHeroHighlightSliderDoc] = useState<
    HeroHighlightSliderConfig | undefined
  >(undefined);
  const [isHighlightCustomizerOpen, setIsHighlightCustomizerOpen] =
    useState(false);
  const [quickComposer, setQuickComposer] = useState<QuickComposerState | null>(
    null
  );
  const [homeSaveStatus, setHomeSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user && !isAdminUser(user)) {
        setIsManagerOpen(false);
        setIsHomeEditMode(false);
        setAuthNotice(
          `Access denied for ${user.email || 'this account'}. Store Manager is restricted to admin (${ADMIN_EMAIL}).`
        );
      } else if (user && isAdminUser(user)) {
        setAuthNotice(null);
      } else {
        setIsManagerOpen(false);
        setIsHomeEditMode(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Public real-time Firestore listener for catalog products
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        if (snapshot.empty) {
          setProducts([]);
          setStaleCloudProductIds([]);
          setProductsEmptyInCloud(true);
          setProductsSynced(true);
          return;
        }
        setProductsEmptyInCloud(false);
        setProductsSynced(true);

        const staleIds: string[] = [];

        const docsWithOrder = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Product & { sortOrder?: number };
            const pid = data.id || docSnap.id;
            const isLegacyRemoved =
              !data.category?.trim() ||
              LEGACY_REMOVED_CATEGORIES.has(data.category) ||
              LEGACY_REMOVED_IDS.has(pid);
            if (isLegacyRemoved) {
              staleIds.push(docSnap.id);
              return null;
            }

            const hydrated: Product = { ...data, id: pid };

            return {
              docId: docSnap.id,
              product: hydrated,
              sortOrder:
                typeof data.sortOrder === 'number'
                  ? data.sortOrder
                  : Number.MAX_SAFE_INTEGER,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        setStaleCloudProductIds(staleIds);

        docsWithOrder.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.product.name.localeCompare(b.product.name);
        });

        const cloudValidProducts = docsWithOrder.map((entry) => entry.product);
        setProducts(cloudValidProducts);
        setSelectedVariants((prev) => {
          const updated = { ...prev };
          for (const product of cloudValidProducts) {
            if (!updated[product.id] && product.variants[0]) {
              updated[product.id] = product.variants[0].id;
            }
          }
          return updated;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    return () => unsubscribe();
  }, []);

  // Public real-time Firestore listener for storefront settings & social links
  useEffect(() => {
    const configRef = doc(db, 'settings', 'siteConfig');
    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        if (!snap.exists()) {
          setConfigEmptyInCloud(true);
          setConfigSynced(true);
          return;
        }
        setConfigEmptyInCloud(false);
        setConfigSynced(true);
        const data = snap.data() as Partial<SiteConfig>;
        setSiteConfig(mergeSiteConfig(data));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/siteConfig');
      }
    );

    return () => unsubscribe();
  }, []);

  // Public real-time Firestore listener for Hero 3D Showcase configuration
  useEffect(() => {
    const hero3dRef = doc(db, 'settings', 'hero3dShowcase');
    const unsubscribe = onSnapshot(
      hero3dRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Hero3DShowcaseConfig;
        setHero3dShowcaseDoc(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/hero3dShowcase');
      }
    );

    return () => unsubscribe();
  }, []);

  // Public real-time Firestore listener for Highlight Slider below Highlight Boxes
  useEffect(() => {
    const highlightRef = doc(db, 'settings', 'heroHighlightSlider');
    const unsubscribe = onSnapshot(
      highlightRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as HeroHighlightSliderConfig;
        setHeroHighlightSliderDoc(data);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.GET,
          'settings/heroHighlightSlider'
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // Clean up built-in starter products & auto-seed siteConfig when admin signs in
  useEffect(() => {
    if (!authReady || !isAdmin) return;

    if (
      productsSynced &&
      !productsEmptyInCloud &&
      staleCloudProductIds.length > 0 &&
      !migratedCloudCategoriesRef.current
    ) {
      migratedCloudCategoriesRef.current = true;
      const batch = writeBatch(db);
      for (const staleId of staleCloudProductIds) {
        batch.delete(doc(db, 'products', staleId));
      }
      batch.commit().catch((error) => {
        handleFirestoreError(error, OperationType.WRITE, 'products');
      });
    }

    if (configSynced && configEmptyInCloud && !seededConfigRef.current) {
      seededConfigRef.current = true;
      setDoc(
        doc(db, 'settings', 'siteConfig'),
        sanitizeSiteConfigForFirestore(siteConfig)
      ).catch((error) => {
        handleFirestoreError(error, OperationType.WRITE, 'settings/siteConfig');
      });
    }
  }, [
    authReady,
    isAdmin,
    productsSynced,
    productsEmptyInCloud,
    staleCloudProductIds,
    configSynced,
    configEmptyInCloud,
    siteConfig,
  ]);

  // Admin-only real-time listener for customer orders (contains customer PII)
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setOrders([]);
      setOrdersLoaded(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        if (snapshot.empty) {
          if (!seededOrdersRef.current) {
            seededOrdersRef.current = true;
            const batch = writeBatch(db);
            for (const sampleOrder of DEFAULT_ORDERS) {
              const { id, payload } = sanitizeOrderForFirestore(sampleOrder);
              batch.set(doc(db, 'orders', id), payload);
              const initialTrack = buildInitialOrderTracking(sampleOrder);
              const { id: trackId, payload: trackPayload } =
                sanitizeOrderTrackingForFirestore(initialTrack);
              batch.set(doc(db, 'orderTracking', trackId), trackPayload);
            }
            batch.commit().catch((error) => {
              handleFirestoreError(error, OperationType.WRITE, 'orders');
            });
            return;
          }
          setOrders([]);
          setOrdersLoaded(true);
          return;
        }

        seededOrdersRef.current = true;
        const rows = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as OrderRecord & {
            createdTimestamp?: Timestamp;
          };
          const tsMillis =
            data.createdTimestamp && typeof data.createdTimestamp.toMillis === 'function'
              ? data.createdTimestamp.toMillis()
              : 0;
          const record: OrderRecord = {
            orderNumber: data.orderNumber || docSnap.id,
            createdAt: data.createdAt,
            status: data.status,
            items: data.items || [],
            subtotal: data.subtotal,
            discount: data.discount,
            shippingCost: data.shippingCost,
            total: data.total,
            paymentMethod: data.paymentMethod,
            shipping: data.shipping,
          };
          return { record, tsMillis };
        });

        rows.sort((a, b) => b.tsMillis - a.tsMillis);
        setOrders(rows.map((r) => r.record));
        setOrdersLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsubscribe();
  }, [authReady, isAdmin]);

  // Admin-only real-time listener for order tracking documents
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setTrackingRecords({});
      trackingCreatedAtRef.current = {};
      setTrackingLoaded(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'orderTracking'),
      (snapshot) => {
        const nextMap: Record<string, OrderTrackingRecord> = {};
        const createdAtMap: Record<string, unknown> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Partial<OrderTrackingRecord> & {
            createdAt?: unknown;
          };
          const normId = normalizeOrderTrackingId(
            data.orderNumber || docSnap.id
          );
          if (!normId) return;
          if (data.createdAt !== undefined) {
            createdAtMap[normId] = data.createdAt;
          }
          nextMap[normId] = {
            orderNumber: data.orderNumber || normId,
            status: data.status || 'Confirmed — Preparing Shipment',
            courierName: data.courierName,
            trackingNumber: data.trackingNumber,
            trackingUrl: data.trackingUrl,
            estimatedDelivery: data.estimatedDelivery,
            destinationCity: data.destinationCity || 'Pakistan',
            itemCount: Number(data.itemCount) || 1,
            orderDateLabel: data.orderDateLabel || 'Recent Order',
            updatedAtLabel: data.updatedAtLabel || 'Recently updated',
            events: Array.isArray(data.events) ? data.events : [],
          };
        });
        trackingCreatedAtRef.current = createdAtMap;
        setTrackingRecords(nextMap);
        setTrackingLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orderTracking');
      }
    );

    return () => unsubscribe();
  }, [authReady, isAdmin]);

  // Auto-backfill missing zero-PII tracking projections for any pre-existing orders
  useEffect(() => {
    if (!isAdmin || !ordersLoaded || !trackingLoaded || orders.length === 0) {
      return;
    }
    const missingOrders = orders.filter((order) => {
      const normId = normalizeOrderTrackingId(order.orderNumber);
      if (!normId) return false;
      if (trackingRecords[normId]) return false;
      if (backfilledTrackingIdsRef.current.has(normId)) return false;
      return true;
    });
    if (missingOrders.length === 0) return;

    const batch = writeBatch(db);
    for (const order of missingOrders) {
      const normId = normalizeOrderTrackingId(order.orderNumber);
      backfilledTrackingIdsRef.current.add(normId);
      const initialTrack = buildInitialOrderTracking(order);
      const { id: trackId, payload: trackPayload } =
        sanitizeOrderTrackingForFirestore(initialTrack);
      batch.set(doc(db, 'orderTracking', trackId), trackPayload);
    }

    batch.commit().catch((err) => {
      console.error('Could not backfill orderTracking docs:', err);
    });
  }, [isAdmin, ordersLoaded, trackingLoaded, orders, trackingRecords]);

  // Open live order tracking modal automatically when ?track=ORDER_NUMBER is visited
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const trackParam = params.get('track');
      if (trackParam && trackParam.trim()) {
        setTrackingLookupSeed(normalizeOrderTrackingId(trackParam));
        setIsTrackingModalOpen(true);
      }
    } catch {
      // Ignore malformed URL params
    }
  }, []);

  // Admin-only real-time listener for newsletter subscribers (contains customer email PII)
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setSubscribers([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'subscribers'),
      (snapshot) => {
        const rows = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            email?: string;
            source?: string;
            subscribedAt?: Timestamp;
          };
          const tsMillis =
            data.subscribedAt && typeof data.subscribedAt.toMillis === 'function'
              ? data.subscribedAt.toMillis()
              : 0;
          const formattedDate =
            tsMillis > 0
              ? new Date(tsMillis).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Just now';
          return {
            record: {
              id: docSnap.id,
              email: data.email || '',
              source: data.source || 'footer',
              subscribedAt: formattedDate,
            } satisfies SubscriberRecord,
            tsMillis,
          };
        });

        rows.sort((a, b) => b.tsMillis - a.tsMillis);
        setSubscribers(rows.map((r) => r.record));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'subscribers');
      }
    );

    return () => unsubscribe();
  }, [authReady, isAdmin]);

  // Admin-only real-time listener for Manager Media Gallery
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setMediaAssets([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'mediaLibrary'),
      (snapshot) => {
        const rows = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            id?: string;
            title?: string;
            url?: string;
            mediaKind?: 'image' | 'video';
            categoryTag?: string;
            createdAt?: Timestamp;
          };
          const tsMillis =
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : 0;
          const formattedDate =
            tsMillis > 0
              ? new Date(tsMillis).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'Just now';
          return {
            asset: {
              id: data.id || docSnap.id,
              title: data.title || 'Product Media',
              url: data.url || '',
              mediaKind: data.mediaKind === 'video' ? 'video' : 'image',
              categoryTag: data.categoryTag || 'General',
              createdAt: formattedDate,
            } satisfies MediaAsset,
            tsMillis,
          };
        });

        rows.sort((a, b) => b.tsMillis - a.tsMillis);
        setMediaAssets(rows.map((r) => r.asset));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'mediaLibrary');
      }
    );

    return () => unsubscribe();
  }, [authReady, isAdmin]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify(products));
    } catch {
      // Ignore storage quota errors
    }
  }, [products]);

  useEffect(() => {
    const seoConfig = siteConfig.seo ?? DEFAULT_SITE_CONFIG.seo!;
    const resolvedTitle =
      seoConfig.metaTitle.trim() ||
      `${siteConfig.storeName} — All-Department Boutique, Jewellery & Lifestyle Store`;
    const resolvedDescription =
      seoConfig.metaDescription.trim() || siteConfig.footerTagline;
    const resolvedKeywords = seoConfig.keywords.trim();
    const resolvedRobots =
      seoConfig.allowIndexing === false ? 'noindex, nofollow' : 'index, follow';

    document.title = resolvedTitle;

    const canonicalUrl =
      seoConfig.canonicalUrl.trim() ||
      window.location.origin + window.location.pathname;
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    const upsertMeta = (
      attrName: 'name' | 'property',
      attrValue: string,
      content: string
    ) => {
      if (!content) return;
      let tag = document.querySelector<HTMLMetaElement>(
        `meta[${attrName}="${attrValue}"]`
      );
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrValue);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    upsertMeta('name', 'description', resolvedDescription);
    upsertMeta('name', 'keywords', resolvedKeywords);
    upsertMeta('name', 'robots', resolvedRobots);
    upsertMeta('property', 'og:site_name', siteConfig.storeName);
    upsertMeta('property', 'og:title', resolvedTitle);
    upsertMeta('property', 'og:description', resolvedDescription);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('name', 'twitter:title', resolvedTitle);
    upsertMeta('name', 'twitter:description', resolvedDescription);

    const jsonLdEl = document.getElementById('store-jsonld');
    if (jsonLdEl) {
      const sameAs = siteConfig.socialLinks.accounts
        .map((acc) => acc.url)
        .filter(Boolean);
      const membersSchema = (siteConfig.teamMembers || []).map((member) => ({
        '@type': 'Person',
        name: member.name,
        jobTitle: member.role,
        description: member.specialty || undefined,
        email: member.email || undefined,
        telephone: member.phone || undefined,
      }));
      const schemaPayload = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: siteConfig.storeName,
        url: canonicalUrl,
        description: resolvedDescription,
        currenciesAccepted: 'PKR',
        paymentAccepted: 'Cash on Delivery, JazzCash, Easypaisa, Credit Card',
        address:
          seoConfig.city || seoConfig.country
            ? {
                '@type': 'PostalAddress',
                addressLocality: seoConfig.city || undefined,
                addressCountry: seoConfig.country || undefined,
              }
            : undefined,
        employee: membersSchema.length > 0 ? membersSchema : undefined,
        sameAs: sameAs.length > 0 ? sameAs : undefined,
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `${siteConfig.storeName} Catalog`,
          itemListElement: products.slice(0, 12).map((product) => ({
            '@type': 'Product',
            name: product.name,
            category: product.category,
            description: product.description,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'PKR',
              price: product.price,
              availability: 'https://schema.org/InStock',
            },
          })),
        },
      };
      jsonLdEl.textContent = JSON.stringify(schemaPayload);
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEYS.siteConfig,
        JSON.stringify(siteConfig)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [siteConfig, products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(wishlist));
    } catch {
      // Ignore storage quota errors
    }
  }, [wishlist]);

  useEffect(() => {
    try {
      if (latestOrder) {
        window.localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(latestOrder));
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [latestOrder]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const availableCategories = useMemo(() => {
    const base = normalizeCategoriesList(siteConfig.categories);
    const seen = new Set(base.map((c) => c.toLowerCase()));
    const combined = [...base];
    for (const product of products) {
      const cat = product.category?.trim();
      if (cat && !seen.has(cat.toLowerCase())) {
        seen.add(cat.toLowerCase());
        combined.push(cat);
      }
    }
    return combined;
  }, [siteConfig.categories, products]);

  const availableSubcategoriesMap = useMemo(() => {
    const map = normalizeSubcategoriesMap(siteConfig.subcategories);
    for (const product of products) {
      const cat = product.category?.trim();
      const sub = product.subcategory?.trim();
      if (cat && sub) {
        const current = map[cat] ?? [];
        if (!current.some((s) => s.toLowerCase() === sub.toLowerCase())) {
          map[cat] = [...current, sub];
        }
      }
    }
    return map;
  }, [siteConfig.subcategories, products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of availableCategories) {
      counts[cat] = 0;
    }
    for (const product of products) {
      const cat = product.category?.trim();
      if (cat) {
        counts[cat] = (counts[cat] ?? 0) + 1;
      }
    }
    return counts;
  }, [availableCategories, products]);

  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    for (const product of products) {
      const cat = product.category?.trim();
      const sub = product.subcategory?.trim();
      if (cat && sub) {
        if (!counts[cat]) counts[cat] = {};
        counts[cat][sub] = (counts[cat][sub] ?? 0) + 1;
      }
    }
    return counts;
  }, [products]);

  const activeCategorySubcategories = useMemo(() => {
    if (categoryFilter === 'All') return [];
    return availableSubcategoriesMap[categoryFilter] ?? [];
  }, [availableSubcategoriesMap, categoryFilter]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const list = products.filter((product) => {
      if (categoryFilter !== 'All' && product.category !== categoryFilter) {
        return false;
      }
      if (
        categoryFilter !== 'All' &&
        subcategoryFilter !== 'All' &&
        (product.subcategory || '').toLowerCase() !==
          subcategoryFilter.toLowerCase()
      ) {
        return false;
      }
      if (showSavedOnly && !wishlist.includes(product.id)) {
        return false;
      }
      if (!query) return true;

      const haystack = [
        product.name,
        product.subtitle,
        product.category,
        product.subcategory ?? '',
        product.description,
        ...product.variants.map((v) => v.name),
        ...product.keyActives.map((a) => a.name),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [
    products,
    categoryFilter,
    subcategoryFilter,
    searchQuery,
    sortBy,
    showSavedOnly,
    wishlist,
  ]);

  const handleAdminSignIn = async () => {
    setAuthLoading(true);
    setAuthNotice(null);
    try {
      const user = await signInAsAdmin();
      if (!isAdminUser(user)) {
        setIsManagerOpen(false);
        setAuthNotice(
          `Access denied for ${user.email || 'this account'}. Store Manager is restricted to admin (${ADMIN_EMAIL}).`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('popup-closed-by-user')) {
        setAuthNotice('Admin sign-in did not complete. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsManagerOpen(false);
    setAuthNotice(null);
    try {
      await signOutAccount();
    } catch {
      setAuthNotice('Could not sign out right now.');
    }
  };

  const handleSelectVariant = (productId: string, variantId: string) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }));
  };

  const handleAddToCart = (productId: string, variantId: string, quantity = 1) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === productId && item.variantId === variantId
      );
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: Math.min(10, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { productId, variantId, quantity }];
    });
  };

  const handleUpdateQuantity = (productId: string, variantId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string, variantId: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      )
    );
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSaveProduct = async (saved: Product, isNew: boolean) => {
    if (!isAdmin) return;
    const minSortOrder = products.reduce(
      (min, p, idx) => Math.min(min, idx),
      0
    );
    const sortOrder = isNew
      ? minSortOrder - 1
      : products.findIndex((p) => p.id === saved.id);
    const { id, payload } = sanitizeProductForFirestore(
      saved,
      sortOrder >= 0 ? sortOrder : 0
    );
    const normalizedSaved: Product = { ...saved, id };

    setProducts((prev) =>
      isNew
        ? [normalizedSaved, ...prev]
        : prev.map((item) => (item.id === id ? normalizedSaved : item))
    );
    setSelectedVariants((prev) => ({
      ...prev,
      [id]: normalizedSaved.variants[0]?.id || '',
    }));

    try {
      await setDoc(doc(db, 'products', id), payload);
    } catch (error) {
      handleFirestoreError(
        error,
        isNew ? OperationType.CREATE : OperationType.UPDATE,
        `products/${id}`
      );
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin) return;
    const safeId = toValidFirestoreId(productId, 'prod');
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
    setWishlist((prev) => prev.filter((id) => id !== productId));
    if (activeProduct?.id === productId) {
      setActiveProduct(null);
    }

    try {
      await deleteDoc(doc(db, 'products', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${safeId}`);
    }
  };

  const handleSaveSiteConfig = async (nextConfig: SiteConfig): Promise<boolean> => {
    if (!isAdmin) {
      setAuthNotice(
        `Please sign in as store manager (${ADMIN_EMAIL}) to publish changes.`
      );
      return false;
    }
    const previousConfig = siteConfig;
    const payload = sanitizeSiteConfigForFirestore(nextConfig);
    const ruleViolation = findSiteConfigRuleViolation(payload);
    if (ruleViolation) {
      console.error('Storefront settings failed pre-save validation:', ruleViolation);
      setAuthNotice(
        'Could not publish changes to cloud because some settings exceeded field limits. Please review and try again.'
      );
      return false;
    }
    setSiteConfig(nextConfig);
    try {
      await setDoc(doc(db, 'settings', 'siteConfig'), payload);
      setAuthNotice(null);
      return true;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code.includes('permission-denied') && auth.currentUser) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult(true);
          try {
            await setDoc(doc(db, 'settings', 'siteConfig'), payload);
            setAuthNotice(null);
            return true;
          } catch (retryError) {
            const claimEmail = String(tokenResult.claims?.email || '');
            const claimVerified = Boolean(tokenResult.claims?.email_verified);
            console.error(
              'Could not save storefront settings:',
              retryError,
              JSON.stringify({
                ruleViolation,
                claimVerified,
                emailMatch: claimEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
                signInProvider: tokenResult.signInProvider,
                approxBytes: JSON.stringify(payload).length,
              })
            );
          }
        } catch (tokenError) {
          console.error('Could not save storefront settings:', tokenError);
        }
      } else {
        console.error('Could not save storefront settings:', error);
      }
      setSiteConfig(previousConfig);
      setAuthNotice(
        `Could not publish changes to cloud. Reverted unsaved local edits — please sign out and sign back in as ${ADMIN_EMAIL} and retry.`
      );
      return false;
    }
  };

  const handleSaveHero3DShowcase = async (
    nextShowcase: Hero3DShowcaseConfig
  ): Promise<boolean> => {
    if (!isAdmin) {
      setAuthNotice(
        `Please sign in as store manager (${ADMIN_EMAIL}) to publish changes.`
      );
      return false;
    }
    const previousShowcaseDoc = hero3dShowcaseDoc;
    const previousSiteConfig = siteConfig;
    const payload = sanitizeHero3DShowcaseForFirestore(nextShowcase);
    const ruleViolation = findHero3DShowcaseRuleViolation(payload);
    if (ruleViolation) {
      console.error('Hero 3D settings failed pre-save validation:', ruleViolation);
      setAuthNotice(
        'Could not publish 3D showcase changes to cloud because some settings exceeded field limits.'
      );
      return false;
    }
    setHero3dShowcaseDoc(nextShowcase);
    setSiteConfig((prev) => ({ ...prev, hero3dShowcase: nextShowcase }));
    try {
      await setDoc(doc(db, 'settings', 'hero3dShowcase'), payload);
      setAuthNotice(null);
      setHomeSaveStatus('saved');
      window.setTimeout(() => setHomeSaveStatus('idle'), 2000);
      return true;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code.includes('permission-denied') && auth.currentUser) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult(true);
          try {
            await setDoc(doc(db, 'settings', 'hero3dShowcase'), payload);
            setAuthNotice(null);
            setHomeSaveStatus('saved');
            window.setTimeout(() => setHomeSaveStatus('idle'), 2000);
            return true;
          } catch (retryError) {
            const claimEmail = String(tokenResult.claims?.email || '');
            const claimVerified = Boolean(tokenResult.claims?.email_verified);
            console.error(
              'Could not save Hero 3D showcase:',
              retryError,
              JSON.stringify({
                ruleViolation,
                claimVerified,
                emailMatch: claimEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
                signInProvider: tokenResult.signInProvider,
                approxBytes: JSON.stringify(payload).length,
              })
            );
          }
        } catch (tokenError) {
          console.error('Could not save Hero 3D showcase:', tokenError);
        }
      } else {
        console.error('Could not save Hero 3D showcase:', error);
      }
      setHero3dShowcaseDoc(previousShowcaseDoc);
      setSiteConfig(previousSiteConfig);
      setAuthNotice(
        `Could not publish 3D showcase changes to cloud. Please sign out and sign back in as ${ADMIN_EMAIL}.`
      );
      return false;
    }
  };

  const handleSaveHeroHighlightSlider = async (
    nextHighlightConfig: HeroHighlightSliderConfig
  ): Promise<boolean> => {
    if (!isAdmin) {
      setAuthNotice(
        `Please sign in as store manager (${ADMIN_EMAIL}) to publish changes.`
      );
      return false;
    }
    const previousDoc = heroHighlightSliderDoc;
    const payload = sanitizeHeroHighlightSliderForFirestore(nextHighlightConfig);
    const ruleViolation = findHeroHighlightSliderRuleViolation(payload);
    if (ruleViolation) {
      console.error(
        'Highlight slider settings failed pre-save validation:',
        ruleViolation
      );
      setAuthNotice(
        'Could not publish highlight slider changes to cloud because some settings exceeded field limits.'
      );
      return false;
    }
    setHeroHighlightSliderDoc(nextHighlightConfig);
    try {
      await setDoc(doc(db, 'settings', 'heroHighlightSlider'), payload);
      setAuthNotice(null);
      setHomeSaveStatus('saved');
      window.setTimeout(() => setHomeSaveStatus('idle'), 2000);
      return true;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code.includes('permission-denied') && auth.currentUser) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult(true);
          try {
            await setDoc(doc(db, 'settings', 'heroHighlightSlider'), payload);
            setAuthNotice(null);
            setHomeSaveStatus('saved');
            window.setTimeout(() => setHomeSaveStatus('idle'), 2000);
            return true;
          } catch (retryError) {
            const claimEmail = String(tokenResult.claims?.email || '');
            const claimVerified = Boolean(tokenResult.claims?.email_verified);
            console.error(
              'Could not save highlight slider:',
              retryError,
              JSON.stringify({
                ruleViolation,
                claimVerified,
                emailMatch:
                  claimEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
                signInProvider: tokenResult.signInProvider,
                approxBytes: JSON.stringify(payload).length,
              })
            );
          }
        } catch (tokenError) {
          console.error('Could not save highlight slider:', tokenError);
        }
      } else {
        console.error('Could not save highlight slider:', error);
      }
      setHeroHighlightSliderDoc(previousDoc);
      setAuthNotice(
        `Could not publish highlight slider changes to cloud. Please sign out and sign back in as ${ADMIN_EMAIL}.`
      );
      return false;
    }
  };

  const handleResetSiteConfig = async (): Promise<boolean> => {
    if (!isAdmin) return false;
    return handleSaveSiteConfig(DEFAULT_SITE_CONFIG);
  };

  const handleResetSampleOrders = async () => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    for (const sampleOrder of DEFAULT_ORDERS) {
      const { id, payload } = sanitizeOrderForFirestore(sampleOrder);
      batch.set(doc(db, 'orders', id), payload);
      const initialTrack = buildInitialOrderTracking(sampleOrder);
      const { id: trackId, payload: trackPayload } =
        sanitizeOrderTrackingForFirestore(initialTrack, {
          preserveCreatedAt:
            trackingCreatedAtRef.current[trackIdFromOrder(sampleOrder)],
        });
      batch.set(doc(db, 'orderTracking', trackId), trackPayload);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  function trackIdFromOrder(order: OrderRecord): string {
    return normalizeOrderTrackingId(order.orderNumber);
  }

  const handleClearOrders = async () => {
    if (!isAdmin) return;
    seededOrdersRef.current = true;
    const batch = writeBatch(db);
    for (const order of orders) {
      const safeId = toValidFirestoreId(order.orderNumber, 'ord');
      batch.delete(doc(db, 'orders', safeId));
      const trackId = normalizeOrderTrackingId(order.orderNumber);
      if (trackId) {
        batch.delete(doc(db, 'orderTracking', trackId));
      }
    }
    setOrders([]);
    setTrackingRecords({});
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'orders');
    }
  };

  const handlePublishOrderTracking = async (
    order: OrderRecord,
    nextTracking: OrderTrackingRecord
  ) => {
    if (!isAdmin) return;
    const normTrackId = normalizeOrderTrackingId(order.orderNumber);
    const existingCreatedAt = trackingCreatedAtRef.current[normTrackId];
    const { id: trackId, payload } = sanitizeOrderTrackingForFirestore(
      nextTracking,
      existingCreatedAt ? { preserveCreatedAt: existingCreatedAt } : undefined
    );
    const safeOrderId = toValidFirestoreId(order.orderNumber, 'ord');

    try {
      await setDoc(doc(db, 'orderTracking', trackId), payload);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `orderTracking/${trackId}`
      );
    }

    try {
      await updateDoc(doc(db, 'orders', safeOrderId), {
        status: String(payload.status),
      });
    } catch {
      // Keep tracking published even if legacy /orders document uses another doc ID
    }
  };

  const handleCreateManualOrder = async (
    newOrder: OrderRecord,
    initialTracking: OrderTrackingRecord
  ) => {
    if (!isAdmin) return;
    const { id: orderId, payload: orderPayload } =
      sanitizeOrderForFirestore(newOrder);
    const { id: trackId, payload: trackPayload } =
      sanitizeOrderTrackingForFirestore(initialTracking);

    const batch = writeBatch(db);
    batch.set(doc(db, 'orders', orderId), orderPayload);
    batch.set(doc(db, 'orderTracking', trackId), trackPayload);

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const handleSubscribeNewsletter = async (rawEmail: string) => {
    try {
      await addDoc(
        collection(db, 'subscribers'),
        sanitizeSubscriberForFirestore(rawEmail)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subscribers');
    }
  };

  const handleDeleteSubscriber = async (subscriberId: string) => {
    if (!isAdmin) return;
    const safeId = toValidFirestoreId(subscriberId, 'sub');
    setSubscribers((prev) => prev.filter((s) => s.id !== subscriberId));
    try {
      await deleteDoc(doc(db, 'subscribers', safeId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `subscribers/${safeId}`
      );
    }
  };

  const handleAddMediaAssets = async (
    items: Array<{
      title: string;
      url: string;
      mediaKind: 'image' | 'video';
      categoryTag: string;
    }>
  ): Promise<MediaAsset[]> => {
    if (!isAdmin || items.length === 0) return [];
    const existingUrls = new Set(mediaAssets.map((m) => m.url.trim()));
    const createdAssets: MediaAsset[] = [];
    const batch = writeBatch(db);
    let batchCount = 0;

    items.forEach((item, index) => {
      const cleanUrl = item.url.trim();
      if (!cleanUrl || existingUrls.has(cleanUrl)) return;
      existingUrls.add(cleanUrl);
      const rawId = `media-${Date.now().toString(36)}-${index}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const { id, payload } = sanitizeMediaAssetForFirestore({
        id: rawId,
        title: item.title,
        url: cleanUrl,
        mediaKind: item.mediaKind,
        categoryTag: item.categoryTag,
      });
      batch.set(doc(db, 'mediaLibrary', id), payload);
      batchCount += 1;
      createdAssets.push({
        id,
        title: payload.title,
        url: payload.url,
        mediaKind: payload.mediaKind as 'image' | 'video',
        categoryTag: payload.categoryTag,
        createdAt: 'Just now',
      });
    });

    if (batchCount === 0) {
      return mediaAssets.filter((m) =>
        items.some((item) => item.url.trim() === m.url.trim())
      );
    }

    try {
      await batch.commit();
      return createdAssets;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'mediaLibrary');
    }
  };

  const handleUpdateMediaAsset = async (
    assetId: string,
    patch: { title?: string; categoryTag?: string }
  ) => {
    if (!isAdmin) return;
    const safeId = toValidFirestoreId(assetId, 'media');
    const cleanPatch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (typeof patch.title === 'string' && patch.title.trim()) {
      cleanPatch.title = patch.title.trim().slice(0, 120);
    }
    if (typeof patch.categoryTag === 'string') {
      cleanPatch.categoryTag = patch.categoryTag.trim().slice(0, 60) || 'General';
    }
    try {
      await updateDoc(doc(db, 'mediaLibrary', safeId), cleanPatch);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `mediaLibrary/${safeId}`
      );
    }
  };

  const handleDeleteMediaAssets = async (assetIds: string[]) => {
    if (!isAdmin || assetIds.length === 0) return;
    const batch = writeBatch(db);
    for (const rawId of assetIds) {
      const safeId = toValidFirestoreId(rawId, 'media');
      batch.delete(doc(db, 'mediaLibrary', safeId));
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'mediaLibrary');
    }
  };

  const handleOrderConfirmed = async (
    newOrder: OrderRecord
  ): Promise<OrderDispatchResult> => {
    const { id, payload } = sanitizeOrderForFirestore(newOrder);
    const initialTracking = buildInitialOrderTracking(newOrder);
    const { id: trackId, payload: trackPayload } =
      sanitizeOrderTrackingForFirestore(initialTracking);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'orders', id), payload);
      batch.set(doc(db, 'orderTracking', trackId), trackPayload);
      await batch.commit();
    } catch (error) {
      console.error('Could not submit customer order:', error);
      throw error;
    }

    setLatestOrder(newOrder);
    if (isAdmin) {
      setOrders((prev) => [newOrder, ...prev]);
    }

    try {
      const res = await fetch('/api/orders/whatsapp-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: newOrder,
          storeName: siteConfig.storeName,
          storeWhatsappNumber: siteConfig.socialLinks.whatsappNumber,
        }),
      });
      if (!res.ok) {
        return {
          deliveredAutomatically: false,
          recipientConfigured: Boolean(
            siteConfig.socialLinks.whatsappNumber.trim()
          ),
        };
      }
      const data = (await res.json()) as Partial<OrderDispatchResult>;
      return {
        deliveredAutomatically: Boolean(data.deliveredAutomatically),
        provider: data.provider,
        recipientConfigured: Boolean(
          data.recipientConfigured ?? siteConfig.socialLinks.whatsappNumber.trim()
        ),
      };
    } catch {
      return {
        deliveredAutomatically: false,
        recipientConfigured: Boolean(
          siteConfig.socialLinks.whatsappNumber.trim()
        ),
      };
    }
  };

  const persistHomeConfigUpdate = async (nextConfig: SiteConfig) => {
    const ok = await handleSaveSiteConfig(nextConfig);
    if (ok) {
      setHomeSaveStatus('saved');
      window.setTimeout(() => setHomeSaveStatus('idle'), 2000);
    }
  };

  const currentVisibility: SiteVisibilityConfig = {
    ...DEFAULT_SITE_CONFIG.visibility!,
    ...siteConfig.visibility,
  };

  const activeHero3dEnabled =
    hero3dShowcaseDoc?.enabled ?? siteConfig.hero3dShowcase?.enabled ?? true;
  const activeHighlightEnabled = heroHighlightSliderDoc?.enabled ?? true;

  const hiddenSectionCount = [
    currentVisibility.showHeroGuarantees,
    currentVisibility.showHeroSecondaryCta,
    currentVisibility.showCatalog,
    siteConfig.philosophy.visible,
    currentVisibility.showTeamMembers,
    currentVisibility.showSeoCard,
    currentVisibility.showHeaderSearch ?? true,
    currentVisibility.showHeaderDealsBadge ?? true,
    currentVisibility.showHeroSection ?? true,
    currentVisibility.showHeroEyebrow ?? true,
    currentVisibility.showHeroTrackOrderCta ?? true,
    currentVisibility.showHeroShareCta ?? true,
    currentVisibility.showMarketplaceShortcuts ?? true,
    siteConfig.hero.showPromoCard ?? true,
    currentVisibility.showVouchersSection ?? true,
    currentVisibility.showCampaignBanner ?? true,
    currentVisibility.showFlashSaleSection ?? true,
    currentVisibility.showChoiceStrip ?? true,
    currentVisibility.showFooterNewsletter ?? true,
    currentVisibility.showBottomNavBar ?? true,
    activeHero3dEnabled,
    activeHighlightEnabled,
  ].filter((v) => !v).length;

  const handleRestoreHiddenSections = () => {
    persistHomeConfigUpdate({
      ...siteConfig,
      hero: { ...siteConfig.hero, showPromoCard: true },
      philosophy: { ...siteConfig.philosophy, visible: true },
      visibility: {
        showHeroGuarantees: true,
        showHeroSecondaryCta: true,
        showCatalog: true,
        showTeamMembers: true,
        showSeoCard: true,
        showHeaderSearch: true,
        showHeaderDealsBadge: true,
        showHeroSection: true,
        showHeroEyebrow: true,
        showHeroTrackOrderCta: true,
        showHeroShareCta: true,
        showMarketplaceShortcuts: true,
        showVouchersSection: true,
        showCampaignBanner: true,
        showFlashSaleSection: true,
        showChoiceStrip: true,
        showFooterNewsletter: true,
        showBottomNavBar: true,
      },
    });
    if (!activeHero3dEnabled && (hero3dShowcaseDoc || siteConfig.hero3dShowcase)) {
      const base3d = hero3dShowcaseDoc ?? siteConfig.hero3dShowcase!;
      void handleSaveHero3DShowcase({ ...base3d, enabled: true });
    }
    if (!activeHighlightEnabled) {
      const baseHl = heroHighlightSliderDoc ?? DEFAULT_HIGHLIGHT_SLIDER_CONFIG;
      void handleSaveHeroHighlightSlider({ ...baseHl, enabled: true });
    }
  };

  const handleToggleVisibilityKey = (key: keyof SiteVisibilityConfig) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      visibility: {
        ...currentVisibility,
        [key]: !(currentVisibility[key] ?? true),
      },
    });
  };

  const handleSaveCustomBox = (savedBox: HomeBox, isNew: boolean) => {
    const existing = siteConfig.customBoxes ?? [];
    const nextBoxes = isNew
      ? [...existing, savedBox]
      : existing.map((b) => (b.id === savedBox.id ? savedBox : b));
    persistHomeConfigUpdate({ ...siteConfig, customBoxes: nextBoxes });
  };

  const handleDeleteCustomBox = (boxId: string) => {
    const nextBoxes = (siteConfig.customBoxes ?? []).filter(
      (b) => b.id !== boxId
    );
    persistHomeConfigUpdate({ ...siteConfig, customBoxes: nextBoxes });
  };

  const handleSaveCustomLink = (savedLink: HomeLink, isNew: boolean) => {
    const existing = siteConfig.customLinks ?? [];
    const nextLinks = isNew
      ? [...existing, savedLink]
      : existing.map((l) => (l.id === savedLink.id ? savedLink : l));
    persistHomeConfigUpdate({ ...siteConfig, customLinks: nextLinks });
  };

  const handleDeleteCustomLink = (linkId: string) => {
    const nextLinks = (siteConfig.customLinks ?? []).filter(
      (l) => l.id !== linkId
    );
    persistHomeConfigUpdate({ ...siteConfig, customLinks: nextLinks });
  };

  const handleSaveCustomSection = (
    savedSection: CustomHomeSection,
    isNew: boolean
  ) => {
    const existing = siteConfig.customSections ?? [];
    const nextSections = isNew
      ? [...existing, savedSection]
      : existing.map((s) => (s.id === savedSection.id ? savedSection : s));
    persistHomeConfigUpdate({ ...siteConfig, customSections: nextSections });
  };

  const handleDeleteCustomSection = (sectionId: string) => {
    const nextSections = (siteConfig.customSections ?? []).filter(
      (s) => s.id !== sectionId
    );
    persistHomeConfigUpdate({ ...siteConfig, customSections: nextSections });
  };

  const handleSaveHeaderBg = (patch: {
    headerBackgroundImage: string;
    headerTextTheme: 'dark' | 'light';
  }) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      headerBackgroundImage: patch.headerBackgroundImage,
      headerTextTheme: patch.headerTextTheme,
    });
  };

  const handleSaveTheme = (patch: {
    accentColor: string;
    homeTheme: HomeThemeConfig;
  }) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      accentColor: patch.accentColor,
      homeTheme: patch.homeTheme,
    });
  };

  const handleSaveSectionHeading = (patch: {
    target: 'catalog' | 'features';
    eyebrow: string;
    heading: string;
  }) => {
    if (patch.target === 'catalog') {
      persistHomeConfigUpdate({
        ...siteConfig,
        catalogSection: {
          ...siteConfig.catalogSection,
          eyebrow: patch.eyebrow.trim(),
          heading: patch.heading.trim(),
        },
      });
    } else {
      persistHomeConfigUpdate({
        ...siteConfig,
        featuresSection: {
          eyebrow: patch.eyebrow.trim(),
          heading: patch.heading.trim(),
        },
      });
    }
  };

  const handleSaveHeaderText = (patch: {
    storeName: string;
    navLabels: SiteConfig['navLabels'];
    showHeaderSearch: boolean;
    showHeaderDealsBadge: boolean;
  }) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      storeName: patch.storeName,
      navLabels: patch.navLabels,
      visibility: {
        ...currentVisibility,
        showHeaderSearch: patch.showHeaderSearch,
        showHeaderDealsBadge: patch.showHeaderDealsBadge,
      },
    });
  };

  const handleSavePromoCard = (patch: {
    promoCardEyebrow: string;
    promoCardBadge: string;
    promoCardSubBadge: string;
    promoCardTitle: string;
    promoCardSubtitle: string;
    promoCardCta: string;
    promoCardTargetUrl: string;
  }) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      hero: {
        ...siteConfig.hero,
        ...patch,
        showPromoCard: true,
      },
    });
  };

  const getMaterializedShortcutTiles = (): MarketplaceShortcutTile[] =>
    Array.isArray(siteConfig.hero.shortcutTiles)
      ? siteConfig.hero.shortcutTiles
      : buildDefaultShortcutTiles(
          availableCategories,
          siteConfig.checkout.freeShippingThreshold,
          true
        );

  const handleSaveShortcutTile = (
    tile: MarketplaceShortcutTile,
    isNew: boolean
  ) => {
    const base = getMaterializedShortcutTiles();
    const nextTiles = isNew
      ? [...base, tile]
      : base.map((item) => (item.id === tile.id ? tile : item));
    persistHomeConfigUpdate({
      ...siteConfig,
      hero: {
        ...siteConfig.hero,
        shortcutTiles: nextTiles,
      },
    });
  };

  const handleDeleteShortcutTile = (tileId: string) => {
    const base = getMaterializedShortcutTiles();
    persistHomeConfigUpdate({
      ...siteConfig,
      hero: {
        ...siteConfig.hero,
        shortcutTiles: base.filter((t) => t.id !== tileId),
      },
    });
  };

  const handleResetShortcutTiles = () => {
    const nextHero = { ...siteConfig.hero };
    delete nextHero.shortcutTiles;
    persistHomeConfigUpdate({
      ...siteConfig,
      hero: nextHero,
    });
  };

  const handleSaveVouchers = (patch: SiteConfig['checkout']) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      checkout: patch,
    });
  };

  const handleSaveCampaignBanner = (banner: CampaignBannerConfig) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      checkout: {
        ...siteConfig.checkout,
        campaignBanner: banner,
      },
    });
  };

  const handleSaveFlashSaleConfig = (patch: SiteConfig['catalogSection']) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      catalogSection: patch,
    });
  };

  const handleSavePhilosophyHeader = (patch: {
    eyebrow: string;
    heading: string;
    imageUrl: string;
  }) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      philosophy: {
        ...siteConfig.philosophy,
        ...patch,
      },
    });
  };

  const handleSaveFooterConfig = (patch: {
    storeName: string;
    footerTagline: string;
    newsletterEyebrow: string;
    newsletterHeading: string;
    newsletterDescription: string;
    newsletterButtonLabel: string;
    showFooterNewsletter: boolean;
    showBottomNavBar: boolean;
  }) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      storeName: patch.storeName,
      footerTagline: patch.footerTagline,
      catalogSection: {
        ...siteConfig.catalogSection,
        newsletterEyebrow: patch.newsletterEyebrow,
        newsletterHeading: patch.newsletterHeading,
        newsletterDescription: patch.newsletterDescription,
        newsletterButtonLabel: patch.newsletterButtonLabel,
      },
      visibility: {
        ...currentVisibility,
        showFooterNewsletter: patch.showFooterNewsletter,
        showBottomNavBar: patch.showBottomNavBar,
      },
    });
  };

  const handleSaveSectionManager = (patch: {
    visibility: SiteVisibilityConfig;
    hero3dEnabled: boolean;
    highlightEnabled: boolean;
    philosophyVisible: boolean;
  }) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      philosophy: {
        ...siteConfig.philosophy,
        visible: patch.philosophyVisible,
      },
      visibility: patch.visibility,
    });

    if (patch.hero3dEnabled !== activeHero3dEnabled) {
      const base3d: Hero3DShowcaseConfig = hero3dShowcaseDoc ??
        siteConfig.hero3dShowcase ?? {
          enabled: true,
          mode: 'auto-products',
          frameStyle: 'gold',
          aspectShape: 'portrait',
          depthLevel: 'medium',
          autoPlay: true,
          items: [],
        };
      void handleSaveHero3DShowcase({
        ...base3d,
        enabled: patch.hero3dEnabled,
      });
    }

    if (patch.highlightEnabled !== activeHighlightEnabled) {
      const baseHl = heroHighlightSliderDoc ?? DEFAULT_HIGHLIGHT_SLIDER_CONFIG;
      void handleSaveHeroHighlightSlider({
        ...baseHl,
        enabled: patch.highlightEnabled,
      });
    }
  };

  const handleSaveGuarantee = (guarantee: HeroGuarantee, index?: number) => {
    const next =
      typeof index === 'number'
        ? siteConfig.hero.guarantees.map((g, i) => (i === index ? guarantee : g))
        : [...siteConfig.hero.guarantees, guarantee];
    persistHomeConfigUpdate({
      ...siteConfig,
      hero: { ...siteConfig.hero, guarantees: next },
      visibility: { ...currentVisibility, showHeroGuarantees: true },
    });
  };

  const handleDeleteGuarantee = (index: number) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      hero: {
        ...siteConfig.hero,
        guarantees: siteConfig.hero.guarantees.filter((_, i) => i !== index),
      },
    });
  };

  const handleSavePillar = (pillar: PhilosophyPillar, index?: number) => {
    const next =
      typeof index === 'number'
        ? siteConfig.philosophy.pillars.map((p, i) => (i === index ? pillar : p))
        : [...siteConfig.philosophy.pillars, pillar];
    persistHomeConfigUpdate({
      ...siteConfig,
      philosophy: { ...siteConfig.philosophy, pillars: next },
    });
  };

  const handleDeletePillar = (index: number) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      philosophy: {
        ...siteConfig.philosophy,
        pillars: siteConfig.philosophy.pillars.filter((_, i) => i !== index),
      },
    });
  };

  const handleSaveMetric = (metric: ProofMetric, index?: number) => {
    const next =
      typeof index === 'number'
        ? siteConfig.philosophy.metrics.map((m, i) => (i === index ? metric : m))
        : [...siteConfig.philosophy.metrics, metric];
    persistHomeConfigUpdate({
      ...siteConfig,
      philosophy: { ...siteConfig.philosophy, metrics: next },
    });
  };

  const handleDeleteMetric = (index: number) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      philosophy: {
        ...siteConfig.philosophy,
        metrics: siteConfig.philosophy.metrics.filter((_, i) => i !== index),
      },
    });
  };

  const handleDeleteSocialAccount = (accountId: string) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      socialLinks: {
        ...siteConfig.socialLinks,
        accounts: siteConfig.socialLinks.accounts.filter(
          (acc) => acc.id !== accountId
        ),
      },
    });
  };

  const handleDeleteTeamMember = (memberId: string) => {
    persistHomeConfigUpdate({
      ...siteConfig,
      teamMembers: (siteConfig.teamMembers ?? []).filter(
        (m) => m.id !== memberId
      ),
    });
  };

  const handleAddCategory = (rawName: string): boolean => {
    if (!isAdmin) return false;
    const trimmed = rawName.trim().slice(0, 60);
    if (!trimmed) return false;
    const exists = availableCategories.some(
      (cat) => cat.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return false;
    const nextCategories = [...availableCategories, trimmed].slice(0, 40);
    persistHomeConfigUpdate({
      ...siteConfig,
      categories: nextCategories,
    });
    return true;
  };

  const handleDeleteCategory = (catName: string) => {
    if (!isAdmin || availableCategories.length <= 1) return;
    const nextCategories = availableCategories.filter((cat) => cat !== catName);
    const nextSubMap = { ...(siteConfig.subcategories ?? DEFAULT_SUBCATEGORIES) };
    delete nextSubMap[catName];
    if (categoryFilter === catName) {
      setCategoryFilter('All');
      setSubcategoryFilter('All');
    }
    persistHomeConfigUpdate({
      ...siteConfig,
      categories: nextCategories,
      subcategories: nextSubMap,
    });
  };

  const handleAddSubcategory = (
    parentCategory: string,
    rawSubName: string
  ): boolean => {
    if (!isAdmin) return false;
    const trimmed = rawSubName.trim().slice(0, 60);
    if (!trimmed) return false;
    const currentMap = { ...availableSubcategoriesMap };
    const existing = currentMap[parentCategory] ?? [];
    if (existing.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    currentMap[parentCategory] = [...existing, trimmed].slice(0, 30);
    persistHomeConfigUpdate({
      ...siteConfig,
      subcategories: currentMap,
    });
    return true;
  };

  const handleDeleteSubcategory = (
    parentCategory: string,
    subName: string
  ) => {
    if (!isAdmin) return;
    const currentMap = { ...availableSubcategoriesMap };
    const nextList = (currentMap[parentCategory] ?? []).filter(
      (s) => s !== subName
    );
    if (nextList.length > 0) {
      currentMap[parentCategory] = nextList;
    } else {
      delete currentMap[parentCategory];
    }
    if (categoryFilter === parentCategory && subcategoryFilter === subName) {
      setSubcategoryFilter('All');
    }
    persistHomeConfigUpdate({
      ...siteConfig,
      subcategories: currentMap,
    });
  };

  const scrollToCatalog = (category?: CategoryFilter, subcategory?: string) => {
    if (category) {
      setCategoryFilter(category);
      setSubcategoryFilter(
        category === 'All' ? 'All' : subcategory || 'All'
      );
      setShowSavedOnly(false);
    }
    const el = document.getElementById('catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToPhilosophy = () => {
    const el = document.getElementById('philosophy');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateSiteLink = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#category:')) {
      const cat = trimmed.slice('#category:'.length) as CategoryFilter;
      scrollToCatalog(cat);
      return;
    }
    if (trimmed === '#catalog') {
      scrollToCatalog('All');
      return;
    }
    if (trimmed === '#philosophy') {
      scrollToPhilosophy();
      return;
    }
    if (trimmed === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (trimmed.startsWith('#')) {
      const target = document.getElementById(trimmed.slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    window.location.assign(trimmed);
  };

  const openBagDrawer = () => {
    setDrawerInitialView('bag');
    setIsCartOpen(true);
  };

  const openOrderReceipt = () => {
    setDrawerInitialView('receipt');
    setIsCartOpen(true);
  };

  const activeHomeTheme: HomeThemeConfig = {
    ...DEFAULT_SITE_CONFIG.homeTheme!,
    ...siteConfig.homeTheme,
  };
  const headingWeightCss =
    activeHomeTheme.headingWeight === 'bold'
      ? '700'
      : activeHomeTheme.headingWeight === 'semibold'
        ? '600'
        : activeHomeTheme.headingWeight === 'medium'
          ? '500'
          : '400';

  const themeCssVars = {
    '--accent': siteConfig.accentColor,
    '--page-bg': activeHomeTheme.pageBgColor,
    '--surface-bg': activeHomeTheme.surfaceColor,
    '--text-primary': activeHomeTheme.textColor,
    '--text-muted': activeHomeTheme.mutedTextColor,
    '--border-subtle': activeHomeTheme.borderColor,
    '--btn-bg': activeHomeTheme.buttonBgColor,
    '--btn-text': activeHomeTheme.buttonTextColor,
    '--heading-font': `"${activeHomeTheme.headingFont}", Georgia, serif`,
    '--body-font': `"${activeHomeTheme.bodyFont}", system-ui, -apple-system, sans-serif`,
    '--heading-weight': headingWeightCss,
    '--heading-style': activeHomeTheme.headingStyle === 'italic' ? 'italic' : 'normal',
    '--heading-transform':
      activeHomeTheme.headingStyle === 'uppercase' ? 'uppercase' : 'none',
    '--body-weight': activeHomeTheme.bodyWeight === 'medium' ? '500' : '400',
  } as CSSProperties;

  const handleCollectVoucher = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setCollectedPromoCode(clean);
    try {
      window.localStorage.setItem(STORAGE_KEYS.collectedPromo, clean);
    } catch {
      // Ignore storage quota errors
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={themeCssVars}>
      <Header
        storeName={siteConfig.storeName}
        navLabels={siteConfig.navLabels}
        headerBackgroundImage={siteConfig.headerBackgroundImage}
        headerTextTheme={siteConfig.headerTextTheme}
        visibility={currentVisibility}
        isHomeEditMode={isAdmin && isHomeEditMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSubmitSearch={() => scrollToCatalog()}
        cartCount={cartCount}
        onOpenCart={openBagDrawer}
        onOpenOrderTracking={() => {
          setTrackingLookupSeed(latestOrder?.orderNumber ?? '');
          setIsTrackingModalOpen(true);
        }}
        onNavigateCategory={scrollToCatalog}
        onScrollToDeals={() => {
          const el = document.getElementById('flash-sale');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          else scrollToCatalog('All');
        }}
        onEditHeaderText={() =>
          setQuickComposer({
            type: 'headerText',
            storeName: siteConfig.storeName,
            navLabels: siteConfig.navLabels,
            showHeaderSearch: currentVisibility.showHeaderSearch ?? true,
            showHeaderDealsBadge: currentVisibility.showHeaderDealsBadge ?? true,
          })
        }
        onEditHeaderBg={() =>
          setQuickComposer({
            type: 'headerBg',
            imageUrl: siteConfig.headerBackgroundImage ?? '',
            textTheme: siteConfig.headerTextTheme ?? 'dark',
          })
        }
        onToggleSearchBar={() => handleToggleVisibilityKey('showHeaderSearch')}
        onToggleDealsBadge={() =>
          handleToggleVisibilityKey('showHeaderDealsBadge')
        }
      />

      {isAdmin && (
        <HomeManagerBar
          isHomeEditMode={isHomeEditMode}
          onToggleEditMode={() => setIsHomeEditMode((prev) => !prev)}
          onAddSection={() =>
            setQuickComposer({ type: 'section', initialPlacement: 'features' })
          }
          onAddBox={() =>
            setQuickComposer({ type: 'box', initialPlacement: 'features' })
          }
          onAddLink={() =>
            setQuickComposer({ type: 'link', initialPlacement: 'quickbar' })
          }
          onEditHeaderBg={() =>
            setQuickComposer({
              type: 'headerBg',
              imageUrl: siteConfig.headerBackgroundImage ?? '',
              textTheme: siteConfig.headerTextTheme ?? 'dark',
            })
          }
          onEditTheme={() =>
            setQuickComposer({
              type: 'theme',
              accentColor: siteConfig.accentColor,
              homeTheme: activeHomeTheme,
            })
          }
          onCustomize3D={() => setIs3DCustomizerOpen(true)}
          onCustomizeHighlightSlider={() => setIsHighlightCustomizerOpen(true)}
          onAddProduct={() => {
            setManagerTab('products');
            setProductModalIntent({ type: 'new' });
            setIsManagerOpen(true);
          }}
          onOpenGallery={() => {
            setManagerTab('gallery');
            setProductModalIntent(null);
            setIsManagerOpen(true);
          }}
          onOpenOrderTrackingManager={() => {
            setManagerTab('orders');
            setProductModalIntent(null);
            setIsManagerOpen(true);
          }}
          ordersCount={orders.length}
          onOpenStoreManager={() => {
            setManagerTab('products');
            setProductModalIntent(null);
            setIsManagerOpen(true);
          }}
          onOpenSectionManager={() =>
            setQuickComposer({
              type: 'sectionManager',
              visibility: currentVisibility,
              hero3dEnabled: activeHero3dEnabled,
              highlightEnabled: activeHighlightEnabled,
              philosophyVisible: siteConfig.philosophy.visible,
            })
          }
          hiddenSectionCount={hiddenSectionCount}
          onRestoreHiddenSections={handleRestoreHiddenSections}
          saveStatus={homeSaveStatus}
        />
      )}

      <div
        className="storefront-canvas flex-1 flex flex-col"
        data-heading-scale={activeHomeTheme.headingScale}
      >
        <main className="flex-1">
          <HomeQuickLinksBar
            links={siteConfig.customLinks ?? []}
            isHomeEditMode={isAdmin && isHomeEditMode}
            onNavigateLink={navigateSiteLink}
            onAddLink={() =>
              setQuickComposer({ type: 'link', initialPlacement: 'quickbar' })
            }
            onEditLink={(link) =>
              setQuickComposer({
                type: 'link',
                initialPlacement: link.placement,
                existing: link,
              })
            }
            onDeleteLink={handleDeleteCustomLink}
          />

          <Hero
            storeName={siteConfig.storeName}
            hero={siteConfig.hero}
            socialLinks={siteConfig.socialLinks}
            categories={availableCategories}
            subcategoriesMap={availableSubcategoriesMap}
            activeCategory={categoryFilter}
            activeSubcategory={subcategoryFilter}
            categoryCounts={categoryCounts}
            subcategoryCounts={subcategoryCounts}
            totalProductCount={products.length}
            products={products}
            hero3dShowcase={hero3dShowcaseDoc ?? siteConfig.hero3dShowcase}
            highlightSlider={heroHighlightSliderDoc}
            promoDiscountPercent={siteConfig.checkout.promoDiscountPercent}
            freeShippingThreshold={siteConfig.checkout.freeShippingThreshold}
            isAdmin={isAdmin}
            onSelectCategory={(cat, sub) => scrollToCatalog(cat, sub)}
            onInspectProduct={setActiveProduct}
            onCustomize3D={() => setIs3DCustomizerOpen(true)}
            onCustomizeHighlightSlider={() => setIsHighlightCustomizerOpen(true)}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSubcategory={handleAddSubcategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            onAdminSignIn={handleAdminSignIn}
            customBoxes={siteConfig.customBoxes ?? []}
            customLinks={siteConfig.customLinks ?? []}
            visibility={currentVisibility}
            isHomeEditMode={isAdmin && isHomeEditMode}
            onExploreCatalog={() => scrollToCatalog('All')}
            onViewBestsellers={() => scrollToCatalog('Boutique')}
            onOpenOrderTracking={() => {
              setTrackingLookupSeed(latestOrder?.orderNumber ?? '');
              setIsTrackingModalOpen(true);
            }}
            onScrollToVouchers={() => {
              const el = document.getElementById('vouchers-strip');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else scrollToCatalog('All');
            }}
            onNavigateLink={navigateSiteLink}
            onEditHero={() =>
              setQuickComposer({
                type: 'hero',
                eyebrow: siteConfig.hero.eyebrow,
                headline: siteConfig.hero.headline,
                description: siteConfig.hero.description,
                primaryCta: siteConfig.hero.primaryCta,
                secondaryCta: siteConfig.hero.secondaryCta,
                imageUrl: siteConfig.hero.imageUrl,
              })
            }
            onToggleSecondaryCta={() =>
              handleToggleVisibilityKey('showHeroSecondaryCta')
            }
            onToggleGuaranteesSection={() =>
              handleToggleVisibilityKey('showHeroGuarantees')
            }
            onAddGuarantee={() => setQuickComposer({ type: 'guarantee' })}
            onEditGuarantee={(index, existing) =>
              setQuickComposer({ type: 'guarantee', index, existing })
            }
            onDeleteGuarantee={handleDeleteGuarantee}
            onAddCustomBox={() =>
              setQuickComposer({ type: 'box', initialPlacement: 'hero' })
            }
            onEditCustomBox={(box) =>
              setQuickComposer({
                type: 'box',
                initialPlacement: box.placement,
                existing: box,
              })
            }
            onDeleteCustomBox={handleDeleteCustomBox}
            onAddHeroLink={() =>
              setQuickComposer({ type: 'link', initialPlacement: 'hero' })
            }
            onEditHeroLink={(link) =>
              setQuickComposer({
                type: 'link',
                initialPlacement: link.placement,
                existing: link,
              })
            }
            onDeleteHeroLink={handleDeleteCustomLink}
            onDeleteSocialAccount={handleDeleteSocialAccount}
            onToggleHeroSection={() =>
              handleToggleVisibilityKey('showHeroSection')
            }
            onToggleHeroEyebrow={() =>
              handleToggleVisibilityKey('showHeroEyebrow')
            }
            onToggleTrackOrderCta={() =>
              handleToggleVisibilityKey('showHeroTrackOrderCta')
            }
            onToggleShareCta={() => handleToggleVisibilityKey('showHeroShareCta')}
            onToggleShortcutsStrip={() =>
              handleToggleVisibilityKey('showMarketplaceShortcuts')
            }
            onEditPromoCard={() =>
              setQuickComposer({
                type: 'promoCard',
                promoCardEyebrow: siteConfig.hero.promoCardEyebrow ?? 'UP TO',
                promoCardBadge: siteConfig.hero.promoCardBadge ?? '',
                promoCardSubBadge: siteConfig.hero.promoCardSubBadge ?? 'OFF',
                promoCardTitle: siteConfig.hero.promoCardTitle ?? 'Vouchers',
                promoCardSubtitle: siteConfig.hero.promoCardSubtitle ?? '& Deals',
                promoCardCta: siteConfig.hero.promoCardCta ?? 'Shop here',
                promoCardTargetUrl:
                  siteConfig.hero.promoCardTargetUrl ?? '#vouchers-strip',
              })
            }
            onTogglePromoCard={() =>
              persistHomeConfigUpdate({
                ...siteConfig,
                hero: {
                  ...siteConfig.hero,
                  showPromoCard: !(siteConfig.hero.showPromoCard ?? true),
                },
              })
            }
            onAddShortcutTile={() => setQuickComposer({ type: 'shortcutTile' })}
            onEditShortcutTile={(existing) =>
              setQuickComposer({ type: 'shortcutTile', existing })
            }
            onDeleteShortcutTile={handleDeleteShortcutTile}
            onResetShortcutTiles={handleResetShortcutTiles}
          />

          <div id="vouchers-strip">
            <MarketplaceVouchersStrip
              storeName={siteConfig.storeName}
              checkout={siteConfig.checkout}
              visibility={currentVisibility}
              collectedPromoCode={collectedPromoCode}
              onCollectVoucher={handleCollectVoucher}
              onShopDeals={() => scrollToCatalog('All')}
              onNavigateLink={navigateSiteLink}
              onOpenCart={openBagDrawer}
              highlightSlider={heroHighlightSliderDoc}
              isAdmin={isAdmin}
              isHomeEditMode={isAdmin && isHomeEditMode}
              onCustomizeHighlightSlider={() => setIsHighlightCustomizerOpen(true)}
              onEditVouchers={() =>
                setQuickComposer({
                  type: 'vouchersEditor',
                  checkout: siteConfig.checkout,
                })
              }
              onToggleVouchers={() =>
                handleToggleVisibilityKey('showVouchersSection')
              }
              onEditCampaignBanner={() =>
                setQuickComposer({
                  type: 'campaignBanner',
                  banner:
                    siteConfig.checkout.campaignBanner ??
                    DEFAULT_SITE_CONFIG.checkout.campaignBanner!,
                })
              }
              onToggleCampaignBanner={() =>
                handleToggleVisibilityKey('showCampaignBanner')
              }
            />
          </div>

          <MarketplaceShowcaseSection
            products={products}
            freeShippingThreshold={siteConfig.checkout.freeShippingThreshold}
            catalogSection={siteConfig.catalogSection}
            visibility={currentVisibility}
            isAdmin={isAdmin}
            isHomeEditMode={isAdmin && isHomeEditMode}
            onInspectProduct={setActiveProduct}
            onQuickAddToCart={(pid, vid) => handleAddToCart(pid, vid, 1)}
            onShopMore={() => scrollToCatalog('All')}
            onAddFirstProduct={() => {
              setManagerTab('products');
              setProductModalIntent({ type: 'new' });
              setIsManagerOpen(true);
            }}
            onEditProduct={(prod) => {
              setManagerTab('products');
              setProductModalIntent({ type: 'edit', product: prod });
              setIsManagerOpen(true);
            }}
            onDeleteProduct={handleDeleteProduct}
            onEditFlashSaleConfig={() =>
              setQuickComposer({
                type: 'flashSaleConfig',
                catalogSection: siteConfig.catalogSection,
              })
            }
            onToggleFlashSale={() =>
              handleToggleVisibilityKey('showFlashSaleSection')
            }
            onToggleChoiceStrip={() =>
              handleToggleVisibilityKey('showChoiceStrip')
            }
          />

          <CustomHomeSections
            sections={siteConfig.customSections ?? []}
            placement="hero"
            isHomeEditMode={isAdmin && isHomeEditMode}
            onNavigateLink={navigateSiteLink}
            onAddSection={(placement) =>
              setQuickComposer({ type: 'section', initialPlacement: placement })
            }
            onEditSection={(section) =>
              setQuickComposer({
                type: 'section',
                initialPlacement: section.placement,
                existing: section,
              })
            }
            onDeleteSection={handleDeleteCustomSection}
          />

          {/* Product Catalog Section */}
          {currentVisibility.showCatalog && (
            <section id="catalog" className="max-w-6xl mx-auto px-6 py-14 lg:py-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-[var(--accent)] mb-2">
                    {siteConfig.catalogSection.eyebrow}
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#141413]">
                    {siteConfig.catalogSection.heading}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs text-[#5A5A56] tabular-nums">
                    Showing {filteredProducts.length} of {products.length} items
                  </p>
                  {isAdmin && isHomeEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setQuickComposer({
                            type: 'sectionHeading',
                            target: 'catalog',
                            eyebrow: siteConfig.catalogSection.eyebrow,
                            heading: siteConfig.catalogSection.heading,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Heading</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManagerTab('products');
                          setProductModalIntent({ type: 'new' });
                          setIsManagerOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibilityKey('showCatalog')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--accent)] bg-white border border-[#D4D4CE] rounded-md hover:border-[var(--accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hide Catalog</span>
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setManagerTab('products');
                        setProductModalIntent(null);
                        setIsManagerOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Store Manager</span>
                    </button>
                  )}
                </div>
              </div>

              <CustomHomeSections
                sections={siteConfig.customSections ?? []}
                placement="catalog"
                isHomeEditMode={isAdmin && isHomeEditMode}
                onNavigateLink={navigateSiteLink}
                onAddSection={(placement) =>
                  setQuickComposer({ type: 'section', initialPlacement: placement })
                }
                onEditSection={(section) =>
                  setQuickComposer({
                    type: 'section',
                    initialPlacement: section.placement,
                    existing: section,
                  })
                }
                onDeleteSection={handleDeleteCustomSection}
              />

              <HomeCustomBoxes
                boxes={siteConfig.customBoxes ?? []}
                placement="catalog"
                isHomeEditMode={isAdmin && isHomeEditMode}
                onNavigateLink={navigateSiteLink}
                onAddBox={() =>
                  setQuickComposer({ type: 'box', initialPlacement: 'catalog' })
                }
                onEditBox={(box) =>
                  setQuickComposer({
                    type: 'box',
                    initialPlacement: box.placement,
                    existing: box,
                  })
                }
                onDeleteBox={handleDeleteCustomBox}
              />

            {/* Interactive Filter, Search & Sort Toolbar */}
            <div className="space-y-3 pb-8 mb-8 border-b border-[#E4E4E0]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Category Segmented Filter Tabs */}
                <div
                  role="tablist"
                  aria-label="Filter by category"
                  className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-lg overflow-x-auto"
                >
                  {['All', ...availableCategories].map((category) => {
                    const isActive = categoryFilter === category && !showSavedOnly;
                    return (
                      <button
                        key={category}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                          setCategoryFilter(category);
                          setSubcategoryFilter('All');
                          setShowSavedOnly(false);
                        }}
                        className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                          isActive
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#5A5A56] hover:text-[#141413]'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>

                {/* Search, Saved Toggle & Sort */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search
                      className="w-3.5 h-3.5 text-[#5A5A56] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      strokeWidth={1.75}
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search any department, dress, kids 1M–10Y, jewellery..."
                      aria-label="Search store catalog"
                      className="w-full h-10 pl-9 pr-8 text-xs bg-white border border-[#D4D4CE] rounded-md placeholder:text-[#8A8A84] focus:outline-none focus:border-[#141413]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSavedOnly((prev) => !prev)}
                    aria-pressed={showSavedOnly}
                    className={`h-10 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      showSavedOnly
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[#D4D4CE] bg-white text-[#141413] hover:border-[#141413]'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-white' : ''}`}
                      strokeWidth={1.75}
                    />
                    <span className="tabular-nums">Saved ({wishlist.length})</span>
                  </button>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort products"
                    className="h-10 px-3 text-xs font-medium bg-white border border-[#D4D4CE] rounded-md text-[#141413] focus:outline-none focus:border-[#141413] cursor-pointer"
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Subcategory Secondary Filter Row */}
              {categoryFilter !== 'All' &&
                activeCategorySubcategories.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div
                      role="tablist"
                      aria-label={`${categoryFilter} sections`}
                      className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-lg overflow-x-auto"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={subcategoryFilter === 'All'}
                        onClick={() => setSubcategoryFilter('All')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          subcategoryFilter === 'All'
                            ? 'bg-white text-[#141413] shadow-xs'
                            : 'text-[#5A5A56] hover:text-[#141413]'
                        }`}
                      >
                        All {categoryFilter}
                      </button>
                      {activeCategorySubcategories.map((sub) => {
                        const isSubActive = subcategoryFilter === sub;
                        const subCount =
                          subcategoryCounts[categoryFilter]?.[sub] ?? 0;
                        return (
                          <button
                            key={`${categoryFilter}-${sub}`}
                            type="button"
                            role="tab"
                            aria-selected={isSubActive}
                            onClick={() => setSubcategoryFilter(sub)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isSubActive
                                ? 'bg-white text-[#141413] shadow-xs'
                                : 'text-[#5A5A56] hover:text-[#141413]'
                            }`}
                          >
                            {sub}{' '}
                            <span className="text-[11px] text-[#8A8A84] tabular-nums">
                              ({subCount})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {isKidsCategory(categoryFilter) && (
                      <p className="text-xs text-[#5A5A56] whitespace-nowrap">
                        Kids Collection <span aria-hidden="true">·</span> 1 Month to 10 Years
                      </p>
                    )}
                  </div>
                )}
            </div>

            {/* 3-Column Product Grid */}
            {products.length === 0 ? (
              <div className="py-16 px-6 text-center bg-white border border-[#E4E4E0] rounded-lg">
                <p className="font-serif text-2xl text-[#141413] mb-1">
                  No products published yet
                </p>
                <p className="text-sm text-[#5A5A56] mb-5">
                  {isAdmin
                    ? 'Add your own products with photos, videos, variants, and PKR pricing.'
                    : 'New collections and products are being added soon.'}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setManagerTab('products');
                      setProductModalIntent({ type: 'new' });
                      setIsManagerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Your First Product</span>
                  </button>
                )}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white border border-[#E4E4E0] rounded-lg">
                <p className="font-serif text-2xl text-[#141413] mb-1">
                  No items match your filter
                </p>
                <p className="text-sm text-[#5A5A56] mb-5">
                  Clear your search or switch back to view the full collection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('All');
                    setSubcategoryFilter('All');
                    setSearchQuery('');
                    setShowSavedOnly(false);
                  }}
                  className="px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => {
                  const activeVariantId =
                    selectedVariants[product.id] || product.variants[0].id;
                  const inBagQuantity =
                    cartItems.find(
                      (item) =>
                        item.productId === product.id &&
                        item.variantId === activeVariantId
                    )?.quantity ?? 0;

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      selectedVariantId={activeVariantId}
                      inBagQuantity={inBagQuantity}
                      onSelectVariant={handleSelectVariant}
                      onAddToCart={(pid, vid) => handleAddToCart(pid, vid, 1)}
                      onOpenDetail={setActiveProduct}
                      isWishlisted={wishlist.includes(product.id)}
                      onToggleWishlist={handleToggleWishlist}
                      isHomeEditMode={isAdmin && isHomeEditMode}
                      onQuickEditProduct={(prod) => {
                        setManagerTab('products');
                        setProductModalIntent({ type: 'edit', product: prod });
                        setIsManagerOpen(true);
                      }}
                      onQuickDeleteProduct={handleDeleteProduct}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

          <HomeCustomBoxes
            boxes={siteConfig.customBoxes ?? []}
            placement="features"
            sectionEyebrow={
              siteConfig.featuresSection?.eyebrow || 'Curated Features & Services'
            }
            sectionHeading={
              siteConfig.featuresSection?.heading || 'Store Highlights & Links'
            }
            isHomeEditMode={isAdmin && isHomeEditMode}
            onNavigateLink={navigateSiteLink}
            onAddBox={() =>
              setQuickComposer({ type: 'box', initialPlacement: 'features' })
            }
            onEditBox={(box) =>
              setQuickComposer({
                type: 'box',
                initialPlacement: box.placement,
                existing: box,
              })
            }
            onDeleteBox={handleDeleteCustomBox}
            onEditSectionHeading={() =>
              setQuickComposer({
                type: 'sectionHeading',
                target: 'features',
                eyebrow:
                  siteConfig.featuresSection?.eyebrow ||
                  'Curated Features & Services',
                heading:
                  siteConfig.featuresSection?.heading ||
                  'Store Highlights & Links',
              })
            }
          />

          <CustomHomeSections
            sections={siteConfig.customSections ?? []}
            placement="features"
            isHomeEditMode={isAdmin && isHomeEditMode}
            onNavigateLink={navigateSiteLink}
            onAddSection={(placement) =>
              setQuickComposer({ type: 'section', initialPlacement: placement })
            }
            onEditSection={(section) =>
              setQuickComposer({
                type: 'section',
                initialPlacement: section.placement,
                existing: section,
              })
            }
            onDeleteSection={handleDeleteCustomSection}
          />

          <PhilosophySection
            storeName={siteConfig.storeName}
            philosophy={siteConfig.philosophy}
            isHomeEditMode={isAdmin && isHomeEditMode}
            onEditHeader={() =>
              setQuickComposer({
                type: 'philosophyHeader',
                eyebrow: siteConfig.philosophy.eyebrow,
                heading: siteConfig.philosophy.heading,
                imageUrl: siteConfig.philosophy.imageUrl,
              })
            }
            onHideSection={() =>
              persistHomeConfigUpdate({
                ...siteConfig,
                philosophy: { ...siteConfig.philosophy, visible: false },
              })
            }
            onAddPillar={() => setQuickComposer({ type: 'pillar' })}
            onEditPillar={(index, existing) =>
              setQuickComposer({ type: 'pillar', index, existing })
            }
            onDeletePillar={handleDeletePillar}
            onAddMetric={() => setQuickComposer({ type: 'metric' })}
            onEditMetric={(index, existing) =>
              setQuickComposer({ type: 'metric', index, existing })
            }
            onDeleteMetric={handleDeleteMetric}
          />
        </main>

        <Footer
          storeName={siteConfig.storeName}
          heroHeadline={siteConfig.hero.headline}
          footerTagline={siteConfig.footerTagline}
          socialLinks={siteConfig.socialLinks}
          catalogSection={siteConfig.catalogSection}
          seo={siteConfig.seo}
          teamMembers={siteConfig.teamMembers}
          categories={availableCategories}
          customLinks={siteConfig.customLinks ?? []}
          visibility={currentVisibility}
          isHomeEditMode={isAdmin && isHomeEditMode}
          onNavigateCategory={scrollToCatalog}
          onNavigateLink={navigateSiteLink}
          latestOrder={latestOrder}
          onViewOrderReceipt={openOrderReceipt}
          onOpenOrderTracking={(orderNumber) => {
            setTrackingLookupSeed(orderNumber || latestOrder?.orderNumber || '');
            setIsTrackingModalOpen(true);
          }}
          isAdmin={isAdmin}
          userEmail={authUser?.email ?? null}
          authLoading={authLoading}
          authNotice={authNotice}
          onAdminSignIn={handleAdminSignIn}
          onSignOut={handleSignOut}
          onOpenCatalogManager={() => {
            if (!isAdmin) return;
            setManagerTab('products');
            setProductModalIntent(null);
            setIsManagerOpen(true);
          }}
          onOpenSocialManager={() => {
            if (!isAdmin) return;
            setManagerTab('social');
            setProductModalIntent(null);
            setIsManagerOpen(true);
          }}
          onOpenSeoMembersManager={() => {
            if (!isAdmin) return;
            setManagerTab('seo-members');
            setProductModalIntent(null);
            setIsManagerOpen(true);
          }}
          onAddFooterLink={() =>
            setQuickComposer({ type: 'link', initialPlacement: 'footer' })
          }
          onEditFooterLink={(link) =>
            setQuickComposer({
              type: 'link',
              initialPlacement: link.placement,
              existing: link,
            })
          }
          onDeleteFooterLink={handleDeleteCustomLink}
          onDeleteSocialAccount={handleDeleteSocialAccount}
          onDeleteTeamMember={handleDeleteTeamMember}
          onToggleTeamMembersBox={() =>
            handleToggleVisibilityKey('showTeamMembers')
          }
          onToggleSeoBox={() => handleToggleVisibilityKey('showSeoCard')}
          onEditFooterConfig={() =>
            setQuickComposer({
              type: 'footerConfig',
              storeName: siteConfig.storeName,
              footerTagline: siteConfig.footerTagline,
              newsletterEyebrow:
                siteConfig.catalogSection.newsletterEyebrow ?? 'Newsletter',
              newsletterHeading:
                siteConfig.catalogSection.newsletterHeading ??
                'Receive seasonal releases & private collection notes',
              newsletterDescription:
                siteConfig.catalogSection.newsletterDescription ?? '',
              newsletterButtonLabel:
                siteConfig.catalogSection.newsletterButtonLabel ?? 'Subscribe',
              showFooterNewsletter: currentVisibility.showFooterNewsletter ?? true,
              showBottomNavBar: currentVisibility.showBottomNavBar ?? true,
            })
          }
          onToggleFooterNewsletter={() =>
            handleToggleVisibilityKey('showFooterNewsletter')
          }
          onSubscribeNewsletter={handleSubscribeNewsletter}
        />
      </div>

      <ProductDetailModal
        product={activeProduct}
        selectedVariantId={
          activeProduct
            ? selectedVariants[activeProduct.id] || activeProduct.variants[0].id
            : ''
        }
        socialLinks={siteConfig.socialLinks}
        onSelectVariant={handleSelectVariant}
        onAddToCart={handleAddToCart}
        onClose={() => setActiveProduct(null)}
        isWishlisted={activeProduct ? wishlist.includes(activeProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        products={products}
        storeName={siteConfig.storeName}
        storeWhatsappNumber={siteConfig.socialLinks.whatsappNumber}
        checkoutConfig={siteConfig.checkout}
        collectedPromoCode={collectedPromoCode}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
        latestOrder={latestOrder}
        onOrderConfirmed={handleOrderConfirmed}
        onTrackOrder={(orderNumber) => {
          setIsCartOpen(false);
          setTrackingLookupSeed(orderNumber);
          setIsTrackingModalOpen(true);
        }}
        initialView={drawerInitialView}
      />

      {(currentVisibility.showBottomNavBar ?? true) && (
        <BottomAppBar
          storeName={siteConfig.storeName}
          cartCount={cartCount}
          wishlistCount={wishlist.length}
          categories={availableCategories}
          whatsappNumber={siteConfig.socialLinks.whatsappNumber}
          whatsappMessage={siteConfig.socialLinks.whatsappMessage}
          latestOrder={latestOrder}
          isAdmin={isAdmin}
          onScrollHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          onSelectCategory={(cat) => scrollToCatalog(cat)}
          onOpenCart={openBagDrawer}
          onOpenOrderTracking={() => {
            setTrackingLookupSeed(latestOrder?.orderNumber ?? '');
            setIsTrackingModalOpen(true);
          }}
          onOpenReceipt={openOrderReceipt}
          onOpenSavedWishlist={() => {
            setShowSavedOnly(true);
            scrollToCatalog();
          }}
          onOpenStoreManager={() => {
            setManagerTab('products');
            setProductModalIntent(null);
            setIsManagerOpen(true);
          }}
          onAdminSignIn={handleAdminSignIn}
          onScrollToNewsletter={() => {
            const el = document.getElementById('footer-concierge');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      <OrderTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        initialOrderNumber={trackingLookupSeed}
        latestOrder={latestOrder}
        storeName={siteConfig.storeName}
        storeWhatsappNumber={siteConfig.socialLinks.whatsappNumber}
      />

      {isAdmin && (
        <>
          <CatalogManagerModal
            isOpen={isManagerOpen}
            onClose={() => {
              setIsManagerOpen(false);
              setProductModalIntent(null);
            }}
            products={products}
            categories={availableCategories}
            subcategoriesMap={availableSubcategoriesMap}
            onAddCategory={handleAddCategory}
            onAddSubcategory={handleAddSubcategory}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            siteConfig={siteConfig}
            onSaveSiteConfig={handleSaveSiteConfig}
            onResetSiteConfig={handleResetSiteConfig}
            orders={orders}
            trackingRecords={trackingRecords}
            onPublishOrderTracking={handlePublishOrderTracking}
            onCreateManualOrder={handleCreateManualOrder}
            subscribers={subscribers}
            onResetSampleOrders={handleResetSampleOrders}
            onClearOrders={handleClearOrders}
            onDeleteSubscriber={handleDeleteSubscriber}
            mediaAssets={mediaAssets}
            onAddMediaAssets={handleAddMediaAssets}
            onUpdateMediaAsset={handleUpdateMediaAsset}
            onDeleteMediaAssets={handleDeleteMediaAssets}
            initialTab={managerTab}
            initialProductIntent={productModalIntent}
          />

          <HomeQuickComposerModal
            composer={quickComposer}
            categories={availableCategories}
            storeName={siteConfig.storeName}
            onClose={() => setQuickComposer(null)}
            onSaveBox={handleSaveCustomBox}
            onSaveLink={handleSaveCustomLink}
            onSaveGuarantee={handleSaveGuarantee}
            onSavePillar={handleSavePillar}
            onSaveMetric={handleSaveMetric}
            onSaveHeroCopy={(patch) =>
              persistHomeConfigUpdate({
                ...siteConfig,
                hero: { ...siteConfig.hero, ...patch },
              })
            }
            onSaveHeaderBg={handleSaveHeaderBg}
            onSaveCustomSection={handleSaveCustomSection}
            onSaveTheme={handleSaveTheme}
            onSaveSectionHeading={handleSaveSectionHeading}
            onSaveHeaderText={handleSaveHeaderText}
            onSavePromoCard={handleSavePromoCard}
            onSaveShortcutTile={handleSaveShortcutTile}
            onSaveVouchers={handleSaveVouchers}
            onSaveCampaignBanner={handleSaveCampaignBanner}
            onSaveFlashSaleConfig={handleSaveFlashSaleConfig}
            onSavePhilosophyHeader={handleSavePhilosophyHeader}
            onSaveFooterConfig={handleSaveFooterConfig}
            onSaveSectionManager={handleSaveSectionManager}
          />

          <Hero3DCustomizerModal
            isOpen={is3DCustomizerOpen}
            initialConfig={hero3dShowcaseDoc ?? siteConfig.hero3dShowcase}
            products={products}
            categories={availableCategories}
            subcategoriesMap={availableSubcategoriesMap}
            mediaAssets={mediaAssets}
            onAddMediaAssets={handleAddMediaAssets}
            onClose={() => setIs3DCustomizerOpen(false)}
            onSave={(nextShowcase: Hero3DShowcaseConfig) => {
              void handleSaveHero3DShowcase(nextShowcase);
            }}
          />

          <HighlightSliderCustomizerModal
            isOpen={isHighlightCustomizerOpen}
            initialConfig={heroHighlightSliderDoc}
            products={products}
            categories={availableCategories}
            mediaAssets={mediaAssets}
            onAddMediaAssets={handleAddMediaAssets}
            onClose={() => setIsHighlightCustomizerOpen(false)}
            onSave={handleSaveHeroHighlightSlider}
          />
        </>
      )}
    </div>
  );
}
