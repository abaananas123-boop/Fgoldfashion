import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  GripHorizontal,
} from 'lucide-react';
import { HomeSectionId, SectionAlign } from '../types';

interface SectionPositionBarProps {
  sectionId: HomeSectionId;
  label: string;
  positionIndex: number;
  totalCount: number;
  align?: SectionAlign;
  reverseSplit?: boolean;
  supportsSplitSwap?: boolean;
  onMove: (
    sectionId: HomeSectionId,
    target: 'top' | 'middle' | 'bottom' | 'up' | 'down'
  ) => void;
  onChangeAlign: (sectionId: HomeSectionId, align: SectionAlign) => void;
  onToggleSplit?: (sectionId: HomeSectionId) => void;
}

export function SectionPositionBar({
  sectionId,
  label,
  positionIndex,
  totalCount,
  align = 'left',
  reverseSplit = false,
  supportsSplitSwap = false,
  onMove,
  onChangeAlign,
  onToggleSplit,
}: SectionPositionBarProps) {
  const isFirst = positionIndex === 0;
  const isLast = positionIndex === totalCount - 1;

  return (
    <div className="bg-[#FFF9F5] border-y border-[#F85606]/25 px-3 sm:px-6 py-2">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-[#F85606] shrink-0" />
          <span className="font-bold text-[#141413] truncate">{label}</span>
          <span className="px-1.5 py-0.5 rounded bg-white border border-[#E4E4E0] text-[10px] font-semibold tabular-nums text-[#5A5A56] shrink-0">
            #{positionIndex + 1} / {totalCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Vertical Position Controls */}
          <div
            role="group"
            aria-label={`Reorder ${label}`}
            className="inline-flex items-center bg-white border border-[#D4D4CE] rounded-md overflow-hidden divide-x divide-[#E4E4E0]"
          >
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMove(sectionId, 'top')}
              title="Move to Top / Front"
              className="px-2 py-1 inline-flex items-center gap-1 font-medium text-[#141413] hover:bg-[#FFF5F0] hover:text-[#F85606] disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronsUp className="w-3 h-3" />
              <span>Top</span>
            </button>
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMove(sectionId, 'up')}
              aria-label={`Move ${label} up`}
              title="Move Up"
              className="px-1.5 py-1 text-[#141413] hover:bg-[#FFF5F0] hover:text-[#F85606] disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onMove(sectionId, 'middle')}
              title="Move to Middle"
              className="px-2 py-1 font-medium text-[#141413] hover:bg-[#FFF5F0] hover:text-[#F85606] cursor-pointer"
            >
              Middle
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMove(sectionId, 'down')}
              aria-label={`Move ${label} down`}
              title="Move Down"
              className="px-1.5 py-1 text-[#141413] hover:bg-[#FFF5F0] hover:text-[#F85606] disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMove(sectionId, 'bottom')}
              title="Move to Bottom"
              className="px-2 py-1 inline-flex items-center gap-1 font-medium text-[#141413] hover:bg-[#FFF5F0] hover:text-[#F85606] disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronsDown className="w-3 h-3" />
              <span>Bottom</span>
            </button>
          </div>

          {/* Horizontal Alignment Controls */}
          <div
            role="group"
            aria-label={`Align ${label}`}
            className="inline-flex items-center bg-white border border-[#D4D4CE] rounded-md overflow-hidden divide-x divide-[#E4E4E0]"
          >
            {(
              [
                { key: 'left', label: 'Left', Icon: AlignLeft },
                { key: 'center', label: 'Center', Icon: AlignCenter },
                { key: 'right', label: 'Right', Icon: AlignRight },
              ] as const
            ).map(({ key, label: alignLabel, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => onChangeAlign(sectionId, key)}
                aria-pressed={align === key}
                title={`Place / Align ${alignLabel}`}
                className={`px-2 py-1 inline-flex items-center gap-1 font-medium cursor-pointer transition-colors ${
                  align === key
                    ? 'bg-[#F85606] text-white'
                    : 'text-[#141413] hover:bg-[#FFF5F0]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{alignLabel}</span>
              </button>
            ))}
          </div>

          {/* Left ↔ Right Split Swap for Two-Column Sections */}
          {supportsSplitSwap && onToggleSplit && (
            <button
              type="button"
              onClick={() => onToggleSplit(sectionId)}
              aria-pressed={reverseSplit}
              title="Swap Left & Right Columns"
              className={`px-2 py-1 inline-flex items-center gap-1 rounded-md border font-medium cursor-pointer transition-colors ${
                reverseSplit
                  ? 'bg-[#141413] text-white border-[#141413]'
                  : 'bg-white text-[#141413] border-[#D4D4CE] hover:border-[#141413]'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>{reverseSplit ? 'Sides Swapped (R↔L)' : 'Swap L↔R'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
