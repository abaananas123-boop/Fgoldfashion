import { useState } from 'react';
import { ChevronLeft, ChevronRight, Film, Image as ImageIcon } from 'lucide-react';
import { detectMediaKind } from '../utils/imageUpload';
import { ResilientImage } from './ResilientImage';

interface MediaGalleryViewerProps {
  primaryUrl?: string;
  gallery?: string[];
  alt: string;
  fallbackLabel?: string;
  className?: string;
  mode?: 'card' | 'thumb' | 'background';
}

export function MediaGalleryViewer({
  primaryUrl,
  gallery,
  alt,
  fallbackLabel,
  className = 'w-full h-full object-cover',
  mode = 'card',
}: MediaGalleryViewerProps) {
  const items = Array.from(
    new Set(
      [primaryUrl, ...(gallery ?? [])]
        .map((url) => String(url || '').trim())
        .filter(Boolean)
    )
  );

  const [index, setIndex] = useState(0);
  const [brokenUrls, setBrokenUrls] = useState<string[]>([]);

  if (items.length === 0) return null;

  const validItems = items.filter((u) => !brokenUrls.includes(u));
  const activeList = validItems.length > 0 ? validItems : items;
  const safeIndex = index < activeList.length ? index : 0;
  const activeUrl = activeList[safeIndex];
  const isVideo = detectMediaKind(activeUrl) !== 'image';
  const fallbackImage = validItems.find((u) => detectMediaKind(u) === 'image');

  const handleMediaError = () => {
    if (validItems.length > 1) {
      setBrokenUrls((prev) =>
        prev.includes(activeUrl) ? prev : [...prev, activeUrl]
      );
    }
  };

  if (activeList.length === 1) {
    return (
      <div className="relative w-full h-full">
        <ResilientImage
          src={activeUrl}
          alt={alt}
          fallbackLabel={fallbackLabel}
          mode={mode}
          autoPlayVideo={isVideo}
          fallbackImageUrl={fallbackImage}
          onMediaError={handleMediaError}
          className={className}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group/gallery">
      <ResilientImage
        src={activeUrl}
        alt={`${alt} (${safeIndex + 1} of ${activeList.length})`}
        fallbackLabel={fallbackLabel}
        mode={mode}
        autoPlayVideo={isVideo}
        fallbackImageUrl={fallbackImage}
        onMediaError={handleMediaError}
        className={className}
      />

      {/* Counter & Media Kind Badge */}
      <div className="absolute top-2.5 left-2.5 z-20 inline-flex items-center gap-1 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-medium tabular-nums pointer-events-none">
        {isVideo ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
        <span>
          {safeIndex + 1} / {activeList.length}
        </span>
      </div>

      {/* Prev / Next Controls */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIndex((safeIndex - 1 + activeList.length) % activeList.length);
        }}
        aria-label="Previous media item"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/92 border border-[#D4D4CE] text-[#141413] flex items-center justify-center shadow-sm hover:bg-white cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIndex((safeIndex + 1) % activeList.length);
        }}
        aria-label="Next media item"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/92 border border-[#D4D4CE] text-[#141413] flex items-center justify-center shadow-sm hover:bg-white cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Thumbnail Dots positioned safely away from video bottom bar */}
      <div
        className={`absolute z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 ${
          isVideo ? 'top-2.5 right-12' : 'bottom-2.5 right-2.5'
        }`}
      >
        {activeList.map((url, idx) => (
          <button
            key={`${url.slice(0, 32)}-${idx}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex(idx);
            }}
            aria-label={`View media ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
