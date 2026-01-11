import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditableFieldConfig } from '@/config/editableColumns';
import { cn } from '@/lib/utils';
import { getTierDatabaseValue, getTierDisplayValue, getGroupEmailRoleDisplayValue, getGroupEmailRoleDatabaseValue, getPlatformAddonDisplayValue, getPlatformAddonDatabaseValue } from '@/lib/export/opportunityUtils';
import { useOpportunityOptions } from '@/hooks/useOpportunityOptions';
import { useContactSearch } from '@/hooks/useContactSearch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';

interface EditableCellProps {
  value: any;
  config: EditableFieldConfig;
  onChange: (value: any) => void;
  onCommit: () => void;
  onCancel: () => void;
  editing: boolean;
  onStartEdit: () => void;
  error?: string;
  columnKey?: string;
}

export function EditableCell({
  value,
  config,
  onChange,
  onCommit,
  onCancel,
  editing,
  onStartEdit,
  error,
  columnKey,
}: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get options for searchable fields
  const { dealSourceCompanyOptions = [] } = useOpportunityOptions();
  const { contacts, handleSearch } = useContactSearch();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      // Focus the input when editing starts
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        } else if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 0);
    }
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleCommit = () => {
    onChange(localValue);
    onCommit();
  };

  const handleCancel = () => {
    setLocalValue(value);
    onCancel();
  };

  const displayValue = (() => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If this is a tier field with display options, show the display value
    if (config.options?.includes('1-Active') && ['1', '2', '3', '4', '5'].includes(stringValue)) {
      return getTierDisplayValue(stringValue);
    }
    // If this is a group_email_role field, show the display value
    if (columnKey === 'group_email_role' && ['to', 'cc', 'bcc'].includes(stringValue)) {
      return getGroupEmailRoleDisplayValue(stringValue);
    }
    // If this is a platform_add_on field, show the display value
    if (columnKey === 'platform_add_on' && ['Platform', 'Add-On', 'Both'].includes(stringValue)) {
      return getPlatformAddonDisplayValue(stringValue);
    }
    return stringValue;
  })();

  if (!editing) {
    const cellContent = (
      <div
        className={cn(
          "cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[32px] flex items-center",
          error && "border border-destructive"
        )}
        onClick={onStartEdit}
      >
        {config.type === 'boolean' ? (
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
            value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          )}>
            {value ? '✓' : '—'}
          </span>
        ) : (
          <span className={cn(
            "truncate",
            !displayValue && "text-muted-foreground italic"
          )}>
            {displayValue || 'Click to edit'}
          </span>
        )}
      </div>
    );

    if (error) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {cellContent}
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-destructive">{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return cellContent;
  }

  const commonProps = {
    onKeyDown: handleKeyDown,
    onBlur: handleCommit,
    className: cn(
      error && "border-destructive focus:border-destructive"
    ),
  };

  // Searchable select for deal_source_company
  if (config.type === 'searchable-select' && columnKey === 'deal_source_company') {
    if (!editing) {
      return (
        <div
          className={cn(
            "cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[32px] flex items-center",
            error && "border border-destructive"
          )}
          onClick={onStartEdit}
        >
          <span className={cn("truncate", !displayValue && "text-muted-foreground italic")}>
            {displayValue || 'Click to edit'}
          </span>
        </div>
      );
    }

    return (
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between", error && "border-destructive")}
          >
            {localValue || "Select or type..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search companies..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {searchValue && (
                  <div className="p-2">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setLocalValue(searchValue);
                        onChange(searchValue);
                        setSearchOpen(false);
                        onCommit();
                      }}
                    >
                      Add "{searchValue}"
                    </Button>
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup>
                {dealSourceCompanyOptions
                  .filter(opt => 
                    searchValue === '' || 
                    opt.toLowerCase().includes(searchValue.toLowerCase())
                  )
                  .map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => {
                        setLocalValue(option);
                        onChange(option);
                        setSearchOpen(false);
                        onCommit();
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          localValue === option ? "opacity-100" : "opacity-0"
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
    );
  }

  // Contact search for deal_source_individual fields
  if (config.type === 'contact-search') {
    if (!editing) {
      return (
        <div
          className={cn(
            "cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[32px] flex items-center",
            error && "border border-destructive"
          )}
          onClick={onStartEdit}
        >
          <span className={cn("truncate", !displayValue && "text-muted-foreground italic")}>
            {displayValue || 'Click to edit'}
          </span>
        </div>
      );
    }

    return (
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between", error && "border-destructive")}
          >
            {localValue || "Search contacts..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search contacts..." 
              value={searchValue}
              onValueChange={(val) => {
                setSearchValue(val);
                handleSearch(val);
              }}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-sm text-muted-foreground">
                  {searchValue.length < 2 ? 'Type at least 2 characters' : 'No contacts found'}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.full_name}
                    onSelect={() => {
                      setLocalValue(contact.full_name);
                      onChange(contact.full_name);
                      setSearchOpen(false);
                      onCommit();
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{contact.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {contact.email_address} {contact.organization && `• ${contact.organization}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  switch (config.type) {
    case 'textarea':
      return (
        <Textarea
          ref={textareaRef}
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
          rows={3}
        />
      );

    case 'select':
      // Convert database values to display values for special fields
      const selectValue = (() => {
        if (!localValue) return '__none__';
        const strValue = String(localValue);
        
        // Tier field - convert database value to display value
        if (config.options?.includes('1-Active') && ['1', '2', '3', '4', '5'].includes(strValue)) {
          return getTierDisplayValue(strValue);
        }
        
        // Group Email Role field - convert database value to display value
        if (columnKey === 'group_email_role' && ['to', 'cc', 'bcc'].includes(strValue)) {
          return getGroupEmailRoleDisplayValue(strValue);
        }
        
        // Platform/Add-On field - convert database value to display value
        if (columnKey === 'platform_add_on' && ['Platform', 'Add-On', 'Both'].includes(strValue)) {
          return getPlatformAddonDisplayValue(strValue);
        }
        
        return localValue;
      })();

      return (
        <Select 
          value={selectValue} 
          onValueChange={(value) => {
            const finalValue = value === '__none__' ? '' : value;
            
            // Tier field - convert display value to database value
            if (config.options?.includes('1-Active') && finalValue && !['1', '2', '3', '4', '5'].includes(finalValue)) {
              const dbValue = getTierDatabaseValue(finalValue);
              setLocalValue(dbValue);
              onChange(dbValue);
              onCommit();
              return;
            }
            
            // Group Email Role - convert display value to database value
            if (columnKey === 'group_email_role' && finalValue && !['to', 'cc', 'bcc'].includes(finalValue)) {
              const dbValue = getGroupEmailRoleDatabaseValue(finalValue);
              setLocalValue(dbValue);
              onChange(dbValue);
              onCommit();
              return;
            }
            
            // Platform/Add-On - convert display value to database value
            if (columnKey === 'platform_add_on' && finalValue && !['Platform', 'Add-On', 'Both'].includes(finalValue)) {
              const dbValue = getPlatformAddonDatabaseValue(finalValue);
              setLocalValue(dbValue);
              onChange(dbValue);
              onCommit();
              return;
            }
            
            // Standard select field - no conversion needed
            setLocalValue(finalValue);
            onChange(finalValue);
            onCommit();
          }}
        >
          <SelectTrigger className={cn(error && "border-destructive")}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {config.options?.filter(option => option !== '').map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2 p-2">
          <Checkbox
            checked={!!localValue}
            onCheckedChange={(checked) => {
              setLocalValue(checked);
              onChange(checked);
              onCommit();
            }}
          />
          <span className="text-sm">
            {localValue ? 'Yes' : 'No'}
          </span>
        </div>
      );

    case 'number':
      return (
        <Input
          ref={inputRef}
          type="number"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
          className={cn(commonProps.className, "text-right")}
        />
      );

    case 'date':
      return (
        <Input
          ref={inputRef}
          type="date"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
        />
      );

    default:
      return (
        <Input
          ref={inputRef}
          type={config.type === 'email' ? 'email' : 'text'}
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
        />
      );
  }
}