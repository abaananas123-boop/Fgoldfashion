import { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, MessageSquare, Send, Share2, X } from 'lucide-react';
import { buildWebsiteShareTargets, DirectShareTarget } from '../utils/social';
import { SocialPlatformIcon, WhatsAppIcon } from './SocialIcons';

interface ShareStoreControlProps {
  storeName: string;
  headline: string;
  variant?: 'hero' | 'footer';
}

function renderShareIcon(id: DirectShareTarget['id']) {
  switch (id) {
    case 'whatsapp':
      return <WhatsAppIcon className="w-4 h-4 text-[var(--accent)]" />;
    case 'facebook':
      return <SocialPlatformIcon platform="facebook" className="w-4 h-4" />;
    case 'x':
      return <SocialPlatformIcon platform="x" className="w-4 h-4" />;
    case 'telegram':
      return <Send className="w-4 h-4" strokeWidth={1.75} />;
    case 'email':
      return <Mail className="w-4 h-4" strokeWidth={1.75} />;
    case 'sms':
      return <MessageSquare className="w-4 h-4" strokeWidth={1.75} />;
  }
}

export function ShareStoreControl({
  storeName,
  headline,
  variant = 'hero',
}: ShareStoreControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}`;
  }, []);

  const targets = useMemo(
    () => buildWebsiteShareTargets(storeName, headline, shareUrl),
    [storeName, headline, shareUrl]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!sharedFeedback) return;
    const timer = window.setTimeout(() => setSharedFeedback(false), 2400);
    return () => window.clearTimeout(timer);
  }, [sharedFeedback]);

  const handleShareClick = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${storeName} — Boutique Storefront`,
          text: `Check out ${storeName} — ${headline}.`,
          url: shareUrl,
        });
        setSharedFeedback(true);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        // Fallback to direct share menu when Web Share API is blocked (e.g. iframe / desktop)
      }
    }

    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleShareClick}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={
          variant === 'hero'
            ? 'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#141413] bg-white border border-[#D4D4CE] rounded-md hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]'
            : 'inline-flex items-center gap-1.5 text-xs font-medium text-[#141413] hover:text-[var(--accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded'
        }
      >
        <Share2 className={variant === 'hero' ? 'w-4 h-4' : 'w-3.5 h-3.5'} strokeWidth={1.75} />
        <span>{sharedFeedback ? 'Shared' : 'Share Store'}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={`Share ${storeName}`}
          className={`absolute z-40 w-64 bg-white border border-[#E4E4E0] rounded-lg shadow-xl p-3 ${
            variant === 'footer'
              ? 'bottom-full mb-2 right-0'
              : 'top-full mt-2 left-0'
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#E4E4E0]">
            <p className="text-xs font-semibold text-[#141413] truncate">
              Share {storeName}
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close share options"
              className="p-1 rounded text-[#5A5A56] hover:text-[#141413] hover:bg-[#F2F2F0] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {targets.map((target) => (
              <a
                key={target.id}
                role="menuitem"
                href={target.href}
                target={target.external ? '_blank' : undefined}
                rel={target.external ? 'noopener noreferrer' : undefined}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-[#141413] rounded-md hover:bg-[#F2F2F0] transition-colors whitespace-nowrap"
              >
                {renderShareIcon(target.id)}
                <span>Share via {target.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
