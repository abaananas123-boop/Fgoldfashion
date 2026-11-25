import { FormEvent, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  CategoryFilter,
  DEFAULT_CATEGORIES,
  HomeLink,
  OrderRecord,
  SiteConfig,
  SiteVisibilityConfig,
} from '../types';
import { isValidSubscriberEmail, normalizeSubscriberEmail } from '../firebase';
import {
  buildGoogleReviewUrl,
  buildWhatsAppUrl,
  isExternalSiteLink,
  normalizeSiteLinkUrl,
} from '../utils/social';
import { ShareStoreControl } from './ShareStoreControl';
import { SocialPlatformIcon, WhatsAppIcon } from './SocialIcons';

interface FooterProps {
  storeName: string;
  heroHeadline?: string;
  footerTagline: string;
  socialLinks: SiteConfig['socialLinks'];
  catalogSection?: SiteConfig['catalogSection'];
  seo?: SiteConfig['seo'];
  teamMembers?: SiteConfig['teamMembers'];
  categories?: string[];
  customLinks?: HomeLink[];
  visibility?: SiteVisibilityConfig;
  isHomeEditMode?: boolean;
  onNavigateCategory: (category: CategoryFilter) => void;
  onNavigateLink?: (url: string) => void;
  latestOrder: OrderRecord | null;
  onViewOrderReceipt: () => void;
  onOpenAccount?: () => void;
  isAdmin: boolean;
  userEmail: string | null;
  authLoading: boolean;
  authNotice: string | null;
  onAdminSignIn: () => void;
  onSignOut: () => void;
  onOpenCatalogManager: () => void;
  onOpenSocialManager: () => void;
  onOpenSeoMembersManager: () => void;
  onAddFooterLink?: () => void;
  onEditFooterLink?: (link: HomeLink) => void;
  onDeleteFooterLink?: (linkId: string) => void;
  onDeleteSocialAccount?: (accountId: string) => void;
  onDeleteTeamMember?: (memberId: string) => void;
  onToggleTeamMembersBox?: () => void;
  onToggleSeoBox?: () => void;
  onEditFooterConfig?: () => void;
  onToggleFooterNewsletter?: () => void;
  onSubscribeNewsletter?: (email: string) => Promise<void>;
}

const NEWSLETTER_STORAGE_KEY = 'fgold_newsletter_email_v1';

