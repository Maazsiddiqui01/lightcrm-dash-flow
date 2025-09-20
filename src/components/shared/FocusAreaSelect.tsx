import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useEnhancedFocusAreas, compressHcFocusAreas } from "@/hooks/useEnhancedFocusAreas";

interface FocusAreaSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  single?: boolean;
  label?: string;
  sectorId?: string; // Optional sector filter
}

export function FocusAreaSelect({ 
  value, 
  onChange, 
  placeholder = "Select Focus Areas",
  maxTags,
  disabled = false,
  single = false,
  label = "LG Focus Area",
  sectorId
}: FocusAreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Use the enhanced focus areas hook
  const { data: focusAreaOptions = [], isLoading } = useEnhancedFocusAreas({ sectorId });
  
  // Convert to format expected by existing component
  const options = focusAreaOptions.map(option => ({
    value: option.label,
    label: option.label,
    meta: { 
      id: option.id, 
      sector_id: option.sectorId,
      sector_label: option.sectorId
    }
  }));

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedFocusArea: string) => {
    if (single) {
      onChange(value.includes(selectedFocusArea) ? [] : [selectedFocusArea]);
      setOpen(false);
      return;
    }

    let updatedValue: string[];
    
    if (selectedFocusArea === 'HC: (All)') {
      // Handle HC: (All) selection
      if (value.includes('HC: (All)')) {
        // Remove HC: (All) and all HC areas
        updatedValue = value.filter(v => !v.startsWith('HC:'));
      } else {
        // Add HC: (All) and remove individual HC areas
        const nonHcAreas = value.filter(v => !v.startsWith('HC:'));
        updatedValue = [...nonHcAreas, 'HC: (All)'];
      }
    } else {
      // Regular focus area selection
      if (value.includes(selectedFocusArea)) {
        updatedValue = value.filter(v => v !== selectedFocusArea);
      } else {
        if (maxTags && value.length >= maxTags) {
          return; // Don't add if we've reached the max
        }
        // Remove HC: (All) if adding individual HC area
        const baseValue = selectedFocusArea.startsWith('HC:') && selectedFocusArea !== 'HC: (All)'
          ? value.filter(v => v !== 'HC: (All)')
          : value;
        updatedValue = [...baseValue, selectedFocusArea];
      }
      
      // Compress to HC: (All) if all HC areas are now selected
      updatedValue = compressHcFocusAreas(updatedValue, focusAreaOptions);
    }
    
    onChange(updatedValue);
  };

  const handleRemove = (focusArea: string) => {
    onChange(value.filter(v => v !== focusArea));
  };

  const displayText = single 
    ? (value.length > 0 ? value[0] : placeholder)
    : (value.length === 0 ? placeholder : `${value.length} selected`);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>{label} {!single && "*"}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled || isLoading}
            >
              <span className="truncate">
                {displayText}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Search focus areas..." 
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No focus areas found.</CommandEmpty>
                {!single && value.length > 0 && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => onChange([])}
                      className="text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear all ({value.length} selected)
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandGroup>
                  {filteredOptions.map((option) => {
                    let isSelected = value.includes(option.value);
                    
                    // Special handling for HC areas when HC: (All) is selected
                    if (value.includes('HC: (All)') && option.value.startsWith('HC:') && option.value !== 'HC: (All)') {
                      isSelected = true;
                    }
                    
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => handleSelect(option.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {option.label}
                            {option.value === 'HC: (All)' && (
                              <span className="text-xs text-muted-foreground">
                                (All Healthcare)
                              </span>
                            )}
                          </div>
                          {option.meta?.sector_label && option.value !== 'HC: (All)' && (
                            <div className="text-xs text-muted-foreground">
                              Sector: {option.meta.sector_label}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {!single && (
          <p className="text-xs text-muted-foreground">
            Select one or more focus areas{maxTags ? ` (max ${maxTags})` : ""}.
          </p>
        )}
      </div>

      {/* Selected Focus Areas as Chips (multi-select only) */}
      {!single && value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Selected Focus Areas</Label>
          <div className="flex flex-wrap gap-2">
            {value.map((item) => (
              <Badge key={item} variant="secondary" className="flex items-center gap-1">
                <span className="max-w-[200px] truncate" title={item}>
                  {item.length > 60 ? `${item.substring(0, 60)}...` : item}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  disabled={disabled}
                  aria-label={`Remove ${item}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}