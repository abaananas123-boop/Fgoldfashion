import {
  AlertTriangle,
  Check,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  LayoutTemplate,
  Link2,
  Loader2,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';

interface HomeManagerBarProps {
  isHomeEditMode: boolean;
  onToggleEditMode: () => void;
  onAddSection: () => void;
  onAddBox: () => void;
  onAddLink: () => void;
  onEditHeaderBg: () => void;
  onEditTheme: () => void;
  onCustomize3D?: () => void;
  onCustomizeHighlightSlider?: () => void;
  onAddProduct: () => void;
  onOpenGallery: () => void;
  onOpenOrderTrackingManager?: () => void;
  ordersCount?: number;
  onOpenStoreManager: () => void;
  onOpenSectionManager?: () => void;
  onOpenLayoutOrganizer?: () => void;
  hiddenSectionCount: number;
  onRestoreHiddenSections: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  authNotice?: string | null;
  canRetrySave?: boolean;
  onRetrySave?: () => void;
  onAdminSignIn?: () => void;
  onDismissNotice?: () => void;
}

export function HomeManagerBar({
  isHomeEditMode,
  onToggleEditMode,
  onAddSection,
  onAddBox,
  onAddLink,
  onEditHeaderBg,
  onEditTheme,
  onCustomize3D,
  onCustomizeHighlightSlider,
  onAddProduct,
  onOpenGallery,
  onOpenOrderTrackingManager,
  ordersCount = 0,
  onOpenStoreManager,
  onOpenSectionManager,
  onOpenLayoutOrganizer,
  hiddenSectionCount,
  onRestoreHiddenSections,
  saveStatus,
  authNotice,
  canRetrySave,
  onRetrySave,
  onAdminSignIn,
  onDismissNotice,
}: HomeManagerBarProps) {
  return (
    <section
      aria-label="Home page manager controls"
      className="border-b border-[#E4E4E0] bg-white"
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
            Manager Studio
          </span>
          <span aria-hidden="true" className="text-[#D4D4CE]">
            /
          </span>
          <span className="text-xs text-[#5A5A56]">
            {isHomeEditMode
              ? 'Full home edit mode active — customize every section, text, box, color, or font directly below.'
              : 'Full permissions enabled — customize header background, 3D hero showcase, sections, colors, text styles & catalog.'}
          </span>
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A5A56]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
              <span>Saving to cloud...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Saved to cloud</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Cloud save failed</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleEditMode}
            aria-pressed={isHomeEditMode}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isHomeEditMode
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[#141413] bg-[#141413] text-white hover:bg-[#2B2B29]'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{isHomeEditMode ? 'Done Editing' : 'Edit Home Page'}</span>
          </button>

          <button
            type="button"
            onClick={onEditTheme}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Palette className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            <span>Colors &amp; Text Styles</span>
          </button>

          <button
            type="button"
            onClick={onEditHeaderBg}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            <span>Header Background</span>
          </button>

          {onCustomize3D && (
            <button
              type="button"
              onClick={onCustomize3D}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              <span>3D Slider</span>
            </button>
          )}

          {onCustomizeHighlightSlider && (
            <button
              type="button"
              onClick={onCustomizeHighlightSlider}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Images className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              <span>Highlight Slider</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddSection}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            <span>+ Add Section</span>
          </button>

          <button
            type="button"
            onClick={onAddBox}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            <span>+ Add Box</span>
          </button>

          <button
            type="button"
            onClick={onAddLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Link2 className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            <span>+ Add Link</span>
          </button>

          <button
            type="button"
            onClick={onAddProduct}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Add Product</span>
          </button>

          <button
            type="button"
            onClick={onOpenGallery}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            <span>Media Gallery</span>
          </button>

          {onOpenSectionManager && (
            <button
              type="button"
              onClick={onOpenSectionManager}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              <span>Page Sections</span>
            </button>
          )}

          {onOpenLayoutOrganizer && (
            <button
              type="button"
              onClick={onOpenLayoutOrganizer}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FFF5F0] border border-[#F85606]/40 rounded-md hover:border-[#F85606] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F85606]"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-[#F85606]" strokeWidth={1.75} />
              <span>Section Order &amp; Placement</span>
            </button>
          )}

          {hiddenSectionCount > 0 && (
            <button
              type="button"
              onClick={onRestoreHiddenSections}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--accent)] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[var(--accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="tabular-nums">Restore Hidden ({hiddenSectionCount})</span>
            </button>
          )}

          {onOpenOrderTrackingManager && (
            <button
              type="button"
              onClick={onOpenOrderTrackingManager}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Truck className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={1.75} />
              <span className="tabular-nums">Orders &amp; Tracking ({ordersCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenStoreManager}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#5A5A56] bg-white border border-[#D4D4CE] rounded-md hover:text-[#141413] hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Store Manager</span>
          </button>
        </div>
      </div>

      {authNotice && (
        <div
          role="alert"
          className="border-t border-red-200 bg-red-50 px-6 py-2.5"
        >
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-red-800">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{authNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canRetrySave && onRetrySave && (
                <button
                  type="button"
                  onClick={onRetrySave}
                  className="px-3 py-1 font-medium bg-red-700 text-white rounded hover:bg-red-800 cursor-pointer"
                >
                  Retry Save
                </button>
              )}
              {onAdminSignIn && (
                <button
                  type="button"
                  onClick={onAdminSignIn}
                  className="px-3 py-1 font-medium bg-white text-red-800 border border-red-300 rounded hover:border-red-500 cursor-pointer"
                >
                  Refresh Sign-In
                </button>
              )}
              {onDismissNotice && (
                <button
                  type="button"
                  onClick={onDismissNotice}
                  aria-label="Dismiss alert"
                  className="p-1 text-red-700 hover:text-red-950 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

