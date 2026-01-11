import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

interface RangeInputProps {
  label: string;
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  className?: string;
  step?: number;
  showMultipliers?: boolean;
  formatWithCommas?: boolean;
}

// Format number with commas for display
const formatNumberWithCommas = (value: number | undefined): string => {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('en-US');
};

// Parse comma-formatted string to number
const parseFormattedNumber = (value: string): number | undefined => {
  if (value === '') return undefined;
  const cleanValue = value.replace(/,/g, '');
  const parsed = Number(cleanValue);
  return isNaN(parsed) ? undefined : parsed;
};

export function RangeInput({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  className,
  step = 1,
  showMultipliers = false,
  formatWithCommas = false
}: RangeInputProps) {
  const [lastFocused, setLastFocused] = useState<'min' | 'max' | null>(null);
  const [minInputValue, setMinInputValue] = useState<string>(formatWithCommas ? formatNumberWithCommas(minValue) : (minValue?.toString() ?? ''));
  const [maxInputValue, setMaxInputValue] = useState<string>(formatWithCommas ? formatNumberWithCommas(maxValue) : (maxValue?.toString() ?? ''));
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  // Sync input values when props change externally
  const prevMinValue = useRef(minValue);
  const prevMaxValue = useRef(maxValue);
  if (minValue !== prevMinValue.current) {
    prevMinValue.current = minValue;
    setMinInputValue(formatWithCommas ? formatNumberWithCommas(minValue) : (minValue?.toString() ?? ''));
  }
  if (maxValue !== prevMaxValue.current) {
    prevMaxValue.current = maxValue;
    setMaxInputValue(formatWithCommas ? formatNumberWithCommas(maxValue) : (maxValue?.toString() ?? ''));
  }

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (formatWithCommas) {
      // Allow typing with commas
      setMinInputValue(value);
    } else {
      setMinInputValue(value);
      onMinChange(value === '' ? undefined : Number(value));
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (formatWithCommas) {
      setMaxInputValue(value);
    } else {
      setMaxInputValue(value);
      onMaxChange(value === '' ? undefined : Number(value));
    }
  };

  const handleMinBlur = () => {
    if (formatWithCommas) {
      const parsed = parseFormattedNumber(minInputValue);
      onMinChange(parsed);
      setMinInputValue(formatNumberWithCommas(parsed));
    }
  };

  const handleMaxBlur = () => {
    if (formatWithCommas) {
      const parsed = parseFormattedNumber(maxInputValue);
      onMaxChange(parsed);
      setMaxInputValue(formatNumberWithCommas(parsed));
    }
  };

  const applyMultiplier = (multiplier: number) => {
    if (lastFocused === 'min') {
      const currentValue = minValue ?? 0;
      if (currentValue === 0) {
        onMinChange(multiplier);
        setMinInputValue(formatWithCommas ? formatNumberWithCommas(multiplier) : multiplier.toString());
      } else {
        const newValue = currentValue * multiplier;
        onMinChange(newValue);
        setMinInputValue(formatWithCommas ? formatNumberWithCommas(newValue) : newValue.toString());
      }
      minInputRef.current?.focus();
    } else if (lastFocused === 'max') {
      const currentValue = maxValue ?? 0;
      if (currentValue === 0) {
        onMaxChange(multiplier);
        setMaxInputValue(formatWithCommas ? formatNumberWithCommas(multiplier) : multiplier.toString());
      } else {
        const newValue = currentValue * multiplier;
        onMaxChange(newValue);
        setMaxInputValue(formatWithCommas ? formatNumberWithCommas(newValue) : newValue.toString());
      }
      maxInputRef.current?.focus();
    }
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {showMultipliers && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyMultiplier(1_000_000)}
              disabled={!lastFocused}
              className="h-5 px-1.5 text-[10px] font-medium"
              title="Multiply by 1,000,000 (Million)"
            >
              M
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyMultiplier(1_000_000_000)}
              disabled={!lastFocused}
              className="h-5 px-1.5 text-[10px] font-medium"
              title="Multiply by 1,000,000,000 (Billion)"
            >
              B
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Input
          ref={minInputRef}
          type={formatWithCommas ? "text" : "number"}
          step={formatWithCommas ? undefined : step}
          placeholder={minPlaceholder}
          value={minInputValue}
          onChange={handleMinChange}
          onBlur={handleMinBlur}
          onFocus={() => setLastFocused('min')}
          className="w-full"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          ref={maxInputRef}
          type={formatWithCommas ? "text" : "number"}
          step={formatWithCommas ? undefined : step}
          placeholder={maxPlaceholder}
          value={maxInputValue}
          onChange={handleMaxChange}
          onBlur={handleMaxBlur}
          onFocus={() => setLastFocused('max')}
          className="w-full"
        />
      </div>
    </div>
  );
}