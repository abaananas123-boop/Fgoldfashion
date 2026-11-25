import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  CustomerProfile,
  DEFAULT_SUBCATEGORIES,
  Hero3DShowcaseConfig,
  HeroHighlightSliderConfig,
  HomeSectionId,
  OrderRecord,
  OrderTrackingEvent,
  OrderTrackingRecord,
  Product,
  SectionAlign,
  SiteConfig,
} from './types';

export const ADMIN_EMAIL = 'abaananas123@gmail.com';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  return (
    user.emailVerified === true &&
    user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
}

export async function signInAsAdmin(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInAsCustomer(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

// Validate Firestore connection on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function toValidFirestoreId(raw: string, fallbackPrefix = 'item'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function sanitizeProductForFirestore(
  product: Product,
  sortOrder?: number
) {
  const safeId = toValidFirestoreId(product.id, 'prod');
  const payload: Record<string, unknown> = {
    id: safeId,
    name: product.name.trim().slice(0, 160),
    subtitle: product.subtitle.trim().slice(0, 200),
    category: product.category.trim().slice(0, 60) || 'Boutique',
    price: Math.max(1, Math.min(10000000, Math.round(Number(product.price) || 1))),
    volume: product.volume.trim().slice(0, 60),
    imageUrl: product.imageUrl.trim().slice(0, 350000),
    description: product.description.trim().slice(0, 1500),
    skinTypes: product.skinTypes.trim().slice(0, 200),
    finish: product.finish.trim().slice(0, 200),
    keyActives: product.keyActives.slice(0, 15).map((a) => ({
      name: a.name.trim().slice(0, 120),
      concentration: a.concentration.trim().slice(0, 60),
      benefit: a.benefit.trim().slice(0, 400),
    })),
    fullIngredients: product.fullIngredients.trim().slice(0, 2000),
    howToUse: product.howToUse.trim().slice(0, 1000),
    variants: product.variants.slice(0, 20).map((v) => {
      const cleaned: Record<string, unknown> = {
        id: toValidFirestoreId(v.id, 'var'),
        name: v.name.trim().slice(0, 120),
        detail: v.detail.trim().slice(0, 200),
        inStock: Boolean(v.inStock),
      };
      if (v.hex) cleaned.hex = v.hex.slice(0, 16);
      if (typeof v.priceDelta === 'number' && Number.isFinite(v.priceDelta)) {
        cleaned.priceDelta = Math.round(v.priceDelta);
      }
      return cleaned;
    }),
    updatedAt: serverTimestamp(),
  };

  if (product.subcategory && product.subcategory.trim()) {
    payload.subcategory = product.subcategory.trim().slice(0, 60);
  }
  if (product.statusNote && product.statusNote.trim()) {
    payload.statusNote = product.statusNote.trim().slice(0, 60);
  }
  if (
    typeof product.stockQuantity === 'number' &&
    Number.isFinite(product.stockQuantity) &&
    product.stockQuantity >= 0
  ) {
    payload.stockQuantity = Math.min(100000, Math.round(product.stockQuantity));
  }
  if (product.videoUrl && product.videoUrl.trim()) {
    payload.videoUrl = product.videoUrl.trim().slice(0, 2000);
  }
  if (Array.isArray(product.mediaGallery) && product.mediaGallery.length > 0) {
    const seen = new Set<string>();
    const gallery: string[] = [];
    for (const rawUrl of product.mediaGallery) {
      const cleanUrl = String(rawUrl || '').trim().slice(0, 2000);
      if (cleanUrl && !seen.has(cleanUrl)) {
        seen.add(cleanUrl);
        gallery.push(cleanUrl);
      }
      if (gallery.length >= 12) break;
    }
    if (gallery.length > 0) {
      payload.mediaGallery = gallery;
    }
  }
  if (typeof sortOrder === 'number' && Number.isFinite(sortOrder)) {
    payload.sortOrder = sortOrder;
  }

  return { id: safeId, payload };
}

export function sanitizeSiteConfigForFirestore(config: SiteConfig) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(config.accentColor)
    ? config.accentColor
    : '#6D2932';

  const safeHex = (raw: string | undefined, fallback: string) =>
    raw && /^#[0-9a-fA-F]{3,8}$/.test(raw.trim())
      ? raw.trim().slice(0, 30)
      : fallback;

  return {
    storeName: config.storeName.trim().slice(0, 100) || 'f. Gold & fashion',
    footerTagline: config.footerTagline.trim().slice(0, 300),
    accentColor: accent,
    headerBackgroundImage: (config.headerBackgroundImage || '').trim().slice(0, 250000),
    headerTextTheme: config.headerTextTheme === 'light' ? 'light' : 'dark',
    navLabels: {
      shopAll: config.navLabels.shopAll.trim().slice(0, 40),
      skincare: config.navLabels.skincare.trim().slice(0, 40),
      color: config.navLabels.color.trim().slice(0, 40),
      ingredients: config.navLabels.ingredients.trim().slice(0, 40),
      searchPlaceholder: (config.navLabels.searchPlaceholder ?? 'Search dresses, jewellery, kids...').trim().slice(0, 80),
      searchButtonLabel: (config.navLabels.searchButtonLabel ?? 'Search').trim().slice(0, 30),
      trackOrderLabel: (config.navLabels.trackOrderLabel ?? 'Track Order').trim().slice(0, 40),
      dealsBadgeTop: (config.navLabels.dealsBadgeTop ?? 'FLASH').trim().slice(0, 20),
      dealsBadgeBottom: (config.navLabels.dealsBadgeBottom ?? 'DEALS').trim().slice(0, 20),
      bagLabel: (config.navLabels.bagLabel ?? 'Bag').trim().slice(0, 24),
    },
    categories: (() => {
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const raw of config.categories || []) {
        const trimmed = String(raw || '').trim().slice(0, 60);
        if (trimmed && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          cleaned.push(trimmed);
        }
        if (cleaned.length >= 40) break;
      }
      return cleaned.length > 0
        ? cleaned
        : ['Boutique', 'Artificial Jewellery', 'Western Wear', 'Eastern Wear', 'Baby Garments', 'Skincare', 'Fragrance', 'Cosmetics'];
    })(),
    subcategories: (() => {
      const source = config.subcategories ?? DEFAULT_SUBCATEGORIES;
      const result: Record<string, string[]> = {};
      let keyCount = 0;
      for (const [rawKey, rawList] of Object.entries(source)) {
        if (keyCount >= 40) break;
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
          keyCount += 1;
        }
      }
      return result;
    })(),
    hero: {
      eyebrow: config.hero.eyebrow.trim().slice(0, 120),
      headline: config.hero.headline.trim().slice(0, 200),
      description: config.hero.description.trim().slice(0, 500),
      primaryCta: config.hero.primaryCta.trim().slice(0, 60),
      secondaryCta: config.hero.secondaryCta.trim().slice(0, 60),
      imageUrl: config.hero.imageUrl.trim().slice(0, 350000),
      promoCardEyebrow: (config.hero.promoCardEyebrow ?? 'UP TO').trim().slice(0, 30),
      promoCardBadge: (config.hero.promoCardBadge ?? '').trim().slice(0, 20),
      promoCardSubBadge: (config.hero.promoCardSubBadge ?? 'OFF').trim().slice(0, 20),
      promoCardTitle: (config.hero.promoCardTitle ?? 'Vouchers').trim().slice(0, 40),
      promoCardSubtitle: (config.hero.promoCardSubtitle ?? '& Deals').trim().slice(0, 40),
      promoCardCta: (config.hero.promoCardCta ?? 'Shop here').trim().slice(0, 40),
      promoCardTargetUrl: (config.hero.promoCardTargetUrl ?? '#vouchers-strip').trim().slice(0, 300),
      showPromoCard: config.hero.showPromoCard ?? true,
      ...(Array.isArray(config.hero.shortcutTiles)
        ? {
            shortcutTiles: config.hero.shortcutTiles.slice(0, 24).map((tile, idx) => ({
              id: toValidFirestoreId(tile.id || `tile-${idx + 1}`, 'tile'),
              label: String(tile.label || '').trim().slice(0, 40) || 'Shop',
              badgeText: String(tile.badgeText || '').trim().slice(0, 16),
              imageUrl: String(tile.imageUrl || '').trim().slice(0, 100000),
              bgColor: safeHex(tile.bgColor, '#F85606'),
              textColor: safeHex(tile.textColor, '#FFFFFF'),
              targetUrl: String(tile.targetUrl || '#catalog').trim().slice(0, 300),
            })),
          }
        : {}),
      guarantees: config.hero.guarantees.slice(0, 12).map((g) => ({
        title: g.title.trim().slice(0, 80),
        subtitle: g.subtitle.trim().slice(0, 160),
      })),
    },
    catalogSection: {
      eyebrow: config.catalogSection.eyebrow.trim().slice(0, 120),
      heading: config.catalogSection.heading.trim().slice(0, 160),
      flashSaleTitle: (config.catalogSection.flashSaleTitle ?? 'Flash Sale').trim().slice(0, 80),
      flashSaleBadge: (config.catalogSection.flashSaleBadge ?? 'Top Picks').trim().slice(0, 40),
      flashSaleCtaLabel: (config.catalogSection.flashSaleCtaLabel ?? 'Shop More').trim().slice(0, 60),
      flashSaleProductIds: (config.catalogSection.flashSaleProductIds ?? [])
        .map((id) => String(id || '').trim().slice(0, 128))
        .filter(Boolean)
        .slice(0, 12),
      choiceBadge: (config.catalogSection.choiceBadge ?? 'CHOICE').trim().slice(0, 30),
      choiceHeading: (config.catalogSection.choiceHeading ?? 'Curated Picks').trim().slice(0, 80),
      choiceFreeDeliveryText: (config.catalogSection.choiceFreeDeliveryText ?? '').trim().slice(0, 80),
      choiceCtaLabel: (config.catalogSection.choiceCtaLabel ?? 'Shop Now | All Departments').trim().slice(0, 60),
      choiceProductIds: (config.catalogSection.choiceProductIds ?? [])
        .map((id) => String(id || '').trim().slice(0, 128))
        .filter(Boolean)
        .slice(0, 6),
      newsletterEyebrow: (config.catalogSection.newsletterEyebrow ?? 'Newsletter').trim().slice(0, 60),
      newsletterHeading: (
        config.catalogSection.newsletterHeading ??
        'Receive seasonal releases & private collection notes'
      )
        .trim()
        .slice(0, 160),
      newsletterDescription: (config.catalogSection.newsletterDescription ?? '').trim().slice(0, 300),
      newsletterButtonLabel: (config.catalogSection.newsletterButtonLabel ?? 'Subscribe').trim().slice(0, 30),
    },
    featuresSection: {
      eyebrow: (config.featuresSection?.eyebrow ?? 'Curated Features & Services').trim().slice(0, 120),
      heading: (config.featuresSection?.heading ?? 'Store Highlights & Links').trim().slice(0, 160),
    },
    philosophy: {
      visible: Boolean(config.philosophy.visible),
      eyebrow: config.philosophy.eyebrow.trim().slice(0, 120),
      heading: config.philosophy.heading.trim().slice(0, 240),
      imageUrl: config.philosophy.imageUrl.trim().slice(0, 350000),
      pillars: config.philosophy.pillars.slice(0, 10).map((p) => ({
        title: p.title.trim().slice(0, 120),
        description: p.description.trim().slice(0, 400),
      })),
      metrics: config.philosophy.metrics.slice(0, 10).map((m) => ({
        value: m.value.trim().slice(0, 30),
        label: m.label.trim().slice(0, 80),
      })),
    },
    checkout: {
      freeShippingThreshold: Math.max(
        0,
        Math.round(Number(config.checkout.freeShippingThreshold) || 0)
      ),
      standardShippingFee: Math.max(
        0,
        Math.round(Number(config.checkout.standardShippingFee) || 0)
      ),
      promoCode: String(config.checkout.promoCode || '')
        .trim()
        .slice(0, 30)
        .toUpperCase(),
      promoDiscountPercent: Math.min(
        90,
        Math.max(0, Math.round(Number(config.checkout.promoDiscountPercent) || 0))
      ),
      coupons: (config.checkout.coupons ?? [])
        .slice(0, 20)
        .filter((c) => Boolean(c && c.code && c.code.trim()))
        .map((c, idx) => ({
          id: toValidFirestoreId(c.id || `coupon-${idx + 1}`, 'coupon'),
          code: String(c.code || '').trim().slice(0, 30).toUpperCase(),
          discountPercent: Math.min(90, Math.max(1, Math.round(Number(c.discountPercent) || 10))),
          ...(typeof c.minOrderAmount === 'number' && Number.isFinite(c.minOrderAmount) && c.minOrderAmount > 0
            ? { minOrderAmount: Math.round(c.minOrderAmount) }
            : {}),
          ...(c.expiresAt && c.expiresAt.trim()
            ? { expiresAt: c.expiresAt.trim().slice(0, 40) }
            : {}),
          active: Boolean(c.active),
        })),
      cityShippingRates: (config.checkout.cityShippingRates ?? [])
        .slice(0, 40)
        .filter((r) => Boolean(r && r.city && r.city.trim()))
        .map((r, idx) => ({
          id: toValidFirestoreId(r.id || `city-${idx + 1}`, 'city'),
          city: String(r.city || '').trim().slice(0, 60),
          fee: Math.max(0, Math.round(Number(r.fee) || 0)),
          ...(typeof r.freeAbove === 'number' && Number.isFinite(r.freeAbove) && r.freeAbove > 0
            ? { freeAbove: Math.round(r.freeAbove) }
            : {}),
        })),
      vouchersHeading: (config.checkout.vouchersHeading ?? 'Collect Vouchers & Save More').trim().slice(0, 120),
      vouchersMoreLabel: (config.checkout.vouchersMoreLabel ?? 'More Vouchers').trim().slice(0, 40),
      vouchersCtaLabel: (config.checkout.vouchersCtaLabel ?? 'Collect All').trim().slice(0, 40),
      vouchersCollectedLabel: (config.checkout.vouchersCollectedLabel ?? 'Collected · Apply in Bag').trim().slice(0, 60),
      voucherLeftSubtitle: (config.checkout.voucherLeftSubtitle ?? 'Voucher Max').trim().slice(0, 60),
      voucherRightSubtitle: (config.checkout.voucherRightSubtitle ?? '').trim().slice(0, 80),
      campaignBanner: {
        eyebrow: (config.checkout.campaignBanner?.eyebrow ?? '').trim().slice(0, 80),
        heading: (config.checkout.campaignBanner?.heading ?? 'SEASONAL GRAND SALE').trim().slice(0, 120),
        subtitle: (config.checkout.campaignBanner?.subtitle ?? 'Boutique · Jewellery · Kids (1M–10Y) · Beauty').trim().slice(0, 140),
        ribbonText: (config.checkout.campaignBanner?.ribbonText ?? '').trim().slice(0, 140),
        ctaLabel: (config.checkout.campaignBanner?.ctaLabel ?? 'Shop Campaign').trim().slice(0, 40),
        ctaUrl: (config.checkout.campaignBanner?.ctaUrl ?? '#catalog').trim().slice(0, 300),
        leftImageUrl: (config.checkout.campaignBanner?.leftImageUrl ?? '/src/assets/images/product_bridal_dress_1795171611227.jpg').trim().slice(0, 120000),
        rightImageUrl: (config.checkout.campaignBanner?.rightImageUrl ?? '/src/assets/images/product_artificial_jewellery_1795093182654.jpg').trim().slice(0, 120000),
        bgColor: safeHex(config.checkout.campaignBanner?.bgColor, '#68124B'),
      },
    },
    socialLinks: {
      whatsappNumber: String(config.socialLinks.whatsappNumber || '').trim().slice(0, 30),
      whatsappMessage: String(config.socialLinks.whatsappMessage || '').trim().slice(0, 300),
      showOnProductPage: Boolean(config.socialLinks.showOnProductPage),
      googleReviewUrl: (config.socialLinks.googleReviewUrl || '')
        .trim()
        .slice(0, 300),
      accounts: (config.socialLinks.accounts || []).slice(0, 20).map((acc) => ({
        id: toValidFirestoreId(acc.id || 'social', 'social'),
        platform: acc.platform || 'other',
        label: String(acc.label || '').trim().slice(0, 80),
        url: String(acc.url || '').trim().slice(0, 300),
      })),
    },
    seo: {
      metaTitle: (config.seo?.metaTitle || '').trim().slice(0, 120),
      metaDescription: (config.seo?.metaDescription || '').trim().slice(0, 320),
      keywords: (config.seo?.keywords || '').trim().slice(0, 400),
      canonicalUrl: (config.seo?.canonicalUrl || '').trim().slice(0, 300),
      city: (config.seo?.city || '').trim().slice(0, 80),
      country: (config.seo?.country || '').trim().slice(0, 80),
      allowIndexing: config.seo ? Boolean(config.seo.allowIndexing) : true,
    },
    teamMembers: (config.teamMembers || []).slice(0, 30).map((member) => {
      const cleaned: Record<string, string> = {
        id: toValidFirestoreId(member.id, 'member'),
        name: member.name.trim().slice(0, 100),
        role: member.role.trim().slice(0, 100),
      };
      if (member.specialty && member.specialty.trim()) {
        cleaned.specialty = member.specialty.trim().slice(0, 160);
      }
      if (member.phone && member.phone.trim()) {
        cleaned.phone = member.phone.trim().slice(0, 32);
      }
      if (member.email && member.email.trim()) {
        cleaned.email = member.email.trim().slice(0, 160);
      }
      return cleaned;
    }),
    customBoxes: (config.customBoxes || []).slice(0, 24).map((box) => {
      const cleaned: Record<string, unknown> = {
        id: toValidFirestoreId(box.id, 'box'),
        title: box.title.trim().slice(0, 120),
        description: box.description.trim().slice(0, 500),
        placement:
          box.placement === 'hero' || box.placement === 'catalog'
            ? box.placement
            : 'features',
      };
      if (box.eyebrow && box.eyebrow.trim()) {
        cleaned.eyebrow = box.eyebrow.trim().slice(0, 80);
      }
      if (box.imageUrl && box.imageUrl.trim()) {
        cleaned.imageUrl = box.imageUrl.trim().slice(0, 120000);
      }
      if (Array.isArray(box.mediaGallery) && box.mediaGallery.length > 0) {
        const seen = new Set<string>();
        const gallery: string[] = [];
        for (const rawUrl of box.mediaGallery) {
          const cleanUrl = String(rawUrl || '').trim().slice(0, 2000);
          if (cleanUrl && !seen.has(cleanUrl)) {
            seen.add(cleanUrl);
            gallery.push(cleanUrl);
          }
          if (gallery.length >= 12) break;
        }
        if (gallery.length > 0) {
          cleaned.mediaGallery = gallery;
        }
      }
      if (box.linkLabel && box.linkLabel.trim()) {
        cleaned.linkLabel = box.linkLabel.trim().slice(0, 60);
      }
      if (box.linkUrl && box.linkUrl.trim()) {
        cleaned.linkUrl = box.linkUrl.trim().slice(0, 300);
      }
      return cleaned;
    }),
    customLinks: (config.customLinks || []).slice(0, 30).map((link) => ({
      id: toValidFirestoreId(link.id, 'link'),
      label: link.label.trim().slice(0, 60),
      url: link.url.trim().slice(0, 300),
      placement:
        link.placement === 'hero' || link.placement === 'footer'
          ? link.placement
          : 'quickbar',
      openInNewTab: Boolean(link.openInNewTab),
    })),
    homeSliders: [],
    customSections: (config.customSections || []).slice(0, 15).map((section) => {
      const cleaned: Record<string, unknown> = {
        id: toValidFirestoreId(section.id, 'sec'),
        heading: section.heading.trim().slice(0, 160) || 'Custom Section',
        body: section.body.trim().slice(0, 1200),
        placement:
          section.placement === 'hero' || section.placement === 'catalog'
            ? section.placement
            : 'features',
        textAlign: section.textAlign === 'center' ? 'center' : 'left',
        headingStyle:
          section.headingStyle === 'sans' || section.headingStyle === 'italic'
            ? section.headingStyle
            : 'serif',
      };
      if (section.eyebrow && section.eyebrow.trim()) {
        cleaned.eyebrow = section.eyebrow.trim().slice(0, 80);
      }
      if (section.imageUrl && section.imageUrl.trim()) {
        cleaned.imageUrl = section.imageUrl.trim().slice(0, 100000);
      }
      if (Array.isArray(section.mediaGallery) && section.mediaGallery.length > 0) {
        const seen = new Set<string>();
        const gallery: string[] = [];
        for (const rawUrl of section.mediaGallery) {
          const cleanUrl = String(rawUrl || '').trim().slice(0, 2000);
          if (cleanUrl && !seen.has(cleanUrl)) {
            seen.add(cleanUrl);
            gallery.push(cleanUrl);
          }
          if (gallery.length >= 12) break;
        }
        if (gallery.length > 0) {
          cleaned.mediaGallery = gallery;
        }
      }
      if (section.ctaLabel && section.ctaLabel.trim()) {
        cleaned.ctaLabel = section.ctaLabel.trim().slice(0, 60);
      }
      if (section.ctaUrl && section.ctaUrl.trim()) {
        cleaned.ctaUrl = section.ctaUrl.trim().slice(0, 300);
      }
      if (section.backgroundColor && section.backgroundColor.trim()) {
        cleaned.backgroundColor = safeHex(section.backgroundColor, '#FFFFFF');
      }
      if (section.textColor && section.textColor.trim()) {
        cleaned.textColor = safeHex(section.textColor, '#141413');
      }
      return cleaned;
    }),
    homeTheme: {
      pageBgColor: safeHex(config.homeTheme?.pageBgColor, '#FAFAFA'),
      surfaceColor: safeHex(config.homeTheme?.surfaceColor, '#FFFFFF'),
      textColor: safeHex(config.homeTheme?.textColor, '#141413'),
      mutedTextColor: safeHex(config.homeTheme?.mutedTextColor, '#5A5A56'),
      borderColor: safeHex(config.homeTheme?.borderColor, '#E4E4E0'),
      buttonBgColor: safeHex(config.homeTheme?.buttonBgColor, '#141413'),
      buttonTextColor: safeHex(config.homeTheme?.buttonTextColor, '#FFFFFF'),
      headingFont: (config.homeTheme?.headingFont || 'Cormorant Garamond').slice(0, 60),
      bodyFont: (config.homeTheme?.bodyFont || 'Plus Jakarta Sans').slice(0, 60),
      headingStyle:
        config.homeTheme?.headingStyle === 'italic' ||
        config.homeTheme?.headingStyle === 'uppercase'
          ? config.homeTheme.headingStyle
          : 'normal',
      headingWeight:
        config.homeTheme?.headingWeight === 'normal' ||
        config.homeTheme?.headingWeight === 'semibold' ||
        config.homeTheme?.headingWeight === 'bold'
          ? config.homeTheme.headingWeight
          : 'medium',
      bodyWeight: config.homeTheme?.bodyWeight === 'medium' ? 'medium' : 'normal',
      headingScale:
        config.homeTheme?.headingScale === 'compact' ||
        config.homeTheme?.headingScale === 'large'
          ? config.homeTheme.headingScale
          : 'standard',
    },
    visibility: {
      showHeroGuarantees: config.visibility?.showHeroGuarantees ?? true,
      showHeroSecondaryCta: config.visibility?.showHeroSecondaryCta ?? true,
      showCatalog: config.visibility?.showCatalog ?? true,
      showTeamMembers: config.visibility?.showTeamMembers ?? true,
      showSeoCard: config.visibility?.showSeoCard ?? true,
      showHeaderSearch: config.visibility?.showHeaderSearch ?? true,
      showHeaderDealsBadge: config.visibility?.showHeaderDealsBadge ?? true,
      showHeroSection: config.visibility?.showHeroSection ?? true,
      showHeroEyebrow: config.visibility?.showHeroEyebrow ?? true,
      showHeroTrackOrderCta: config.visibility?.showHeroTrackOrderCta ?? true,
      showHeroShareCta: config.visibility?.showHeroShareCta ?? true,
      showMarketplaceShortcuts: config.visibility?.showMarketplaceShortcuts ?? true,
      showVouchersSection: config.visibility?.showVouchersSection ?? true,
      showCampaignBanner: config.visibility?.showCampaignBanner ?? true,
      showFlashSaleSection: config.visibility?.showFlashSaleSection ?? true,
      showChoiceStrip: config.visibility?.showChoiceStrip ?? true,
      showFooterNewsletter: config.visibility?.showFooterNewsletter ?? true,
      showBottomNavBar: config.visibility?.showBottomNavBar ?? true,
    },
    homeLayout: (() => {
      const validIds: HomeSectionId[] = [
        'heroStage',
        'trustBar',
        'shortcutsStrip',
        'highlightSlider',
        'vouchersBanner',
        'flashAndChoice',
        'customHeroSections',
        'catalog',
        'featuresSection',
        'philosophy',
      ];
      const rawOrder = Array.isArray(config.homeLayout?.sectionOrder)
        ? config.homeLayout!.sectionOrder
        : [];
      const seen = new Set<HomeSectionId>();
      const cleanedOrder: HomeSectionId[] = [];
      for (const raw of rawOrder) {
        if (validIds.includes(raw as HomeSectionId) && !seen.has(raw as HomeSectionId)) {
          seen.add(raw as HomeSectionId);
          cleanedOrder.push(raw as HomeSectionId);
        }
      }
      for (const defId of validIds) {
        if (!seen.has(defId)) {
          seen.add(defId);
          cleanedOrder.push(defId);
        }
      }

      const cleanedMeta: Record<string, { align: SectionAlign; reverseSplit?: boolean }> = {};
      const rawMeta = config.homeLayout?.sectionMeta ?? {};
      for (const id of validIds) {
        const entry = rawMeta[id];
        if (!entry || typeof entry !== 'object') continue;
        const align: SectionAlign =
          entry.align === 'center' || entry.align === 'right' ? entry.align : 'left';
        const nextEntry: { align: SectionAlign; reverseSplit?: boolean } = { align };
        if (typeof entry.reverseSplit === 'boolean' && entry.reverseSplit) {
          nextEntry.reverseSplit = true;
        }
        if (align !== 'left' || nextEntry.reverseSplit) {
          cleanedMeta[id] = nextEntry;
        }
      }

      return {
        sectionOrder: cleanedOrder,
        sectionMeta: cleanedMeta,
      };
    })(),
    updatedAt: serverTimestamp(),
  };
}

