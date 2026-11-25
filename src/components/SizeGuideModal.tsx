import { useEffect, useState } from 'react';
import { Ruler, X } from 'lucide-react';

export type SizeChartTab = 'eastern' | 'western' | 'kids' | 'jewellery';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  customNote?: string;
}

function resolveInitialTab(category?: string): SizeChartTab {
  const c = (category || '').toLowerCase();
  if (c.includes('baby') || c.includes('kid') || c.includes('child')) return 'kids';
  if (c.includes('jewel') || c.includes('ring') || c.includes('bangle')) return 'jewellery';
  if (c.includes('western')) return 'western';
  return 'eastern';
}

export function SizeGuideModal({
  isOpen,
  onClose,
  defaultCategory,
  customNote,
}: SizeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<SizeChartTab>(() =>
    resolveInitialTab(defaultCategory)
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveInitialTab(defaultCategory));
    }
  }, [isOpen, defaultCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Store Size Guide"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-white border border-[#E4E4E0] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 h-14 border-b border-[#E4E4E0] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
            <h3 className="font-serif text-xl font-medium text-[#141413]">
              Boutique Size &amp; Fit Guide
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A5A56] hover:text-[#141413] hover:bg-[#F2F2F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 border-b border-[#E4E4E0] flex flex-wrap items-center gap-1.5 bg-[#FAFAFA] shrink-0">
          {(
            [
              { id: 'eastern', label: 'Boutique & Eastern (XS–XL)' },
              { id: 'western', label: 'Western Wear' },
              { id: 'kids', label: 'Baby Garments (1M–10Y)' },
              { id: 'jewellery', label: 'Jewellery & Bangles' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#141413] text-white'
                  : 'bg-white text-[#5A5A56] border border-[#E4E4E0] hover:text-[#141413]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {customNote && customNote.trim() && (
            <div className="p-3.5 bg-[#FAFAFA] border-l-2 border-l-[var(--accent)] border border-[#E4E4E0] rounded-r-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">
                Product Sizing Note
              </p>
              <p className="text-xs text-[#141413] leading-relaxed">{customNote}</p>
            </div>
          )}

          {activeTab === 'eastern' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5A5A56]">
                Measurements are garment specifications in inches. For custom length or sleeve adjustments, add your note before clicking Add to Bag.
              </p>
              <div className="overflow-x-auto border border-[#E4E4E0] rounded-md">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E4E4E0] text-[#5A5A56]">
                      <th className="py-2.5 px-3 font-medium">Size</th>
                      <th className="py-2.5 px-3 font-medium">Chest (in)</th>
                      <th className="py-2.5 px-3 font-medium">Waist (in)</th>
                      <th className="py-2.5 px-3 font-medium">Hip (in)</th>
                      <th className="py-2.5 px-3 font-medium">Shoulder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E0] tabular-nums">
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">XS</td><td className="py-2 px-3">17.5&quot; (35&quot;)</td><td className="py-2 px-3">16&quot;</td><td className="py-2 px-3">19&quot;</td><td className="py-2 px-3">13.5&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">Small</td><td className="py-2 px-3">19&quot; (38&quot;)</td><td className="py-2 px-3">17.5&quot;</td><td className="py-2 px-3">20.5&quot;</td><td className="py-2 px-3">14&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">Medium</td><td className="py-2 px-3">20.5&quot; (41&quot;)</td><td className="py-2 px-3">19&quot;</td><td className="py-2 px-3">22&quot;</td><td className="py-2 px-3">14.5&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">Large</td><td className="py-2 px-3">22.5&quot; (45&quot;)</td><td className="py-2 px-3">21&quot;</td><td className="py-2 px-3">24&quot;</td><td className="py-2 px-3">15.5&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">XL</td><td className="py-2 px-3">24.5&quot; (49&quot;)</td><td className="py-2 px-3">23&quot;</td><td className="py-2 px-3">26&quot;</td><td className="py-2 px-3">16.5&quot;</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'western' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5A5A56]">
                Body measurements in inches for short dresses, maxi silhouettes, tops, and co-ord sets.
              </p>
              <div className="overflow-x-auto border border-[#E4E4E0] rounded-md">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E4E4E0] text-[#5A5A56]">
                      <th className="py-2.5 px-3 font-medium">Size</th>
                      <th className="py-2.5 px-3 font-medium">UK / EU</th>
                      <th className="py-2.5 px-3 font-medium">Bust (in)</th>
                      <th className="py-2.5 px-3 font-medium">Waist (in)</th>
                      <th className="py-2.5 px-3 font-medium">Hip (in)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E0] tabular-nums">
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">XS</td><td className="py-2 px-3">UK 6 / 34</td><td className="py-2 px-3">31–32&quot;</td><td className="py-2 px-3">24–25&quot;</td><td className="py-2 px-3">34–35&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">Small</td><td className="py-2 px-3">UK 8–10 / 36</td><td className="py-2 px-3">33–34&quot;</td><td className="py-2 px-3">26–27&quot;</td><td className="py-2 px-3">36–37&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">Medium</td><td className="py-2 px-3">UK 12 / 38–40</td><td className="py-2 px-3">35–37&quot;</td><td className="py-2 px-3">28–30&quot;</td><td className="py-2 px-3">38–40&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">Large</td><td className="py-2 px-3">UK 14–16 / 42</td><td className="py-2 px-3">38–40&quot;</td><td className="py-2 px-3">31–33&quot;</td><td className="py-2 px-3">41–43&quot;</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'kids' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5A5A56]">
                Age-wise fit reference for baby girl &amp; baby boy outfits from 1 Month up to 10 Years.
              </p>
              <div className="overflow-x-auto border border-[#E4E4E0] rounded-md">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E4E4E0] text-[#5A5A56]">
                      <th className="py-2.5 px-3 font-medium">Age Group</th>
                      <th className="py-2.5 px-3 font-medium">Child Height</th>
                      <th className="py-2.5 px-3 font-medium">Chest (in)</th>
                      <th className="py-2.5 px-3 font-medium">Shirt Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E0] tabular-nums">
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">1–6 Months</td><td className="py-2 px-3">56–68 cm</td><td className="py-2 px-3">18–19&quot;</td><td className="py-2 px-3">11–12.5&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">6–12 Months</td><td className="py-2 px-3">70–80 cm</td><td className="py-2 px-3">19.5–20.5&quot;</td><td className="py-2 px-3">13–14&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">1–3 Years</td><td className="py-2 px-3">82–98 cm</td><td className="py-2 px-3">21–22.5&quot;</td><td className="py-2 px-3">15–17&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">4–6 Years</td><td className="py-2 px-3">104–116 cm</td><td className="py-2 px-3">23–25&quot;</td><td className="py-2 px-3">18–20.5&quot;</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">7–10 Years</td><td className="py-2 px-3">122–140 cm</td><td className="py-2 px-3">26–29&quot;</td><td className="py-2 px-3">22–25&quot;</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'jewellery' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5A5A56]">
                Standard Pakistani &amp; international sizing for bangles, kadas, rings, and chain lengths.
              </p>
              <div className="overflow-x-auto border border-[#E4E4E0] rounded-md">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E4E4E0] text-[#5A5A56]">
                      <th className="py-2.5 px-3 font-medium">Bangle Size</th>
                      <th className="py-2.5 px-3 font-medium">Inner Diameter</th>
                      <th className="py-2.5 px-3 font-medium">Fit Guidance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E0] tabular-nums">
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">2.2 (XS/S)</td><td className="py-2 px-3">2.12 in (54 mm)</td><td className="py-2 px-3">Slim wrist</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">2.4 (Small/Med)</td><td className="py-2 px-3">2.25 in (57 mm)</td><td className="py-2 px-3">Most common standard wrist</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">2.6 (Med/Large)</td><td className="py-2 px-3">2.37 in (60 mm)</td><td className="py-2 px-3">Comfortable medium-wide wrist</td></tr>
                    <tr><td className="py-2 px-3 font-semibold text-[#141413]">2.8 (Large)</td><td className="py-2 px-3">2.50 in (63.5 mm)</td><td className="py-2 px-3">Generous open fit</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
