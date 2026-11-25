import { ArrowRight, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { HomeBox, HomeBoxPlacement, SectionAlign } from '../types';
import {
  isExternalSiteLink,
  isInAppSocialBrowser,
  normalizeSiteLinkUrl,
} from '../utils/social';
import { MediaGalleryViewer } from './MediaGalleryViewer';

interface HomeCustomBoxesProps {
  boxes: HomeBox[];
  placement: HomeBoxPlacement;
  sectionEyebrow?: string;
  sectionHeading?: string;
  isHomeEditMode: boolean;
  alignment?: SectionAlign;
  onNavigateLink: (url: string) => void;
  onAddBox: (placement: HomeBoxPlacement) => void;
  onEditBox: (box: HomeBox) => void;
  onDeleteBox: (boxId: string) => void;
  onEditSectionHeading?: () => void;
}

export function HomeCustomBoxes({
  boxes,
  placement,
  sectionEyebrow,
  sectionHeading,
  isHomeEditMode,
  alignment = 'left',
  onNavigateLink,
  onAddBox,
  onEditBox,
  onDeleteBox,
  onEditSectionHeading,
}: HomeCustomBoxesProps) {
  const scopedBoxes = boxes.filter((b) => b.placement === placement);

  if (scopedBoxes.length === 0 && !isHomeEditMode) {
    return null;
  }

  const renderBoxCard = (box: HomeBox) => {
    const resolvedUrl = box.linkUrl ? normalizeSiteLinkUrl(box.linkUrl) : '';
    const external = resolvedUrl ? isExternalSiteLink(resolvedUrl) : false;

    return (
      <article
        key={box.id}
        className="flex flex-col bg-white border border-[#E4E4E0] rounded-lg overflow-hidden"
      >
        {(box.imageUrl || (box.mediaGallery && box.mediaGallery.length > 0)) && (
          <div className="aspect-[16/10] bg-[#F2F2F0] overflow-hidden border-b border-[#E4E4E0]">
            <MediaGalleryViewer
              primaryUrl={box.imageUrl}
              gallery={box.mediaGallery}
              alt={box.title}
              fallbackLabel={box.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {box.eyebrow && (
                <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--accent)] mb-1.5">
                  {box.eyebrow}
                </p>
              )}
              <h3 className="font-serif text-xl font-medium text-[#141413] leading-snug">
                {box.title}
              </h3>
            </div>

            {isHomeEditMode && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditBox(box)}
                  aria-label={`Edit ${box.title}`}
                  className="p-1.5 text-[#5A5A56] hover:text-[#141413] border border-[#E4E4E0] rounded bg-[#FAFAFA] cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteBox(box.id)}
                  aria-label={`Delete ${box.title}`}
                  className="p-1.5 text-[#5A5A56] hover:text-[var(--accent)] border border-[#E4E4E0] rounded bg-[#FAFAFA] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-[#5A5A56] leading-relaxed mt-2 flex-1">
            {box.description}
          </p>

          {resolvedUrl && (() => {
            const labelText =
              box.linkLabel?.trim() || (external ? 'Open Link' : 'Explore');
            const inAppBrowser = isInAppSocialBrowser();
            return (
              <div className="mt-4 pt-3 border-t border-[#F0F0EC]">
                {external ? (
                  <a
                    href={resolvedUrl}
                    target={inAppBrowser ? undefined : '_blank'}
                    rel={inAppBrowser ? undefined : 'noopener noreferrer'}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#141413] hover:text-[var(--accent)] transition-colors"
                  >
                    <span>{labelText}</span>
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateLink(resolvedUrl)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#141413] hover:text-[var(--accent)] transition-colors cursor-pointer"
                  >
                    <span>{labelText}</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </article>
    );
  };

  if (placement === 'hero') {
    return (
      <div className="mt-8 pt-8 border-t border-[#E4E4E0]">
        {isHomeEditMode && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#5A5A56]">
              Hero Feature Boxes ({scopedBoxes.length})
            </p>
            <button
              type="button"
              onClick={() => onAddBox('hero')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Hero Box</span>
            </button>
          </div>
        )}

        {scopedBoxes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scopedBoxes.map(renderBoxCard)}
          </div>
        )}
      </div>
    );
  }

  if (placement === 'catalog') {
    return (
      <div className="mb-10">
        {isHomeEditMode && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#5A5A56]">
              Catalog Feature Boxes ({scopedBoxes.length})
            </p>
            <button
              type="button"
              onClick={() => onAddBox('catalog')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Catalog Feature Box</span>
            </button>
          </div>
        )}

        {scopedBoxes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scopedBoxes.map(renderBoxCard)}
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      id="features"
      className={`border-t border-[#E4E4E0] bg-[#FAFAFA] py-12 lg:py-14 ${
        alignment === 'center'
          ? 'text-center'
          : alignment === 'right'
            ? 'text-right'
            : 'text-left'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div
          className={`flex flex-wrap items-end gap-4 mb-8 ${
            alignment === 'center'
              ? 'justify-center'
              : alignment === 'right'
                ? 'justify-end'
                : 'justify-between'
          }`}
        >
          <div>
            {sectionEyebrow && (
              <p className="text-xs font-medium tracking-widest uppercase text-[var(--accent)] mb-2">
                {sectionEyebrow}
              </p>
            )}
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#141413]">
              {sectionHeading || 'Store Features & Highlights'}
            </h2>
          </div>

          {isHomeEditMode && (
            <div className="flex flex-wrap items-center gap-2">
              {onEditSectionHeading && (
                <button
                  type="button"
                  onClick={onEditSectionHeading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Heading</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onAddBox('features')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Feature Box</span>
              </button>
            </div>
          )}
        </div>

        {scopedBoxes.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed border-[#D4D4CE] rounded-lg">
            <p className="text-sm text-[#5A5A56] mb-3">
              No custom feature boxes added to this section yet.
            </p>
            <button
              type="button"
              onClick={() => onAddBox('features')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Feature Box</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scopedBoxes.map(renderBoxCard)}
          </div>
        )}
      </div>
    </section>
  );
}