export function sanitizeHero3DShowcaseForFirestore(
  showcase?: Hero3DShowcaseConfig
) {
  const safeOptionalHex = (raw: string | undefined): string | undefined => {
    const trimmed = String(raw || '').trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed.slice(0, 30) : undefined;
  };

  const payload: Record<string, unknown> = {
    enabled: showcase?.enabled ?? true,
    mode: showcase?.mode === 'custom' ? ('custom' as const) : ('auto-products' as const),
    frameStyle:
      showcase?.frameStyle === 'frameless' ||
      showcase?.frameStyle === 'obsidian' ||
      showcase?.frameStyle === 'silver'
        ? showcase.frameStyle
        : ('gold' as const),
    aspectShape:
      showcase?.aspectShape === 'square' ||
      showcase?.aspectShape === 'landscape'
        ? showcase.aspectShape
        : ('portrait' as const),
    depthLevel:
      showcase?.depthLevel === 'subtle' ||
      showcase?.depthLevel === 'bold'
        ? showcase.depthLevel
        : ('medium' as const),
    boxTheme:
      showcase?.boxTheme === 'ivory' ||
      showcase?.boxTheme === 'warm' ||
      showcase?.boxTheme === 'obsidian' ||
      showcase?.boxTheme === 'gold'
        ? showcase.boxTheme
        : ('transparent' as const),
    autoPlay: Boolean(showcase?.autoPlay),
    intervalSeconds:
      typeof showcase?.intervalSeconds === 'number' &&
      Number.isFinite(showcase.intervalSeconds)
        ? Math.min(15, Math.max(2, Math.round(showcase.intervalSeconds)))
        : 4,
    lightingIntensity:
      typeof showcase?.lightingIntensity === 'number' &&
      Number.isFinite(showcase.lightingIntensity)
        ? Math.min(200, Math.max(40, Math.round(showcase.lightingIntensity)))
        : 100,
    shadowDepth:
      typeof showcase?.shadowDepth === 'number' &&
      Number.isFinite(showcase.shadowDepth)
        ? Math.min(200, Math.max(0, Math.round(showcase.shadowDepth)))
        : 100,
    showCaptions: showcase?.showCaptions ?? true,
    showSubtitle: showcase?.showSubtitle ?? true,
    showCounter: showcase?.showCounter ?? true,
    showArrows: showcase?.showArrows ?? true,
    showStepper: showcase?.showStepper ?? true,
    showHelperText: showcase?.showHelperText ?? true,
    items: (showcase?.items || [])
      .slice(0, 16)
      .filter((item) => Boolean(item && item.imageUrl && item.imageUrl.trim()))
      .map((item) => {
        const cleaned: Record<string, string> = {
          id: toValidFirestoreId(item.id, 'hero3d'),
          kind: item.kind === 'product' ? 'product' : 'picture',
          imageUrl: item.imageUrl.trim().slice(0, 120000),
          title: (item.title ?? '').trim().slice(0, 140),
        };
        if (item.productId && item.productId.trim()) {
          cleaned.productId = item.productId.trim().slice(0, 128);
        }
        if (item.subtitle && item.subtitle.trim()) {
          cleaned.subtitle = item.subtitle.trim().slice(0, 100);
        }
        if (item.priceText && item.priceText.trim()) {
          cleaned.priceText = item.priceText.trim().slice(0, 60);
        }
        if (item.ctaLabel && item.ctaLabel.trim()) {
          cleaned.ctaLabel = item.ctaLabel.trim().slice(0, 60);
        }
        if (item.targetCategory && item.targetCategory.trim()) {
          cleaned.targetCategory = item.targetCategory.trim().slice(0, 60);
        }
        if (item.targetSubcategory && item.targetSubcategory.trim()) {
          cleaned.targetSubcategory = item.targetSubcategory.trim().slice(0, 60);
        }
        if (item.targetUrl && item.targetUrl.trim()) {
          cleaned.targetUrl = item.targetUrl.trim().slice(0, 300);
        }
        return cleaned;
      }),
    updatedAt: serverTimestamp(),
  };

  if (showcase?.eyebrow && showcase.eyebrow.trim()) {
    payload.eyebrow = showcase.eyebrow.trim().slice(0, 80);
  }
  if (showcase?.heading && showcase.heading.trim()) {
    payload.heading = showcase.heading.trim().slice(0, 140);
  }
  if (showcase?.description && showcase.description.trim()) {
    payload.description = showcase.description.trim().slice(0, 300);
  }
  if (showcase?.helperText !== undefined) {
    payload.helperText = showcase.helperText.trim().slice(0, 160);
  }
  const bg = safeOptionalHex(showcase?.customBgColor);
  if (bg) payload.customBgColor = bg;
  const txt = safeOptionalHex(showcase?.customTextColor);
  if (txt) payload.customTextColor = txt;
  const brd = safeOptionalHex(showcase?.customBorderColor);
  if (brd) payload.customBorderColor = brd;

  return payload as {
    enabled: boolean;
    eyebrow?: string;
    heading?: string;
    description?: string;
    helperText?: string;
    mode: 'auto-products' | 'custom';
    frameStyle: 'gold' | 'frameless' | 'obsidian' | 'silver';
    aspectShape: 'portrait' | 'square' | 'landscape';
    depthLevel: 'subtle' | 'medium' | 'bold';
    boxTheme: 'transparent' | 'ivory' | 'warm' | 'obsidian' | 'gold';
    customBgColor?: string;
    customTextColor?: string;
    customBorderColor?: string;
    autoPlay: boolean;
    intervalSeconds: number;
    lightingIntensity: number;
    shadowDepth: number;
    showCaptions: boolean;
    showSubtitle: boolean;
    showCounter: boolean;
    showArrows: boolean;
    showStepper: boolean;
    showHelperText: boolean;
    items: Record<string, string>[];
    updatedAt: ReturnType<typeof serverTimestamp>;
  };
}

