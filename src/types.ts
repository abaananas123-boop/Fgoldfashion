export type ProductCategory = string;

export const DEFAULT_CATEGORIES: string[] = [
  'Boutique',
  'Artificial Jewellery',
  'Western Wear',
  'Eastern Wear',
  'Baby Garments',
  'Skincare',
  'Fragrance',
  'Cosmetics',
];

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Boutique: ['Party Wear Dresses', 'Bridal Dresses'],
  'Western Wear': ['Short Dresses', 'Long Dresses'],
  'Baby Garments': ['Baby Girl Dresses', 'Baby Boy Dresses'],
  'Artificial Jewellery': ['Women', 'Mens'],
};

export const PRODUCT_CATEGORIES: string[] = DEFAULT_CATEGORIES;

export function isBeautyCategory(category: string): boolean {
  const normalized = category.trim().toLowerCase();
  return (
    normalized === 'skincare' ||
    normalized === 'cosmetics' ||
    normalized === 'makeup' ||
    normalized === 'beauty'
  );
}

export function isFragranceCategory(category: string): boolean {
  const normalized = category.trim().toLowerCase();
  return normalized === 'fragrance' || normalized === 'perfume' || normalized === 'scent';
}

export function isKidsCategory(category: string): boolean {
  const normalized = category.trim().toLowerCase();
  return (
    normalized === 'baby garments' ||
    normalized === 'garments' ||
    normalized.includes('kids') ||
    normalized.includes('baby')
  );
}

export function isApparelCategory(category: string): boolean {
  return !isBeautyCategory(category) && !isFragranceCategory(category);
}

export function getCategoryFieldLabels(category: string) {
  if (isBeautyCategory(category)) {
    return {
      sectionTitle: '4. Formulation Actives & Ritual Details',
      addItemButton: 'Add Active',
      audienceLabel: 'Suited Skin Types',
      finishLabel: 'Finish',
      volumeLabel: 'Net Volume / Weight',
      volumePlaceholder: '30 ml',
      itemNamePlaceholder: 'Active ingredient',
      itemSpecPlaceholder: 'e.g. 5.0%',
      itemBenefitPlaceholder: 'Skin benefit',
      usageLabel: 'How to Use',
      materialsLabel: 'Full INCI Ingredients',
      tab1: 'Key Actives',
      tab2: 'Ritual & Finish',
      tab3: 'Full INCI',
      usageHeading: 'Application Ritual',
      audienceHeading: 'Suited For',
      finishHeading: 'Finish',
    };
  }

  if (isFragranceCategory(category)) {
    return {
      sectionTitle: '4. Fragrance Notes & Longevity',
      addItemButton: 'Add Note',
      audienceLabel: 'Occasion / Season',
      finishLabel: 'Concentration',
      volumeLabel: 'Bottle Size',
      volumePlaceholder: '100 ml',
      itemNamePlaceholder: 'Note family (e.g. Top Notes)',
      itemSpecPlaceholder: 'e.g. Opening',
      itemBenefitPlaceholder: 'Key botanical or wood notes',
      usageLabel: 'Application & Storage',
      materialsLabel: 'Composition Details',
      tab1: 'Fragrance Notes',
      tab2: 'Wear & Care',
      tab3: 'Composition',
      usageHeading: 'Application Guide',
      audienceHeading: 'Occasion',
      finishHeading: 'Concentration',
    };
  }

  if (isKidsCategory(category)) {
    return {
      sectionTitle: '4. Fabric, Age Fit (1 Month – 10 Years) & Care Details',
      addItemButton: 'Add Spec',
      audienceLabel: 'Age Group (1 Month – 10 Years)',
      finishLabel: 'Fabric & Craft Finish',
      volumeLabel: 'Age Range / Set',
      volumePlaceholder: '1 Month – 10 Years',
      itemNamePlaceholder: 'Material or stitch detail',
      itemSpecPlaceholder: 'e.g. 100% Cotton',
      itemBenefitPlaceholder: 'Comfort, sizing, or skin-safety note',
      usageLabel: 'Wash & Care Instructions',
      materialsLabel: 'Full Fabric & Specification Details',
      tab1: 'Fabric & Craft',
      tab2: 'Age Fit & Care',
      tab3: 'Specifications',
      usageHeading: 'Care Instructions',
      audienceHeading: 'Age Range',
      finishHeading: 'Fabric & Finish',
    };
  }

  return {
    sectionTitle: '4. Material, Craft & Care Details',
    addItemButton: 'Add Spec',
    audienceLabel: 'Sizing, Fit & Audience',
    finishLabel: 'Craft & Finish',
    volumeLabel: 'Size / Pieces / Pack',
    volumePlaceholder: 'S – XL or 1 Set',
    itemNamePlaceholder: 'Material or craft detail',
    itemSpecPlaceholder: 'e.g. 100% Silk',
    itemBenefitPlaceholder: 'Quality, comfort, or craft note',
    usageLabel: 'Care & Usage Instructions',
    materialsLabel: 'Full Material & Specification Details',
    tab1: 'Craft & Materials',
    tab2: 'Fit & Care',
    tab3: 'Specifications',
    usageHeading: 'Care Instructions',
    audienceHeading: 'Sizing & Fit',
    finishHeading: 'Craft & Finish',
  };
}

