import { ChangeEvent, DragEvent, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Film,
  FolderPlus,
  Image as ImageIcon,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { MediaAsset, Product } from '../types';
import {
  MEDIA_FILE_ACCEPT,
  detectMediaKind,
  uploadMultipleStoreMediaFiles,
} from '../utils/imageUpload';
import { ResilientImage } from './ResilientImage';

interface ManagerGalleryPanelProps {
  mediaAssets: MediaAsset[];
  categories: string[];
  products: Product[];
  onAddMediaAssets: (
    items: Array<{
      title: string;
      url: string;
      mediaKind: 'image' | 'video';
      categoryTag: string;
    }>
  ) => Promise<MediaAsset[] | void> | void;
  onUpdateMediaAsset: (
    assetId: string,
    patch: { title?: string; categoryTag?: string }
  ) => Promise<void> | void;
  onDeleteMediaAssets: (assetIds: string[]) => Promise<void> | void;
  onCreateProductFromMedia: (selectedAssets: MediaAsset[]) => void;
}

function cleanFileTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (spaced || fileName || 'Product Media').slice(0, 120);
}

export function ManagerGalleryPanel({
  mediaAssets,
  categories,
  products,
  onAddMediaAssets,
  onUpdateMediaAsset,
  onDeleteMediaAssets,
  onCreateProductFromMedia,
}: ManagerGalleryPanelProps) {
  const [uploadCategory, setUploadCategory] = useState<string>('General');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterKind, setFilterKind] = useState<'all' | 'image' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusLabel, setUploadStatusLabel] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  const tagOptions = useMemo(
    () => Array.from(new Set(['General', ...categories])),
    [categories]
  );

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mediaAssets.filter((asset) => {
      if (filterCategory !== 'All' && asset.categoryTag !== filterCategory) {
        return false;
      }
      if (filterKind !== 'all' && asset.mediaKind !== filterKind) {
        return false;
      }
      if (!query) return true;
      return (
        asset.title.toLowerCase().includes(query) ||
        asset.categoryTag.toLowerCase().includes(query) ||
        asset.url.toLowerCase().includes(query)
      );
    });
  }, [mediaAssets, filterCategory, filterKind, searchQuery]);

  const selectedAssets = useMemo(() => {
    const set = new Set(selectedIds);
    return mediaAssets.filter((a) => set.has(a.id));
  }, [mediaAssets, selectedIds]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    setUploadError(null);
    setImportNotice(null);
    setIsUploading(true);
    setUploadProgress(2);
    setUploadStatusLabel(
      fileArr.length === 1
        ? `Uploading ${fileArr[0].name}...`
        : `Uploading ${fileArr.length} files...`
    );

    try {
      const uploaded = await uploadMultipleStoreMediaFiles(fileArr, {
        maxFiles: 20,
        onProgress: (pct, activeLabel) => {
          setUploadProgress(pct);
          if (activeLabel) {
            setUploadStatusLabel(`Uploading (${activeLabel})...`);
          }
        },
      });

      if (uploaded.length > 0) {
        await onAddMediaAssets(
          uploaded.map((item) => ({
            title: cleanFileTitle(item.fileName),
            url: item.url,
            mediaKind: item.mediaKind,
            categoryTag: uploadCategory,
          }))
        );
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Could not upload files to gallery. Please try again.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusLabel('');
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleUploadFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleAddExternalUrl = async () => {
    const cleanUrl = pasteUrl.trim();
    if (!cleanUrl) return;
    setUploadError(null);
    const kind = detectMediaKind(cleanUrl) === 'image' ? 'image' : 'video';
    await onAddMediaAssets([
      {
        title:
          pasteTitle.trim().slice(0, 120) ||
          (kind === 'video' ? 'Product Video Link' : 'Product Photo Link'),
        url: cleanUrl,
        mediaKind: kind,
        categoryTag: uploadCategory,
      },
    ]);
    setPasteUrl('');
    setPasteTitle('');
  };

  const handleImportFromProducts = async () => {
    setUploadError(null);
    const existingUrls = new Set(mediaAssets.map((m) => m.url.trim()));
    const toImport: Array<{
      title: string;
      url: string;
      mediaKind: 'image' | 'video';
      categoryTag: string;
    }> = [];

    for (const product of products) {
      const candidateUrls = [
        product.imageUrl,
        ...(product.videoUrl ? [product.videoUrl] : []),
        ...(product.mediaGallery ?? []),
      ];
      candidateUrls.forEach((rawUrl, index) => {
        const cleanUrl = String(rawUrl || '').trim();
        if (!cleanUrl || existingUrls.has(cleanUrl)) return;
        existingUrls.add(cleanUrl);
        const kind = detectMediaKind(cleanUrl) === 'image' ? 'image' : 'video';
        toImport.push({
          title:
            index === 0
              ? product.name
              : `${product.name} (${kind === 'video' ? 'Video' : `View ${index + 1}`})`,
          url: cleanUrl,
          mediaKind: kind,
          categoryTag: product.category || 'General',
        });
      });
    }

    if (toImport.length === 0) {
      setImportNotice('All existing product photos & videos are already in your Gallery.');
      return;
    }

    await onAddMediaAssets(toImport);
    setImportNotice(
      `Imported ${toImport.length} ${toImport.length === 1 ? 'item' : 'items'} from your existing catalog.`
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyUrl = async (asset: MediaAsset) => {
    const fullUrl =
      asset.url.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${asset.url}`
        : asset.url;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(asset.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === asset.id ? null : current));
      }, 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDeleteSingle = async (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    await onDeleteMediaAssets([id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const targetIds = [...selectedIds];
    setSelectedIds([]);
    await onDeleteMediaAssets(targetIds);
  };

  const startTitleEdit = (asset: MediaAsset) => {
    setEditingTitleId(asset.id);
    setEditingTitleValue(asset.title);
  };

  const commitTitleEdit = async (asset: MediaAsset) => {
    const clean = editingTitleValue.trim().slice(0, 120);
    setEditingTitleId(null);
    if (!clean || clean === asset.title) return;
    await onUpdateMediaAsset(asset.id, { title: clean });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header & Bulk Import/Upload Area */}
      <div className="bg-white border border-[#E4E4E0] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A5A56]">
              Manager Media Gallery
            </h3>
            <p className="text-xs text-[#5A5A56] leading-relaxed">
              Upload all your product photos and videos here once, organize them by department, and turn any saved picture into a product in one click whenever needed.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleImportFromProducts()}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#141413] bg-[#FAFAFA] border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Import from Catalog</span>
          </button>
        </div>

        {/* Upload Bar + Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-4 rounded-md border border-dashed transition-colors space-y-3 ${
            isDragging
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[#D4D4CE] bg-[#FAFAFA]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="text-xs font-medium text-[#141413]">
                Department Folder:
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                aria-label="Department folder for new uploads"
                className="h-9 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
              >
                {tagOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 h-9 px-4 text-xs font-medium bg-[#141413] text-white rounded-md hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              <span>
                {isUploading
                  ? `Uploading ${uploadProgress}%`
                  : 'Upload Photos & Videos'}
              </span>
              <input
                type="file"
                multiple
                accept={MEDIA_FILE_ACCEPT}
                disabled={isUploading}
                onChange={handleFileInput}
                className="sr-only"
              />
            </label>
          </div>

          <p className="text-[11px] text-[#5A5A56]">
            Drag and drop 1 to 20 photos or videos here (any resolution or format), or paste an existing image/video URL below:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Optional photo label (e.g. Emerald Party Gown)"
              className="w-full sm:w-52 h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
            />
            <input
              type="text"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddExternalUrl();
                }
              }}
              placeholder="Paste photo or video URL..."
              className="flex-1 min-w-[200px] h-9 px-3 text-xs bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
            />
            <button
              type="button"
              onClick={() => void handleAddExternalUrl()}
              disabled={!pasteUrl.trim()}
              className="h-9 px-3 text-xs font-medium bg-white border border-[#D4D4CE] text-[#141413] rounded-md hover:border-[#141413] disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              + Save URL
            </button>
          </div>

          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#141413]">
                <span>{uploadStatusLabel || 'Uploading media...'}</span>
                <span className="tabular-nums">{uploadProgress}%</span>
              </div>
              <progress
                value={uploadProgress}
                max={100}
                aria-label="Gallery upload progress"
                className="w-full h-1.5 rounded-full overflow-hidden accent-[#141413]"
              />
            </div>
          )}

          {uploadError && (
            <div
              role="alert"
              className="p-2.5 text-xs text-[#6D2932] bg-[#6D2932]/10 border border-[#6D2932]/25 rounded-md"
            >
              {uploadError}
            </div>
          )}

          {importNotice && (
            <div className="p-2.5 text-xs text-[#141413] bg-white border border-[#E4E4E0] rounded-md">
              {importNotice}
            </div>
          )}
        </div>
      </div>

      {/* Filter & Multi-Select Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#5A5A56] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gallery..."
              aria-label="Search gallery"
              className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter gallery by department"
            className="h-9 px-2.5 text-xs font-medium bg-white border border-[#D4D4CE] rounded-md focus:outline-none focus:border-[#141413]"
          >
            <option value="All">All Departments ({mediaAssets.length})</option>
            {tagOptions.map((cat) => {
              const count = mediaAssets.filter((m) => m.categoryTag === cat).length;
              return (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              );
            })}
          </select>

          <div className="flex items-center gap-1 p-1 bg-[#F2F2F0] rounded-md">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'image', label: 'Photos' },
                { key: 'video', label: 'Videos' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterKind(tab.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  filterKind === tab.key
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#5A5A56] hover:text-[#141413]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {selectedAssets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-white border border-[#141413] rounded-md px-3 py-1.5">
            <span className="text-xs font-medium text-[#141413] tabular-nums">
              {selectedAssets.length} selected
            </span>
            <button
              type="button"
              onClick={() => onCreateProductFromMedia(selectedAssets)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#141413] text-white rounded hover:bg-[#2B2B29] cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Create Product</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteSelected()}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#6D2932] hover:bg-[#6D2932]/10 rounded cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-[#5A5A56] hover:text-[#141413] px-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Gallery Grid or Empty State */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white border border-[#E4E4E0] rounded-lg p-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#F2F2F0] text-[#5A5A56] flex items-center justify-center mx-auto">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-serif text-lg font-medium text-[#141413]">
              {mediaAssets.length === 0
                ? 'Your Manager Gallery is Ready'
                : 'No matching photos or videos'}
            </p>
            <p className="text-xs text-[#5A5A56] max-w-md mx-auto">
              {mediaAssets.length === 0
                ? 'Upload your boutique dresses, jewellery, garments, and accessory photos above—or import photos already used in your catalog.'
                : 'Try changing the department filter or clearing your search query.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const isSelected = selectedIds.includes(asset.id);
            const isCopied = copiedId === asset.id;
            const isEditingTitle = editingTitleId === asset.id;

            return (
              <div
                key={asset.id}
                className={`bg-white border rounded-lg overflow-hidden flex flex-col transition-colors ${
                  isSelected
                    ? 'border-[#141413] ring-1 ring-[#141413]'
                    : 'border-[#E4E4E0]'
                }`}
              >
                <div className="relative aspect-[4/3] bg-[#F2F2F0] overflow-hidden">
                  <ResilientImage
                    src={asset.url}
                    alt={asset.title}
                    mode="thumb"
                    expectedKind={asset.mediaKind === 'video' ? 'video' : 'auto'}
                    className="w-full h-full object-cover"
                  />

                  {asset.mediaKind === 'video' && (
                    <>
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-medium inline-flex items-center gap-1 pointer-events-none">
                        <Film className="w-3 h-3" />
                        <span>Video</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewAsset(asset)}
                        aria-label={`Play ${asset.title}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/40 transition-colors cursor-pointer"
                      >
                        <span className="w-10 h-10 rounded-full bg-white/95 text-[#141413] flex items-center justify-center shadow-md">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleSelect(asset.id)}
                    aria-label={
                      isSelected
                        ? `Deselect ${asset.title}`
                        : `Select ${asset.title}`
                    }
                    aria-pressed={isSelected}
                    className={`absolute top-2 right-2 w-7 h-7 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#141413] border-[#141413] text-white'
                        : 'bg-white/95 border-[#D4D4CE] text-transparent hover:border-[#141413]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                  <div className="space-y-1.5">
                    {isEditingTitle ? (
                      <input
                        type="text"
                        autoFocus
                        maxLength={120}
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        onBlur={() => void commitTitleEdit(asset)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void commitTitleEdit(asset);
                          } else if (e.key === 'Escape') {
                            setEditingTitleId(null);
                          }
                        }}
                        className="w-full h-7 px-2 text-xs bg-[#FAFAFA] border border-[#141413] rounded focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startTitleEdit(asset)}
                        title="Click to rename"
                        className="w-full text-left text-xs font-semibold text-[#141413] truncate hover:underline cursor-pointer"
                      >
                        {asset.title}
                      </button>
                    )}

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A5A56]">
                      <select
                        value={asset.categoryTag}
                        onChange={(e) =>
                          void onUpdateMediaAsset(asset.id, {
                            categoryTag: e.target.value,
                          })
                        }
                        aria-label={`Department folder for ${asset.title}`}
                        className="max-w-[140px] h-6 px-1.5 text-[11px] bg-[#FAFAFA] border border-[#E4E4E0] rounded focus:outline-none focus:border-[#141413]"
                      >
                        {Array.from(
                          new Set([...tagOptions, asset.categoryTag || 'General'])
                        ).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {asset.createdAt && (
                        <span className="tabular-nums truncate">
                          {asset.createdAt}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-[#F0F0EC]">
                    <button
                      type="button"
                      onClick={() => onCreateProductFromMedia([asset])}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-8 px-2 text-[11px] font-medium bg-[#141413] text-white rounded hover:bg-[#2B2B29] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Use as Product</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopyUrl(asset)}
                      title="Copy media URL"
                      aria-label={`Copy URL for ${asset.title}`}
                      className="h-8 px-2 text-[11px] font-medium text-[#5A5A56] border border-[#D4D4CE] rounded hover:text-[#141413] hover:border-[#141413] transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteSingle(asset.id)}
                      title="Delete from gallery"
                      aria-label={`Delete ${asset.title}`}
                      className="h-8 w-8 flex items-center justify-center text-[#5A5A56] border border-[#D4D4CE] rounded hover:text-[#6D2932] hover:border-[#6D2932] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewAsset && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewAsset.title}`}
          onClick={() => setPreviewAsset(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#141413] border border-white/15 rounded-lg overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 bg-[#1E1E1C] border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {previewAsset.title}
                </p>
                <p className="text-[11px] text-white/65 truncate">
                  {previewAsset.categoryTag}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                aria-label="Close video preview"
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <ResilientImage
                src={previewAsset.url}
                alt={previewAsset.title}
                fallbackLabel={previewAsset.title}
                autoPlayVideo={true}
                expectedKind={previewAsset.mediaKind === 'video' ? 'video' : 'auto'}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
