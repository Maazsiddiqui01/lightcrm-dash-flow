import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ComboboxMulti } from '@/components/shared/ComboboxMulti';
import { RangeInput } from '@/components/shared/RangeInput';
import { Input } from '@/components/ui/input';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  useContactCategories,
  useContactOrganizations,
  useContactTitles,
  useContactAreasOfSpecialization,
  useOpportunityTiers,
  useOpportunityPlatformAddOn,
  useOpportunityOwnershipTypes,
  useOpportunityStatuses,
  useOpportunityLeads
} from '@/hooks/useDistinctOptions';
import { useSectors } from '@/hooks/useLookups';
import { useEnhancedFocusAreas } from '@/hooks/useEnhancedFocusAreas';

interface ContactFilterBarProps {
  filters: {
    focusAreas?: string[];
    sectors?: string[];
    areasOfSpecialization?: string[];
    mostRecentContactStart?: string;
    mostRecentContactEnd?: string;
    deltaType?: string[];
    deltaMin?: number;
    deltaMax?: number;
    organizations?: string[];
    titles?: string[];
    categories?: string[];
    hasOpportunities?: string[];
    lgLead?: string[];
    opportunityTier?: string[];
    opportunityPlatformAddon?: string[];
    opportunityOwnershipType?: string[];
    opportunityStatus?: string[];
    opportunityLgLead?: string[];
    opportunityDateRangeStart?: string;
    opportunityDateRangeEnd?: string;
    opportunityEbitdaMin?: number;
    opportunityEbitdaMax?: number;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  showOpportunityFilters?: boolean;
}

export function ContactFilterBar({ filters, onFiltersChange, onClearFilters, showOpportunityFilters = false }: ContactFilterBarProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.mostRecentContactStart ? new Date(filters.mostRecentContactStart) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.mostRecentContactEnd ? new Date(filters.mostRecentContactEnd) : undefined
  );
  const [oppStartDate, setOppStartDate] = useState<Date | undefined>(
    filters.opportunityDateRangeStart ? new Date(filters.opportunityDateRangeStart) : undefined
  );
  const [oppEndDate, setOppEndDate] = useState<Date | undefined>(
    filters.opportunityDateRangeEnd ? new Date(filters.opportunityDateRangeEnd) : undefined
  );

  // Use canonical lookup options
  const sectorsQuery = useSectors();
  const focusAreasQuery = useEnhancedFocusAreas();

  const sectorOptions = sectorsQuery.data || [];
  const focusAreaOptions = (focusAreasQuery.data || []).map(item => ({
    value: item.id,
    label: item.label
  }));

  // Fetch distinct options for contact filters
  const { data: specializationOptions = [], isLoading: specializationsLoading } = useContactAreasOfSpecialization();
  const { data: organizationOptions = [], isLoading: organizationsLoading } = useContactOrganizations();
  const { data: titleOptions = [], isLoading: titlesLoading } = useContactTitles();
  const { data: categoryOptions = [], isLoading: categoriesLoading } = useContactCategories();

  // Fetch distinct options for opportunity filters
  const { data: tierOptions = [], isLoading: tiersLoading } = useOpportunityTiers();
  const { data: platformAddonOptions = [], isLoading: platformAddonsLoading } = useOpportunityPlatformAddOn();
  const { data: ownershipTypeOptions = [], isLoading: ownershipTypesLoading } = useOpportunityOwnershipTypes();
  const { data: statusOptions = [], isLoading: statusLoading } = useOpportunityStatuses();
  const { data: lgLeadOptions = [], isLoading: lgLeadsLoading } = useOpportunityLeads();

  // Delta type options (static)
  const deltaTypeOptions = [
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Email', label: 'Email' }
  ];

