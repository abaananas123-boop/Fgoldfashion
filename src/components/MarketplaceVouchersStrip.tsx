import { useState } from 'react';
import {
  Check,
  ChevronRight,
  Crown,
  Gift,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  HeroHighlightSliderConfig,
  SectionAlign,
  SiteConfig,
  SiteVisibilityConfig,
} from '../types';
import { formatPKR } from '../utils/currency';

interface MarketplaceVouchersStripProps {
  storeName: string;
  checkout: SiteConfig['checkout'];
  visibility?: SiteVisibilityConfig;
  collectedPromoCode: string | null;
  onCollectVoucher: (code: string) => void;
  onShopDeals: () => void;
  onNavigateLink?: (url: string) => void;
  onOpenCart: () => void;
  highlightSlider?: HeroHighlightSliderConfig;
  isAdmin?: boolean;
  isHomeEditMode?: boolean;
  alignment?: SectionAlign;
  onCustomizeHighlightSlider?: () => void;
  onEditVouchers?: () => void;
  onToggleVouchers?: () => void;
  onEditCampaignBanner?: () => void;
  onToggleCampaignBanner?: () => void;
}

export function MarketplaceVouchersStrip({
  storeName,
  checkout,
  visibility,
  collectedPromoCode,
  onCollectVoucher,
  onShopDeals,
  onNavigateLink,
  onOpenCart,
  highlightSlider,
  isAdmin = false,
  isHomeEditMode = false,
  alignment = 'left',
  onCustomizeHighlightSlider,
  onEditVouchers,
  onToggleVouchers,
  onEditCampaignBanner,
  onToggleCampaignBanner,
}: MarketplaceVouchersStripProps) {
  const [isMoreVouchersOpen, setIsMoreVouchersOpen] = useState(false);

  const showVouchers = visibility?.showVouchersSection ?? true;
  const showBanner = visibility?.showCampaignBanner ?? true;

  if (!showVouchers && !showBanner && !isHomeEditMode) {
    return null;
  }

  const primaryPromoCode = (checkout.promoCode || 'FGOLD10').trim().toUpperCase();
  const discountPercent = Math.max(0, Math.min(90, checkout.promoDiscountPercent || 10));
  const freeThreshold = Math.max(0, checkout.freeShippingThreshold || 15000);
  const standardFee = Math.max(0, checkout.standardShippingFee || 350);
  const activeCoupons = (checkout.coupons ?? []).filter((c) => c.active);
  const isCollected =
    Boolean(collectedPromoCode) &&
    collectedPromoCode?.toUpperCase() === primaryPromoCode;

  const vouchersHeading =
    checkout.vouchersHeading?.trim() || 'Collect Vouchers & Save More';
  const vouchersMoreLabel = checkout.vouchersMoreLabel?.trim() || 'More Vouchers';
  const vouchersCtaLabel = checkout.vouchersCtaLabel?.trim() || 'Collect All';
  const vouchersCollectedLabel =
    checkout.vouchersCollectedLabel?.trim() || 'Collected · Apply in Bag';
  const voucherLeftSubtitle = checkout.voucherLeftSubtitle?.trim() || 'Voucher Max';
  const voucherRightSubtitle =
    checkout.voucherRightSubtitle?.trim() ||
    `Free shipping on ${formatPKR(freeThreshold)}+`;

  const bannerCfg = checkout.campaignBanner;
  const campaignEyebrow =
    bannerCfg?.eyebrow?.trim() ||
    highlightSlider?.eyebrow?.trim() ||
    `${storeName.toUpperCase()} EXCLUSIVE`;
  const campaignHeading =
    bannerCfg?.heading?.trim() ||
    highlightSlider?.heading?.trim() ||
    'SEASONAL GRAND SALE';
  const campaignSubtitle =
    bannerCfg?.subtitle?.trim() ||
    'Boutique · Jewellery · Kids (1M–10Y) · Beauty';
  const campaignBannerSub =
    bannerCfg?.ribbonText?.trim() ||
    highlightSlider?.description?.trim() ||
    `UP TO ${discountPercent}% OFF · FREE DELIVERY RS. ${freeThreshold.toLocaleString()}+`;
  const campaignCtaLabel = bannerCfg?.ctaLabel?.trim() || 'Shop Campaign';
  const campaignCtaUrl = bannerCfg?.ctaUrl?.trim() || '#catalog';
  const leftImg =
    bannerCfg?.leftImageUrl?.trim() ||
    '/src/assets/images/product_bridal_dress_1795171611227.jpg';
  const rightImg =
    bannerCfg?.rightImageUrl?.trim() ||
    '/src/assets/images/product_artificial_jewellery_1795093182654.jpg';
  const bannerBg = bannerCfg?.bgColor?.trim() || '#68124B';

  return (
    <section
      aria-label="Store vouchers and seasonal campaign"
      className={`max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-2 space-y-4 ${
        alignment === 'center'
          ? 'text-center'
          : alignment === 'right'
            ? 'text-right'
            : 'text-left'
      }`}
    >
      {/* Collect Vouchers & Save More Card */}
      {showVouchers ? (
        <div className="bg-white border border-[#E4E4E0] rounded-xl p-4 sm:p-5 shadow-xs">
          {isHomeEditMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#EFEFED]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A56]">
                Vouchers Card
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {onEditVouchers && (
                  <button
                    type="button"
                    onClick={onEditVouchers}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Vouchers &amp; Coupons</span>
                  </button>
                )}
                {onToggleVouchers && (
                  <button
                    type="button"
                    onClick={onToggleVouchers}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] bg-white border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Vouchers</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#F85606] shrink-0" strokeWidth={2} />
              <h2 className="font-sans text-sm sm:text-base font-bold text-[#141413] tracking-tight">
                {vouchersHeading}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsMoreVouchersOpen(true)}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-[#5A5A56] hover:text-[#F85606] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{vouchersMoreLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
            {/* Voucher 1: Discount Percent */}
            <div className="sm:col-span-4 rounded-lg border border-[#FFE1D6] bg-gradient-to-br from-[#FFF7F3] to-[#FFFDFB] px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-extrabold text-[#F85606] tabular-nums leading-tight">
                  {discountPercent > 0 ? `${discountPercent}% OFF` : 'VIP Deal'}
                </p>
                <p className="text-[11px] font-medium text-[#5A5A56] truncate mt-0.5">
                  {voucherLeftSubtitle} · Code{' '}
                  <span className="font-mono font-semibold text-[#141413]">
                    {primaryPromoCode}
                  </span>
                </p>
              </div>
              <Gift className="w-5 h-5 text-[#F85606]/70 shrink-0" strokeWidth={1.75} />
            </div>

            {/* Voucher 2: Free Shipping */}
            <div className="sm:col-span-4 rounded-lg border border-[#D4F0EC] bg-gradient-to-br from-[#F2FBF9] to-[#FAFEFD] px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-extrabold text-[#008C7A] tabular-nums leading-tight">
                  {standardFee > 0 ? formatPKR(standardFee) : 'Free Delivery'}
                </p>
                <p className="text-[11px] font-medium text-[#5A5A56] truncate mt-0.5">
                  {voucherRightSubtitle}
                </p>
              </div>
              <Truck className="w-5 h-5 text-[#008C7A]/75 shrink-0" strokeWidth={1.75} />
            </div>

            {/* Voucher 3: Collect All CTA */}
            <div className="sm:col-span-4 flex items-center">
              <button
                type="button"
                onClick={() => {
                  onCollectVoucher(primaryPromoCode);
                  if (isCollected) {
                    onOpenCart();
                  }
                }}
                className={`w-full h-full min-h-[46px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  isCollected
                    ? 'bg-[#0F766E] hover:bg-[#0D655E]'
                    : 'bg-gradient-to-r from-[#FF7B29] to-[#F85606] hover:opacity-95'
                }`}
              >
                {isCollected ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                    <span>{vouchersCollectedLabel}</span>
                  </>
                ) : (
                  <span>{vouchersCtaLabel}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        isHomeEditMode &&
        onToggleVouchers && (
          <div className="px-4 py-2.5 bg-white border border-dashed border-[#D4D4CE] rounded-xl flex items-center justify-between gap-3 text-xs">
            <span className="text-[#5A5A56] font-medium">
              Vouchers Card is currently hidden
            </span>
            <button
              type="button"
              onClick={onToggleVouchers}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-[#141413] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Vouchers</span>
            </button>
          </div>
        )
      )}

      {/* Seasonal Podium Campaign Spotlight Banner */}
      {showBanner ? (
        <div
          className="relative overflow-hidden rounded-2xl border border-[#C89B3C]/50 text-white shadow-sm"
          style={{
            background: `linear-gradient(90deg, #24071B 0%, ${bannerBg} 50%, #24071B 100%)`,
          }}
        >
          {/* Radial Spotlight Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(246,196,92,0.28),transparent_65%)]"
          />

          <div className="relative z-10 px-4 sm:px-6 pt-4 pb-3">
            <div className="grid grid-cols-12 items-center gap-3">
              {/* Left Podium Photo */}
              <div className="col-span-3 sm:col-span-3 flex justify-center">
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-full p-0.5 bg-gradient-to-b from-[#F9E3A0] to-[#B07C22] shadow-lg overflow-hidden">
                    <img
                      src={leftImg}
                      alt="Campaign showcase left"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="w-20 sm:w-28 h-2.5 -mt-1 rounded-full bg-gradient-to-r from-[#8E5F15] via-[#F7DC91] to-[#8E5F15] opacity-90 shadow-md" />
                </div>
              </div>

              {/* Center Campaign Title */}
              <div className="col-span-6 sm:col-span-6 text-center space-y-1">
                <p className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#FCE39D]">
                  <Crown className="w-3 h-3 text-[#FCE39D]" />
                  <span className="truncate max-w-[200px] sm:max-w-none">
                    {campaignEyebrow}
                  </span>
                </p>
                <h3 className="font-sans text-lg sm:text-2xl md:text-3xl font-extrabold uppercase tracking-tight leading-none bg-gradient-to-b from-[#FFF4CC] via-[#F6CE72] to-[#C88E25] bg-clip-text text-transparent drop-shadow-xs">
                  {campaignHeading}
                </h3>
                <p className="text-[10px] sm:text-xs text-white/85 truncate">
                  {campaignSubtitle}
                </p>
              </div>

              {/* Right Podium Photo */}
              <div className="col-span-3 sm:col-span-3 flex justify-center">
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-full p-0.5 bg-gradient-to-b from-[#F9E3A0] to-[#B07C22] shadow-lg overflow-hidden">
                    <img
                      src={rightImg}
                      alt="Campaign showcase right"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="w-20 sm:w-28 h-2.5 -mt-1 rounded-full bg-gradient-to-r from-[#8E5F15] via-[#F7DC91] to-[#8E5F15] opacity-90 shadow-md" />
                </div>
              </div>
            </div>

            {/* Bottom Gold Ribbon Strip */}
            <div className="mt-3 pt-2 border-t border-[#F7DC91]/25 flex flex-wrap items-center justify-center sm:justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FCE39D] tabular-nums">
                {campaignBannerSub}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {isHomeEditMode && onEditCampaignBanner && (
                  <button
                    type="button"
                    onClick={onEditCampaignBanner}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white text-[#141413] rounded-full hover:opacity-90 cursor-pointer whitespace-nowrap"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Banner Text &amp; Photos</span>
                  </button>
                )}
                {isHomeEditMode && onToggleCampaignBanner && (
                  <button
                    type="button"
                    onClick={onToggleCampaignBanner}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white/15 text-white border border-white/25 rounded-full hover:bg-white/25 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Banner</span>
                  </button>
                )}
                {isAdmin && onCustomizeHighlightSlider && !isHomeEditMode && (
                  <button
                    type="button"
                    onClick={onCustomizeHighlightSlider}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white/15 text-white border border-white/25 rounded-full hover:bg-white/25 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Customize Banner</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateLink && campaignCtaUrl) {
                      onNavigateLink(campaignCtaUrl);
                    } else {
                      onShopDeals();
                    }
                  }}
                  className="px-3.5 py-1 text-[11px] sm:text-xs font-bold bg-gradient-to-r from-[#FCE39D] to-[#E2AC44] text-[#29081E] rounded-full shadow-xs hover:brightness-105 transition-all cursor-pointer whitespace-nowrap"
                >
                  {campaignCtaLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        isHomeEditMode &&
        onToggleCampaignBanner && (
          <div className="px-4 py-2.5 bg-white border border-dashed border-[#D4D4CE] rounded-xl flex items-center justify-between gap-3 text-xs">
            <span className="text-[#5A5A56] font-medium">
              Seasonal Campaign Banner is currently hidden
            </span>
            <button
              type="button"
              onClick={onToggleCampaignBanner}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-[#141413] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Banner</span>
            </button>
          </div>
        )
      )}

      {/* More Vouchers Modal */}
      {isMoreVouchersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Available Store Vouchers & Coupons"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setIsMoreVouchersOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-[#E4E4E0] rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E4E4E0] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F85606]" />
                <h3 className="font-sans text-sm font-bold text-[#141413]">
                  {storeName} Vouchers &amp; Shipping Perks
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreVouchersOpen(false)}
                aria-label="Close vouchers modal"
                className="p-1 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Primary Store Promo Code */}
              <div className="p-3.5 rounded-lg border border-[#FFE1D6] bg-[#FFF8F5] flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#F85606]">
                    {discountPercent}% OFF Storewide
                  </p>
                  <p className="text-xs text-[#5A5A56] mt-0.5">
                    Code: <span className="font-mono font-semibold text-[#141413]">{primaryPromoCode}</span> · Applies automatically in Bag
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onCollectVoucher(primaryPromoCode);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap cursor-pointer ${
                    collectedPromoCode?.toUpperCase() === primaryPromoCode
                      ? 'bg-[#0F766E] text-white'
                      : 'bg-[#F85606] text-white hover:opacity-90'
                  }`}
                >
                  {collectedPromoCode?.toUpperCase() === primaryPromoCode ? 'Collected ✓' : 'Collect'}
                </button>
              </div>

              {/* Additional Admin Coupons if configured */}
              {activeCoupons.map((coupon) => {
                const codeUpper = coupon.code.trim().toUpperCase();
                const picked = collectedPromoCode?.toUpperCase() === codeUpper;
                return (
                  <div
                    key={coupon.id}
                    className="p-3.5 rounded-lg border border-[#E4E4E0] bg-white flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#141413]">
                        {coupon.discountPercent}% OFF
                      </p>
                      <p className="text-xs text-[#5A5A56] mt-0.5">
                        Code: <span className="font-mono font-semibold text-[#141413]">{codeUpper}</span>
                        {coupon.minOrderAmount ? ` · Min ${formatPKR(coupon.minOrderAmount)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCollectVoucher(codeUpper)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-md whitespace-nowrap cursor-pointer ${
                        picked
                          ? 'bg-[#0F766E] text-white'
                          : 'bg-[#141413] text-white hover:opacity-90'
                      }`}
                    >
                      {picked ? 'Collected ✓' : 'Collect'}
                    </button>
                  </div>
                );
              })}

              {/* Free Shipping Perk */}
              <div className="p-3.5 rounded-lg border border-[#D4F0EC] bg-[#F2FBF9]">
                <p className="text-sm font-bold text-[#008C7A]">
                  Complimentary Nationwide Delivery
                </p>
                <p className="text-xs text-[#5A5A56] mt-0.5">
                  Automatically free on orders of {formatPKR(freeThreshold)} or above (saves {formatPKR(standardFee)}).
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#FAFAFA] border-t border-[#E4E4E0] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsMoreVouchersOpen(false);
                  onShopDeals();
                }}
                className="text-xs font-semibold text-[#5A5A56] hover:text-[#141413] cursor-pointer"
              >
                Browse Products
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreVouchersOpen(false);
                  onOpenCart();
                }}
                className="px-4 py-2 text-xs font-bold bg-[#F85606] text-white rounded-md hover:opacity-95 cursor-pointer"
              >
                Open Bag &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
