import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface MultiSelectFocusAreaProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectFocusArea({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select Focus Areas",
  disabled = false 
}: MultiSelectFocusAreaProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const handleRemove = (option: string) => {
    onChange(value.filter(v => v !== option));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>LG Focus Area *</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              <span className="truncate">
                {value.length === 0
                  ? placeholder
                  : `${value.length} selected`}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search focus areas..." />
              <CommandList>
                <CommandEmpty>No focus areas found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option}
                      onSelect={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(option) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Select one or more; we'll save a consolidated list and preview #1…#8.
        </p>
      </div>

      {/* Selected Focus Areas as Chips */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Selected Focus Areas</Label>
          <div className="flex flex-wrap gap-2">
            {value.map((item) => (
              <Badge key={item} variant="secondary" className="flex items-center gap-1">
                {item}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Consolidated Preview */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">LG Focus Areas (Consolidated)</Label>
          <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
            {value.join(', ')}
          </p>
        </div>
      )}

      {/* Individual Slots Preview */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">LG Focus Area Slots Preview</Label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex justify-between p-1 bg-muted rounded">
                <span>#{i + 1}:</span>
                <span className="text-muted-foreground">
                  {value[i] || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}