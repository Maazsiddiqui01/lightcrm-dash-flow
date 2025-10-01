import { Button } from '@/components/ui/button';
import { Check, HelpCircle, X } from 'lucide-react';
import type { TriState } from '@/types/phraseLibrary';

interface TriStateToggleProps {
  value: TriState;
  onChange: (value: TriState) => void;
  label?: string;
  disabled?: boolean;
}

export function TriStateToggle({ value, onChange, label, disabled }: TriStateToggleProps) {
  const states: TriState[] = ['never', 'sometimes', 'always'];
  
  const getIcon = (state: TriState) => {
    switch (state) {
      case 'always':
        return <Check className="h-4 w-4" />;
      case 'sometimes':
        return <HelpCircle className="h-4 w-4" />;
      case 'never':
        return <X className="h-4 w-4" />;
    }
  };

  const getVariant = (state: TriState) => {
    if (value === state) {
      switch (state) {
        case 'always':
          return 'default';
        case 'sometimes':
          return 'secondary';
        case 'never':
          return 'outline';
      }
    }
    return 'ghost';
  };

  const getLabel = (state: TriState) => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex items-center gap-1 border rounded-md p-1">
        {states.map((state) => (
          <Button
            key={state}
            variant={getVariant(state)}
            size="sm"
            onClick={() => onChange(state)}
            disabled={disabled}
            className="h-8 px-3"
          >
            {getIcon(state)}
            <span className="ml-1 text-xs">{getLabel(state)}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
