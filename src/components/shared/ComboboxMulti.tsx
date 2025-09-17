import { useState } from 'react';
import { Check, ChevronsUpDown, X, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface Option {
  value: string;
  label: string;
}

interface ComboboxMultiProps {
  label: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder?: string;
  className?: string;
  loading?: boolean;
  onSearch?: (search: string) => void;
}

export function ComboboxMulti({
  label,
  options,
  values,
  onChange,
  searchPlaceholder = "Search...",
  className,
  loading = false,
  onSearch
}: ComboboxMultiProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOptions = options.filter(option => values.includes(option.value));
  const filteredOptions = search 
    ? options.filter(option => 
        option.label.toLowerCase().includes(search.toLowerCase()) ||
        option.value.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Add "All" and "Clear All" options at the top
  const allOption = { value: "ALL", label: "All" };
  const clearAllOption = { value: "CLEAR_ALL", label: "Clear All" };
  const optionsWithControls = [allOption, clearAllOption, ...filteredOptions.filter(opt => opt.value !== "ALL" && opt.value !== "CLEAR_ALL")];

  const handleSelect = (value: string) => {
    if (value === "ALL") {
      // If "All" is selected, select all available options
      const allValues = options.filter(opt => opt.value !== "ALL" && opt.value !== "CLEAR_ALL").map(opt => opt.value);
      onChange(allValues);
    } else if (value === "CLEAR_ALL") {
      // If "Clear All" is selected, clear all selections
      onChange([]);
    } else {
      const newValues = values.includes(value)
        ? values.filter(v => v !== value)
        : [...values, value];
      onChange(newValues);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-10 h-auto"
          >
            <div className="flex flex-wrap gap-1 max-w-full">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground">Select {label}</span>
              ) : selectedOptions.length <= 2 ? (
                selectedOptions.map(option => (
                  <Badge key={option.value} variant="secondary" className="text-xs">
                    {option.label}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {selectedOptions.length} selected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              {values.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput 
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading..." : "No options found."}
              </CommandEmpty>
              <CommandGroup>
                {optionsWithControls.map((option) => {
                  const isSelected = option.value === "ALL" 
                    ? values.length === options.filter(opt => opt.value !== "ALL" && opt.value !== "CLEAR_ALL").length
                    : option.value === "CLEAR_ALL"
                    ? values.length === 0
                    : values.includes(option.value);
                  
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className="cursor-pointer"
                    >
                      {option.value === "ALL" ? (
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      ) : option.value === "CLEAR_ALL" ? (
                        <Eraser
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      ) : (
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      )}
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}