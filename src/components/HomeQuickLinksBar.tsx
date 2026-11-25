import { ExternalLink, Pencil, Plus, X } from 'lucide-react';
import { HomeLink } from '../types';
import {
  isExternalSiteLink,
  isInAppSocialBrowser,
  normalizeSiteLinkUrl,
} from '../utils/social';

interface HomeQuickLinksBarProps {
  links: HomeLink[];
  isHomeEditMode: boolean;
  onNavigateLink: (url: string) => void;
  onAddLink: () => void;
  onEditLink: (link: HomeLink) => void;
  onDeleteLink: (linkId: string) => void;
}

export function HomeQuickLinksBar({
  links,
  isHomeEditMode,
  onNavigateLink,
  onAddLink,
  onEditLink,
  onDeleteLink,
}: HomeQuickLinksBarProps) {
  const quickLinks = links.filter((link) => link.placement === 'quickbar');
  const inAppBrowser = isInAppSocialBrowser();

  if (quickLinks.length === 0 && !isHomeEditMode) {
    return null;
  }

  return (
    <section
      aria-label="Featured store links"
      className="border-b border-[#E4E4E0] bg-[#FAFAFA]"
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#5A5A56]">
          <span className="text-[11px] uppercase tracking-wider text-[#5A5A56]">
            Quick Links
          </span>

          {quickLinks.length === 0 && isHomeEditMode && (
            <span className="text-xs text-[#8A8A84]">
              No quick links yet — add links to collections, WhatsApp, or external pages.
            </span>
          )}

          {quickLinks.map((link) => {
            const resolvedUrl = normalizeSiteLinkUrl(link.url);
            const openNewTab =
              link.openInNewTab ?? isExternalSiteLink(resolvedUrl);

            return (
              <span
                key={link.id}
                className="inline-flex items-center gap-1.5"
              >
                {openNewTab ? (
                  <a
                    href={resolvedUrl}
                    target={inAppBrowser ? undefined : '_blank'}
                    rel={inAppBrowser ? undefined : 'noopener noreferrer'}
                    className="inline-flex items-center gap-1 text-[#141413] hover:text-[var(--accent)] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-[#8A8A84]" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateLink(resolvedUrl)}
                    className="text-[#141413] hover:text-[var(--accent)] hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {link.label}
                  </button>
                )}

                {isHomeEditMode && (
                  <span className="inline-flex items-center gap-0.5 ml-0.5">
                    <button
                      type="button"
                      onClick={() => onEditLink(link)}
                      aria-label={`Edit ${link.label}`}
                      className="p-0.5 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLink(link.id)}
                      aria-label={`Delete ${link.label}`}
                      className="p-0.5 text-[#5A5A56] hover:text-[var(--accent)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {isHomeEditMode && (
          <button
            type="button"
            onClick={onAddLink}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Quick Link</span>
          </button>
        )}
      </div>
    </section>
  );
}
