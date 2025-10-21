import { ContactsTableWithErrorBoundary } from "@/components/contacts/ContactsTableWithErrorBoundary";
import { GroupContactsTable } from "@/components/contacts/GroupContactsTable";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useContactStats } from "@/hooks/useContactStats";
import { Plus, Users, Mail, Calendar, TrendingUp, Clock, AlertTriangle, TrendingDown, UserX, Sparkles, ListTree, Merge, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { SuggestGroupsModal } from "@/components/contacts/SuggestGroupsModal";
import { DuplicatesReviewModal } from "@/components/contacts/DuplicatesReviewModal";
import { ContactFilterBar } from "@/components/contacts/ContactFilterBar";
import { AIContactSearch } from "@/components/contacts/AIContactSearch";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import type { ContactFilters } from "@/types/contact";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useManualInteractionSync } from "@/hooks/useManualInteractionSync";


export function Contacts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSuggestGroupsOpen, setIsSuggestGroupsOpen] = useState(false);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [showOpportunityFilters, setShowOpportunityFilters] = useState(true);
  const [viewMode, setViewMode] = useState<'individual' | 'group'>('individual');
  const { syncNow, isSyncing } = useManualInteractionSync();
  
  const { filters, updateFilters, clearFilters } = useUrlFilters({
    focusAreas: [],
    sectors: [],
    areasOfSpecialization: [],
    organizations: [],
    titles: [],
    categories: [],
    deltaType: [],
    hasOpportunities: [],
    lgLead: [],
    groupContacts: [],
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

  // Stabilize filters object to prevent infinite re-renders
  const stableContactFilters: ContactFilters = useMemo(() => {
    const toArray = (v: any): string[] => Array.isArray(v) ? v : (v ? [String(v)] : []);
    return {
      ...filters,
      opportunityFilters: {
        tier: toArray(filters.opportunityTier),
        platformAddon: toArray(filters.opportunityPlatformAddon),
        ownershipType: toArray(filters.opportunityOwnershipType),
        status: toArray(filters.opportunityStatus),
        lgLead: toArray(filters.opportunityLgLead),
        dateRangeStart: filters.opportunityDateRangeStart as string,
        dateRangeEnd: filters.opportunityDateRangeEnd as string,
        ebitdaMin: getNumericValue(filters.opportunityEbitdaMin),
        ebitdaMax: getNumericValue(filters.opportunityEbitdaMax)
      }
    };
  }, [
    filters.focusAreas, filters.sectors, filters.areasOfSpecialization, filters.organizations,
    filters.titles, filters.categories, filters.deltaType, filters.hasOpportunities,
    filters.lgLead, filters.groupContacts,
    filters.mostRecentContactStart, filters.mostRecentContactEnd, filters.deltaMin, filters.deltaMax,
    filters.opportunityTier, filters.opportunityPlatformAddon, filters.opportunityOwnershipType,
    filters.opportunityStatus, filters.opportunityLgLead, filters.opportunityDateRangeStart,
    filters.opportunityDateRangeEnd, filters.opportunityEbitdaMin, filters.opportunityEbitdaMax
  ]);

  const stats = useContactStats(stableContactFilters);

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">Manage your professional contacts and relationships</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsDuplicatesOpen(true)} variant="outline" className="touch-target">
              <Merge className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Detect Duplicates</span>
            </Button>
            <Button onClick={() => setIsSuggestGroupsOpen(true)} variant="outline" className="touch-target">
              <Sparkles className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Suggest Groups</span>
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 touch-target">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Contact</span>
            </Button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'individual' | 'group')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Individual Contacts
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <ListTree className="h-4 w-4" />
              Group Contacts
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* AI Contact Search */}
        <AIContactSearch 
          onSearchResults={(query, aiFilters) => {
            // Update filters based on AI interpretation
            updateFilters({
              ...filters,
              ...aiFilters
            });
          }}
        />

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ContactFilterBar 
              filters={filters}
              onFiltersChange={updateFilters}
              onClearFilters={clearFilters}
              showOpportunityFilters={showOpportunityFilters}
            />
          </div>
          <Button 
            onClick={syncNow}
            variant="outline"
            disabled={isSyncing}
            className="touch-target shrink-0"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Interactions'}</span>
          </Button>
        </div>

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

        {/* Cadence KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-6">
          <StatsCard
            title="Contacts with Cadence Data"
            value={stats.loading ? "..." : stats.contactsWithCadenceData}
            icon={Clock}
          />
          <StatsCard
            title="Overdue Contacts"
            value={stats.loading ? "..." : stats.overdueContacts}
            icon={AlertTriangle}
          />
          <StatsCard
            title="Overdue Rate"
            value={stats.loading ? "..." : `${stats.overdueRate.toFixed(1)}%`}
            icon={TrendingDown}
          />
          <StatsCard
            title="Intentionally Skipped"
            value={stats.loading ? "..." : stats.intentionallySkippedContacts}
            subtitle="Excluded from overdue"
            icon={UserX}
          />
        </div>

        {/* Conditionally render table based on view mode */}
        {viewMode === 'individual' ? (
          <ContactsTableWithErrorBoundary 
            filters={stableContactFilters}
            onOpportunityColumnVisibilityChange={setShowOpportunityFilters}
          />
        ) : (
          <GroupContactsTable />
        )}

        <AddContactDialog 
          open={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)} 
          onContactAdded={() => {
            setIsAddDialogOpen(false);
          }} 
        />

        <SuggestGroupsModal
          open={isSuggestGroupsOpen}
          onOpenChange={setIsSuggestGroupsOpen}
        />

        <DuplicatesReviewModal
          open={isDuplicatesOpen}
          onOpenChange={setIsDuplicatesOpen}
        />
      </ResponsiveContainer>
    </div>
  );
}
