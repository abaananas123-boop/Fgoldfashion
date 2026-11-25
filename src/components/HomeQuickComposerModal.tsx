import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  Film,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BodyFontOption,
  CampaignBannerConfig,
  CustomHomeSection,
  CustomSectionPlacement,
  DEFAULT_CATEGORIES,
  HeadingFontOption,
  HeroGuarantee,
  HomeBox,
  HomeBoxPlacement,
  HomeLayoutConfig,
  HomeLink,
  HomeLinkPlacement,
  HomeSectionId,
  HomeThemeConfig,
  MarketplaceShortcutTile,
  PhilosophyPillar,
  PromoCoupon,
  ProofMetric,
  SectionAlign,
  SiteConfig,
  SiteVisibilityConfig,
} from '../types';
import {
  DEFAULT_HOME_SECTION_ORDER,
  HOME_SECTION_LABELS,
} from '../data/defaultSiteConfig';
import { EDITORIAL_LAB_IMAGE_URL, HERO_IMAGE_URL } from '../data/products';
import {
  MEDIA_FILE_ACCEPT,
  detectMediaKind,
  uploadMultipleStoreMediaFiles,
  uploadStoreMediaFile,
} from '../utils/imageUpload';
import { isExternalSiteLink, normalizeSiteLinkUrl } from '../utils/social';
import { HexColorField } from './HexColorField';
import { ResilientImage } from './ResilientImage';

export type QuickComposerState =
  | { type: 'box'; initialPlacement: HomeBoxPlacement; existing?: HomeBox }
  | { type: 'link'; initialPlacement: HomeLinkPlacement; existing?: HomeLink }
  | { type: 'guarantee'; index?: number; existing?: HeroGuarantee }
  | { type: 'pillar'; index?: number; existing?: PhilosophyPillar }
  | { type: 'metric'; index?: number; existing?: ProofMetric }
  | {
      type: 'hero';
      eyebrow: string;
      headline: string;
      description: string;
      primaryCta: string;
      secondaryCta: string;
      imageUrl: string;
    }
  | {
      type: 'headerBg';
      imageUrl: string;
      textTheme: 'dark' | 'light';
    }
  | {
      type: 'section';
      initialPlacement: CustomSectionPlacement;
      existing?: CustomHomeSection;
    }
  | {
      type: 'theme';
      accentColor: string;
      homeTheme: HomeThemeConfig;
    }
  | {
      type: 'sectionHeading';
      target: 'catalog' | 'features';
      eyebrow: string;
      heading: string;
    }
  | {
      type: 'headerText';
      storeName: string;
      navLabels: SiteConfig['navLabels'];
      showHeaderSearch: boolean;
      showHeaderDealsBadge: boolean;
    }
  | {
      type: 'promoCard';
      promoCardEyebrow: string;
      promoCardBadge: string;
      promoCardSubBadge: string;
      promoCardTitle: string;
      promoCardSubtitle: string;
      promoCardCta: string;
      promoCardTargetUrl: string;
    }
  | {
      type: 'shortcutTile';
      existing?: MarketplaceShortcutTile;
    }
  | {
      type: 'vouchersEditor';
      checkout: SiteConfig['checkout'];
    }
  | {
      type: 'campaignBanner';
      banner: CampaignBannerConfig;
    }
  | {
      type: 'flashSaleConfig';
      catalogSection: SiteConfig['catalogSection'];
    }
  | {
      type: 'philosophyHeader';
      eyebrow: string;
      heading: string;
      imageUrl: string;
    }
  | {
      type: 'footerConfig';
      storeName: string;
      footerTagline: string;
      newsletterEyebrow: string;
      newsletterHeading: string;
      newsletterDescription: string;
      newsletterButtonLabel: string;
      showFooterNewsletter: boolean;
      showBottomNavBar: boolean;
    }
  | {
      type: 'sectionManager';
      visibility: SiteVisibilityConfig;
      hero3dEnabled: boolean;
      highlightEnabled: boolean;
      philosophyVisible: boolean;
    }
  | {
      type: 'layoutOrganizer';
      homeLayout: HomeLayoutConfig;
    };

interface HomeQuickComposerModalProps {
  composer: QuickComposerState | null;
  categories?: string[];
  storeName?: string;
  onClose: () => void;
  onSaveBox: (box: HomeBox, isNew: boolean) => void;
  onSaveLink: (link: HomeLink, isNew: boolean) => void;
  onSaveGuarantee: (guarantee: HeroGuarantee, index?: number) => void;
  onSavePillar: (pillar: PhilosophyPillar, index?: number) => void;
  onSaveMetric: (metric: ProofMetric, index?: number) => void;
  onSaveHeroCopy: (patch: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    imageUrl: string;
  }) => void;
  onSaveHeaderBg?: (patch: {
    headerBackgroundImage: string;
    headerTextTheme: 'dark' | 'light';
  }) => void;
  onSaveCustomSection?: (section: CustomHomeSection, isNew: boolean) => void;
  onSaveTheme?: (patch: {
    accentColor: string;
    homeTheme: HomeThemeConfig;
  }) => void;
  onSaveSectionHeading?: (patch: {
    target: 'catalog' | 'features';
    eyebrow: string;
    heading: string;
  }) => void;
  onSaveHeaderText?: (patch: {
    storeName: string;
    navLabels: SiteConfig['navLabels'];
    showHeaderSearch: boolean;
    showHeaderDealsBadge: boolean;
  }) => void;
  onSavePromoCard?: (patch: {
    promoCardEyebrow: string;
    promoCardBadge: string;
    promoCardSubBadge: string;
    promoCardTitle: string;
    promoCardSubtitle: string;
    promoCardCta: string;
    promoCardTargetUrl: string;
  }) => void;
  onSaveShortcutTile?: (tile: MarketplaceShortcutTile, isNew: boolean) => void;
  onSaveVouchers?: (patch: SiteConfig['checkout']) => void;
  onSaveCampaignBanner?: (banner: CampaignBannerConfig) => void;
  onSaveFlashSaleConfig?: (patch: SiteConfig['catalogSection']) => void;
  onSavePhilosophyHeader?: (patch: {
    eyebrow: string;
    heading: string;
    imageUrl: string;
  }) => void;
  onSaveFooterConfig?: (patch: {
    storeName: string;
    footerTagline: string;
    newsletterEyebrow: string;
    newsletterHeading: string;
    newsletterDescription: string;
    newsletterButtonLabel: string;
    showFooterNewsletter: boolean;
    showBottomNavBar: boolean;
  }) => void;
  onSaveSectionManager?: (patch: {
    visibility: SiteVisibilityConfig;
    hero3dEnabled: boolean;
    highlightEnabled: boolean;
    philosophyVisible: boolean;
  }) => void;
  onSaveLayoutOrganizer?: (layout: HomeLayoutConfig) => void;
}

const IMAGE_PRESETS = [
  { label: 'All Departments', url: HERO_IMAGE_URL },
  { label: 'Store Craft', url: EDITORIAL_LAB_IMAGE_URL },
  {
    label: 'Boutique',
    url: '/src/assets/images/product_boutique_clean_1795093197794.jpg',
  },
  {
    label: 'Jewellery',
    url: '/src/assets/images/product_artificial_jewellery_1795093182654.jpg',
  },
  {
    label: 'Eastern Wear',
    url: '/src/assets/images/product_eastern_dress_1795084480580.jpg',
  },
];

const THEME_PALETTES: Array<{
  label: string;
  accentColor: string;
  theme: Partial<HomeThemeConfig>;
}> = [
  {
    label: 'Signature Ivory & Plum',
    accentColor: '#6D2932',
    theme: {
      pageBgColor: '#FAFAFA',
      surfaceColor: '#FFFFFF',
      textColor: '#141413',
      mutedTextColor: '#5A5A56',
      borderColor: '#E4E4E0',
      buttonBgColor: '#141413',
      buttonTextColor: '#FFFFFF',
    },
  },
  {
    label: 'Warm Linen & Gold',
    accentColor: '#8A6220',
    theme: {
      pageBgColor: '#F8F5EF',
      surfaceColor: '#FFFFFF',
      textColor: '#1E1A15',
      mutedTextColor: '#665D52',
      borderColor: '#E5DEC9',
      buttonBgColor: '#2B2218',
      buttonTextColor: '#FFFFFF',
    },
  },
  {
    label: 'Blush Silk & Espresso',
    accentColor: '#7D3545',
    theme: {
      pageBgColor: '#FDF8F7',
      surfaceColor: '#FFFFFF',
      textColor: '#231618',
      mutedTextColor: '#6B5559',
      borderColor: '#EBDCDF',
      buttonBgColor: '#4A1E28',
      buttonTextColor: '#FFFFFF',
    },
  },
  {
    label: 'Botanical Emerald & Crisp',
    accentColor: '#1B4D3E',
    theme: {
      pageBgColor: '#F7FAF8',
      surfaceColor: '#FFFFFF',
      textColor: '#12211C',
      mutedTextColor: '#4F635C',
      borderColor: '#DCE6E1',
      buttonBgColor: '#1B4D3E',
      buttonTextColor: '#FFFFFF',
    },
  },
  {
    label: 'Noir Atelier & Champagne',
    accentColor: '#D4AF37',
    theme: {
      pageBgColor: '#141413',
      surfaceColor: '#1E1E1C',
      textColor: '#F5F4F0',
      mutedTextColor: '#B8B5AD',
      borderColor: '#2F2F2B',
      buttonBgColor: '#F5F4F0',
      buttonTextColor: '#141413',
    },
  },
];

const HEADING_FONTS: HeadingFontOption[] = [
  'Cormorant Garamond',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Plus Jakarta Sans',
  'Poppins',
];

const BODY_FONTS: BodyFontOption[] = [
  'Plus Jakarta Sans',
  'Poppins',
  'DM Sans',
  'Lora',
];

const DEFAULT_HOME_THEME: HomeThemeConfig = {
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
};

