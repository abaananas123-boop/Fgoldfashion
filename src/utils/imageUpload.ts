import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db, sanitizePublicMediaForFirestore } from '../firebase';

export const MEDIA_FILE_ACCEPT =
  'image/*,video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.wmv,.flv,.3gp,.3g2,.ogv,.ogg,.mpeg,.mpg,.ts,.mts,.m2ts,.vob,.heic,.heif,.avif,.tiff,.tif,.bmp,.png,.jpg,.jpeg,.webp,.gif';

export const VIDEO_FILE_ACCEPT =
  'video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.wmv,.flv,.3gp,.3g2,.ogv,.ogg,.mpeg,.mpg,.ts,.mts,.m2ts,.vob';

const VIDEO_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.webm',
  '.mkv',
  '.avi',
  '.m4v',
  '.wmv',
  '.flv',
  '.3gp',
  '.3g2',
  '.ogv',
  '.ogg',
  '.mpeg',
  '.mpg',
  '.ts',
  '.mts',
  '.m2ts',
  '.vob',
];

export function isVideoFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith('video/')) return true;
  const lowerName = file.name.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export function normalizeMediaUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, 'https://example.invalid');
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'dropbox.com' || host.endsWith('.dropbox.com')) {
      parsed.searchParams.delete('dl');
      parsed.searchParams.set('raw', '1');
      return parsed.toString();
    }
  } catch {
    // Keep original trimmed URL if relative or non-standard
  }
  return trimmed;
}

