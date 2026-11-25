import { useEffect, useState } from 'react';
import { Check, Film, Flame, Heart, Minus, Plus, X } from 'lucide-react';
import { Product, SiteConfig, getCategoryFieldLabels } from '../types';
import { formatPKR } from '../utils/currency';
import { detectMediaKind } from '../utils/imageUpload';
import { buildWhatsAppUrl } from '../utils/social';
import { ResilientImage } from './ResilientImage';
import { WhatsAppIcon } from './SocialIcons';

interface ProductDetailModalProps {
  product: Product | null;
  selectedVariantId: string;
  socialLinks: SiteConfig['socialLinks'];
  onSelectVariant: (productId: string, variantId: string) => void;
  onAddToCart: (productId: string, variantId: string, quantity: number) => void;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
}

type DetailTab = 'actives' | 'ritual' | 'inci';

export function ProductDetailModal({
  product,
  selectedVariantId,
  socialLinks,
  onSelectVariant,
  onAddToCart,
  onClose,
  isWishlisted,
  onToggleWishlist,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>('actives');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setActiveTab('actives');
    setActiveMediaIndex(0);
    setJustAdded(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const dedicatedVideo = product.videoUrl?.trim() || '';
  const galleryItems = Array.from(
    new Set(
      [
        product.imageUrl,
        ...(product.mediaGallery ?? []),
        ...(dedicatedVideo ? [dedicatedVideo] : []),
      ]
        .map((u) => String(u || '').trim())
        .filter(Boolean)
    )
  );
  const safeIndex = activeMediaIndex < galleryItems.length ? activeMediaIndex : 0;
  const showcaseSrc = galleryItems[safeIndex] || product.imageUrl;
  const isDedicatedVideo = Boolean(dedicatedVideo) && showcaseSrc === dedicatedVideo;

  const stockQty =
    typeof product.stockQuantity === 'number' &&
    Number.isFinite(product.stockQuantity)
      ? Math.max(0, Math.round(product.stockQuantity))
      : null;
  const isOutOfStock = stockQty === 0;
  const isLowStock = stockQty !== null && stockQty > 0 && stockQty <= 5;
  const maxSelectableQty = stockQty !== null && stockQty > 0 ? Math.min(10, stockQty) : 10;

  const fieldLabels = getCategoryFieldLabels(product.category);
  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const unitPrice = product.price + (activeVariant?.priceDelta ?? 0);
  const productWhatsappUrl =
    socialLinks.showOnProductPage && socialLinks.whatsappNumber
      ? buildWhatsAppUrl(
          socialLinks.whatsappNumber,
          `${socialLinks.whatsappMessage ? `${socialLinks.whatsappMessage} ` : ''}Product: ${product.name} (${activeVariant.name}) — ${formatPKR(unitPrice * quantity)} (Qty ${quantity})`
        )
      : '';

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product.id, activeVariant.id, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/95 border border-[#E4E4E0] flex items-center justify-center text-[#141413] hover:bg-[#F2F2F0] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
          {/* Sticky Gallery Left */}
          <div className="md:col-span-6 bg-[#F2F2F0] flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E4E4E0]">
            <div className="aspect-[4/3] md:aspect-auto md:flex-1 md:min-h-[380px] min-h-[260px] overflow-hidden bg-black/5">
              <ResilientImage
                src={showcaseSrc}
                alt={product.name}
                fallbackLabel={product.name}
                autoPlayVideo={true}
                posterUrl={product.imageUrl}
                fallbackImageUrl={galleryItems.find((u) => detectMediaKind(u) === 'image')}
                expectedKind={isDedicatedVideo ? 'video' : 'auto'}
                className="w-full h-full object-cover"
              />
            </div>

            {galleryItems.length > 1 && (
              <div className="p-3 bg-white border-t border-[#E4E4E0] flex items-center gap-2 overflow-x-auto">
                {galleryItems.map((mediaUrl, idx) => {
                  const isVid =
                    (Boolean(dedicatedVideo) && mediaUrl === dedicatedVideo) ||
                    detectMediaKind(mediaUrl) !== 'image';
                  const isSelected = idx === safeIndex;
                  return (
                    <button
                      key={`${mediaUrl}-${idx}`}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      aria-label={`View ${isVid ? 'video' : 'photo'} ${idx + 1}`}
                      aria-pressed={isSelected}
                      className={`relative w-16 h-12 rounded overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#141413] ring-1 ring-[#141413]'
                          : 'border-[#E4E4E0] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage
                        src={mediaUrl}
                        alt={`${product.name} media ${idx + 1}`}
                        mode="thumb"
                        posterUrl={product.imageUrl}
                        fallbackImageUrl={galleryItems.find((u) => detectMediaKind(u) === 'image')}
                        expectedKind={mediaUrl === dedicatedVideo ? 'video' : 'auto'}
                        className="w-full h-full object-cover"
                      />
                      {isVid && (
                        <span className="absolute inset-x-0 bottom-0 py-0.5 bg-black/75 text-white text-[9px] font-medium flex items-center justify-center gap-0.5 pointer-events-none">
                          <Film className="w-2.5 h-2.5" />
                          <span>Video</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contiguous Purchase Module Right */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col">
            <div className="text-xs uppercase tracking-wider text-[#5A5A56] mb-2">
              {product.category}
              {product.subcategory ? (
                <>
                  {' '}
                  <span aria-hidden="true">·</span> {product.subcategory}
                </>
              ) : null}{' '}
              <span aria-hidden="true">·</span> {product.volume}
              {product.statusNote ? (
                <>
                  {' '}
                  <span aria-hidden="true">·</span>{' '}
                  <span className="text-[var(--accent)] font-medium">{product.statusNote}</span>
                </>
              ) : null}
            </div>

            <div className="flex items-baseline justify-between gap-4 mb-1">
              <h2
                id="pdp-title"
                className="font-serif text-3xl font-medium text-[#141413] leading-tight"
              >
                {product.name}
              </h2>
              <span className="text-xl font-semibold text-[#141413] tabular-nums shrink-0">
                {formatPKR(unitPrice)}
              </span>
            </div>

            <p className="text-sm text-[#5A5A56] mb-3">{product.subtitle}</p>
            {isLowStock && (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] mb-3 tabular-nums">
                <Flame className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span>Only {stockQty} left — Grab fast before it sells out!</span>
              </p>
            )}
            {isOutOfStock && (
              <p className="text-xs font-semibold text-[#8A8A84] mb-3">
                Currently Sold Out
              </p>
            )}
            <p className="text-sm text-[#141413]/85 leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Variant Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-medium text-[#141413]">
                  Selection: {activeVariant.name}
                </span>
                <span className="text-[#5A5A56]">{activeVariant.detail}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isSelected = variant.id === activeVariant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => onSelectVariant(product.id, variant.id)}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                        isSelected
                          ? 'border-[#141413] bg-[#141413] text-white'
                          : 'border-[#D4D4CE] bg-white text-[#141413] hover:border-[#141413]'
                      }`}
                    >
                      {variant.hex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: variant.hex }}
                        />
                      )}
                      <span>{variant.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contiguous Quantity + Primary Buy CTA */}
            <div className="flex items-center gap-3 pb-6 border-b border-[#E4E4E0]">
              <div className="inline-flex items-center border border-[#D4D4CE] rounded-md bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={isOutOfStock}
                  aria-label="Decrease quantity"
                  className="w-10 h-11 flex items-center justify-center text-[#5A5A56] hover:text-[#141413] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxSelectableQty, q + 1))}
                  disabled={isOutOfStock}
                  aria-label="Increase quantity"
                  className="w-10 h-11 flex items-center justify-center text-[#5A5A56] hover:text-[#141413] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`flex-1 h-11 px-5 inline-flex items-center justify-center gap-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
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
                    <Check className="w-4 h-4" />
                    <span>Added to Bag</span>
                  </>
                ) : (
                  <span className="tabular-nums">
                    Add to Bag — {formatPKR(unitPrice * quantity)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-label={isWishlisted ? 'Remove from saved' : 'Save product'}
                aria-pressed={isWishlisted}
                className="w-11 h-11 rounded-md border border-[#D4D4CE] bg-white flex items-center justify-center hover:border-[#141413] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[#5A5A56]'
                  }`}
                  strokeWidth={1.75}
                />
              </button>
            </div>

            {productWhatsappUrl && (
              <div className="pt-3">
                <a
                  href={productWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent)] hover:underline underline-offset-4"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Order or ask about this product on WhatsApp</span>
                </a>
              </div>
            )}

            {/* Structured Product Details */}
            <div className="pt-5">
              <div className="flex items-center gap-6 border-b border-[#E4E4E0] mb-4">
                {(
                  [
                    {
                      id: 'actives',
                      label: fieldLabels.tab1,
                    },
                    {
                      id: 'ritual',
                      label: fieldLabels.tab2,
                    },
                    {
                      id: 'inci',
                      label: fieldLabels.tab3,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none ${
                      activeTab === tab.id
                        ? 'border-[#141413] text-[#141413]'
                        : 'border-transparent text-[#5A5A56] hover:text-[#141413]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'actives' && (
                <div className="space-y-3">
                  {product.keyActives.map((active) => (
                    <div
                      key={active.name}
                      className="flex items-start justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#141413]">{active.name}</p>
                        <p className="text-[#5A5A56] mt-0.5 leading-relaxed">
                          {active.benefit}
                        </p>
                      </div>
                      <span className="font-medium text-[var(--accent)] tabular-nums shrink-0">
                        {active.concentration}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'ritual' && (
                <div className="space-y-3 text-xs leading-relaxed">
                  <div>
                    <p className="font-semibold text-[#141413]">
                      {fieldLabels.usageHeading}
                    </p>
                    <p className="text-[#5A5A56] mt-0.5">{product.howToUse}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#F0F0EC]">
                    <div>
                      <p className="text-[#5A5A56]">
                        {fieldLabels.audienceHeading}
                      </p>
                      <p className="font-medium text-[#141413] mt-0.5">{product.skinTypes}</p>
                    </div>
                    <div>
                      <p className="text-[#5A5A56]">
                        {fieldLabels.finishHeading}
                      </p>
                      <p className="font-medium text-[#141413] mt-0.5">{product.finish}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inci' && (
                <p className="text-xs text-[#5A5A56] leading-relaxed">
                  {product.fullIngredients}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
