import { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Flame,
  Heart,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Product } from '../types';
import { formatPKR } from '../utils/currency';
import { detectMediaKind } from '../utils/imageUpload';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
  selectedVariantId: string;
  inBagQuantity: number;
  onSelectVariant: (productId: string, variantId: string) => void;
  onAddToCart: (productId: string, variantId: string) => void;
  onOpenDetail: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  isHomeEditMode?: boolean;
  onQuickEditProduct?: (product: Product) => void;
  onQuickDeleteProduct?: (productId: string) => void;
}

export function ProductCard({
  product,
  selectedVariantId,
  inBagQuantity,
  onSelectVariant,
  onAddToCart,
  onOpenDetail,
  isWishlisted,
  onToggleWishlist,
  isHomeEditMode = false,
  onQuickEditProduct,
  onQuickDeleteProduct,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [brokenMediaUrls, setBrokenMediaUrls] = useState<string[]>([]);

  const dedicatedVideo = product.videoUrl?.trim() || '';
  const hasDirectPlayableVideo =
    Boolean(dedicatedVideo) && detectMediaKind(dedicatedVideo, 'video') === 'video';
  const orderedRawMedia = hasDirectPlayableVideo
    ? [dedicatedVideo, product.imageUrl, ...(product.mediaGallery ?? [])]
    : [
        product.imageUrl,
        ...(product.mediaGallery ?? []),
        ...(dedicatedVideo ? [dedicatedVideo] : []),
      ];

  const allMediaItems = Array.from(
    new Set(
      orderedRawMedia
        .map((u) => String(u || '').trim())
        .filter(Boolean)
    )
  );
  const validMediaItems = allMediaItems.filter((u) => !brokenMediaUrls.includes(u));
  const mediaItems = validMediaItems.length > 0 ? validMediaItems : allMediaItems;
  const safeMediaIdx = mediaIdx < mediaItems.length ? mediaIdx : 0;
  const displayMediaSrc = mediaItems[safeMediaIdx] || product.imageUrl;
  const isDedicatedVideoActive =
    Boolean(dedicatedVideo) && displayMediaSrc === dedicatedVideo;
  const isDisplayingVideo =
    isDedicatedVideoActive || detectMediaKind(displayMediaSrc) !== 'image';

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const effectivePrice = product.price + (activeVariant?.priceDelta ?? 0);

  const stockQty =
    typeof product.stockQuantity === 'number' &&
    Number.isFinite(product.stockQuantity)
      ? Math.max(0, Math.round(product.stockQuantity))
      : null;
  const isOutOfStock = stockQty === 0;
  const isLowStock = stockQty !== null && stockQty > 0 && stockQty <= 5;

  const handleQuickAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product.id, activeVariant.id);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article className="group flex flex-col bg-white border border-[#E4E4E0] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      {/* 4:3 Studio Product Photography & Muted Autoplay Video */}
      <div className="relative aspect-[4/3] bg-[#F2F2F0] overflow-hidden">
        {isDisplayingVideo ? (
          <div className="block w-full h-full">
            <ResilientImage
              src={displayMediaSrc}
              alt={`${product.name} — ${product.subtitle}`}
              fallbackLabel={product.name}
              mode="card"
              autoPlayVideo={true}
              posterUrl={product.imageUrl}
              fallbackImageUrl={validMediaItems.find((u) => detectMediaKind(u) === 'image')}
              expectedKind={isDedicatedVideoActive ? 'video' : 'auto'}
              onMediaError={() => {
                if (validMediaItems.length > 1) {
                  setBrokenMediaUrls((prev) =>
                    prev.includes(displayMediaSrc) ? prev : [...prev, displayMediaSrc]
                  );
                }
              }}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            aria-label={`View details for ${product.name}`}
            className="block w-full h-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
          >
            <ResilientImage
              src={displayMediaSrc}
              alt={`${product.name} — ${product.subtitle}`}
              fallbackLabel={product.name}
              onMediaError={() => {
                if (validMediaItems.length > 1) {
                  setBrokenMediaUrls((prev) =>
                    prev.includes(displayMediaSrc) ? prev : [...prev, displayMediaSrc]
                  );
                }
              }}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </button>
        )}

        {/* Direct Home Edit Controls for Manager */}
        {isHomeEditMode && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            {onQuickEditProduct && (
              <button
                type="button"
                onClick={() => onQuickEditProduct(product)}
                aria-label={`Edit ${product.name}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-white/95 text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
            {onQuickDeleteProduct && (
              <button
                type="button"
                onClick={() => onQuickDeleteProduct(product.id)}
                aria-label={`Delete ${product.name}`}
                className="p-1.5 bg-white/95 text-[#5A5A56] hover:text-[var(--accent)] border border-[#D4D4CE] rounded-md cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Wishlist affordance */}
        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={isWishlisted ? `Remove ${product.name} from saved` : `Save ${product.name}`}
          aria-pressed={isWishlisted}
          className={`absolute z-10 w-9 h-9 rounded-full bg-white/90 border border-[#E4E4E0] flex items-center justify-center text-[#141413] hover:bg-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            isDisplayingVideo ? 'top-3 left-3' : 'top-3 right-3'
          } ${isDisplayingVideo && isHomeEditMode ? 'top-14 left-3' : ''}`}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[#5A5A56]'
            }`}
            strokeWidth={1.75}
          />
        </button>

        {/* Multi-Media & Video Controls when product has multiple photos/videos */}
        {mediaItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setMediaIdx(
                  (safeMediaIdx - 1 + mediaItems.length) % mediaItems.length
                )
              }
              aria-label={`Previous media for ${product.name}`}
              className={`absolute left-2.5 z-10 w-7 h-7 rounded-full bg-white/95 border border-[#D4D4CE] text-[#141413] flex items-center justify-center shadow-xs hover:border-[#141413] cursor-pointer ${
                isDisplayingVideo ? 'top-1/2 -translate-y-1/2' : 'bottom-3'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMediaIdx((safeMediaIdx + 1) % mediaItems.length)}
              aria-label={`Next media for ${product.name}`}
              className={`absolute right-2.5 z-10 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-white/95 text-[#141413] border border-[#D4D4CE] shadow-xs hover:border-[#141413] cursor-pointer tabular-nums ${
                isDisplayingVideo ? 'top-1/2 -translate-y-1/2' : 'bottom-3 right-3'
              }`}
            >
              {dedicatedVideo && !isDedicatedVideoActive ? (
                <>
                  <Film className="w-3 h-3 text-[var(--accent)]" />
                  <span>
                    {safeMediaIdx + 1}/{mediaItems.length}
                  </span>
                </>
              ) : (
                <span>
                  {safeMediaIdx + 1}/{mediaItems.length}
                </span>
              )}
              <ChevronRight className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Card Body with identical field order across all cards */}
      <div className="p-5 flex flex-col flex-1">
        {/* Unboxed quiet metadata line */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#5A5A56] mb-1.5">
          <span className="uppercase tracking-wider truncate">
            {product.category}
            {product.subcategory ? (
              <>
                {' '}
                <span aria-hidden="true">·</span> {product.subcategory}
              </>
            ) : null}{' '}
            <span aria-hidden="true">·</span> {product.volume}
          </span>
          {product.statusNote && (
            <span className="text-[var(--accent)] font-medium whitespace-nowrap shrink-0">
              {product.statusNote}
            </span>
          )}
        </div>

        {/* Product Title & Price baseline */}
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            className="text-left font-serif text-xl font-medium text-[#141413] hover:text-[var(--accent)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm"
          >
            {product.name}
          </button>
          <div className="flex items-baseline gap-1.5 shrink-0">
            {typeof product.compareAtPrice === 'number' &&
              product.compareAtPrice > effectivePrice && (
                <span className="text-[11px] text-[#8A8A84] line-through tabular-nums">
                  {formatPKR(product.compareAtPrice)}
                </span>
              )}
            <span className="text-[15px] font-bold text-[#F85606] tabular-nums">
              {formatPKR(effectivePrice)}
            </span>
          </div>
        </div>

        {/* Low Stock Urgency Prompt (<= 5 remaining) */}
        {isLowStock && (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] mb-2 tabular-nums">
            <Flame className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>
              Only {stockQty} left — Grab fast!
            </span>
          </p>
        )}
        {isOutOfStock && (
          <p className="text-xs font-medium text-[#8A8A84] mb-2">
            Currently Sold Out
          </p>
        )}

        {/* Concise description */}
        <p className="text-sm text-[#5A5A56] leading-relaxed line-clamp-2 mb-4">
          {product.description}
        </p>

        {/* Shade or Size Selector */}
        <div className="mt-auto pt-3 border-t border-[#F0F0EC]">
          <div className="flex items-center justify-between gap-2 mb-3 min-h-[28px]">
            <span className="text-xs text-[#5A5A56] truncate">
              {activeVariant.name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {product.variants.map((variant) => {
                const isSelected = variant.id === activeVariant.id;
                if (variant.hex) {
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => onSelectVariant(product.id, variant.id)}
                      aria-label={`Select shade ${variant.name}`}
                      aria-pressed={isSelected}
                      title={`${variant.name} — ${variant.detail}`}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 ${
                        isSelected
                          ? 'ring-2 ring-[#141413] ring-offset-2 scale-105'
                          : 'border border-black/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: variant.hex }}
                    />
                  );
                }

                const shortLabel = variant.name.includes('(')
                  ? variant.name.split('(')[0].trim()
                  : variant.name.split(' ').slice(0, 2).join(' ');

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelectVariant(product.id, variant.id)}
                    aria-pressed={isSelected}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      isSelected
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] text-[#5A5A56] hover:border-[#141413] hover:text-[#141413]'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Card Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isOutOfStock}
              aria-label={`Quick add ${product.name} (${activeVariant.name}) to bag`}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 ${
                isOutOfStock
                  ? 'bg-[#E4E4E0] text-[#5A5A56] cursor-not-allowed'
                  : justAdded
                    ? 'bg-[var(--accent)] text-white cursor-pointer'
                    : 'bg-[#141413] text-white hover:bg-[#2B2B29] cursor-pointer'
              }`}
            >
              {isOutOfStock ? (
                <span>Sold Out</span>
              ) : justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  <span className="tabular-nums">
                    {inBagQuantity > 0 ? `Quick Add (${inBagQuantity})` : 'Quick Add'}
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onOpenDetail(product)}
              className="py-2.5 px-3.5 text-xs font-medium text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
