import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Eraser } from 'lucide-react';
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

  const removeItem = (items: string[], item: string, setter: (items: string[]) => void) => {
    setter(items.filter(i => i !== item));
  };

  const toggleItem = (items: string[], item: string, setter: (items: string[]) => void) => {
    if (item === "ALL") {
      // If "All" is selected and currently all items are selected, clear all
      // Otherwise, select all items
      const allItems = item === "ALL" && items.length === focusAreas.length ? [] : focusAreas;
      setter(allItems);
    } else {
      if (items.includes(item)) {
        setter(items.filter(i => i !== item));
      } else {
        setter([...items, item]);
      }
    }
  };

  const toggleFocusArea = (item: string) => {
    if (item === "ALL") {
      const allAreas = localFilters.focusAreas.length === focusAreas.length ? [] : [...focusAreas];
      setLocalFilters(prev => ({ ...prev, focusAreas: allAreas }));
    } else {
      toggleItem(localFilters.focusAreas, item, (items) => 
        setLocalFilters(prev => ({ ...prev, focusAreas: items }))
      );
    }
  };

  const toggleSector = (item: string) => {
    if (item === "ALL") {
      const allSectors = localFilters.sectors.length === sectors.length ? [] : [...sectors];
      setLocalFilters(prev => ({ ...prev, sectors: allSectors }));
    } else {
      toggleItem(localFilters.sectors, item, (items) => 
        setLocalFilters(prev => ({ ...prev, sectors: items }))
      );
    }
  };

  const toggleOwnership = (item: string) => {
    if (item === "ALL") {
      const allTypes = localFilters.ownership.length === ownershipTypes.length ? [] : [...ownershipTypes];
      setLocalFilters(prev => ({ ...prev, ownership: allTypes }));
    } else {
      toggleItem(localFilters.ownership, item, (items) => 
        setLocalFilters(prev => ({ ...prev, ownership: items }))
      );
    }
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
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Focus Areas</Label>
              {localFilters.focusAreas.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalFilters(prev => ({ ...prev, focusAreas: [] }))}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
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
              {/* All option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="focus-all"
                  checked={localFilters.focusAreas.length === focusAreas.length}
                  onCheckedChange={() => toggleFocusArea("ALL")}
                />
                <Label htmlFor="focus-all" className="text-sm font-normal cursor-pointer font-medium">
                  All
                </Label>
              </div>
              {/* Individual focus areas */}
              {focusAreas.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`focus-${area}`}
                    checked={localFilters.focusAreas.includes(area)}
                    onCheckedChange={() => toggleFocusArea(area)}
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
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sectors</Label>
              {localFilters.sectors.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalFilters(prev => ({ ...prev, sectors: [] }))}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
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
              {/* All option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sector-all"
                  checked={localFilters.sectors.length === sectors.length}
                  onCheckedChange={() => toggleSector("ALL")}
                />
                <Label htmlFor="sector-all" className="text-sm font-normal cursor-pointer font-medium">
                  All
                </Label>
              </div>
              {/* Individual sectors */}
              {sectors.map((sector) => (
                <div key={sector} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sector-${sector}`}
                    checked={localFilters.sectors.includes(sector)}
                    onCheckedChange={() => toggleSector(sector)}
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
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Ownership Type</Label>
              {localFilters.ownership.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalFilters(prev => ({ ...prev, ownership: [] }))}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
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
              {/* All option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownership-all"
                  checked={localFilters.ownership.length === ownershipTypes.length}
                  onCheckedChange={() => toggleOwnership("ALL")}
                />
                <Label htmlFor="ownership-all" className="text-sm font-normal cursor-pointer font-medium">
                  All
                </Label>
              </div>
              {/* Individual ownership types */}
              {ownershipTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ownership-${type}`}
                    checked={localFilters.ownership.includes(type)}
                    onCheckedChange={() => toggleOwnership(type)}
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