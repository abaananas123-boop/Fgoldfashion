import { useEffect, useState } from 'react';

interface HexColorFieldProps {
  label: string;
  value: string;
  fallbackColor?: string;
  onChange: (hex: string) => void;
  placeholder?: string;
  compact?: boolean;
  inline?: boolean;
}

export function normalizeToSixDigitHex(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#+/, '');
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const [r, g, b] = cleaned.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

export function HexColorField({
  label,
  value,
  fallbackColor = '#141413',
  onChange,
  placeholder = '#698467',
  compact = false,
  inline = false,
}: HexColorFieldProps) {
  const normalizedCurrent =
    normalizeToSixDigitHex(value) ||
    normalizeToSixDigitHex(fallbackColor) ||
    '#141413';

  const [textInput, setTextInput] = useState(normalizedCurrent);

  useEffect(() => {
    const nextNorm = normalizeToSixDigitHex(value);
    if (nextNorm) {
      setTextInput(nextNorm);
    } else if (!value) {
      setTextInput(normalizedCurrent);
    }
  }, [value, normalizedCurrent]);

  const handleTextChange = (raw: string) => {
    // Keep only optional leading '#' and hex characters, max 7 chars (# + 6 hex)
    const stripped = raw.replace(/[^#0-9a-fA-F]/g, '');
    const noExtraHashes = stripped.replace(/#/g, '');
    const formatted = noExtraHashes
      ? `#${noExtraHashes.slice(0, 6).toUpperCase()}`
      : stripped.startsWith('#')
        ? '#'
        : '';

    setTextInput(formatted);

    // Auto-select immediately once a full 6-digit hex code is entered (e.g. #698467)
    if (/^#[0-9A-F]{6}$/.test(formatted)) {
      onChange(formatted);
    }
  };

  const commitOrResetOnBlur = () => {
    const parsed = normalizeToSixDigitHex(textInput);
    if (parsed) {
      setTextInput(parsed);
      if (parsed.toUpperCase() !== normalizedCurrent.toUpperCase()) {
        onChange(parsed);
      }
    } else {
      setTextInput(normalizedCurrent);
    }
  };

  if (inline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-[#5A5A56] border border-[#D4D4CE] rounded-md bg-[#FAFAFA]">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={normalizedCurrent}
          onChange={(e) => {
            const nextHex = e.target.value.toUpperCase();
            setTextInput(nextHex);
            onChange(nextHex);
          }}
          className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer shrink-0"
        />
        <input
          type="text"
          aria-label={`${label} hex color code`}
          value={textInput}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={commitOrResetOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitOrResetOnBlur();
            }
          }}
          placeholder={placeholder}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          className="w-20 h-6 px-1.5 text-[11px] font-mono uppercase text-[#141413] bg-white border border-[#D4D4CE] rounded focus:outline-none focus:border-[#141413]"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1.5 bg-[#FAFAFA] border border-[#E4E4E0] rounded-md text-[11px] font-medium text-[#141413] ${
        compact ? 'p-2' : 'p-2.5'
      }`}
    >
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={normalizedCurrent}
          onChange={(e) => {
            const nextHex = e.target.value.toUpperCase();
            setTextInput(nextHex);
            onChange(nextHex);
          }}
          className="w-7 h-7 p-0 border border-[#D4D4CE] rounded bg-white cursor-pointer shrink-0"
        />
        <input
          type="text"
          aria-label={`${label} hex color code`}
          value={textInput}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={commitOrResetOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitOrResetOnBlur();
            }
          }}
          placeholder={placeholder}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          className="w-full min-w-0 h-7 px-2 text-[11px] font-mono uppercase text-[#141413] bg-white border border-[#D4D4CE] rounded focus:outline-none focus:border-[#141413]"
        />
      </div>
    </div>
  );
}
