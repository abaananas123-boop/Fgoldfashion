import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_EMAIL = 'abaananas123@gmail.com';
const MAX_MEDIA_BYTES = 500 * 1024 * 1024; // 500 MB max per upload
const MAX_CHUNK_BYTES = 16 * 1024 * 1024; // 16 MB max per chunk
const uploadsDir = path.resolve(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Remove any orphaned .part-* temp files left by previous restarts/aborts
try {
  for (const name of fs.readdirSync(uploadsDir)) {
    if (name.startsWith('.part-')) {
      fs.unlink(path.join(uploadsDir, name), () => {});
    }
  }
} catch {
  // ignore startup cleanup errors
}

const UPLOAD_HMAC_SECRET = crypto.randomBytes(32);

const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseWebApiKey = '';
let firebaseProjectId = '';
let firebaseDatabaseId = '(default)';
try {
  const rawConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8')) as {
    apiKey?: string;
    projectId?: string;
    firestoreDatabaseId?: string;
  };
  firebaseWebApiKey = String(rawConfig.apiKey || '').trim();
  firebaseProjectId = String(rawConfig.projectId || '').trim();
  firebaseDatabaseId = String(rawConfig.firestoreDatabaseId || '(default)').trim() || '(default)';
} catch {
  firebaseWebApiKey = '';
  firebaseProjectId = '';
  firebaseDatabaseId = '(default)';
}

const ADMIN_TOKEN_CACHE_TTL_MS = 4 * 60 * 1000;
const verifiedAdminTokenCache = new Map<string, number>();

interface ChunkUploadSession {
  sessionId: string;
  storedName: string;
  partPath: string;
  finalPath: string;
  mediaKind: 'image' | 'video';
  ext: string;
  expectedSize: number;
  receivedBytes: number;
  fileHandle: fs.promises.FileHandle;
  createdAt: number;
}

const activeUploadSessions = new Map<string, ChunkUploadSession>();

interface VideoProcessingJob {
  jobId: string;
  status: 'processing' | 'done' | 'error';
  progress: number;
  url?: string;
  mediaKind: 'video';
  size?: number;
  reason?: string;
  startedAt: number;
  finishedAt?: number;
}

const videoProcessingJobs = new Map<string, VideoProcessingJob>();

// Periodically clean up abandoned chunk sessions & completed video jobs
setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of activeUploadSessions.entries()) {
    if (now - session.createdAt > 20 * 60 * 1000) {
      activeUploadSessions.delete(sid);
      void session.fileHandle.close().catch(() => {});
      fs.unlink(session.partPath, () => {});
    }
  }
  for (const [jid, job] of videoProcessingJobs.entries()) {
    if (now - job.startedAt > 30 * 60 * 1000) {
      videoProcessingJobs.delete(jid);
    }
  }
}, 5 * 60 * 1000).unref();

const ALLOWED_IMAGE_EXTENSIONS = new Set([
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
]);

const ALLOWED_VIDEO_EXTENSIONS = new Set([
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
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/x-icon': '.ico',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-matroska': '.mkv',
  'video/x-msvideo': '.avi',
  'video/avi': '.avi',
  'video/x-m4v': '.m4v',
  'video/x-ms-wmv': '.wmv',
  'video/x-flv': '.flv',
  'video/3gpp': '.3gp',
  'video/3gpp2': '.3g2',
  'video/ogg': '.ogv',
  'video/mpeg': '.mpeg',
  'video/mp2t': '.ts',
};

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.ico': 'image/x-icon',
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
  '.vob': 'video/mp2p',
};

