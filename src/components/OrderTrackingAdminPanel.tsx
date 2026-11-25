import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MapPin,
  PackageCheck,
  Plus,
  Search,
  Send,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  ORDER_TRACKING_STATUSES,
  OrderRecord,
  OrderTrackingEvent,
  OrderTrackingRecord,
} from '../types';
import {
  buildInitialOrderTracking,
  formatTrackingTimestampLabel,
  isSafeHttpUrl,
  normalizeOrderTrackingId,
} from '../firebase';
import { formatPKR } from '../utils/currency';
import { buildWhatsAppUrl, formatOrderPaymentLabel } from '../utils/social';
import { WhatsAppIcon } from './SocialIcons';

interface OrderTrackingAdminPanelProps {
  orders: OrderRecord[];
  trackingRecords: Record<string, OrderTrackingRecord>;
  storeName: string;
  initialSelectedOrderNumber?: string | null;
  onPublishTracking: (
    order: OrderRecord,
    tracking: OrderTrackingRecord
  ) => Promise<void>;
  onCreateManualOrder?: (
    order: OrderRecord,
    initialTracking: OrderTrackingRecord
  ) => Promise<void>;
  onResetSampleOrders?: () => void;
}

const COURIER_PRESETS = [
  'TCS',
  'Leopards Courier',
  'Trax',
  'PostEx',
  'M&P',
  'DHL',
  'Boutique Rider',
];

