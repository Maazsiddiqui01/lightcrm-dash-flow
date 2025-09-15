import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fetchFocusAreaOptions } from "@/lib/options";

interface FocusAreaSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  single?: boolean;
  label?: string;
}

export function FocusAreaSelect({ 
  value, 
  onChange, 
  placeholder = "Select Focus Areas",
  maxTags,
  disabled = false,
  single = false,
  label = "LG Focus Area"
}: FocusAreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['focus-area-options'],
    queryFn: fetchFocusAreaOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const filteredOptions = options.filter(option =>
    option.focus_area.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedFocusArea: string) => {
    if (single) {
      onChange(value.includes(selectedFocusArea) ? [] : [selectedFocusArea]);
      setOpen(false);
      return;
    }

    if (value.includes(selectedFocusArea)) {
      onChange(value.filter(v => v !== selectedFocusArea));
    } else {
      if (maxTags && value.length >= maxTags) {
        return; // Don't add if we've reached the max
      }
      onChange([...value, selectedFocusArea]);
    }
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
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.focus_area}
                      onSelect={() => handleSelect(option.focus_area)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(option.focus_area) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div>{option.focus_area}</div>
                        {option.sector && (
                          <div className="text-xs text-muted-foreground">
                            Sector: {option.sector}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
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