function resolveUploadMediaMeta(
  rawFileName: string,
  contentType: string
): { ext: string; mediaKind: 'image' | 'video' } | null {
  let decodedName = rawFileName;
  try {
    decodedName = decodeURIComponent(rawFileName);
  } catch {
    decodedName = rawFileName;
  }
  const cleanName = path.basename(decodedName || 'media');
  const rawExt = path.extname(cleanName).toLowerCase();
  const normalizedMime = String(contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (ALLOWED_VIDEO_EXTENSIONS.has(rawExt)) {
    return { ext: rawExt, mediaKind: 'video' };
  }
  if (ALLOWED_IMAGE_EXTENSIONS.has(rawExt)) {
    return { ext: rawExt, mediaKind: 'image' };
  }
  if (normalizedMime.startsWith('video/')) {
    return {
      ext: MIME_TO_EXT[normalizedMime] || '.mp4',
      mediaKind: 'video',
    };
  }
  if (normalizedMime.startsWith('image/') && normalizedMime !== 'image/svg+xml') {
    return {
      ext: MIME_TO_EXT[normalizedMime] || '.jpg',
      mediaKind: 'image',
    };
  }
  return null;
}

async function verifyAdminBearerToken(
  authHeader: string | undefined
): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, reason: 'missing_auth_token' };
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || !firebaseWebApiKey) {
    return { ok: false, status: 401, reason: 'invalid_auth_configuration' };
  }

  const tokenHash = crypto.createHash('sha256').update(idToken).digest('hex');
  const cachedExpiry = verifiedAdminTokenCache.get(tokenHash);
  if (cachedExpiry && cachedExpiry > Date.now()) {
    return { ok: true };
  }

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        firebaseWebApiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!resp.ok) {
      return { ok: false, status: 401, reason: 'token_verification_failed' };
    }
    const data = (await resp.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const account = data.users?.[0];
    if (
      !account ||
      account.emailVerified !== true ||
      account.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {
      return { ok: false, status: 403, reason: 'admin_only_upload' };
    }
    verifiedAdminTokenCache.set(tokenHash, Date.now() + ADMIN_TOKEN_CACHE_TTL_MS);
    return { ok: true };
  } catch {
    return { ok: false, status: 500, reason: 'auth_lookup_error' };
  }
}

function signSessionToken(sessionId: string): string {
  return crypto
    .createHmac('sha256', UPLOAD_HMAC_SECRET)
    .update(sessionId)
    .digest('hex');
}

function verifySessionToken(sessionId: string, token: string): boolean {
  if (!sessionId || !token) return false;
  const expected = signSessionToken(sessionId);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function probeVideoStreams(inputPath: string): Promise<{
  vCodec: string;
  aCodec: string;
}> {
  let vCodec = '';
  let aCodec = '';
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'stream=codec_type,codec_name',
        '-of',
        'json',
        inputPath,
      ],
      { timeout: 8000 }
    );
    const parsed = JSON.parse(stdout) as {
      streams?: Array<{ codec_type?: string; codec_name?: string }>;
    };
    for (const s of parsed.streams || []) {
      if (s.codec_type === 'video' && !vCodec) {
        vCodec = (s.codec_name || '').toLowerCase();
      }
      if (s.codec_type === 'audio' && !aCodec) {
        aCodec = (s.codec_name || '').toLowerCase();
      }
    }
  } catch {
    // ffprobe fallback handled by caller
  }
  return { vCodec, aCodec };
}

/**
 * Normalizes any uploaded video to browser-universal H.264 / AAC +faststart MP4
 * (or keeps already-compatible MP4 / WebM / OGV intact):
 * - Fixes odd mobile dimensions using `scale='trunc(min(1280,iw)/2)*2':-2`
 * - Maps only first video + optional audio (`-map 0:v:0 -map 0:a?`) so Apple timecode
 *   or metadata tracks never break MP4 muxing
 */
async function transcodeOrRemuxVideo(
  inputPath: string,
  baseStoredName: string,
  canCopy: boolean,
  timeoutMs: number
): Promise<{ finalPath: string; storedName: string; size: number }> {
  const mp4StoredName = baseStoredName.replace(/\.[^.]+$/, '.mp4');
  const mp4OutPath = path.resolve(uploadsDir, `.fast-${mp4StoredName}`);
  const finalMp4Path = path.resolve(uploadsDir, mp4StoredName);

  try {
    const args = canCopy
      ? [
          '-y',
          '-i',
          inputPath,
          '-map',
          '0:v:0',
          '-map',
          '0:a?',
          '-c',
          'copy',
          '-movflags',
          '+faststart',
          mp4OutPath,
        ]
      : [
          '-y',
          '-i',
          inputPath,
          '-map',
          '0:v:0',
          '-map',
          '0:a?',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '26',
          '-pix_fmt',
          'yuv420p',
          '-vf',
          "scale='trunc(min(960,iw)/2)*2':-2",
          '-c:a',
          'aac',
          '-b:a',
          '96k',
          '-movflags',
          '+faststart',
          mp4OutPath,
        ];

    await execFileAsync('ffmpeg', args, {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    });

    if (fs.existsSync(mp4OutPath)) {
      const outStat = fs.statSync(mp4OutPath);
      if (outStat.size > 0) {
        fs.renameSync(mp4OutPath, finalMp4Path);
        if (inputPath !== finalMp4Path) {
          fs.unlink(inputPath, () => {});
        }
        return {
          finalPath: finalMp4Path,
          storedName: mp4StoredName,
          size: outStat.size,
        };
      }
    }
  } catch (err) {
    fs.unlink(mp4OutPath, () => {});
    throw err;
  }

  throw new Error('empty_transcode_output');
}

