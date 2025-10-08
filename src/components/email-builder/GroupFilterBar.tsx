import { ContactFilterBar } from '@/components/contacts/ContactFilterBar';
import type { FilterValues } from '@/types/groupEmailBuilder';

interface GroupFilterBarProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
}

export function GroupFilterBar({ filters, onFiltersChange, onClearFilters }: GroupFilterBarProps) {
  // 100% reuse the ContactFilterBar component
  return (
    <ContactFilterBar
      filters={filters}
      onFiltersChange={onFiltersChange}
      onClearFilters={onClearFilters}
      showOpportunityFilters={false}
    />
  );
}
