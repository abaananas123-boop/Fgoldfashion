import { OrderRecord, PaymentMethod, SocialPlatform } from '../types';
import { formatPKR } from './currency';

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  x: 'X (Twitter)',
  other: 'Website',
};

export function normalizeWhatsAppDigits(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  // Convert Pakistani local 03xx... format to international 923xx...
  if (digits.startsWith('0') && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(rawPhone: string, message?: string): string {
  const digits = normalizeWhatsAppDigits(rawPhone);
  if (!digits) return '';
  if (!message || !message.trim()) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message.trim())}`;
}

export function formatOrderPaymentLabel(method: PaymentMethod): string {
  if (method === 'cod') return 'Cash on Delivery (PKR)';
  if (method === 'wallet') return 'JazzCash / Easypaisa (PKR)';
  return 'Card Payment (PKR)';
}

export function buildOrderWhatsAppMessage(
  order: OrderRecord,
  storeName: string
): string {
  const itemsBlock = order.items
    .map((item, idx) => {
      const noteSuffix = item.customNote?.trim()
        ? `\n   _Note / Stitching:_ ${item.customNote.trim()}`
        : '';
      return `${idx + 1}. ${item.name} (${item.variantName}) x${item.quantity} — ${formatPKR(
        item.unitPrice * item.quantity
      )}${noteSuffix}`;
    })
    .join('\n');

  const lines = [
    `*New Order — ${storeName}*`,
    `Order #: ${order.orderNumber}`,
    `Date: ${order.createdAt}`,
    `Payment: ${formatOrderPaymentLabel(order.paymentMethod)}`,
    '',
    '*Customer Details*',
    `Name: ${order.shipping.fullName}`,
    `Phone: ${order.shipping.phone}`,
    `Email: ${order.shipping.email}`,
    `Address: ${order.shipping.address}`,
    `City / Postal: ${order.shipping.city}, ${order.shipping.postalCode}`,
  ];

  if (order.orderNote?.trim()) {
    lines.push(`Delivery / Tailoring Note: ${order.orderNote.trim()}`);
  }

  lines.push('', '*Order Items*', itemsBlock, '', `Subtotal: ${formatPKR(order.subtotal)}`);

  if (order.discount > 0) {
    lines.push(`Discount: -${formatPKR(order.discount)}`);
  }

  lines.push(
    `Shipping: ${
      order.shippingCost === 0 ? 'Complimentary' : formatPKR(order.shippingCost)
    }`,
    `*Total Due: ${formatPKR(order.total)}*`
  );

  return lines.join('\n');
}

export function buildOrderWhatsAppUrl(
  storePhone: string,
  order: OrderRecord,
  storeName: string
): string {
  const message = buildOrderWhatsAppMessage(order, storeName);
  return buildWhatsAppUrl(storePhone, message);
}

export function buildCustomerConfirmationWhatsAppUrl(
  order: OrderRecord,
  storeName: string
): string {
  const message = [
    `Assalam-o-Alaikum ${order.shipping.fullName},`,
    `Thank you for your order with *${storeName}*!`,
    `Order #: ${order.orderNumber}`,
    `Total: ${formatPKR(order.total)} (${formatOrderPaymentLabel(order.paymentMethod)})`,
    `Delivery Address: ${order.shipping.address}, ${order.shipping.city}`,
    '',
    'Your order is confirmed and being prepared for dispatch.',
  ].join('\n');

  return buildWhatsAppUrl(order.shipping.phone, message);
}

export function normalizeSocialUrl(platform: SocialPlatform, rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const cleanHandle = trimmed.replace(/^@/, '');
  switch (platform) {
    case 'tiktok':
      return `https://www.tiktok.com/@${cleanHandle}`;
    case 'instagram':
      return `https://www.instagram.com/${cleanHandle}`;
    case 'facebook':
      return `https://www.facebook.com/${cleanHandle}`;
    case 'youtube':
      return `https://www.youtube.com/@${cleanHandle}`;
    case 'snapchat':
      return `https://www.snapchat.com/add/${cleanHandle}`;
    case 'pinterest':
      return `https://www.pinterest.com/${cleanHandle}`;
    case 'x':
      return `https://x.com/${cleanHandle}`;
    default:
      return `https://${trimmed}`;
  }
}

export interface DirectShareTarget {
  id: 'whatsapp' | 'facebook' | 'telegram' | 'x' | 'email' | 'sms';
  label: string;
  href: string;
  external: boolean;
}

export function buildWebsiteShareTargets(
  storeName: string,
  headline: string,
  shareUrl: string
): DirectShareTarget[] {
  const shareText = `Check out ${storeName} — ${headline}. Shop boutique edits, artificial jewellery, eastern & western wear, baby garments, fragrance, and cosmetics.`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const combinedText = encodeURIComponent(`${shareText} ${shareUrl}`);

  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${combinedText}`,
      external: true,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      external: true,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      external: true,
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      external: true,
    },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(`${storeName} — Storefront`)}&body=${combinedText}`,
      external: false,
    },
    {
      id: 'sms',
      label: 'Messages (SMS)',
      href: `sms:?&body=${combinedText}`,
      external: false,
    },
  ];
}

export function buildGoogleReviewUrl(
  storeName: string,
  customUrl?: string
): string {
  const trimmed = (customUrl || '').trim();
  if (trimmed) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${storeName} reviews`)}`;
}

export function normalizeSiteLinkUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '#catalog';
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:')
  ) {
    return '#catalog';
  }
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isExternalSiteLink(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function isInAppSocialBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /BytedanceWebview|TikTok|musical_ly|Instagram|FBAN|FBAV|FB_IAB|Snapchat|Line\/|MicroMessenger/i.test(
    ua
  );
}