export function getVideoEmbedUrl(
  rawUrl: string,
  options?: { autoplay?: boolean }
): string | null {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;

  const auto = Boolean(options?.autoplay);

  try {
    const parsed = new URL(trimmed, 'https://example.invalid');
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      if (!videoId) return null;
      const params = new URLSearchParams({ rel: '0', playsinline: '1' });
      if (auto) {
        params.set('autoplay', '1');
        params.set('mute', '1');
        params.set('loop', '1');
        params.set('playlist', videoId);
      }
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      let videoId = '';
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/shorts/') || parsed.pathname.startsWith('/live/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
      if (!videoId) return null;
      const params = new URLSearchParams({ rel: '0', playsinline: '1' });
      if (auto) {
        params.set('autoplay', '1');
        params.set('mute', '1');
        params.set('loop', '1');
        params.set('playlist', videoId);
      }
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      let videoId = '';
      if (host === 'player.vimeo.com' && parsed.pathname.startsWith('/video/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else {
        const segments = parsed.pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (last && /^\d+$/.test(last)) videoId = last;
      }
      if (!videoId) return null;
      const params = new URLSearchParams({ playsinline: '1' });
      if (auto) {
        params.set('autoplay', '1');
        params.set('muted', '1');
        params.set('loop', '1');
      }
      return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
    }

    if (host === 'drive.google.com') {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const fileId = match?.[1] || parsed.searchParams.get('id');
      if (fileId) {
        return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
      }
    }

    if (host === 'dailymotion.com' || host === 'dai.ly') {
      const id =
        host === 'dai.ly'
          ? parsed.pathname.split('/').filter(Boolean)[0]
          : parsed.pathname.match(/\/video\/([^_/?]+)/)?.[1];
      if (id) {
        return `https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}${auto ? '?autoplay=1&mute=1' : ''}`;
      }
    }

    if (host === 'streamable.com') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id && id !== 'e') {
        return `https://streamable.com/e/${encodeURIComponent(id)}${auto ? '?autoplay=1&muted=1' : ''}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

const EXPLICIT_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.avif',
  '.heic',
  '.heif',
  '.jfif',
  '.ico',
];

const VIDEO_EXTENSION_MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
  '.ogv': 'video/ogg',
  '.ogg': 'video/ogg',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.ts': 'video/mp2t',
  '.mts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
  '.vob': 'video/dvd',
};

export function extractCloudMediaId(url: string): string | null {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/api\/media\/c\/([a-zA-Z0-9_-]{1,128})(?:[?#]|$)/);
  return match ? match[1] : null;
}

export function extractCloudMediaInfo(url: string): { id: string; parts: number } | null {
  const id = extractCloudMediaId(url);
  if (!id) return null;
  try {
    const parsed = new URL(url.trim(), 'https://example.invalid');
    const rawParts = Number(parsed.searchParams.get('parts') || 1);
    const parts =
      Number.isInteger(rawParts) && rawParts >= 2 && rawParts <= 24 ? rawParts : 1;
    return { id, parts };
  } catch {
    return { id, parts: 1 };
  }
}

export function isExplicitImageUrl(url: string): boolean {
  const lower = String(url || '').trim().toLowerCase();
  if (!lower) return false;
  if (lower.startsWith('data:image/')) return true;
  const clean = lower.split('#')[0].split('?')[0];
  if (clean.includes('/uploads/image-') || clean.includes('/api/media/c/img-')) {
    return true;
  }
  return EXPLICIT_IMAGE_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

export function getVideoMimeHint(url: string): string | undefined {
  const lower = String(url || '').trim().toLowerCase();
  if (!lower) return undefined;
  if (lower.startsWith('data:video/')) {
    return lower.slice(5).split(/[;,]/)[0] || undefined;
  }
  const clean = lower.split('#')[0].split('?')[0];
  for (const [ext, mime] of Object.entries(VIDEO_EXTENSION_MIME_MAP)) {
    if (clean.endsWith(ext)) return mime;
  }
  return undefined;
}

export type MediaKind = 'image' | 'video' | 'embed';

export function detectMediaKind(
  src: string,
  expectedKind: 'auto' | 'video' = 'auto'
): MediaKind {
  const trimmed = String(src || '').trim();
  if (!trimmed) return 'image';

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:video/')) return 'video';
  if (lower.startsWith('data:image/')) return 'image';

  if (getVideoEmbedUrl(trimmed)) return 'embed';

  const withoutHash = lower.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (VIDEO_EXTENSIONS.some((ext) => withoutQuery.endsWith(ext))) {
    return 'video';
  }

  if (
    withoutQuery.includes('/uploads/video-') ||
    withoutQuery.includes('/api/media/c/vid-') ||
    lower.includes('#video') ||
    lower.includes('media=video') ||
    lower.includes('mime=video') ||
    lower.includes('kind=video')
  ) {
    return 'video';
  }

  if (withoutQuery.includes('/api/media/c/img-')) {
    return 'image';
  }

  let decodedQuery = '';
  const qIndex = withoutHash.indexOf('?');
  if (qIndex >= 0) {
    const rawQuery = withoutHash.slice(qIndex + 1);
    try {
      decodedQuery = decodeURIComponent(rawQuery).toLowerCase();
    } catch {
      decodedQuery = rawQuery.toLowerCase();
    }
    if (
      decodedQuery.includes('content-type=video/') ||
      decodedQuery.includes('content_type=video/') ||
      decodedQuery.includes('type=video/') ||
      decodedQuery.includes('type=video&') ||
      decodedQuery.endsWith('type=video') ||
      /[?&](format|ext)=(mp4|mov|webm|mkv|avi|m4v|3gp|ogv)\b/.test(`?${decodedQuery}`)
    ) {
      return 'video';
    }
    try {
      const parsed = new URL(trimmed, 'https://example.invalid');
      for (const value of parsed.searchParams.values()) {
        const valClean = value.trim().toLowerCase().split('#')[0].split('?')[0];
        if (VIDEO_EXTENSIONS.some((ext) => valClean.endsWith(ext))) {
          return 'video';
        }
      }
    } catch {
      // Ignore invalid query parsing
    }
  }

  if (expectedKind === 'video') {
    return 'video';
  }

  return 'image';
}

const SINGLE_SHOT_MAX_BYTES = 512 * 1024; // 512 KB instant single-request upload
const PARALLEL_CHUNK_SIZE = 384 * 1024; // 384 KB proxy-safe chunks (starts ticking in <0.3s)
const PARALLEL_WORKERS = 3; // 3 concurrent streams (~1.1 MB max in flight)

function throwFriendlyUploadError(status: number, reason?: string): never {
  if (reason === 'unsupported_media_format') {
    throw new Error('Unsupported file format. Upload any image or video file.');
  }
  if (reason === 'file_too_large' || reason === 'chunk_too_large' || status === 413) {
    throw new Error('File exceeds the 500 MB upload limit.');
  }
  if (reason === 'video_processing_failed') {
    throw new Error('Could not process this video format. Try converting to MP4 (H.264) or a smaller clip.');
  }
  if (reason === 'empty_file') {
    throw new Error('Selected file is empty (0 bytes). Please choose a valid photo or video.');
  }
  if (reason === 'admin_only_upload' || status === 401 || status === 403) {
    throw new Error('Store manager session expired or unauthorized. Please sign in again and retry.');
  }
  if (status === 502 || status === 504) {
    throw new Error('Server connection timed out while uploading. Please check your connection and retry.');
  }
  if (reason) {
    throw new Error(`Upload failed (${reason}). Please try again.`);
  }
  throw new Error('Could not upload media file. Please check your connection and try again.');
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 35000
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Upload request timed out. Please check your connection and retry.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

async function pollVideoProcessingJob(
  jobId: string,
  statusToken: string,
  idToken: string,
  onProgress?: (percent: number) => void
): Promise<{ url: string; mediaKind: 'video' }> {
  const maxWaitMs = 4 * 60 * 1000;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 700));
    const resp = await fetchWithTimeout(
      `/api/media/upload/status/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Upload-Token': statusToken,
        },
      },
      15000
    );

    const data = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      status?: 'processing' | 'done' | 'error';
      progress?: number;
      url?: string;
      reason?: string;
    };

    if (!resp.ok && resp.status !== 200) {
      throwFriendlyUploadError(resp.status, data.reason);
    }

    if (data.status === 'error' || data.ok === false) {
      throwFriendlyUploadError(resp.status || 500, data.reason || 'video_processing_failed');
    }

    if (data.status === 'done' && data.url) {
      onProgress?.(100);
      return { url: data.url, mediaKind: 'video' };
    }

    const jobPct = Number(data.progress || 0);
    const mappedPct = Math.min(99, Math.max(95, Math.round(95 + (jobPct / 100) * 4)));
    onProgress?.(mappedPct);
  }

  throw new Error('Video optimization took too long. Please try a shorter or pre-compressed MP4 clip.');
}

