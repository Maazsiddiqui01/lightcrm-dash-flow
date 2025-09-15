import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface SingleSelectDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowCustom?: boolean;
  onAddCustom?: (value: string) => void;
}

export function SingleSelectDropdown({ 
  label,
  options, 
  value, 
  onChange, 
  placeholder = "Select option",
  disabled = false,
  required = false,
  allowCustom = false,
  onAddCustom
}: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue === value ? "" : selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleAddCustom = () => {
    if (searchValue.trim() && !options.includes(searchValue.trim())) {
      onChange(searchValue.trim());
      onAddCustom?.(searchValue.trim());
      setOpen(false);
      setSearchValue("");
    }
  };

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  );

  const showAddCustomOption = allowCustom && 
    searchValue.trim() && 
    !options.includes(searchValue.trim()) &&
    filteredOptions.length === 0;

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && ' *'}
      </Label>
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
              {value || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {filteredOptions.length === 0 && !showAddCustomOption && (
                <CommandEmpty>No options found.</CommandEmpty>
              )}
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
                {showAddCustomOption && (
                  <CommandItem onSelect={handleAddCustom}>
                    <span className="text-muted-foreground">
                      Add "{searchValue.trim()}"
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}