import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { ComboboxMulti } from '@/components/shared/ComboboxMulti';
import { RangeInput } from '@/components/shared/RangeInput';
import {
  useHorizonCompanySectors,
  useHorizonCompanySubsectors,
  useHorizonProcessStatuses,
  useHorizonCompanyOwnerships,
  useHorizonCompanyStates,
  useHorizonCompanyCities,
  useHorizonCompanySources,
  useHorizonParentGps,
  useHorizonLgRelationships,
} from '@/hooks/useHorizonDistinctOptions';

interface HorizonCompanyFilters {
  sector: string[];
  subsector: string[];
  processStatus: string[];
  ownership: string[];
  priority: string[];
  lgRelationship: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  gpAumMin?: number;
  gpAumMax?: number;
  state: string[];
  city: string[];
  source: string[];
  parentGp: string[];
}

interface HorizonCompanyFilterBarProps {
  filters: HorizonCompanyFilters;
  onFiltersChange: (filters: Partial<HorizonCompanyFilters>) => void;
  onClearFilters: () => void;
}

export function HorizonCompanyFilterBar({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: HorizonCompanyFilterBarProps) {
  const { data: sectors = [], isLoading: sectorsLoading } = useHorizonCompanySectors();
  const { data: subsectors = [], isLoading: subsectorsLoading } = useHorizonCompanySubsectors();
  const { data: processStatuses = [], isLoading: statusesLoading } = useHorizonProcessStatuses();
  const { data: ownerships = [], isLoading: ownershipsLoading } = useHorizonCompanyOwnerships();
  const { data: states = [], isLoading: statesLoading } = useHorizonCompanyStates();
  const { data: cities = [], isLoading: citiesLoading } = useHorizonCompanyCities();
  const { data: sources = [], isLoading: sourcesLoading } = useHorizonCompanySources();
  const { data: parentGps = [], isLoading: parentGpsLoading } = useHorizonParentGps();
  const { data: lgRelationships = [], isLoading: lgRelLoading } = useHorizonLgRelationships();

  const priorityOptions = [
    { value: '1', label: 'Priority 1' },
    { value: '2', label: 'Priority 2' },
    { value: '3', label: 'Priority 3' },
  ];

  const updateFilter = (key: keyof HorizonCompanyFilters, value: any) => {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <ComboboxMulti
          label="Sector"
          options={sectors}
          values={filters.sector}
          onChange={(values) => updateFilter('sector', values)}
          searchPlaceholder="Search Sectors"
          loading={sectorsLoading}
        />

        <ComboboxMulti
          label="Subsector"
          options={subsectors}
          values={filters.subsector}
          onChange={(values) => updateFilter('subsector', values)}
          searchPlaceholder="Search Subsectors"
          loading={subsectorsLoading}
        />

        <ComboboxMulti
          label="Priority"
          options={priorityOptions}
          values={filters.priority}
          onChange={(values) => updateFilter('priority', values)}
          searchPlaceholder="Select Priority"
        />

        <ComboboxMulti
          label="Process Status"
          options={processStatuses}
          values={filters.processStatus}
          onChange={(values) => updateFilter('processStatus', values)}
          searchPlaceholder="Search Status"
          loading={statusesLoading}
        />

        <ComboboxMulti
          label="Ownership"
          options={ownerships}
          values={filters.ownership}
          onChange={(values) => updateFilter('ownership', values)}
          searchPlaceholder="Search Ownership"
          loading={ownershipsLoading}
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
          label="Parent/GP"
          options={parentGps}
          values={filters.parentGp}
          onChange={(values) => updateFilter('parentGp', values)}
          searchPlaceholder="Search GPs"
          loading={parentGpsLoading}
        />

        <RangeInput
          label="EBITDA ($M)"
          minValue={filters.ebitdaMin}
          maxValue={filters.ebitdaMax}
          onMinChange={(value) => updateFilter('ebitdaMin', value)}
          onMaxChange={(value) => updateFilter('ebitdaMax', value)}
          minPlaceholder="Min"
          maxPlaceholder="Max"
          step={1}
        />

        <RangeInput
          label="Revenue ($M)"
          minValue={filters.revenueMin}
          maxValue={filters.revenueMax}
          onMinChange={(value) => updateFilter('revenueMin', value)}
          onMaxChange={(value) => updateFilter('revenueMax', value)}
          minPlaceholder="Min"
          maxPlaceholder="Max"
          step={1}
        />

        <RangeInput
          label="GP AUM ($B)"
          minValue={filters.gpAumMin}
          maxValue={filters.gpAumMax}
          onMinChange={(value) => updateFilter('gpAumMin', value)}
          onMaxChange={(value) => updateFilter('gpAumMax', value)}
          minPlaceholder="Min"
          maxPlaceholder="Max"
          step={0.1}
        />

        <ComboboxMulti
          label="State"
          options={states}
          values={filters.state}
          onChange={(values) => updateFilter('state', values)}
          searchPlaceholder="Search States"
          loading={statesLoading}
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
          label="Source"
          options={sources}
          values={filters.source}
          onChange={(values) => updateFilter('source', values)}
          searchPlaceholder="Search Sources"
          loading={sourcesLoading}
        />
      </div>
    </div>
  );
}
