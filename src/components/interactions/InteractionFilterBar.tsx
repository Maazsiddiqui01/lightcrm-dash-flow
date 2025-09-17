import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { ComboboxMulti } from '@/components/shared/ComboboxMulti';
import { RangeInput } from '@/components/shared/RangeInput';
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface InteractionFilters {
  source?: string[];
  organization?: string[];
  dateStart?: string;
  dateEnd?: string;
  search?: string;
  [key: string]: any;
}

interface InteractionFilterBarProps {
  filters: InteractionFilters;
  onFiltersChange: (filters: InteractionFilters) => void;
  onClearFilters: () => void;
}

export function InteractionFilterBar({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: InteractionFilterBarProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.dateStart ? new Date(filters.dateStart) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.dateEnd ? new Date(filters.dateEnd) : undefined
  );

  // Static source options
  const sourceOptions = [
    { value: 'Email', label: 'Email' },
    { value: 'Meeting', label: 'Meeting' }
  ];

  // Static organization options (you can extend this with dynamic data)
  const organizationOptions = [
    { value: 'Internal', label: 'Internal' },
    { value: 'External', label: 'External' }
  ];

  const handleFilterChange = (key: keyof InteractionFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date);
      handleFilterChange('dateStart', date ? date.toISOString() : undefined);
    } else {
      setEndDate(date);
      handleFilterChange('dateEnd', date ? date.toISOString() : undefined);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== ''
  );

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-foreground">Search</label>
          <div className="relative">
            <Input
              placeholder="Search interactions..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent hover:text-destructive"
                onClick={() => handleFilterChange('search', '')}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Source */}
        <ComboboxMulti
          label="Source"
          options={sourceOptions}
          values={filters.source || []}
          onChange={(values) => handleFilterChange('source', values)}
          searchPlaceholder="Search Sources"
        />

        {/* Organization */}
        <ComboboxMulti
          label="Organization"
          options={organizationOptions}
          values={filters.organization || []}
          onChange={(values) => handleFilterChange('organization', values)}
          searchPlaceholder="Search Organizations"
        />

        {/* Date Range */}
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-foreground">Date Range</label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "MMM dd") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => handleDateChange('start', date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "MMM dd") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => handleDateChange('end', date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}