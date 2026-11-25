import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  CategoryFilter,
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  Hero3DShowcaseConfig,
  HeroGuarantee,
  HeroHighlightSliderConfig,
  HomeBox,
  HomeLink,
  MarketplaceShortcutTile,
  Product,
  SectionAlign,
  SiteConfig,
  SiteVisibilityConfig,
  isKidsCategory,
} from '../types';
import {
  buildWhatsAppUrl,
  isExternalSiteLink,
  isInAppSocialBrowser,
  normalizeSiteLinkUrl,
} from '../utils/social';
import { Department3DShowcase } from './Department3DShowcase';
import { HighlightShowcaseSlider } from './HighlightShowcaseSlider';
import { HomeCustomBoxes } from './HomeCustomBoxes';
import { ResilientImage } from './ResilientImage';
import { ShareStoreControl } from './ShareStoreControl';
import { SocialPlatformIcon, WhatsAppIcon } from './SocialIcons';

interface HeroProps {
  storeName: string;
  hero: SiteConfig['hero'];
  socialLinks: SiteConfig['socialLinks'];
  categories?: string[];
  subcategoriesMap?: Record<string, string[]>;
  activeCategory?: CategoryFilter;
  activeSubcategory?: string;
  categoryCounts?: Record<string, number>;
  subcategoryCounts?: Record<string, Record<string, number>>;
  totalProductCount?: number;
  products?: Product[];
  hero3dShowcase?: Hero3DShowcaseConfig;
  highlightSlider?: HeroHighlightSliderConfig;
  promoDiscountPercent?: number;
  freeShippingThreshold?: number;
  isAdmin?: boolean;
  onSelectCategory?: (category: CategoryFilter, subcategory?: string) => void;
  onInspectProduct?: (product: Product) => void;
  onCustomize3D?: () => void;
  onCustomizeHighlightSlider?: () => void;
  onAddCategory?: (categoryName: string) => boolean | void;
  onDeleteCategory?: (categoryName: string) => void;
  onAddSubcategory?: (
    parentCategory: string,
    subcategoryName: string
  ) => boolean | void;
  onDeleteSubcategory?: (
    parentCategory: string,
    subcategoryName: string
  ) => void;
  onAdminSignIn?: () => void;
  customBoxes?: HomeBox[];
  customLinks?: HomeLink[];
  visibility?: SiteVisibilityConfig;
  isHomeEditMode?: boolean;
  onExploreCatalog: () => void;
  onViewBestsellers: () => void;
  onOpenAccount?: () => void;
  onScrollToVouchers?: () => void;
  onNavigateLink?: (url: string) => void;
  renderSection?: 'all' | 'heroStage' | 'trustBar' | 'shortcutsStrip' | 'highlightSlider';
  alignment?: SectionAlign;
  reverseSplit?: boolean;
  onEditHero?: () => void;
  onToggleSecondaryCta?: () => void;
  onToggleGuaranteesSection?: () => void;
  onAddGuarantee?: () => void;
  onEditGuarantee?: (index: number, item: HeroGuarantee) => void;
  onDeleteGuarantee?: (index: number) => void;
  onAddCustomBox?: () => void;
  onEditCustomBox?: (box: HomeBox) => void;
  onDeleteCustomBox?: (boxId: string) => void;
  onAddHeroLink?: () => void;
  onEditHeroLink?: (link: HomeLink) => void;
  onDeleteHeroLink?: (linkId: string) => void;
  onDeleteSocialAccount?: (accountId: string) => void;
  onToggleHeroSection?: () => void;
  onToggleHeroEyebrow?: () => void;
  onToggleShareCta?: () => void;
  onToggleShortcutsStrip?: () => void;
  onEditPromoCard?: () => void;
  onTogglePromoCard?: () => void;
  onAddShortcutTile?: () => void;
  onEditShortcutTile?: (tile: MarketplaceShortcutTile) => void;
  onDeleteShortcutTile?: (tileId: string) => void;
  onResetShortcutTiles?: () => void;
}

function getCategoryThumbUrl(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('boutique') || lower.includes('bridal')) {
    return '/src/assets/images/product_bridal_dress_1795171611227.jpg';
  }
  if (lower.includes('jewel')) {
    return '/src/assets/images/product_artificial_jewellery_1795093182654.jpg';
  }
  if (lower.includes('western')) {
    return '/src/assets/images/product_western_short_dress_1795171612445.jpg';
  }
  if (lower.includes('eastern')) {
    return '/src/assets/images/product_eastern_dress_1795084480580.jpg';
  }
  if (lower.includes('baby') || lower.includes('kid')) {
    return '/src/assets/images/product_kids_girl_dress_1795171612075.jpg';
  }
  if (lower.includes('skin')) {
    return '/src/assets/images/product_barrier_serum_1795082515519.jpg';
  }
  if (lower.includes('fragrance') || lower.includes('perfume')) {
    return '/src/assets/images/product_fig_eau_parfum_1795082517674.jpg';
  }
  if (lower.includes('cosmetic')) {
    return '/src/assets/images/product_velvet_lip_tint_1795082516603.jpg';
  }
  return '/src/assets/images/product_party_wear_1795171612744.jpg';
}