function xhrSendBinary<T = Record<string, unknown>>(
  method: 'POST' | 'PUT',
  url: string,
  headers: Record<string, string>,
  body: Blob,
  timeoutMs: number,
  onUploadBytes?: (loadedBytes: number) => void
): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = timeoutMs;
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable || ev.loaded > 0) {
        onUploadBytes?.(ev.loaded);
      }
    };

    xhr.onload = () => {
      let data = {} as T;
      try {
        data = JSON.parse(xhr.responseText || '{}') as T;
      } catch {
        data = {} as T;
      }
      resolve({ status: xhr.status, data });
    };

    xhr.onerror = () => {
      reject(new Error('Network connection interrupted while uploading media.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload request timed out. Please check your connection and retry.'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload was cancelled.'));
    };

    xhr.send(body);
  });
}

const CLOUD_MEDIA_MAX_DATA_URL_LEN = 700000;
const CLOUD_VIDEO_CHUNK_RAW_BYTES = 491520; // divisible by 3 -> ~655 KB base64 per Firestore doc
const CLOUD_VIDEO_MAX_CHUNKS = 24; // ~11.8 MB max cloud-persisted video

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const BLOCK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += BLOCK) {
    const slice = bytes.subarray(i, Math.min(bytes.length, i + BLOCK));
    parts.push(String.fromCharCode.apply(null, Array.from(slice)));
  }
  return btoa(parts.join(''));
}