type VideoFinalizeOutcome =
  | { ready: true; url: string; size: number }
  | { ready: false; jobId: string; statusToken: string };

async function scheduleOrPrepareVideo(
  inputPath: string,
  ext: string,
  baseStoredName: string,
  rawSize: number
): Promise<VideoFinalizeOutcome> {
  const nativeStreamExts = new Set(['.webm', '.ogv', '.ogg']);
  if (nativeStreamExts.has(ext) && rawSize <= 6 * 1024 * 1024) {
    return {
      ready: true,
      url: `/uploads/${baseStoredName}`,
      size: rawSize,
    };
  }

  const { vCodec, aCodec } = await probeVideoStreams(inputPath);
  const isWebVideoCodec = vCodec === 'h264';
  const isWebAudioCodec = !aCodec || aCodec === 'aac' || aCodec === 'mp3';
  const canFastCopy = Boolean(vCodec) && isWebVideoCodec && isWebAudioCodec && rawSize <= 6 * 1024 * 1024;

  // Small already-compatible H.264 + AAC/MP3 videos can be faststart-remuxed inline in < 0.4s
  if (canFastCopy) {
    try {
      const res = await transcodeOrRemuxVideo(inputPath, baseStoredName, true, 10000);
      return {
        ready: true,
        url: `/uploads/${res.storedName}`,
        size: res.size,
      };
    } catch {
      // Safe fallback to original H.264 MP4/M4V/MOV if remux wasn't needed
      if (ext === '.mp4' || ext === '.m4v') {
        return {
          ready: true,
          url: `/uploads/${baseStoredName}`,
          size: rawSize,
        };
      }
    }
  }

  // Run heavier transcodes / large remuxes in a background job so HTTP never times out at 96%
  const jobId = `vjob-${Date.now().toString(36)}-${crypto
    .randomBytes(6)
    .toString('hex')}`;
  const statusToken = signSessionToken(jobId);

  const job: VideoProcessingJob = {
    jobId,
    status: 'processing',
    progress: 10,
    mediaKind: 'video',
    startedAt: Date.now(),
  };
  videoProcessingJobs.set(jobId, job);

  const progressTicker = setInterval(() => {
    const active = videoProcessingJobs.get(jobId);
    if (!active || active.status !== 'processing') {
      clearInterval(progressTicker);
      return;
    }
    if (active.progress < 92) {
      active.progress = Math.min(92, active.progress + 4);
    }
  }, 900);
  progressTicker.unref();

  void (async () => {
    try {
      const res = await transcodeOrRemuxVideo(
        inputPath,
        baseStoredName,
        canFastCopy,
        240000
      );
      job.status = 'done';
      job.progress = 100;
      job.url = `/uploads/${res.storedName}`;
      job.size = res.size;
      job.finishedAt = Date.now();
    } catch {
      // If browser-native H.264 MP4/MOV/M4V or ffmpeg fallback is already valid, keep original
      if (canFastCopy && (ext === '.mp4' || ext === '.m4v' || ext === '.mov')) {
        job.status = 'done';
        job.progress = 100;
        job.url = `/uploads/${baseStoredName}`;
        job.size = rawSize;
        job.finishedAt = Date.now();
      } else {
        fs.unlink(inputPath, () => {});
        job.status = 'error';
        job.reason = 'video_processing_failed';
        job.finishedAt = Date.now();
      }
    } finally {
      clearInterval(progressTicker);
    }
  })();

  return {
    ready: false,
    jobId,
    statusToken,
  };
}

interface OrderItemPayload {
  productId?: string;
  name: string;
  variantName: string;
  volume?: string;
  unitPrice: number;
  quantity: number;
}