export function findHero3DShowcaseRuleViolation(
  h3d: ReturnType<typeof sanitizeHero3DShowcaseForFirestore>
): string | null {
  if (!h3d || typeof h3d !== 'object' || Array.isArray(h3d)) return 'hero3d_not_map';
  if (!['auto-products', 'custom'].includes(h3d.mode)) return `hero3d_mode(${h3d.mode})`;
  if (!['gold', 'frameless', 'obsidian', 'silver'].includes(h3d.frameStyle)) {
    return `hero3d_frameStyle(${h3d.frameStyle})`;
  }
  if (!['portrait', 'square', 'landscape'].includes(h3d.aspectShape)) {
    return `hero3d_aspectShape(${h3d.aspectShape})`;
  }
  if (!['subtle', 'medium', 'bold'].includes(h3d.depthLevel)) {
    return `hero3d_depthLevel(${h3d.depthLevel})`;
  }
  if (
    h3d.boxTheme &&
    !['transparent', 'ivory', 'warm', 'obsidian', 'gold'].includes(h3d.boxTheme)
  ) {
    return `hero3d_boxTheme(${h3d.boxTheme})`;
  }
  if (typeof h3d.autoPlay !== 'boolean') return 'hero3d_autoPlay';
  if (
    typeof h3d.lightingIntensity !== 'number' ||
    !Number.isFinite(h3d.lightingIntensity) ||
    h3d.lightingIntensity < 40 ||
    h3d.lightingIntensity > 200
  ) {
    return `hero3d_lighting(${h3d.lightingIntensity})`;
  }
  if (
    typeof h3d.shadowDepth !== 'number' ||
    !Number.isFinite(h3d.shadowDepth) ||
    h3d.shadowDepth < 0 ||
    h3d.shadowDepth > 200
  ) {
    return `hero3d_shadow(${h3d.shadowDepth})`;
  }
  if (typeof h3d.eyebrow === 'string' && h3d.eyebrow.length > 80) {
    return 'hero3d_eyebrow';
  }
  if (typeof h3d.heading === 'string' && h3d.heading.length > 140) {
    return 'hero3d_heading';
  }
  if (typeof h3d.description === 'string' && h3d.description.length > 300) {
    return 'hero3d_description';
  }
  if (typeof h3d.helperText === 'string' && h3d.helperText.length > 160) {
    return 'hero3d_helperText';
  }
  if (!Array.isArray(h3d.items) || h3d.items.length > 16) {
    return `hero3d_items(${h3d.items?.length})`;
  }
  return null;
}