async function persistMediaDataUrlToCloud(
  dataUrl: string,
  mediaKind: 'image' | 'video'
): Promise<string> {
  const prefix = mediaKind === 'video' ? 'vid' : 'img';
  const rawId = `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const { id, payload } = sanitizePublicMediaForFirestore({
    id: rawId,
    dataUrl,
    mediaKind,
  });
  await setDoc(doc(db, 'publicMedia', id), payload);
  return `/api/media/c/${id}`;
}

async function tryPersistUploadedVideoToCloud(serverUrl: string): Promise<string> {
  try {
    const resp = await fetchWithTimeout(serverUrl, { method: 'GET' }, 30000);
    if (!resp.ok) return serverUrl;
    const rawBuffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(rawBuffer);
    if (bytes.length === 0 || bytes.length > CLOUD_VIDEO_CHUNK_RAW_BYTES * CLOUD_VIDEO_MAX_CHUNKS) {
      return serverUrl;
    }

    const mimeType =
      (resp.headers.get('content-type') || 'video/mp4').split(';')[0].trim() || 'video/mp4';
    const dataPrefix = `data:${mimeType.startsWith('video/') ? mimeType : 'video/mp4'};base64,`;

    if (bytes.length <= CLOUD_VIDEO_CHUNK_RAW_BYTES) {
      const singleDataUrl = `${dataPrefix}${uint8ArrayToBase64(bytes)}`;
      if (singleDataUrl.length <= CLOUD_MEDIA_MAX_DATA_URL_LEN) {
        return await persistMediaDataUrlToCloud(singleDataUrl, 'video');
      }
    }

    const totalParts = Math.ceil(bytes.length / CLOUD_VIDEO_CHUNK_RAW_BYTES);
    if (totalParts < 2 || totalParts > CLOUD_VIDEO_MAX_CHUNKS) {
      return serverUrl;
    }

    const baseId = `vid-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const BATCH_LIMIT = 4;
    for (let batchStart = 0; batchStart < totalParts; batchStart += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const batchEnd = Math.min(totalParts, batchStart + BATCH_LIMIT);
      for (let partIdx = batchStart; partIdx < batchEnd; partIdx++) {
        const startByte = partIdx * CLOUD_VIDEO_CHUNK_RAW_BYTES;
        const endByte = Math.min(bytes.length, startByte + CLOUD_VIDEO_CHUNK_RAW_BYTES);
        const chunkDataUrl = `${dataPrefix}${uint8ArrayToBase64(
          bytes.subarray(startByte, endByte)
        )}`;
        const { id: partDocId, payload } = sanitizePublicMediaForFirestore({
          id: `${baseId}-p${partIdx}`,
          dataUrl: chunkDataUrl,
          mediaKind: 'video',
        });
        batch.set(doc(db, 'publicMedia', partDocId), payload);
      }
      await batch.commit();
    }

    return `/api/media/c/${baseId}?parts=${totalParts}`;
  } catch {
    // Keep serverUrl fallback if cloud persistence is skipped
  }
  return serverUrl;
}

