import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  db,
  isSafeHttpUrl,
  normalizeOrderTrackingId,
} from '../firebase';
import { OrderRecord, OrderTrackingRecord } from '../types';
import { buildWhatsAppUrl } from '../utils/social';
import { WhatsAppIcon } from './SocialIcons';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
  latestOrder?: OrderRecord | null;
  storeName: string;
  storeWhatsappNumber?: string;
}

const PROGRESS_STEPS = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
] as const;

function resolveStageState(status: string): {
  activeStepIndex: number;
  variant: 'normal' | 'hold' | 'cancelled';
} {
  const lower = status.toLowerCase();
  if (lower.includes('cancel')) {
    return { activeStepIndex: 0, variant: 'cancelled' };
  }
  if (lower.includes('delay') || lower.includes('hold')) {
    return { activeStepIndex: 2, variant: 'hold' };
  }
  if (lower.includes('deliver') && !lower.includes('out for')) {
    return { activeStepIndex: 4, variant: 'normal' };
  }
  if (lower.includes('out for')) {
    return { activeStepIndex: 3, variant: 'normal' };
  }
  if (
    lower.includes('ship') ||
    lower.includes('transit') ||
    lower.includes('dispatch') ||
    lower.includes('courier')
  ) {
    if (lower.includes('ready for dispatch') || lower.includes('packed')) {
      return { activeStepIndex: 1, variant: 'normal' };
    }
    return { activeStepIndex: 2, variant: 'normal' };
  }
  if (lower.includes('pack') || lower.includes('prepar')) {
    if (lower.includes('preparing shipment')) {
      return { activeStepIndex: 0, variant: 'normal' };
    }
    return { activeStepIndex: 1, variant: 'normal' };
  }
  return { activeStepIndex: 0, variant: 'normal' };
}

