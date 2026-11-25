import { ChangeEvent, useMemo, useState } from 'react';
import { Check, Film, Image as ImageIcon, Search, Upload, X } from 'lucide-react';
import { MediaAsset } from '../types';
import {
  MEDIA_FILE_ACCEPT,
  VIDEO_FILE_ACCEPT,
  uploadMultipleStoreMediaFiles,
} from '../utils/imageUpload';
import { ResilientImage } from './ResilientImage';

interface GalleryPickerModalProps {
  isOpen: boolean;
  mode: 'single' | 'multiple';
  mediaFilter?: 'all' | 'video';
  title: string;
  mediaAssets: MediaAsset[];
  categories: string[];
  onClose: () => void;
  onSelect: (selectedAssets: MediaAsset[]) => void;
  onAddMediaAssets?: (
    items: Array<{
      title: string;
      url: string;
      mediaKind: 'image' | 'video';
      categoryTag: string;
    }>
  ) => Promise<MediaAsset[] | void> | void;
}

function cleanFileTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (spaced || fileName || 'Product Media').slice(0, 120);
}

export function GalleryPickerModal({
  isOpen,
  mode,
  mediaFilter = 'all',
  title,
  mediaAssets,
  categories,
  onClose,
  onSelect,
  onAddMediaAssets,
}: GalleryPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const tagOptions = useMemo(
    () => Array.from(new Set(['General', ...categories])),
    [categories]
  );

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mediaAssets.filter((asset) => {
      if (mediaFilter === 'video' && asset.mediaKind !== 'video') {
        return false;
      }
      if (categoryFilter !== 'All' && asset.categoryTag !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      return (
        asset.title.toLowerCase().includes(query) ||
        asset.categoryTag.toLowerCase().includes(query)
      );
    });
  }, [mediaAssets, mediaFilter, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  const handleUploadDirect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(2);

    try {
      const uploaded = await uploadMultipleStoreMediaFiles(files, {
        videoOnly: mediaFilter === 'video',
        maxFiles: mode === 'single' ? 1 : 12,
        onProgress: (pct) => setUploadProgress(pct),
      });

      if (uploaded.length > 0 && onAddMediaAssets) {
        const created = await onAddMediaAssets(
          uploaded.map((item) => ({
            title: cleanFileTitle(item.fileName),
            url: item.url,
            mediaKind: item.mediaKind,
            categoryTag: categoryFilter === 'All' ? 'General' : categoryFilter,
          }))
        );
        if (Array.isArray(created) && created.length > 0) {
          if (mode === 'single') {
            onSelect([created[0]]);
            onClose();
            return;
          }
          setSelectedIds((prev) =>
            Array.from(new Set([...prev, ...created.map((c) => c.id)]))
          );
        }
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not upload file to gallery.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCardClick = (asset: MediaAsset) => {
    if (mode === 'single') {
      onSelect([asset]);
      onClose();
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(asset.id)
        ? prev.filter((id) => id !== asset.id)
        : [...prev, asset.id]
    );
  };

  const handleConfirmMultiple = () => {
    const set = new Set(selectedIds);
    const picked = mediaAssets.filter((a) => set.has(a.id));
    if (picked.length > 0) {
      onSelect(picked);
    }
    setSelectedIds([]);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-white border border-[#E4E4E0] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[#E4E4E0] flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#141413]">
              {title}
            </h3>
            <p className="text-[11px] text-[#5A5A56]">
              {mode === 'single'
                ? 'Click any saved photo or video from your Manager Gallery to apply it.'
                : 'Select one or multiple photos & videos to add to this product.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery picker"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#F2F2F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#F0F0EC] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#5A5A56] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gallery..."
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by department"
              className="h-8 px-2 text-xs bg-white border border-[#D4D4CE] rounded-md"
            >
              <option value="All">All Departments</option>
              {tagOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {onAddMediaAssets && (
            <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              <span>
                {isUploading
                  ? `Uploading ${uploadProgress}%`
                  : 'Upload New to Gallery'}
              </span>
              <input
                type="file"
                multiple={mode === 'multiple'}
                accept={
                  mediaFilter === 'video' ? VIDEO_FILE_ACCEPT : MEDIA_FILE_ACCEPT
                }
                disabled={isUploading}
                onChange={handleUploadDirect}
                className="sr-only"
              />
            </label>
          )}
        </div>

        {(isUploading || uploadError) && (
          <div className="px-5 py-2 border-b border-[#F0F0EC] bg-white space-y-1.5">
            {isUploading && (
              <progress
                value={uploadProgress}
                max={100}
                aria-label="Upload progress"
                className="w-full h-1.5 rounded-full overflow-hidden accent-[#141413]"
              />
            )}
            {uploadError && (
              <div
                role="alert"
                className="p-2 text-xs text-[#6D2932] bg-[#6D2932]/10 border border-[#6D2932]/25 rounded"
              >
                {uploadError}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#F2F2F0] text-[#5A5A56] flex items-center justify-center mx-auto">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-[#141413]">
                No saved {mediaFilter === 'video' ? 'videos' : 'photos or videos'} found
              </p>
              <p className="text-xs text-[#5A5A56]">
                Upload files using the button above or switch to the Manager Gallery tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleCardClick(asset)}
                    className={`group text-left border rounded-md overflow-hidden transition-colors cursor-pointer flex flex-col ${
                      isSelected
                        ? 'border-[#141413] ring-2 ring-[#141413]'
                        : 'border-[#E4E4E0] hover:border-[#141413]'
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full bg-[#F2F2F0] overflow-hidden">
                      <ResilientImage
                        src={asset.url}
                        alt={asset.title}
                        mode="thumb"
                        expectedKind={asset.mediaKind === 'video' ? 'video' : 'auto'}
                        className="w-full h-full object-cover"
                      />
                      {asset.mediaKind === 'video' && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-medium inline-flex items-center gap-0.5">
                          <Film className="w-2.5 h-2.5" />
                          <span>Video</span>
                        </span>
                      )}
                      {mode === 'multiple' && (
                        <span
                          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded flex items-center justify-center border ${
                            isSelected
                              ? 'bg-[#141413] border-[#141413] text-white'
                              : 'bg-white/95 border-[#D4D4CE] text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="p-2 bg-white space-y-0.5">
                      <p className="text-xs font-medium text-[#141413] truncate">
                        {asset.title}
                      </p>
                      <p className="text-[11px] text-[#5A5A56] truncate">
                        {asset.categoryTag}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {mode === 'multiple' && (
          <div className="px-5 py-3 border-t border-[#E4E4E0] bg-[#FAFAFA] flex items-center justify-between gap-3">
            <span className="text-xs text-[#5A5A56] tabular-nums">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  onClose();
                }}
                className="h-9 px-3.5 text-xs font-medium text-[#5A5A56] border border-[#D4D4CE] rounded-md hover:text-[#141413] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={handleConfirmMultiple}
                className="h-9 px-4 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] disabled:opacity-40 cursor-pointer"
              >
                Add Selected ({selectedIds.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