export function sanitizeHeroHighlightSliderForFirestore(
  config?: HeroHighlightSliderConfig
) {
  const safeHex = (raw: string | undefined): string | undefined => {
    const trimmed = String(raw || '').trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed.slice(0, 30) : undefined;
  };

  const payload: Record<string, unknown> = {
    enabled: config ? Boolean(config.enabled) : true,
    eyebrow: (config?.eyebrow ?? 'Featured Highlights').trim().slice(0, 80),
    heading: (config?.heading ?? 'Spotlight Gallery & Featured Picks')
      .trim()
      .slice(0, 140),
    layout:
      config?.layout === 'spotlight' || config?.layout === 'compact'
        ? config.layout
        : 'carousel',
    aspectShape:
      config?.aspectShape === 'square' ||
      config?.aspectShape === 'landscape' ||
      config?.aspectShape === 'wide'
        ? config.aspectShape
        : 'portrait',
    boxTheme:
      config?.boxTheme === 'warm' ||
      config?.boxTheme === 'obsidian' ||
      config?.boxTheme === 'gold'
        ? config.boxTheme
        : 'ivory',
    autoPlay: Boolean(config?.autoPlay ?? true),
    intervalSeconds:
      typeof config?.intervalSeconds === 'number' &&
      Number.isFinite(config.intervalSeconds)
        ? Math.min(15, Math.max(2, Math.round(config.intervalSeconds)))
        : 5,
    showCaptions: config?.showCaptions ?? true,
    showArrows: config?.showArrows ?? true,
    items: (config?.items || [])
      .slice(0, 24)
      .filter((item) => Boolean(item && item.imageUrl && item.imageUrl.trim()))
      .map((item) => {
        const cleaned: Record<string, string> = {
          id: toValidFirestoreId(item.id, 'hl'),
          kind: item.kind === 'product' ? 'product' : 'picture',
          imageUrl: item.imageUrl.trim().slice(0, 120000),
        };
        if (item.mediaKind === 'video' || item.mediaKind === 'image') {
          cleaned.mediaKind = item.mediaKind;
        }
        if (item.productId && item.productId.trim()) {
          cleaned.productId = item.productId.trim().slice(0, 128);
        }
        if (item.title && item.title.trim()) {
          cleaned.title = item.title.trim().slice(0, 140);
        }
        if (item.subtitle && item.subtitle.trim()) {
          cleaned.subtitle = item.subtitle.trim().slice(0, 200);
        }
        if (item.priceText && item.priceText.trim()) {
          cleaned.priceText = item.priceText.trim().slice(0, 60);
        }
        if (item.ctaLabel && item.ctaLabel.trim()) {
          cleaned.ctaLabel = item.ctaLabel.trim().slice(0, 60);
        }
        if (item.ctaUrl && item.ctaUrl.trim()) {
          cleaned.ctaUrl = item.ctaUrl.trim().slice(0, 300);
        }
        return cleaned;
      }),
    updatedAt: serverTimestamp(),
  };

  if (config?.description && config.description.trim()) {
    payload.description = config.description.trim().slice(0, 300);
  }
  const bg = safeHex(config?.customBgColor);
  if (bg) payload.customBgColor = bg;
  const txt = safeHex(config?.customTextColor);
  if (txt) payload.customTextColor = txt;
  const brd = safeHex(config?.customBorderColor);
  if (brd) payload.customBorderColor = brd;

  return payload;
}

