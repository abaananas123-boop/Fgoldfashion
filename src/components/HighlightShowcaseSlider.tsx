import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  Pencil,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { HeroHighlightSliderConfig, HighlightSliderItem, Product } from '../types';
import { formatPKR } from '../utils/currency';
import { isExternalSiteLink, isInAppSocialBrowser, normalizeSiteLinkUrl } from '../utils/social';
import { pickBestImageUrl } from '../utils/threeDepartmentModels';
import { ResilientImage } from './ResilientImage';

interface HighlightShowcaseSliderProps {
  config?: HeroHighlightSliderConfig;
  products: Product[];
  isAdmin?: boolean;
  isHomeEditMode?: boolean;
  onInspectProduct?: (product: Product) => void;
  onNavigateLink?: (url: string) => void;
  onCustomize?: () => void;
}

export const DEFAULT_HIGHLIGHT_SLIDER_CONFIG: HeroHighlightSliderConfig = {
  enabled: true,
  eyebrow: 'Featured Highlights',
  heading: 'Spotlight Pictures & Selected Products',
  description: '',
  layout: 'carousel',
  aspectShape: 'portrait',
  boxTheme: 'ivory',
  autoPlay: true,
  intervalSeconds: 5,
  showCaptions: true,
  showArrows: true,
  items: [],
};

interface ResolvedSlide {
  item: HighlightSliderItem;
  product?: Product;
  mediaUrl: string;
  mediaKind: 'auto' | 'video';
  title: string;
  subtitle: string;
  priceText: string;
  ctaLabel: string;
  ctaUrl: string;
}