interface OrderShippingPayload {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

interface OrderPayload {
  orderNumber: string;
  createdAt: string;
  status?: string;
  items: OrderItemPayload[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  paymentMethod: 'wallet' | 'card' | 'cod';
  shipping: OrderShippingPayload;
}

function normalizeWhatsAppDigits(rawPhone: string): string {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }
  return digits;
}

function formatPKR(amount: number): string {
  return `Rs. ${Math.round(Number(amount) || 0).toLocaleString('en-PK')}`;
}

function formatPaymentMethod(method: string): string {
  if (method === 'cod') return 'Cash on Delivery (PKR)';
  if (method === 'wallet') return 'JazzCash / Easypaisa (PKR)';
  return 'Card Payment (PKR)';
}

function buildOrderWhatsAppText(order: OrderPayload, storeName: string): string {
  const safeStoreName = String(storeName || 'f. Gold & fashion').trim().slice(0, 100);
  const itemLines = order.items
    .slice(0, 50)
    .map((item, idx) => {
      const lineTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
      return `${idx + 1}. ${item.name} (${item.variantName}) x${item.quantity} — ${formatPKR(lineTotal)}`;
    })
    .join('\n');

  const lines = [
    `*New Order — ${safeStoreName}*`,
    `Order #: ${order.orderNumber}`,
    `Date: ${order.createdAt}`,
    `Payment: ${formatPaymentMethod(order.paymentMethod)}`,
    '',
    '*Customer Details*',
    `Name: ${order.shipping.fullName}`,
    `Phone: ${order.shipping.phone}`,
    `Email: ${order.shipping.email}`,
    `Address: ${order.shipping.address}`,
    `City / Postal: ${order.shipping.city}, ${order.shipping.postalCode}`,
    '',
    '*Order Items*',
    itemLines,
    '',
    `Subtotal: ${formatPKR(order.subtotal)}`,
  ];

  if (Number(order.discount) > 0) {
    lines.push(`Discount: -${formatPKR(order.discount)}`);
  }

  lines.push(
    `Shipping: ${Number(order.shippingCost) === 0 ? 'Complimentary' : formatPKR(order.shippingCost)}`,
    `*Total Due: ${formatPKR(order.total)}*`
  );

  return lines.join('\n');
}

function isValidOrderPayload(input: unknown): input is OrderPayload {
  if (!input || typeof input !== 'object') return false;
  const o = input as Partial<OrderPayload>;
  if (
    typeof o.orderNumber !== 'string' ||
    !o.orderNumber.trim() ||
    !Array.isArray(o.items) ||
    o.items.length === 0 ||
    !o.shipping ||
    typeof o.shipping !== 'object'
  ) {
    return false;
  }
  const s = o.shipping as Partial<OrderShippingPayload>;
  return Boolean(
    typeof s.fullName === 'string' &&
      s.fullName.trim() &&
      typeof s.phone === 'string' &&
      s.phone.trim() &&
      typeof s.address === 'string' &&
      s.address.trim() &&
      typeof s.city === 'string' &&
      s.city.trim()
  );
}

async function startServer() {
  const app = express();

  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '7d',
      acceptRanges: true,
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const mappedType = EXT_TO_CONTENT_TYPE[ext];
        if (mappedType) {
          res.setHeader('Content-Type', mappedType);
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    })
  );

  // Never fall through missing /uploads files to SPA HTML catch-all
  app.use('/uploads', (_req, res) => {
    res.status(404).json({ ok: false, reason: 'media_not_found' });
  });

  // Serve cloud-persisted publicMedia from Firestore (+ local disk cache) with HTTP Range support
  app.get('/api/media/c/:mediaId', async (req, res) => {
    const mediaId = String(req.params.mediaId || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(mediaId)) {
      res.status(400).json({ ok: false, reason: 'invalid_media_id' });
      return;
    }

    const cacheBinPath = path.resolve(uploadsDir, `.cloud-${mediaId}.bin`);
    const cacheTypePath = path.resolve(uploadsDir, `.cloud-${mediaId}.type`);

    const sendMediaBuffer = (buf: Buffer, mimeType: string) => {
      const safeType =
        mimeType && (mimeType.startsWith('image/') || mimeType.startsWith('video/')) && mimeType !== 'image/svg+xml'
          ? mimeType
          : 'application/octet-stream';
      res.setHeader('Content-Type', safeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      const total = buf.length;
      const rangeHeader = req.headers.range;
      if (rangeHeader && /^bytes=\d*-\d*$/.test(rangeHeader)) {
        const [rawStart, rawEnd] = rangeHeader.replace('bytes=', '').split('-');
        const start = rawStart ? Number(rawStart) : 0;
        const end = rawEnd ? Math.min(total - 1, Number(rawEnd)) : total - 1;
        if (
          Number.isInteger(start) &&
          Number.isInteger(end) &&
          start >= 0 &&
          start <= end &&
          end < total
        ) {
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
          res.setHeader('Content-Length', String(end - start + 1));
          res.end(buf.subarray(start, end + 1));
          return;
        }
        res.status(416);
        res.setHeader('Content-Range', `bytes */${total}`);
        res.end();
        return;
      }

      res.setHeader('Content-Length', String(total));
      res.status(200).end(buf);
    };

    try {
      if (fs.existsSync(cacheBinPath) && fs.existsSync(cacheTypePath)) {
        const [cachedBuf, cachedType] = await Promise.all([
          fs.promises.readFile(cacheBinPath),
          fs.promises.readFile(cacheTypePath, 'utf8'),
        ]);
        if (cachedBuf.length > 0) {
          sendMediaBuffer(cachedBuf, cachedType.trim());
          return;
        }
      }
    } catch {
      // Cache read failed — fetch cleanly from Firestore
    }

    if (!firebaseProjectId || !firebaseWebApiKey) {
      res.status(404).json({ ok: false, reason: 'media_not_found' });
      return;
    }

    const partsParam = Number(req.query.parts || 1);
    const totalParts =
      Number.isInteger(partsParam) && partsParam >= 2 && partsParam <= 24
        ? partsParam
        : 1;

    const fetchCloudMediaDoc = async (docId: string) => {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        firebaseProjectId
      )}/databases/${encodeURIComponent(
        firebaseDatabaseId
      )}/documents/publicMedia/${encodeURIComponent(docId)}?key=${encodeURIComponent(
        firebaseWebApiKey
      )}`;
      const fsResp = await fetch(firestoreUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(12000),
      });
      if (!fsResp.ok) return null;
      const docJson = (await fsResp.json()) as {
        fields?: {
          dataUrl?: { stringValue?: string };
        };
      };
      const rawDataUrl = docJson.fields?.dataUrl?.stringValue || '';
      const match = /^data:([^;]+);base64,(.+)$/.exec(rawDataUrl);
      if (!match) return null;
      return {
        mimeType: match[1].trim().toLowerCase(),
        buffer: Buffer.from(match[2], 'base64'),
      };
    };

    try {
      let mimeType = '';
      let buffer: Buffer;

      if (totalParts > 1) {
        const partIndices = Array.from({ length: totalParts }, (_, i) => i);
        const fetchedParts = await Promise.all(
          partIndices.map((idx) => fetchCloudMediaDoc(`${mediaId}-p${idx}`))
        );
        if (fetchedParts.some((p) => !p || p.buffer.length === 0)) {
          res.status(404).json({ ok: false, reason: 'media_not_found' });
          return;
        }
        const validParts = fetchedParts as Array<{ mimeType: string; buffer: Buffer }>;
        mimeType = validParts[0].mimeType;
        buffer = Buffer.concat(validParts.map((p) => p.buffer));
      } else {
        const singleDoc = await fetchCloudMediaDoc(mediaId);
        if (!singleDoc || singleDoc.buffer.length === 0) {
          res.status(404).json({ ok: false, reason: 'media_not_found' });
          return;
        }
        mimeType = singleDoc.mimeType;
        buffer = singleDoc.buffer;
      }

      void Promise.all([
        fs.promises.writeFile(cacheBinPath, buffer),
        fs.promises.writeFile(cacheTypePath, mimeType, 'utf8'),
      ]).catch(() => {});

      sendMediaBuffer(buffer, mimeType);
    } catch {
      res.status(502).json({ ok: false, reason: 'cloud_media_fetch_failed' });
    }
  });

  // High-speed Chunked Upload: Step 2 (Accept both POST and PUT for proxy compatibility)
  const handleChunkUpload: express.RequestHandler = (req, res) => {
    const { sessionId, offset: offsetStr } = req.params;
    const uploadToken = String(req.headers['x-upload-token'] || '');
    if (!verifySessionToken(sessionId, uploadToken)) {
      req.resume();
      res.status(403).json({ ok: false, reason: 'invalid_upload_session' });
      return;
    }

    const session = activeUploadSessions.get(sessionId);
    if (!session) {
      req.resume();
      res.status(404).json({ ok: false, reason: 'upload_session_expired' });
      return;
    }

    const offset = Number(offsetStr);
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_MEDIA_BYTES) {
      req.resume();
      res.status(400).json({ ok: false, reason: 'invalid_chunk_offset' });
      return;
    }

    const chunks: Buffer[] = [];
    let chunkBytes = 0;
    let aborted = false;

    req.on('data', (buf: Buffer) => {
      if (aborted) return;
      chunkBytes += buf.length;
      if (chunkBytes > MAX_CHUNK_BYTES) {
        aborted = true;
        req.resume();
        res.status(413).json({ ok: false, reason: 'chunk_too_large' });
        return;
      }
      chunks.push(buf);
    });

    req.on('aborted', () => {
      aborted = true;
    });

    req.on('error', () => {
      if (!aborted && !res.headersSent) {
        aborted = true;
        res.status(500).json({ ok: false, reason: 'chunk_stream_error' });
      }
    });

    req.on('end', () => {
      if (aborted) return;
      const merged = Buffer.concat(chunks, chunkBytes);
      session.fileHandle
        .write(merged, 0, merged.length, offset)
        .then(() => {
          session.receivedBytes += merged.length;
          res.json({ ok: true, bytes: merged.length });
        })
        .catch(() => {
          if (!res.headersSent) {
            res.status(500).json({ ok: false, reason: 'chunk_write_error' });
          }
        });
    });
  };
  app.post('/api/media/upload/chunk/:sessionId/:offset', handleChunkUpload);
  app.put('/api/media/upload/chunk/:sessionId/:offset', handleChunkUpload);

  // Fast single-request raw binary upload (used for <= 512 KB files — captures req BEFORE await!)
  app.post('/api/media/upload', async (req, res) => {
    const bufferedChunks: Buffer[] = [];
    let totalBytes = 0;
    let streamEnded = false;
    let streamError: string | null = null;
    let settledEarly = false;

    req.on('data', (chunk: Buffer) => {
      if (settledEarly) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_MEDIA_BYTES) {
        settledEarly = true;
        req.resume();
        if (!res.headersSent) {
          res.status(413).json({ ok: false, reason: 'file_too_large' });
        }
        return;
      }
      bufferedChunks.push(chunk);
    });

    req.on('end', () => {
      streamEnded = true;
    });

    req.on('error', () => {
      streamError = 'stream_read_error';
      streamEnded = true;
    });

    const authCheck = await verifyAdminBearerToken(req.headers.authorization);
    if (settledEarly) return;
    if (!authCheck.ok) {
      settledEarly = true;
      req.resume();
      res.status(authCheck.status).json({
        ok: false,
        reason: authCheck.reason,
      });
      return;
    }

    const rawFileName = String(req.headers['x-file-name'] || 'media');
    const contentType = String(req.headers['content-type'] || '');
    const mediaMeta = resolveUploadMediaMeta(rawFileName, contentType);
    if (!mediaMeta) {
      settledEarly = true;
      req.resume();
      res.status(400).json({
        ok: false,
        reason: 'unsupported_media_format',
      });
      return;
    }

    if (!streamEnded) {
      await new Promise<void>((resolve) => {
        const onDone = () => {
          req.off('end', onDone);
          req.off('error', onDone);
          req.off('close', onDone);
          resolve();
        };
        req.on('end', onDone);
        req.on('error', onDone);
        req.on('close', onDone);
      });
    }

    if (settledEarly || res.headersSent) return;
    if (streamError) {
      res.status(500).json({ ok: false, reason: streamError });
      return;
    }
    if (totalBytes === 0) {
      res.status(400).json({ ok: false, reason: 'empty_file' });
      return;
    }

    const fileId = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const storedName = `${mediaMeta.mediaKind}-${fileId}${mediaMeta.ext}`;
    const destPath = path.resolve(uploadsDir, storedName);

    try {
      await fs.promises.writeFile(destPath, Buffer.concat(bufferedChunks, totalBytes));
      if (mediaMeta.mediaKind === 'video') {
        const outcome = await scheduleOrPrepareVideo(
          destPath,
          mediaMeta.ext,
          storedName,
          totalBytes
        );
        if (outcome.ready === false) {
          res.json({
            ok: true,
            processing: true,
            jobId: outcome.jobId,
            statusToken: outcome.statusToken,
            mediaKind: 'video',
          });
          return;
        }
        res.json({
          ok: true,
          url: outcome.url,
          mediaKind: 'video',
          size: outcome.size,
        });
        return;
      }

      res.json({
        ok: true,
        url: `/uploads/${storedName}`,
        mediaKind: mediaMeta.mediaKind,
        size: totalBytes,
      });
    } catch {
      fs.unlink(destPath, () => {});
      if (!res.headersSent) {
        res.status(500).json({ ok: false, reason: 'stream_write_error' });
      }
    }
  });

  app.use(express.json({ limit: '200kb' }));

  // Chunked upload Step 1: Init session
  app.post('/api/media/upload/init', async (req, res) => {
    const authCheck = await verifyAdminBearerToken(req.headers.authorization);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ ok: false, reason: authCheck.reason });
      return;
    }

    const body = (req.body || {}) as {
      fileName?: string;
      contentType?: string;
      size?: number;
    };
    const fileSize = Number(body.size || 0);
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      res.status(400).json({ ok: false, reason: 'empty_file' });
      return;
    }
    if (fileSize > MAX_MEDIA_BYTES) {
      res.status(413).json({ ok: false, reason: 'file_too_large' });
      return;
    }

    const mediaMeta = resolveUploadMediaMeta(
      String(body.fileName || 'media'),
      String(body.contentType || '')
    );
    if (!mediaMeta) {
      res.status(400).json({ ok: false, reason: 'unsupported_media_format' });
      return;
    }

    const sessionId = `${Date.now().toString(36)}-${crypto
      .randomBytes(6)
      .toString('hex')}`;
    const storedName = `${mediaMeta.mediaKind}-${sessionId}${mediaMeta.ext}`;
    const partPath = path.resolve(uploadsDir, `.part-${storedName}`);
    const finalPath = path.resolve(uploadsDir, storedName);

    try {
      const fileHandle = await fs.promises.open(partPath, 'w+');
      activeUploadSessions.set(sessionId, {
        sessionId,
        storedName,
        partPath,
        finalPath,
        mediaKind: mediaMeta.mediaKind,
        ext: mediaMeta.ext,
        expectedSize: fileSize,
        receivedBytes: 0,
        fileHandle,
        createdAt: Date.now(),
      });
      res.json({
        ok: true,
        sessionId,
        uploadToken: signSessionToken(sessionId),
      });
    } catch {
      fs.unlink(partPath, () => {});
      res.status(500).json({ ok: false, reason: 'session_init_failed' });
    }
  });

  // Chunked upload Step 3: Assemble & optimize video (non-blocking for heavier transcodes)
  app.post('/api/media/upload/complete/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const uploadToken = String(req.headers['x-upload-token'] || '');
    if (!verifySessionToken(sessionId, uploadToken)) {
      res.status(403).json({ ok: false, reason: 'invalid_upload_session' });
      return;
    }

    const session = activeUploadSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ ok: false, reason: 'upload_session_expired' });
      return;
    }
    activeUploadSessions.delete(sessionId);

    try {
      await session.fileHandle.close();
      await fs.promises.rename(session.partPath, session.finalPath);
      const assembledStat = await fs.promises.stat(session.finalPath);
      if (assembledStat.size <= 0) {
        fs.unlink(session.finalPath, () => {});
        res.status(400).json({ ok: false, reason: 'empty_file' });
        return;
      }

      if (session.mediaKind === 'video') {
        const outcome = await scheduleOrPrepareVideo(
          session.finalPath,
          session.ext,
          session.storedName,
          assembledStat.size
        );
        if (outcome.ready === false) {
          res.json({
            ok: true,
            processing: true,
            jobId: outcome.jobId,
            statusToken: outcome.statusToken,
            mediaKind: 'video',
          });
          return;
        }
        res.json({
          ok: true,
          url: outcome.url,
          mediaKind: 'video',
          size: outcome.size,
        });
        return;
      }

      res.json({
        ok: true,
        url: `/uploads/${session.storedName}`,
        mediaKind: session.mediaKind,
        size: assembledStat.size,
      });
    } catch {
      fs.unlink(session.partPath, () => {});
      fs.unlink(session.finalPath, () => {});
      res.status(500).json({ ok: false, reason: 'upload_complete_failed' });
    }
  });

  // Poll background video transcode job status (prevents reverse-proxy 30-60s timeout)
  app.get('/api/media/upload/status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const uploadToken = String(req.headers['x-upload-token'] || '');
    let authorized = verifySessionToken(jobId, uploadToken);
    if (!authorized) {
      const authCheck = await verifyAdminBearerToken(req.headers.authorization);
      authorized = authCheck.ok;
    }
    if (!authorized) {
      res.status(403).json({ ok: false, reason: 'invalid_upload_session' });
      return;
    }

    const job = videoProcessingJobs.get(jobId);
    if (!job) {
      res.status(404).json({ ok: false, reason: 'upload_session_expired' });
      return;
    }

    if (job.status === 'processing') {
      res.json({
        ok: true,
        status: 'processing',
        progress: job.progress,
        mediaKind: 'video',
      });
      return;
    }

    if (job.status === 'error') {
      res.json({
        ok: false,
        status: 'error',
        reason: job.reason || 'video_processing_failed',
      });
      return;
    }

    res.json({
      ok: true,
      status: 'done',
      url: job.url,
      mediaKind: 'video',
      size: job.size,
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/orders/whatsapp-notify', async (req, res) => {
    try {
      const body = req.body as {
        order?: unknown;
        storeName?: string;
        storeWhatsappNumber?: string;
      };

      if (!isValidOrderPayload(body?.order)) {
        res.status(400).json({
          ok: false,
          deliveredAutomatically: false,
          reason: 'invalid_order_payload',
        });
        return;
      }

      const order = body.order;
      const storeName =
        typeof body.storeName === 'string' && body.storeName.trim()
          ? body.storeName.trim()
          : 'f. Gold & fashion';

      const recipientPhone = normalizeWhatsAppDigits(
        process.env.WHATSAPP_STORE_RECIPIENT ||
          (typeof body.storeWhatsappNumber === 'string'
            ? body.storeWhatsappNumber
            : '')
      );

      const message = buildOrderWhatsAppText(order, storeName);
      const webhookUrl = (process.env.WHATSAPP_WEBHOOK_URL || '').trim();
      const cloudToken = (process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '').trim();
      const cloudPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
      const callMeBotKey = (process.env.CALLMEBOT_API_KEY || '').trim();

      if (webhookUrl) {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_order',
            storeName,
            recipientPhone,
            message,
            order,
          }),
        });
        if (!resp.ok) {
          res.json({
            ok: true,
            deliveredAutomatically: false,
            recipientConfigured: Boolean(recipientPhone),
            reason: 'webhook_failed',
          });
          return;
        }
        res.json({
          ok: true,
          deliveredAutomatically: true,
          provider: 'webhook',
          recipientConfigured: Boolean(recipientPhone),
        });
        return;
      }

      if (cloudToken && cloudPhoneId && recipientPhone) {
        const graphUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(cloudPhoneId)}/messages`;
        const resp = await fetch(graphUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cloudToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
            type: 'text',
            text: { preview_url: false, body: message },
          }),
        });
        if (!resp.ok) {
          res.json({
            ok: true,
            deliveredAutomatically: false,
            recipientConfigured: true,
            reason: 'whatsapp_cloud_failed',
          });
          return;
        }
        res.json({
          ok: true,
          deliveredAutomatically: true,
          provider: 'whatsapp_cloud_api',
          recipientConfigured: true,
        });
        return;
      }

      if (callMeBotKey && recipientPhone) {
        const botUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
          recipientPhone
        )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callMeBotKey)}`;
        const resp = await fetch(botUrl);
        if (!resp.ok) {
          res.json({
            ok: true,
            deliveredAutomatically: false,
            recipientConfigured: true,
            reason: 'callmebot_failed',
          });
          return;
        }
        res.json({
          ok: true,
          deliveredAutomatically: true,
          provider: 'callmebot',
          recipientConfigured: true,
        });
        return;
      }

      res.json({
        ok: true,
        deliveredAutomatically: false,
        recipientConfigured: Boolean(recipientPhone),
        reason: 'automation_credentials_not_configured',
      });
    } catch {
      res.status(500).json({
        ok: false,
        deliveredAutomatically: false,
        recipientConfigured: false,
        reason: 'server_error',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
