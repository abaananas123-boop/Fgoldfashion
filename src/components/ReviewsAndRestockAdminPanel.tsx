import { useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquareHeart,
  Star,
  Trash2,
} from 'lucide-react';
import { ProductReview, RestockRequest } from '../types';
import { buildWhatsAppUrl } from '../utils/social';
import { WhatsAppIcon } from './SocialIcons';

interface ReviewsAndRestockAdminPanelProps {
  reviews: ProductReview[];
  restockRequests: RestockRequest[];
  storeName: string;
  onModerateReview: (reviewId: string, status: 'approved' | 'pending') => Promise<void> | void;
  onDeleteReview: (reviewId: string) => Promise<void> | void;
  onDeleteRestockRequest: (requestId: string) => Promise<void> | void;
}

export function ReviewsAndRestockAdminPanel({
  reviews,
  restockRequests,
  storeName,
  onModerateReview,
  onDeleteReview,
  onDeleteRestockRequest,
}: ReviewsAndRestockAdminPanelProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => reviews.filter((r) => r.status === 'pending').length,
    [reviews]
  );

  const filteredReviews = useMemo(() => {
    if (filter === 'pending') return reviews.filter((r) => r.status === 'pending');
    if (filter === 'approved') return reviews.filter((r) => r.status === 'approved');
    return reviews;
  }, [reviews, filter]);

  const handleToggleStatus = async (review: ProductReview) => {
    setBusyId(review.id);
    try {
      await onModerateReview(
        review.id,
        review.status === 'approved' ? 'pending' : 'approved'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Customer Reviews Moderation */}
      <div className="bg-white border border-[#E4E4E0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MessageSquareHeart className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[#141413]">
                Customer Reviews Moderation ({reviews.length})
              </h3>
              <p className="text-[11px] text-[#5A5A56]">
                New customer reviews arrive as pending until approved. Only approved reviews are visible on the storefront.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-md">
            {(
              [
                { id: 'all', label: `All (${reviews.length})` },
                { id: 'pending', label: `Pending (${pendingCount})` },
                { id: 'approved', label: `Approved (${reviews.length - pendingCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <p className="p-6 text-xs text-[#5A5A56] text-center">
            No customer reviews in this view yet.
          </p>
        ) : (
          <div className="divide-y divide-[#E4E4E0]">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {rev.photoUrl && (
                    <a
                      href={rev.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 rounded-md overflow-hidden border border-[#E4E4E0] bg-[#F2F2F0] shrink-0"
                    >
                      <img
                        src={rev.photoUrl}
                        alt={`Customer photo by ${rev.authorName}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#141413]">
                        {rev.authorName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[var(--accent)]">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3 h-3 ${
                              idx < rev.rating
                                ? 'fill-current'
                                : 'text-[#D4D4CE]'
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-[11px] text-[#5A5A56]">
                        on <strong className="text-[#141413]">{rev.productName}</strong>
                      </span>
                      <span className="text-[11px] text-[#5A5A56]">
                        · {rev.createdAtLabel}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                          rev.status === 'approved'
                            ? 'text-[#2D6A4F]'
                            : 'text-[var(--accent)]'
                        }`}
                      >
                        {rev.status === 'approved' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {rev.status}
                      </span>
                    </div>
                    {rev.fitNote && (
                      <p className="text-[11px] text-[#5A5A56]">
                        Fit / Quality Note: <span className="text-[#141413]">{rev.fitNote}</span>
                      </p>
                    )}
                    <p className="text-xs text-[#141413] leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === rev.id}
                    onClick={() => handleToggleStatus(rev)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                      rev.status === 'approved'
                        ? 'bg-white text-[#5A5A56] border-[#D4D4CE] hover:border-[#141413]'
                        : 'bg-[#141413] text-white border-[#141413] hover:bg-[#2B2B29]'
                    }`}
                  >
                    {rev.status === 'approved' ? 'Move to Pending' : 'Approve & Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteReview(rev.id)}
                    aria-label="Delete review"
                    className="p-1.5 text-[#5A5A56] hover:text-[#6D2932] rounded border border-transparent hover:border-[#E4E4E0] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sold-Out Restock Requests */}
      <div className="bg-white border border-[#E4E4E0] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E4E0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[#141413]">
                Sold-Out &ldquo;Notify Me&rdquo; Restock Requests ({restockRequests.length})
              </h3>
              <p className="text-[11px] text-[#5A5A56]">
                Customers requesting alerts when sold-out products return in stock. Reply directly via WhatsApp or email once restocked.
              </p>
            </div>
          </div>
        </div>

        {restockRequests.length === 0 ? (
          <p className="p-6 text-xs text-[#5A5A56] text-center">
            No restock notification requests yet.
          </p>
        ) : (
          <div className="divide-y divide-[#E4E4E0]">
            {restockRequests.map((req) => {
              const digits = req.contact.replace(/\D/g, '');
              const looksLikePhone = digits.length >= 10 && !req.contact.includes('@');
              const waUrl = looksLikePhone
                ? buildWhatsAppUrl(
                    req.contact,
                    `Assalam-o-Alaikum! Good news from ${storeName}: "${req.productName}" (${req.variantName}) is back in stock!`
                  )
                : '';

              return (
                <div
                  key={req.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#FAFAFA]"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-[#141413]">
                      {req.productName}{' '}
                      <span className="text-[#5A5A56] font-normal">
                        ({req.variantName})
                      </span>
                    </p>
                    <p className="text-[11px] text-[#5A5A56] tabular-nums">
                      Contact: <span className="text-[#141413] font-medium">{req.contact}</span> · Requested {req.createdAtLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[#141413] text-white rounded hover:bg-[#2B2B29] whitespace-nowrap"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>Notify on WhatsApp</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteRestockRequest(req.id)}
                      aria-label="Remove restock request"
                      className="p-1.5 text-[#5A5A56] hover:text-[#6D2932] rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
