import { FormEvent, useEffect, useState } from 'react';
import { Globe, Plus, Search, Trash2, Users } from 'lucide-react';
import { DEFAULT_SITE_CONFIG } from '../data/defaultSiteConfig';
import { SeoConfig, SiteConfig, StoreMember } from '../types';

interface SeoMembersEditorProps {
  siteConfig: SiteConfig;
  onSaveSiteConfig: (next: SiteConfig) => void;
}

const DEFAULT_SEO: SeoConfig = DEFAULT_SITE_CONFIG.seo ?? {
  metaTitle: 'f. Gold & fashion — Boutique, Jewellery, Skincare & Dresses',
  metaDescription:
    'Shop botanical skincare, curated boutique bags, artificial kundan jewellery, baby garments, western and eastern dresses in PKR at f. Gold & fashion.',
  keywords:
    'f. Gold & fashion, boutique Pakistan, artificial jewellery, botanical skincare, eastern wear, western dresses',
  canonicalUrl: '',
  city: 'Lahore',
  country: 'Pakistan',
  allowIndexing: true,
};

export function SeoMembersEditor({
  siteConfig,
  onSaveSiteConfig,
}: SeoMembersEditorProps) {
  const [seo, setSeo] = useState<SeoConfig>(() => ({
    ...DEFAULT_SEO,
    ...siteConfig.seo,
  }));
  const [members, setMembers] = useState<StoreMember[]>(
    () => siteConfig.teamMembers ?? DEFAULT_SITE_CONFIG.teamMembers ?? []
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setSeo({ ...DEFAULT_SEO, ...siteConfig.seo });
    setMembers(siteConfig.teamMembers ?? []);
  }, [siteConfig]);

  const addMember = () => {
    const next: StoreMember = {
      id: `member-${Date.now().toString(36)}`,
      name: '',
      role: '',
      specialty: '',
      phone: '',
      email: '',
    };
    setMembers((prev) => [...prev, next]);
  };

  const updateMember = (index: number, patch: Partial<StoreMember>) => {
    setMembers((prev) =>
      prev.map((member, idx) => (idx === index ? { ...member, ...patch } : member))
    );
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanedMembers = members
      .filter((m) => m.name.trim().length > 0 || m.role.trim().length > 0)
      .map((m, idx) => ({
        id: m.id || `member-${idx + 1}`,
        name: m.name.trim() || `${siteConfig.storeName} Member`,
        role: m.role.trim() || 'Store Team Member',
        specialty: m.specialty?.trim() || undefined,
        phone: m.phone?.trim() || undefined,
        email: m.email?.trim() || undefined,
      }));

    onSaveSiteConfig({
      ...siteConfig,
      seo: {
        metaTitle: seo.metaTitle.trim() || DEFAULT_SEO.metaTitle,
        metaDescription: seo.metaDescription.trim() || DEFAULT_SEO.metaDescription,
        keywords: seo.keywords.trim(),
        canonicalUrl: seo.canonicalUrl.trim(),
        city: seo.city.trim() || 'Lahore',
        country: seo.country.trim() || 'Pakistan',
        allowIndexing: Boolean(seo.allowIndexing),
      },
      teamMembers: cleanedMembers,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  const titleLen = seo.metaTitle.trim().length;
  const descLen = seo.metaDescription.trim().length;
  const previewUrl =
    seo.canonicalUrl.trim() ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://fgoldfashion.com');

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-xs text-[#5A5A56] pb-4 border-b border-[#E4E4E0]">
          Configure Google SEO metadata, structured Schema.org store details, and all team members of{' '}
          <strong className="text-[#141413]">{siteConfig.storeName}</strong> displayed in the storefront footer.
        </p>

        {/* 1. Google Search & SEO Details */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                1. Google SEO &amp; Structured Store Details
              </h3>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
              <input
                type="checkbox"
                checked={seo.allowIndexing}
                onChange={(e) =>
                  setSeo((prev) => ({ ...prev, allowIndexing: e.target.checked }))
                }
                className="rounded border-[#D4D4CE]"
              />
              <span>Allow Google Search Indexing</span>
            </label>
          </div>

          {/* Live Google Search Snippet Preview */}
          <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-[#5A5A56] truncate">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{previewUrl}</span>
            </div>
            <p className="text-base font-medium text-[#1a0dab] leading-snug">
              {seo.metaTitle || DEFAULT_SEO.metaTitle}
            </p>
            <p className="text-xs text-[#4d5156] leading-relaxed line-clamp-2">
              {seo.metaDescription || DEFAULT_SEO.metaDescription}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-[#141413]">
                SEO Page Title (Google Title Tag)
              </label>
              <span className="text-[11px] text-[#5A5A56] tabular-nums">
                {titleLen} / 60 recommended
              </span>
            </div>
            <input
              type="text"
              maxLength={120}
              value={seo.metaTitle}
              onChange={(e) =>
                setSeo((prev) => ({ ...prev, metaTitle: e.target.value }))
              }
              placeholder="f. Gold & fashion — Boutique, Jewellery, Skincare & Dresses"
              className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-[#141413]">
                Meta Description
              </label>
              <span className="text-[11px] text-[#5A5A56] tabular-nums">
                {descLen} / 160 recommended
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={320}
              value={seo.metaDescription}
              onChange={(e) =>
                setSeo((prev) => ({ ...prev, metaDescription: e.target.value }))
              }
              placeholder="Describe your products, PKR pricing, and nationwide courier delivery..."
              className="w-full p-3 text-sm bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#141413] mb-1">
              Search Keywords (comma separated)
            </label>
            <input
              type="text"
              maxLength={400}
              value={seo.keywords}
              onChange={(e) =>
                setSeo((prev) => ({ ...prev, keywords: e.target.value }))
              }
              placeholder="f. Gold & fashion, boutique Pakistan, artificial jewellery, skincare, dresses"
              className="w-full h-10 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                City (Schema Location)
              </label>
              <input
                type="text"
                maxLength={80}
                value={seo.city}
                onChange={(e) =>
                  setSeo((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="Lahore"
                className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Country
              </label>
              <input
                type="text"
                maxLength={80}
                value={seo.country}
                onChange={(e) =>
                  setSeo((prev) => ({ ...prev, country: e.target.value }))
                }
                placeholder="Pakistan"
                className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Canonical Website URL (Optional)
              </label>
              <input
                type="url"
                maxLength={300}
                value={seo.canonicalUrl}
                onChange={(e) =>
                  setSeo((prev) => ({ ...prev, canonicalUrl: e.target.value }))
                }
                placeholder="https://fgoldfashion.com"
                className="w-full h-9 px-3 text-xs bg-[#FAFAFA] border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
              />
            </div>
          </div>
        </div>

        {/* 2. All Members of f. Gold & fashion */}
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
                2. Members of {siteConfig.storeName} ({members.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={addMember}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          {members.length === 0 ? (
            <div className="p-6 text-center bg-[#FAFAFA] border border-dashed border-[#D4D4CE] rounded-md">
              <p className="text-xs text-[#5A5A56]">
                No store members added yet. Click <strong>Add Member</strong> to list founders, managers, stylists, or customer support staff in the footer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member, idx) => (
                <div
                  key={member.id || idx}
                  className="p-3.5 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={member.name}
                        onChange={(e) =>
                          updateMember(idx, { name: e.target.value })
                        }
                        placeholder="e.g., Fatima Tariq"
                        className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Role / Designation *
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={member.role}
                        onChange={(e) =>
                          updateMember(idx, { role: e.target.value })
                        }
                        placeholder="e.g., Co-Founder & Jewellery Lead"
                        className="w-full h-9 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-[#5A5A56] mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        maxLength={32}
                        value={member.phone ?? ''}
                        onChange={(e) =>
                          updateMember(idx, { phone: e.target.value })
                        }
                        placeholder="0300 1234567"
                        className="w-full h-9 px-2.5 text-xs tabular-nums bg-white border border-[#D4D4CE] rounded"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end sm:pt-4">
                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        aria-label={`Remove ${member.name || 'member'}`}
                        className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      maxLength={160}
                      value={member.specialty ?? ''}
                      onChange={(e) =>
                        updateMember(idx, { specialty: e.target.value })
                      }
                      placeholder="Department or responsibility (e.g., Boutique Orders & Dispatch)"
                      aria-label="Member specialty or department"
                      className="w-full h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                    <input
                      type="email"
                      maxLength={160}
                      value={member.email ?? ''}
                      onChange={(e) =>
                        updateMember(idx, { email: e.target.value })
                      }
                      placeholder="Email (optional)"
                      aria-label="Member email"
                      className="w-full h-8 px-2.5 text-xs bg-white border border-[#D4D4CE] rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Save Bar */}
      <div className="px-6 py-4 bg-white border-t border-[#E4E4E0] flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs text-[var(--accent)] font-medium">
          {savedNotice ? 'SEO & store member details saved.' : ''}
        </span>
        <button
          type="submit"
          className="px-5 py-2.5 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
        >
          Save SEO &amp; Members
        </button>
      </div>
    </form>
  );
}
