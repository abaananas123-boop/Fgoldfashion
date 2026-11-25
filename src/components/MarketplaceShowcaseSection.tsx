import {
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Truck,
  Zap,
} from 'lucide-react';
import { Product, SectionAlign, SiteConfig, SiteVisibilityConfig } from '../types';
import { formatPKR } from '../utils/currency';
import { ResilientImage } from './ResilientImage';

interface MarketplaceShowcaseSectionProps {
  products: Product[];
  freeShippingThreshold: number;
  catalogSection?: SiteConfig['catalogSection'];
  visibility?: SiteVisibilityConfig;
  isAdmin?: boolean;
  isHomeEditMode?: boolean;
  alignment?: SectionAlign;
  onInspectProduct: (product: Product) => void;
  onQuickAddToCart: (productId: string, variantId: string) => void;
  onShopMore: () => void;
  onAddFirstProduct?: () => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onEditFlashSaleConfig?: () => void;
  onToggleFlashSale?: () => void;
  onToggleChoiceStrip?: () => void;
}

export function MarketplaceShowcaseSection({
  products,
  freeShippingThreshold,
  catalogSection,
  visibility,
  isAdmin = false,
  isHomeEditMode = false,
  alignment = 'left',
  onInspectProduct,
  onQuickAddToCart,
  onShopMore,
  onAddFirstProduct,
  onEditProduct,
  onDeleteProduct,
  onEditFlashSaleConfig,
  onToggleFlashSale,
  onToggleChoiceStrip,
}: MarketplaceShowcaseSectionProps) {
  const showFlashSale = visibility?.showFlashSaleSection ?? true;
  const showChoice = visibility?.showChoiceStrip ?? true;

  if (!showFlashSale && !showChoice && !isHomeEditMode) {
    return null;
  }

  const configuredFlashIds = catalogSection?.flashSaleProductIds ?? [];
  const flashSaleProducts =
    configuredFlashIds.length > 0
      ? configuredFlashIds
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is Product => Boolean(p))
          .slice(0, 6)
      : products.slice(0, 6);

  const configuredChoiceIds = catalogSection?.choiceProductIds ?? [];
  const choiceRowProducts =
    configuredChoiceIds.length > 0
      ? configuredChoiceIds
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is Product => Boolean(p))
          .slice(0, 3)
      : products.length > 3
        ? products.slice(3, 6)
        : products.slice(0, 3);

  const flashTitle = catalogSection?.flashSaleTitle?.trim() || 'Flash Sale';
  const flashBadge = catalogSection?.flashSaleBadge?.trim() || 'Top Picks';
  const flashCta = catalogSection?.flashSaleCtaLabel?.trim() || 'Shop More';

  const choiceBadge = catalogSection?.choiceBadge?.trim() || 'CHOICE';
  const choiceHeading = catalogSection?.choiceHeading?.trim() || 'Curated Picks';
  const choiceDelivery =
    catalogSection?.choiceFreeDeliveryText?.trim() ||
    `Free Delivery ${formatPKR(freeShippingThreshold)}+`;
  const choiceCta =
    catalogSection?.choiceCtaLabel?.trim() || 'Shop Now | All Departments';

  return (
    <section
      id="flash-sale"
      aria-label="Flash Sale and Choice curated picks"
      className={`max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2 space-y-5 ${
        alignment === 'center'
          ? 'text-center'
          : alignment === 'right'
            ? 'text-right'
            : 'text-left'
      }`}
    >
      {/* Flash Sale Grid */}
      {!showFlashSale ? (
        isHomeEditMode &&
        onToggleFlashSale && (
          <div className="bg-white border border-dashed border-[#D4D4CE] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-[#5A5A56]">
              Flash Sale Section is hidden from shoppers.
            </span>
            <button
              type="button"
              onClick={onToggleFlashSale}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Flash Sale</span>
            </button>
          </div>
        )
      ) : (
        <div className="bg-white border border-[#E4E4E0] rounded-xl p-4 sm:p-5 shadow-xs">
          {isHomeEditMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#EFEFED]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A56]">
                Flash Sale Row ({flashSaleProducts.length} items)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {onEditFlashSaleConfig && (
                  <button
                    type="button"
                    onClick={onEditFlashSaleConfig}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Flash Sale Text</span>
                  </button>
                )}
                {onAddFirstProduct && (
                  <button
                    type="button"
                    onClick={onAddFirstProduct}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Product</span>
                  </button>
                )}
                {onToggleFlashSale && (
                  <button
                    type="button"
                    onClick={onToggleFlashSale}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] bg-white border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Section</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <h2 className="font-sans text-base sm:text-lg font-extrabold text-[#141413] tracking-tight inline-flex items-center">
                {flashTitle.toLowerCase() === 'flash sale' ? (
                  <>
                    <span>Fla</span>
                    <Zap
                      className="w-4 h-4 text-[#F85606] fill-[#F85606] -mx-0.5 inline"
                      strokeWidth={2}
                    />
                    <span>h Sale</span>
                  </>
                ) : (
                  <>
                    <Zap
                      className="w-4 h-4 text-[#F85606] fill-[#F85606] mr-1 inline"
                      strokeWidth={2}
                    />
                    <span>{flashTitle}</span>
                  </>
                )}
              </h2>
              {flashBadge && (
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FFF0E8] text-[#F85606] rounded">
                  {flashBadge}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onShopMore}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#5A5A56] hover:text-[#F85606] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>{flashCta}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {flashSaleProducts.length === 0 ? (
            <div className="py-7 px-4 rounded-lg bg-[#FAFAFA] border border-dashed border-[#D4D4CE] text-center space-y-2">
              <p className="text-sm font-semibold text-[#141413]">
                {isAdmin
                  ? 'Ready to showcase your first Flash Sale items'
                  : 'Flash Sale arrivals are updating soon'}
              </p>
              <p className="text-xs text-[#5A5A56] max-w-md mx-auto">
                {isAdmin
                  ? 'Products you add in Store Manager automatically populate the Flash Sale row and 3D Showcase.'
                  : 'Browse our Store Departments or explore the 3D Showcase above while new pieces are published.'}
              </p>
              {isAdmin && onAddFirstProduct && (
                <button
                  type="button"
                  onClick={onAddFirstProduct}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#F85606] text-white rounded-md hover:opacity-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product to Catalog</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
              {flashSaleProducts.map((product) => {
                const firstVariant = product.variants[0];
                const effectivePrice = product.price + (firstVariant?.priceDelta ?? 0);
                const hasRealDiscount =
                  typeof product.compareAtPrice === 'number' &&
                  product.compareAtPrice > effectivePrice;
                const discountPct = hasRealDiscount
                  ? Math.round(
                      ((product.compareAtPrice! - effectivePrice) /
                        product.compareAtPrice!) *
                        100
                    )
                  : 0;
                const isOutOfStock = product.stockQuantity === 0;

                return (
                  <article
                    key={`flash-${product.id}`}
                    className="relative group flex flex-col bg-white border border-[#EFEFED] rounded-lg overflow-hidden hover:border-[#F85606]/40 hover:shadow-sm transition-all"
                  >
                    {isHomeEditMode && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                        {onEditProduct && (
                          <button
                            type="button"
                            onClick={() => onEditProduct(product)}
                            aria-label={`Edit ${product.name}`}
                            className="p-1.5 rounded-full bg-white/95 border border-[#D4D4CE] text-[#141413] hover:border-[#141413] shadow-xs cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteProduct && (
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(product.id)}
                            aria-label={`Delete ${product.name}`}
                            className="p-1.5 rounded-full bg-white/95 border border-[#D4D4CE] text-[var(--accent)] hover:border-[var(--accent)] shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onInspectProduct(product)}
                      aria-label={`View ${product.name}`}
                      className="relative aspect-square bg-[#F5F5F3] overflow-hidden cursor-pointer block w-full text-left"
                    >
                      <ResilientImage
                        src={product.imageUrl}
                        alt={product.name}
                        fallbackLabel={product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </button>

                    <div className="p-2 sm:p-2.5 flex flex-col flex-1 justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => onInspectProduct(product)}
                        className="text-left text-[11px] sm:text-xs font-medium text-[#141413] line-clamp-1 hover:text-[#F85606] cursor-pointer"
                      >
                        {product.name}
                      </button>

                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold text-[#F85606] tabular-nums whitespace-nowrap">
                            {formatPKR(effectivePrice)}
                          </span>
                          {discountPct > 0 ? (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#F85606] text-white rounded-sm tabular-nums whitespace-nowrap">
                              -{discountPct}%
                            </span>
                          ) : product.statusNote ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-[#FFF0E8] text-[#F85606] rounded-sm truncate max-w-[74px]">
                              {product.statusNote}
                            </span>
                          ) : null}
                        </div>

                        {!isOutOfStock && firstVariant && (
                          <button
                            type="button"
                            onClick={() => onQuickAddToCart(product.id, firstVariant.id)}
                            aria-label={`Quick add ${product.name} to bag`}
                            className="w-6 h-6 rounded-full bg-[#F5F5F3] text-[#141413] hover:bg-[#F85606] hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Choice · Curated Picks · Free Delivery Strip */}
      {!showChoice ? (
        isHomeEditMode &&
        onToggleChoiceStrip && (
          <div className="bg-white border border-dashed border-[#D4D4CE] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-[#5A5A56]">
              Choice / Curated Picks Strip is hidden from shoppers.
            </span>
            <button
              type="button"
              onClick={onToggleChoiceStrip}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Choice Strip</span>
            </button>
          </div>
        )
      ) : (
        <div className="bg-white border border-[#E4E4E0] rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          {isHomeEditMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#EFEFED]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A56]">
                Choice / Curated Picks Strip
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {onEditFlashSaleConfig && (
                  <button
                    type="button"
                    onClick={onEditFlashSaleConfig}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Choice Text</span>
                  </button>
                )}
                {onToggleChoiceStrip && (
                  <button
                    type="button"
                    onClick={onToggleChoiceStrip}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] bg-white border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Strip</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {choiceBadge && (
                <span className="px-2 py-0.5 rounded bg-[#FFD700] text-[#141413] font-sans text-[11px] font-extrabold tracking-tight uppercase">
                  {choiceBadge}
                </span>
              )}
              <span className="font-sans text-sm sm:text-base font-bold text-[#141413]">
                {choiceHeading}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#008C7A]">
                <Truck className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>{choiceDelivery}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onShopMore}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#5A5A56] hover:text-[#F85606] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>{choiceCta}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {choiceRowProducts.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              {choiceRowProducts.map((product) => (
                <div
                  key={`choice-${product.id}`}
                  className="group relative aspect-[4/3] sm:aspect-[16/10] rounded-lg overflow-hidden bg-[#F5F5F3] border border-[#E4E4E0]"
                >
                  {isHomeEditMode && (
                    <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          aria-label={`Edit ${product.name}`}
                          className="p-1.5 rounded-full bg-white/95 border border-[#D4D4CE] text-[#141413] hover:border-[#141413] shadow-xs cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteProduct && (
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(product.id)}
                          aria-label={`Delete ${product.name}`}
                          className="p-1.5 rounded-full bg-white/95 border border-[#D4D4CE] text-[var(--accent)] hover:border-[var(--accent)] shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onInspectProduct(product)}
                    className="w-full h-full text-left cursor-pointer block"
                  >
                    <ResilientImage
                      src={product.imageUrl}
                      alt={product.name}
                      fallbackLabel={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-2 sm:p-3 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#FFD700] text-[#141413] rounded-sm mb-0.5">
                          {product.category}
                        </span>
                        <p className="text-[11px] sm:text-xs font-semibold text-white truncate">
                          {product.name}
                        </p>
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-[#FFD700] tabular-nums shrink-0">
                        {formatPKR(product.price)}
                      </span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