export function findHeroHighlightSliderRuleViolation(
  payload: ReturnType<typeof sanitizeHeroHighlightSliderForFirestore>
): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'highlight_not_map';
  }
  if (typeof payload.enabled !== 'boolean') return 'highlight_enabled';
  if (typeof payload.eyebrow !== 'string' || payload.eyebrow.length > 80) {
    return 'highlight_eyebrow';
  }
  if (typeof payload.heading !== 'string' || payload.heading.length > 140) {
    return 'highlight_heading';
  }
  if (
    typeof payload.description === 'string' &&
    payload.description.length > 300
  ) {
    return 'highlight_description';
  }
  if (!['carousel', 'spotlight', 'compact'].includes(String(payload.layout))) {
    return `highlight_layout(${payload.layout})`;
  }
  if (
    !['portrait', 'square', 'landscape', 'wide'].includes(
      String(payload.aspectShape)
    )
  ) {
    return `highlight_aspect(${payload.aspectShape})`;
  }
  if (
    !['ivory', 'warm', 'obsidian', 'gold'].includes(String(payload.boxTheme))
  ) {
    return `highlight_theme(${payload.boxTheme})`;
  }
  if (!Array.isArray(payload.items) || payload.items.length > 24) {
    return 'highlight_items';
  }
  return null;
}

