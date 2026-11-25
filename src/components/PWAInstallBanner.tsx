import { useEffect, useState } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  Sparkles,
  Smartphone,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  isIosDevice,
  isStandaloneMode,
  promptPWAInstall,
  subscribeToInstallPrompt,
} from '../pwa';

const DISMISS_STORAGE_KEY = 'fgold_pwa_banner_dismissed_until';

interface PWAInstallBannerProps {
  forceOpenModal?: boolean;
  onCloseModal?: () => void;
}

export function PWAInstallBanner({
  forceOpenModal = false,
  onCloseModal,
}: PWAInstallBannerProps) {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneMode());

    // Check if dismissed previously
    try {
      const dismissedUntil = window.localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }

    const unsubscribe = subscribeToInstallPrompt((available) => {
      setCanPrompt(available);
    });

    const handleAppInstalled = () => {
      setIsInstalledSuccess(true);
      setIsStandalone(true);
      setTimeout(() => {
        setIsInstalledSuccess(false);
      }, 4000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      // Snooze banner for 3 days
      const threeDaysLater = Date.now() + 3 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(threeDaysLater));
    } catch {
      // Ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (isIosDevice()) {
      setShowIosModal(true);
      return;
    }

    if (canPrompt) {
      const outcome = await promptPWAInstall();
      if (outcome === 'accepted') {
        setIsDismissed(true);
      }
      return;
    }

    // Fallback if beforeinstallprompt not yet fired or other browser
    setShowIosModal(true);
  };

  // If already running standalone (installed app), do not show banner
  if (isStandalone && !forceOpenModal) {
    return null;
  }

  const isModalActive = forceOpenModal || showIosModal;
  const isIos = isIosDevice();

  return (
    <>
      {/* Floating Bottom App Installation Bar */}
      {!isDismissed && !isModalActive && (
        <aside
          aria-label="Install mobile application"
          className="fixed bottom-14 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-[#141413]/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-white/15 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icons/icon-192x192.png"
              alt="f. Gold icon"
              className="w-11 h-11 rounded-xl shadow-md border border-[#FCE39D]/30 shrink-0 object-cover"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white tracking-wide truncate">
                  f. Gold &amp; fashion
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#F85606] text-white">
                  <Sparkles className="w-2.5 h-2.5" /> App
                </span>
              </div>
              <p className="text-[11px] text-[#A8A8A2] truncate">
                Install for fast 1-tap shopping &amp; tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#6D2932] to-[#8F2852] hover:from-[#7E2434] hover:to-[#A32D5E] text-white text-xs font-semibold tracking-wide shadow-sm flex items-center gap-1.5 border border-[#FCE39D]/30 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#FCE39D]" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss app install banner"
              className="p-1.5 text-[#8A8A84] hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Success Notification after install */}
      {isInstalledSuccess && (
        <div
          role="status"
          className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#128C7E] text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-medium"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>f. Gold &amp; fashion installed successfully!</span>
        </div>
      )}

      {/* Install Guide Modal (For iOS Safari or fallback instructions) */}
      {isModalActive && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={() => {
            setShowIosModal(false);
            if (onCloseModal) onCloseModal();
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 text-[#141413] border border-[#E4E4E0] relative animate-in fade-in slide-in-from-bottom-8 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowIosModal(false);
                if (onCloseModal) onCloseModal();
              }}
              aria-label="Close installation guide"
              className="absolute top-4 right-4 p-1.5 text-[#8A8A84] hover:text-[#141413] rounded-full hover:bg-[#F3F3F1] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b border-[#EFEFED]">
              <img
                src="/icons/icon-192x192.png"
                alt="App Icon"
                className="w-14 h-14 rounded-2xl shadow-md border border-[#FCE39D]/40 object-cover"
              />
              <div>
                <h3
                  id="pwa-modal-title"
                  className="font-serif text-lg font-bold text-[#141413] leading-tight"
                >
                  Install f. Gold &amp; fashion
                </h3>
                <p className="text-xs text-[#5A5A56] mt-0.5">
                  Official Mobile App Experience
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3.5">
              {isIos ? (
                <>
                  <p className="text-xs text-[#5A5A56]">
                    iPhone/iPad par install karne ke liye neeche diye gaye steps follow karein:
                  </p>
                  <ol className="space-y-3 text-xs">
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-[#F8F8F6] border border-[#E8E8E3]">
                      <span className="w-6 h-6 rounded-full bg-[#6D2932] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        1
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#141413]">
                          Safari Share button tap karein
                        </span>
                        <p className="text-[#5A5A56] flex items-center gap-1">
                          Neeche bar mein <Share className="w-3.5 h-3.5 text-[#007AFF] inline" /> Share icon par click karein.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-[#F8F8F6] border border-[#E8E8E3]">
                      <span className="w-6 h-6 rounded-full bg-[#6D2932] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        2
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#141413]">
                          "Add to Home Screen" select karein
                        </span>
                        <p className="text-[#5A5A56] flex items-center gap-1">
                          List ko scroll karke <PlusSquare className="w-3.5 h-3.5 inline text-[#141413]" /> Add to Home Screen par tap karein, fir <strong>Add</strong> karein.
                        </p>
                      </div>
                    </li>
                  </ol>
                </>
              ) : canPrompt ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#5A5A56]">
                    Click the button below to add f. Gold &amp; fashion to your phone's home screen or desktop apps.
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6D2932] via-[#8F2852] to-[#F85606] text-white font-semibold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#FCE39D]" />
                    <span>Install App Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[#5A5A56]">
                    Aap apne browser menu (top-right <strong>⋮</strong> ya address bar) se <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> par click karke direct install kar sakte hain.
                  </p>
                  <div className="p-3 bg-[#F8F8F6] rounded-xl border border-[#E8E8E3] text-xs text-[#5A5A56] flex items-center gap-2.5">
                    <Smartphone className="w-5 h-5 text-[#6D2932] shrink-0" />
                    <span>App install hone ke baad bina browser bar ke full-screen chaleegi.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EFEFED] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowIosModal(false);
                  if (onCloseModal) onCloseModal();
                }}
                className="px-4 py-2 text-xs font-semibold text-[#5A5A56] hover:text-[#141413] hover:bg-[#F3F3F1] rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