export async function uploadStoreMediaFile(
  file: File,
  options?: {
    videoOnly?: boolean;
    onProgress?: (percent: number) => void;
  }
): Promise<{ url: string; mediaKind: 'image' | 'video' }> {
  const videoDetected = isVideoFile(file);
  if (options?.videoOnly && !videoDetected) {
    throw new Error('Please choose a video file (.mp4, .mov, .webm, .mkv, .avi, etc.).');
  }
  if (file.size <= 0) {
    throw new Error('Selected file is empty (0 bytes). Please choose a valid photo or video.');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in as the store manager before uploading photos or videos.');
  }

  // Persist all browser-decodable images directly to Firestore publicMedia so they work
  // seamlessly across dev previews, published links, TikTok/social in-app browsers, and restarts.
  if (!videoDetected) {
    options?.onProgress?.(10);
    try {
      const compressedDataUrl = await readAndCompressImageFile(file, 1440, 420000);
      options?.onProgress?.(60);
      if (
        compressedDataUrl.startsWith('data:image/') &&
        compressedDataUrl.length <= CLOUD_MEDIA_MAX_DATA_URL_LEN
      ) {
        const cloudUrl = await persistMediaDataUrlToCloud(compressedDataUrl, 'image');
        options?.onProgress?.(100);
        return { url: cloudUrl, mediaKind: 'image' };
      }
    } catch {
      // Fall back to server binary upload below (e.g. if browser cannot decode exotic image format)
    }
  }

  options?.onProgress?.(2);
  let idToken = await user.getIdToken();

  // Fast single-shot path for files <= 512 KB with real byte progress + automatic 401 refresh
  if (file.size <= SINGLE_SHOT_MAX_BYTES) {
    options?.onProgress?.(5);
    const sendSingle = (token: string) =>
      xhrSendBinary<{
        ok?: boolean;
        processing?: boolean;
        jobId?: string;
        statusToken?: string;
        url?: string;
        mediaKind?: 'image' | 'video';
        reason?: string;
      }>(
        'POST',
        '/api/media/upload',
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
        },
        file,
        60000,
        (loaded) => {
          const pct = Math.min(95, Math.max(5, Math.round((loaded / Math.max(1, file.size)) * 90) + 5));
          options?.onProgress?.(pct);
        }
      );

    let { status, data } = await sendSingle(idToken);
    if (status === 401) {
      idToken = await user.getIdToken(true);
      const retryRes = await sendSingle(idToken);
      status = retryRes.status;
      data = retryRes.data;
    }

    if (status >= 200 && status < 300 && data.ok && data.processing && data.jobId && data.statusToken) {
      options?.onProgress?.(95);
      const processed = await pollVideoProcessingJob(
        data.jobId,
        data.statusToken,
        idToken,
        options?.onProgress
      );
      const finalUrl = await tryPersistUploadedVideoToCloud(processed.url);
      return { url: finalUrl, mediaKind: 'video' };
    }

    if (status < 200 || status >= 300 || !data.ok || !data.url) {
      throwFriendlyUploadError(status, data.reason);
    }

    const resolvedUrl =
      (data.mediaKind ?? (videoDetected ? 'video' : 'image')) === 'video'
        ? await tryPersistUploadedVideoToCloud(data.url)
        : data.url;
    options?.onProgress?.(100);
    return {
      url: resolvedUrl,
      mediaKind: data.mediaKind ?? (videoDetected ? 'video' : 'image'),
    };
  }

  // Parallel chunked upload via POST + XHR upload progress for larger videos/photos
  options?.onProgress?.(3);
  const initSession = async (token: string) =>
    fetchWithTimeout(
      '/api/media/upload/init',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      },
      25000
    );

  let initResp = await initSession(idToken);
  if (initResp.status === 401) {
    idToken = await user.getIdToken(true);
    initResp = await initSession(idToken);
  }

  const initData = (await initResp.json().catch(() => ({}))) as {
    ok?: boolean;
    sessionId?: string;
    uploadToken?: string;
    reason?: string;
  };
  if (!initResp.ok || !initData.ok || !initData.sessionId || !initData.uploadToken) {
    throwFriendlyUploadError(initResp.status, initData.reason);
  }

  options?.onProgress?.(5);
  const { sessionId, uploadToken } = initData;
  const totalBytes = file.size;
  const chunkOffsets: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < totalBytes; start += PARALLEL_CHUNK_SIZE) {
    chunkOffsets.push({
      start,
      end: Math.min(totalBytes, start + PARALLEL_CHUNK_SIZE),
    });
  }

  const inFlightLoaded = new Array<number>(chunkOffsets.length).fill(0);
  const emitByteProgress = () => {
    const uploadedSoFar = inFlightLoaded.reduce((acc, n) => acc + n, 0);
    const pct = Math.min(94, Math.max(5, Math.round((uploadedSoFar / totalBytes) * 89) + 5));
    options?.onProgress?.(pct);
  };

  let nextIdx = 0;

  const uploadSingleChunk = async (chunkIdx: number, start: number, end: number) => {
    const chunkLen = end - start;
    const blob = file.slice(start, end);
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        inFlightLoaded[chunkIdx] = 0;
        const { status, data } = await xhrSendBinary<{ ok?: boolean; reason?: string }>(
          'POST',
          `/api/media/upload/chunk/${encodeURIComponent(sessionId)}/${start}`,
          {
            'X-Upload-Token': uploadToken,
            'Content-Type': 'application/octet-stream',
          },
          blob,
          90000,
          (loaded) => {
            inFlightLoaded[chunkIdx] = Math.min(chunkLen, loaded);
            emitByteProgress();
          }
        );

        if (status < 200 || status >= 300 || !data.ok) {
          throw new Error(data.reason || `chunk_http_${status}`);
        }
        inFlightLoaded[chunkIdx] = chunkLen;
        emitByteProgress();
        return;
      } catch (err) {
        inFlightLoaded[chunkIdx] = 0;
        emitByteProgress();
        lastErr = err;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Chunk upload failed.');
  };

  const workerCount = Math.min(PARALLEL_WORKERS, chunkOffsets.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIdx < chunkOffsets.length) {
        const myIdx = nextIdx;
        nextIdx += 1;
        const { start, end } = chunkOffsets[myIdx];
        await uploadSingleChunk(myIdx, start, end);
      }
    })
  );

  options?.onProgress?.(95);
  const completeResp = await fetchWithTimeout(
    `/api/media/upload/complete/${encodeURIComponent(sessionId)}`,
    {
      method: 'POST',
      headers: {
        'X-Upload-Token': uploadToken,
      },
    },
    45000
  );

  const completeData = (await completeResp.json().catch(() => ({}))) as {
    ok?: boolean;
    processing?: boolean;
    jobId?: string;
    statusToken?: string;
    url?: string;
    mediaKind?: 'image' | 'video';
    reason?: string;
  };

  if (
    completeResp.ok &&
    completeData.ok &&
    completeData.processing &&
    completeData.jobId &&
    completeData.statusToken
  ) {
    const processed = await pollVideoProcessingJob(
      completeData.jobId,
      completeData.statusToken,
      idToken,
      options?.onProgress
    );
    const finalUrl = await tryPersistUploadedVideoToCloud(processed.url);
    return { url: finalUrl, mediaKind: 'video' };
  }

  if (!completeResp.ok || !completeData.ok || !completeData.url) {
    throwFriendlyUploadError(completeResp.status, completeData.reason);
  }

  const finalUrl =
    (completeData.mediaKind ?? (videoDetected ? 'video' : 'image')) === 'video'
      ? await tryPersistUploadedVideoToCloud(completeData.url)
      : completeData.url;
  options?.onProgress?.(100);
  return {
    url: finalUrl,
    mediaKind: completeData.mediaKind ?? (videoDetected ? 'video' : 'image'),
  };
}

