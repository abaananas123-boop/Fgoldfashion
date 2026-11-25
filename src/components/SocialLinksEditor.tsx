import { FormEvent, useEffect, useState } from 'react';
import { ExternalLink, Plus, Star, Trash2 } from 'lucide-react';
import { SiteConfig, SocialAccount, SocialPlatform } from '../types';
import {
  SOCIAL_PLATFORM_LABELS,
  buildGoogleReviewUrl,
  buildWhatsAppUrl,
  normalizeSocialUrl,
} from '../utils/social';
import { SocialPlatformIcon, WhatsAppIcon } from './SocialIcons';

interface SocialLinksEditorProps {
  siteConfig: SiteConfig;
  onSaveSiteConfig: (next: SiteConfig) => void;
}

const QUICK_PLATFORMS: Array<{
  platform: SocialPlatform;
  placeholderHandle: string;
  placeholderUrl: string;
}> = [
  {
    platform: 'tiktok',
    placeholderHandle: '@fgoldfashion',
    placeholderUrl: 'https://www.tiktok.com/@fgoldfashion',
  },
  {
    platform: 'instagram',
    placeholderHandle: '@fgoldfashion',
    placeholderUrl: 'https://www.instagram.com/fgoldfashion',
  },
  {
    platform: 'facebook',
    placeholderHandle: 'f. Gold & fashion',
    placeholderUrl: 'https://www.facebook.com/fgoldfashion',
  },
  {
    platform: 'youtube',
    placeholderHandle: '@fgoldfashion',
    placeholderUrl: 'https://www.youtube.com/@fgoldfashion',
  },
  {
    platform: 'snapchat',
    placeholderHandle: 'fgoldfashion',
    placeholderUrl: 'https://www.snapchat.com/add/fgoldfashion',
  },
  {
    platform: 'pinterest',
    placeholderHandle: 'fgoldfashion',
    placeholderUrl: 'https://www.pinterest.com/fgoldfashion',
  },
  {
    platform: 'x',
    placeholderHandle: '@fgoldfashion',
    placeholderUrl: 'https://x.com/fgoldfashion',
  },
  {
    platform: 'other',
    placeholderHandle: 'Official Link',
    placeholderUrl: 'https://example.com',
  },
];