export type CategoryFilter = string;

export type SortOption = 'featured' | 'price-asc' | 'price-desc';

export interface ProductVariant {
  id: string;
  name: string;
  detail: string;
  hex?: string;
  priceDelta?: number;
  inStock: boolean;
}

export interface KeyActive {
  name: string;
  concentration: string;
  benefit: string;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: ProductCategory;
  subcategory?: string;
  price: number;
  compareAtPrice?: number;
  volume: string;
  stockQuantity?: number;
  statusNote?: string;
  imageUrl: string;
  videoUrl?: string;
  mediaGallery?: string[];
  description: string;
  skinTypes: string;
  finish: string;
  keyActives: KeyActive[];
  fullIngredients: string;
  howToUse: string;
  showSizeGuide?: boolean;
  sizeGuideNote?: string;
  allowCustomStitching?: boolean;
  variants: ProductVariant[];
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  customNote?: string;
}

export type PaymentMethod = 'wallet' | 'card' | 'cod';

export interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface OrderRecord {
  orderNumber: string;
  createdAt: string;
  status: string;
  customerUid?: string;
  items: Array<{
    productId: string;
    name: string;
    variantName: string;
    volume: string;
    unitPrice: number;
    quantity: number;
    imageUrl: string;
    customNote?: string;
  }>;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  paymentMethod: PaymentMethod;
  shipping: ShippingDetails;
  orderNote?: string;
}

export interface CustomerProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultPostalCode?: string;
  photoUrl?: string;
  followedStore?: boolean;
}

export type HomeSectionId =
  | 'heroStage'
  | 'trustBar'
  | 'shortcutsStrip'
  | 'highlightSlider'
  | 'vouchersBanner'
  | 'flashAndChoice'
  | 'customHeroSections'
  | 'catalog'
  | 'featuresSection'
  | 'philosophy';

export type SectionAlign = 'left' | 'center' | 'right';

export interface HomeSectionPlacementConfig {
  align?: SectionAlign;
  reverseSplit?: boolean;
}

export interface HomeLayoutConfig {
  sectionOrder?: HomeSectionId[];
  sectionMeta?: Partial<Record<HomeSectionId, HomeSectionPlacementConfig>>;
}

export const ORDER_TRACKING_STATUSES: string[] = [
  'Confirmed — Preparing Shipment',
  'Packed & Ready for Dispatch',
  'Shipped / Handed to Courier',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Delayed / On Hold',
  'Cancelled',
];

export interface OrderTrackingEvent {
  id: string;
  timestamp: string;
  status: string;
  location?: string;
  note?: string;
}

export interface OrderTrackingRecord {
  orderNumber: string;
  status: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  destinationCity: string;
  itemCount: number;
  orderDateLabel: string;
  updatedAtLabel: string;
  events: OrderTrackingEvent[];
}

export interface HeroGuarantee {
  title: string;
  subtitle: string;
}

export interface PhilosophyPillar {
  title: string;
  description: string;
}

export interface ProofMetric {
  value: string;
  label: string;
}

export interface StoreMember {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  phone?: string;
  email?: string;
}

export interface SeoConfig {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  city: string;
  country: string;
  allowIndexing: boolean;
}

export type HomeBoxPlacement = 'hero' | 'catalog' | 'features';

export interface HomeBox {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
  imageUrl?: string;
  mediaGallery?: string[];
  linkLabel?: string;
  linkUrl?: string;
  placement: HomeBoxPlacement;
}

export type HomeLinkPlacement = 'hero' | 'quickbar' | 'footer';

export interface HomeLink {
  id: string;
  label: string;
  url: string;
  placement: HomeLinkPlacement;
  openInNewTab?: boolean;
}

export interface MarketplaceShortcutTile {
  id: string;
  label: string;
  badgeText?: string;
  imageUrl?: string;
  bgColor?: string;
  textColor?: string;
  targetUrl: string;
}

