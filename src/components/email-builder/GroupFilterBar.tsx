import { ContactFilterBar } from '@/components/contacts/ContactFilterBar';
import type { FilterValues } from '@/types/groupEmailBuilder';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface GroupFilterBarProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
}

export function GroupFilterBar({ filters, onFiltersChange, onClearFilters }: GroupFilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Quick Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email, or organization..."
            value={filters.searchTerm || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
            className="pl-9"
          />
        </div>
        {filters.searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ ...filters, searchTerm: '' })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Existing ContactFilterBar */}
      <ContactFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
        showOpportunityFilters={false}
      />
    </div>
  );
}
