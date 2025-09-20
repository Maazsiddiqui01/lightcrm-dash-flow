import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { ComboboxMulti } from '@/components/shared/ComboboxMulti';
import { RangeInput } from '@/components/shared/RangeInput';
import {
  useOpportunityOwnershipTypes,
  useOpportunityStatuses,
  useOpportunityLeads,
  useOpportunityPlatformAddOn,
  useOpportunityReferralContacts,
  useOpportunityReferralCompanies,
  useOpportunityDatesOfOrigination,
  useOpportunityHeadquarters
} from '@/hooks/useDistinctOptions';
import { useSectors } from '@/hooks/useLookups';
import { useEnhancedFocusAreas } from '@/hooks/useEnhancedFocusAreas';
import { tierOptions } from '@/lib/export/opportunityUtils';

interface OpportunityFilters {
  focusArea: string[];
  ownershipType: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  tier: string[];
  status: string[];
  sector: string[];
  leads: string[];
  platformAddOn: string[];
  referralContacts: string[];
  referralCompanies: string[];
  dateOfOrigination: string[];
  dealcloud?: string[];
  headquarters: string[];
  [key: string]: any;
}

interface OpportunityFilterBarProps {
  filters: OpportunityFilters;
  onFiltersChange: (filters: OpportunityFilters) => void;
  onClearFilters: () => void;
}

export function OpportunityFilterBar({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: OpportunityFilterBarProps) {
  // Use canonical lookup options
  const sectorsQuery = useSectors();
  const focusAreasQuery = useEnhancedFocusAreas();
  
  const focusAreas = (focusAreasQuery.data || []).map(item => ({ value: item.id, label: item.label }));
  const sectors = sectorsQuery.data || [];

  // Use existing hooks for other options
  const { data: ownershipTypes = [], isLoading: ownershipLoading } = useOpportunityOwnershipTypes();
  const tiers = tierOptions.map(value => ({ value, label: value }));
  const { data: statuses = [], isLoading: statusesLoading } = useOpportunityStatuses();
  const { data: leads = [], isLoading: leadsLoading } = useOpportunityLeads();
  const { data: platformAddOns = [], isLoading: platformLoading } = useOpportunityPlatformAddOn();
  const { data: referralContacts = [], isLoading: referralContactsLoading } = useOpportunityReferralContacts();
  const { data: referralCompanies = [], isLoading: referralCompaniesLoading } = useOpportunityReferralCompanies();
  const { data: dateOrigins = [], isLoading: dateOriginsLoading } = useOpportunityDatesOfOrigination();
  const { data: headquarters = [], isLoading: headquartersLoading } = useOpportunityHeadquarters();

  // Dealcloud options (static)
  const dealcloudOptions = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' }
  ];

  const updateFilter = (key: keyof OpportunityFilters, value: any) => {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ComboboxMulti
          label="LG Sector"
          options={sectors}
          values={filters.sector}
          onChange={(values) => updateFilter('sector', values)}
          searchPlaceholder="Search Sectors"
          loading={sectorsQuery.isLoading}
        />

        <ComboboxMulti
          label="LG Focus Area"
          options={focusAreas}
          values={filters.focusArea}
          onChange={(values) => updateFilter('focusArea', values)}
          searchPlaceholder="Search Focus Areas"
          loading={focusAreasQuery.isLoading}
        />

        <ComboboxMulti
          label="Status"
          options={statuses}
          values={filters.status}
          onChange={(values) => updateFilter('status', values)}
          searchPlaceholder="Search Statuses"
          loading={statusesLoading}
        />

        <ComboboxMulti
          label="Tier"
          options={tiers}
          values={filters.tier}
          onChange={(values) => updateFilter('tier', values)}
          searchPlaceholder="Search Tiers"
        />

        <ComboboxMulti
          label="Ownership Type"
          options={ownershipTypes}
          values={filters.ownershipType}
          onChange={(values) => updateFilter('ownershipType', values)}
          searchPlaceholder="Search Ownership Types"
          loading={ownershipLoading}
        />

        <ComboboxMulti
          label="LG Lead"
          options={leads}
          values={filters.leads}
          onChange={(values) => updateFilter('leads', values)}
          searchPlaceholder="Search LG Leads"
          loading={leadsLoading}
        />

        <ComboboxMulti
          label="Platform/Add-On"
          options={platformAddOns}
          values={filters.platformAddOn}
          onChange={(values) => updateFilter('platformAddOn', values)}
          searchPlaceholder="Search Platform/Add-On"
          loading={platformLoading}
        />

        <ComboboxMulti
          label="Referral Source (Contact)"
          options={referralContacts}
          values={filters.referralContacts}
          onChange={(values) => updateFilter('referralContacts', values)}
          searchPlaceholder="Search Referral Contacts"
          loading={referralContactsLoading}
        />

        <ComboboxMulti
          label="Investment Bank Source"
          options={referralCompanies}
          values={filters.referralCompanies}
          onChange={(values) => updateFilter('referralCompanies', values)}
          searchPlaceholder="Search Companies"
          loading={referralCompaniesLoading}
        />

        <ComboboxMulti
          label="Date of Origination"
          options={dateOrigins}
          values={filters.dateOfOrigination}
          onChange={(values) => updateFilter('dateOfOrigination', values)}
          searchPlaceholder="Search Dates"
          loading={dateOriginsLoading}
        />

        <RangeInput
          label="EBITDA"
          minValue={filters.ebitdaMin}
          maxValue={filters.ebitdaMax}
          onMinChange={(value) => updateFilter('ebitdaMin', value)}
          onMaxChange={(value) => updateFilter('ebitdaMax', value)}
          minPlaceholder="Min EBITDA"
          maxPlaceholder="Max EBITDA"
          step={0.1}
        />

        <ComboboxMulti
          label="Dealcloud"
          options={dealcloudOptions}
          values={filters.dealcloud || []}
          onChange={(values) => updateFilter('dealcloud', values)}
          searchPlaceholder="Select Dealcloud"
        />

        <ComboboxMulti
          label="Headquarters"
          options={headquarters}
          values={filters.headquarters}
          onChange={(values) => updateFilter('headquarters', values)}
          searchPlaceholder="Search Headquarters"
          loading={headquartersLoading}
        />
      </div>
    </div>
  );
}