export function HomeQuickComposerModal({
  composer,
  categories = DEFAULT_CATEGORIES,
  storeName = 'f. Gold & fashion',
  onClose,
  onSaveBox,
  onSaveLink,
  onSaveGuarantee,
  onSavePillar,
  onSaveMetric,
  onSaveHeroCopy,
  onSaveHeaderBg,
  onSaveCustomSection,
  onSaveTheme,
  onSaveSectionHeading,
  onSaveHeaderText,
  onSavePromoCard,
  onSaveShortcutTile,
  onSaveVouchers,
  onSaveCampaignBanner,
  onSaveFlashSaleConfig,
  onSavePhilosophyHeader,
  onSaveFooterConfig,
  onSaveSectionManager,
  onSaveLayoutOrganizer,
}: HomeQuickComposerModalProps) {
  const destinationPresets = [
    { label: 'Catalog', url: '#catalog' },
    { label: 'Flash Sale', url: '#flash-sale' },
    { label: 'Vouchers', url: '#vouchers-strip' },
    { label: 'My Account', url: '#account' },
    { label: 'Our Store', url: '#philosophy' },
    ...categories.slice(0, 6).map((cat) => ({
      label: cat,
      url: `#category:${cat}`,
    })),
  ];

  const [boxDraft, setBoxDraft] = useState<HomeBox>({
    id: '',
    eyebrow: '',
    title: '',
    description: '',
    imageUrl: '',
    linkLabel: '',
    linkUrl: '',
    placement: 'features',
  });
  const [linkDraft, setLinkDraft] = useState<HomeLink>({
    id: '',
    label: '',
    url: '#catalog',
    placement: 'quickbar',
    openInNewTab: false,
  });
  const [guaranteeDraft, setGuaranteeDraft] = useState<HeroGuarantee>({
    title: '',
    subtitle: '',
  });
  const [pillarDraft, setPillarDraft] = useState<PhilosophyPillar>({
    title: '',
    description: '',
  });
  const [metricDraft, setMetricDraft] = useState<ProofMetric>({
    value: '',
    label: '',
  });
  const [heroDraft, setHeroDraft] = useState({
    eyebrow: '',
    headline: '',
    description: '',
    primaryCta: '',
    secondaryCta: '',
    imageUrl: '',
  });
  const [headerBgDraft, setHeaderBgDraft] = useState<{
    imageUrl: string;
    textTheme: 'dark' | 'light';
  }>({
    imageUrl: '',
    textTheme: 'dark',
  });
  const [sectionDraft, setSectionDraft] = useState<CustomHomeSection>({
    id: '',
    eyebrow: '',
    heading: '',
    body: '',
    imageUrl: '',
    ctaLabel: '',
    ctaUrl: '#catalog',
    placement: 'features',
    backgroundColor: '#FFFFFF',
    textColor: '#141413',
    textAlign: 'left',
    headingStyle: 'serif',
  });
  const [themeDraft, setThemeDraft] = useState<{
    accentColor: string;
    homeTheme: HomeThemeConfig;
  }>({
    accentColor: '#6D2932',
    homeTheme: DEFAULT_HOME_THEME,
  });
  const [headingDraft, setHeadingDraft] = useState<{
    target: 'catalog' | 'features';
    eyebrow: string;
    heading: string;
  }>({
    target: 'catalog',
    eyebrow: '',
    heading: '',
  });
  const [headerTextDraft, setHeaderTextDraft] = useState<{
    storeName: string;
    navLabels: SiteConfig['navLabels'];
    showHeaderSearch: boolean;
    showHeaderDealsBadge: boolean;
  }>({
    storeName: 'f. Gold & fashion',
    navLabels: {
      shopAll: 'Shop All',
      skincare: 'Boutique',
      color: 'Jewellery',
      ingredients: 'Our Store',
      searchPlaceholder: 'Search dresses, jewellery, kids...',
      searchButtonLabel: 'Search',
      trackOrderLabel: 'Account',
      dealsBadgeTop: 'FLASH',
      dealsBadgeBottom: 'DEALS',
      bagLabel: 'Bag',
    },
    showHeaderSearch: true,
    showHeaderDealsBadge: true,
  });
  const [promoCardDraft, setPromoCardDraft] = useState({
    promoCardEyebrow: 'UP TO',
    promoCardBadge: '',
    promoCardSubBadge: 'OFF',
    promoCardTitle: 'Vouchers',
    promoCardSubtitle: '& Deals',
    promoCardCta: 'Shop here',
    promoCardTargetUrl: '#vouchers-strip',
  });
  const [shortcutTileDraft, setShortcutTileDraft] = useState<MarketplaceShortcutTile>({
    id: '',
    label: '',
    badgeText: '',
    imageUrl: '',
    bgColor: '#F85606',
    textColor: '#FFFFFF',
    targetUrl: '#catalog',
  });
  const [vouchersDraft, setVouchersDraft] = useState<SiteConfig['checkout']>({
    freeShippingThreshold: 15000,
    standardShippingFee: 350,
    promoCode: 'FGOLD10',
    promoDiscountPercent: 10,
    coupons: [],
    vouchersHeading: 'Collect Vouchers & Save More',
    vouchersMoreLabel: 'More Vouchers',
    vouchersCtaLabel: 'Collect All',
    vouchersCollectedLabel: 'Collected · Apply in Bag',
    voucherLeftSubtitle: 'Voucher Max',
    voucherRightSubtitle: '',
  });
  const [bannerDraft, setBannerDraft] = useState<CampaignBannerConfig>({
    eyebrow: '',
    heading: 'SEASONAL GRAND SALE',
    subtitle: 'Boutique · Jewellery · Kids (1M–10Y) · Beauty',
    ribbonText: '',
    ctaLabel: 'Shop Campaign',
    ctaUrl: '#catalog',
    leftImageUrl: '/src/assets/images/product_bridal_dress_1795171611227.jpg',
    rightImageUrl: '/src/assets/images/product_artificial_jewellery_1795093182654.jpg',
    bgColor: '#68124B',
  });
  const [flashSaleDraft, setFlashSaleDraft] = useState<SiteConfig['catalogSection']>({
    eyebrow: 'All Store Departments',
    heading: 'Shop Across Every Category',
    flashSaleTitle: 'Flash Sale',
    flashSaleBadge: 'Top Picks',
    flashSaleCtaLabel: 'Shop More',
    choiceBadge: 'CHOICE',
    choiceHeading: 'Curated Picks',
    choiceFreeDeliveryText: '',
    choiceCtaLabel: 'Shop Now | All Departments',
  });
  const [philosophyHeaderDraft, setPhilosophyHeaderDraft] = useState({
    eyebrow: '',
    heading: '',
    imageUrl: '',
  });
  const [footerDraft, setFooterDraft] = useState({
    storeName: 'f. Gold & fashion',
    footerTagline: '',
    newsletterEyebrow: 'Newsletter',
    newsletterHeading: 'Receive seasonal releases & private collection notes',
    newsletterDescription: '',
    newsletterButtonLabel: 'Subscribe',
    showFooterNewsletter: true,
    showBottomNavBar: true,
  });
  const [sectionManagerDraft, setSectionManagerDraft] = useState<{
    visibility: SiteVisibilityConfig;
    hero3dEnabled: boolean;
    highlightEnabled: boolean;
    philosophyVisible: boolean;
  }>({
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
    hero3dEnabled: true,
    highlightEnabled: true,
    philosophyVisible: true,
  });
  const [layoutDraft, setLayoutDraft] = useState<{
    sectionOrder: HomeSectionId[];
    sectionMeta: Partial<Record<HomeSectionId, { align?: SectionAlign; reverseSplit?: boolean }>>;
  }>({
    sectionOrder: [...DEFAULT_HOME_SECTION_ORDER],
    sectionMeta: {},
  });

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [boxGalleryUrlInput, setBoxGalleryUrlInput] = useState('');
  const [sectionGalleryUrlInput, setSectionGalleryUrlInput] = useState('');
  const [isDraggingBoxGallery, setIsDraggingBoxGallery] = useState(false);
  const [isDraggingSectionGallery, setIsDraggingSectionGallery] = useState(false);

  useEffect(() => {
    if (!composer) return;
    if (composer.type === 'box') {
      if (composer.existing) {
        setBoxDraft({
          id: composer.existing.id,
          eyebrow: composer.existing.eyebrow ?? '',
          title: composer.existing.title,
          description: composer.existing.description,
          imageUrl: composer.existing.imageUrl ?? '',
          mediaGallery: composer.existing.mediaGallery ?? [],
          linkLabel: composer.existing.linkLabel ?? '',
          linkUrl: composer.existing.linkUrl ?? '',
          placement: composer.existing.placement,
        });
      } else {
        setBoxDraft({
          id: `box-${Date.now().toString(36)}`,
          eyebrow: '',
          title: '',
          description: '',
          imageUrl: '',
          mediaGallery: [],
          linkLabel: '',
          linkUrl: '',
          placement: composer.initialPlacement,
        });
      }
    } else if (composer.type === 'link') {
      if (composer.existing) {
        setLinkDraft({ ...composer.existing });
      } else {
        setLinkDraft({
          id: `link-${Date.now().toString(36)}`,
          label: '',
          url: '#catalog',
          placement: composer.initialPlacement,
          openInNewTab: false,
        });
      }
    } else if (composer.type === 'guarantee') {
      setGuaranteeDraft(
        composer.existing ? { ...composer.existing } : { title: '', subtitle: '' }
      );
    } else if (composer.type === 'pillar') {
      setPillarDraft(
        composer.existing ? { ...composer.existing } : { title: '', description: '' }
      );
    } else if (composer.type === 'metric') {
      setMetricDraft(
        composer.existing ? { ...composer.existing } : { value: '', label: '' }
      );
    } else if (composer.type === 'hero') {
      setHeroDraft({
        eyebrow: composer.eyebrow,
        headline: composer.headline,
        description: composer.description,
        primaryCta: composer.primaryCta,
        secondaryCta: composer.secondaryCta,
        imageUrl: composer.imageUrl,
      });
    } else if (composer.type === 'headerBg') {
      setHeaderBgDraft({
        imageUrl: composer.imageUrl,
        textTheme: composer.textTheme,
      });
    } else if (composer.type === 'section') {
      if (composer.existing) {
        setSectionDraft({
          ...composer.existing,
          mediaGallery: composer.existing.mediaGallery ?? [],
        });
      } else {
        setSectionDraft({
          id: `sec-${Date.now().toString(36)}`,
          eyebrow: 'Special Announcement',
          heading: 'New Custom Storefront Section',
          body: 'Write any custom message, promotional offer, store policy, or department highlight here.',
          imageUrl: '',
          mediaGallery: [],
          ctaLabel: 'Shop Collection',
          ctaUrl: '#catalog',
          placement: composer.initialPlacement,
          backgroundColor: '#FFFFFF',
          textColor: '#141413',
          textAlign: 'left',
          headingStyle: 'serif',
        });
      }
    } else if (composer.type === 'theme') {
      setThemeDraft({
        accentColor: composer.accentColor,
        homeTheme: { ...DEFAULT_HOME_THEME, ...composer.homeTheme },
      });
    } else if (composer.type === 'sectionHeading') {
      setHeadingDraft({
        target: composer.target,
        eyebrow: composer.eyebrow,
        heading: composer.heading,
      });
    } else if (composer.type === 'headerText') {
      setHeaderTextDraft({
        storeName: composer.storeName,
        navLabels: {
          shopAll: composer.navLabels.shopAll || 'Shop All',
          skincare: composer.navLabels.skincare || 'Boutique',
          color: composer.navLabels.color || 'Jewellery',
          ingredients: composer.navLabels.ingredients || 'Our Store',
          searchPlaceholder:
            composer.navLabels.searchPlaceholder ?? 'Search dresses, jewellery, kids...',
          searchButtonLabel: composer.navLabels.searchButtonLabel ?? 'Search',
          trackOrderLabel: composer.navLabels.trackOrderLabel ?? 'Account',
          dealsBadgeTop: composer.navLabels.dealsBadgeTop ?? 'FLASH',
          dealsBadgeBottom: composer.navLabels.dealsBadgeBottom ?? 'DEALS',
          bagLabel: composer.navLabels.bagLabel ?? 'Bag',
        },
        showHeaderSearch: composer.showHeaderSearch,
        showHeaderDealsBadge: composer.showHeaderDealsBadge,
      });
    } else if (composer.type === 'promoCard') {
      setPromoCardDraft({
        promoCardEyebrow: composer.promoCardEyebrow,
        promoCardBadge: composer.promoCardBadge,
        promoCardSubBadge: composer.promoCardSubBadge,
        promoCardTitle: composer.promoCardTitle,
        promoCardSubtitle: composer.promoCardSubtitle,
        promoCardCta: composer.promoCardCta,
        promoCardTargetUrl: composer.promoCardTargetUrl,
      });
    } else if (composer.type === 'shortcutTile') {
      if (composer.existing) {
        setShortcutTileDraft({ ...composer.existing });
      } else {
        setShortcutTileDraft({
          id: `tile-${Date.now().toString(36)}`,
          label: 'New Pick',
          badgeText: 'NEW',
          imageUrl: '',
          bgColor: '#F85606',
          textColor: '#FFFFFF',
          targetUrl: '#catalog',
        });
      }
    } else if (composer.type === 'vouchersEditor') {
      setVouchersDraft({
        ...composer.checkout,
        coupons: [...(composer.checkout.coupons ?? [])],
        vouchersHeading:
          composer.checkout.vouchersHeading ?? 'Collect Vouchers & Save More',
        vouchersMoreLabel: composer.checkout.vouchersMoreLabel ?? 'More Vouchers',
        vouchersCtaLabel: composer.checkout.vouchersCtaLabel ?? 'Collect All',
        vouchersCollectedLabel:
          composer.checkout.vouchersCollectedLabel ?? 'Collected · Apply in Bag',
        voucherLeftSubtitle: composer.checkout.voucherLeftSubtitle ?? 'Voucher Max',
        voucherRightSubtitle: composer.checkout.voucherRightSubtitle ?? '',
      });
    } else if (composer.type === 'campaignBanner') {
      setBannerDraft({
        eyebrow: composer.banner.eyebrow ?? '',
        heading: composer.banner.heading ?? 'SEASONAL GRAND SALE',
        subtitle:
          composer.banner.subtitle ??
          'Boutique · Jewellery · Kids (1M–10Y) · Beauty',
        ribbonText: composer.banner.ribbonText ?? '',
        ctaLabel: composer.banner.ctaLabel ?? 'Shop Campaign',
        ctaUrl: composer.banner.ctaUrl ?? '#catalog',
        leftImageUrl:
          composer.banner.leftImageUrl ??
          '/src/assets/images/product_bridal_dress_1795171611227.jpg',
        rightImageUrl:
          composer.banner.rightImageUrl ??
          '/src/assets/images/product_artificial_jewellery_1795093182654.jpg',
        bgColor: composer.banner.bgColor ?? '#68124B',
      });
    } else if (composer.type === 'flashSaleConfig') {
      setFlashSaleDraft({
        ...composer.catalogSection,
        flashSaleTitle: composer.catalogSection.flashSaleTitle ?? 'Flash Sale',
        flashSaleBadge: composer.catalogSection.flashSaleBadge ?? 'Top Picks',
        flashSaleCtaLabel: composer.catalogSection.flashSaleCtaLabel ?? 'Shop More',
        choiceBadge: composer.catalogSection.choiceBadge ?? 'CHOICE',
        choiceHeading: composer.catalogSection.choiceHeading ?? 'Curated Picks',
        choiceFreeDeliveryText:
          composer.catalogSection.choiceFreeDeliveryText ?? '',
        choiceCtaLabel:
          composer.catalogSection.choiceCtaLabel ?? 'Shop Now | All Departments',
      });
    } else if (composer.type === 'philosophyHeader') {
      setPhilosophyHeaderDraft({
        eyebrow: composer.eyebrow,
        heading: composer.heading,
        imageUrl: composer.imageUrl,
      });
    } else if (composer.type === 'footerConfig') {
      setFooterDraft({
        storeName: composer.storeName,
        footerTagline: composer.footerTagline,
        newsletterEyebrow: composer.newsletterEyebrow,
        newsletterHeading: composer.newsletterHeading,
        newsletterDescription: composer.newsletterDescription,
        newsletterButtonLabel: composer.newsletterButtonLabel,
        showFooterNewsletter: composer.showFooterNewsletter,
        showBottomNavBar: composer.showBottomNavBar,
      });
    } else if (composer.type === 'sectionManager') {
      setSectionManagerDraft({
        visibility: { ...composer.visibility },
        hero3dEnabled: composer.hero3dEnabled,
        highlightEnabled: composer.highlightEnabled,
        philosophyVisible: composer.philosophyVisible,
      });
    } else if (composer.type === 'layoutOrganizer') {
      const incomingOrder = Array.isArray(composer.homeLayout?.sectionOrder)
        ? composer.homeLayout.sectionOrder
        : [];
      const merged: HomeSectionId[] = [];
      for (const id of incomingOrder) {
        if (DEFAULT_HOME_SECTION_ORDER.includes(id) && !merged.includes(id)) {
          merged.push(id);
        }
      }
      for (const id of DEFAULT_HOME_SECTION_ORDER) {
        if (!merged.includes(id)) merged.push(id);
      }
      setLayoutDraft({
        sectionOrder: merged,
        sectionMeta: { ...(composer.homeLayout?.sectionMeta ?? {}) },
      });
    }
  }, [composer]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!composer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [composer]);

  useEffect(() => {
    setUploadingKey(null);
    setUploadProgress(0);
    setUploadError(null);
    setBoxGalleryUrlInput('');
    setSectionGalleryUrlInput('');
  }, [composer]);

  if (!composer) return null;

  const handleSingleImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    key: string,
    onDone: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploadingKey(key);
    setUploadProgress(2);
    try {
      const { url } = await uploadStoreMediaFile(file, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      onDone(url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload media file.'
      );
    } finally {
      setUploadingKey(null);
      setUploadProgress(0);
    }
  };

  const handleBoxImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    setUploadError(null);
    setUploadingKey('box');
    setUploadProgress(2);
    try {
      const uploaded = await uploadMultipleStoreMediaFiles(files, {
        maxFiles: 12,
        onProgress: (pct) => setUploadProgress(pct),
      });
      const urls = uploaded.map((u) => u.url);
      if (urls.length > 0) {
        setBoxDraft((prev) => {
          const currentMain = prev.imageUrl?.trim();
          const nextMain = currentMain || urls[0];
          const extras = currentMain ? urls : urls.slice(1);
          const nextGallery = Array.from(
            new Set([...(prev.mediaGallery ?? []), ...extras].filter((u) => u !== nextMain))
          ).slice(0, 12);
          return {
            ...prev,
            imageUrl: nextMain,
            mediaGallery: nextGallery,
          };
        });
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload box media file.'
      );
    } finally {
      setUploadingKey(null);
      setUploadProgress(0);
    }
  };

  const handleBoxGalleryBatch = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    setUploadError(null);
    setUploadingKey('box-gallery');
    setUploadProgress(2);
    try {
      const uploaded = await uploadMultipleStoreMediaFiles(fileArr, {
        maxFiles: 12,
        onProgress: (pct) => setUploadProgress(pct),
      });
      const urls = uploaded.map((u) => u.url);
      if (urls.length > 0) {
        setBoxDraft((prev) => {
          const currentMain = prev.imageUrl?.trim();
          const nextMain = currentMain || urls[0];
          const extras = currentMain ? urls : urls.slice(1);
          const nextGallery = Array.from(
            new Set([...(prev.mediaGallery ?? []), ...extras].filter((u) => u !== nextMain))
          ).slice(0, 12);
          return {
            ...prev,
            imageUrl: nextMain,
            mediaGallery: nextGallery,
          };
        });
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload box media files.'
      );
    } finally {
      setUploadingKey(null);
      setUploadProgress(0);
    }
  };

  const handleHeroImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploadingKey('hero');
    setUploadProgress(2);
    try {
      const { url } = await uploadStoreMediaFile(file, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      setHeroDraft((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload hero media file.'
      );
    } finally {
      setUploadingKey(null);
      setUploadProgress(0);
    }
  };

  const handleHeaderBgUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploadingKey('headerBg');
    setUploadProgress(2);
    try {
      const { url } = await uploadStoreMediaFile(file, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      setHeaderBgDraft((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload header media file.'
      );
    } finally {
      setUploadingKey(null);
      setUploadProgress(0);
    }
  };

  const handleCustomSectionImageUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    setUploadError(null);
    setUploadingKey('section');
    setUploadProgress(2);
    try {
      const uploaded = await uploadMultipleStoreMediaFiles(files, {
        maxFiles: 12,
        onProgress: (pct) => setUploadProgress(pct),
      });
      const urls = uploaded.map((u) => u.url);
      if (urls.length > 0) {
        setSectionDraft((prev) => {
          const currentMain = prev.imageUrl?.trim();
          const nextMain = currentMain || urls[0];
          const extras = currentMain ? urls : urls.slice(1);
          const nextGallery = Array.from(
            new Set([...(prev.mediaGallery ?? []), ...extras].filter((u) => u !== nextMain))
          ).slice(0, 12);
          return {
            ...prev,
            imageUrl: nextMain,
            mediaGallery: nextGallery,
          };
        });
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload section media file.'
      );
    } finally {
      setUploadingKey(null);
      setUploadProgress(0);
    }
  };

  const handleSectionGalleryBatch = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    setUploadError(null);
    setUploadingKey('section-gallery');
    setUploadProgress(2);
    try {
      const uploaded = await uploadMultipleStoreMediaFiles(fileArr, {
        maxFiles: 12,
        onProgress: (pct) => setUploadProgress(pct),
      });
      const urls = uploaded.map((u) => u.url);
      if (urls.length > 0) {
        setSectionDraft((prev) => {
          const currentMain = prev.imageUrl?.trim();
          const nextMain = currentMain || urls[0];
          const extras = currentMain ? urls : urls.slice(1);
          const nextGallery = Array.from(
            new Set([...(prev.mediaGallery ?? []), ...extras].filter((u) => u !== nextMain))
          ).slice(0, 12);
          return {
            ...prev,
            imageUrl: nextMain,
            mediaGallery: nextGallery,
          };
        });
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload article media files.'
      );
    } finally {
      setUploadingKey(null);
      setUploadProgress(0);
    }
  };

  const handleDropGallery = (
    e: DragEvent<HTMLDivElement>,
    target: 'box' | 'section'
  ) => {
    e.preventDefault();
    if (target === 'box') {
      setIsDraggingBoxGallery(false);
    } else {
      setIsDraggingSectionGallery(false);
    }
    if (uploadingKey !== null) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (target === 'box') {
        void handleBoxGalleryBatch(e.dataTransfer.files);
      } else {
        void handleSectionGalleryBatch(e.dataTransfer.files);
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (composer.type === 'box') {
      if (!boxDraft.title.trim() || !boxDraft.description.trim()) return;
      const cleanedMain = boxDraft.imageUrl?.trim() || undefined;
      const cleanedGallery = (boxDraft.mediaGallery ?? [])
        .map((u) => u.trim())
        .filter((u) => Boolean(u) && u !== cleanedMain)
        .slice(0, 12);
      const cleaned: HomeBox = {
        id: boxDraft.id || `box-${Date.now().toString(36)}`,
        eyebrow: boxDraft.eyebrow?.trim() || undefined,
        title: boxDraft.title.trim(),
        description: boxDraft.description.trim(),
        imageUrl: cleanedMain,
        mediaGallery: cleanedGallery.length > 0 ? cleanedGallery : undefined,
        linkLabel: boxDraft.linkLabel?.trim() || undefined,
        linkUrl: boxDraft.linkUrl?.trim()
          ? normalizeSiteLinkUrl(boxDraft.linkUrl)
          : undefined,
        placement: boxDraft.placement,
      };
      onSaveBox(cleaned, !composer.existing);
      onClose();
    } else if (composer.type === 'link') {
      if (!linkDraft.label.trim() || !linkDraft.url.trim()) return;
      const normalizedUrl = normalizeSiteLinkUrl(linkDraft.url);
      onSaveLink(
        {
          id: linkDraft.id || `link-${Date.now().toString(36)}`,
          label: linkDraft.label.trim(),
          url: normalizedUrl,
          placement: linkDraft.placement,
          openInNewTab:
            linkDraft.openInNewTab ?? isExternalSiteLink(normalizedUrl),
        },
        !composer.existing
      );
      onClose();
    } else if (composer.type === 'guarantee') {
      if (!guaranteeDraft.title.trim()) return;
      onSaveGuarantee(
        {
          title: guaranteeDraft.title.trim(),
          subtitle: guaranteeDraft.subtitle.trim(),
        },
        composer.index
      );
      onClose();
    } else if (composer.type === 'pillar') {
      if (!pillarDraft.title.trim()) return;
      onSavePillar(
        {
          title: pillarDraft.title.trim(),
          description: pillarDraft.description.trim(),
        },
        composer.index
      );
      onClose();
    } else if (composer.type === 'metric') {
      if (!metricDraft.value.trim() || !metricDraft.label.trim()) return;
      onSaveMetric(
        {
          value: metricDraft.value.trim(),
          label: metricDraft.label.trim(),
        },
        composer.index
      );
      onClose();
    } else if (composer.type === 'hero') {
      onSaveHeroCopy({
        eyebrow: heroDraft.eyebrow.trim(),
        headline: heroDraft.headline.trim(),
        description: heroDraft.description.trim(),
        primaryCta: heroDraft.primaryCta.trim() || 'Explore All Departments',
        secondaryCta: heroDraft.secondaryCta.trim() || 'Shop Boutique',
        imageUrl: heroDraft.imageUrl.trim() || HERO_IMAGE_URL,
      });
      onClose();
    } else if (composer.type === 'headerBg') {
      onSaveHeaderBg?.({
        headerBackgroundImage: headerBgDraft.imageUrl.trim(),
        headerTextTheme: headerBgDraft.textTheme,
      });
      onClose();
    } else if (composer.type === 'section') {
      if (!sectionDraft.heading.trim()) return;
      const cleanedMain = sectionDraft.imageUrl?.trim() || undefined;
      const cleanedGallery = (sectionDraft.mediaGallery ?? [])
        .map((u) => u.trim())
        .filter((u) => Boolean(u) && u !== cleanedMain)
        .slice(0, 12);
      onSaveCustomSection?.(
        {
          ...sectionDraft,
          id: sectionDraft.id || `sec-${Date.now().toString(36)}`,
          eyebrow: sectionDraft.eyebrow?.trim() || undefined,
          heading: sectionDraft.heading.trim(),
          body: sectionDraft.body.trim(),
          imageUrl: cleanedMain,
          mediaGallery: cleanedGallery.length > 0 ? cleanedGallery : undefined,
          ctaLabel: sectionDraft.ctaLabel?.trim() || undefined,
          ctaUrl: sectionDraft.ctaUrl?.trim()
            ? normalizeSiteLinkUrl(sectionDraft.ctaUrl)
            : undefined,
        },
        !composer.existing
      );
      onClose();
    } else if (composer.type === 'theme') {
      onSaveTheme?.(themeDraft);
      onClose();
    } else if (composer.type === 'sectionHeading') {
      onSaveSectionHeading?.(headingDraft);
      onClose();
    } else if (composer.type === 'headerText') {
      onSaveHeaderText?.({
        storeName: headerTextDraft.storeName.trim() || 'f. Gold & fashion',
        navLabels: {
          shopAll: headerTextDraft.navLabels.shopAll.trim() || 'Shop All',
          skincare: headerTextDraft.navLabels.skincare.trim() || 'Boutique',
          color: headerTextDraft.navLabels.color.trim() || 'Jewellery',
          ingredients: headerTextDraft.navLabels.ingredients.trim() || 'Our Store',
          searchPlaceholder: headerTextDraft.navLabels.searchPlaceholder?.trim() || 'Search dresses, jewellery, kids...',
          searchButtonLabel: headerTextDraft.navLabels.searchButtonLabel?.trim() || 'Search',
          trackOrderLabel: headerTextDraft.navLabels.trackOrderLabel?.trim() || 'Account',
          dealsBadgeTop: headerTextDraft.navLabels.dealsBadgeTop?.trim() || 'FLASH',
          dealsBadgeBottom: headerTextDraft.navLabels.dealsBadgeBottom?.trim() || 'DEALS',
          bagLabel: headerTextDraft.navLabels.bagLabel?.trim() || 'Bag',
        },
        showHeaderSearch: headerTextDraft.showHeaderSearch,
        showHeaderDealsBadge: headerTextDraft.showHeaderDealsBadge,
      });
      onClose();
    } else if (composer.type === 'promoCard') {
      onSavePromoCard?.(promoCardDraft);
      onClose();
    } else if (composer.type === 'shortcutTile') {
      if (!shortcutTileDraft.label.trim()) return;
      onSaveShortcutTile?.(
        {
          ...shortcutTileDraft,
          id: shortcutTileDraft.id || `tile-${Date.now().toString(36)}`,
          label: shortcutTileDraft.label.trim(),
          targetUrl: normalizeSiteLinkUrl(shortcutTileDraft.targetUrl || '#catalog'),
        },
        !composer.existing
      );
      onClose();
    } else if (composer.type === 'vouchersEditor') {
      onSaveVouchers?.(vouchersDraft);
      onClose();
    } else if (composer.type === 'campaignBanner') {
      onSaveCampaignBanner?.(bannerDraft);
      onClose();
    } else if (composer.type === 'flashSaleConfig') {
      onSaveFlashSaleConfig?.(flashSaleDraft);
      onClose();
    } else if (composer.type === 'philosophyHeader') {
      onSavePhilosophyHeader?.(philosophyHeaderDraft);
      onClose();
    } else if (composer.type === 'footerConfig') {
      onSaveFooterConfig?.(footerDraft);
      onClose();
    } else if (composer.type === 'sectionManager') {
      onSaveSectionManager?.(sectionManagerDraft);
      onClose();
    } else if (composer.type === 'layoutOrganizer') {
      onSaveLayoutOrganizer?.(layoutDraft);
      onClose();
    }
  };

  const titleByType: Record<QuickComposerState['type'], string> = {
    box:
      composer.type === 'box' && composer.existing
        ? 'Edit Box / Feature'
        : 'Add Box or Feature to Home Page',
    link:
      composer.type === 'link' && composer.existing
        ? 'Edit Website Link'
        : 'Add Link to Home Page',
    guarantee:
      composer.type === 'guarantee' && composer.existing
        ? 'Edit Highlight Box'
        : 'Add Highlight Box',
    pillar:
      composer.type === 'pillar' && composer.existing
        ? 'Edit Story Pillar'
        : 'Add Story Pillar',
    metric:
      composer.type === 'metric' && composer.existing
        ? 'Edit Proof Metric'
        : 'Add Proof Metric',
    hero: 'Edit Hero Banner',
    headerBg: 'Customize Header Background & Style',
    section:
      composer.type === 'section' && composer.existing
        ? 'Edit Custom Home Section'
        : 'Add Custom Section to Home Page',
    theme: 'Customize Home Colors, Fonts & Text Styles',
    sectionHeading: 'Edit Section Title & Subtitle',
    headerText: 'Edit Header Text, Search Bar & Badges',
    promoCard: 'Edit Quick Promo Card',
    shortcutTile:
      composer.type === 'shortcutTile' && composer.existing
        ? 'Edit Shortcut Tile'
        : 'Add Shortcut Tile',
    vouchersEditor: 'Edit Vouchers, Promo Codes & Free Delivery',
    campaignBanner: 'Edit Seasonal Podium Campaign Banner',
    flashSaleConfig: 'Edit Flash Sale & Choice Section Texts',
    philosophyHeader: 'Edit Story Section Heading & Photo',
    footerConfig: 'Edit Footer, Store Tagline & Newsletter',
    sectionManager: 'Show / Hide Any Home Page Section',
    layoutOrganizer: 'Section Order, Front/Middle/Bottom & Left/Center/Right Placement',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleByType[composer.type]}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white border border-[#E4E4E0] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E4E4E0] flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-medium text-[#141413]">
            {titleByType[composer.type]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#F2F2F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {(uploadingKey !== null || uploadError) && (
            <div className="px-6 pt-3 pb-2 border-b border-[#F0F0EC] bg-[#FAFAFA] space-y-2 shrink-0">
              {uploadingKey !== null && (
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {composer.type === 'headerBg' && (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#141413]">
                    Live Header Bar Preview
                  </label>
                  <div
                    className={`relative h-16 rounded-md border overflow-hidden flex items-center justify-between px-5 ${
                      headerBgDraft.textTheme === 'light'
                        ? 'bg-[#141413] text-white border-[#2F2F2B]'
                        : 'bg-[#FAFAFA] text-[#141413] border-[#E4E4E0]'
                    }`}
                  >
                    {headerBgDraft.imageUrl.trim() && (
                      <div aria-hidden="true" className="absolute inset-0">
                        <ResilientImage
                          src={headerBgDraft.imageUrl.trim()}
                          alt=""
                          mode="background"
                          className="w-full h-full object-cover"
                        />
                        <div
                          className={`absolute inset-0 backdrop-blur-[2px] ${
                            headerBgDraft.textTheme === 'light'
                              ? 'bg-[#141413]/68'
                              : 'bg-white/80'
                          }`}
                        />
                      </div>
                    )}
                    <span className="relative z-10 font-serif text-lg font-medium">
                      {storeName}
                    </span>
                    <div className="relative z-10 flex items-center gap-4 text-xs font-medium opacity-85">
                      <span>Shop All</span>
                      <span>Boutique</span>
                      <span>Jewellery</span>
                    </div>
                    <span
                      className={`relative z-10 px-3 py-1.5 text-[11px] font-medium rounded ${
                        headerBgDraft.textTheme === 'light'
                          ? 'bg-white text-[#141413]'
                          : 'bg-[#141413] text-white'
                      }`}
                    >
                      Bag (0)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#141413]">
                    Header Background Photo or Video (Any Resolution / Format)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={headerBgDraft.imageUrl}
                      onChange={(e) =>
                        setHeaderBgDraft({
                          ...headerBgDraft,
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="Paste photo/video URL or leave blank for clean solid header..."
                      className="flex-1 min-w-[200px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                    <label className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingKey === 'headerBg'
                          ? `Uploading ${uploadProgress}%`
                          : 'Upload Photo / Video'}
                      </span>
                      <input
                        type="file"
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingKey !== null}
                        onChange={handleHeaderBgUpload}
                        className="sr-only"
                      />
                    </label>
                    {headerBgDraft.imageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setHeaderBgDraft({ ...headerBgDraft, imageUrl: '' })
                        }
                        className="h-9 px-3 text-xs text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] cursor-pointer"
                      >
                        Remove Media
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {IMAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setHeaderBgDraft({
                            ...headerBgDraft,
                            imageUrl: preset.url,
                          })
                        }
                        className="px-2.5 py-1 text-[11px] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#F0F0EC]">
                  <label className="block text-xs font-medium text-[#141413]">
                    Header Text &amp; Overlay Contrast
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderBgDraft({ ...headerBgDraft, textTheme: 'dark' })
                      }
                      className={`p-3 text-left rounded-md border cursor-pointer ${
                        headerBgDraft.textTheme === 'dark'
                          ? 'border-[#141413] bg-[#FAFAFA]'
                          : 'border-[#E4E4E0] bg-white'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#141413]">
                        Light Frosted Overlay + Dark Ink
                      </p>
                      <p className="text-[11px] text-[#5A5A56] mt-0.5">
                        Best for bright boutique &amp; editorial lookbooks
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderBgDraft({ ...headerBgDraft, textTheme: 'light' })
                      }
                      className={`p-3 text-left rounded-md border cursor-pointer ${
                        headerBgDraft.textTheme === 'light'
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#E4E4E0] bg-white text-[#141413]'
                      }`}
                    >
                      <p className="text-xs font-semibold">
                        Dark Velvet Overlay + White Ink
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Best for rich evening, bridal &amp; gold jewellery photography
                      </p>
                    </button>
                  </div>
                </div>
              </>
            )}

            {composer.type === 'section' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Section Heading *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={sectionDraft.heading}
                      onChange={(e) =>
                        setSectionDraft({
                          ...sectionDraft,
                          heading: e.target.value,
                        })
                      }
                      placeholder="e.g., Festive Eid & Wedding Wardrobe"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Kicker / Eyebrow
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={sectionDraft.eyebrow ?? ''}
                      onChange={(e) =>
                        setSectionDraft({
                          ...sectionDraft,
                          eyebrow: e.target.value,
                        })
                      }
                      placeholder="e.g., Limited Edit"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Section Body Text
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1200}
                    value={sectionDraft.body}
                    onChange={(e) =>
                      setSectionDraft({ ...sectionDraft, body: e.target.value })
                    }
                    placeholder="Write any announcement, description, or offer details..."
                    className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Placement
                    </label>
                    <select
                      value={sectionDraft.placement}
                      onChange={(e) =>
                        setSectionDraft({
                          ...sectionDraft,
                          placement: e.target.value as CustomSectionPlacement,
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    >
                      <option value="hero">Below Hero</option>
                      <option value="catalog">Above Catalog</option>
                      <option value="features">Features Section</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Text Alignment
                    </label>
                    <select
                      value={sectionDraft.textAlign ?? 'left'}
                      onChange={(e) =>
                        setSectionDraft({
                          ...sectionDraft,
                          textAlign: e.target.value as 'left' | 'center',
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    >
                      <option value="left">Left Aligned (Split w/ Image)</option>
                      <option value="center">Centered Showcase</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Heading Text Style
                    </label>
                    <select
                      value={sectionDraft.headingStyle ?? 'serif'}
                      onChange={(e) =>
                        setSectionDraft({
                          ...sectionDraft,
                          headingStyle: e.target.value as 'serif' | 'sans' | 'italic',
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    >
                      <option value="serif">Store Heading Font</option>
                      <option value="italic">Editorial Italic</option>
                      <option value="sans">Modern Sans Bold</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <HexColorField
                    label="Section Background Color"
                    value={sectionDraft.backgroundColor || '#FFFFFF'}
                    fallbackColor="#FFFFFF"
                    onChange={(hex) =>
                      setSectionDraft({
                        ...sectionDraft,
                        backgroundColor: hex,
                      })
                    }
                  />
                  <HexColorField
                    label="Section Text Color"
                    value={sectionDraft.textColor || '#141413'}
                    fallbackColor="#141413"
                    onChange={(hex) =>
                      setSectionDraft({
                        ...sectionDraft,
                        textColor: hex,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <input
                    type="text"
                    maxLength={60}
                    value={sectionDraft.ctaLabel ?? ''}
                    onChange={(e) =>
                      setSectionDraft({ ...sectionDraft, ctaLabel: e.target.value })
                    }
                    placeholder="Button text (optional)"
                    className="h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                  <input
                    type="text"
                    maxLength={300}
                    value={sectionDraft.ctaUrl ?? ''}
                    onChange={(e) =>
                      setSectionDraft({ ...sectionDraft, ctaUrl: e.target.value })
                    }
                    placeholder="Link (#catalog, #category:Boutique, https://...)"
                    className="h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>

                <div className="space-y-3 pt-1 border-t border-[#F0F0EC]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-[#141413]">
                      Article / Section Photos &amp; Videos ({(sectionDraft.imageUrl ? 1 : 0) + (sectionDraft.mediaGallery?.length ?? 0)})
                    </label>
                    <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingKey === 'section' || uploadingKey === 'section-gallery'
                          ? `Uploading ${uploadProgress}%`
                          : 'Upload 1 or More Photos & Videos'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingKey !== null}
                        onChange={handleCustomSectionImageUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={sectionDraft.imageUrl ?? ''}
                      onChange={(e) =>
                        setSectionDraft({ ...sectionDraft, imageUrl: e.target.value })
                      }
                      placeholder="Primary Photo or Video URL (or upload above)..."
                      className="flex-1 min-w-[180px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                    {sectionDraft.imageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setSectionDraft({ ...sectionDraft, imageUrl: '' })
                        }
                        className="h-9 px-2.5 text-xs text-[#5A5A56] border border-[#D4D4CE] rounded-md cursor-pointer"
                      >
                        Clear Main
                      </button>
                    )}
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingSectionGallery(true);
                    }}
                    onDragLeave={() => setIsDraggingSectionGallery(false)}
                    onDrop={(e) => handleDropGallery(e, 'section')}
                    className={`p-3 rounded-md border border-dashed transition-colors ${
                      isDraggingSectionGallery
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[#D4D4CE] bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={sectionGalleryUrlInput}
                        onChange={(e) => setSectionGalleryUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const clean = sectionGalleryUrlInput.trim();
                            if (!clean) return;
                            setSectionDraft((prev) => ({
                              ...prev,
                              imageUrl: prev.imageUrl?.trim() ? prev.imageUrl : clean,
                              mediaGallery: prev.imageUrl?.trim()
                                ? Array.from(
                                    new Set([...(prev.mediaGallery ?? []), clean])
                                  ).slice(0, 12)
                                : prev.mediaGallery ?? [],
                            }));
                            setSectionGalleryUrlInput('');
                          }
                        }}
                        placeholder="Drag & drop photos/videos here, or paste extra URL..."
                        className="flex-1 min-w-[180px] h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = sectionGalleryUrlInput.trim();
                          if (!clean) return;
                          setSectionDraft((prev) => ({
                            ...prev,
                            imageUrl: prev.imageUrl?.trim() ? prev.imageUrl : clean,
                            mediaGallery: prev.imageUrl?.trim()
                              ? Array.from(
                                  new Set([...(prev.mediaGallery ?? []), clean])
                                ).slice(0, 12)
                              : prev.mediaGallery ?? [],
                          }));
                          setSectionGalleryUrlInput('');
                        }}
                        disabled={!sectionGalleryUrlInput.trim()}
                        className="h-8 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded hover:border-[#141413] disabled:opacity-40 cursor-pointer"
                      >
                        + Add URL
                      </button>
                    </div>

                    {(sectionDraft.imageUrl || (sectionDraft.mediaGallery ?? []).length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {sectionDraft.imageUrl && (
                          <div className="relative w-24 aspect-[16/10] rounded overflow-hidden border-2 border-[#141413] bg-white">
                            <ResilientImage
                              src={sectionDraft.imageUrl}
                              alt="Main section media preview"
                              mode="thumb"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[9px] font-semibold bg-[#141413] text-white rounded">
                              Main
                            </span>
                          </div>
                        )}
                        {(sectionDraft.mediaGallery ?? []).map((mediaUrl, gIdx) => {
                          const isVid = detectMediaKind(mediaUrl) !== 'image';
                          return (
                            <div
                              key={`${mediaUrl}-${gIdx}`}
                              className="relative w-24 aspect-[16/10] rounded overflow-hidden border border-[#D4D4CE] bg-white"
                            >
                              <ResilientImage
                                src={mediaUrl}
                                alt={`Section gallery ${gIdx + 1}`}
                                mode="thumb"
                                className="w-full h-full object-cover"
                              />
                              {isVid && (
                                <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] inline-flex items-center gap-0.5">
                                  <Film className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setSectionDraft((prev) => ({
                                    ...prev,
                                    mediaGallery: (prev.mediaGallery ?? []).filter(
                                      (_, i) => i !== gIdx
                                    ),
                                  }))
                                }
                                aria-label="Remove section gallery item"
                                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/95 text-[#141413] flex items-center justify-center text-[10px] border border-[#D4D4CE] cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {composer.type === 'theme' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#141413]">
                      1-Click Color Palettes
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setThemeDraft({
                          accentColor: '#6D2932',
                          homeTheme: DEFAULT_HOME_THEME,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Default Theme</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {THEME_PALETTES.map((palette) => (
                      <button
                        key={palette.label}
                        type="button"
                        onClick={() =>
                          setThemeDraft((prev) => ({
                            accentColor: palette.accentColor,
                            homeTheme: { ...prev.homeTheme, ...palette.theme },
                          }))
                        }
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15"
                          style={{ backgroundColor: palette.theme.pageBgColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 -ml-2"
                          style={{ backgroundColor: palette.accentColor }}
                        />
                        <span>{palette.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#F0F0EC]">
                  <p className="text-[11px] text-[#5A5A56]">
                    Type any <span className="font-mono font-semibold text-[#141413]">#hex</span> code (such as{' '}
                    <span className="font-mono font-semibold text-[#141413]">#698467</span>) to select a background or text color automatically, or click any swatch.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        ['Accent Color', 'accentColor', true],
                        ['Page Background', 'pageBgColor', false],
                        ['Cards & Boxes', 'surfaceColor', false],
                        ['Primary Text', 'textColor', false],
                        ['Secondary Text', 'mutedTextColor', false],
                        ['Borders', 'borderColor', false],
                        ['Button Fill', 'buttonBgColor', false],
                        ['Button Text', 'buttonTextColor', false],
                      ] as const
                    ).map(([label, key, isTopLevel]) => {
                      const value = isTopLevel
                        ? themeDraft.accentColor
                        : themeDraft.homeTheme[key as keyof HomeThemeConfig];
                      return (
                        <HexColorField
                          key={key}
                          label={label}
                          value={String(value)}
                          onChange={(hex) => {
                            if (isTopLevel) {
                              setThemeDraft((prev) => ({
                                ...prev,
                                accentColor: hex,
                              }));
                            } else {
                              setThemeDraft((prev) => ({
                                ...prev,
                                homeTheme: {
                                  ...prev.homeTheme,
                                  [key]: hex,
                                },
                              }));
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#F0F0EC]">
                  <p className="text-xs font-semibold text-[#141413]">
                    Typography &amp; Text Styles
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Heading Font Family
                      </label>
                      <select
                        value={themeDraft.homeTheme.headingFont}
                        onChange={(e) =>
                          setThemeDraft((prev) => ({
                            ...prev,
                            homeTheme: {
                              ...prev.homeTheme,
                              headingFont: e.target.value as HeadingFontOption,
                            },
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                      >
                        {HEADING_FONTS.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Body Font Family
                      </label>
                      <select
                        value={themeDraft.homeTheme.bodyFont}
                        onChange={(e) =>
                          setThemeDraft((prev) => ({
                            ...prev,
                            homeTheme: {
                              ...prev.homeTheme,
                              bodyFont: e.target.value as BodyFontOption,
                            },
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                      >
                        {BODY_FONTS.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Heading Style
                      </label>
                      <select
                        value={themeDraft.homeTheme.headingStyle}
                        onChange={(e) =>
                          setThemeDraft((prev) => ({
                            ...prev,
                            homeTheme: {
                              ...prev.homeTheme,
                              headingStyle: e.target.value as HomeThemeConfig['headingStyle'],
                            },
                          }))
                        }
                        className="w-full h-9 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                        <option value="uppercase">UPPERCASE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Heading Weight
                      </label>
                      <select
                        value={themeDraft.homeTheme.headingWeight}
                        onChange={(e) =>
                          setThemeDraft((prev) => ({
                            ...prev,
                            homeTheme: {
                              ...prev.homeTheme,
                              headingWeight: e.target.value as HomeThemeConfig['headingWeight'],
                            },
                          }))
                        }
                        className="w-full h-9 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                      >
                        <option value="normal">Regular</option>
                        <option value="medium">Medium</option>
                        <option value="semibold">Semi-Bold</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Heading Size
                      </label>
                      <select
                        value={themeDraft.homeTheme.headingScale}
                        onChange={(e) =>
                          setThemeDraft((prev) => ({
                            ...prev,
                            homeTheme: {
                              ...prev.homeTheme,
                              headingScale: e.target.value as HomeThemeConfig['headingScale'],
                            },
                          }))
                        }
                        className="w-full h-9 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                      >
                        <option value="compact">Compact</option>
                        <option value="standard">Standard</option>
                        <option value="large">Large Display</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Body Weight
                      </label>
                      <select
                        value={themeDraft.homeTheme.bodyWeight}
                        onChange={(e) =>
                          setThemeDraft((prev) => ({
                            ...prev,
                            homeTheme: {
                              ...prev.homeTheme,
                              bodyWeight: e.target.value as HomeThemeConfig['bodyWeight'],
                            },
                          }))
                        }
                        className="w-full h-9 px-2 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                      >
                        <option value="normal">Regular</option>
                        <option value="medium">Medium</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live Theme Preview Box */}
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: themeDraft.homeTheme.pageBgColor,
                    borderColor: themeDraft.homeTheme.borderColor,
                    color: themeDraft.homeTheme.textColor,
                    fontFamily: `"${themeDraft.homeTheme.bodyFont}", sans-serif`,
                  }}
                >
                  <p
                    className="text-[11px] font-medium uppercase tracking-widest mb-1"
                    style={{ color: themeDraft.accentColor }}
                  >
                    Live Preview
                  </p>
                  <h4
                    className="text-xl mb-1"
                    style={{
                      fontFamily: `"${themeDraft.homeTheme.headingFont}", serif`,
                      fontStyle:
                        themeDraft.homeTheme.headingStyle === 'italic'
                          ? 'italic'
                          : 'normal',
                      textTransform:
                        themeDraft.homeTheme.headingStyle === 'uppercase'
                          ? 'uppercase'
                          : 'none',
                      fontWeight:
                        themeDraft.homeTheme.headingWeight === 'bold'
                          ? 700
                          : themeDraft.homeTheme.headingWeight === 'semibold'
                            ? 600
                            : themeDraft.homeTheme.headingWeight === 'medium'
                              ? 500
                              : 400,
                    }}
                  >
                    {storeName} — Curated Across All Departments
                  </h4>
                  <p
                    className="text-xs mb-3"
                    style={{ color: themeDraft.homeTheme.mutedTextColor }}
                  >
                    Preview of body copy, surface tone, border contrast, and primary button style.
                  </p>
                  <span
                    className="inline-block px-3.5 py-1.5 text-xs font-medium rounded"
                    style={{
                      backgroundColor: themeDraft.homeTheme.buttonBgColor,
                      color: themeDraft.homeTheme.buttonTextColor,
                    }}
                  >
                    Explore All Departments
                  </span>
                </div>
              </>
            )}

            {composer.type === 'sectionHeading' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Section Eyebrow / Small Label
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={headingDraft.eyebrow}
                    onChange={(e) =>
                      setHeadingDraft({ ...headingDraft, eyebrow: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Section Heading *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={headingDraft.heading}
                    onChange={(e) =>
                      setHeadingDraft({ ...headingDraft, heading: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
              </>
            )}

            {composer.type === 'box' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Box Title *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={boxDraft.title}
                      onChange={(e) =>
                        setBoxDraft({ ...boxDraft, title: e.target.value })
                      }
                      placeholder="e.g., Bridal Styling Service"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Small Label / Kicker (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={boxDraft.eyebrow ?? ''}
                      onChange={(e) =>
                        setBoxDraft({ ...boxDraft, eyebrow: e.target.value })
                      }
                      placeholder="e.g., New Feature"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    maxLength={500}
                    value={boxDraft.description}
                    onChange={(e) =>
                      setBoxDraft({ ...boxDraft, description: e.target.value })
                    }
                    placeholder="Describe this feature, offer, or service box..."
                    className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Home Page Placement
                  </label>
                  <select
                    value={boxDraft.placement}
                    onChange={(e) =>
                      setBoxDraft({
                        ...boxDraft,
                        placement: e.target.value as HomeBoxPlacement,
                      })
                    }
                    className="w-full h-10 px-3 text-xs font-medium bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  >
                    <option value="hero">Below Hero Banner</option>
                    <option value="catalog">Above Store Catalog</option>
                    <option value="features">Features &amp; Highlights Section</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-[#F0F0EC] space-y-2.5">
                  <label className="block text-xs font-medium text-[#141413]">
                    Optional Action Link inside Box
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      maxLength={60}
                      value={boxDraft.linkLabel ?? ''}
                      onChange={(e) =>
                        setBoxDraft({ ...boxDraft, linkLabel: e.target.value })
                      }
                      placeholder="Link text (e.g., Explore Boutique)"
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                    <input
                      type="text"
                      maxLength={300}
                      value={boxDraft.linkUrl ?? ''}
                      onChange={(e) =>
                        setBoxDraft({ ...boxDraft, linkUrl: e.target.value })
                      }
                      placeholder="https://... or #catalog"
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {destinationPresets.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setBoxDraft((prev) => ({
                            ...prev,
                            linkLabel: prev.linkLabel || `View ${preset.label}`,
                            linkUrl: preset.url,
                          }))
                        }
                        className="px-2 py-1 text-[11px] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0F0EC] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-[#141413]">
                      Photos &amp; Videos ({(boxDraft.imageUrl ? 1 : 0) + (boxDraft.mediaGallery?.length ?? 0)})
                    </label>
                    <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingKey === 'box' || uploadingKey === 'box-gallery'
                          ? `Uploading ${uploadProgress}%`
                          : 'Upload 1 or More Photos & Videos'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingKey !== null}
                        onChange={handleBoxImageUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={boxDraft.imageUrl ?? ''}
                      onChange={(e) =>
                        setBoxDraft({ ...boxDraft, imageUrl: e.target.value })
                      }
                      placeholder="Primary photo/video URL or leave blank..."
                      className="flex-1 min-w-[180px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                    {boxDraft.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setBoxDraft({ ...boxDraft, imageUrl: '' })}
                        className="h-9 px-2.5 text-xs text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] cursor-pointer"
                      >
                        Clear Main
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setBoxDraft({ ...boxDraft, imageUrl: preset.url })
                        }
                        className="px-2 py-1 text-[11px] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingBoxGallery(true);
                    }}
                    onDragLeave={() => setIsDraggingBoxGallery(false)}
                    onDrop={(e) => handleDropGallery(e, 'box')}
                    className={`p-3 rounded-md border border-dashed transition-colors ${
                      isDraggingBoxGallery
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[#D4D4CE] bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={boxGalleryUrlInput}
                        onChange={(e) => setBoxGalleryUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const clean = boxGalleryUrlInput.trim();
                            if (!clean) return;
                            setBoxDraft((prev) => ({
                              ...prev,
                              imageUrl: prev.imageUrl?.trim() ? prev.imageUrl : clean,
                              mediaGallery: prev.imageUrl?.trim()
                                ? Array.from(
                                    new Set([...(prev.mediaGallery ?? []), clean])
                                  ).slice(0, 12)
                                : prev.mediaGallery ?? [],
                            }));
                            setBoxGalleryUrlInput('');
                          }
                        }}
                        placeholder="Drag & drop more photos/videos here, or paste extra URL..."
                        className="flex-1 min-w-[180px] h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = boxGalleryUrlInput.trim();
                          if (!clean) return;
                          setBoxDraft((prev) => ({
                            ...prev,
                            imageUrl: prev.imageUrl?.trim() ? prev.imageUrl : clean,
                            mediaGallery: prev.imageUrl?.trim()
                              ? Array.from(
                                  new Set([...(prev.mediaGallery ?? []), clean])
                                ).slice(0, 12)
                              : prev.mediaGallery ?? [],
                          }));
                          setBoxGalleryUrlInput('');
                        }}
                        disabled={!boxGalleryUrlInput.trim()}
                        className="h-8 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded hover:border-[#141413] disabled:opacity-40 cursor-pointer"
                      >
                        + Add URL
                      </button>
                    </div>

                    {(boxDraft.imageUrl || (boxDraft.mediaGallery ?? []).length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {boxDraft.imageUrl && (
                          <div className="relative w-24 aspect-[16/10] rounded overflow-hidden border-2 border-[#141413] bg-white">
                            <ResilientImage
                              src={boxDraft.imageUrl}
                              alt="Box primary media"
                              mode="thumb"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[9px] font-semibold bg-[#141413] text-white rounded">
                              Main
                            </span>
                          </div>
                        )}
                        {(boxDraft.mediaGallery ?? []).map((mediaUrl, gIdx) => {
                          const isVid = detectMediaKind(mediaUrl) !== 'image';
                          return (
                            <div
                              key={`${mediaUrl}-${gIdx}`}
                              className="relative w-24 aspect-[16/10] rounded overflow-hidden border border-[#D4D4CE] bg-white"
                            >
                              <ResilientImage
                                src={mediaUrl}
                                alt={`Box gallery ${gIdx + 1}`}
                                mode="thumb"
                                className="w-full h-full object-cover"
                              />
                              {isVid && (
                                <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] inline-flex items-center gap-0.5">
                                  <Film className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setBoxDraft((prev) => ({
                                    ...prev,
                                    mediaGallery: (prev.mediaGallery ?? []).filter(
                                      (_, i) => i !== gIdx
                                    ),
                                  }))
                                }
                                aria-label="Remove box gallery item"
                                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/95 text-[#141413] flex items-center justify-center text-[10px] border border-[#D4D4CE] cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {composer.type === 'link' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Link Label *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={linkDraft.label}
                    onChange={(e) =>
                      setLinkDraft({ ...linkDraft, label: e.target.value })
                    }
                    placeholder="e.g., Bridal Collection, My Account, Instagram"
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Destination URL or Section *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={linkDraft.url}
                    onChange={(e) => {
                      const nextUrl = e.target.value;
                      setLinkDraft({
                        ...linkDraft,
                        url: nextUrl,
                        openInNewTab: isExternalSiteLink(nextUrl),
                      });
                    }}
                    placeholder="https://... or #catalog or tel:+92..."
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {destinationPresets.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setLinkDraft((prev) => ({
                            ...prev,
                            label: prev.label || preset.label,
                            url: preset.url,
                            openInNewTab: false,
                          }))
                        }
                        className="px-2 py-1 text-[11px] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Where to Display Link
                  </label>
                  <select
                    value={linkDraft.placement}
                    onChange={(e) =>
                      setLinkDraft({
                        ...linkDraft,
                        placement: e.target.value as HomeLinkPlacement,
                      })
                    }
                    className="w-full h-10 px-3 text-xs font-medium bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  >
                    <option value="quickbar">Home Quick Links Strip</option>
                    <option value="hero">Hero Links Bar</option>
                    <option value="footer">Footer Navigation Links</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(linkDraft.openInNewTab)}
                    onChange={(e) =>
                      setLinkDraft({
                        ...linkDraft,
                        openInNewTab: e.target.checked,
                      })
                    }
                    className="rounded border-[#D4D4CE]"
                  />
                  <span>Open link in a new browser tab</span>
                </label>
              </>
            )}

            {composer.type === 'guarantee' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Highlight Title *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={guaranteeDraft.title}
                    onChange={(e) =>
                      setGuaranteeDraft({
                        ...guaranteeDraft,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., Express Cash on Delivery"
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={guaranteeDraft.subtitle}
                    onChange={(e) =>
                      setGuaranteeDraft({
                        ...guaranteeDraft,
                        subtitle: e.target.value,
                      })
                    }
                    placeholder="e.g., Nationwide dispatch within 48 hours"
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
              </>
            )}

            {composer.type === 'pillar' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Pillar Title *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={pillarDraft.title}
                    onChange={(e) =>
                      setPillarDraft({ ...pillarDraft, title: e.target.value })
                    }
                    placeholder="e.g., 04. Hand-Inspected Packaging"
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    maxLength={400}
                    value={pillarDraft.description}
                    onChange={(e) =>
                      setPillarDraft({
                        ...pillarDraft,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe this standard or atelier feature..."
                    className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
              </>
            )}

            {composer.type === 'metric' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Value *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={metricDraft.value}
                    onChange={(e) =>
                      setMetricDraft({ ...metricDraft, value: e.target.value })
                    }
                    placeholder="e.g., 48 hrs"
                    className="w-full h-10 px-3 text-sm tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Label *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={metricDraft.label}
                    onChange={(e) =>
                      setMetricDraft({ ...metricDraft, label: e.target.value })
                    }
                    placeholder="e.g., Dispatch nationwide"
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
              </div>
            )}

            {composer.type === 'hero' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Eyebrow Label
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={heroDraft.eyebrow}
                    onChange={(e) =>
                      setHeroDraft({ ...heroDraft, eyebrow: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Headline *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={heroDraft.headline}
                    onChange={(e) =>
                      setHeroDraft({ ...heroDraft, headline: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={heroDraft.description}
                    onChange={(e) =>
                      setHeroDraft({
                        ...heroDraft,
                        description: e.target.value,
                      })
                    }
                    className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Primary Button
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={heroDraft.primaryCta}
                      onChange={(e) =>
                        setHeroDraft({
                          ...heroDraft,
                          primaryCta: e.target.value,
                        })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Secondary Button
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={heroDraft.secondaryCta}
                      onChange={(e) =>
                        setHeroDraft({
                          ...heroDraft,
                          secondaryCta: e.target.value,
                        })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#141413]">
                    Hero Photo or Video (Any Resolution / Format)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={heroDraft.imageUrl}
                      onChange={(e) =>
                        setHeroDraft({ ...heroDraft, imageUrl: e.target.value })
                      }
                      placeholder="Paste image/video URL or upload..."
                      className="flex-1 min-w-[180px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                    <label className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingKey === 'hero'
                          ? `Uploading ${uploadProgress}%`
                          : 'Upload Photo / Video'}
                      </span>
                      <input
                        type="file"
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingKey !== null}
                        onChange={handleHeroImageUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  {heroDraft.imageUrl && (
                    <div className="w-40 aspect-[4/3] rounded overflow-hidden border border-[#E4E4E0]">
                      <ResilientImage
                        src={heroDraft.imageUrl}
                        alt="Hero media preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {composer.type === 'headerText' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Store Name (Wordmark) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={headerTextDraft.storeName}
                      onChange={(e) =>
                        setHeaderTextDraft({ ...headerTextDraft, storeName: e.target.value })
                      }
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Search Bar Placeholder
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={headerTextDraft.navLabels.searchPlaceholder ?? ''}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: {
                            ...headerTextDraft.navLabels,
                            searchPlaceholder: e.target.value,
                          },
                        })
                      }
                      className="w-full h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Search Button
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={headerTextDraft.navLabels.searchButtonLabel ?? ''}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: {
                            ...headerTextDraft.navLabels,
                            searchButtonLabel: e.target.value,
                          },
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Nav Link 1
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={headerTextDraft.navLabels.shopAll}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: { ...headerTextDraft.navLabels, shopAll: e.target.value },
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Nav Link 2
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={headerTextDraft.navLabels.skincare}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: { ...headerTextDraft.navLabels, skincare: e.target.value },
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Account Nav Label
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={headerTextDraft.navLabels.trackOrderLabel ?? ''}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: {
                            ...headerTextDraft.navLabels,
                            trackOrderLabel: e.target.value,
                          },
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#F0F0EC]">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Corner Stamp Top Line
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={headerTextDraft.navLabels.dealsBadgeTop ?? ''}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: { ...headerTextDraft.navLabels, dealsBadgeTop: e.target.value },
                        })
                      }
                      placeholder="FLASH"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Corner Stamp Bottom Line
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={headerTextDraft.navLabels.dealsBadgeBottom ?? ''}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: { ...headerTextDraft.navLabels, dealsBadgeBottom: e.target.value },
                        })
                      }
                      placeholder="DEALS"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Bag Button Text
                    </label>
                    <input
                      type="text"
                      maxLength={24}
                      value={headerTextDraft.navLabels.bagLabel ?? ''}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          navLabels: { ...headerTextDraft.navLabels, bagLabel: e.target.value },
                        })
                      }
                      placeholder="Bag"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2 border-t border-[#F0F0EC]">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerTextDraft.showHeaderSearch}
                      onChange={(e) =>
                        setHeaderTextDraft({ ...headerTextDraft, showHeaderSearch: e.target.checked })
                      }
                      className="rounded border-[#D4D4CE]"
                    />
                    <span>Show Search Bar in Header</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerTextDraft.showHeaderDealsBadge}
                      onChange={(e) =>
                        setHeaderTextDraft({
                          ...headerTextDraft,
                          showHeaderDealsBadge: e.target.checked,
                        })
                      }
                      className="rounded border-[#D4D4CE]"
                    />
                    <span>Show Deals Corner Stamp</span>
                  </label>
                </div>
              </>
            )}

            {composer.type === 'promoCard' && (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Top Text
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={promoCardDraft.promoCardEyebrow}
                      onChange={(e) =>
                        setPromoCardDraft({ ...promoCardDraft, promoCardEyebrow: e.target.value })
                      }
                      placeholder="UP TO"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Center Big Value (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={promoCardDraft.promoCardBadge}
                      onChange={(e) =>
                        setPromoCardDraft({ ...promoCardDraft, promoCardBadge: e.target.value })
                      }
                      placeholder="Auto % OFF"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Bottom Text
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={promoCardDraft.promoCardSubBadge}
                      onChange={(e) =>
                        setPromoCardDraft({ ...promoCardDraft, promoCardSubBadge: e.target.value })
                      }
                      placeholder="OFF"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Card Title *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={promoCardDraft.promoCardTitle}
                      onChange={(e) =>
                        setPromoCardDraft({ ...promoCardDraft, promoCardTitle: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Card Subtitle
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={promoCardDraft.promoCardSubtitle}
                      onChange={(e) =>
                        setPromoCardDraft({ ...promoCardDraft, promoCardSubtitle: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Action Label
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={promoCardDraft.promoCardCta}
                      onChange={(e) =>
                        setPromoCardDraft({ ...promoCardDraft, promoCardCta: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Destination Link
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={promoCardDraft.promoCardTargetUrl}
                      onChange={(e) =>
                        setPromoCardDraft({
                          ...promoCardDraft,
                          promoCardTargetUrl: e.target.value,
                        })
                      }
                      placeholder="#vouchers-strip, #catalog, #flash-sale"
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
              </>
            )}

            {composer.type === 'shortcutTile' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Tile Label *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={shortcutTileDraft.label}
                      onChange={(e) =>
                        setShortcutTileDraft({ ...shortcutTileDraft, label: e.target.value })
                      }
                      placeholder="e.g., Bridal, Free Delivery, Account"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Icon Badge Text (Used if no photo)
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      value={shortcutTileDraft.badgeText ?? ''}
                      onChange={(e) =>
                        setShortcutTileDraft({ ...shortcutTileDraft, badgeText: e.target.value })
                      }
                      placeholder="e.g., CHOICE, FREE, NEW, SALE"
                      className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Click Destination *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={shortcutTileDraft.targetUrl}
                    onChange={(e) =>
                      setShortcutTileDraft({ ...shortcutTileDraft, targetUrl: e.target.value })
                    }
                    placeholder="#catalog, #category:Boutique, #account, https://..."
                    className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {destinationPresets.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setShortcutTileDraft((prev) => ({
                            ...prev,
                            targetUrl: preset.url,
                            label: prev.label || preset.label,
                          }))
                        }
                        className="px-2 py-1 text-[11px] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <HexColorField
                    label="Tile Background Color"
                    value={shortcutTileDraft.bgColor || '#F85606'}
                    fallbackColor="#F85606"
                    onChange={(hex) =>
                      setShortcutTileDraft({ ...shortcutTileDraft, bgColor: hex })
                    }
                  />
                  <HexColorField
                    label="Tile Text Color"
                    value={shortcutTileDraft.textColor || '#FFFFFF'}
                    fallbackColor="#FFFFFF"
                    onChange={(hex) =>
                      setShortcutTileDraft({ ...shortcutTileDraft, textColor: hex })
                    }
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-[#F0F0EC]">
                  <label className="block text-xs font-medium text-[#141413]">
                    Optional Photo Thumbnail (Replaces Color Tile)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={shortcutTileDraft.imageUrl ?? ''}
                      onChange={(e) =>
                        setShortcutTileDraft({ ...shortcutTileDraft, imageUrl: e.target.value })
                      }
                      placeholder="Leave blank for color badge or paste/upload photo..."
                      className="flex-1 min-w-[180px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                    <label className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingKey !== null}
                        onChange={(e) =>
                          handleSingleImageUpload(e, 'tile', (url) =>
                            setShortcutTileDraft((prev) => ({ ...prev, imageUrl: url }))
                          )
                        }
                        className="sr-only"
                      />
                    </label>
                    {shortcutTileDraft.imageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setShortcutTileDraft({ ...shortcutTileDraft, imageUrl: '' })
                        }
                        className="h-9 px-2.5 text-xs border border-[#D4D4CE] rounded-md cursor-pointer"
                      >
                        Clear Photo
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {composer.type === 'vouchersEditor' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Vouchers Section Title
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      value={vouchersDraft.vouchersHeading ?? ''}
                      onChange={(e) =>
                        setVouchersDraft({ ...vouchersDraft, vouchersHeading: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      More Vouchers Link Text
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={vouchersDraft.vouchersMoreLabel ?? ''}
                      onChange={(e) =>
                        setVouchersDraft({ ...vouchersDraft, vouchersMoreLabel: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Main Promo Code
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={vouchersDraft.promoCode}
                      onChange={(e) =>
                        setVouchersDraft({
                          ...vouchersDraft,
                          promoCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs font-mono bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={vouchersDraft.promoDiscountPercent}
                      onChange={(e) =>
                        setVouchersDraft({
                          ...vouchersDraft,
                          promoDiscountPercent: Math.max(0, Math.min(90, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Free Delivery Over (PKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={vouchersDraft.freeShippingThreshold}
                      onChange={(e) =>
                        setVouchersDraft({
                          ...vouchersDraft,
                          freeShippingThreshold: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Standard Fee (PKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={vouchersDraft.standardShippingFee}
                      onChange={(e) =>
                        setVouchersDraft({
                          ...vouchersDraft,
                          standardShippingFee: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Left Voucher Label
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={vouchersDraft.voucherLeftSubtitle ?? ''}
                      onChange={(e) =>
                        setVouchersDraft({ ...vouchersDraft, voucherLeftSubtitle: e.target.value })
                      }
                      placeholder="Voucher Max"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Collect Button Label
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={vouchersDraft.vouchersCtaLabel ?? ''}
                      onChange={(e) =>
                        setVouchersDraft({ ...vouchersDraft, vouchersCtaLabel: e.target.value })
                      }
                      placeholder="Collect All"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0F0EC] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#141413]">
                      Extra Voucher Codes ({(vouchersDraft.coupons ?? []).length}/20)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newCoupon: PromoCoupon = {
                          id: `coupon-${Date.now().toString(36)}`,
                          code: `SAVE${(vouchersDraft.coupons?.length ?? 0) + 15}`,
                          discountPercent: 15,
                          active: true,
                        };
                        setVouchersDraft((prev) => ({
                          ...prev,
                          coupons: [...(prev.coupons ?? []), newCoupon].slice(0, 20),
                        }));
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Coupon</span>
                    </button>
                  </div>

                  {(vouchersDraft.coupons ?? []).map((coupon, cIdx) => (
                    <div
                      key={coupon.id}
                      className="grid grid-cols-12 gap-2 items-center p-2 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md"
                    >
                      <input
                        type="text"
                        maxLength={30}
                        value={coupon.code}
                        onChange={(e) => {
                          const next = [...(vouchersDraft.coupons ?? [])];
                          next[cIdx] = { ...next[cIdx], code: e.target.value.toUpperCase() };
                          setVouchersDraft({ ...vouchersDraft, coupons: next });
                        }}
                        placeholder="CODE"
                        className="col-span-4 h-8 px-2 text-xs font-mono bg-white border border-[#D4D4CE] rounded"
                      />
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={coupon.discountPercent}
                        onChange={(e) => {
                          const next = [...(vouchersDraft.coupons ?? [])];
                          next[cIdx] = {
                            ...next[cIdx],
                            discountPercent: Math.min(90, Math.max(1, Number(e.target.value) || 10)),
                          };
                          setVouchersDraft({ ...vouchersDraft, coupons: next });
                        }}
                        placeholder="% OFF"
                        className="col-span-3 h-8 px-2 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                      <label className="col-span-3 inline-flex items-center gap-1 text-[11px] text-[#141413] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={coupon.active}
                          onChange={(e) => {
                            const next = [...(vouchersDraft.coupons ?? [])];
                            next[cIdx] = { ...next[cIdx], active: e.target.checked };
                            setVouchersDraft({ ...vouchersDraft, coupons: next });
                          }}
                        />
                        <span>Active</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (vouchersDraft.coupons ?? []).filter((_, i) => i !== cIdx);
                          setVouchersDraft({ ...vouchersDraft, coupons: next });
                        }}
                        aria-label="Delete coupon"
                        className="col-span-2 flex justify-end p-1 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {composer.type === 'campaignBanner' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Eyebrow Badge
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={bannerDraft.eyebrow ?? ''}
                      onChange={(e) =>
                        setBannerDraft({ ...bannerDraft, eyebrow: e.target.value })
                      }
                      placeholder="e.g., F. GOLD EXCLUSIVE"
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Main Campaign Heading *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={bannerDraft.heading ?? ''}
                      onChange={(e) =>
                        setBannerDraft({ ...bannerDraft, heading: e.target.value })
                      }
                      placeholder="SEASONAL GRAND SALE"
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Department Line / Subtitle
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={bannerDraft.subtitle ?? ''}
                    onChange={(e) =>
                      setBannerDraft({ ...bannerDraft, subtitle: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Bottom Ribbon Text
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      value={bannerDraft.ribbonText ?? ''}
                      onChange={(e) =>
                        setBannerDraft({ ...bannerDraft, ribbonText: e.target.value })
                      }
                      placeholder="Auto % OFF & Delivery"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={bannerDraft.ctaLabel ?? ''}
                      onChange={(e) =>
                        setBannerDraft({ ...bannerDraft, ctaLabel: e.target.value })
                      }
                      placeholder="Shop Campaign"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Button Destination
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={bannerDraft.ctaUrl ?? ''}
                      onChange={(e) =>
                        setBannerDraft({ ...bannerDraft, ctaUrl: e.target.value })
                      }
                      placeholder="#catalog or #flash-sale"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <HexColorField
                  label="Banner Background Color"
                  value={bannerDraft.bgColor || '#68124B'}
                  fallbackColor="#68124B"
                  onChange={(hex) => setBannerDraft({ ...bannerDraft, bgColor: hex })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F0F0EC]">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#141413]">
                      Left Podium Photo
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bannerDraft.leftImageUrl ?? ''}
                        onChange={(e) =>
                          setBannerDraft({ ...bannerDraft, leftImageUrl: e.target.value })
                        }
                        className="flex-1 min-w-0 h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                      />
                      <label className="inline-flex items-center gap-1 h-8 px-2.5 text-[11px] font-medium border border-[#D4D4CE] rounded cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept={MEDIA_FILE_ACCEPT}
                          disabled={uploadingKey !== null}
                          onChange={(e) =>
                            handleSingleImageUpload(e, 'banner-left', (url) =>
                              setBannerDraft((prev) => ({ ...prev, leftImageUrl: url }))
                            )
                          }
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#141413]">
                      Right Podium Photo
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bannerDraft.rightImageUrl ?? ''}
                        onChange={(e) =>
                          setBannerDraft({ ...bannerDraft, rightImageUrl: e.target.value })
                        }
                        className="flex-1 min-w-0 h-8 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded"
                      />
                      <label className="inline-flex items-center gap-1 h-8 px-2.5 text-[11px] font-medium border border-[#D4D4CE] rounded cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept={MEDIA_FILE_ACCEPT}
                          disabled={uploadingKey !== null}
                          onChange={(e) =>
                            handleSingleImageUpload(e, 'banner-right', (url) =>
                              setBannerDraft((prev) => ({ ...prev, rightImageUrl: url }))
                            )
                          }
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {composer.type === 'flashSaleConfig' && (
              <>
                <p className="text-xs font-semibold text-[#141413]">
                  Flash Sale Row Labels
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={flashSaleDraft.flashSaleTitle ?? ''}
                      onChange={(e) =>
                        setFlashSaleDraft({ ...flashSaleDraft, flashSaleTitle: e.target.value })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Badge Pill
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={flashSaleDraft.flashSaleBadge ?? ''}
                      onChange={(e) =>
                        setFlashSaleDraft({ ...flashSaleDraft, flashSaleBadge: e.target.value })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Right Action Link Text
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={flashSaleDraft.flashSaleCtaLabel ?? ''}
                      onChange={(e) =>
                        setFlashSaleDraft({ ...flashSaleDraft, flashSaleCtaLabel: e.target.value })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>

                <p className="text-xs font-semibold text-[#141413] pt-2 border-t border-[#F0F0EC]">
                  Choice Curated Picks Row Labels
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Yellow Badge Text
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={flashSaleDraft.choiceBadge ?? ''}
                      onChange={(e) =>
                        setFlashSaleDraft({ ...flashSaleDraft, choiceBadge: e.target.value })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Section Heading
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={flashSaleDraft.choiceHeading ?? ''}
                      onChange={(e) =>
                        setFlashSaleDraft({ ...flashSaleDraft, choiceHeading: e.target.value })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Delivery Note (Blank = Auto PKR threshold)
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={flashSaleDraft.choiceFreeDeliveryText ?? ''}
                      onChange={(e) =>
                        setFlashSaleDraft({
                          ...flashSaleDraft,
                          choiceFreeDeliveryText: e.target.value,
                        })
                      }
                      placeholder="Auto: Free Delivery Rs. 15,000+"
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Right Action Link Text
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={flashSaleDraft.choiceCtaLabel ?? ''}
                      onChange={(e) =>
                        setFlashSaleDraft({ ...flashSaleDraft, choiceCtaLabel: e.target.value })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
              </>
            )}

            {composer.type === 'philosophyHeader' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Eyebrow Label
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={philosophyHeaderDraft.eyebrow}
                    onChange={(e) =>
                      setPhilosophyHeaderDraft({
                        ...philosophyHeaderDraft,
                        eyebrow: e.target.value,
                      })
                    }
                    className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Story Section Heading *
                  </label>
                  <textarea
                    rows={2}
                    required
                    maxLength={240}
                    value={philosophyHeaderDraft.heading}
                    onChange={(e) =>
                      setPhilosophyHeaderDraft({
                        ...philosophyHeaderDraft,
                        heading: e.target.value,
                      })
                    }
                    className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#141413]">
                    Editorial Section Photo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={philosophyHeaderDraft.imageUrl}
                      onChange={(e) =>
                        setPhilosophyHeaderDraft({
                          ...philosophyHeaderDraft,
                          imageUrl: e.target.value,
                        })
                      }
                      className="flex-1 min-w-[180px] h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                    <label className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium border border-[#D4D4CE] rounded-md cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept={MEDIA_FILE_ACCEPT}
                        disabled={uploadingKey !== null}
                        onChange={(e) =>
                          handleSingleImageUpload(e, 'phil', (url) =>
                            setPhilosophyHeaderDraft((prev) => ({ ...prev, imageUrl: url }))
                          )
                        }
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}

            {composer.type === 'footerConfig' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={footerDraft.storeName}
                      onChange={(e) =>
                        setFooterDraft({ ...footerDraft, storeName: e.target.value })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Subscribe Button Label
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={footerDraft.newsletterButtonLabel}
                      onChange={(e) =>
                        setFooterDraft({
                          ...footerDraft,
                          newsletterButtonLabel: e.target.value,
                        })
                      }
                      className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#141413] mb-1">
                    Footer Store Tagline
                  </label>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={footerDraft.footerTagline}
                    onChange={(e) =>
                      setFooterDraft({ ...footerDraft, footerTagline: e.target.value })
                    }
                    className="w-full p-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F0F0EC]">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Newsletter Eyebrow
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={footerDraft.newsletterEyebrow}
                      onChange={(e) =>
                        setFooterDraft({
                          ...footerDraft,
                          newsletterEyebrow: e.target.value,
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                      Newsletter Heading
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={footerDraft.newsletterHeading}
                      onChange={(e) =>
                        setFooterDraft({
                          ...footerDraft,
                          newsletterHeading: e.target.value,
                        })
                      }
                      className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                    Newsletter Description (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={footerDraft.newsletterDescription}
                    onChange={(e) =>
                      setFooterDraft({
                        ...footerDraft,
                        newsletterDescription: e.target.value,
                      })
                    }
                    placeholder="Auto description if left blank"
                    className="w-full h-9 px-2.5 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md"
                  />
                </div>
                <div className="flex flex-wrap gap-4 pt-2 border-t border-[#F0F0EC]">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={footerDraft.showFooterNewsletter}
                      onChange={(e) =>
                        setFooterDraft({
                          ...footerDraft,
                          showFooterNewsletter: e.target.checked,
                        })
                      }
                    />
                    <span>Show Newsletter Section</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={footerDraft.showBottomNavBar}
                      onChange={(e) =>
                        setFooterDraft({
                          ...footerDraft,
                          showBottomNavBar: e.target.checked,
                        })
                      }
                    />
                    <span>Show Bottom App Bar</span>
                  </label>
                </div>
              </>
            )}

            {composer.type === 'sectionManager' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F0F0EC]">
                  <p className="text-xs text-[#5A5A56]">
                    Turn any homepage section ON or OFF (remove or restore any block anytime).
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setSectionManagerDraft({
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
                        hero3dEnabled: true,
                        highlightEnabled: true,
                        philosophyVisible: true,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Show All Sections</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      ['showHeaderSearch', 'Header Search Bar'],
                      ['showHeaderDealsBadge', 'Header Deals Corner Stamp'],
                      ['showHeroSection', 'Top Hero Deal Banner'],
                      ['showHeroEyebrow', 'Hero Eyebrow Pill'],
                      ['showHeroSecondaryCta', 'Hero Secondary Button'],
                      ['showHeroShareCta', 'Hero Share Button'],
                      ['showHeroGuarantees', 'Dark Trust & Guarantees Strip'],
                      ['showMarketplaceShortcuts', 'Quick Promo Card & Shortcut Tiles'],
                      ['showVouchersSection', 'Collect Vouchers Card'],
                      ['showCampaignBanner', 'Seasonal Gold Podium Banner'],
                      ['showFlashSaleSection', 'Flash Sale Products Row'],
                      ['showChoiceStrip', 'Choice · Curated Picks Strip'],
                      ['showCatalog', 'Full Store Catalog Grid'],
                      ['showFooterNewsletter', 'Footer Newsletter Box'],
                      ['showTeamMembers', 'Footer Store Members Box'],
                      ['showSeoCard', 'Footer SEO Profile Card'],
                      ['showBottomNavBar', 'Bottom Mobile App Navigation Bar'],
                    ] as Array<[keyof SiteVisibilityConfig, string]>
                  ).map(([key, label]) => {
                    const checked = sectionManagerDraft.visibility[key] ?? true;
                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer"
                      >
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSectionManagerDraft((prev) => ({
                              ...prev,
                              visibility: {
                                ...prev.visibility,
                                [key]: e.target.checked,
                              },
                            }))
                          }
                        />
                      </label>
                    );
                  })}

                  <label className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <span>Hero 3D Product Showcase</span>
                    <input
                      type="checkbox"
                      checked={sectionManagerDraft.hero3dEnabled}
                      onChange={(e) =>
                        setSectionManagerDraft((prev) => ({
                          ...prev,
                          hero3dEnabled: e.target.checked,
                        }))
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <span>Highlight Picture / Video Slider</span>
                    <input
                      type="checkbox"
                      checked={sectionManagerDraft.highlightEnabled}
                      onChange={(e) =>
                        setSectionManagerDraft((prev) => ({
                          ...prev,
                          highlightEnabled: e.target.checked,
                        }))
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md text-xs font-medium text-[#141413] cursor-pointer">
                    <span>Store Story / Standards Section</span>
                    <input
                      type="checkbox"
                      checked={sectionManagerDraft.philosophyVisible}
                      onChange={(e) =>
                        setSectionManagerDraft((prev) => ({
                          ...prev,
                          philosophyVisible: e.target.checked,
                        }))
                      }
                    />
                  </label>
                </div>
              </>
            )}

            {composer.type === 'layoutOrganizer' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#5A5A56]">
                    Move any homepage section to Front (Top), Middle, or Bottom — and choose Left, Center, Right, or swap Left ↔ Right sides.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setLayoutDraft({
                        sectionOrder: [...DEFAULT_HOME_SECTION_ORDER],
                        sectionMeta: {},
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#141413] text-white rounded cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default Order</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {layoutDraft.sectionOrder.map((secId, index) => {
                    const meta = layoutDraft.sectionMeta[secId] ?? {};
                    const align = meta.align ?? 'left';
                    const reverseSplit = Boolean(meta.reverseSplit);
                    const supportsSplitSwap = secId === 'heroStage' || secId === 'philosophy';
                    const total = layoutDraft.sectionOrder.length;

                    const moveItem = (target: 'top' | 'middle' | 'bottom' | 'up' | 'down') => {
                      setLayoutDraft((prev) => {
                        const list = [...prev.sectionOrder];
                        const curIdx = list.indexOf(secId);
                        if (curIdx === -1) return prev;
                        list.splice(curIdx, 1);
                        let nextIdx = curIdx;
                        if (target === 'top') nextIdx = 0;
                        else if (target === 'bottom') nextIdx = list.length;
                        else if (target === 'middle') nextIdx = Math.floor(list.length / 2);
                        else if (target === 'up') nextIdx = Math.max(0, curIdx - 1);
                        else if (target === 'down') nextIdx = Math.min(list.length, curIdx + 1);
                        list.splice(nextIdx, 0, secId);
                        return { ...prev, sectionOrder: list };
                      });
                    };

                    return (
                      <div
                        key={secId}
                        className="p-3 rounded-lg border border-[#E4E4E0] bg-[#FAFAFA] flex flex-col gap-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-white border border-[#D4D4CE] text-[11px] font-bold tabular-nums flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-xs font-semibold text-[#141413] truncate">
                              {HOME_SECTION_LABELS[secId]}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 text-[11px]">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveItem('top')}
                              className="px-2 py-1 bg-white border border-[#D4D4CE] rounded hover:border-[#F85606] disabled:opacity-35 cursor-pointer"
                            >
                              Top
                            </button>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveItem('up')}
                              className="px-2 py-1 bg-white border border-[#D4D4CE] rounded hover:border-[#F85606] disabled:opacity-35 cursor-pointer"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem('middle')}
                              className="px-2 py-1 bg-white border border-[#D4D4CE] rounded hover:border-[#F85606] cursor-pointer"
                            >
                              Middle
                            </button>
                            <button
                              type="button"
                              disabled={index === total - 1}
                              onClick={() => moveItem('down')}
                              className="px-2 py-1 bg-white border border-[#D4D4CE] rounded hover:border-[#F85606] disabled:opacity-35 cursor-pointer"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              disabled={index === total - 1}
                              onClick={() => moveItem('bottom')}
                              className="px-2 py-1 bg-white border border-[#D4D4CE] rounded hover:border-[#F85606] disabled:opacity-35 cursor-pointer"
                            >
                              Bottom
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#E4E4E0] text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-[#5A5A56] mr-1">Place / Align:</span>
                            {(['left', 'center', 'right'] as const).map((a) => (
                              <button
                                key={a}
                                type="button"
                                onClick={() =>
                                  setLayoutDraft((prev) => ({
                                    ...prev,
                                    sectionMeta: {
                                      ...prev.sectionMeta,
                                      [secId]: { ...prev.sectionMeta[secId], align: a },
                                    },
                                  }))
                                }
                                className={`px-2 py-0.5 rounded border capitalize cursor-pointer ${
                                  align === a
                                    ? 'bg-[#F85606] text-white border-[#F85606] font-semibold'
                                    : 'bg-white text-[#141413] border-[#D4D4CE]'
                                }`}
                              >
                                {a}
                              </button>
                            ))}
                          </div>

                          {supportsSplitSwap && (
                            <button
                              type="button"
                              onClick={() =>
                                setLayoutDraft((prev) => ({
                                  ...prev,
                                  sectionMeta: {
                                    ...prev.sectionMeta,
                                    [secId]: {
                                      ...prev.sectionMeta[secId],
                                      reverseSplit: !reverseSplit,
                                    },
                                  },
                                }))
                              }
                              className={`px-2.5 py-0.5 rounded border cursor-pointer ${
                                reverseSplit
                                  ? 'bg-[#141413] text-white border-[#141413] font-semibold'
                                  : 'bg-white text-[#141413] border-[#D4D4CE]'
                              }`}
                            >
                              {reverseSplit ? 'Columns Swapped (Right ↔ Left)' : 'Swap Left ↔ Right Columns'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E4E4E0] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] hover:border-[#141413] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingKey !== null}
              className="px-5 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {uploadingKey !== null
                ? `Uploading Media (${uploadProgress}%)...`
                : 'Save to Home Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
