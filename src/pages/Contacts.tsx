import { ContactsTable } from "@/components/contacts/ContactsTable";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useContactStats } from "@/hooks/useContactStats";
import { Plus, Users, Mail, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { ContactFilterBar } from "@/components/contacts/ContactFilterBar";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";


export function Contacts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showOpportunityFilters, setShowOpportunityFilters] = useState(true);
  
  const { filters, updateFilters, clearFilters } = useUrlFilters({
    focusAreas: [],
    sectors: [],
    areasOfSpecialization: [],
    organizations: [],
    titles: [],
    categories: [],
    deltaType: [],
    hasOpportunities: [],
    mostRecentContactStart: null,
    mostRecentContactEnd: null,
    deltaMin: null,
    deltaMax: null,
    opportunityTier: [],
    opportunityPlatformAddon: [],
    opportunityOwnershipType: [],
    opportunityStatus: [],
    opportunityLgLead: [],
    opportunityDateRangeStart: null,
    opportunityDateRangeEnd: null,
    opportunityEbitdaMin: null,
    opportunityEbitdaMax: null
  });

  // Helper function to extract numeric value from filter
  const getNumericValue = (filterValue: any): number | undefined => {
    if (!filterValue) return undefined;
    if (typeof filterValue === 'number') return filterValue;
    if (typeof filterValue === 'object' && 'value' in filterValue) {
      return filterValue.value;
    }
    return undefined;
  };

  const stats = useContactStats({
    ...filters,
    opportunityFilters: {
      tier: (filters.opportunityTier as string[]) || [],
      platformAddon: (filters.opportunityPlatformAddon as string[]) || [],
      ownershipType: (filters.opportunityOwnershipType as string[]) || [],
      status: (filters.opportunityStatus as string[]) || [],
      lgLead: (filters.opportunityLgLead as string[]) || [],
      dateRangeStart: filters.opportunityDateRangeStart as string,
      dateRangeEnd: filters.opportunityDateRangeEnd as string,
      ebitdaMin: getNumericValue(filters.opportunityEbitdaMin),
      ebitdaMax: getNumericValue(filters.opportunityEbitdaMax)
    }
  });

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">Manage your professional contacts and relationships</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 touch-target">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Contact</span>
          </Button>
        </div>

        {/* Filters */}
        <ContactFilterBar 
          filters={filters}
          onFiltersChange={updateFilters}
          onClearFilters={clearFilters}
          showOpportunityFilters={showOpportunityFilters}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          <StatsCard
            title="Total Contacts"
            value={stats.loading ? "..." : stats.totalContacts}
            icon={Users}
          />
          <StatsCard
            title="Active Contacts"
            value={stats.loading ? "..." : stats.activeContacts}
            subtitle="Last 90 days"
            icon={TrendingUp}
          />
          <StatsCard
            title="Emails Sent"
            value={stats.loading ? "..." : stats.totalEmails}
            icon={Mail}
          />
          <StatsCard
            title="Meetings Logged"
            value={stats.loading ? "..." : stats.totalMeetings}
            icon={Calendar}
          />
        </div>

        <ContactsTable 
          filters={{
            ...filters,
            opportunityFilters: {
              tier: (filters.opportunityTier as string[]) || [],
              platformAddon: (filters.opportunityPlatformAddon as string[]) || [],
              ownershipType: (filters.opportunityOwnershipType as string[]) || [],
              status: (filters.opportunityStatus as string[]) || [],
              lgLead: (filters.opportunityLgLead as string[]) || [],
              dateRangeStart: filters.opportunityDateRangeStart as string,
              dateRangeEnd: filters.opportunityDateRangeEnd as string,
              ebitdaMin: getNumericValue(filters.opportunityEbitdaMin),
              ebitdaMax: getNumericValue(filters.opportunityEbitdaMax)
            }
          }}
          onOpportunityColumnVisibilityChange={setShowOpportunityFilters}
        />

        <AddContactDialog 
          open={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)} 
          onContactAdded={() => {
            setIsAddDialogOpen(false);
          }} 
        />
      </ResponsiveContainer>
    </div>
  );
}