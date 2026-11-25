import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ExternalLink, Film, Play, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { db } from '../firebase';
import {
  detectMediaKind,
  extractCloudMediaInfo,
  getVideoEmbedUrl,
  getVideoMimeHint,
  isExplicitImageUrl,
  normalizeMediaUrl,
} from '../utils/imageUpload';
import { isInAppSocialBrowser } from '../utils/social';

export type ResilientMediaMode = 'default' | 'background' | 'thumb' | 'card';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  mode?: ResilientMediaMode;
  autoPlayVideo?: boolean;
  showVideoControls?: boolean;
  expectedKind?: 'auto' | 'video';
  posterUrl?: string;
  fallbackImageUrl?: string;
  onMediaError?: () => void;
}

function getThumbVideoSrc(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.includes('#')) {
    return url;
  }
  return `${url}#t=0.001`;
}

function decodeBase64DataUrlChunk(dataUrl: string): { mimeType: string; bytes: Uint8Array } | null {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const header = dataUrl.slice(5, commaIdx);
  if (!header.includes(';base64')) return null;
  const mimeType = header.split(';')[0].trim() || 'application/octet-stream';
  const binary = atob(dataUrl.slice(commaIdx + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { mimeType, bytes };
}

function getVideoErrorDescription({
  isMissing,
  errorCode,
  mimeHint,
}: {
  isMissing: boolean;
  errorCode: number | null;
  mimeHint?: string;
}): string {
  if (isMissing) {
    return 'Media file was not found on the server (previous temporary upload expired). Please re-upload it in Store Manager.';
  }
  if (errorCode === 4) {
    if (mimeHint && mimeHint !== 'video/mp4' && mimeHint !== 'video/webm') {
      return `This browser cannot natively play ${mimeHint} streams. Re-upload in Store Manager to convert it to universal MP4 (H.264).`;
    }
    return 'Video format is unsupported or its URL is broken. Re-upload via Store Manager or check the video link.';
  }
  if (errorCode === 3) {
    return 'Video codec failed to decode on this device. Re-upload in Store Manager to convert to H.264 MP4.';
  }
  if (errorCode === 2) {
    return 'Network error prevented the video from loading. Check your connection and retry.';
  }
  return 'Video could not be loaded right now.';
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  mode = 'default',
  autoPlayVideo = false,
  showVideoControls = true,
  expectedKind = 'auto',
  posterUrl,
  fallbackImageUrl,
  onMediaError,
}: ResilientImageProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [videoErrorCode, setVideoErrorCode] = useState<number | null>(null);
  const [isVideoFileMissing, setIsVideoFileMissing] = useState(false);
  const [hasFallbackImageError, setHasFallbackImageError] = useState(false);
  const [probedAsVideo, setProbedAsVideo] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [cloudResolvedUrl, setCloudResolvedUrl] = useState<string | null>(null);
  const [cloudResolvedKind, setCloudResolvedKind] = useState<'image' | 'video' | null>(null);
  const [isMuted, setIsMuted] = useState(
    Boolean(autoPlayVideo || mode === 'background' || mode === 'thumb')
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasUserToggledAudioRef = useRef(false);
  const cloudLookupAttemptedRef = useRef(false);
  const blobUrlRef = useRef<string | null>(null);
  const onMediaErrorRef = useRef(onMediaError);
  onMediaErrorRef.current = onMediaError;

  const revokeActiveBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const normalizedSrc = normalizeMediaUrl(src);
  const effectiveSrc = cloudResolvedUrl || normalizedSrc;
  const resolvedFallbackImage =
    [fallbackImageUrl, posterUrl]
      .map((candidate) => normalizeMediaUrl(candidate || ''))
      .find(
        (candidate) =>
          Boolean(candidate) &&
          candidate !== normalizedSrc &&
          detectMediaKind(candidate) === 'image'
      ) || '';

  useEffect(() => {
    revokeActiveBlobUrl();
    setHasImageError(false);
    setHasVideoError(false);
    setVideoErrorCode(null);
    setIsVideoFileMissing(false);
    setHasFallbackImageError(false);
    setProbedAsVideo(false);
    setAutoplayBlocked(false);
    setRetryNonce(0);
    setCloudResolvedUrl(null);
    setCloudResolvedKind(null);
    cloudLookupAttemptedRef.current = false;
    hasUserToggledAudioRef.current = false;
    setIsMuted(Boolean(autoPlayVideo || mode === 'background' || mode === 'thumb'));
    return () => {
      revokeActiveBlobUrl();
    };
  }, [normalizedSrc, resolvedFallbackImage, expectedKind, autoPlayVideo, mode]);

  const tryRecoverFromCloudMedia = async (): Promise<boolean> => {
    if (cloudLookupAttemptedRef.current) return false;
    const info = extractCloudMediaInfo(normalizedSrc);
    if (!info) return false;
    cloudLookupAttemptedRef.current = true;
    try {
      if (info.parts <= 1) {
        const snap = await getDoc(doc(db, 'publicMedia', info.id));
        const docData = snap.data();
        const dataUrl = docData?.dataUrl;
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
          const kindHint: 'image' | 'video' =
            docData?.mediaKind === 'video' || dataUrl.startsWith('data:video/')
              ? 'video'
              : 'image';
          setHasImageError(false);
          setHasVideoError(false);
          setIsVideoFileMissing(false);
          setCloudResolvedKind(kindHint);
          setCloudResolvedUrl(dataUrl);
          return true;
        }
        return false;
      }

      const partSnaps = await Promise.all(
        Array.from({ length: info.parts }, (_, idx) =>
          getDoc(doc(db, 'publicMedia', `${info.id}-p${idx}`))
        )
      );
      const byteChunks: Uint8Array[] = [];
      let detectedMime = 'video/mp4';
      let kindHint: 'image' | 'video' = 'video';

      for (const partSnap of partSnaps) {
        if (!partSnap.exists()) return false;
        const partData = partSnap.data();
        const decoded = decodeBase64DataUrlChunk(String(partData?.dataUrl || ''));
        if (!decoded) return false;
        detectedMime = decoded.mimeType;
        if (partData?.mediaKind === 'image') kindHint = 'image';
        if (partData?.mediaKind === 'video') kindHint = 'video';
        byteChunks.push(decoded.bytes);
      }

      if (byteChunks.length === 0) return false;
      const blobParts = byteChunks.map((chunk) => {
        const copy = new Uint8Array(chunk.byteLength);
        copy.set(chunk);
        return copy.buffer;
      });
      const blob = new Blob(blobParts, { type: detectedMime });
      const blobUrl = URL.createObjectURL(blob);
      revokeActiveBlobUrl();
      blobUrlRef.current = blobUrl;
      setHasImageError(false);
      setHasVideoError(false);
      setIsVideoFileMissing(false);
      setCloudResolvedKind(kindHint);
      setCloudResolvedUrl(blobUrl);
      return true;
    } catch {
      // Ignore cloud recovery lookup failure and proceed to error state
    }
    return false;
  };

  const detectedKind =
    cloudResolvedKind ?? detectMediaKind(effectiveSrc, expectedKind);
  const mediaKind =
    detectedKind === 'image' && probedAsVideo ? 'video' : detectedKind;

  const shouldAutoPlay = mode === 'background' || Boolean(autoPlayVideo);
  const interactiveVideoClass =
    mode === 'background' || mode === 'thumb'
      ? className
      : className.replace(/\bobject-cover\b/g, 'object-contain');

  // Imperatively enforce DOM muted/playsInline attributes & trigger autoplay cleanly
  // without re-muting after a user explicitly unmutes.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || mediaKind !== 'video' || hasVideoError || mode === 'thumb') return;

    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', 'true');

    if (mode === 'background' || (shouldAutoPlay && !hasUserToggledAudioRef.current)) {
      el.muted = true;
      el.defaultMuted = true;
      el.setAttribute('muted', '');
    }

    if (shouldAutoPlay) {
      let cancelled = false;
      const attemptPlay = () => {
        if (cancelled) return;
        if (mode === 'background' || !hasUserToggledAudioRef.current) {
          el.muted = true;
          el.defaultMuted = true;
        }
        const p = el.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (!cancelled) {
              setAutoplayBlocked(false);
            }
          }).catch((err: unknown) => {
            if (cancelled) return;
            const errName = err instanceof Error ? err.name : '';
            if (errName === 'NotAllowedError') {
              setAutoplayBlocked(true);
            }
          });
        }
      };

      if (el.readyState >= 2) {
        attemptPlay();
      } else {
        const onReady = () => attemptPlay();
        el.addEventListener('loadeddata', onReady, { once: true });
        el.addEventListener('canplay', onReady, { once: true });
        return () => {
          cancelled = true;
          el.removeEventListener('loadeddata', onReady);
          el.removeEventListener('canplay', onReady);
        };
      }

      return () => {
        cancelled = true;
      };
    }
  }, [mediaKind, hasVideoError, mode, shouldAutoPlay, effectiveSrc, retryNonce]);

  const handleVideoLoadError = (e: SyntheticEvent<HTMLVideoElement>) => {
    const code = e.currentTarget.error?.code ?? null;
    void (async () => {
      const recovered = await tryRecoverFromCloudMedia();
      if (recovered) return;
      setVideoErrorCode(code);
      setHasVideoError(true);
      if (normalizedSrc.startsWith('/uploads/') || normalizedSrc.startsWith('/api/media/c/')) {
        void fetch(normalizedSrc, { method: 'HEAD' })
          .then((res) => {
            if (res.status === 404 || res.status === 410) {
              setIsVideoFileMissing(true);
            }
          })
          .catch(() => {});
      }
      onMediaErrorRef.current?.();
    })();
  };

  if (!effectiveSrc || (mediaKind === 'image' && hasImageError)) {
    if (resolvedFallbackImage && !hasFallbackImageError) {
      return (
        <img
          src={resolvedFallbackImage}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasFallbackImageError(true)}
          className={className}
        />
      );
    }
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#F2F2F0] text-[#5A5A56] p-6 text-center ${className}`}
      >
        <Sparkles className="w-6 h-6 mb-2 opacity-50" strokeWidth={1.5} />
        {mode !== 'thumb' && mode !== 'background' && (
          <span className="font-serif text-base text-[#141413]">
            {fallbackLabel || alt}
          </span>
        )}
      </div>
    );
  }

  if (mediaKind === 'embed') {
    const embedUrl = getVideoEmbedUrl(effectiveSrc, { autoplay: shouldAutoPlay });
    if (!embedUrl || mode === 'thumb') {
      if (mode === 'thumb' && resolvedFallbackImage && !hasFallbackImageError) {
        return (
          <img
            src={resolvedFallbackImage}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setHasFallbackImageError(true)}
            className={className}
          />
        );
      }
      return (
        <div
          aria-label={alt}
          className={`flex flex-col items-center justify-center bg-[#141413] text-white p-3 text-center ${className}`}
        >
          <Film className="w-5 h-5 opacity-80" strokeWidth={1.75} />
          {mode !== 'thumb' && (
            <span className="text-xs mt-1.5 opacity-85">
              {fallbackLabel || alt || 'Video'}
            </span>
          )}
        </div>
      );
    }

    return (
      <iframe
        src={embedUrl}
        title={alt || fallbackLabel || 'Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onClick={(e) => e.stopPropagation()}
        className={`block w-full h-full border-0 bg-black ${mode === 'background' ? 'pointer-events-none' : ''} ${className}`}
      />
    );
  }

  if (mediaKind === 'video') {
    if (hasVideoError) {
      const canShowFallbackImg =
        Boolean(resolvedFallbackImage) && !hasFallbackImageError;
      const reasonText = getVideoErrorDescription({
        isMissing: isVideoFileMissing,
        errorCode: videoErrorCode,
        mimeHint: getVideoMimeHint(effectiveSrc),
      });

      if (canShowFallbackImg) {
        if (mode === 'background' || mode === 'thumb') {
          return (
            <img
              src={resolvedFallbackImage}
              alt={alt}
              referrerPolicy="no-referrer"
              onError={() => setHasFallbackImageError(true)}
              className={className}
            />
          );
        }

        return (
          <div
            className="relative w-full h-full bg-[#141413] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolvedFallbackImage}
              alt={alt}
              referrerPolicy="no-referrer"
              onError={() => setHasFallbackImageError(true)}
              className={`block w-full h-full object-cover ${className.replace(/\bobject-contain\b/g, 'object-cover')}`}
            />
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/65 to-transparent px-3.5 py-2.5 flex items-center justify-between gap-2 text-white">
              <div className="min-w-0 flex items-center gap-2">
                <Film className="w-3.5 h-3.5 shrink-0 opacity-85" />
                <span className="text-[11px] leading-tight text-white/90 truncate">
                  {isVideoFileMissing
                    ? 'Video expired on server — showing preview photo'
                    : 'Video unavailable — showing preview photo'}
                </span>
              </div>
              {!isVideoFileMissing && (
                <button
                  type="button"
                  onClick={() => {
                    setHasVideoError(false);
                    setVideoErrorCode(null);
                    setAutoplayBlocked(false);
                    setRetryNonce((n) => n + 1);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        );
      }

      if (mode === 'background' || mode === 'thumb') {
        return (
          <div
            aria-label={alt}
            className={`flex items-center justify-center bg-[#141413] text-white/80 ${className}`}
          >
            <Film className="w-5 h-5" strokeWidth={1.75} />
          </div>
        );
      }

      return (
        <div
          className={`flex flex-col items-center justify-center gap-2.5 bg-[#141413] text-white p-6 text-center ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Film className="w-7 h-7 opacity-80" strokeWidth={1.5} />
          <p className="font-serif text-base">
            {fallbackLabel || alt || 'Video Unavailable'}
          </p>
          <p className="text-xs text-white/75 max-w-xs leading-relaxed">
            {reasonText}
          </p>
          {!isVideoFileMissing && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setHasVideoError(false);
                  setVideoErrorCode(null);
                  setAutoplayBlocked(false);
                  setRetryNonce((n) => n + 1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/15 text-white border border-white/25 rounded hover:bg-white/25 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Video</span>
              </button>
              <a
                href={effectiveSrc}
                target={isInAppSocialBrowser() ? undefined : '_blank'}
                rel={isInAppSocialBrowser() ? undefined : 'noopener noreferrer'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-[#141413] rounded hover:bg-[#F2F2F0] transition-colors"
              >
                <span>Open / Play Video</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      );
    }

    if (mode === 'background') {
      return (
        <video
          ref={videoRef}
          key={`${effectiveSrc}-${retryNonce}`}
          src={effectiveSrc}
          poster={resolvedFallbackImage || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={handleVideoLoadError}
          className={className}
        />
      );
    }

    if (mode === 'thumb') {
      return (
        <video
          ref={videoRef}
          key={`${effectiveSrc}-${retryNonce}`}
          src={getThumbVideoSrc(effectiveSrc)}
          poster={resolvedFallbackImage || undefined}
          muted
          playsInline
          preload="metadata"
          aria-label={alt}
          onError={handleVideoLoadError}
          className={className}
        />
      );
    }

    const handleManualPlay = () => {
      const el = videoRef.current;
      if (!el) return;
      el.muted = isMuted;
      void el
        .play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => {
          el.muted = true;
          setIsMuted(true);
          void el.play().then(() => setAutoplayBlocked(false)).catch(() => {});
        });
    };

    const handleToggleMute = () => {
      const el = videoRef.current;
      if (!el) return;
      hasUserToggledAudioRef.current = true;
      const nextMuted = !el.muted;
      el.muted = nextMuted;
      el.defaultMuted = nextMuted;
      setIsMuted(nextMuted);
      if (el.paused) {
        void el.play().catch(() => {});
      }
    };

    return (
      <div
        className="relative w-full h-full bg-black group/video"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          key={`${effectiveSrc}-${retryNonce}`}
          src={effectiveSrc}
          poster={resolvedFallbackImage || undefined}
          controls={showVideoControls}
          autoPlay={shouldAutoPlay}
          muted={isMuted}
          loop={shouldAutoPlay}
          playsInline
          preload="auto"
          aria-label={alt}
          onPlay={() => setAutoplayBlocked(false)}
          onVolumeChange={(e) => {
            setIsMuted(e.currentTarget.muted);
          }}
          onError={handleVideoLoadError}
          className={`block w-full h-full bg-black ${interactiveVideoClass}`}
        />

        {autoplayBlocked && (
          <button
            type="button"
            onClick={handleManualPlay}
            aria-label={`Play video for ${alt}`}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 text-white transition-colors hover:bg-black/45 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#141413] text-xs font-semibold shadow-lg">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Video</span>
            </span>
          </button>
        )}

        {!autoplayBlocked && shouldAutoPlay && (
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            title={isMuted ? 'Unmute video' : 'Mute video'}
            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/85 transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <img
      key={`${effectiveSrc}-${retryNonce}`}
      src={effectiveSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        void (async () => {
          const recovered = await tryRecoverFromCloudMedia();
          if (recovered) return;
          if (!probedAsVideo && !isExplicitImageUrl(effectiveSrc)) {
            setProbedAsVideo(true);
          } else {
            setHasImageError(true);
            setHasVideoError(true);
            onMediaErrorRef.current?.();
          }
        })();
      }}
      className={className}
    />
  );
}