export function HighlightShowcaseSlider({
  config,
  products,
  isAdmin = false,
  isHomeEditMode = false,
  onInspectProduct,
  onNavigateLink,
  onCustomize,
}: HighlightShowcaseSliderProps) {
  const cfg: HeroHighlightSliderConfig = config ?? DEFAULT_HIGHLIGHT_SLIDER_CONFIG;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const prod of products) {
      map.set(prod.id, prod);
    }
    return map;
  }, [products]);

  const slides: ResolvedSlide[] = useMemo(() => {
    const resolved: ResolvedSlide[] = [];
    for (const item of cfg.items ?? []) {
      const linkedProduct =
        item.kind === 'product' && item.productId
          ? productMap.get(item.productId)
          : undefined;
      const resolvedMedia =
        (linkedProduct ? pickBestImageUrl(linkedProduct) : '') || item.imageUrl;
      if (!resolvedMedia) continue;

      const title = item.title?.trim() || linkedProduct?.name || '';
      const subtitle =
        item.subtitle?.trim() ||
        (linkedProduct
          ? linkedProduct.subcategory && linkedProduct.subcategory !== 'All'
            ? `${linkedProduct.category} · ${linkedProduct.subcategory}`
            : linkedProduct.category
          : '');
      const priceText =
        item.priceText?.trim() ||
        (linkedProduct ? formatPKR(linkedProduct.price) : '');

      resolved.push({
        item,
        product: linkedProduct,
        mediaUrl: resolvedMedia,
        mediaKind: item.mediaKind === 'video' ? 'video' : 'auto',
        title,
        subtitle,
        priceText,
        ctaLabel:
          item.ctaLabel?.trim() ||
          (item.kind === 'product' ? 'View Product' : ''),
        ctaUrl: item.ctaUrl?.trim() || '',
      });
    }
    return resolved;
  }, [cfg.items, productMap]);

  const cardsPerView = useMemo(() => {
    if (cfg.layout === 'spotlight') return 1;
    if (viewportWidth < 640) return 1;
    if (viewportWidth < 1024) return 2;
    return cfg.layout === 'compact' ? 4 : 3;
  }, [cfg.layout, viewportWidth]);

  const maxStepIndex = Math.max(0, slides.length - cardsPerView);

  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, maxStepIndex));
  }, [maxStepIndex]);

  useEffect(() => {
    if (!cfg.enabled || !cfg.autoPlay || slides.length <= cardsPerView || isPaused) {
      return;
    }
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ms = Math.min(15000, Math.max(2000, (cfg.intervalSeconds || 5) * 1000));
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev >= maxStepIndex ? 0 : prev + 1));
    }, ms);
    return () => window.clearInterval(timer);
  }, [
    cfg.enabled,
    cfg.autoPlay,
    cfg.intervalSeconds,
    slides.length,
    cardsPerView,
    maxStepIndex,
    isPaused,
  ]);

  const isVisible = cfg.enabled && slides.length > 0;

  // Hide completely from regular visitors when disabled or empty
  if (!isVisible && !isAdmin) {
    return null;
  }

  // Admin setup box when slider has 0 slides or is hidden
  if (!isVisible && isAdmin) {
    return (
      <div className="mt-10 pt-8 border-t border-[#E4E4E0]">
        <div className="p-6 bg-white border border-dashed border-[#D4D4CE] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Highlight Picture &amp; Product Slider {!cfg.enabled ? '· Hidden' : ''}
            </p>
            <h3 className="font-serif text-xl font-medium text-[#141413]">
              {slides.length === 0
                ? 'Customize this highlight box & add any pictures, videos, or products'
                : cfg.heading || 'Highlight Slider is currently hidden'}
            </h3>
            <p className="text-xs text-[#5A5A56] max-w-xl">
              {slides.length === 0
                ? 'Displays directly below Highlight Boxes. Upload your own photos/videos, pick store products, adjust colors, card sizes, and auto-play speed.'
                : 'Enable the Highlight Slider in customizer to display your slides on the storefront.'}
            </p>
          </div>
          {onCustomize && (
            <button
              type="button"
              onClick={onCustomize}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Customize Box &amp; Add Slides</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const aspectClass =
    cfg.aspectShape === 'square'
      ? 'aspect-square'
      : cfg.aspectShape === 'landscape'
        ? 'aspect-[4/3]'
        : cfg.aspectShape === 'wide'
          ? 'aspect-[16/9]'
          : 'aspect-[3/4]';

  const isDarkTheme = cfg.boxTheme === 'obsidian' && !cfg.customBgColor;
  const themeContainerClasses =
    cfg.boxTheme === 'obsidian'
      ? 'bg-[#141413] text-[#F5F4F0] border-[#2F2F2B]'
      : cfg.boxTheme === 'warm'
        ? 'bg-[#F7F4EC] text-[#141413] border-[#E4DEC9]'
        : cfg.boxTheme === 'gold'
          ? 'bg-white text-[#141413] border-[#C8A860]/70'
          : 'bg-white text-[#141413] border-[#E4E4E0]';

  const containerStyle = {
    ...(cfg.customBgColor ? { backgroundColor: cfg.customBgColor } : {}),
    ...(cfg.customTextColor ? { color: cfg.customTextColor } : {}),
    ...(cfg.customBorderColor ? { borderColor: cfg.customBorderColor } : {}),
  };

  const handleSlideAction = (slide: ResolvedSlide) => {
    if (slide.product && onInspectProduct) {
      onInspectProduct(slide.product);
      return;
    }
    if (slide.ctaUrl) {
      const normalized = normalizeSiteLinkUrl(slide.ctaUrl);
      if (isExternalSiteLink(normalized)) {
        if (isInAppSocialBrowser()) {
          window.location.href = normalized;
        } else {
          window.open(normalized, '_blank', 'noopener,noreferrer');
        }
      } else {
        onNavigateLink?.(normalized);
      }
    }
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev <= 0 ? maxStepIndex : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev >= maxStepIndex ? 0 : prev + 1));
  };

  const canNavigate = slides.length > cardsPerView;
  const pageCount = maxStepIndex + 1;

  return (
    <div
      className="mt-10 pt-8 border-t border-[#E4E4E0]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div
        style={containerStyle}
        className={`rounded-xl border p-5 sm:p-6 transition-colors ${themeContainerClasses}`}
      >
        {/* Header Row */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div className="min-w-0">
            {cfg.eyebrow && (
              <p
                className={`text-xs font-medium uppercase tracking-widest mb-1 ${
                  isDarkTheme ? 'text-[#E5C887]' : 'text-[var(--accent)]'
                }`}
              >
                {cfg.eyebrow}
              </p>
            )}
            <div className="flex flex-wrap items-baseline gap-3">
              {cfg.heading && (
                <h2 className="font-serif text-2xl sm:text-[28px] leading-tight font-medium text-balance">
                  {cfg.heading}
                </h2>
              )}
              {slides.length > 1 && (
                <span
                  className={`text-xs tabular-nums ${
                    isDarkTheme ? 'text-[#B8B5AD]' : 'text-[#5A5A56]'
                  }`}
                >
                  {String(activeIndex + 1).padStart(2, '0')} /{' '}
                  {String(pageCount).padStart(2, '0')}
                </span>
              )}
            </div>
            {cfg.description && (
              <p
                className={`text-xs sm:text-sm mt-1 max-w-2xl ${
                  isDarkTheme ? 'text-[#B8B5AD]' : 'text-[#5A5A56]'
                }`}
              >
                {cfg.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && onCustomize && (
              <button
                type="button"
                onClick={onCustomize}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDarkTheme
                    ? 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                    : isHomeEditMode
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[#FAFAFA] text-[#141413] border-[#D4D4CE] hover:border-[#141413]'
                }`}
              >
                {isHomeEditMode ? (
                  <Pencil className="w-3.5 h-3.5" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                )}
                <span>Customize Slider Box</span>
              </button>
            )}

            {cfg.showArrows && canNavigate && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous highlight slides"
                  className={`w-10 h-10 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                    isDarkTheme
                      ? 'border-white/20 text-white hover:bg-white/10'
                      : 'border-[#D4D4CE] bg-white text-[#141413] hover:border-[#141413]'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next highlight slides"
                  className={`w-10 h-10 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                    isDarkTheme
                      ? 'border-white/20 text-white hover:bg-white/10'
                      : 'border-[#D4D4CE] bg-white text-[#141413] hover:border-[#141413]'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Viewport Track */}
        {cfg.layout === 'spotlight' ? (
          (() => {
            const current = slides[Math.min(activeIndex, slides.length - 1)];
            if (!current) return null;
            const isProduct = current.item.kind === 'product';
            const isExternal = Boolean(
              current.ctaUrl && isExternalSiteLink(normalizeSiteLinkUrl(current.ctaUrl))
            );
            const hasClickTarget = Boolean(current.product || current.ctaUrl);

            return (
              <div
                onTouchStart={(e) => {
                  touchStartXRef.current = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  if (touchStartXRef.current === null) return;
                  const delta =
                    (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
                  touchStartXRef.current = null;
                  if (Math.abs(delta) > 40 && canNavigate) {
                    if (delta < 0) handleNext();
                    else handlePrev();
                  }
                }}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch rounded-lg overflow-hidden border ${
                  isDarkTheme
                    ? 'border-white/10 bg-[#1B1B19]'
                    : 'border-[#E4E4E0] bg-[#FAFAFA]'
                }`}
              >
                <div
                  className={`lg:col-span-7 relative overflow-hidden bg-[#F2F2F0] ${
                    cfg.aspectShape === 'portrait'
                      ? 'aspect-[4/3] lg:aspect-[16/10]'
                      : aspectClass
                  }`}
                >
                  <ResilientImage
                    src={current.mediaUrl}
                    alt={current.title || 'Highlight slide'}
                    mode="default"
                    expectedKind={current.mediaKind}
                    autoPlayVideo={current.mediaKind === 'video'}
                    showVideoControls
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="lg:col-span-5 p-6 flex flex-col justify-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#5A5A56] uppercase tracking-wider">
                    <span className={isDarkTheme ? 'text-[#E5C887]' : 'text-[var(--accent)]'}>
                      {isProduct ? 'Featured Product' : 'Spotlight'}
                    </span>
                    {current.subtitle && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className={isDarkTheme ? 'text-[#B8B5AD]' : 'text-[#5A5A56]'}>
                          {current.subtitle}
                        </span>
                      </>
                    )}
                  </div>

                  {current.title && (
                    <h3 className="font-serif text-2xl sm:text-3xl font-medium leading-snug text-balance">
                      {current.title}
                    </h3>
                  )}

                  {current.priceText && (
                    <p className="text-base font-semibold tabular-nums">
                      {current.priceText}
                    </p>
                  )}

                  {hasClickTarget && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleSlideAction(current)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          isDarkTheme
                            ? 'bg-[#F5F4F0] text-[#141413] hover:bg-white'
                            : 'bg-[#141413] text-white hover:bg-[#2B2B29]'
                        }`}
                      >
                        {isProduct ? (
                          <ShoppingBag className="w-3.5 h-3.5" />
                        ) : isExternal ? (
                          <ExternalLink className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {current.ctaLabel || (isProduct ? 'Inspect Product' : 'Explore')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div
            className="overflow-hidden"
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartXRef.current === null) return;
              const delta =
                (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
              touchStartXRef.current = null;
              if (Math.abs(delta) > 40 && canNavigate) {
                if (delta < 0) handleNext();
                else handlePrev();
              }
            }}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                transform: `translate3d(-${(activeIndex * 100) / cardsPerView}%, 0, 0)`,
              }}
            >
              {slides.map((slide) => {
                const isProduct = slide.item.kind === 'product';
                const hasAction = Boolean(slide.product || slide.ctaUrl);
                const isExternal = Boolean(
                  slide.ctaUrl && isExternalSiteLink(normalizeSiteLinkUrl(slide.ctaUrl))
                );

                return (
                  <div
                    key={slide.item.id}
                    style={{ flex: `0 0 ${100 / cardsPerView}%` }}
                    className="px-2 box-border"
                  >
                    <article
                      className={`h-full flex flex-col rounded-lg border overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 ${
                        isDarkTheme
                          ? 'bg-[#1E1E1C] border-white/10'
                          : 'bg-[#FAFAFA] border-[#E4E4E0]'
                      }`}
                    >
                      <div
                        onClick={() => hasAction && handleSlideAction(slide)}
                        className={`relative w-full overflow-hidden bg-[#F2F2F0] ${aspectClass} ${
                          hasAction ? 'cursor-pointer' : ''
                        }`}
                      >
                        <ResilientImage
                          src={slide.mediaUrl}
                          alt={slide.title || 'Highlight media'}
                          mode="default"
                          expectedKind={slide.mediaKind}
                          autoPlayVideo={slide.mediaKind === 'video'}
                          showVideoControls
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {cfg.showCaptions &&
                        (slide.title || slide.subtitle || slide.priceText || hasAction) && (
                          <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                            <div>
                              {slide.subtitle && (
                                <p
                                  className={`text-[11px] uppercase tracking-wider truncate mb-0.5 ${
                                    isDarkTheme ? 'text-[#B8B5AD]' : 'text-[#5A5A56]'
                                  }`}
                                >
                                  {slide.subtitle}
                                </p>
                              )}
                              {slide.title && (
                                <h3 className="font-serif text-base sm:text-lg font-medium leading-snug line-clamp-2">
                                  {slide.title}
                                </h3>
                              )}
                            </div>

                            {(slide.priceText || hasAction) && (
                              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-black/5">
                                {slide.priceText ? (
                                  <span className="text-sm font-semibold tabular-nums">
                                    {slide.priceText}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] opacity-70">
                                    <Images className="w-3 h-3" />
                                    <span>Highlight</span>
                                  </span>
                                )}

                                {hasAction && (
                                  <button
                                    type="button"
                                    onClick={() => handleSlideAction(slide)}
                                    className={`inline-flex items-center gap-1 text-xs font-medium hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer ${
                                      isDarkTheme
                                        ? 'text-[#E5C887]'
                                        : 'text-[var(--accent)]'
                                    }`}
                                  >
                                    <span>
                                      {slide.ctaLabel ||
                                        (isProduct ? 'View Product' : 'Open')}
                                    </span>
                                    {isExternal ? (
                                      <ExternalLink className="w-3 h-3" />
                                    ) : (
                                      <ArrowRight className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dots Indicator */}
        {canNavigate && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {Array.from({ length: pageCount }, (_, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Show slide group ${idx + 1}`}
                  aria-pressed={isCurrent}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    isCurrent
                      ? isDarkTheme
                        ? 'w-6 bg-[#F5F4F0]'
                        : 'w-6 bg-[#141413]'
                      : isDarkTheme
                        ? 'w-2 bg-white/30 hover:bg-white/50'
                        : 'w-2 bg-[#D4D4CE] hover:bg-[#8A8A84]'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
