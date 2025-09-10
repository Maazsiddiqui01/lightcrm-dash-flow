import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
  step = 1
}: RangeInputProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onMinChange(value === '' ? undefined : Number(value));
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onMaxChange(value === '' ? undefined : Number(value));
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          step={step}
          placeholder={minPlaceholder}
          value={minValue ?? ''}
          onChange={handleMinChange}
          className="w-full"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          step={step}
          placeholder={maxPlaceholder}
          value={maxValue ?? ''}
          onChange={handleMaxChange}
          className="w-full"
        />
      </div>
    </div>
  );
}