export function findSiteConfigRuleViolation(
  payload: ReturnType<typeof sanitizeSiteConfigForFirestore>
): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'payload_not_object';
  }
  const p = payload as Record<string, unknown>;
  const reqTop = [
    'storeName',
    'footerTagline',
    'accentColor',
    'navLabels',
    'hero',
    'catalogSection',
    'philosophy',
    'checkout',
    'socialLinks',
    'updatedAt',
  ];
  const optTop = [
    ...reqTop,
    'headerBackgroundImage',
    'headerTextTheme',
    'categories',
    'subcategories',
    'hero3dShowcase',
    'featuresSection',
    'seo',
    'teamMembers',
    'customBoxes',
    'customLinks',
    'homeSliders',
    'customSections',
    'homeTheme',
    'visibility',
    'homeLayout',
  ];
  for (const k of reqTop) {
    if (!(k in p)) return `top_missing(${k})`;
  }
  for (const k of Object.keys(p)) {
    if (!optTop.includes(k)) return `top_extra(${k})`;
  }
  if (
    typeof payload.storeName !== 'string' ||
    payload.storeName.length < 1 ||
    payload.storeName.length > 100
  ) {
    return `storeName_invalid(${String(payload.storeName).length})`;
  }
  if (typeof payload.footerTagline !== 'string' || payload.footerTagline.length > 300) {
    return `footerTagline_too_long(${String(payload.footerTagline).length})`;
  }
  if (
    typeof payload.accentColor !== 'string' ||
    payload.accentColor.length !== 7 ||
    !/^#[0-9a-fA-F]{6}$/.test(payload.accentColor)
  ) {
    return `accentColor_invalid(${payload.accentColor})`;
  }
  if (
    typeof payload.headerBackgroundImage !== 'string' ||
    payload.headerBackgroundImage.length > 250000
  ) {
    return `headerBackgroundImage_too_long(${payload.headerBackgroundImage?.length})`;
  }
  if (!['dark', 'light'].includes(payload.headerTextTheme)) {
    return `headerTextTheme_invalid(${payload.headerTextTheme})`;
  }
  if (
    !Array.isArray(payload.categories) ||
    payload.categories.length < 1 ||
    payload.categories.length > 40 ||
    typeof payload.categories[0] !== 'string' ||
    payload.categories[0].length < 1 ||
    payload.categories[0].length > 60
  ) {
    return `categories_invalid(${payload.categories?.length})`;
  }
  if (
    !payload.subcategories ||
    typeof payload.subcategories !== 'object' ||
    Object.keys(payload.subcategories).length > 40
  ) {
    return 'subcategories_invalid';
  }
  const hasExactKeys = (
    obj: unknown,
    required: string[],
    allowed: string[]
  ): boolean => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj as Record<string, unknown>);
    return (
      required.every((k) => keys.includes(k)) &&
      keys.every((k) => allowed.includes(k))
    );
  };

  if (
    !payload.featuresSection ||
    !hasExactKeys(payload.featuresSection, ['eyebrow', 'heading'], ['eyebrow', 'heading']) ||
    typeof payload.featuresSection.eyebrow !== 'string' ||
    payload.featuresSection.eyebrow.length > 120 ||
    typeof payload.featuresSection.heading !== 'string' ||
    payload.featuresSection.heading.length > 160
  ) {
    return 'featuresSection_invalid';
  }
  const seo = payload.seo;
  if (
    !hasExactKeys(
      seo,
      ['metaTitle', 'metaDescription', 'keywords', 'canonicalUrl', 'city', 'country', 'allowIndexing'],
      ['metaTitle', 'metaDescription', 'keywords', 'canonicalUrl', 'city', 'country', 'allowIndexing']
    ) ||
    seo.metaTitle.length > 120 ||
    seo.metaDescription.length > 320 ||
    seo.keywords.length > 400 ||
    seo.canonicalUrl.length > 300 ||
    seo.city.length > 80 ||
    seo.country.length > 80 ||
    typeof seo.allowIndexing !== 'boolean'
  ) {
    return 'seo_invalid';
  }
  const sl = payload.socialLinks;
  if (
    !hasExactKeys(
      sl,
      ['whatsappNumber', 'whatsappMessage', 'showOnProductPage', 'accounts'],
      ['whatsappNumber', 'whatsappMessage', 'showOnProductPage', 'googleReviewUrl', 'accounts']
    ) ||
    sl.whatsappNumber.length > 30 ||
    sl.whatsappMessage.length > 300 ||
    typeof sl.showOnProductPage !== 'boolean' ||
    sl.googleReviewUrl.length > 300 ||
    sl.accounts.length > 20
  ) {
    return 'socialLinks_invalid';
  }
  const th = payload.homeTheme;
  const themeKeys = [
    'pageBgColor',
    'surfaceColor',
    'textColor',
    'mutedTextColor',
    'borderColor',
    'buttonBgColor',
    'buttonTextColor',
    'headingFont',
    'bodyFont',
    'headingStyle',
    'headingWeight',
    'bodyWeight',
    'headingScale',
  ];
  if (
    !hasExactKeys(th, themeKeys, themeKeys) ||
    th.pageBgColor.length > 30 ||
    th.surfaceColor.length > 30 ||
    th.textColor.length > 30 ||
    th.mutedTextColor.length > 30 ||
    th.borderColor.length > 30 ||
    th.buttonBgColor.length > 30 ||
    th.buttonTextColor.length > 30 ||
    th.headingFont.length > 60 ||
    th.bodyFont.length > 60 ||
    !['normal', 'italic', 'uppercase'].includes(th.headingStyle) ||
    !['normal', 'medium', 'semibold', 'bold'].includes(th.headingWeight) ||
    !['normal', 'medium'].includes(th.bodyWeight) ||
    !['compact', 'standard', 'large'].includes(th.headingScale)
  ) {
    return 'homeTheme_invalid';
  }
  const vis = payload.visibility;
  const reqVisKeys = [
    'showHeroGuarantees',
    'showHeroSecondaryCta',
    'showCatalog',
    'showTeamMembers',
    'showSeoCard',
  ];
  const allVisKeys = [
    ...reqVisKeys,
    'showHeaderSearch',
    'showHeaderDealsBadge',
    'showHeroSection',
    'showHeroEyebrow',
    'showHeroTrackOrderCta',
    'showHeroShareCta',
    'showMarketplaceShortcuts',
    'showVouchersSection',
    'showCampaignBanner',
    'showFlashSaleSection',
    'showChoiceStrip',
    'showFooterNewsletter',
    'showBottomNavBar',
  ];
  if (
    !hasExactKeys(vis, reqVisKeys, allVisKeys) ||
    Object.values(vis as Record<string, unknown>).some((v) => typeof v !== 'boolean')
  ) {
    return 'visibility_invalid';
  }
  const isPlainObj = (v: unknown): v is Record<string, unknown> =>
    Boolean(v && typeof v === 'object' && !Array.isArray(v));

  if (!isPlainObj(payload.navLabels)) return 'navLabels_not_map';
  if (!isPlainObj(payload.hero)) return 'hero_not_map';
  if (!isPlainObj(payload.catalogSection)) return 'catalogSection_not_map';
  if (!isPlainObj(payload.philosophy)) return 'philosophy_not_map';
  if (!isPlainObj(payload.checkout)) return 'checkout_not_map';
  if (!isPlainObj(payload.socialLinks)) return 'socialLinks_not_map';
  if (
    !Array.isArray(sl.accounts) ||
    sl.accounts.length > 20 ||
    (sl.accounts.length > 0 && !isPlainObj(sl.accounts[0]))
  ) {
    return 'socialLinks_accounts_invalid';
  }
  if (
    !Array.isArray(payload.teamMembers) ||
    payload.teamMembers.length > 30 ||
    (payload.teamMembers.length > 0 && !isPlainObj(payload.teamMembers[0]))
  ) {
    return 'teamMembers_invalid';
  }
  if (
    !Array.isArray(payload.customBoxes) ||
    payload.customBoxes.length > 24 ||
    (payload.customBoxes.length > 0 && !isPlainObj(payload.customBoxes[0]))
  ) {
    return 'customBoxes_invalid';
  }
  if (
    !Array.isArray(payload.customLinks) ||
    payload.customLinks.length > 30 ||
    (payload.customLinks.length > 0 && !isPlainObj(payload.customLinks[0]))
  ) {
    return 'customLinks_invalid';
  }
  if (
    !Array.isArray(payload.homeSliders) ||
    payload.homeSliders.length > 12 ||
    (payload.homeSliders.length > 0 && !isPlainObj(payload.homeSliders[0]))
  ) {
    return 'homeSliders_invalid';
  }
  if (
    !Array.isArray(payload.customSections) ||
    payload.customSections.length > 15 ||
    (payload.customSections.length > 0 && !isPlainObj(payload.customSections[0]))
  ) {
    return 'customSections_invalid';
  }
  if (
    payload.homeLayout !== undefined &&
    !isPlainObj(payload.homeLayout)
  ) {
    return 'homeLayout_invalid';
  }
  return null;
}