function getGuaranteeIcon(title: string, idx: number) {
  const lower = title.toLowerCase();
  if (lower.includes('ship') || lower.includes('deliver') || lower.includes('dispatch')) {
    return <Truck className="w-3.5 h-3.5 text-[#FF8C42] shrink-0" strokeWidth={2} />;
  }
  if (lower.includes('return') || lower.includes('exchange') || lower.includes('refund')) {
    return <RotateCcw className="w-3.5 h-3.5 text-[#FF8C42] shrink-0" strokeWidth={2} />;
  }
  if (lower.includes('pay') || lower.includes('safe') || lower.includes('cod') || lower.includes('pkr')) {
    return <ShieldCheck className="w-3.5 h-3.5 text-[#FF8C42] shrink-0" strokeWidth={2} />;
  }
  return idx % 2 === 0 ? (
    <ShieldCheck className="w-3.5 h-3.5 text-[#FF8C42] shrink-0" strokeWidth={2} />
  ) : (
    <Truck className="w-3.5 h-3.5 text-[#FF8C42] shrink-0" strokeWidth={2} />
  );
}

export function buildDefaultShortcutTiles(
  categories: string[],
  freeShippingThreshold: number
): MarketplaceShortcutTile[] {
  const tiles: MarketplaceShortcutTile[] = [
    {
      id: 'default-choice',
      label: 'Everyday Picks',
      badgeText: 'CHOICE',
      bgColor: '#FFD814',
      textColor: '#141413',
      targetUrl: '#catalog',
    },
    {
      id: 'default-free-delivery',
      label: `Free Rs.${Math.round(freeShippingThreshold / 1000)}K+`,
      badgeText: 'FREE',
      bgColor: '#008C7A',
      textColor: '#FFFFFF',
      targetUrl: '#vouchers-strip',
    },
  ];
  for (const cat of categories.slice(0, 6)) {
    tiles.push({
      id: `default-cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: cat,
      imageUrl: getCategoryThumbUrl(cat),
      bgColor: '#F5F5F3',
      textColor: '#141413',
      targetUrl: `#category:${cat}`,
    });
  }
  return tiles;
}

