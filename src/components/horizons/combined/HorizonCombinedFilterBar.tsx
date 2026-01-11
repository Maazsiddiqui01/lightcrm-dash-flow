import { Button } from '@/components/ui/button';
import { RotateCcw, ChevronDown, ChevronUp, Building2, Users2 } from 'lucide-react';
import { ComboboxMulti } from '@/components/shared/ComboboxMulti';
import { RangeInput } from '@/components/shared/RangeInput';
import { DateRangeInput } from '@/components/shared/DateRangeInput';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  useHorizonGpStates,
  useHorizonGpCities,
  useHorizonGpIndustrySectors,
  useHorizonCombinedCities,
  useHorizonCombinedStates,
} from '@/hooks/useHorizonDistinctOptions';

export interface HorizonCombinedFilters {
  // Common filters
  priority: string[];
  lgRelationship: string[];
  // Combined location filters (filters both GP and Company)
  combinedCity: string[];
  combinedState: string[];
  // Company-specific
  sector: string[];
  subsector: string[];
  processStatus: string[];
  ownership: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  companyState: string[];
  companyCity: string[];
  source: string[];
  parentGp: string[];
  gpAumMin?: number;
  gpAumMax?: number;
  dateOfAcquisitionStart?: string;
  dateOfAcquisitionEnd?: string;
  // GP-specific
  industrySector: string[];
  aumMin?: number;
  aumMax?: number;
  gpState: string[];
  gpCity: string[];
}

interface HorizonCombinedFilterBarProps {
  filters: HorizonCombinedFilters;
  onFiltersChange: (filters: Partial<HorizonCombinedFilters>) => void;
  onClearFilters: () => void;
}