export function sanitizeOrderForFirestore(order: OrderRecord) {
  const safeId = toValidFirestoreId(order.orderNumber, 'ord');
  const cleanCustomerUid = order.customerUid
    ? order.customerUid.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)
    : '';

  return {
    id: safeId,
    payload: {
      orderNumber: order.orderNumber.trim().slice(0, 32),
      createdAt: order.createdAt.trim().slice(0, 40),
      createdTimestamp: serverTimestamp(),
      status: order.status.trim().slice(0, 80),
      ...(cleanCustomerUid ? { customerUid: cleanCustomerUid } : {}),
      ...(order.orderNote && order.orderNote.trim()
        ? { orderNote: order.orderNote.trim().slice(0, 300) }
        : {}),
      items: order.items.slice(0, 50).map((item) => ({
        productId: item.productId.slice(0, 128),
        name: item.name.slice(0, 160),
        variantName: item.variantName.slice(0, 120),
        volume: item.volume.slice(0, 60),
        unitPrice: Math.max(0, Math.round(item.unitPrice)),
        quantity: Math.max(1, Math.min(100, Math.round(item.quantity))),
        imageUrl: item.imageUrl.slice(0, 350000),
      })),
      subtotal: Math.max(0, Math.round(order.subtotal)),
      discount: Math.max(0, Math.round(order.discount)),
      shippingCost: Math.max(0, Math.round(order.shippingCost)),
      total: Math.max(0, Math.round(order.total)),
      paymentMethod: order.paymentMethod,
      shipping: {
        fullName: order.shipping.fullName.trim().slice(0, 120),
        email: order.shipping.email.trim().slice(0, 160),
        phone: order.shipping.phone.trim().slice(0, 32),
        address: order.shipping.address.trim().slice(0, 300),
        city: order.shipping.city.trim().slice(0, 80),
        postalCode: order.shipping.postalCode.trim().slice(0, 20),
      },
    },
  };
}

export function sanitizeCustomerProfileForFirestore(
  profile: CustomerProfile,
  options?: { preserveCreatedAt?: unknown }
) {
  const safeUid = profile.uid.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const cleanEmail = profile.email.trim().slice(0, 160) || 'customer@store.local';
  const cleanName =
    profile.displayName.trim().slice(0, 120) ||
    cleanEmail.split('@')[0] ||
    'Valued Customer';

  const payload: Record<string, unknown> = {
    uid: safeUid,
    email: cleanEmail,
    displayName: cleanName,
    createdAt: options?.preserveCreatedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (profile.phone && profile.phone.trim()) {
    payload.phone = profile.phone.trim().slice(0, 32);
  }
  if (profile.defaultAddress && profile.defaultAddress.trim()) {
    payload.defaultAddress = profile.defaultAddress.trim().slice(0, 300);
  }
  if (profile.defaultCity && profile.defaultCity.trim()) {
    payload.defaultCity = profile.defaultCity.trim().slice(0, 80);
  }
  if (profile.defaultPostalCode && profile.defaultPostalCode.trim()) {
    payload.defaultPostalCode = profile.defaultPostalCode.trim().slice(0, 20);
  }
  if (profile.photoUrl && profile.photoUrl.trim()) {
    payload.photoUrl = profile.photoUrl.trim().slice(0, 250000);
  }
  if (typeof profile.followedStore === 'boolean') {
    payload.followedStore = profile.followedStore;
  }

  return {
    id: safeUid,
    payload,
  };
}

export const SUBSCRIBER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeSubscriberEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase().slice(0, 160);
}

