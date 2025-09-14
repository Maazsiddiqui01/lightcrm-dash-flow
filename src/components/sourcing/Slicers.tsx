import { useState, useEffect } from 'react';
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

const DATE_PRESETS = [
  { label: 'All', value: ['2020-01-01', '2030-12-31'] },
  { label: '2024', value: ['2024-01-01', '2024-12-31'] },
  { label: '2025', value: ['2025-01-01', '2025-12-31'] },
  { label: '2024 Q4', value: ['2024-10-01', '2024-12-31'] },
  { label: '2025 Q1', value: ['2025-01-01', '2025-03-31'] },
];

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

const EBITDA_BUCKETS = ['<20', '20-35', '>35'];

export function Slicers({ filters, onFiltersChange }: SlicersProps) {
  const [searchDebounce, setSearchDebounce] = useState(filters.searchText);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, searchText: searchDebounce });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

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
      return [...new Set(data.map(row => row.tier).filter(Boolean))].sort();
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
      dateRange: ['2024-01-01', '2025-12-31'],
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
            value={DATE_PRESETS.find(p => 
              p.value[0] === filters.dateRange[0] && p.value[1] === filters.dateRange[1]
            )?.label || 'Custom'}
            onValueChange={(value) => {
              const preset = DATE_PRESETS.find(p => p.label === value);
              if (preset) updateFilter('dateRange', preset.value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(preset => (
                <SelectItem key={preset.label} value={preset.label}>
                  {preset.label}
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
                key={bucket}
                variant={filters.ebitdaBucket.includes(bucket) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleArrayFilter('ebitdaBucket', bucket)}
              >
                {bucket}
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
        />

        <MultiSelectDropdown
          label="Focus Area"
          options={focusAreas}
          selected={filters.focusArea}
          onToggle={(value) => toggleArrayFilter('focusArea', value)}
        />

        <MultiSelectDropdown
          label="LG Lead"
          options={lgLeads as string[]}
          selected={filters.lgLead}
          onToggle={(value) => toggleArrayFilter('lgLead', value)}
        />

        <MultiSelectDropdown
          label="Tier"
          options={tiers}
          selected={filters.tier}
          onToggle={(value) => toggleArrayFilter('tier', value)}
        />

        <MultiSelectDropdown
          label="Status"
          options={statuses}
          selected={filters.status}
          onToggle={(value) => toggleArrayFilter('status', value)}
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
}

function MultiSelectDropdown({ label, options, selected, onToggle }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);

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
            {selected.length > 0 ? `${selected.length} selected` : `Select ${label}`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={`Search ${label}`} />
            <CommandEmpty>No {label} found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
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