export function HorizonCombinedFilterBar({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: HorizonCombinedFilterBarProps) {
  const [gpFiltersOpen, setGpFiltersOpen] = useState(true);
  const [companyFiltersOpen, setCompanyFiltersOpen] = useState(true);

  // Company filter options
  const { data: sectors = [], isLoading: sectorsLoading } = useHorizonCompanySectors();
  const { data: subsectors = [], isLoading: subsectorsLoading } = useHorizonCompanySubsectors();
  const { data: rawProcessStatuses = [], isLoading: statusesLoading } = useHorizonProcessStatuses();
  const { data: ownerships = [], isLoading: ownershipsLoading } = useHorizonCompanyOwnerships();
  const { data: companyStates = [], isLoading: companyStatesLoading } = useHorizonCompanyStates();
  const { data: companyCities = [], isLoading: companyCitiesLoading } = useHorizonCompanyCities();
  const { data: sources = [], isLoading: sourcesLoading } = useHorizonCompanySources();
  const { data: parentGps = [], isLoading: parentGpsLoading } = useHorizonParentGps();
  const { data: lgRelationships = [], isLoading: lgRelLoading } = useHorizonLgRelationships();

  // GP filter options
  const { data: gpStates = [], isLoading: gpStatesLoading } = useHorizonGpStates();
  const { data: gpCities = [], isLoading: gpCitiesLoading } = useHorizonGpCities();
  const { data: industrySectors = [], isLoading: industrySectorsLoading } = useHorizonGpIndustrySectors();

  // Combined location options (merges GP and Company values)
  const { data: combinedCities = [], isLoading: combinedCitiesLoading } = useHorizonCombinedCities();
  const { data: combinedStates = [], isLoading: combinedStatesLoading } = useHorizonCombinedStates();

  // Filter out "No Known Process" from process statuses
  const processStatuses = rawProcessStatuses.filter(
    status => status.value?.toLowerCase() !== 'no known process'
  );

  const priorityOptions = [
    { value: '1', label: 'Priority 1' },
    { value: '2', label: 'Priority 2' },
    { value: '3', label: 'Priority 3' },
  ];

  const updateFilter = (key: keyof HorizonCombinedFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null
  );

  // Count active combined location filters (with null safety)
  const combinedLocationFilterCount = [
    filters.combinedCity,
    filters.combinedState,
  ].filter(arr => arr && arr.length > 0).length;

  // Count active company-specific filters
  const companyFilterCount = [
    filters.sector,
    filters.subsector,
    filters.processStatus,
    filters.ownership,
    filters.companyState,
    filters.companyCity,
    filters.source,
    filters.parentGp,
  ].filter(arr => arr.length > 0).length + 
    (filters.ebitdaMin != null || filters.ebitdaMax != null ? 1 : 0) +
    (filters.revenueMin != null || filters.revenueMax != null ? 1 : 0) +
    (filters.gpAumMin != null || filters.gpAumMax != null ? 1 : 0) +
    (filters.dateOfAcquisitionStart != null || filters.dateOfAcquisitionEnd != null ? 1 : 0);

  // Count active GP-specific filters (removed Active Funds and Active Holdings)
  const gpFilterCount = [
    filters.industrySector,
    filters.gpState,
    filters.gpCity,
  ].filter(arr => arr.length > 0).length +
    (filters.aumMin != null || filters.aumMax != null ? 1 : 0);

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

      {/* Common Filters - Always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          label="City (GP & Company)"
          options={combinedCities}
          values={filters.combinedCity}
          onChange={(values) => updateFilter('combinedCity', values)}
          searchPlaceholder="Search Cities"
          loading={combinedCitiesLoading}
        />

        <ComboboxMulti
          label="State (GP & Company)"
          options={combinedStates}
          values={filters.combinedState}
          onChange={(values) => updateFilter('combinedState', values)}
          searchPlaceholder="Search States"
          loading={combinedStatesLoading}
        />
      </div>

      {/* GP-Specific Filters - Collapsible (MOVED ABOVE Company Filters) */}
      <Collapsible open={gpFiltersOpen} onOpenChange={setGpFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "w-full justify-between h-8 px-2",
              gpFilterCount > 0 && "text-primary"
            )}
          >
            <span className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              GP Filters
              {gpFilterCount > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">
                  {gpFilterCount}
                </span>
              )}
            </span>
            {gpFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <ComboboxMulti
              label="GP Industry/Sector Focus"
              options={industrySectors}
              values={filters.industrySector}
              onChange={(values) => updateFilter('industrySector', values)}
              searchPlaceholder="Search Sectors"
              loading={industrySectorsLoading}
            />

            <RangeInput
              label="GP AUM"
              minValue={filters.aumMin}
              maxValue={filters.aumMax}
              onMinChange={(value) => updateFilter('aumMin', value)}
              onMaxChange={(value) => updateFilter('aumMax', value)}
              minPlaceholder="Min"
              maxPlaceholder="Max"
              step={1000000}
            />

            <ComboboxMulti
              label="GP City"
              options={gpCities}
              values={filters.gpCity}
              onChange={(values) => updateFilter('gpCity', values)}
              searchPlaceholder="Search Cities"
              loading={gpCitiesLoading}
            />

            <ComboboxMulti
              label="GP State"
              options={gpStates}
              values={filters.gpState}
              onChange={(values) => updateFilter('gpState', values)}
              searchPlaceholder="Search States"
              loading={gpStatesLoading}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Company-Specific Filters - Collapsible */}
      <Collapsible open={companyFiltersOpen} onOpenChange={setCompanyFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "w-full justify-between h-8 px-2",
              companyFilterCount > 0 && "text-primary"
            )}
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Filters
              {companyFilterCount > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">
                  {companyFilterCount}
                </span>
              )}
            </span>
            {companyFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <ComboboxMulti
              label="Company Sector"
              options={sectors}
              values={filters.sector}
              onChange={(values) => updateFilter('sector', values)}
              searchPlaceholder="Search Sectors"
              loading={sectorsLoading}
            />

            <ComboboxMulti
              label="Company Subsector"
              options={subsectors}
              values={filters.subsector}
              onChange={(values) => updateFilter('subsector', values)}
              searchPlaceholder="Search Subsectors"
              loading={subsectorsLoading}
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
              label="Parent/GP"
              options={parentGps}
              values={filters.parentGp}
              onChange={(values) => updateFilter('parentGp', values)}
              searchPlaceholder="Search GPs"
              loading={parentGpsLoading}
            />

            <RangeInput
              label="EBITDA"
              minValue={filters.ebitdaMin}
              maxValue={filters.ebitdaMax}
              onMinChange={(value) => updateFilter('ebitdaMin', value)}
              onMaxChange={(value) => updateFilter('ebitdaMax', value)}
              minPlaceholder="Min"
              maxPlaceholder="Max"
              step={1000000}
            />

            <RangeInput
              label="Revenue"
              minValue={filters.revenueMin}
              maxValue={filters.revenueMax}
              onMinChange={(value) => updateFilter('revenueMin', value)}
              onMaxChange={(value) => updateFilter('revenueMax', value)}
              minPlaceholder="Min"
              maxPlaceholder="Max"
              step={1000000}
            />

            <RangeInput
              label="Company GP AUM"
              minValue={filters.gpAumMin}
              maxValue={filters.gpAumMax}
              onMinChange={(value) => updateFilter('gpAumMin', value)}
              onMaxChange={(value) => updateFilter('gpAumMax', value)}
              minPlaceholder="Min"
              maxPlaceholder="Max"
              step={1000000}
            />

            <ComboboxMulti
              label="Company City"
              options={companyCities}
              values={filters.companyCity}
              onChange={(values) => updateFilter('companyCity', values)}
              searchPlaceholder="Search Cities"
              loading={companyCitiesLoading}
            />

            <ComboboxMulti
              label="Company State"
              options={companyStates}
              values={filters.companyState}
              onChange={(values) => updateFilter('companyState', values)}
              searchPlaceholder="Search States"
              loading={companyStatesLoading}
            />

            <ComboboxMulti
              label="Source of Data"
              options={sources}
              values={filters.source}
              onChange={(values) => updateFilter('source', values)}
              searchPlaceholder="Search Sources"
              loading={sourcesLoading}
            />

            <DateRangeInput
              label="Date of Acquisition"
              startDate={filters.dateOfAcquisitionStart ? new Date(filters.dateOfAcquisitionStart) : undefined}
              endDate={filters.dateOfAcquisitionEnd ? new Date(filters.dateOfAcquisitionEnd) : undefined}
              onStartDateChange={(date) => updateFilter('dateOfAcquisitionStart', date?.toISOString().split('T')[0])}
              onEndDateChange={(date) => updateFilter('dateOfAcquisitionEnd', date?.toISOString().split('T')[0])}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
