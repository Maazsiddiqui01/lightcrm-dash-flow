import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface FilterValues {
  focus_areas: string[];
  lg_leads: string[];
}

interface KpiFilters {
  start: string;
  end: string;
  focus_areas: string[];
  lg_leads: string[];
  ebitda_min: number;
  family_owned_only: boolean;
}

interface FiltersDrawerProps {
  filters: KpiFilters;
  filterValues: FilterValues | null;
  onFiltersChange: (filters: Partial<KpiFilters>) => void;
  onReset: () => void;
}

export function FiltersDrawer({ filters, filterValues, onFiltersChange, onReset }: FiltersDrawerProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync local state with props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Load filters from URL on mount
  useEffect(() => {
    const urlFilters: Partial<KpiFilters> = {};
    
    if (searchParams.get('start')) urlFilters.start = searchParams.get('start')!;
    if (searchParams.get('end')) urlFilters.end = searchParams.get('end')!;
    if (searchParams.get('focus')) urlFilters.focus_areas = searchParams.get('focus')!.split(',');
    if (searchParams.get('lead')) urlFilters.lg_leads = searchParams.get('lead')!.split(',');
    if (searchParams.get('ebitda')) urlFilters.ebitda_min = parseInt(searchParams.get('ebitda')!);
    if (searchParams.get('family')) urlFilters.family_owned_only = searchParams.get('family') === 'true';

    if (Object.keys(urlFilters).length > 0) {
      onFiltersChange(urlFilters);
    }
  }, []);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (localFilters.start !== filters.start) params.set('start', localFilters.start);
    if (localFilters.end !== filters.end) params.set('end', localFilters.end);
    if (localFilters.focus_areas.length > 0) params.set('focus', localFilters.focus_areas.join(','));
    if (localFilters.lg_leads.length > 0) params.set('lead', localFilters.lg_leads.join(','));
    if (localFilters.ebitda_min !== 35) params.set('ebitda', localFilters.ebitda_min.toString());
    if (!localFilters.family_owned_only) params.set('family', 'false');
    
    setSearchParams(params);
    setOpen(false);

    // Store in localStorage
    localStorage.setItem('kpi-filters', JSON.stringify(localFilters));
  };

  const handleReset = () => {
    const currentYear = new Date().getFullYear();
    const resetFilters = {
      start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      focus_areas: [],
      lg_leads: [],
      ebitda_min: 35,
      family_owned_only: true,
    };
    
    setLocalFilters(resetFilters);
    onReset();
    setSearchParams(new URLSearchParams());
    localStorage.removeItem('kpi-filters');
  };

  const toggleFocusArea = (area: string) => {
    setLocalFilters(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area],
    }));
  };

  const toggleLgLead = (lead: string) => {
    setLocalFilters(prev => ({
      ...prev,
      lg_leads: prev.lg_leads.includes(lead)
        ? prev.lg_leads.filter(l => l !== lead)
        : [...prev.lg_leads, lead],
    }));
  };

  const removeFocusArea = (area: string) => {
    setLocalFilters(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.filter(a => a !== area),
    }));
  };

  const removeLgLead = (lead: string) => {
    setLocalFilters(prev => ({
      ...prev,
      lg_leads: prev.lg_leads.filter(l => l !== lead),
    }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {(filters.focus_areas.length > 0 || filters.lg_leads.length > 0 || !filters.family_owned_only || filters.ebitda_min !== 35) && (
            <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
              {filters.focus_areas.length + filters.lg_leads.length + (!filters.family_owned_only ? 1 : 0) + (filters.ebitda_min !== 35 ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Apply filters to refine your KPI data
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {/* Date Range */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-xs text-muted-foreground">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={localFilters.start}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs text-muted-foreground">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={localFilters.end}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Focus Areas</Label>
            {localFilters.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localFilters.focus_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2 hover:bg-transparent"
                      onClick={() => removeFocusArea(area)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
              {filterValues?.focus_areas?.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`focus-${area}`}
                    checked={localFilters.focus_areas.includes(area)}
                    onCheckedChange={() => toggleFocusArea(area)}
                  />
                  <Label htmlFor={`focus-${area}`} className="text-sm font-normal cursor-pointer">
                    {area}
                  </Label>
                </div>
              )) ?? (
                <div className="text-sm text-muted-foreground">No focus areas available</div>
              )}
            </div>
          </div>

          {/* LG Leads */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">LG Leads</Label>
            {localFilters.lg_leads.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localFilters.lg_leads.map((lead) => (
                  <Badge key={lead} variant="secondary" className="text-xs">
                    {lead}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2 hover:bg-transparent"
                      onClick={() => removeLgLead(lead)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
              {filterValues?.lg_leads?.map((lead) => (
                <div key={lead} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lead-${lead}`}
                    checked={localFilters.lg_leads.includes(lead)}
                    onCheckedChange={() => toggleLgLead(lead)}
                  />
                  <Label htmlFor={`lead-${lead}`} className="text-sm font-normal cursor-pointer">
                    {lead}
                  </Label>
                </div>
              )) ?? (
                <div className="text-sm text-muted-foreground">No LG leads available</div>
              )}
            </div>
          </div>

          {/* EBITDA Minimum */}
          <div className="space-y-2">
            <Label htmlFor="ebitda-min" className="text-sm font-medium">EBITDA Minimum (M)</Label>
            <Input
              id="ebitda-min"
              type="number"
              value={localFilters.ebitda_min}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, ebitda_min: parseInt(e.target.value) || 0 }))}
              placeholder="35"
            />
          </div>

          {/* Family/Founder-owned Only */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="family-owned"
              checked={localFilters.family_owned_only}
              onCheckedChange={(checked) => setLocalFilters(prev => ({ ...prev, family_owned_only: checked as boolean }))}
            />
            <Label htmlFor="family-owned" className="text-sm font-medium cursor-pointer">
              Family/Founder-owned only
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-6 border-t">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}