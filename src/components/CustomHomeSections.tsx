import { ArrowRight, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { CustomHomeSection, CustomSectionPlacement, SectionAlign } from '../types';
import {
  isExternalSiteLink,
  isInAppSocialBrowser,
  normalizeSiteLinkUrl,
} from '../utils/social';
import { MediaGalleryViewer } from './MediaGalleryViewer';

interface CustomHomeSectionsProps {
  sections: CustomHomeSection[];
  placement: CustomSectionPlacement;
  isHomeEditMode: boolean;
  alignment?: SectionAlign;
  onNavigateLink: (url: string) => void;
  onAddSection: (placement: CustomSectionPlacement) => void;
  onEditSection: (section: CustomHomeSection) => void;
  onDeleteSection: (sectionId: string) => void;
}

export function CustomHomeSections({
  sections,
  placement,
  isHomeEditMode,
  alignment,
  onNavigateLink,
  onAddSection,
  onEditSection,
  onDeleteSection,
}: CustomHomeSectionsProps) {
  const scopedSections = sections.filter((s) => s.placement === placement);

  if (scopedSections.length === 0 && !isHomeEditMode) {
    return null;
  }

  return (
    <div
      className={
        placement === 'catalog'
          ? 'mb-10 space-y-6'
          : 'max-w-6xl mx-auto px-6 py-8 space-y-6'
      }
    >
      {isHomeEditMode && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Custom Home Sections ({scopedSections.length})
          </p>
          <button
            type="button"
            onClick={() => onAddSection(placement)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--surface-bg)] border border-[var(--border-subtle)] rounded-md hover:border-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Add Custom Section</span>
          </button>
        </div>
      )}

      {scopedSections.map((section) => {
        const resolvedUrl = section.ctaUrl
          ? normalizeSiteLinkUrl(section.ctaUrl)
          : '';
        const external = resolvedUrl ? isExternalSiteLink(resolvedUrl) : false;
        const effectiveAlign = alignment ?? section.textAlign ?? 'left';
        const isCentered = effectiveAlign === 'center';
        const isRight = effectiveAlign === 'right';
        const customBg = section.backgroundColor || 'var(--surface-bg)';
        const customInk = section.textColor || 'var(--text-primary)';
        const headingFontStyle =
          section.headingStyle === 'sans'
            ? 'font-sans font-semibold'
            : section.headingStyle === 'italic'
              ? 'theme-heading italic'
              : 'theme-heading';

        const hasSectionMedia = Boolean(
          section.imageUrl || (section.mediaGallery && section.mediaGallery.length > 0)
        );
        return (
          <section
            key={section.id}
            style={{
              backgroundColor: customBg,
              color: customInk,
            }}
            className="relative rounded-lg border border-[var(--border-subtle)] p-6 sm:p-8 lg:p-10 overflow-hidden"
          >
            {isHomeEditMode && (
              <div className="flex items-center justify-end gap-1.5 mb-4">
                <button
                  type="button"
                  onClick={() => onEditSection(section)}
                  aria-label={`Edit ${section.heading}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-[#141413] border border-[#D4D4CE] rounded hover:border-[#141413] cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSection(section.id)}
                  aria-label={`Delete ${section.heading}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-[var(--accent)] border border-[#D4D4CE] rounded hover:border-[var(--accent)] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}

            <div
              className={
                hasSectionMedia && !isCentered
                  ? `grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-center ${isRight ? 'text-right' : ''}`
                  : `space-y-4 ${isCentered ? 'text-center max-w-3xl mx-auto' : isRight ? 'text-right max-w-3xl ml-auto' : ''}`
              }
            >
              <div
                className={
                  hasSectionMedia && !isCentered
                    ? `md:col-span-7 space-y-3 ${isRight ? 'md:order-2' : ''}`
                    : 'space-y-3'
                }
              >
                {section.eyebrow && (
                  <p
                    className="text-xs font-medium uppercase tracking-widest"
                    style={{ color: section.textColor ? customInk : 'var(--accent)' }}
                  >
                    {section.eyebrow}
                  </p>
                )}
                <h2 className={`${headingFontStyle} text-2xl sm:text-3xl lg:text-4xl leading-tight`}>
                  {section.heading}
                </h2>
                {section.body && (
                  <p className="text-sm sm:text-base opacity-85 leading-relaxed whitespace-pre-line">
                    {section.body}
                  </p>
                )}

                {resolvedUrl && (() => {
                  const labelText =
                    section.ctaLabel?.trim() || (external ? 'Open Link' : 'Explore');
                  const inAppBrowser = isInAppSocialBrowser();
                  return (
                    <div className={isCentered ? 'pt-2 flex justify-center' : 'pt-2'}>
                      {external ? (
                        <a
                          href={resolvedUrl}
                          target={inAppBrowser ? undefined : '_blank'}
                          rel={inAppBrowser ? undefined : 'noopener noreferrer'}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-[var(--btn-bg)] text-[var(--btn-text)] rounded-md hover:opacity-90 transition-opacity"
                        >
                          <span>{labelText}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigateLink(resolvedUrl)}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-[var(--btn-bg)] text-[var(--btn-text)] rounded-md hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          <span>{labelText}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {hasSectionMedia && (
                <div
                  className={
                    isCentered
                      ? 'pt-2 max-w-2xl mx-auto w-full'
                      : 'md:col-span-5'
                  }
                >
                  <div className="aspect-[16/10] rounded-lg overflow-hidden border border-black/10 bg-black/5">
                    <MediaGalleryViewer
                      primaryUrl={section.imageUrl}
                      gallery={section.mediaGallery}
                      alt={section.heading}
                      fallbackLabel={section.heading}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
