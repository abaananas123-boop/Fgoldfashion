import { FormEvent } from 'react';
import {
  Image as ImageIcon,
  LayoutGrid,
  Pencil,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { CategoryFilter, SiteConfig, SiteVisibilityConfig } from '../types';
import { ResilientImage } from './ResilientImage';

interface HeaderProps {
  storeName: string;
  navLabels: SiteConfig['navLabels'];
  headerBackgroundImage?: string;
  headerTextTheme?: 'dark' | 'light';
  visibility?: SiteVisibilityConfig;
  isHomeEditMode?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  activePage?: 'home' | 'account';
  customerEmail?: string | null;
  customerPhotoUrl?: string | null;
  onNavigateCategory: (category: CategoryFilter) => void;
  onScrollToDeals: () => void;
  onEditHeaderText?: () => void;
  onEditHeaderBg?: () => void;
  onToggleSearchBar?: () => void;
  onToggleDealsBadge?: () => void;
}

export function Header({
  storeName,
  navLabels,
  headerBackgroundImage,
  headerTextTheme = 'dark',
  visibility,
  isHomeEditMode = false,
  searchQuery,
  onSearchChange,
  onSubmitSearch,
  cartCount,
  onOpenCart,
  onOpenAccount,
  activePage = 'home',
  customerEmail,
  customerPhotoUrl,
  onNavigateCategory,
  onScrollToDeals,
  onEditHeaderText,
  onEditHeaderBg,
  onToggleSearchBar,
  onToggleDealsBadge,
}: HeaderProps) {
  const hasBgImage = Boolean(headerBackgroundImage && headerBackgroundImage.trim());
  const isLightInk = headerTextTheme === 'light';
  const showSearch = visibility?.showHeaderSearch ?? true;
  const showDealsBadge = visibility?.showHeaderDealsBadge ?? true;

  const searchPlaceholder =
    navLabels.searchPlaceholder?.trim() || 'Search dresses, jewellery, kids...';
  const searchButtonLabel = navLabels.searchButtonLabel?.trim() || 'Search';
  const rawAccountLabel = navLabels.trackOrderLabel?.trim();
  const accountLabel =
    rawAccountLabel && rawAccountLabel.toLowerCase() !== 'track order'
      ? rawAccountLabel
      : 'Account';
  const dealsBadgeTop = navLabels.dealsBadgeTop?.trim() || 'FLASH';
  const dealsBadgeBottom = navLabels.dealsBadgeBottom?.trim() || 'DEALS';
  const bagLabel = navLabels.bagLabel?.trim() || 'Bag';

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmitSearch();
  };

  return (
    <header
      className={`sticky top-0 z-40 relative overflow-hidden border-b transition-colors ${
        isLightInk
          ? 'border-white/15 bg-[#141413]/95 text-white'
          : 'border-[#E4E4E0] bg-white/95 backdrop-blur-md text-[var(--text-primary)]'
      }`}
    >
      {hasBgImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none"
        >
          <ResilientImage
            src={headerBackgroundImage!.trim()}
            alt=""
            fallbackLabel=""
            mode="background"
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute inset-0 backdrop-blur-[2px] ${
              isLightInk ? 'bg-[#141413]/68' : 'bg-white/85'
            }`}
          />
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2.5 sm:gap-5">
        {/* Store Wordmark */}
        <a
          href="#top"
          className={`theme-heading text-lg sm:text-2xl tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm ${
            isLightInk ? 'text-white' : 'text-[var(--text-primary)]'
          }`}
        >
          {storeName}
        </a>

        {/* Marketplace Search Bar */}
        {showSearch && (
          <form
            onSubmit={handleFormSubmit}
            role="search"
            aria-label="Search store catalog"
            className="flex-1 max-w-xl flex items-center bg-white rounded-full border-2 border-[#F85606] pl-3 pr-1 py-0.5 shadow-2xs"
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search products"
              className="flex-1 min-w-0 h-8 sm:h-9 text-xs sm:text-sm bg-transparent text-[#141413] placeholder:text-[#8A8A84] focus:outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
                className="p-1 text-[#8A8A84] hover:text-[#141413] cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateCategory('All')}
              aria-label="Browse all departments"
              title="Browse Departments"
              className="p-1.5 text-[#5A5A56] hover:text-[#F85606] transition-colors cursor-pointer shrink-0 hidden sm:inline-flex"
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
            </button>

            <button
              type="submit"
              className="h-7 sm:h-8 px-3 sm:px-4 rounded-full bg-gradient-to-r from-[#FF7024] to-[#F85606] text-white text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 hover:opacity-95 transition-opacity cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 sm:hidden" strokeWidth={2.25} />
              <span className="hidden sm:inline">{searchButtonLabel}</span>
            </button>
          </form>
        )}

        {/* Right Quick Actions & Store Stamp */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          <nav
            aria-label="Primary navigation"
            className={`hidden lg:flex items-center gap-4 text-xs font-semibold ${
              isLightInk ? 'text-white/90' : 'text-[#5A5A56]'
            }`}
          >
            <button
              type="button"
              onClick={() => onNavigateCategory('All')}
              className={`transition-colors whitespace-nowrap cursor-pointer ${
                isLightInk ? 'hover:text-white' : 'hover:text-[#F85606]'
              }`}
            >
              {navLabels.shopAll}
            </button>
            <button
              type="button"
              onClick={() => onNavigateCategory('Boutique')}
              className={`transition-colors whitespace-nowrap cursor-pointer ${
                isLightInk ? 'hover:text-white' : 'hover:text-[#F85606]'
              }`}
            >
              {navLabels.skincare}
            </button>
            <button
              type="button"
              onClick={onOpenAccount}
              aria-current={activePage === 'account' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activePage === 'account'
                  ? 'text-[#F85606]'
                  : isLightInk
                    ? 'hover:text-white'
                    : 'hover:text-[#F85606]'
              }`}
            >
              {customerPhotoUrl ? (
                <img
                  src={customerPhotoUrl}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover border border-[#F85606]/40"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-[#F85606]" />
              )}
              <span>{customerEmail ? customerEmail.split('@')[0] : accountLabel}</span>
            </button>
          </nav>

          {/* Compact Mobile Account Icon */}
          <button
            type="button"
            onClick={onOpenAccount}
            aria-label="Open customer account"
            className={`lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors cursor-pointer shrink-0 ${
              activePage === 'account'
                ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606]'
                : isLightInk
                  ? 'border-white/25 bg-white/10 text-white'
                  : 'border-[#E4E4E0] bg-[#FAFAFA] text-[#141413]'
            }`}
          >
            {customerPhotoUrl ? (
              <img
                src={customerPhotoUrl}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4" strokeWidth={2} />
            )}
          </button>

          {/* Compact Store Deals Badge */}
          {showDealsBadge && (
            <button
              type="button"
              onClick={onScrollToDeals}
              title="Jump to Flash Sale & Deals"
              className="hidden sm:flex flex-col items-center justify-center px-2 py-1 rounded-md bg-gradient-to-br from-[#FFF0F3] to-[#FFE3E8] border border-[#F85606]/30 text-[#C81D4E] leading-none cursor-pointer hover:border-[#F85606]"
            >
              <span className="text-[8px] font-extrabold uppercase tracking-wider">
                {dealsBadgeTop}
              </span>
              <span className="text-[9px] font-black uppercase tracking-tight">
                {dealsBadgeBottom}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open shopping bag, ${cartCount} items`}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-full transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isLightInk
                ? 'bg-white text-[#141413]'
                : 'bg-[var(--btn-bg)] text-[var(--btn-text)]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="tabular-nums hidden sm:inline">
              {bagLabel} ({cartCount})
            </span>
            <span className="tabular-nums sm:hidden">{cartCount}</span>
          </button>
        </div>
      </div>

      {isHomeEditMode && (
        <div className="relative z-10 border-t border-black/10 bg-black/5 px-3 sm:px-6 py-1.5">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-wider opacity-80">
              Header Bar Controls
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {onEditHeaderText && (
                <button
                  type="button"
                  onClick={onEditHeaderText}
                  className="inline-flex items-center gap-1 px-2.5 py-1 font-medium bg-white text-[#141413] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Header Text &amp; Search</span>
                </button>
              )}
              {onEditHeaderBg && (
                <button
                  type="button"
                  onClick={onEditHeaderBg}
                  className="inline-flex items-center gap-1 px-2.5 py-1 font-medium bg-white text-[#141413] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Header Background</span>
                </button>
              )}
              {onToggleSearchBar && (
                <button
                  type="button"
                  onClick={onToggleSearchBar}
                  className="inline-flex items-center gap-1 px-2.5 py-1 font-medium bg-white text-[var(--accent)] border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{showSearch ? 'Hide Search' : 'Show Search'}</span>
                </button>
              )}
              {onToggleDealsBadge && (
                <button
                  type="button"
                  onClick={onToggleDealsBadge}
                  className="inline-flex items-center gap-1 px-2.5 py-1 font-medium bg-white text-[var(--accent)] border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{showDealsBadge ? 'Hide Deals Stamp' : 'Show Deals Stamp'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