export function SocialLinksEditor({
  siteConfig,
  onSaveSiteConfig,
}: SocialLinksEditorProps) {
  const [whatsappNumber, setWhatsappNumber] = useState(
    siteConfig.socialLinks.whatsappNumber
  );
  const [whatsappMessage, setWhatsappMessage] = useState(
    siteConfig.socialLinks.whatsappMessage
  );
  const [showOnProductPage, setShowOnProductPage] = useState(
    siteConfig.socialLinks.showOnProductPage
  );
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    siteConfig.socialLinks.googleReviewUrl ?? ''
  );
  const [accounts, setAccounts] = useState<SocialAccount[]>(
    siteConfig.socialLinks.accounts
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setWhatsappNumber(siteConfig.socialLinks.whatsappNumber);
    setWhatsappMessage(siteConfig.socialLinks.whatsappMessage);
    setShowOnProductPage(siteConfig.socialLinks.showOnProductPage);
    setGoogleReviewUrl(siteConfig.socialLinks.googleReviewUrl ?? '');
    setAccounts(siteConfig.socialLinks.accounts);
  }, [siteConfig]);

  const addAccount = (platform: SocialPlatform) => {
    const next: SocialAccount = {
      id: `social-${platform}-${Date.now().toString(36)}`,
      platform,
      label: '',
      url: '',
    };
    setAccounts((prev) => [...prev, next]);
  };

  const updateAccount = (index: number, patch: Partial<SocialAccount>) => {
    setAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, ...patch } : acc))
    );
  };

  const removeAccount = (index: number) => {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanedAccounts = accounts
      .filter((acc) => acc.url.trim().length > 0 || acc.label.trim().length > 0)
      .map((acc) => {
        const rawTarget = acc.url.trim() || acc.label.trim();
        return {
          ...acc,
          label:
            acc.label.trim() || SOCIAL_PLATFORM_LABELS[acc.platform],
          url: normalizeSocialUrl(acc.platform, rawTarget),
        };
      });

    onSaveSiteConfig({
      ...siteConfig,
      socialLinks: {
        whatsappNumber: whatsappNumber.trim(),
        whatsappMessage: whatsappMessage.trim(),
        showOnProductPage,
        googleReviewUrl: googleReviewUrl.trim(),
        accounts: cleanedAccounts,
      },
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  const previewWhatsappUrl = buildWhatsAppUrl(whatsappNumber, whatsappMessage);
  const previewGoogleReviewUrl = buildGoogleReviewUrl(
    siteConfig.storeName,
    googleReviewUrl
  );

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-xs text-[#5A5A56] pb-4 border-b border-[#E4E4E0]">
          Connect your WhatsApp Business number and social media accounts (TikTok, Instagram, Facebook, YouTube, Snapchat, Pinterest, X). Saved links appear automatically on your storefront.
        </p>

        {/* 1. WhatsApp Business Setup */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                1. WhatsApp Store Number
              </h3>
            </div>
            {previewWhatsappUrl && (
              <a
                href={previewWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline underline-offset-4"
              >
                <span>Test WhatsApp Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                WhatsApp Phone Number (Pakistan / International)
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 0300 1234567 or +92 300 1234567"
                className="w-full h-10 px-3 text-sm tabular-nums bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
              />
              <p className="text-[11px] text-[#5A5A56] mt-1">
                Customer orders &amp; order summaries route directly to this number. Leave empty to hide WhatsApp links. Local 03xx numbers auto-format to +92.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Default WhatsApp Greeting Message
              </label>
              <input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Assalam-o-Alaikum, I'd like to ask about..."
                className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
            <input
              type="checkbox"
              checked={showOnProductPage}
              onChange={(e) => setShowOnProductPage(e.target.checked)}
              className="rounded border-[#D4D4CE]"
            />
            <span>Show &ldquo;Order / Ask on WhatsApp&rdquo; link inside product details</span>
          </label>
        </div>

        {/* 2. Social Media Accounts (TikTok, Instagram, Facebook, etc.) */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56] mb-3">
              2. Social Media Platform Accounts
            </h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_PLATFORMS.map((item) => (
                <button
                  key={item.platform}
                  type="button"
                  onClick={() => addAccount(item.platform)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#FAFAFA] text-[#141413] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <SocialPlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                  <span>Add {SOCIAL_PLATFORM_LABELS[item.platform]}</span>
                </button>
              ))}
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="p-6 text-center bg-[#FAFAFA] border border-dashed border-[#D4D4CE] rounded-md">
              <p className="text-xs text-[#5A5A56]">
                No social accounts added yet. Click <strong>Add TikTok</strong> or any platform above to link your store accounts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc, idx) => {
                const preset =
                  QUICK_PLATFORMS.find((p) => p.platform === acc.platform) ||
                  QUICK_PLATFORMS[0];
                return (
                  <div
                    key={acc.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md"
                  >
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <SocialPlatformIcon
                        platform={acc.platform}
                        className="w-4 h-4 text-[#141413] shrink-0"
                      />
                      <select
                        value={acc.platform}
                        onChange={(e) =>
                          updateAccount(idx, {
                            platform: e.target.value as SocialPlatform,
                          })
                        }
                        aria-label="Social media platform"
                        className="w-full h-9 px-2 text-xs font-medium bg-white border border-[#D4D4CE] rounded"
                      >
                        {Object.entries(SOCIAL_PLATFORM_LABELS).map(
                          ([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={acc.label}
                        onChange={(e) =>
                          updateAccount(idx, { label: e.target.value })
                        }
                        placeholder={`Handle (${preset.placeholderHandle})`}
                        aria-label="Account handle or display label"
                        className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={acc.url}
                        onChange={(e) =>
                          updateAccount(idx, { url: e.target.value })
                        }
                        placeholder={preset.placeholderUrl}
                        aria-label="Profile URL or @handle"
                        className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeAccount(idx)}
                        aria-label="Remove social account"
                        className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
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

        {/* 3. Google Review Link */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                3. Google Customer Review Link
              </h3>
            </div>
            <a
              href={previewGoogleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline underline-offset-4"
            >
              <span>Test Google Review Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#141413] mb-1">
              Google Business Review URL (Optional)
            </label>
            <input
              type="url"
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              placeholder="https://g.page/r/your-store-id/review"
              className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
            />
            <p className="text-[11px] text-[#5A5A56] mt-1">
              Paste your Google Business Profile review link. If left blank, the footer link opens Google Reviews search for {siteConfig.storeName}.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Save Bar */}
      <div className="px-6 py-4 bg-white border-t border-[#E4E4E0] flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-[var(--accent)] font-medium">
          {savedNotice ? 'Social & WhatsApp links saved.' : ''}
        </span>
        <button
          type="submit"
          className="px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
        >
          Save Social &amp; WhatsApp Links
        </button>
      </div>
    </form>
  );
}