export function OrderTrackingAdminPanel({
  orders,
  trackingRecords,
  storeName,
  initialSelectedOrderNumber = null,
  onPublishTracking,
  onCreateManualOrder,
  onResetSampleOrders,
}: OrderTrackingAdminPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>(
    'all'
  );
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>(
    () => initialSelectedOrderNumber || orders[0]?.orderNumber || ''
  );

  // Publisher form draft state for selected order
  const [draftStatus, setDraftStatus] = useState<string>(
    'Packed & Ready for Dispatch'
  );
  const [draftCourierName, setDraftCourierName] = useState('');
  const [draftTrackingNumber, setDraftTrackingNumber] = useState('');
  const [draftTrackingUrl, setDraftTrackingUrl] = useState('');
  const [draftEstimatedDelivery, setDraftEstimatedDelivery] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftNote, setDraftNote] = useState('');

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Manual / WhatsApp order creator modal
  const [isManualComposerOpen, setIsManualComposerOpen] = useState(false);
  const [manualOrderNumber, setManualOrderNumber] = useState(() =>
    `FG-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCity, setManualCity] = useState('Lahore');
  const [manualAddress, setManualAddress] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [manualTotalPkr, setManualTotalPkr] = useState('5000');
  const [manualCourier, setManualCourier] = useState('');
  const [manualTrackingNo, setManualTrackingNo] = useState('');
  const [manualStatus, setManualStatus] = useState(
    'Confirmed — Preparing Shipment'
  );
  const [manualError, setManualError] = useState<string | null>(null);
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  useEffect(() => {
    if (initialSelectedOrderNumber) {
      setSelectedOrderNumber(initialSelectedOrderNumber);
    }
  }, [initialSelectedOrderNumber]);

  useEffect(() => {
    if (
      orders.length > 0 &&
      !orders.some(
        (o) =>
          normalizeOrderTrackingId(o.orderNumber) ===
          normalizeOrderTrackingId(selectedOrderNumber)
      )
    ) {
      setSelectedOrderNumber(orders[0].orderNumber);
    }
  }, [orders, selectedOrderNumber]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const normalizedId = normalizeOrderTrackingId(order.orderNumber);
      const activeTracking = trackingRecords[normalizedId];
      const currentStatus = (
        activeTracking?.status ||
        order.status ||
        ''
      ).toLowerCase();

      if (statusFilter === 'delivered' && !currentStatus.includes('deliver')) {
        return false;
      }
      if (
        statusFilter === 'active' &&
        (currentStatus.includes('deliver') || currentStatus.includes('cancel'))
      ) {
        return false;
      }

      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.shipping.fullName.toLowerCase().includes(q) ||
        order.shipping.city.toLowerCase().includes(q) ||
        order.shipping.phone.toLowerCase().includes(q) ||
        (activeTracking?.trackingNumber || '').toLowerCase().includes(q)
      );
    });
  }, [orders, trackingRecords, searchQuery, statusFilter]);

  const selectedOrder = useMemo(() => {
    const norm = normalizeOrderTrackingId(selectedOrderNumber);
    return (
      orders.find((o) => normalizeOrderTrackingId(o.orderNumber) === norm) ??
      orders[0] ??
      null
    );
  }, [orders, selectedOrderNumber]);

  const selectedTracking: OrderTrackingRecord | null = useMemo(() => {
    if (!selectedOrder) return null;
    const norm = normalizeOrderTrackingId(selectedOrder.orderNumber);
    return trackingRecords[norm] ?? buildInitialOrderTracking(selectedOrder);
  }, [selectedOrder, trackingRecords]);

  useEffect(() => {
    if (!selectedOrder || !selectedTracking) return;
    setDraftStatus(selectedTracking.status || 'Confirmed — Preparing Shipment');
    setDraftCourierName(selectedTracking.courierName || '');
    setDraftTrackingNumber(selectedTracking.trackingNumber || '');
    setDraftTrackingUrl(selectedTracking.trackingUrl || '');
    setDraftEstimatedDelivery(selectedTracking.estimatedDelivery || '');
    setDraftLocation('');
    setDraftNote('');
    setPublishError(null);
    setPublishMessage(null);
  }, [selectedOrder?.orderNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublishUpdate = async (e: FormEvent, appendMilestone: boolean) => {
    e.preventDefault();
    if (!selectedOrder || !selectedTracking || isPublishing) return;

    const cleanStatus = draftStatus.trim().slice(0, 80);
    if (!cleanStatus) {
      setPublishError('Please choose or type an order status.');
      return;
    }

    const cleanTrackingUrl = draftTrackingUrl.trim();
    if (cleanTrackingUrl && !isSafeHttpUrl(cleanTrackingUrl)) {
      setPublishError(
        'Tracking link must be a valid website address starting with https:// or http://'
      );
      return;
    }

    const nowLabel = formatTrackingTimestampLabel();
    const existingEvents =
      selectedTracking.events.length > 0
        ? [...selectedTracking.events]
        : buildInitialOrderTracking(selectedOrder).events;

    let nextEvents = existingEvents;
    if (appendMilestone) {
      const newEvent: OrderTrackingEvent = {
        id: `evt-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        timestamp: nowLabel,
        status: cleanStatus,
        location: draftLocation.trim().slice(0, 80) || undefined,
        note: draftNote.trim().slice(0, 300) || undefined,
      };
      nextEvents = [...existingEvents, newEvent].slice(-25);
    }

    const nextTracking: OrderTrackingRecord = {
      orderNumber: normalizeOrderTrackingId(selectedOrder.orderNumber),
      status: cleanStatus,
      courierName: draftCourierName.trim().slice(0, 80) || undefined,
      trackingNumber: draftTrackingNumber.trim().slice(0, 80) || undefined,
      trackingUrl: cleanTrackingUrl ? cleanTrackingUrl.slice(0, 300) : undefined,
      estimatedDelivery:
        draftEstimatedDelivery.trim().slice(0, 80) || undefined,
      destinationCity:
        selectedOrder.shipping.city.trim().slice(0, 80) || 'Pakistan',
      itemCount: Math.max(
        1,
        selectedOrder.items.reduce(
          (sum, item) => sum + Math.max(1, item.quantity || 1),
          0
        )
      ),
      orderDateLabel: selectedOrder.createdAt,
      updatedAtLabel: nowLabel,
      events: nextEvents,
    };

    setIsPublishing(true);
    setPublishError(null);
    setPublishMessage(null);

    try {
      await onPublishTracking(selectedOrder, nextTracking);
      if (appendMilestone) {
        setDraftLocation('');
        setDraftNote('');
      }
      setPublishMessage(
        appendMilestone
          ? `Published tracking update for #${selectedOrder.orderNumber}. Customers can see it immediately.`
          : `Saved courier & status details for #${selectedOrder.orderNumber}.`
      );
      window.setTimeout(() => setPublishMessage(null), 4000);
    } catch {
      setPublishError(
        'Could not publish tracking update. Check your internet connection and admin session.'
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!selectedOrder || !selectedTracking || isPublishing) return;
    if (selectedTracking.events.length <= 1) {
      setPublishError('At least one tracking milestone must remain on record.');
      return;
    }
    const nextEvents = selectedTracking.events.filter((ev) => ev.id !== eventId);
    const latestEvent = nextEvents[nextEvents.length - 1];
    const nextTracking: OrderTrackingRecord = {
      ...selectedTracking,
      status: latestEvent?.status || selectedTracking.status,
      updatedAtLabel: formatTrackingTimestampLabel(),
      events: nextEvents,
    };
    setIsPublishing(true);
    setPublishError(null);
    try {
      await onPublishTracking(selectedOrder, nextTracking);
      setDraftStatus(nextTracking.status);
      setPublishMessage('Removed timeline entry.');
      window.setTimeout(() => setPublishMessage(null), 3000);
    } catch {
      setPublishError('Could not remove timeline entry.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateManualOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onCreateManualOrder || isCreatingManual) return;

    const cleanOrderNum = normalizeOrderTrackingId(manualOrderNumber);
    if (!cleanOrderNum || cleanOrderNum.length < 3) {
      setManualError('Enter a valid Order Number (minimum 3 characters, e.g. FG-50120).');
      return;
    }
    if (
      orders.some(
        (o) => normalizeOrderTrackingId(o.orderNumber) === cleanOrderNum
      )
    ) {
      setManualError(`Order #${cleanOrderNum} already exists.`);
      return;
    }
    if (!manualCustomerName.trim() || manualCity.trim().length < 2) {
      setManualError('Enter the customer name and city (at least 2 characters).');
      return;
    }

    const totalNum = Math.max(0, Math.round(Number(manualTotalPkr) || 0));
    const dateLabel = new Date().toLocaleDateString('en-PK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const nowLabel = formatTrackingTimestampLabel();

    const newOrder: OrderRecord = {
      orderNumber: cleanOrderNum,
      createdAt: dateLabel,
      status: manualStatus.trim() || 'Confirmed — Preparing Shipment',
      items: [
        {
          productId: 'manual-order-item',
          name: manualItemName.trim() || 'Boutique Order Selection',
          variantName: 'Standard',
          volume: '1 Parcel',
          unitPrice: totalNum,
          quantity: 1,
          imageUrl: '/src/assets/images/product_boutique_clean_1795093197794.jpg',
        },
      ],
      subtotal: totalNum,
      discount: 0,
      shippingCost: 0,
      total: totalNum,
      paymentMethod: 'cod',
      shipping: {
        fullName: manualCustomerName.trim(),
        email: 'whatsapp-order@fgoldfashion.pk',
        phone: manualPhone.trim().length >= 6 ? manualPhone.trim() : '0300 0000000',
        address:
          manualAddress.trim().length >= 3
            ? manualAddress.trim()
            : `${manualCity.trim()}, Pakistan`,
        city: manualCity.trim(),
        postalCode: '00000',
      },
    };

    const initialTracking: OrderTrackingRecord = {
      orderNumber: cleanOrderNum,
      status: newOrder.status,
      courierName: manualCourier.trim() || undefined,
      trackingNumber: manualTrackingNo.trim() || undefined,
      destinationCity: manualCity.trim(),
      itemCount: 1,
      orderDateLabel: dateLabel,
      updatedAtLabel: nowLabel,
      events: [
        {
          id: `evt-${Date.now().toString(36)}`,
          timestamp: nowLabel,
          status: newOrder.status,
          location: `${storeName} Dispatch`,
          note: manualTrackingNo.trim()
            ? `Parcel registered${manualCourier.trim() ? ` with ${manualCourier.trim()}` : ''} (Tracking #${manualTrackingNo.trim()}).`
            : 'Order recorded and ready for dispatch updates.',
        },
      ],
    };

    setIsCreatingManual(true);
    setManualError(null);
    try {
      await onCreateManualOrder(newOrder, initialTracking);
      setSelectedOrderNumber(cleanOrderNum);
      setIsManualComposerOpen(false);
      setManualOrderNumber(`FG-${Math.floor(10000 + Math.random() * 90000)}`);
      setManualCustomerName('');
      setManualPhone('');
      setManualAddress('');
      setManualItemName('');
      setManualCourier('');
      setManualTrackingNo('');
      setPublishMessage(
        `Created Order #${cleanOrderNum} with live customer tracking enabled.`
      );
      window.setTimeout(() => setPublishMessage(null), 4000);
    } catch {
      setManualError('Could not save order. Please try again.');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const customerTrackingShareUrl = useMemo(() => {
    if (!selectedOrder || typeof window === 'undefined') return '';
    const norm = normalizeOrderTrackingId(selectedOrder.orderNumber);
    return `${window.location.origin}/?track=${encodeURIComponent(norm)}`;
  }, [selectedOrder]);

  const handleCopyShareLink = async () => {
    if (!customerTrackingShareUrl) return;
    try {
      await navigator.clipboard.writeText(customerTrackingShareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const customerUpdateWhatsAppUrl = useMemo(() => {
    if (!selectedOrder || !selectedTracking) return '';
    const lines = [
      `Assalam-o-Alaikum ${selectedOrder.shipping.fullName},`,
      `Update from ${storeName} for Order #${selectedOrder.orderNumber}:`,
      `Status: ${selectedTracking.status}`,
      selectedTracking.courierName
        ? `Courier: ${selectedTracking.courierName}`
        : null,
      selectedTracking.trackingNumber
        ? `Tracking #: ${selectedTracking.trackingNumber}`
        : null,
      selectedTracking.estimatedDelivery
        ? `Est. Delivery: ${selectedTracking.estimatedDelivery}`
        : null,
      customerTrackingShareUrl
        ? `Track live updates: ${customerTrackingShareUrl}`
        : null,
    ].filter(Boolean);
    return buildWhatsAppUrl(selectedOrder.shipping.phone, lines.join('\n'));
  }, [selectedOrder, selectedTracking, storeName, customerTrackingShareUrl]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Top Action Strip */}
      <div className="px-6 py-3 bg-white border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <p className="text-xs text-[#5A5A56]">
          Select any order to update its shipping stage, courier tracking #, and publish live updates to your customer&apos;s tracker.
        </p>
        {onCreateManualOrder && (
          <button
            type="button"
            onClick={() => setIsManualComposerOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap"
          >
            {isManualComposerOpen ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel New Order</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add WhatsApp / Manual Order</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Inline Manual / WhatsApp Order Creator */}
      {isManualComposerOpen && (
        <form
          onSubmit={handleCreateManualOrderSubmit}
          className="p-5 bg-[#FAFAFA] border-b border-[#E4E4E0] space-y-3 shrink-0"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
              Create Trackable WhatsApp / Manual Order
            </h4>
          </div>
          {manualError && (
            <p role="alert" className="text-xs text-[var(--accent)]">
              {manualError}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              required
              value={manualOrderNumber}
              onChange={(e) => setManualOrderNumber(e.target.value)}
              placeholder="Order # (e.g. FG-50120)"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
            <input
              type="text"
              required
              value={manualCustomerName}
              onChange={(e) => setManualCustomerName(e.target.value)}
              placeholder="Customer Name *"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
            <input
              type="tel"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              placeholder="WhatsApp / Phone"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
            <input
              type="text"
              required
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="Destination City *"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
            <input
              type="text"
              value={manualItemName}
              onChange={(e) => setManualItemName(e.target.value)}
              placeholder="Item(s) ordered"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
            <input
              type="number"
              min={0}
              value={manualTotalPkr}
              onChange={(e) => setManualTotalPkr(e.target.value)}
              placeholder="Total PKR"
              className="h-9 px-3 text-xs tabular-nums bg-white border border-[#D4D4CE] rounded-md"
            />
            <input
              type="text"
              value={manualCourier}
              onChange={(e) => setManualCourier(e.target.value)}
              placeholder="Courier (e.g. TCS)"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
            <input
              type="text"
              value={manualTrackingNo}
              onChange={(e) => setManualTrackingNo(e.target.value)}
              placeholder="Tracking # (Optional)"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Street Address (Private — never shown on public tracker)"
              className="h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md"
            />
            <div className="flex items-center gap-2 justify-end">
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md"
              >
                {ORDER_TRACKING_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isCreatingManual}
                className="h-9 px-4 text-xs font-medium bg-[var(--accent)] text-white rounded-md hover:opacity-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isCreatingManual ? 'Saving...' : 'Create & Enable Tracking'}
              </button>
            </div>
          </div>
        </form>
      )}

      {orders.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="py-16 px-6 text-center bg-white border border-[#E4E4E0] rounded-lg space-y-3">
            <Truck
              className="w-8 h-8 text-[#5A5A56]/60 mx-auto"
              strokeWidth={1.5}
            />
            <h3 className="font-serif text-2xl text-[#141413]">
              No customer orders yet
            </h3>
            <p className="text-xs text-[#5A5A56] max-w-md mx-auto leading-relaxed">
              When customers place an order at checkout (or when you add a WhatsApp order above), it appears here so you can publish courier details and live delivery milestones time to time.
            </p>
            {onResetSampleOrders && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onResetSampleOrders}
                  className="px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
                >
                  Load Sample Orders to Test Tracking
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Sidebar: Order List & Filter */}
          <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-[#E4E4E0] bg-white flex flex-col max-h-[38vh] lg:max-h-none shrink-0">
            <div className="p-4 border-b border-[#E4E4E0] space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5A5A56] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, name, city, or tracking #"
                  className="w-full h-9 pl-8 pr-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-md">
                {(
                  [
                    { id: 'all', label: `All (${orders.length})` },
                    { id: 'active', label: 'In Progress' },
                    { id: 'delivered', label: 'Delivered' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#5A5A56] hover:text-[#141413]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E4E4E0]">
              {filteredOrders.length === 0 ? (
                <p className="p-5 text-xs text-[#5A5A56] text-center">
                  No matching orders found.
                </p>
              ) : (
                filteredOrders.map((order) => {
                  const norm = normalizeOrderTrackingId(order.orderNumber);
                  const track = trackingRecords[norm];
                  const displayStatus = track?.status || order.status;
                  const isSelected =
                    selectedOrder &&
                    normalizeOrderTrackingId(selectedOrder.orderNumber) === norm;

                  return (
                    <button
                      key={order.orderNumber}
                      type="button"
                      onClick={() => setSelectedOrderNumber(order.orderNumber)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-[#F2F2F0]/80 border-l-2 border-l-[var(--accent)]'
                          : 'hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#141413] tabular-nums">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[11px] font-medium text-[#141413] tabular-nums">
                          {formatPKR(order.total)}
                        </span>
                      </div>
                      <p className="text-xs text-[#141413] truncate">
                        {order.shipping.fullName} · {order.shipping.city}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A5A56]">
                        <span className="truncate font-medium text-[var(--accent)]">
                          {displayStatus}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {track
                            ? `${track.events.length} ${
                                track.events.length === 1 ? 'update' : 'updates'
                              }`
                            : order.createdAt}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Area: Selected Order Details + Live Tracking Publisher */}
          {selectedOrder && selectedTracking && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAFAFA]">
              {/* Selected Order Summary Card (Admin View) */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-2xl font-medium text-[#141413] tabular-nums">
                        Order #{selectedOrder.orderNumber}
                      </h3>
                      <span className="text-xs text-[#5A5A56]">
                        · {selectedOrder.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#141413] mt-1">
                      <span className="font-medium">
                        {selectedOrder.shipping.fullName}
                      </span>{' '}
                      · {selectedOrder.shipping.phone} ·{' '}
                      {selectedOrder.shipping.email}
                    </p>
                    <p className="text-[11px] text-[#5A5A56] mt-0.5">
                      {selectedOrder.shipping.address},{' '}
                      {selectedOrder.shipping.city},{' '}
                      {selectedOrder.shipping.postalCode}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer whitespace-nowrap"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Tracking Link Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Customer Link</span>
                        </>
                      )}
                    </button>

                    {customerUpdateWhatsAppUrl && (
                      <a
                        href={customerUpdateWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[#141413] text-white rounded hover:bg-[#2B2B29] whitespace-nowrap"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>Send Update on WhatsApp</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E4E4E0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="text-[#5A5A56]">
                    {selectedOrder.items
                      .map((i) => `${i.quantity}x ${i.name} (${i.variantName})`)
                      .join(', ')}
                  </p>
                  <p className="font-semibold text-[#141413] tabular-nums shrink-0">
                    {formatPKR(selectedOrder.total)} ·{' '}
                    {formatOrderPaymentLabel(selectedOrder.paymentMethod)}
                  </p>
                </div>
              </div>

              {/* Publish Tracking Update Form */}
              <form
                onSubmit={(e) => handlePublishUpdate(e, true)}
                className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PackageCheck
                      className="w-4 h-4 text-[var(--accent)]"
                      strokeWidth={1.75}
                    />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                      Publish Live Tracking Update
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#5A5A56]">
                    Visible live to customer when tracking #
                    {selectedOrder.orderNumber}
                  </span>
                </div>

                {publishError && (
                  <p
                    role="alert"
                    className="p-3 text-xs text-[var(--accent)] bg-[var(--accent)]/8 border border-[var(--accent)]/25 rounded-md"
                  >
                    {publishError}
                  </p>
                )}

                {publishMessage && (
                  <p
                    role="status"
                    className="p-3 text-xs text-[#141413] bg-[#F2F2F0] border border-[#D4D4CE] rounded-md flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>{publishMessage}</span>
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Order Status Stage *
                    </label>
                    <select
                      value={
                        ORDER_TRACKING_STATUSES.includes(draftStatus)
                          ? draftStatus
                          : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          setDraftStatus(e.target.value);
                        }
                      }}
                      className="w-full h-10 px-3 text-xs font-medium bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    >
                      {ORDER_TRACKING_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                      {!ORDER_TRACKING_STATUSES.includes(draftStatus) && (
                        <option value="__custom__">
                          Custom Status ({draftStatus})
                        </option>
                      )}
                    </select>
                    <input
                      type="text"
                      maxLength={80}
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value)}
                      placeholder="Or type a custom status label..."
                      aria-label="Custom order status text"
                      className="mt-2 w-full h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Estimated Delivery
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={draftEstimatedDelivery}
                      onChange={(e) => setDraftEstimatedDelivery(e.target.value)}
                      placeholder="e.g. Nov 28, 2026 or 2–3 Working Days"
                      className="w-full h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Courier Service
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={draftCourierName}
                      onChange={(e) => setDraftCourierName(e.target.value)}
                      placeholder="e.g. TCS, Leopards, Trax"
                      className="w-full h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {COURIER_PRESETS.map((courier) => (
                        <button
                          key={courier}
                          type="button"
                          onClick={() => setDraftCourierName(courier)}
                          className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                            draftCourierName === courier
                              ? 'bg-[#141413] text-white border-[#141413]'
                              : 'bg-[#FAFAFA] text-[#5A5A56] border-[#E4E4E0] hover:border-[#141413]'
                          }`}
                        >
                          {courier}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Courier Tracking Number
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={draftTrackingNumber}
                      onChange={(e) => setDraftTrackingNumber(e.target.value)}
                      placeholder="e.g. 7789120451"
                      className="w-full h-10 px-3 text-xs tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Courier Tracking URL (Optional)
                    </label>
                    <input
                      type="url"
                      maxLength={300}
                      value={draftTrackingUrl}
                      onChange={(e) => setDraftTrackingUrl(e.target.value)}
                      placeholder="https://www.tcsexpress.com/track/..."
                      className="w-full h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E4E4E0] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      New Milestone Location (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={draftLocation}
                      onChange={(e) => setDraftLocation(e.target.value)}
                      placeholder={`e.g. Lahore Dispatch Hub / ${selectedOrder.shipping.city}`}
                      className="w-full h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141413] mb-1">
                      Update Message for Customer (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="e.g. Handed over to TCS rider; expected delivery tomorrow."
                      className="w-full h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={(e) => handlePublishUpdate(e, false)}
                    className="px-4 py-2.5 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    Save Courier Info Only
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isPublishing
                        ? 'Publishing...'
                        : 'Publish Tracking Update to Customer'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Published Customer Timeline */}
              <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                      Published Customer Timeline ({selectedTracking.events.length}/25)
                    </h4>
                    <p className="text-[11px] text-[#5A5A56]">
                      Newest update appears at the top of the customer&apos;s live tracking window.
                    </p>
                  </div>
                  <span className="text-[11px] text-[#5A5A56]">
                    City shown publicly: {selectedTracking.destinationCity}
                  </span>
                </div>

                <div className="divide-y divide-[#E4E4E0] border border-[#E4E4E0] rounded-md">
                  {[...selectedTracking.events].reverse().map((ev, idx) => (
                    <div
                      key={ev.id}
                      className="p-3.5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#141413]">
                            {ev.status}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                              Latest
                            </span>
                          )}
                          <span className="text-[11px] text-[#5A5A56] tabular-nums">
                            · {ev.timestamp}
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

                      {selectedTracking.events.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          aria-label={`Remove ${ev.status} update`}
                          className="p-1.5 text-[#5A5A56] hover:text-[#6D2932] rounded cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