export interface CampaignBannerConfig {
  eyebrow?: string;
  heading?: string;
  subtitle?: string;
  ribbonText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
  bgColor?: string;
}

export interface SiteVisibilityConfig {
  showHeroGuarantees: boolean;
  showHeroSecondaryCta: boolean;
  showCatalog: boolean;
  showTeamMembers: boolean;
  showSeoCard: boolean;
  showHeaderSearch?: boolean;
  showHeaderDealsBadge?: boolean;
  showHeroSection?: boolean;
  showHeroEyebrow?: boolean;
  showHeroTrackOrderCta?: boolean;
  showHeroShareCta?: boolean;
  showMarketplaceShortcuts?: boolean;
  showVouchersSection?: boolean;
  showCampaignBanner?: boolean;
  showFlashSaleSection?: boolean;
  showChoiceStrip?: boolean;
  showFooterNewsletter?: boolean;
  showBottomNavBar?: boolean;
}

export type HomeSliderMode = 'pictures' | 'products';
export type HomeSliderPlacement = 'hero' | 'catalog' | 'features';

export interface HomeSliderSlide {
  id: string;
  title?: string;
  caption?: string;
  imageUrl: string;
  linkLabel?: string;
  linkUrl?: string;
}

export interface HomeSlider {
  id: string;
  eyebrow?: string;
  title: string;
  mode: HomeSliderMode;
  placement: HomeSliderPlacement;
  autoPlay?: boolean;
  slides?: HomeSliderSlide[];
  productIds?: string[];
  categoryFilter?: string;
}

export type CustomSectionPlacement = 'hero' | 'catalog' | 'features';

export interface CustomHomeSection {
  id: string;
  eyebrow?: string;
  heading: string;
  body: string;
  imageUrl?: string;
  mediaGallery?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  placement: CustomSectionPlacement;
  backgroundColor?: string;
  textColor?: string;
  textAlign?: 'left' | 'center';
  headingStyle?: 'serif' | 'sans' | 'italic';
}

export type HeadingFontOption =
  | 'Cormorant Garamond'
  | 'Playfair Display'
  | 'Lora'
  | 'Plus Jakarta Sans'
  | 'Poppins'
  | 'Merriweather';

export type BodyFontOption =
  | 'Plus Jakarta Sans'
  | 'Poppins'
  | 'DM Sans'
  | 'Lora';

export interface HomeThemeConfig {
  pageBgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  headingFont: HeadingFontOption;
  bodyFont: BodyFontOption;
  headingStyle: 'normal' | 'italic' | 'uppercase';
  headingWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  bodyWeight: 'normal' | 'medium';
  headingScale: 'compact' | 'standard' | 'large';
}

export type Hero3DFrameStyle = 'gold' | 'frameless' | 'obsidian' | 'silver';
export type Hero3DAspectShape = 'portrait' | 'square' | 'landscape';
export type Hero3DDepthLevel = 'subtle' | 'medium' | 'bold';
export type Hero3DBoxTheme = 'transparent' | 'ivory' | 'warm' | 'obsidian' | 'gold';

export interface Hero3DSlideItem {
  id: string;
  kind: 'picture' | 'product';
  productId?: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  priceText?: string;
  ctaLabel?: string;
  targetCategory?: string;
  targetSubcategory?: string;
  targetUrl?: string;
}

export interface Hero3DShowcaseConfig {
  enabled?: boolean;
  eyebrow?: string;
  heading?: string;
  description?: string;
  helperText?: string;
  mode: 'auto-products' | 'custom';
  frameStyle: Hero3DFrameStyle;
  aspectShape: Hero3DAspectShape;
  depthLevel: Hero3DDepthLevel;
  boxTheme?: Hero3DBoxTheme;
  customBgColor?: string;
  customTextColor?: string;
  customBorderColor?: string;
  autoPlay: boolean;
  intervalSeconds?: number;
  lightingIntensity?: number;
  shadowDepth?: number;
  showCaptions?: boolean;
  showSubtitle?: boolean;
  showCounter?: boolean;
  showArrows?: boolean;
  showStepper?: boolean;
  showHelperText?: boolean;
  items: Hero3DSlideItem[];
}

export type HighlightSliderLayout = 'carousel' | 'spotlight' | 'compact';
export type HighlightSliderAspect = 'portrait' | 'square' | 'landscape' | 'wide';
export type HighlightSliderTheme = 'ivory' | 'warm' | 'obsidian' | 'gold';