export function OrderTrackingModal({
  isOpen,
  onClose,
  initialOrderNumber = '',
  latestOrder = null,
  storeName,
  storeWhatsappNumber = '',
}: OrderTrackingModalProps) {
  const [inputOrderNumber, setInputOrderNumber] = useState(initialOrderNumber);
  const [activeLookupId, setActiveLookupId] = useState(() =>
    normalizeOrderTrackingId(initialOrderNumber)
  );
  const [trackingDoc, setTrackingDoc] = useState<OrderTrackingRecord | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [copiedTrackingNo, setCopiedTrackingNo] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const candidate =
      initialOrderNumber.trim() || latestOrder?.orderNumber || '';
    if (candidate) {
      setInputOrderNumber(candidate);
      setActiveLookupId(normalizeOrderTrackingId(candidate));
    }
  }, [isOpen, initialOrderNumber, latestOrder?.orderNumber]);

  useEffect(() => {
    if (!isOpen || !activeLookupId) {
      setTrackingDoc(null);
      setNotFound(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setLookupError(null);

    const unsubscribe = onSnapshot(
      doc(db, 'orderTracking', activeLookupId),
      (snapshot) => {
        setLoading(false);
        if (!snapshot.exists()) {
          setTrackingDoc(null);
          setNotFound(true);
          return;
        }
        const data = snapshot.data() as Partial<OrderTrackingRecord>;
        setTrackingDoc({
          orderNumber: data.orderNumber || snapshot.id,
          status: data.status || 'Confirmed — Preparing Shipment',
          courierName: data.courierName,
          trackingNumber: data.trackingNumber,
          trackingUrl: data.trackingUrl,
          estimatedDelivery: data.estimatedDelivery,
          destinationCity: data.destinationCity || 'Pakistan',
          itemCount: Number(data.itemCount) || 1,
          orderDateLabel: data.orderDateLabel || 'Recent Order',
          updatedAtLabel: data.updatedAtLabel || 'Recently updated',
          events: Array.isArray(data.events) ? data.events : [],
        });
        setNotFound(false);
      },
      (err) => {
        console.error('Order tracking lookup error:', err);
        setLoading(false);
        setTrackingDoc(null);
        setLookupError(
          'Unable to verify this order number right now. Please check your Order Number format (e.g. FG-4198) and try again.'
        );
      }
    );

    return () => unsubscribe();
  }, [isOpen, activeLookupId]);

  const orderedEvents = useMemo(() => {
    if (!trackingDoc?.events) return [];
    return [...trackingDoc.events].reverse();
  }, [trackingDoc?.events]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeOrderTrackingId(inputOrderNumber);
    if (!normalized || normalized.length < 3) {
      setLookupError('Please enter a valid Order Number (e.g. FG-4198).');
      return;
    }
    setLookupError(null);
    setActiveLookupId(normalized);
  };

  const handleTrackRecent = () => {
    if (!latestOrder?.orderNumber) return;
    const normalized = normalizeOrderTrackingId(latestOrder.orderNumber);
    setInputOrderNumber(latestOrder.orderNumber);
    setLookupError(null);
    setActiveLookupId(normalized);
  };

  const handleCopyTrackingNumber = async () => {
    if (!trackingDoc?.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingDoc.trackingNumber);
      setCopiedTrackingNo(true);
      window.setTimeout(() => setCopiedTrackingNo(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const stageState = trackingDoc
    ? resolveStageState(trackingDoc.status)
    : { activeStepIndex: 0, variant: 'normal' as const };

  const safeTrackingUrl =
    trackingDoc?.trackingUrl && isSafeHttpUrl(trackingDoc.trackingUrl)
      ? trackingDoc.trackingUrl.trim()
      : null;

  const supportWhatsAppUrl = buildWhatsAppUrl(
    storeWhatsappNumber,
    `Assalam-o-Alaikum ${storeName}, I would like a shipping update for Order #${
      trackingDoc?.orderNumber || activeLookupId || inputOrderNumber || 'my order'
    }.`
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Track Your Order"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#FAFAFA] border border-[#E4E4E0] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E4E4E0] flex items-center justify-between gap-4 shrink-0">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--accent)]">
              Live Dispatch Updates
            </p>
            <h2 className="font-serif text-2xl font-medium text-[#141413]">
              Track Your Order
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order tracker"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#F2F2F0] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search Form */}
          <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-3">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <label htmlFor="customer-track-order-input" className="sr-only">
                Order Number
              </label>
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-[#5A5A56] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={1.75}
                />
                <input
                  id="customer-track-order-input"
                  type="text"
                  value={inputOrderNumber}
                  onChange={(e) => setInputOrderNumber(e.target.value)}
                  placeholder="Enter Order Number (e.g. FG-4198)"
                  className="w-full h-11 pl-9 pr-3 text-sm bg-[#FAFAFA] text-[#141413] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Track Order
              </button>
            </form>

            {latestOrder &&
              normalizeOrderTrackingId(latestOrder.orderNumber) !==
                activeLookupId && (
                <div className="flex items-center justify-between gap-2 text-xs text-[#5A5A56] pt-1">
                  <span>Recent checkout order saved on this device:</span>
                  <button
                    type="button"
                    onClick={handleTrackRecent}
                    className="font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                  >
                    Track #{latestOrder.orderNumber}
                  </button>
                </div>
              )}

            {lookupError && (
              <p role="alert" className="text-xs text-[var(--accent)]">
                {lookupError}
              </p>
            )}
          </div>

          {/* Empty State Before Search */}
          {!activeLookupId && !loading && (
            <div className="py-12 px-6 text-center bg-white border border-[#E4E4E0] rounded-lg space-y-2">
              <Package
                className="w-8 h-8 text-[#5A5A56]/60 mx-auto"
                strokeWidth={1.5}
              />
              <h3 className="font-serif text-xl text-[#141413]">
                Enter your Order Number above
              </h3>
              <p className="text-xs text-[#5A5A56] max-w-md mx-auto leading-relaxed">
                Check live shipment milestones, courier tracking numbers, and delivery updates published directly by {storeName}.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-12 px-6 text-center bg-white border border-[#E4E4E0] rounded-lg space-y-2">
              <Clock className="w-6 h-6 text-[var(--accent)] mx-auto animate-pulse" />
              <p className="text-xs text-[#5A5A56]">
                Fetching live tracking details for #{activeLookupId}...
              </p>
            </div>
          )}

          {/* Not Found State */}
          {!loading && notFound && activeLookupId && (
            <div className="py-10 px-6 text-center bg-white border border-[#E4E4E0] rounded-lg space-y-3">
              <AlertCircle
                className="w-7 h-7 text-[var(--accent)] mx-auto"
                strokeWidth={1.5}
              />
              <h3 className="font-serif text-xl text-[#141413]">
                No tracking found for #{activeLookupId}
              </h3>
              <p className="text-xs text-[#5A5A56] max-w-md mx-auto leading-relaxed">
                Please double-check the Order Number on your checkout receipt (for example, FG-4198). If you placed your order via WhatsApp or need help, reach out to our dispatch desk below.
              </p>
              {supportWhatsAppUrl && (
                <div className="pt-2">
                  <a
                    href={supportWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>Ask Support on WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Live Tracking Details */}
          {!loading && trackingDoc && (
            <div className="space-y-5">
              {/* Summary Header & Progress Stepper */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                        Order #{trackingDoc.orderNumber}
                      </span>
                      <span className="text-[#D4D4CE]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[11px] text-[#5A5A56]">
                        Placed {trackingDoc.orderDateLabel}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-medium text-[#141413]">
                      {trackingDoc.status}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right space-y-0.5 text-xs text-[#5A5A56]">
                    <p className="text-[#141413] font-medium">
                      Destination: {trackingDoc.destinationCity}
                    </p>
                    <p className="tabular-nums">
                      {trackingDoc.itemCount}{' '}
                      {trackingDoc.itemCount === 1 ? 'item' : 'items'} · Updated{' '}
                      {trackingDoc.updatedAtLabel}
                    </p>
                  </div>
                </div>

                {/* Progress Stepper */}
                {stageState.variant === 'normal' ? (
                  <div className="pt-2">
                    <div className="grid grid-cols-5 gap-2">
                      {PROGRESS_STEPS.map((step, idx) => {
                        const completed = idx <= stageState.activeStepIndex;
                        const current = idx === stageState.activeStepIndex;
                        return (
                          <div key={step.key} className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors ${
                                  completed
                                    ? 'bg-[#141413] text-white'
                                    : 'bg-[#F2F2F0] text-[#8A8A84] border border-[#E4E4E0]'
                                }`}
                              >
                                {completed ? (
                                  <Check className="w-3 h-3" strokeWidth={2.2} />
                                ) : (
                                  idx + 1
                                )}
                              </span>
                              <div
                                className={`h-0.5 flex-1 rounded-full ${
                                  idx < stageState.activeStepIndex
                                    ? 'bg-[#141413]'
                                    : 'bg-[#E4E4E0]'
                                } ${idx === PROGRESS_STEPS.length - 1 ? 'invisible' : ''}`}
                              />
                            </div>
                            <p
                              className={`text-[11px] leading-tight ${
                                current
                                  ? 'font-semibold text-[#141413]'
                                  : completed
                                    ? 'font-medium text-[#141413]'
                                    : 'text-[#8A8A84]'
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F2F2F0] border border-[#E4E4E0] rounded-md flex items-center gap-2.5 text-xs text-[#141413]">
                    <AlertCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>
                      Current dispatch notice:{' '}
                      <strong>{trackingDoc.status}</strong>. See latest updates
                      below or contact our store desk.
                    </span>
                  </div>
                )}

                {/* Courier & Estimate Grid */}
                {(trackingDoc.courierName ||
                  trackingDoc.trackingNumber ||
                  trackingDoc.estimatedDelivery ||
                  safeTrackingUrl) && (
                  <div className="pt-4 border-t border-[#E4E4E0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {trackingDoc.courierName && (
                      <div className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md flex items-start gap-2.5">
                        <Truck className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#5A5A56]">
                            Courier Service
                          </p>
                          <p className="font-semibold text-[#141413] truncate">
                            {trackingDoc.courierName}
                          </p>
                        </div>
                      </div>
                    )}

                    {trackingDoc.trackingNumber && (
                      <div className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#5A5A56]">
                            Courier Tracking #
                          </p>
                          <p className="font-semibold text-[#141413] tabular-nums truncate">
                            {trackingDoc.trackingNumber}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyTrackingNumber}
                          aria-label="Copy courier tracking number"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer shrink-0"
                        >
                          {copiedTrackingNo ? (
                            <>
                              <Check className="w-3 h-3 text-[var(--accent)]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {trackingDoc.estimatedDelivery && (
                      <div className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] text-[#5A5A56]">
                            Estimated Delivery
                          </p>
                          <p className="font-semibold text-[#141413]">
                            {trackingDoc.estimatedDelivery}
                          </p>
                        </div>
                      </div>
                    )}

                    {safeTrackingUrl && (
                      <div className="p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#5A5A56]">
                            Courier Portal
                          </p>
                          <p className="font-medium text-[#141413] truncate">
                            Track on courier website
                          </p>
                        </div>
                        <a
                          href={safeTrackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-[#141413] text-white rounded hover:bg-[#2B2B29] whitespace-nowrap shrink-0"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chronological Updates Timeline */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                    Tracking Timeline
                  </h4>
                  <span className="text-[11px] text-[#5A5A56] tabular-nums">
                    {orderedEvents.length}{' '}
                    {orderedEvents.length === 1 ? 'update' : 'updates'}
                  </span>
                </div>

                {orderedEvents.length === 0 ? (
                  <p className="text-xs text-[#5A5A56]">
                    Order confirmed. Dispatch updates will appear here as your
                    parcel moves.
                  </p>
                ) : (
                  <ol className="space-y-4">
                    {orderedEvents.map((ev, index) => {
                      const isLatest = index === 0;
                      return (
                        <li key={ev.id} className="relative pl-6">
                          {index < orderedEvents.length - 1 && (
                            <span
                              aria-hidden="true"
                              className="absolute left-[7px] top-4 bottom-[-18px] w-px bg-[#E4E4E0]"
                            />
                          )}
                          <span
                            aria-hidden="true"
                            className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                              isLatest
                                ? 'bg-[var(--accent)] ring-4 ring-[var(--accent)]/15'
                                : 'bg-[#D4D4CE]'
                            }`}
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p
                                className={`text-xs ${
                                  isLatest
                                    ? 'font-semibold text-[#141413]'
                                    : 'font-medium text-[#141413]'
                                }`}
                              >
                                {ev.status}
                              </p>
                              <span className="text-[11px] text-[#5A5A56] tabular-nums">
                                {ev.timestamp}
                              </span>
                            </div>
                            {ev.location && (
                              <p className="inline-flex items-center gap-1 text-[11px] text-[#5A5A56]">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{ev.location}</span>
                              </p>
                            )}
                            {ev.note && (
                              <p className="text-xs text-[#5A5A56] leading-relaxed">
                                {ev.note}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              {/* Support Footer inside Tracker */}
              {supportWhatsAppUrl && (
                <div className="p-4 bg-[#F2F2F0] border border-[#E4E4E0] rounded-lg flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#141413]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Need help with delivery timing or address?</span>
                  </div>
                  <a
                    href={supportWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Message {storeName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