export function Hero({
  storeName,
  hero,
  socialLinks,
  categories = DEFAULT_CATEGORIES,
  subcategoriesMap = DEFAULT_SUBCATEGORIES,
  activeCategory = 'All',
  activeSubcategory = 'All',
  categoryCounts = {},
  subcategoryCounts = {},
  totalProductCount = 0,
  products = [],
  hero3dShowcase,
  highlightSlider,
  promoDiscountPercent = 10,
  freeShippingThreshold = 15000,
  isAdmin = false,
  onSelectCategory,
  onInspectProduct,
  onCustomize3D,
  onCustomizeHighlightSlider,
  onAddCategory,
  onDeleteCategory,
  onAddSubcategory,
  onDeleteSubcategory,
  onAdminSignIn,
  customBoxes = [],
  customLinks = [],
  visibility,
  isHomeEditMode = false,
  onExploreCatalog,
  onViewBestsellers,
  onOpenAccount,
  onScrollToVouchers,
  onNavigateLink = () => {},
  renderSection = 'all',
  alignment = 'left',
  reverseSplit = false,
  onEditHero,
  onToggleSecondaryCta,
  onToggleGuaranteesSection,
  onAddGuarantee,
  onEditGuarantee,
  onDeleteGuarantee,
  onAddCustomBox,
  onEditCustomBox,
  onDeleteCustomBox,
  onAddHeroLink,
  onEditHeroLink,
  onDeleteHeroLink,
  onDeleteSocialAccount,
  onToggleHeroSection,
  onToggleHeroEyebrow,
  onToggleShareCta,
  onToggleShortcutsStrip,
  onEditPromoCard,
  onTogglePromoCard,
  onAddShortcutTile,
  onEditShortcutTile,
  onDeleteShortcutTile,
  onResetShortcutTiles,
}: HeroProps) {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [targetParentCategory, setTargetParentCategory] = useState('__top__');
  const [categoryFeedback, setCategoryFeedback] = useState<string | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCategoriesOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setIsCategoriesOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoriesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isCategoriesOpen]);

  const handleCategoryCreate = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim().slice(0, 60);
    if (!trimmed) return;

    if (targetParentCategory !== '__top__' && onAddSubcategory) {
      const existingSubs = subcategoriesMap[targetParentCategory] ?? [];
      const alreadyExists = existingSubs.some(
        (sub) => sub.toLowerCase() === trimmed.toLowerCase()
      );
      if (alreadyExists) {
        setCategoryFeedback(
          `"${trimmed}" is already inside ${targetParentCategory}.`
        );
        return;
      }
      onAddSubcategory(targetParentCategory, trimmed);
      setNewCategoryName('');
      setCategoryFeedback(`Added "${trimmed}" inside ${targetParentCategory}.`);
      window.setTimeout(() => setCategoryFeedback(null), 2400);
      return;
    }

    if (!onAddCategory) return;
    const alreadyExists = categories.some(
      (cat) => cat.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      setCategoryFeedback(`"${trimmed}" is already in your store categories.`);
      return;
    }
    onAddCategory(trimmed);
    setNewCategoryName('');
    setCategoryFeedback(`Added "${trimmed}" to store departments.`);
    window.setTimeout(() => setCategoryFeedback(null), 2400);
  };

  const whatsappUrl = buildWhatsAppUrl(
    socialLinks.whatsappNumber,
    socialLinks.whatsappMessage
  );
  const heroCustomLinks = customLinks.filter((l) => l.placement === 'hero');
  const hasSocials =
    Boolean(whatsappUrl) ||
    socialLinks.accounts.length > 0 ||
    heroCustomLinks.length > 0;
  const showSecondaryCta = visibility?.showHeroSecondaryCta ?? true;
  const showGuarantees = visibility?.showHeroGuarantees ?? true;
  const showHeroSection = visibility?.showHeroSection ?? true;
  const showHeroEyebrow = visibility?.showHeroEyebrow ?? true;
  const showShareCta = visibility?.showHeroShareCta ?? true;
  const showShortcutsStrip = visibility?.showMarketplaceShortcuts ?? true;
  const showPromoCard = hero.showPromoCard ?? true;

  const renderHeroStage = renderSection === 'all' || renderSection === 'heroStage';
  const renderTrustBar = renderSection === 'all' || renderSection === 'trustBar';
  const renderShortcutsStrip = renderSection === 'all' || renderSection === 'shortcutsStrip';
  const renderHighlightSlider = renderSection === 'all' || renderSection === 'highlightSlider';

  const alignTextClass =
    alignment === 'center'
      ? 'text-center items-center'
      : alignment === 'right'
        ? 'text-right items-end'
        : 'text-left items-start';
  const alignFlexClass =
    alignment === 'center'
      ? 'justify-center'
      : alignment === 'right'
        ? 'justify-end'
        : 'justify-start';

  const resolvedTiles: MarketplaceShortcutTile[] = (
    Array.isArray(hero.shortcutTiles)
      ? hero.shortcutTiles
      : buildDefaultShortcutTiles(categories, freeShippingThreshold)
  ).filter(
    (tile) =>
      tile.id !== 'default-track-order' &&
      tile.targetUrl.trim().toLowerCase() !== '#track-order'
  );

  const handleTileAction = (targetUrl: string) => {
    const clean = targetUrl.trim();
    if (!clean || clean === '#catalog') {
      onExploreCatalog();
      return;
    }
    if (clean === '#vouchers-strip') {
      if (onScrollToVouchers) onScrollToVouchers();
      else onExploreCatalog();
      return;
    }
    if (clean === '#account' || clean === '#track-order') {
      if (onOpenAccount) onOpenAccount();
      else onNavigateLink(clean);
      return;
    }
    if (clean.startsWith('#category:')) {
      const cat = clean.slice('#category:'.length);
      onSelectCategory?.(cat, 'All');
      return;
    }
    onNavigateLink(clean);
  };

  return (
    <section
      id={renderHeroStage ? 'top' : undefined}
      className="bg-[#F6F6F4]"
    >
      {/* Vibrant Marketplace Hero Stage */}
      {renderHeroStage && (!showHeroSection ? (
        isHomeEditMode &&
        onToggleHeroSection && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3">
            <div className="bg-white border border-dashed border-[#D4D4CE] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#5A5A56]">
                Top Hero Deal Banner is hidden from shoppers.
              </span>
              <button
                type="button"
                onClick={onToggleHeroSection}
                className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Hero Banner</span>
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FCDCE8] via-[#FFF0F5] to-[#FFF6EE] border-b border-[#F2D5DF]">
          {/* Decorative floating sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/45 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#FF8CA7]/15 blur-2xl"
          />

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-6 lg:pt-6 lg:pb-8">
            {/* Top Eyebrow Bar + Categories Dropdown Corner */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {showHeroEyebrow ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#FF4C68] to-[#F85606] text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      <span>{hero.eyebrow}</span>
                    </span>
                    {isHomeEditMode && onToggleHeroEyebrow && (
                      <button
                        type="button"
                        onClick={onToggleHeroEyebrow}
                        aria-label="Hide hero eyebrow badge"
                        title="Hide badge"
                        className="p-1 rounded-full bg-white border border-[#D4D4CE] text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ) : (
                  isHomeEditMode &&
                  onToggleHeroEyebrow && (
                    <button
                      type="button"
                      onClick={onToggleHeroEyebrow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#5A5A56] bg-white border border-dashed border-[#D4D4CE] rounded-full hover:border-[#141413] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore Eyebrow</span>
                    </button>
                  )
                )}
                {isHomeEditMode && onEditHero && (
                  <button
                    type="button"
                    onClick={onEditHero}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#141413] bg-white border border-[#D4D4CE] rounded-full hover:border-[#141413] cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Hero</span>
                  </button>
                )}
                {isHomeEditMode && onToggleHeroSection && (
                  <button
                    type="button"
                    onClick={onToggleHeroSection}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] bg-white border border-[#D4D4CE] rounded-full hover:border-[var(--accent)] cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Hero Banner</span>
                  </button>
                )}
              </div>

            <div ref={categoryMenuRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((prev) => !prev)}
                aria-expanded={isCategoriesOpen}
                aria-haspopup="true"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F85606] ${
                  isCategoriesOpen
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-white/80 bg-white/90 text-[#141413] hover:border-[#F85606]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#F85606]" strokeWidth={2} />
                <span>
                  {activeCategory !== 'All'
                    ? `${activeCategory}${
                        activeSubcategory && activeSubcategory !== 'All'
                          ? ` · ${activeSubcategory}`
                          : ''
                      }`
                    : 'Categories'}
                </span>
                <span
                  className={`text-[11px] tabular-nums ${
                    isCategoriesOpen ? 'text-white/80' : 'text-[#5A5A56]'
                  }`}
                >
                  ({categories.length})
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    isCategoriesOpen ? 'rotate-180' : ''
                  }`}
                  strokeWidth={2}
                />
              </button>

              {isCategoriesOpen && (
                <div
                  role="region"
                  aria-label="All product categories"
                  className="absolute right-0 top-full mt-2 w-80 sm:w-[400px] z-40 bg-white border border-[#E4E4E0] rounded-xl shadow-2xl overflow-hidden"
                >
                  <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E4E4E0] flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#141413]">
                        Store Departments &amp; Sections
                      </p>
                      <p className="text-[11px] text-[#5A5A56]">
                        Select any department or subcategory to browse
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoriesOpen(false)}
                      aria-label="Close categories menu"
                      className="p-1 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCategory?.('All', 'All');
                        setIsCategoriesOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-md text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        activeCategory === 'All'
                          ? 'bg-[#F85606] text-white font-semibold'
                          : 'text-[#141413] hover:bg-[#F2F2F0]'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {activeCategory === 'All' && (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>All Departments</span>
                      </span>
                      <span
                        className={`text-[11px] tabular-nums ${
                          activeCategory === 'All' ? 'text-white/90' : 'text-[#5A5A56]'
                        }`}
                      >
                        {totalProductCount} items
                      </span>
                    </button>

                    {categories.map((cat) => {
                      const count = categoryCounts[cat] ?? 0;
                      const isDeptSelected =
                        activeCategory === cat &&
                        (!activeSubcategory || activeSubcategory === 'All');
                      const isDeptParentActive = activeCategory === cat;
                      const subs = subcategoriesMap[cat] ?? [];

                      return (
                        <div key={cat} className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCategory?.(cat, 'All');
                                setIsCategoriesOpen(false);
                              }}
                              className={`flex-1 px-3 py-2 rounded-md text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                                isDeptSelected
                                  ? 'bg-[#141413] text-white font-medium'
                                  : isDeptParentActive
                                    ? 'bg-[#F2F2F0] text-[#141413] font-medium'
                                    : 'text-[#141413] hover:bg-[#F2F2F0]'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                {isDeptSelected && (
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span className="truncate">{cat}</span>
                                {isKidsCategory(cat) && (
                                  <span
                                    className={`text-[10px] font-normal ${
                                      isDeptSelected
                                        ? 'text-white/75'
                                        : 'text-[#5A5A56]'
                                    }`}
                                  >
                                    (1M–10Y)
                                  </span>
                                )}
                              </span>
                              <span
                                className={`text-[11px] tabular-nums shrink-0 ${
                                  isDeptSelected ? 'text-white/80' : 'text-[#5A5A56]'
                                }`}
                              >
                                {count} {count === 1 ? 'item' : 'items'}
                              </span>
                            </button>

                            {isAdmin && onDeleteCategory && categories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => onDeleteCategory(cat)}
                                aria-label={`Remove ${cat} category`}
                                title={`Remove ${cat}`}
                                className="p-2 text-[#5A5A56] hover:text-[var(--accent)] rounded-md hover:bg-[#FAFAFA] cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {subs.length > 0 && (
                            <div className="ml-4 pl-2.5 border-l border-[#E4E4E0] space-y-0.5 py-0.5">
                              {subs.map((sub) => {
                                const subCount = subcategoryCounts[cat]?.[sub] ?? 0;
                                const isSubSelected =
                                  activeCategory === cat && activeSubcategory === sub;
                                return (
                                  <div
                                    key={`${cat}-${sub}`}
                                    className="flex items-center gap-1"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectCategory?.(cat, sub);
                                        setIsCategoriesOpen(false);
                                      }}
                                      className={`flex-1 px-2.5 py-1.5 rounded text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                                        isSubSelected
                                          ? 'bg-[#141413] text-white font-medium'
                                          : 'text-[#5A5A56] hover:bg-[#F2F2F0] hover:text-[#141413]'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        {isSubSelected && (
                                          <Check className="w-3 h-3 shrink-0" />
                                        )}
                                        <span className="truncate">{sub}</span>
                                      </span>
                                      <span
                                        className={`text-[10px] tabular-nums shrink-0 ${
                                          isSubSelected
                                            ? 'text-white/80'
                                            : 'text-[#8A8A84]'
                                        }`}
                                      >
                                        {subCount}
                                      </span>
                                    </button>

                                    {isAdmin && onDeleteSubcategory && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteSubcategory(cat, sub)}
                                        aria-label={`Remove ${sub} from ${cat}`}
                                        title={`Remove ${sub}`}
                                        className="p-1 text-[#8A8A84] hover:text-[var(--accent)] rounded cursor-pointer shrink-0"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isAdmin && onAddCategory ? (
                    <form
                      onSubmit={handleCategoryCreate}
                      className="p-3 bg-[#FAFAFA] border-t border-[#E4E4E0] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="hero-new-category-input"
                          className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A56]"
                        >
                          Add Category / Subcategory
                        </label>
                        <select
                          value={targetParentCategory}
                          onChange={(e) => setTargetParentCategory(e.target.value)}
                          aria-label="Target department for new category"
                          className="h-7 px-2 text-[11px] bg-white border border-[#D4D4CE] rounded text-[#141413]"
                        >
                          <option value="__top__">New Top Department</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              Inside: {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="hero-new-category-input"
                          type="text"
                          maxLength={60}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder={
                            targetParentCategory === '__top__'
                              ? 'e.g., Handbags, Watches, Home'
                              : `e.g., New section in ${targetParentCategory}`
                          }
                          className="flex-1 min-w-0 h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                        />
                        <button
                          type="submit"
                          disabled={!newCategoryName.trim()}
                          className="h-9 px-3 inline-flex items-center gap-1 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                      {categoryFeedback && (
                        <p className="text-[11px] text-[var(--accent)] font-medium">
                          {categoryFeedback}
                        </p>
                      )}
                    </form>
                  ) : (
                    <div className="px-4 py-2.5 bg-[#FAFAFA] border-t border-[#E4E4E0] flex items-center justify-between gap-2 text-[11px] text-[#5A5A56]">
                      <span>Store owner? Add custom categories</span>
                      {onAdminSignIn && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoriesOpen(false);
                            onAdminSignIn();
                          }}
                          className="font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                        >
                          Admin Sign In
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hero Promo Split: Bold Headline Left + 3D Podium Showcase Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div
              className={`${
                hero3dShowcase?.enabled === false && !isAdmin
                  ? 'lg:col-span-12 max-w-2xl'
                  : 'lg:col-span-6'
              } ${reverseSplit ? 'lg:order-2' : 'lg:order-1'} flex flex-col justify-center ${alignTextClass} ${
                hero3dShowcase?.enabled === false && !isAdmin && alignment === 'center'
                  ? 'mx-auto'
                  : hero3dShowcase?.enabled === false && !isAdmin && alignment === 'right'
                    ? 'ml-auto'
                    : ''
              }`}
            >
              <h1 className="font-sans text-[clamp(1.75rem,3.6vw,2.85rem)] leading-[1.1] font-extrabold text-[#141413] tracking-tight text-balance mb-3">
                {hero.headline}
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-[#434340] max-w-lg mb-5">
                {hero.description}
              </p>

              <div className={`flex flex-wrap items-center ${alignFlexClass} gap-2.5 w-full`}>
                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold bg-white text-[#F85606] border border-[#F85606]/25 rounded-full shadow-sm hover:bg-[#F85606] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{hero.primaryCta}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>

                {showSecondaryCta && (
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onViewBestsellers}
                      className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#141413] bg-white/75 border border-white rounded-full hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {hero.secondaryCta}
                    </button>
                    {isHomeEditMode && onToggleSecondaryCta && (
                      <button
                        type="button"
                        onClick={onToggleSecondaryCta}
                        aria-label="Remove secondary hero button"
                        title="Remove secondary button"
                        className="p-2 text-[#5A5A56] hover:text-[var(--accent)] border border-[#E4E4E0] rounded-full bg-white cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                )}

                {!showSecondaryCta && isHomeEditMode && onToggleSecondaryCta && (
                  <button
                    type="button"
                    onClick={onToggleSecondaryCta}
                    className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-medium text-[#5A5A56] bg-white border border-dashed border-[#D4D4CE] rounded-full hover:border-[#141413] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore 2nd Button</span>
                  </button>
                )}

                {showShareCta ? (
                  <span className="inline-flex items-center gap-1">
                    <ShareStoreControl
                      storeName={storeName}
                      headline={hero.headline}
                      variant="hero"
                    />
                    {isHomeEditMode && onToggleShareCta && (
                      <button
                        type="button"
                        onClick={onToggleShareCta}
                        aria-label="Remove Share Store button"
                        className="p-2 text-[#5A5A56] hover:text-[var(--accent)] border border-[#E4E4E0] rounded-full bg-white cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ) : (
                  isHomeEditMode &&
                  onToggleShareCta && (
                    <button
                      type="button"
                      onClick={onToggleShareCta}
                      className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-medium text-[#5A5A56] bg-white border border-dashed border-[#D4D4CE] rounded-full hover:border-[#141413] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore Share Button</span>
                    </button>
                  )
                )}
              </div>

              {(hasSocials || isHomeEditMode) && (
                <div className={`mt-4 pt-3 border-t border-[#141413]/10 flex flex-wrap items-center ${alignFlexClass} gap-x-4 gap-y-2 text-xs font-medium text-[#434340] w-full`}>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target={isInAppSocialBrowser() ? undefined : '_blank'}
                      rel={isInAppSocialBrowser() ? undefined : 'noopener noreferrer'}
                      className="inline-flex items-center gap-1.5 text-[#141413] hover:text-[#F85606] transition-colors whitespace-nowrap"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-[#128C7E]" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {socialLinks.accounts.map((acc) => (
                    <span key={acc.id} className="inline-flex items-center gap-1">
                      <a
                        href={acc.url}
                        target={isInAppSocialBrowser() ? undefined : '_blank'}
                        rel={isInAppSocialBrowser() ? undefined : 'noopener noreferrer'}
                        className="inline-flex items-center gap-1.5 hover:text-[#141413] transition-colors whitespace-nowrap"
                      >
                        <SocialPlatformIcon
                          platform={acc.platform}
                          className="w-3.5 h-3.5"
                        />
                        <span>{acc.label}</span>
                      </a>
                      {isHomeEditMode && onDeleteSocialAccount && (
                        <button
                          type="button"
                          onClick={() => onDeleteSocialAccount(acc.id)}
                          aria-label={`Delete ${acc.label}`}
                          className="p-0.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}

                  {heroCustomLinks.map((link) => {
                    const resolvedUrl = normalizeSiteLinkUrl(link.url);
                    const openNewTab =
                      (link.openInNewTab ?? isExternalSiteLink(resolvedUrl)) &&
                      !isInAppSocialBrowser();

                    return (
                      <span
                        key={link.id}
                        className="inline-flex items-center gap-1"
                      >
                        {openNewTab ? (
                          <a
                            href={resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#141413] hover:text-[#F85606] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
                          >
                            <span>{link.label}</span>
                            <ExternalLink className="w-3 h-3 text-[#8A8A84]" />
                          </a>
                        ) : isExternalSiteLink(resolvedUrl) ? (
                          <a
                            href={resolvedUrl}
                            className="inline-flex items-center gap-1 text-[#141413] hover:text-[#F85606] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
                          >
                            <span>{link.label}</span>
                            <ExternalLink className="w-3 h-3 text-[#8A8A84]" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateLink(resolvedUrl)}
                            className="text-[#141413] hover:text-[#F85606] hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {link.label}
                          </button>
                        )}

                        {isHomeEditMode && (
                          <span className="inline-flex items-center gap-0.5 ml-0.5">
                            {onEditHeroLink && (
                              <button
                                type="button"
                                onClick={() => onEditHeroLink(link)}
                                aria-label={`Edit ${link.label}`}
                                className="p-0.5 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {onDeleteHeroLink && (
                              <button
                                type="button"
                                onClick={() => onDeleteHeroLink(link.id)}
                                aria-label={`Delete ${link.label}`}
                                className="p-0.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        )}
                      </span>
                    );
                  })}

                  {isHomeEditMode && onAddHeroLink && (
                    <button
                      type="button"
                      onClick={onAddHeroLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-full hover:border-[#141413] cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Link</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right column: 3D Product Showcase inside Deal Stage */}
            {(hero3dShowcase?.enabled !== false || isAdmin) && (
              <div
                className={`lg:col-span-6 ${
                  reverseSplit ? 'lg:order-1' : 'lg:order-2'
                } flex items-center justify-center bg-transparent`}
              >
                {products.length > 0 ||
                (hero3dShowcase?.mode === 'custom' &&
                  (hero3dShowcase.items?.length ?? 0) > 0) ||
                isAdmin ? (
                  <Department3DShowcase
                    products={products}
                    categories={categories}
                    activeCategory={activeCategory}
                    activeSubcategory={activeSubcategory}
                    showcaseConfig={hero3dShowcase}
                    isAdmin={isAdmin}
                    onSelectDepartment={(cat, sub) =>
                      onSelectCategory?.(cat, sub)
                    }
                    onInspectProduct={onInspectProduct}
                    onNavigateLink={onNavigateLink}
                    onCustomize={onCustomize3D}
                  />
                ) : (
                  <div className="w-full h-full min-h-[260px] lg:min-h-[360px] rounded-xl overflow-hidden border border-white/80 bg-white shadow-md">
                    <ResilientImage
                      src={hero.imageUrl}
                      alt={`${storeName} — ${hero.headline}`}
                      fallbackLabel={`${storeName} Studio Collection`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      ))}

      {/* Dark Trust & Guarantees Utility Bar (Safe Payment | Fast Delivery | Free Return) */}
      {renderTrustBar && (showGuarantees || isHomeEditMode) && (
        <div className="bg-[#262626] text-white border-b border-black/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5">
            {isHomeEditMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-white/15">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                  Trust Bar / Highlight Boxes ({hero.guarantees.length})
                  {!showGuarantees ? ' · Hidden' : ''}
                </span>
                <div className="flex items-center gap-2">
                  {onAddGuarantee && (
                    <button
                      type="button"
                      onClick={onAddGuarantee}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-white rounded cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Item</span>
                    </button>
                  )}
                  {onToggleGuaranteesSection && (
                    <button
                      type="button"
                      onClick={onToggleGuaranteesSection}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-white/15 rounded hover:bg-white/25 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{showGuarantees ? 'Hide Strip' : 'Show Strip'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {showGuarantees && (
              <div
                className={`flex flex-wrap items-center ${
                  alignment === 'center'
                    ? 'justify-center'
                    : alignment === 'right'
                      ? 'justify-end'
                      : 'justify-around sm:justify-between'
                } gap-x-4 gap-y-2`}
              >
                {hero.guarantees.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs font-semibold tracking-tight"
                    title={item.subtitle}
                  >
                    {getGuaranteeIcon(item.title, idx)}
                    <span className="whitespace-nowrap">{item.title}</span>
                    {isHomeEditMode && (
                      <span className="inline-flex items-center gap-0.5 ml-1">
                        {onEditGuarantee && (
                          <button
                            type="button"
                            onClick={() => onEditGuarantee(idx, item)}
                            aria-label={`Edit ${item.title}`}
                            className="p-0.5 text-white/75 hover:text-white cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteGuarantee && (
                          <button
                            type="button"
                            onClick={() => onDeleteGuarantee(idx)}
                            aria-label={`Delete ${item.title}`}
                            className="p-0.5 text-white/75 hover:text-[#FF8C42] cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Marketplace Feature & Category Shortcuts Strip */}
      {renderShortcutsStrip && (!showShortcutsStrip ? (
        isHomeEditMode &&
        onToggleShortcutsStrip && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3">
            <div className="bg-white border border-dashed border-[#D4D4CE] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#5A5A56]">
                Quick Promo Card &amp; Category Shortcuts Strip is hidden.
              </span>
              <button
                type="button"
                onClick={onToggleShortcutsStrip}
                className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Shortcuts Strip</span>
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white border-b border-[#E4E4E0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-2.5">
            {isHomeEditMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EFEFED]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A56]">
                  Promo Card &amp; Shortcut Tiles ({resolvedTiles.length})
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!showPromoCard && onTogglePromoCard && (
                    <button
                      type="button"
                      onClick={onTogglePromoCard}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore Promo Card</span>
                    </button>
                  )}
                  {onAddShortcutTile && (
                    <button
                      type="button"
                      onClick={onAddShortcutTile}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Tile</span>
                    </button>
                  )}
                  {Array.isArray(hero.shortcutTiles) && onResetShortcutTiles && (
                    <button
                      type="button"
                      onClick={onResetShortcutTiles}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#5A5A56] bg-white border border-[#D4D4CE] rounded hover:text-[#141413] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Default Tiles</span>
                    </button>
                  )}
                  {onToggleShortcutsStrip && (
                    <button
                      type="button"
                      onClick={onToggleShortcutsStrip}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] bg-white border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hide Strip</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              className={`flex items-stretch gap-3 overflow-x-auto pb-1 ${
                alignment === 'center'
                  ? 'sm:justify-center'
                  : alignment === 'right'
                    ? 'sm:justify-end'
                    : 'justify-start'
              }`}
            >
              {/* Left Featured Promo Card */}
              {showPromoCard && (
                <div className="relative shrink-0 w-44 sm:w-48">
                  {isHomeEditMode && (
                    <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                      {onEditPromoCard && (
                        <button
                          type="button"
                          onClick={onEditPromoCard}
                          aria-label="Edit Promo Card"
                          className="p-1 rounded bg-white/95 border border-[#D4D4CE] text-[#141413] hover:border-[#141413] cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {onTogglePromoCard && (
                        <button
                          type="button"
                          onClick={onTogglePromoCard}
                          aria-label="Remove Promo Card"
                          className="p-1 rounded bg-white/95 border border-[#D4D4CE] text-[var(--accent)] hover:border-[var(--accent)] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      hero.promoCardTargetUrl?.trim()
                        ? handleTileAction(hero.promoCardTargetUrl)
                        : onScrollToVouchers
                          ? onScrollToVouchers()
                          : onExploreCatalog()
                    }
                    className="w-full h-full rounded-xl border border-[#FFE1C8] bg-gradient-to-br from-[#FFF6EB] to-[#FFFDFA] p-2.5 flex flex-col justify-between text-left hover:border-[#F85606]/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#FF5E7E] to-[#E11D48] text-white flex flex-col items-center justify-center shrink-0 leading-none shadow-xs">
                        <span className="text-[7px] font-bold uppercase">
                          {hero.promoCardEyebrow?.trim() || 'UP TO'}
                        </span>
                        <span className="text-sm font-black tabular-nums">
                          {hero.promoCardBadge?.trim() || `${promoDiscountPercent}%`}
                        </span>
                        <span className="text-[7px] font-bold uppercase">
                          {hero.promoCardSubBadge?.trim() || 'OFF'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#141413] leading-tight truncate">
                          {hero.promoCardTitle?.trim() || 'Vouchers'}
                        </p>
                        <p className="text-[11px] font-bold text-[#F85606] leading-tight truncate">
                          {hero.promoCardSubtitle?.trim() || '& Deals'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-[#F6DFC5] flex items-center justify-between text-[11px] font-bold text-[#C26D1F]">
                      <span>{hero.promoCardCta?.trim() || 'Shop here'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              )}

              {/* Customizable Shortcut Tiles */}
              {resolvedTiles.map((tile) => (
                <div
                  key={tile.id}
                  className="relative shrink-0 w-[72px] sm:w-20 flex flex-col items-center text-center group"
                >
                  {isHomeEditMode && (
                    <div className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5">
                      {onEditShortcutTile && (
                        <button
                          type="button"
                          onClick={() => onEditShortcutTile(tile)}
                          aria-label={`Edit ${tile.label}`}
                          className="p-1 rounded-full bg-white border border-[#D4D4CE] text-[#141413] hover:border-[#141413] shadow-2xs cursor-pointer"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {onDeleteShortcutTile && (
                        <button
                          type="button"
                          onClick={() => onDeleteShortcutTile(tile.id)}
                          aria-label={`Delete ${tile.label}`}
                          className="p-1 rounded-full bg-white border border-[#D4D4CE] text-[var(--accent)] hover:border-[var(--accent)] shadow-2xs cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTileAction(tile.targetUrl)}
                    className="w-full flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    {tile.imageUrl?.trim() ? (
                      <span className="w-12 h-12 rounded-xl overflow-hidden border border-[#E4E4E0] bg-[#F5F5F3] shadow-2xs group-hover:-translate-y-0.5 group-hover:border-[#F85606] transition-all">
                        <ResilientImage
                          src={tile.imageUrl}
                          alt={tile.label}
                          fallbackLabel={tile.label}
                          className="w-full h-full object-cover"
                        />
                      </span>
                    ) : (
                      <span
                        className="w-12 h-12 rounded-xl font-black text-[10px] tracking-tighter flex flex-col items-center justify-center shadow-2xs group-hover:-translate-y-0.5 transition-transform px-1 leading-tight"
                        style={{
                          backgroundColor: tile.bgColor || '#FFD814',
                          color: tile.textColor || '#141413',
                        }}
                      >
                        {tile.id === 'default-free-delivery' && (
                          <Truck className="w-4 h-4 mb-0.5" strokeWidth={2.25} />
                        )}
                        <span className="truncate max-w-full">
                          {tile.badgeText?.trim() || tile.label.slice(0, 6).toUpperCase()}
                        </span>
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-[#141413] leading-tight line-clamp-2">
                      {tile.label}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Customizable Highlight Picture & Product Slider + Custom Hero Boxes */}
      {renderHighlightSlider && (
        <div
          className={`max-w-6xl mx-auto px-4 sm:px-6 pb-2 ${
            alignment === 'center'
              ? 'text-center'
              : alignment === 'right'
                ? 'text-right'
                : 'text-left'
          }`}
        >
          <HighlightShowcaseSlider
            config={highlightSlider}
            products={products}
            isAdmin={isAdmin}
            isHomeEditMode={isHomeEditMode}
            onInspectProduct={onInspectProduct}
            onNavigateLink={onNavigateLink}
            onCustomize={onCustomizeHighlightSlider}
          />

          <HomeCustomBoxes
            boxes={customBoxes}
            placement="hero"
            isHomeEditMode={isHomeEditMode}
            onNavigateLink={onNavigateLink}
            onAddBox={() => onAddCustomBox?.()}
            onEditBox={(box) => onEditCustomBox?.(box)}
            onDeleteBox={(boxId) => onDeleteCustomBox?.(boxId)}
          />
        </div>
      )}
    </section>
  );
}
