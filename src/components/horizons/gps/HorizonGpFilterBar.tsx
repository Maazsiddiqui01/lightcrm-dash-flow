import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { ComboboxMulti } from '@/components/shared/ComboboxMulti';
import { RangeInput } from '@/components/shared/RangeInput';
import {
  useHorizonGpStates,
  useHorizonGpCities,
  useHorizonGpIndustrySectors,
  useHorizonLgRelationships,
} from '@/hooks/useHorizonDistinctOptions';

interface HorizonGpFilters {
  lgRelationship: string[];
  aumMin?: number;
  aumMax?: number;
  state: string[];
  city: string[];
  industrySector: string[];
  priority: string[];
}

interface HorizonGpFilterBarProps {
  filters: HorizonGpFilters;
  onFiltersChange: (filters: Partial<HorizonGpFilters>) => void;
  onClearFilters: () => void;
}

export function HorizonGpFilterBar({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: HorizonGpFilterBarProps) {
  const { data: states = [], isLoading: statesLoading } = useHorizonGpStates();
  const { data: cities = [], isLoading: citiesLoading } = useHorizonGpCities();
  const { data: industrySectors = [], isLoading: sectorsLoading } = useHorizonGpIndustrySectors();
  const { data: lgRelationships = [], isLoading: lgRelLoading } = useHorizonLgRelationships();

  const priorityOptions = [
    { value: '1', label: 'Priority 1' },
    { value: '2', label: 'Priority 2' },
    { value: '3', label: 'Priority 3' },
  ];

  const updateFilter = (key: keyof HorizonGpFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null
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

      {/* Reordered: Priority, LG Relationship, Industry/Sector Focus, AUM, City, State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <ComboboxMulti
          label="Priority"
          options={priorityOptions}
          values={filters.priority}
          onChange={(values) => updateFilter('priority', values)}
          searchPlaceholder="Select Priority"
        />

        <ComboboxMulti
          label="LG Relationship"
          options={lgRelationships}
          values={filters.lgRelationship}
          onChange={(values) => updateFilter('lgRelationship', values)}
          searchPlaceholder="Search LG Team"
          loading={lgRelLoading}
          specialOption={{ value: "NO_KNOWN_RELATIONSHIP", label: "No Known Relationship" }}
        />

        <ComboboxMulti
          label="Industry/Sector Focus"
          options={industrySectors}
          values={filters.industrySector}
          onChange={(values) => updateFilter('industrySector', values)}
          searchPlaceholder="Search Sectors"
          loading={sectorsLoading}
        />

        <RangeInput
          label="AUM"
          minValue={filters.aumMin}
          maxValue={filters.aumMax}
          onMinChange={(value) => updateFilter('aumMin', value)}
          onMaxChange={(value) => updateFilter('aumMax', value)}
          minPlaceholder="Min"
          maxPlaceholder="Max"
          step={1000000}
        />

        <ComboboxMulti
          label="City"
          options={cities}
          values={filters.city}
          onChange={(values) => updateFilter('city', values)}
          searchPlaceholder="Search Cities"
          loading={citiesLoading}
        />

        <ComboboxMulti
          label="State"
          options={states}
          values={filters.state}
          onChange={(values) => updateFilter('state', values)}
          searchPlaceholder="Search States"
          loading={statesLoading}
        />
      </div>
    </div>
  );
}