export interface HighlightSliderItem {
  id: string;
  kind: 'picture' | 'product';
  productId?: string;
  imageUrl: string;
  mediaKind?: 'image' | 'video';
  title?: string;
  subtitle?: string;
  priceText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface HeroHighlightSliderConfig {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  description?: string;
  layout: HighlightSliderLayout;
  aspectShape: HighlightSliderAspect;
  boxTheme: HighlightSliderTheme;
  customBgColor?: string;
  customTextColor?: string;
  customBorderColor?: string;
  autoPlay: boolean;
  intervalSeconds: number;
  showCaptions: boolean;
  showArrows: boolean;
  items: HighlightSliderItem[];
}

export interface SiteConfig {
  storeName: string;
  footerTagline: string;
  accentColor: string;
  headerBackgroundImage?: string;
  headerTextTheme?: 'dark' | 'light';
  navLabels: {
    shopAll: string;
    skincare: string;
    color: string;
    ingredients: string;
    searchPlaceholder?: string;
    searchButtonLabel?: string;
    trackOrderLabel?: string;
    dealsBadgeTop?: string;
    dealsBadgeBottom?: string;
    bagLabel?: string;
  };
  categories?: string[];
  subcategories?: Record<string, string[]>;
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    imageUrl: string;
    guarantees: HeroGuarantee[];
    promoCardEyebrow?: string;
    promoCardBadge?: string;
    promoCardSubBadge?: string;
    promoCardTitle?: string;
    promoCardSubtitle?: string;
    promoCardCta?: string;
    promoCardTargetUrl?: string;
    showPromoCard?: boolean;
    shortcutTiles?: MarketplaceShortcutTile[];
  };
  hero3dShowcase?: Hero3DShowcaseConfig;
  catalogSection: {
    eyebrow: string;
    heading: string;
    flashSaleTitle?: string;
    flashSaleBadge?: string;
    flashSaleCtaLabel?: string;
    flashSaleProductIds?: string[];
    choiceBadge?: string;
    choiceHeading?: string;
    choiceFreeDeliveryText?: string;
    choiceCtaLabel?: string;
    choiceProductIds?: string[];
    newsletterEyebrow?: string;
    newsletterHeading?: string;
    newsletterDescription?: string;
    newsletterButtonLabel?: string;
  };
  featuresSection?: {
    eyebrow: string;
    heading: string;
  };
  philosophy: {
    visible: boolean;
    eyebrow: string;
    heading: string;
    imageUrl: string;
    pillars: PhilosophyPillar[];
    metrics: ProofMetric[];
  };
  checkout: {
    freeShippingThreshold: number;
    standardShippingFee: number;
    promoCode: string;
    promoDiscountPercent: number;
    coupons?: PromoCoupon[];
    cityShippingRates?: CityShippingRate[];
    vouchersHeading?: string;
    vouchersMoreLabel?: string;
    vouchersCtaLabel?: string;
    vouchersCollectedLabel?: string;
    voucherLeftSubtitle?: string;
    voucherRightSubtitle?: string;
    campaignBanner?: CampaignBannerConfig;
  };
  socialLinks: {
    whatsappNumber: string;
    whatsappMessage: string;
    showOnProductPage: boolean;
    googleReviewUrl?: string;
    accounts: SocialAccount[];
  };
  seo?: SeoConfig;
  teamMembers?: StoreMember[];
  customBoxes?: HomeBox[];
  customLinks?: HomeLink[];
  homeSliders?: HomeSlider[];
  customSections?: CustomHomeSection[];
  homeTheme?: HomeThemeConfig;
  visibility?: SiteVisibilityConfig;
  homeLayout?: HomeLayoutConfig;
}

export type SocialPlatform =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'snapchat'
  | 'pinterest'
  | 'x'
  | 'other';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
}

export interface SubscriberRecord {
  id: string;
  email: string;
  source: string;
  subscribedAt: string;
}

export interface PromoCoupon {
  id: string;
  code: string;
  discountPercent: number;
  minOrderAmount?: number;
  expiresAt?: string;
  active: boolean;
}

export interface CityShippingRate {
  id: string;
  city: string;
  fee: number;
  freeAbove?: number;
}

export interface ProductReview {
  id: string;
  productId: string;
  productName: string;
  authorName: string;
  rating: number;
  comment: string;
  fitNote?: string;
  photoUrl?: string;
  status: 'pending' | 'approved';
  createdAtLabel: string;
}

export interface RestockRequest {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  contact: string;
  createdAtLabel: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  url: string;
  mediaKind: 'image' | 'video';
  categoryTag: string;
  createdAt?: string;
}
