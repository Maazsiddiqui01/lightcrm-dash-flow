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
}

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
  showMultipliers = true
}: RangeInputProps) {
  const [lastFocused, setLastFocused] = useState<'min' | 'max' | null>(null);
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onMinChange(value === '' ? undefined : Number(value));
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onMaxChange(value === '' ? undefined : Number(value));
  };

  const applyMultiplier = (multiplier: number) => {
    if (lastFocused === 'min') {
      const currentValue = minValue ?? 0;
      if (currentValue === 0) {
        onMinChange(multiplier);
      } else {
        onMinChange(currentValue * multiplier);
      }
      minInputRef.current?.focus();
    } else if (lastFocused === 'max') {
      const currentValue = maxValue ?? 0;
      if (currentValue === 0) {
        onMaxChange(multiplier);
      } else {
        onMaxChange(currentValue * multiplier);
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
          type="number"
          step={step}
          placeholder={minPlaceholder}
          value={minValue ?? ''}
          onChange={handleMinChange}
          onFocus={() => setLastFocused('min')}
          className="w-full"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          ref={maxInputRef}
          type="number"
          step={step}
          placeholder={maxPlaceholder}
          value={maxValue ?? ''}
          onChange={handleMaxChange}
          onFocus={() => setLastFocused('max')}
          className="w-full"
        />
      </div>
    </div>
  );
}