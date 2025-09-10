import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { useKpiFilters, KpiFilters } from '@/state/useKpiFilters';
import { useDistinctFocusAreas, useDistinctSectors, useDistinctOwnershipTypes } from '@/hooks/useDistinctKpiOptions';

export function KpiFilterBar() {
  const filters = useKpiFilters();
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<KpiFilters>(filters);

  const { data: focusAreas = [] } = useDistinctFocusAreas();
  const { data: sectors = [] } = useDistinctSectors();
  const { data: ownershipTypes = [] } = useDistinctOwnershipTypes();

  const handleApplyFilters = () => {
    filters.setFilters(localFilters);
    setOpen(false);
  };

  const handleClear = () => {
    const resetFilters = filters.resetToDefault();
    setLocalFilters(filters);
    setOpen(false);
  };

  const activeFilterCount = filters.focusAreas.length + filters.sectors.length + filters.ownership.length;

  const toggleItem = (items: string[], item: string, setter: (items: string[]) => void) => {
    if (items.includes(item)) {
      setter(items.filter(i => i !== item));
    } else {
      setter([...items, item]);
    }
  };

  const removeItem = (items: string[], item: string, setter: (items: string[]) => void) => {
    setter(items.filter(i => i !== item));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>KPI Filters</SheetTitle>
          <SheetDescription>
            Filter your KPI data and view the same filters on other pages
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
                  value={localFilters.dateStart}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs text-muted-foreground">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={localFilters.dateEnd}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Focus Areas</Label>
            {localFilters.focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localFilters.focusAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2 hover:bg-transparent"
                      onClick={() => removeItem(localFilters.focusAreas, area, (items) => 
                        setLocalFilters(prev => ({ ...prev, focusAreas: items }))
                      )}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
              {focusAreas.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`focus-${area}`}
                    checked={localFilters.focusAreas.includes(area)}
                    onCheckedChange={() => toggleItem(
                      localFilters.focusAreas, 
                      area, 
                      (items) => setLocalFilters(prev => ({ ...prev, focusAreas: items }))
                    )}
                  />
                  <Label htmlFor={`focus-${area}`} className="text-sm font-normal cursor-pointer">
                    {area}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sectors */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Sectors</Label>
            {localFilters.sectors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localFilters.sectors.map((sector) => (
                  <Badge key={sector} variant="secondary" className="text-xs">
                    {sector}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2 hover:bg-transparent"
                      onClick={() => removeItem(localFilters.sectors, sector, (items) => 
                        setLocalFilters(prev => ({ ...prev, sectors: items }))
                      )}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
              {sectors.map((sector) => (
                <div key={sector} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sector-${sector}`}
                    checked={localFilters.sectors.includes(sector)}
                    onCheckedChange={() => toggleItem(
                      localFilters.sectors, 
                      sector, 
                      (items) => setLocalFilters(prev => ({ ...prev, sectors: items }))
                    )}
                  />
                  <Label htmlFor={`sector-${sector}`} className="text-sm font-normal cursor-pointer">
                    {sector}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Ownership Type */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Ownership Type</Label>
            {localFilters.ownership.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localFilters.ownership.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2 hover:bg-transparent"
                      onClick={() => removeItem(localFilters.ownership, type, (items) => 
                        setLocalFilters(prev => ({ ...prev, ownership: items }))
                      )}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
              {ownershipTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ownership-${type}`}
                    checked={localFilters.ownership.includes(type)}
                    onCheckedChange={() => toggleItem(
                      localFilters.ownership, 
                      type, 
                      (items) => setLocalFilters(prev => ({ ...prev, ownership: items }))
                    )}
                  />
                  <Label htmlFor={`ownership-${type}`} className="text-sm font-normal cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-6 border-t">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters
          </Button>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}