export async function uploadMultipleStoreMediaFiles(
  files: FileList | File[],
  options?: {
    videoOnly?: boolean;
    maxFiles?: number;
    onProgress?: (percent: number, activeLabel?: string) => void;
  }
): Promise<Array<{ url: string; mediaKind: 'image' | 'video'; fileName: string }>> {
  const list = Array.from(files).slice(0, options?.maxFiles ?? 12);
  if (list.length === 0) return [];

  if (list.length === 1) {
    const single = list[0];
    const res = await uploadStoreMediaFile(single, {
      videoOnly: options?.videoOnly,
      onProgress: (pct) => options?.onProgress?.(pct, single.name),
    });
    return [{ ...res, fileName: single.name }];
  }

  const totalBytes = Math.max(
    1,
    list.reduce((sum, f) => sum + Math.max(1, f.size), 0)
  );
  const progressPerFile = new Array<number>(list.length).fill(0);
  const results = new Array<{ url: string; mediaKind: 'image' | 'video'; fileName: string }>(
    list.length
  );

  let nextIndex = 0;
  const hasLargeOrVideo = list.some((f) => isVideoFile(f) || f.size > 2 * 1024 * 1024);
  const maxConcurrent = hasLargeOrVideo ? 1 : Math.min(3, list.length);

  await Promise.all(
    Array.from({ length: maxConcurrent }, async () => {
      while (nextIndex < list.length) {
        const idx = nextIndex;
        nextIndex += 1;
        const file = list[idx];
        const res = await uploadStoreMediaFile(file, {
          videoOnly: options?.videoOnly,
          onProgress: (pct) => {
            progressPerFile[idx] = pct;
            const weighted =
              list.reduce(
                (acc, f, fIdx) => acc + (Math.max(1, f.size) * progressPerFile[fIdx]) / 100,
                0
              ) / totalBytes;
            options?.onProgress?.(
              Math.min(99, Math.max(2, Math.round(weighted * 100))),
              `${idx + 1}/${list.length}`
            );
          },
        });
        progressPerFile[idx] = 100;
        results[idx] = { ...res, fileName: file.name };
      }
    })
  );

  options?.onProgress?.(100);
  return results;
}

export function readAndCompressImageFile(
  file: File,
  maxDimension = 1280,
  maxLength = 350000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Invalid image file.'));
        return;
      }
      const dataUrl = reader.result;
      if (
        /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(dataUrl) &&
        dataUrl.length <= maxLength
      ) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image file.'));
      img.onload = () => {
        const tryCompress = (dim: number, quality: number): string => {
          const scale = Math.min(
            1,
            dim / Math.max(img.width || 1, img.height || 1)
          );
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return dataUrl;
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', quality);
        };

        for (const q of [0.86, 0.78, 0.68, 0.56]) {
          const attempt = tryCompress(maxDimension, q);
          if (attempt.length <= maxLength) {
            resolve(attempt);
            return;
          }
        }

        const mediumDim = Math.max(480, Math.round(maxDimension * 0.7));
        for (const q of [0.76, 0.64, 0.5]) {
          const attempt = tryCompress(mediumDim, q);
          if (attempt.length <= maxLength) {
            resolve(attempt);
            return;
          }
        }

        const smallDim = Math.max(360, Math.round(maxDimension * 0.5));
        for (const q of [0.64, 0.48]) {
          const attempt = tryCompress(smallDim, q);
          if (attempt.length <= maxLength) {
            resolve(attempt);
            return;
          }
        }

        resolve(tryCompress(Math.max(320, Math.round(maxDimension * 0.4)), 0.42));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