export function isValidSubscriberEmail(rawEmail: string): boolean {
  const normalized = normalizeSubscriberEmail(rawEmail);
  return (
    normalized.length >= 5 &&
    normalized.length <= 160 &&
    SUBSCRIBER_EMAIL_REGEX.test(normalized)
  );
}

export function sanitizeSubscriberForFirestore(rawEmail: string) {
  const email = normalizeSubscriberEmail(rawEmail);
  return {
    email,
    source: 'footer',
    subscribedAt: serverTimestamp(),
  };
}

export function sanitizeMediaAssetForFirestore(
  asset: {
    id: string;
    title: string;
    url: string;
    mediaKind: 'image' | 'video';
    categoryTag?: string;
  },
  options?: { preserveCreatedAt?: unknown }
) {
  const safeId = toValidFirestoreId(asset.id, 'media');
  const cleanUrl = asset.url.trim().slice(0, 350000);
  const cleanTitle =
    asset.title.trim().slice(0, 120) ||
    (asset.mediaKind === 'video' ? 'Product Video' : 'Product Photo');
  const cleanCategory = (asset.categoryTag || 'General').trim().slice(0, 60);

  return {
    id: safeId,
    payload: {
      id: safeId,
      title: cleanTitle,
      url: cleanUrl,
      mediaKind: asset.mediaKind === 'video' ? 'video' : 'image',
      categoryTag: cleanCategory,
      createdAt: options?.preserveCreatedAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };
}

export function sanitizePublicMediaForFirestore(input: {
  id: string;
  dataUrl: string;
  mediaKind: 'image' | 'video';
}) {
  const prefix = input.mediaKind === 'video' ? 'vid' : 'img';
  const safeId = toValidFirestoreId(input.id, prefix);
  return {
    id: safeId,
    payload: {
      id: safeId,
      dataUrl: input.dataUrl.trim().slice(0, 750000),
      mediaKind: input.mediaKind === 'video' ? 'video' : 'image',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };
}

export function normalizeOrderTrackingId(rawOrderNumber: string): string {
  const cleaned = rawOrderNumber
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .toUpperCase();
  if (!cleaned) return '';
  return cleaned.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32);
}

export function isSafeHttpUrl(raw?: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 300) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function formatTrackingTimestampLabel(date = new Date()): string {
  const datePart = date.toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export function buildInitialOrderTracking(
  order: OrderRecord
): OrderTrackingRecord {
  const normalizedId =
    normalizeOrderTrackingId(order.orderNumber) ||
    toValidFirestoreId(order.orderNumber, 'FG');
  const itemCount = Math.max(
    1,
    Math.min(
      500,
      order.items.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0)
    )
  );
  const status = (order.status || 'Confirmed — Preparing Shipment')
    .trim()
    .slice(0, 80);
  const destinationCity =
    order.shipping.city.trim().slice(0, 80) || 'Pakistan';
  const orderDateLabel = order.createdAt.trim().slice(0, 40) || 'Recent Order';

  const events: OrderTrackingEvent[] = [
    {
      id: `evt-${normalizedId.toLowerCase()}-1`,
      timestamp: `${orderDateLabel} · Order Placed`,
      status: 'Confirmed — Preparing Shipment',
      location: 'f. Gold & fashion Dispatch',
      note: 'Your order has been received and is being prepared by our boutique team.',
    },
  ];

  if (status && status !== 'Confirmed — Preparing Shipment') {
    events.push({
      id: `evt-${normalizedId.toLowerCase()}-2`,
      timestamp: `${orderDateLabel} · Update`,
      status,
      location: destinationCity,
      note:
        status === 'Delivered'
          ? `Delivered to ${destinationCity}. Thank you for shopping with f. Gold & fashion.`
          : `Order status updated to ${status}.`,
    });
  }

  return {
    orderNumber: normalizedId,
    status,
    destinationCity,
    itemCount,
    orderDateLabel,
    updatedAtLabel: orderDateLabel,
    events,
  };
}

export function sanitizeOrderTrackingForFirestore(
  tracking: OrderTrackingRecord,
  options?: { preserveCreatedAt?: unknown }
) {
  const safeId =
    normalizeOrderTrackingId(tracking.orderNumber) ||
    toValidFirestoreId(tracking.orderNumber, 'FG');

  const rawEvents = (tracking.events || []).slice(-25);
  const sanitizedEvents = (
    rawEvents.length > 0
      ? rawEvents
      : [
          {
            id: `evt-${Date.now().toString(36)}`,
            timestamp: formatTrackingTimestampLabel(),
            status: tracking.status || 'Confirmed — Preparing Shipment',
          },
        ]
  ).map((ev, index) => {
    const cleanEvent: Record<string, unknown> = {
      id:
        toValidFirestoreId(ev.id || `evt-${index + 1}`, 'evt').slice(0, 64) ||
        `evt-${index + 1}`,
      timestamp:
        (ev.timestamp || formatTrackingTimestampLabel()).trim().slice(0, 60) ||
        'Just now',
      status:
        (ev.status || tracking.status || 'Order Update').trim().slice(0, 80) ||
        'Order Update',
    };
    const cleanLoc = ev.location?.trim().slice(0, 80);
    if (cleanLoc) cleanEvent.location = cleanLoc;
    const cleanNote = ev.note?.trim().slice(0, 300);
    if (cleanNote) cleanEvent.note = cleanNote;
    return cleanEvent;
  });

  const payload: Record<string, unknown> = {
    orderNumber: safeId.slice(0, 32),
    status:
      tracking.status.trim().slice(0, 80) || 'Confirmed — Preparing Shipment',
    destinationCity:
      tracking.destinationCity.trim().slice(0, 80) || 'Pakistan',
    itemCount: Math.max(
      1,
      Math.min(500, Math.round(Number(tracking.itemCount) || 1))
    ),
    orderDateLabel:
      tracking.orderDateLabel.trim().slice(0, 40) || 'Recent Order',
    updatedAtLabel:
      tracking.updatedAtLabel.trim().slice(0, 60) ||
      formatTrackingTimestampLabel(),
    events: sanitizedEvents,
    createdAt: options?.preserveCreatedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const courierName = tracking.courierName?.trim().slice(0, 80);
  if (courierName) payload.courierName = courierName;

  const trackingNumber = tracking.trackingNumber?.trim().slice(0, 80);
  if (trackingNumber) payload.trackingNumber = trackingNumber;

  const trackingUrl = tracking.trackingUrl?.trim().slice(0, 300);
  if (trackingUrl && isSafeHttpUrl(trackingUrl)) {
    payload.trackingUrl = trackingUrl;
  }

  const estimatedDelivery = tracking.estimatedDelivery?.trim().slice(0, 80);
  if (estimatedDelivery) payload.estimatedDelivery = estimatedDelivery;

  return {
    id: safeId,
    payload,
  };
}



