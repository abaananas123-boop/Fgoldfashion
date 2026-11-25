import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  CartItem,
  CustomerProfile,
  OrderRecord,
  PaymentMethod,
  Product,
  ShippingDetails,
  SiteConfig,
} from '../types';
import { formatPKR } from '../utils/currency';
import { buildOrderWhatsAppUrl } from '../utils/social';
import { ResilientImage } from './ResilientImage';
import { WhatsAppIcon } from './SocialIcons';

export interface OrderDispatchResult {
  deliveredAutomatically: boolean;
  provider?: string;
  recipientConfigured: boolean;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  products: Product[];
  storeName: string;
  storeWhatsappNumber: string;
  checkoutConfig: SiteConfig['checkout'];
  collectedPromoCode?: string | null;
  onUpdateQuantity: (productId: string, variantId: string, delta: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onClearCart: () => void;
  latestOrder: OrderRecord | null;
  customerProfile?: CustomerProfile | null;
  signedInEmail?: string | null;
  onOrderConfirmed: (order: OrderRecord) => Promise<OrderDispatchResult> | void;
  onOpenAccount?: (orderNumber?: string) => void;
  initialView?: 'bag' | 'receipt';
}

const EMPTY_SHIPPING: ShippingDetails = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
};

export function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  products,
  storeName,
  storeWhatsappNumber,
  checkoutConfig,
  collectedPromoCode,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  latestOrder,
  customerProfile,
  signedInEmail,
  onOrderConfirmed,
  onOpenAccount,
  initialView = 'bag',
}: CartDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout' | 'receipt'>('bag');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  const [shipping, setShipping] = useState<ShippingDetails>(EMPTY_SHIPPING);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [walletNumber, setWalletNumber] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<
    'idle' | 'sending' | 'auto-sent' | 'manual-ready'
  >('idle');

  const activePromoCode = checkoutConfig.promoCode.trim().toUpperCase();
  const findCouponMatch = (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase();
    if (!clean) return null;
    if (activePromoCode && clean === activePromoCode) {
      return {
        code: activePromoCode,
        discountPercent: checkoutConfig.promoDiscountPercent,
        minOrderAmount: 0,
      };
    }
    const extra = (checkoutConfig.coupons ?? []).find(
      (c) => c.active && c.code.trim().toUpperCase() === clean
    );
    return extra
      ? {
          code: clean,
          discountPercent: extra.discountPercent,
          minOrderAmount: extra.minOrderAmount ?? 0,
        }
      : null;
  };

  useEffect(() => {
    if (isOpen) {
      setStep(initialView === 'receipt' && latestOrder ? 'receipt' : 'bag');
      setFormError(null);
      setShipping((prev) => ({
        fullName: prev.fullName || customerProfile?.displayName || '',
        email: prev.email || customerProfile?.email || signedInEmail || '',
        phone: prev.phone || customerProfile?.phone || '',
        address: prev.address || customerProfile?.defaultAddress || '',
        city: prev.city || customerProfile?.defaultCity || '',
        postalCode: prev.postalCode || customerProfile?.defaultPostalCode || '',
      }));
      if (initialView === 'receipt') {
        setWhatsappStatus('idle');
      } else if (collectedPromoCode && !appliedPromo) {
        const matched = findCouponMatch(collectedPromoCode);
        if (matched) {
          setPromoInput(matched.code);
          setAppliedPromo(matched.code);
          setPromoFeedback(
            `Collected voucher ${matched.code} auto-applied (${matched.discountPercent}% off).`
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialView, latestOrder, collectedPromoCode, customerProfile, signedInEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedItems = cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant =
        product.variants.find((v) => v.id === item.variantId) || product.variants[0];
      const unitPrice = product.price + (variant.priceDelta ?? 0);
      return {
        ...item,
        product,
        variant,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const freeThreshold = Math.max(0, checkoutConfig.freeShippingThreshold);
  const standardFee = Math.max(0, checkoutConfig.standardShippingFee);

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const matchedApplied = appliedPromo ? findCouponMatch(appliedPromo) : null;
  const discountRate = matchedApplied
    ? Math.min(90, Math.max(0, matchedApplied.discountPercent)) / 100
    : 0;
  const meetsPromoMin =
    !matchedApplied || subtotal >= (matchedApplied.minOrderAmount ?? 0);
  const discount =
    matchedApplied && meetsPromoMin ? Math.round(subtotal * discountRate) : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const qualifiesFreeShipping = discountedSubtotal >= freeThreshold;
  const shippingCost =
    resolvedItems.length === 0 ? 0 : qualifiesFreeShipping ? 0 : standardFee;
  const total = discountedSubtotal + shippingCost;
  const remainingForFreeShipping = Math.max(0, freeThreshold - discountedSubtotal);
  const freeShippingProgress =
    freeThreshold > 0
      ? Math.min(100, (discountedSubtotal / freeThreshold) * 100)
      : 100;

  const handleApplyPromo = () => {
    const matched = findCouponMatch(promoInput);
    if (!promoInput.trim()) return;
    if (matched) {
      setAppliedPromo(matched.code);
      setPromoFeedback(
        matched.minOrderAmount > 0 && subtotal < matched.minOrderAmount
          ? `${matched.code} saved — add ${formatPKR(matched.minOrderAmount - subtotal)} more to unlock ${matched.discountPercent}% off.`
          : `${matched.code} applied — ${matched.discountPercent}% off your order.`
      );
    } else {
      setPromoFeedback(
        activePromoCode
          ? `Code not recognized. Try ${activePromoCode} for ${checkoutConfig.promoDiscountPercent}% off.`
          : 'No active promo code is configured.'
      );
    }
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrder) return;
    if (
      !shipping.fullName.trim() ||
      shipping.email.trim().length < 3 ||
      shipping.phone.trim().length < 6 ||
      shipping.address.trim().length < 3 ||
      shipping.city.trim().length < 2 ||
      shipping.postalCode.trim().length < 2
    ) {
      setFormError(
        'Please complete all required delivery fields (including a valid phone number, address, city, and postal code).'
      );
      return;
    }

    if (paymentMethod === 'wallet' && walletNumber.replace(/\D/g, '').length < 10) {
      setFormError('Enter a valid JazzCash or Easypaisa mobile number (e.g., 0300 1234567) or choose another method.');
      return;
    }

    if (paymentMethod === 'card' && cardLastFour.replace(/\D/g, '').length < 4) {
      setFormError('Enter at least the last 4 digits of your card or choose JazzCash/Easypaisa or Cash on Delivery.');
      return;
    }

    const orderNum = `FG-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: OrderRecord = {
      orderNumber: orderNum,
      createdAt: new Date().toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'Confirmed — Preparing Shipment',
      items: resolvedItems.map((entry) => ({
        productId: entry.product.id,
        name: entry.product.name,
        variantName: entry.variant.name,
        volume: entry.product.volume,
        unitPrice: entry.unitPrice,
        quantity: entry.quantity,
        imageUrl: entry.product.imageUrl,
      })),
      subtotal,
      discount,
      shippingCost,
      total,
      paymentMethod,
      shipping: { ...shipping },
    };

    setFormError(null);
    setIsSubmittingOrder(true);
    setWhatsappStatus('sending');

    try {
      const result = await Promise.resolve(onOrderConfirmed(newOrder));
      onClearCart();
      setAppliedPromo(null);
      setPromoInput('');
      setPromoFeedback(null);
      setStep('receipt');
      if (result && result.deliveredAutomatically) {
        setWhatsappStatus('auto-sent');
      } else {
        setWhatsappStatus('manual-ready');
      }
    } catch {
      setWhatsappStatus('idle');
      setFormError(
        'Could not submit your order right now. Please check your internet connection and tap Place Order again.'
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag and Checkout"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md h-full bg-[#FAFAFA] border-l border-[#E4E4E0] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 h-16 border-b border-[#E4E4E0] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('bag')}
                aria-label="Back to bag"
                className="p-1.5 -ml-1.5 text-[#5A5A56] hover:text-[#141413] cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-serif text-xl font-medium text-[#141413]">
              {step === 'bag' && 'Shopping Bag'}
              {step === 'checkout' && 'Checkout'}
              {step === 'receipt' && 'Order Confirmation'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#F2F2F0] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: BAG VIEW */}
        {step === 'bag' && (
          <>
            {resolvedItems.length > 0 && (
              <div className="px-6 py-3 bg-[#F2F2F0] border-b border-[#E4E4E0] shrink-0">
                <p className="text-xs text-[#141413] mb-2 tabular-nums">
                  {qualifiesFreeShipping
                    ? 'Your order qualifies for complimentary courier shipping.'
                    : `Add ${formatPKR(remainingForFreeShipping)} more for complimentary courier shipping.`}
                </p>
                <div className="w-full h-1 bg-[#E4E4E0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {resolvedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <ShoppingBag className="w-8 h-8 text-[#5A5A56]/60 mb-3" strokeWidth={1.5} />
                  <p className="font-serif text-2xl text-[#141413] mb-1">Your bag is empty</p>
                  <p className="text-sm text-[#5A5A56] max-w-xs mb-6">
                    Explore our boutique handbags, artificial jewellery, eastern &amp; western wear, baby garments, fragrance, skincare, and cosmetics.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
                  >
                    Continue Browsing
                  </button>
                  {latestOrder && (
                    <button
                      type="button"
                      onClick={() => setStep('receipt')}
                      className="mt-4 text-xs font-medium text-[var(--accent)] underline underline-offset-4 cursor-pointer"
                    >
                      View Recent Order ({latestOrder.orderNumber})
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-[#E4E4E0]">
                  {resolvedItems.map((entry) => (
                    <li
                      key={`${entry.product.id}-${entry.variant.id}`}
                      className="py-4 flex gap-4"
                    >
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-[#F2F2F0] border border-[#E4E4E0] shrink-0">
                        <ResilientImage
                          src={entry.product.imageUrl}
                          alt={entry.product.name}
                          mode="thumb"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-base font-medium text-[#141413] leading-snug">
                              {entry.product.name}
                            </h3>
                            <span className="text-sm font-semibold text-[#141413] tabular-nums shrink-0">
                              {formatPKR(entry.lineTotal)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#5A5A56] mt-0.5">
                            {entry.variant.hex && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                                style={{ backgroundColor: entry.variant.hex }}
                              />
                            )}
                            <span className="truncate">{entry.variant.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="inline-flex items-center border border-[#D4D4CE] rounded bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(entry.product.id, entry.variant.id, -1)
                              }
                              aria-label={`Decrease ${entry.product.name} quantity`}
                              className="w-7 h-7 flex items-center justify-center text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-medium tabular-nums">
                              {entry.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(entry.product.id, entry.variant.id, 1)
                              }
                              aria-label={`Increase ${entry.product.name} quantity`}
                              className="w-7 h-7 flex items-center justify-center text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onRemoveItem(entry.product.id, entry.variant.id)
                            }
                            aria-label={`Remove ${entry.product.name}`}
                            className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {resolvedItems.length > 0 && (
              <div className="p-6 bg-white border-t border-[#E4E4E0] space-y-4 shrink-0">
                {/* Promo Code */}
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder={
                        activePromoCode
                          ? `Promo code (try ${activePromoCode})`
                          : 'Promo code'
                      }
                      aria-label="Promo code"
                      className="flex-1 h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-3.5 h-9 text-xs font-medium border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Apply
                    </button>
                  </div>
                  {promoFeedback && (
                    <p className="text-[11px] text-[var(--accent)] mt-1.5">{promoFeedback}</p>
                  )}
                </div>

                {/* Summary Rows */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#5A5A56]">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatPKR(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--accent)]">
                      <span>Promo ({appliedPromo})</span>
                      <span className="tabular-nums">-{formatPKR(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5A5A56]">
                    <span>Shipping</span>
                    <span className="tabular-nums">
                      {shippingCost === 0 ? 'Complimentary' : formatPKR(shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-[#141413] pt-2 border-t border-[#E4E4E0]">
                    <span>Estimated Total (PKR)</span>
                    <span className="tabular-nums">{formatPKR(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full py-3 px-4 text-sm font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: CHECKOUT FORM */}
        {step === 'checkout' && (
          <form onSubmit={handlePlaceOrder} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {formError && (
                <div
                  role="alert"
                  className="p-3 text-xs text-[var(--accent)] bg-[var(--accent)]/8 border border-[var(--accent)]/25 rounded-md"
                >
                  {formError}
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56] mb-3">
                  Recipient &amp; Delivery Address
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.fullName}
                      onChange={(e) =>
                        setShipping({ ...shipping, fullName: e.target.value })
                      }
                      placeholder="Ayesha Khan"
                      className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={shipping.email}
                        onChange={(e) =>
                          setShipping({ ...shipping, email: e.target.value })
                        }
                        placeholder="ayesha@example.com"
                        className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        required
                        value={shipping.phone}
                        onChange={(e) =>
                          setShipping({ ...shipping, phone: e.target.value })
                        }
                        placeholder="0300 1234567"
                        className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.address}
                      onChange={(e) =>
                        setShipping({ ...shipping, address: e.target.value })
                      }
                      placeholder="House 14, Street 6, Gulberg III"
                      className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        required
                        value={shipping.city}
                        onChange={(e) =>
                          setShipping({ ...shipping, city: e.target.value })
                        }
                        placeholder="Lahore"
                        className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141413] mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        required
                        value={shipping.postalCode}
                        onChange={(e) =>
                          setShipping({ ...shipping, postalCode: e.target.value })
                        }
                        placeholder="54660"
                        className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4E4E0]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56] mb-3">
                  Payment Method (PKR Rs.)
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    aria-pressed={paymentMethod === 'wallet'}
                    className={`py-2.5 px-2 text-xs font-medium rounded-md border text-center transition-colors cursor-pointer whitespace-nowrap ${
                      paymentMethod === 'wallet'
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] bg-white text-[#141413]'
                    }`}
                  >
                    JazzCash / Easypaisa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    aria-pressed={paymentMethod === 'card'}
                    className={`py-2.5 px-2 text-xs font-medium rounded-md border text-center transition-colors cursor-pointer whitespace-nowrap ${
                      paymentMethod === 'card'
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] bg-white text-[#141413]'
                    }`}
                  >
                    Card (PKR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    aria-pressed={paymentMethod === 'cod'}
                    className={`py-2.5 px-2 text-xs font-medium rounded-md border text-center transition-colors cursor-pointer whitespace-nowrap ${
                      paymentMethod === 'cod'
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D4D4CE] bg-white text-[#141413]'
                    }`}
                  >
                    Cash on Delivery
                  </button>
                </div>

                {paymentMethod === 'wallet' && (
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      JazzCash / Easypaisa Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(e.target.value)}
                      placeholder="0300 1234567"
                      className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md tabular-nums focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Visa / Mastercard / PayPak Card Number
                    </label>
                    <input
                      type="text"
                      value={cardLastFour}
                      onChange={(e) => setCardLastFour(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full h-10 px-3 text-sm bg-white border border-[#D4D4CE] rounded-md tabular-nums focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <p className="text-xs text-[#5A5A56] leading-relaxed bg-[#F2F2F0] p-3 rounded-md">
                    Pay <span className="font-semibold text-[#141413] tabular-nums">{formatPKR(total)}</span> in cash upon courier arrival. Free delivery applies to orders {formatPKR(freeThreshold)}+.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-[#E4E4E0] space-y-3 shrink-0">
              <div className="flex justify-between text-sm font-semibold text-[#141413]">
                <span>Total Due (PKR)</span>
                <span className="tabular-nums">{formatPKR(total)}</span>
              </div>
              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                {isSubmittingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isSubmittingOrder
                    ? 'Confirming Order...'
                    : `Place Order — ${formatPKR(total)}`}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: ORDER CONFIRMATION RECEIPT */}
        {step === 'receipt' && latestOrder && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="p-5 bg-white border border-[#E4E4E0] rounded-lg">
              <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {latestOrder.status}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-medium text-[#141413] tabular-nums">
                Order #{latestOrder.orderNumber}
              </h3>
              <p className="text-xs text-[#5A5A56] mt-1">
                Placed on {latestOrder.createdAt} <span aria-hidden="true">·</span>{' '}
                {latestOrder.paymentMethod === 'cod'
                  ? 'Cash on Delivery (PKR)'
                  : latestOrder.paymentMethod === 'wallet'
                    ? 'JazzCash / Easypaisa Verified (PKR)'
                    : 'Card Payment Verified (PKR)'}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56] mb-3">
                Shipping Destination
              </h4>
              <div className="text-sm text-[#141413] space-y-0.5 bg-white border border-[#E4E4E0] rounded-lg p-4">
                <p className="font-medium">{latestOrder.shipping.fullName}</p>
                <p className="text-xs text-[#5A5A56]">{latestOrder.shipping.address}</p>
                <p className="text-xs text-[#5A5A56]">
                  {latestOrder.shipping.city}, {latestOrder.shipping.postalCode}
                </p>
                <p className="text-xs text-[#5A5A56] pt-1">
                  {latestOrder.shipping.email} <span aria-hidden="true">·</span>{' '}
                  {latestOrder.shipping.phone}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56] mb-3">
                Itemized Receipt
              </h4>
              <ul className="divide-y divide-[#E4E4E0] bg-white border border-[#E4E4E0] rounded-lg px-4">
                {latestOrder.items.map((item) => (
                  <li
                    key={`${item.productId}-${item.variantName}`}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#141413] truncate">{item.name}</p>
                      <p className="text-[#5A5A56]">
                        {item.variantName} <span aria-hidden="true">·</span> Qty{' '}
                        <span className="tabular-nums">{item.quantity}</span>
                      </p>
                    </div>
                    <span className="font-semibold text-[#141413] tabular-nums shrink-0">
                      {formatPKR(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-1.5 text-xs px-1">
                <div className="flex justify-between text-[#5A5A56]">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPKR(latestOrder.subtotal)}</span>
                </div>
                {latestOrder.discount > 0 && (
                  <div className="flex justify-between text-[var(--accent)]">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatPKR(latestOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#5A5A56]">
                  <span>Shipping</span>
                  <span className="tabular-nums">
                    {latestOrder.shippingCost === 0
                      ? 'Complimentary'
                      : formatPKR(latestOrder.shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-[#141413] pt-2 border-t border-[#E4E4E0]">
                  <span>Total (PKR)</span>
                  <span className="tabular-nums">{formatPKR(latestOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Order Delivery Status & Direct Handoff */}
            {(() => {
              const orderWhatsappUrl = buildOrderWhatsAppUrl(
                storeWhatsappNumber,
                latestOrder,
                storeName
              );

              return (
                <div className="p-4 bg-[#F2F2F0] border border-[#E4E4E0] rounded-lg space-y-3">
                  <div className="flex items-start gap-2.5">
                    {whatsappStatus === 'sending' ? (
                      <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin mt-0.5 shrink-0" />
                    ) : (
                      <WhatsAppIcon className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#141413]">
                        {whatsappStatus === 'sending'
                          ? `Sending order details to ${storeName} on WhatsApp...`
                          : whatsappStatus === 'auto-sent'
                            ? `Delivered automatically to ${storeName} on WhatsApp`
                            : orderWhatsappUrl
                              ? `WhatsApp Order Confirmation (${storeName})`
                              : `Order recorded for ${storeName}`}
                      </p>
                      <p className="text-[11px] text-[#5A5A56] leading-relaxed">
                        {whatsappStatus === 'auto-sent'
                          ? 'Your name, delivery address, phone number, and itemized order were sent directly to our WhatsApp desk.'
                          : orderWhatsappUrl
                            ? 'Tap below to send your pre-filled customer details and order summary directly to our WhatsApp desk.'
                            : 'Your order is saved in our store ledger for dispatch.'}
                      </p>
                    </div>
                  </div>

                  {orderWhatsappUrl && (
                    <a
                      href={orderWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-2.5 px-4 inline-flex items-center justify-center gap-2 text-xs font-medium rounded-md transition-colors ${
                        whatsappStatus === 'auto-sent'
                          ? 'bg-white text-[#141413] border border-[#D4D4CE] hover:border-[#141413]'
                          : 'bg-[var(--accent)] text-white hover:opacity-95'
                      }`}
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>
                        {whatsappStatus === 'auto-sent'
                          ? 'Open Order Copy on WhatsApp'
                          : 'Send Order Details on WhatsApp'}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2.5">
              {onOpenAccount && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAccount(latestOrder.orderNumber);
                  }}
                  className="w-full py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium bg-white text-[#141413] border border-[#141413] rounded-md hover:bg-[#F2F2F0] transition-colors cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-[var(--accent)]" />
                  <span>Track Order in My Account</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 text-sm font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
