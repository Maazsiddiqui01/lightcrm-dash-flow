import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlicersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

// Dynamic date options will be fetched from Supabase

const PLATFORM_ADDON_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Platform Only', value: 'platform' },
  { label: 'Add-on Only', value: 'addon' },
];

const OWNERSHIP_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Family/Founder', value: 'family_founder' },
  { label: 'Other', value: 'other' },
];

const EBITDA_BUCKETS = [
  { label: 'All', value: 'all' },
  { label: '<30', value: '<30' },
  { label: '30-35', value: '30-35' },
  { label: '>35', value: '>35' },
];

export function Slicers({ filters, onFiltersChange }: SlicersProps) {
  const [searchDebounce, setSearchDebounce] = useState(filters.searchText);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, searchText: searchDebounce });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  // Fetch date options from opportunities data directly
  const { data: dateOptions = [] } = useQuery({
    queryKey: ['date-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_raw')
        .select('date_of_origination')
        .not('date_of_origination', 'is', null);
      if (error) throw error;
      
      const years = new Set<string>();
      const quarters = new Set<string>();
      
      data?.forEach(row => {
        const dateStr = row.date_of_origination;
        if (!dateStr) return;
        
        // Extract year (e.g., "2024 Q4" -> "2024", "Jun 2025" -> "2025")
        const yearMatch = dateStr.match(/(\d{4})/);
        if (yearMatch) {
          years.add(yearMatch[1]);
        }
        
        // Extract quarter if present (e.g., "2024 Q4" -> "2024 Q4")
        const quarterMatch = dateStr.match(/(\d{4}\s*Q[1-4])/);
        if (quarterMatch) {
          quarters.add(quarterMatch[1]);
        }
      });
      
      const options = [{ label: 'All', value: 'all' }];
      
      // Add years (descending)
      Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)).forEach(year => {
        options.push({ label: year, value: year });
      });
      
      // Add quarters (descending)
      Array.from(quarters).sort((a, b) => {
        const [yearA, qA] = a.split(' Q');
        const [yearB, qB] = b.split(' Q');
        if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
        return parseInt(qB) - parseInt(qA);
      }).forEach(quarter => {
        options.push({ label: quarter, value: quarter });
      });
      
      return options;
    },
    staleTime: 300_000,
  });


  // Fetch distinct values
  const { data: sectors = [] } = useQuery({
    queryKey: ['distinct-sectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('sector')
        .not('sector', 'is', null);
      if (error) throw error;
      return [...new Set(data.map(row => row.sector).filter(Boolean))].sort();
    },
    staleTime: 300_000,
  });

  const { data: focusAreas = [] } = useQuery({
    queryKey: ['distinct-focus-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('lg_focus_area')
        .not('lg_focus_area', 'is', null);
      if (error) throw error;
      return [...new Set(data.map(row => row.lg_focus_area).filter(Boolean))].sort();
    },
    staleTime: 300_000,
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['distinct-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('tier')
        .not('tier', 'is', null);
      if (error) throw error;
      
      // Get existing tiers from database
      const dbTiers = [...new Set(data.map(row => row.tier).filter(Boolean))];
      
      // Ensure tiers 1-5 are always available
      const allTiers = new Set([...dbTiers, '1', '2', '3', '4', '5']);
      
      return Array.from(allTiers).sort((a, b) => {
        // Sort numerically if both are numbers, otherwise alphabetically
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      });
    },
    staleTime: 300_000,
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['distinct-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('status')
        .not('status', 'is', null);
      if (error) throw error;
      return [...new Set(data.map(row => row.status).filter(Boolean))].sort();
    },
    staleTime: 300_000,
  });

  const { data: lgLeads = [] } = useQuery({
    queryKey: ['distinct-lg-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('investment_professional_point_person_1, investment_professional_point_person_2');
      if (error) throw error;
      const leads = new Set<string>();
      data.forEach(row => {
        if (row.investment_professional_point_person_1) leads.add(row.investment_professional_point_person_1);
        if (row.investment_professional_point_person_2) leads.add(row.investment_professional_point_person_2);
      });
      return Array.from(leads).sort();
    },
    staleTime: 300_000,
  });

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: string, value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, updated);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: 'all',
      sector: [],
      focusArea: [],
      lgLead: [],
      tier: [],
      status: [],
      platformAddon: 'all',
      ownershipType: 'all',
      ebitdaBucket: [],
      searchText: '',
    });
    setSearchDebounce('');
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <Button variant="outline" size="sm" onClick={clearAllFilters}>
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Select
            value={filters.dateRange}
            onValueChange={(value) => updateFilter('dateRange', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-auto">
              {dateOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Platform/Add-on */}
        <div className="space-y-2">
          <Label>Platform/Add-on</Label>
          <div className="flex flex-wrap gap-1">
            {PLATFORM_ADDON_OPTIONS.map(option => (
              <Badge
                key={option.value}
                variant={filters.platformAddon === option.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => updateFilter('platformAddon', option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Ownership Type */}
        <div className="space-y-2">
          <Label>Ownership Type</Label>
          <div className="flex flex-wrap gap-1">
            {OWNERSHIP_OPTIONS.map(option => (
              <Badge
                key={option.value}
                variant={filters.ownershipType === option.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => updateFilter('ownershipType', option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Deal name, referral..."
            value={searchDebounce}
            onChange={(e) => setSearchDebounce(e.target.value)}
          />
        </div>

        {/* EBITDA Buckets */}
        <div className="space-y-2">
          <Label>EBITDA (Ms)</Label>
          <div className="flex flex-wrap gap-1">
            {EBITDA_BUCKETS.map(bucket => (
              <Badge
                key={bucket.value}
                variant={
                  bucket.value === 'all' 
                    ? (filters.ebitdaBucket.length === 0 ? 'default' : 'outline')
                    : (filters.ebitdaBucket.includes(bucket.value) ? 'default' : 'outline')
                }
                className="cursor-pointer"
                onClick={() => {
                  if (bucket.value === 'all') {
                    updateFilter('ebitdaBucket', []);
                  } else {
                    toggleArrayFilter('ebitdaBucket', bucket.value);
                  }
                }}
              >
                {bucket.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Multi-select dropdowns */}
        <MultiSelectDropdown
          label="LG Sector"
          options={sectors}
          selected={filters.sector}
          onToggle={(value) => toggleArrayFilter('sector', value)}
          onBatchUpdate={(values) => updateFilter('sector', values)}
        />

        <MultiSelectDropdown
          label="Focus Area"
          options={focusAreas}
          selected={filters.focusArea}
          onToggle={(value) => toggleArrayFilter('focusArea', value)}
          onBatchUpdate={(values) => updateFilter('focusArea', values)}
        />

        <MultiSelectDropdown
          label="LG Lead"
          options={lgLeads as string[]}
          selected={filters.lgLead}
          onToggle={(value) => toggleArrayFilter('lgLead', value)}
          onBatchUpdate={(values) => updateFilter('lgLead', values)}
        />

        <MultiSelectDropdown
          label="Tier"
          options={tiers}
          selected={filters.tier}
          onToggle={(value) => toggleArrayFilter('tier', value)}
          onBatchUpdate={(values) => updateFilter('tier', values)}
        />

        <MultiSelectDropdown
          label="Status"
          options={statuses}
          selected={filters.status}
          onToggle={(value) => toggleArrayFilter('status', value)}
          onBatchUpdate={(values) => updateFilter('status', values)}
        />
      </div>
    </div>
  );
}

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onBatchUpdate?: (values: string[]) => void;
}

function MultiSelectDropdown({ label, options, selected, onToggle, onBatchUpdate }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleSelectAll = () => {
    if (onBatchUpdate) {
      // If all are selected, clear selection; otherwise select all
      if (selected.length === options.length) {
        onBatchUpdate([]);
      } else {
        onBatchUpdate([...options]);
      }
    } else {
      // Fallback to individual toggles if no batch update function
      if (selected.length === options.length) {
        options.forEach(option => {
          if (selected.includes(option)) {
            onToggle(option);
          }
        });
      } else {
        options.forEach(option => {
          if (!selected.includes(option)) {
            onToggle(option);
          }
        });
      }
    }
  };

  const isAllSelected = selected.length === options.length;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selected.length === 0 
              ? `All ${label}` 
              : selected.length === options.length 
                ? `All ${label}` 
                : `${selected.length} selected`
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={`Search ${label}`} />
            <CommandEmpty>No {label} found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              <CommandItem
                value="select-all"
                onSelect={handleSelectAll}
                className="font-medium border-b"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    isAllSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                {isAllSelected ? "Unselect All" : "Select All"}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => onToggle(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map(item => (
            <Badge key={item} variant="secondary" className="text-xs">
              {item}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => onToggle(item)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}