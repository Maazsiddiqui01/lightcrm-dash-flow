import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Filter, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterField {
  key: string;
  label: string;
  type: 'multi-select' | 'text' | 'number-compare';
  options?: FilterOption[];
  searchable?: boolean;
  placeholder?: string;
}

interface NumberCompareValue {
  operator: '>=' | '<=';
  value: number | null;
}

interface FilterValues {
  [key: string]: string[] | string | NumberCompareValue | null;
}

interface FilterModalProps {
  title: string;
  fields: FilterField[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  onApply: () => void;
  onClearAll: () => void;
  activeFilterCount: number;
  children: React.ReactNode;
}

const MultiSelect = ({ 
  options, 
  values, 
  onValuesChange, 
  placeholder, 
  searchable = true 
}: {
  options: FilterOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredOptions = searchable 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      )
    : options;

  const toggleOption = (value: string) => {
    const newValues = values.includes(value)
      ? values.filter(v => v !== value)
      : [...values, value];
    onValuesChange(newValues);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {values.length === 0 ? (
            <span className="text-muted-foreground">{placeholder || "Select options..."}</span>
          ) : values.length === 1 ? (
            options.find(opt => opt.value === values[0])?.label
          ) : (
            `${values.length} selected`
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          {searchable && (
            <CommandInput 
              placeholder="Search..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
          )}
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-48">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={values.includes(option.value)}
                      onChange={() => toggleOption(option.value)}
                      className="mr-2"
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const NumberCompareInput = ({ 
  value, 
  onValueChange 
}: {
  value: NumberCompareValue | null;
  onValueChange: (value: NumberCompareValue | null) => void;
}) => {
  const [operator, setOperator] = useState<'>=' | '<='>(value?.operator || '>=');
  const [numberValue, setNumberValue] = useState<string>(value?.value?.toString() || '');

  const handleOperatorChange = (newOperator: '>=' | '<=') => {
    setOperator(newOperator);
    const numValue = parseFloat(numberValue);
    if (!isNaN(numValue)) {
      onValueChange({ operator: newOperator, value: numValue });
    }
  };

  const handleNumberChange = (newValue: string) => {
    setNumberValue(newValue);
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      onValueChange({ operator, value: numValue });
    } else if (newValue === '') {
      onValueChange(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=">=">&gt;=</SelectItem>
          <SelectItem value="<=">&lt;=</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        placeholder="Value"
        value={numberValue}
        onChange={(e) => handleNumberChange(e.target.value)}
        className="flex-1"
      />
    </div>
  );
};

export function FilterModal({ 
  title, 
  fields, 
  values, 
  onValuesChange, 
  onApply, 
  onClearAll, 
  activeFilterCount,
  children 
}: FilterModalProps) {
  const [open, setOpen] = useState(false);

  const handleFieldChange = (fieldKey: string, newValue: any) => {
    onValuesChange({
      ...values,
      [fieldKey]: newValue
    });
  };

  const renderField = (field: FilterField) => {
    const fieldValue = values[field.key];

    switch (field.type) {
      case 'multi-select':
        return (
          <MultiSelect
            options={field.options || []}
            values={(fieldValue as string[]) || []}
            onValuesChange={(newValues) => handleFieldChange(field.key, newValues)}
            placeholder={field.placeholder}
            searchable={field.searchable}
          />
        );
      
      case 'text':
        return (
          <Input
            type="text"
            placeholder={field.placeholder}
            value={(fieldValue as string) || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        );
      
      case 'number-compare':
        return (
          <NumberCompareInput
            value={(fieldValue as NumberCompareValue) || null}
            onValueChange={(newValue) => handleFieldChange(field.key, newValue)}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Configure filters to narrow down your results
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4 pr-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <Separator />
          
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                onApply();
                setOpen(false);
              }}
              className="flex-1"
            >
              Apply Filters
            </Button>
            <Button 
              variant="outline" 
              onClick={onClearAll}
              className="flex-1"
            >
              Clear All
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ActiveFilters({ 
  filters, 
  onRemoveFilter, 
  onClearAll 
}: {
  filters: Array<{ key: string; label: string; value: string }>;
  onRemoveFilter: (key: string, value?: string) => void;
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <span className="text-muted-foreground">Filters:</span>
      {filters.map((filter, index) => (
        <Badge key={`${filter.key}-${filter.value}-${index}`} variant="secondary" className="gap-1">
          {filter.label}: {filter.value}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onRemoveFilter(filter.key, filter.value)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <Button variant="link" size="sm" onClick={onClearAll} className="h-auto p-0">
        Clear all
      </Button>
    </div>
  );
}