  // Has opportunities options (static)
  const hasOpportunitiesOptions = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' }
  ];

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleOpportunityFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [`opportunity${key.charAt(0).toUpperCase() + key.slice(1)}`]: value
    });
  };

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date);
      handleFilterChange('mostRecentContactStart', date ? date.toISOString() : undefined);
    } else {
      setEndDate(date);
      handleFilterChange('mostRecentContactEnd', date ? date.toISOString() : undefined);
    }
  };

  const handleOppDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setOppStartDate(date);
      handleFilterChange('opportunityDateRangeStart', date ? date.toISOString() : undefined);
    } else {
      setOppEndDate(date);
      handleFilterChange('opportunityDateRangeEnd', date ? date.toISOString() : undefined);
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
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* LG Sector */}
        <ComboboxMulti
          label="LG Sector"
          options={sectorOptions}
          values={filters.sectors || []}
          onChange={(values) => handleFilterChange('sectors', values)}
          searchPlaceholder="Search Sectors"
          loading={sectorsQuery.isLoading}
        />

        {/* LG Focus Areas */}
        <ComboboxMulti
          label="LG Focus Areas"
          options={focusAreaOptions}
          values={filters.focusAreas || []}
          onChange={(values) => handleFilterChange('focusAreas', values)}
          searchPlaceholder="Search Focus Areas"
          loading={focusAreasQuery.isLoading}
        />

        {/* Areas of Specialization */}
        <ComboboxMulti
          label="Areas of Specialization"
          options={specializationOptions}
          values={filters.areasOfSpecialization || []}
          onChange={(values) => handleFilterChange('areasOfSpecialization', values)}
          searchPlaceholder="Search Specializations"
          loading={specializationsLoading}
        />

        {/* Organizations */}
        <ComboboxMulti
          label="Organization"
          options={organizationOptions}
          values={filters.organizations || []}
          onChange={(values) => handleFilterChange('organizations', values)}
          searchPlaceholder="Search Organizations"
          loading={organizationsLoading}
        />

        {/* Titles */}
        <ComboboxMulti
          label="Title"
          options={titleOptions}
          values={filters.titles || []}
          onChange={(values) => handleFilterChange('titles', values)}
          searchPlaceholder="Search Titles"
          loading={titlesLoading}
        />

        {/* Categories */}
        <ComboboxMulti
          label="Category"
          options={categoryOptions}
          values={filters.categories || []}
          onChange={(values) => handleFilterChange('categories', values)}
          searchPlaceholder="Search Categories"
          loading={categoriesLoading}
        />

        {/* Delta Type (Outreach Type) */}
        <ComboboxMulti
          label="Outreach Type"
          options={deltaTypeOptions}
          values={filters.deltaType || []}
          onChange={(values) => handleFilterChange('deltaType', values)}
          searchPlaceholder="Select Cadence Type"
        />

        {/* Has Opportunities */}
        <ComboboxMulti
          label="Sourced Opportunities"
          options={hasOpportunitiesOptions}
          values={filters.hasOpportunities || []}
          onChange={(values) => handleFilterChange('hasOpportunities', values)}
          searchPlaceholder="Select Option"
        />

        {/* Most Recent Contact Date Range */}
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-foreground">Most Recent Contact</label>
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
                  {startDate ? format(startDate, "PPP") : "From"}
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
                  {endDate ? format(endDate, "PPP") : "To"}
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

        {/* LG Lead */}
        <ComboboxMulti
          label="LG Lead"
          options={lgLeadOptions}
          values={filters.lgLead || []}
          onChange={(values) => handleFilterChange('lgLead', values)}
          searchPlaceholder="Search LG Leads"
          loading={lgLeadsLoading}
        />

        {/* Delta Days Range (Max Lag Days) */}
        <RangeInput
          label="Max Lag (Days)"
          minValue={filters.deltaMin}
          maxValue={filters.deltaMax}
          onMinChange={(value) => handleFilterChange('deltaMin', value)}
          onMaxChange={(value) => handleFilterChange('deltaMax', value)}
          minPlaceholder="Min days"
          maxPlaceholder="Max days"
          step={1}
        />
      </div>

      {/* Opportunity Filters Section - Only show when opportunities column is visible */}
      {showOpportunityFilters && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Opportunity Filters</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Tier */}
          <ComboboxMulti
            label="Tier"
            options={tierOptions}
            values={filters.opportunityTier || []}
            onChange={(values) => handleOpportunityFilterChange('tier', values)}
            searchPlaceholder="Search Tiers"
            loading={tiersLoading}
          />

          {/* Platform Add-on */}
          <ComboboxMulti
            label="Platform Add-on"
            options={platformAddonOptions}
            values={filters.opportunityPlatformAddon || []}
            onChange={(values) => handleOpportunityFilterChange('platformAddon', values)}
            searchPlaceholder="Search Platform Add-ons"
            loading={platformAddonsLoading}
          />

          {/* Ownership Type */}
          <ComboboxMulti
            label="Ownership Type"
            options={ownershipTypeOptions}
            values={filters.opportunityOwnershipType || []}
            onChange={(values) => handleOpportunityFilterChange('ownershipType', values)}
            searchPlaceholder="Search Ownership Types"
            loading={ownershipTypesLoading}
          />

          {/* Status */}
          <ComboboxMulti
            label="Status"
            options={statusOptions}
            values={filters.opportunityStatus || []}
            onChange={(values) => handleOpportunityFilterChange('status', values)}
            searchPlaceholder="Search Status"
            loading={statusLoading}
          />

          {/* LG Lead */}
          <ComboboxMulti
            label="LG Lead"
            options={lgLeadOptions}
            values={filters.opportunityLgLead || []}
            onChange={(values) => handleOpportunityFilterChange('lgLead', values)}
            searchPlaceholder="Search LG Leads"
            loading={lgLeadsLoading}
          />

          {/* EBITDA Range */}
          <RangeInput
            label="EBITDA (M$)"
            minValue={filters.opportunityEbitdaMin}
            maxValue={filters.opportunityEbitdaMax}
            onMinChange={(value) => handleOpportunityFilterChange('ebitdaMin', value)}
            onMaxChange={(value) => handleOpportunityFilterChange('ebitdaMax', value)}
            minPlaceholder="Min M$"
            maxPlaceholder="Max M$"
            step={0.1}
          />

          {/* Opportunity Date Range */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-foreground">Opportunity Date Range</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !oppStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {oppStartDate ? format(oppStartDate, "PPP") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={oppStartDate}
                    onSelect={(date) => handleOppDateChange('start', date)}
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
                      !oppEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {oppEndDate ? format(oppEndDate, "PPP") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={oppEndDate}
                    onSelect={(date) => handleOppDateChange('end', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}