export function Footer({
  storeName,
  heroHeadline = 'All-Department Boutique, Jewellery, Apparel & Lifestyle Store',
  footerTagline,
  socialLinks,
  catalogSection,
  seo,
  teamMembers = [],
  categories = DEFAULT_CATEGORIES,
  customLinks = [],
  visibility,
  isHomeEditMode = false,
  onNavigateCategory,
  onNavigateLink = () => {},
  latestOrder,
  onViewOrderReceipt,
  onOpenAccount,
  isAdmin,
  userEmail,
  authLoading,
  authNotice,
  onAdminSignIn,
  onSignOut,
  onOpenCatalogManager,
  onOpenSocialManager,
  onOpenSeoMembersManager,
  onAddFooterLink,
  onEditFooterLink,
  onDeleteFooterLink,
  onDeleteSocialAccount,
  onDeleteTeamMember,
  onToggleTeamMembersBox,
  onToggleSeoBox,
  onEditFooterConfig,
  onToggleFooterNewsletter,
  onSubscribeNewsletter,
}: FooterProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(NEWSLETTER_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const handleNewsletterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNewsletterError(null);

    const normalized = normalizeSubscriberEmail(newsletterEmail);
    if (!isValidSubscriberEmail(normalized)) {
      setNewsletterError('Please enter a valid email address.');
      return;
    }

    if (!onSubscribeNewsletter) return;

    setNewsletterSubmitting(true);
    try {
      await onSubscribeNewsletter(normalized);
      setSubscribedEmail(normalized);
      setNewsletterEmail('');
      try {
        window.localStorage.setItem(NEWSLETTER_STORAGE_KEY, normalized);
      } catch {
        // Ignore storage errors
      }
    } catch {
      setNewsletterError(
        'Could not complete your subscription right now. Please try again.'
      );
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const whatsappUrl = buildWhatsAppUrl(
    socialLinks.whatsappNumber,
    socialLinks.whatsappMessage
  );
  const googleReviewUrl = buildGoogleReviewUrl(
    storeName,
    socialLinks.googleReviewUrl
  );
  const footerCustomLinks = customLinks.filter((l) => l.placement === 'footer');
  const hasSocials =
    Boolean(whatsappUrl) || socialLinks.accounts.length > 0;
  const showTeamMembers = visibility?.showTeamMembers ?? true;
  const showSeoCard = visibility?.showSeoCard ?? true;
  const showNewsletter = visibility?.showFooterNewsletter ?? true;

  const nlEyebrow = catalogSection?.newsletterEyebrow?.trim() || 'Newsletter';
  const nlHeading =
    catalogSection?.newsletterHeading?.trim() ||
    'Receive seasonal releases & private collection notes';
  const nlDesc =
    catalogSection?.newsletterDescription?.trim() ||
    `New boutique dresses, jewellery launches, kids collections, and subscriber-only PKR offers from ${storeName}.`;
  const nlBtn = catalogSection?.newsletterButtonLabel?.trim() || 'Subscribe';

  return (
    <footer id="footer-concierge" className="border-t border-[#E4E4E0] bg-[#FAFAFA] pt-12 pb-24">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-serif text-2xl font-medium text-[#141413]">
                {storeName}
              </p>
              {isHomeEditMode && onEditFooterConfig && (
                <button
                  type="button"
                  onClick={onEditFooterConfig}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Footer &amp; Newsletter</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[#5A5A56] mt-1">{footerTagline}</p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#5A5A56]"
          >
            <button
              type="button"
              onClick={() => onNavigateCategory('All')}
              className="hover:text-[#141413] transition-colors cursor-pointer"
            >
              All Departments
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onNavigateCategory(cat)}
                className="hover:text-[#141413] transition-colors cursor-pointer"
              >
                {cat}
              </button>
            ))}

            {footerCustomLinks.map((link) => {
              const resolvedUrl = normalizeSiteLinkUrl(link.url);
              const openNewTab =
                link.openInNewTab ?? isExternalSiteLink(resolvedUrl);

              return (
                <span key={link.id} className="inline-flex items-center gap-1">
                  {openNewTab ? (
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#141413] hover:text-[var(--accent)] transition-colors"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-3 h-3 text-[#8A8A84]" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigateLink(resolvedUrl)}
                      className="text-[#141413] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  )}

                  {isHomeEditMode && (
                    <span className="inline-flex items-center gap-0.5 ml-0.5">
                      {onEditFooterLink && (
                        <button
                          type="button"
                          onClick={() => onEditFooterLink(link)}
                          aria-label={`Edit ${link.label}`}
                          className="p-0.5 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteFooterLink && (
                        <button
                          type="button"
                          onClick={() => onDeleteFooterLink(link.id)}
                          aria-label={`Delete ${link.label}`}
                          className="p-0.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  )}
                </span>
              );
            })}

            {isHomeEditMode && onAddFooterLink && (
              <button
                type="button"
                onClick={onAddFooterLink}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Footer Link</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={onOpenCatalogManager}
                className="hover:text-[#141413] transition-colors cursor-pointer"
              >
                Store Manager
              </button>
            )}
            {onOpenAccount && (
              <button
                type="button"
                onClick={onOpenAccount}
                className="text-[#141413] hover:text-[#F85606] transition-colors cursor-pointer"
              >
                My Account &amp; Orders
              </button>
            )}
            {isAdmin && latestOrder && (
              <button
                type="button"
                onClick={onViewOrderReceipt}
                className="text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer"
              >
                Latest Order #{latestOrder.orderNumber}
              </button>
            )}
          </nav>

          <p className="text-xs text-[#5A5A56]">
            © {new Date().getFullYear()} {storeName}
          </p>
        </div>

        {/* Newsletter Subscription Section */}
        {!showNewsletter ? (
          isHomeEditMode &&
          onToggleFooterNewsletter && (
            <div className="px-4 py-3 bg-white border border-dashed border-[#D4D4CE] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#5A5A56]">
                Newsletter Box is hidden from shoppers.
              </span>
              <button
                type="button"
                onClick={onToggleFooterNewsletter}
                className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Newsletter</span>
              </button>
            </div>
          )
        ) : (
          <section
            aria-label="Newsletter subscription"
            className="p-5 sm:p-6 bg-white border border-[#E4E4E0] rounded-lg space-y-4"
          >
            {isHomeEditMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFEFED]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A56]">
                  Newsletter Box
                </span>
                <div className="flex items-center gap-2">
                  {onEditFooterConfig && (
                    <button
                      type="button"
                      onClick={onEditFooterConfig}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Newsletter Text</span>
                    </button>
                  )}
                  {onToggleFooterNewsletter && (
                    <button
                      type="button"
                      onClick={onToggleFooterNewsletter}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] bg-white border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Newsletter</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1 max-w-xl">
                <p className="text-[11px] font-medium tracking-widest uppercase text-[var(--accent)]">
                  {nlEyebrow}
                </p>
                <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#141413]">
                  {nlHeading}
                </h3>
                <p className="text-xs text-[#5A5A56] leading-relaxed">
                  {nlDesc}
                </p>
              </div>

              <div className="w-full lg:w-auto lg:min-w-[360px] space-y-2">
                {subscribedEmail ? (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md text-xs"
                  >
                    <div className="flex items-center gap-2 text-[#141413] min-w-0">
                      <CheckCircle2
                        className="w-4 h-4 text-[var(--accent)] shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="truncate">
                        Subscribed with <strong className="font-medium">{subscribedEmail}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubscribedEmail(null);
                        setNewsletterError(null);
                      }}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer shrink-0"
                    >
                      Add another email
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleNewsletterSubmit}
                    noValidate
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <label htmlFor="footer-newsletter-email" className="sr-only">
                      Email address
                    </label>
                    <div className="relative flex-1">
                      <Mail
                        className="w-3.5 h-3.5 text-[#5A5A56] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        strokeWidth={1.75}
                      />
                      <input
                        id="footer-newsletter-email"
                        type="email"
                        required
                        maxLength={160}
                        autoComplete="email"
                        value={newsletterEmail}
                        onChange={(e) => {
                          setNewsletterEmail(e.target.value);
                          if (newsletterError) setNewsletterError(null);
                        }}
                        placeholder="Enter your email address"
                        className="w-full h-10 pl-9 pr-3 text-xs bg-[#FAFAFA] text-[#141413] border border-[#D4D4CE] rounded-md placeholder:text-[#8A8A84] focus:outline-none focus:border-[#141413]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={newsletterSubmitting || !newsletterEmail.trim()}
                      className="h-10 px-5 text-xs font-medium bg-[#141413] text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                    >
                      {newsletterSubmitting ? 'Subscribing...' : nlBtn}
                    </button>
                  </form>
                )}
                {newsletterError && (
                  <p role="alert" className="text-[11px] text-[var(--accent)]">
                    {newsletterError}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Members of f. Gold & fashion & SEO Store Profile */}
        {(showTeamMembers || showSeoCard || isHomeEditMode) && (
          <div className="pt-6 border-t border-[#E4E4E0] grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Team Members Directory */}
            {(showTeamMembers || isHomeEditMode) && (
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users
                      className="w-3.5 h-3.5 text-[var(--accent)]"
                      strokeWidth={1.75}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                      Members of {storeName}
                      {!showTeamMembers ? ' (Hidden)' : ''}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={onOpenSeoMembersManager}
                        className="text-[11px] font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer"
                      >
                        + Add / Edit Members
                      </button>
                    )}
                    {isHomeEditMode && onToggleTeamMembersBox && (
                      <button
                        type="button"
                        onClick={onToggleTeamMembersBox}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{showTeamMembers ? 'Hide Box' : 'Show Box'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {showTeamMembers &&
                  (teamMembers.length === 0 ? (
                    <p className="text-xs text-[#5A5A56]">
                      {isAdmin
                        ? 'Add team members, founders, and department leads using Manage SEO & Members below.'
                        : `${storeName} Boutique & Client Care Team`}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {teamMembers.map((member) => {
                        const memberWaUrl = member.phone
                          ? buildWhatsAppUrl(
                              member.phone,
                              `Assalam-o-Alaikum ${member.name}, reaching out via ${storeName}.`
                            )
                          : '';
                        return (
                          <div
                            key={member.id}
                            className="p-3 bg-white border border-[#E4E4E0] rounded-md space-y-1"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-xs font-semibold text-[#141413]">
                                {member.name}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-medium text-[var(--accent)]">
                                  {member.role}
                                </span>
                                {isHomeEditMode && onDeleteTeamMember && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onDeleteTeamMember(member.id)
                                    }
                                    aria-label={`Delete ${member.name}`}
                                    className="p-0.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {member.specialty && (
                              <p className="text-[11px] text-[#5A5A56]">
                                {member.specialty}
                              </p>
                            )}
                            {(member.phone || member.email) && (
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#5A5A56]">
                                {member.phone &&
                                  (memberWaUrl ? (
                                    <a
                                      href={memberWaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 hover:text-[#141413] tabular-nums"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{member.phone}</span>
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 tabular-nums">
                                      <Phone className="w-3 h-3" />
                                      <span>{member.phone}</span>
                                    </span>
                                  ))}
                                {member.email && (
                                  <a
                                    href={`mailto:${member.email}`}
                                    className="inline-flex items-center gap-1 hover:text-[#141413] truncate"
                                  >
                                    <Mail className="w-3 h-3 shrink-0" />
                                    <span className="truncate">
                                      {member.email}
                                    </span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            )}

            {/* SEO & Verified Storefront Profile */}
            {(showSeoCard || isHomeEditMode) && (
              <div className="lg:col-span-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe
                      className="w-3.5 h-3.5 text-[var(--accent)]"
                      strokeWidth={1.75}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                      Search Profile &amp; Store SEO
                      {!showSeoCard ? ' (Hidden)' : ''}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={onOpenSeoMembersManager}
                        className="text-[11px] font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer"
                      >
                        Edit SEO Details
                      </button>
                    )}
                    {isHomeEditMode && onToggleSeoBox && (
                      <button
                        type="button"
                        onClick={onToggleSeoBox}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{showSeoCard ? 'Hide Box' : 'Show Box'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {showSeoCard && (
                  <div className="p-3.5 bg-white border border-[#E4E4E0] rounded-md space-y-1.5">
                    <p className="text-xs font-medium text-[#141413]">
                      {seo?.metaTitle || storeName}
                    </p>
                    <p className="text-[11px] text-[#5A5A56] leading-relaxed">
                      {seo?.metaDescription || footerTagline}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-[#5A5A56]">
                      <span>
                        Location:{' '}
                        {[seo?.city || 'Lahore', seo?.country || 'Pakistan']
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Currency: PKR (Rs.)</span>
                      {seo?.canonicalUrl && (
                        <>
                          <span aria-hidden="true">·</span>
                          <a
                            href={seo.canonicalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent)] hover:underline truncate max-w-[200px]"
                          >
                            {seo.canonicalUrl}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Social Media & WhatsApp Bar + Admin Access */}
        <div className="pt-6 border-t border-[#E4E4E0] flex flex-wrap items-center justify-between gap-4">
          {hasSocials ? (
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#5A5A56]">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#141413] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
                >
                  <WhatsAppIcon className="w-4 h-4 text-[var(--accent)]" />
                  <span>WhatsApp ({socialLinks.whatsappNumber})</span>
                </a>
              )}
              {socialLinks.accounts.map((acc) => (
                <span key={acc.id} className="inline-flex items-center gap-1">
                  <a
                    href={acc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#141413] transition-colors whitespace-nowrap"
                  >
                    <SocialPlatformIcon
                      platform={acc.platform}
                      className="w-3.5 h-3.5"
                    />
                    <span>{acc.label}</span>
                  </a>
                  {isHomeEditMode && onDeleteSocialAccount && (
                    <button
                      type="button"
                      onClick={() => onDeleteSocialAccount(acc.id)}
                      aria-label={`Delete ${acc.label}`}
                      className="p-0.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5A5A56]">
              {isAdmin
                ? 'Connect your TikTok, Instagram, Facebook, and WhatsApp store accounts.'
                : `${storeName} — All-Department Boutique & Lifestyle Store`}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#141413] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
            >
              <Star
                className="w-3.5 h-3.5 text-[var(--accent)]"
                strokeWidth={1.75}
              />
              <span>Review {storeName} on Google</span>
            </a>
            <span aria-hidden="true" className="text-[#D4D4CE]">
              ·
            </span>
            <ShareStoreControl
              storeName={storeName}
              headline={heroHeadline}
              variant="footer"
            />
            <span aria-hidden="true" className="text-[#D4D4CE]">
              ·
            </span>
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={onOpenSeoMembersManager}
                  className="text-xs font-medium text-[#141413] hover:text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                >
                  SEO &amp; Members Manager
                </button>
                <span aria-hidden="true" className="text-[#D4D4CE]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={onOpenSocialManager}
                  className="text-xs font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                >
                  {hasSocials
                    ? 'Edit Social & WhatsApp Links'
                    : 'Add TikTok, WhatsApp & Social Links'}
                </button>
                <span aria-hidden="true" className="text-[#D4D4CE]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-xs text-[#5A5A56] hover:text-[#141413] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Sign Out ({userEmail})
                </button>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {authNotice && (
                  <span className="text-xs text-[var(--accent)]">
                    {authNotice}
                  </span>
                )}
                {userEmail && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-xs text-[#5A5A56] hover:text-[#141413] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Sign Out ({userEmail})
                  </button>
                )}
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={onAdminSignIn}
                  className="text-xs font-medium text-[#5A5A56] hover:text-[#141413] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {authLoading
                    ? 'Checking Admin...'
                    : userEmail
                      ? 'Switch to Admin Account'
                      : 'Admin Sign In'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
