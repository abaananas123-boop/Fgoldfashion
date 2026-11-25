import { useState } from 'react';
import {
  Home,
  LayoutGrid,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { buildWhatsAppUrl, isInAppSocialBrowser } from '../utils/social';
import { WhatsAppIcon } from './SocialIcons';

interface BottomAppBarProps {
  storeName: string;
  cartCount: number;
  categories: string[];
  whatsappNumber: string;
  whatsappMessage: string;
  activePage?: 'home' | 'account';
  customerPhotoUrl?: string | null;
  onScrollHome: () => void;
  onSelectCategory: (category: string) => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onScrollToNewsletter: () => void;
}

export function BottomAppBar({
  storeName,
  cartCount,
  categories,
  whatsappNumber,
  whatsappMessage,
  activePage = 'home',
  customerPhotoUrl,
  onScrollHome,
  onSelectCategory,
  onOpenCart,
  onOpenAccount,
  onScrollToNewsletter,
}: BottomAppBarProps) {
  const [activeSheet, setActiveSheet] = useState<'departments' | null>(null);

  const whatsappUrl = buildWhatsAppUrl(whatsappNumber, whatsappMessage);

  const handleMessagesClick = () => {
    if (whatsappUrl) {
      if (isInAppSocialBrowser()) {
        window.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    onScrollToNewsletter();
  };

  return (
    <>
      <nav
        aria-label="Store quick navigation bar"
        className="fixed bottom-0 inset-x-0 z-40 h-12 sm:h-14 bg-white/95 backdrop-blur-md border-t border-[#E4E4E0] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      >
        <div className="max-w-3xl mx-auto h-full px-2 grid grid-cols-5 items-center">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => {
              setActiveSheet(null);
              onScrollHome();
            }}
            aria-current={activePage === 'home' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 hover:opacity-80 cursor-pointer py-1 ${
              activePage === 'home' ? 'text-[#F85606]' : 'text-[#5A5A56]'
            }`}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={activePage === 'home' ? 2.25 : 1.75} />
            <span className={`text-[10px] leading-none ${activePage === 'home' ? 'font-bold' : 'font-medium'}`}>
              Home
            </span>
          </button>

          {/* 2. Messages / WhatsApp */}
          <button
            type="button"
            onClick={handleMessagesClick}
            className="relative flex flex-col items-center justify-center gap-0.5 text-[#5A5A56] hover:text-[#141413] cursor-pointer py-1"
          >
            <div className="relative">
              {whatsappUrl ? (
                <WhatsAppIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#128C7E]" />
              ) : (
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.75} />
              )}
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-[#F85606] text-white text-[8px] font-bold flex items-center justify-center">
                24/7
              </span>
            </div>
            <span className="text-[10px] font-medium leading-none">Messages</span>
          </button>

          {/* 3. Center Store Emblem -> Departments */}
          <button
            type="button"
            onClick={() =>
              setActiveSheet((prev) =>
                prev === 'departments' ? null : 'departments'
              )
            }
            aria-expanded={activeSheet === 'departments'}
            aria-label="Browse store departments"
            className="flex items-center justify-center cursor-pointer"
          >
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#6D2932] via-[#8F2852] to-[#F85606] text-white shadow-md flex items-center justify-center border-2 border-white -mt-2 hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#FCE39D]" strokeWidth={2} />
            </span>
          </button>

          {/* 4. Cart */}
          <button
            type="button"
            onClick={() => {
              setActiveSheet(null);
              onOpenCart();
            }}
            aria-label={`Open shopping bag, ${cartCount} items`}
            className="relative flex flex-col items-center justify-center gap-0.5 text-[#5A5A56] hover:text-[#141413] cursor-pointer py-1"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-[16px] rounded-full bg-[#F85606] text-white text-[9px] font-bold tabular-nums flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">Cart</span>
          </button>

          {/* 5. Dedicated Customer Account Page */}
          <button
            type="button"
            onClick={() => {
              setActiveSheet(null);
              onOpenAccount();
            }}
            aria-current={activePage === 'account' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer py-1 ${
              activePage === 'account' ? 'text-[#F85606]' : 'text-[#5A5A56] hover:text-[#141413]'
            }`}
          >
            {customerPhotoUrl ? (
              <img
                src={customerPhotoUrl}
                alt=""
                className={`w-5 h-5 rounded-full object-cover border ${
                  activePage === 'account' ? 'border-[#F85606]' : 'border-[#D4D4CE]'
                }`}
              />
            ) : (
              <User
                className="w-4 h-4 sm:w-5 sm:h-5"
                strokeWidth={activePage === 'account' ? 2.25 : 1.75}
              />
            )}
            <span
              className={`text-[10px] leading-none ${
                activePage === 'account' ? 'font-bold' : 'font-medium'
              }`}
            >
              Account
            </span>
          </button>
        </div>
      </nav>

      {/* Quick Departments Sheet Modal */}
      {activeSheet === 'departments' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Browse Departments"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => setActiveSheet(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white border border-[#E4E4E0] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[#E4E4E0] bg-[#FAFAFA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#F85606]" />
                <h3 className="font-sans text-sm font-bold text-[#141413]">
                  {storeName} Departments
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                aria-label="Close panel"
                className="p-1 text-[#5A5A56] hover:text-[#141413] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveSheet(null);
                  onSelectCategory('All');
                }}
                className="col-span-2 px-3.5 py-2.5 rounded-lg bg-[#FFF5F0] border border-[#F85606]/30 text-xs font-bold text-[#F85606] text-left cursor-pointer hover:bg-[#FFEBE0]"
              >
                All Store Departments
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveSheet(null);
                    onSelectCategory(cat);
                  }}
                  className="px-3.5 py-2.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E0] text-xs font-semibold text-[#141413] text-left hover:border-[#F85606] cursor-pointer truncate"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
