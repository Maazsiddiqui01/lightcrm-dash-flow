import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { OpportunityFilterBar } from "@/components/opportunities/OpportunityFilterBar";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useOpportunityStats } from "@/hooks/useOpportunityStats";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { Plus, Target, TrendingUp, Users, DollarSign } from "lucide-react";
import { useState } from "react";
import { AddOpportunityDialog } from "@/components/opportunities/AddOpportunityDialog";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";


export function Opportunities() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { filters: rawFilters, updateFilters: rawUpdateFilters, clearFilters } = useUrlFilters({
    focusArea: [],
    ownershipType: [],
    ebitdaMin: undefined,
    ebitdaMax: undefined,
    tier: [],
    status: [],
    sector: [],
    leads: [],
    platformAddOn: [],
    referralContacts: [],
    referralCompanies: [],
    dateOfOrigination: [],
    dealcloud: [],
    headquarters: []
  });

  // Type-safe filter conversion
  const filters = {
    focusArea: (rawFilters.focusArea as string[]) || [],
    ownershipType: (rawFilters.ownershipType as string[]) || [],
    ebitdaMin: typeof rawFilters.ebitdaMin === 'number' ? rawFilters.ebitdaMin : undefined,
    ebitdaMax: typeof rawFilters.ebitdaMax === 'number' ? rawFilters.ebitdaMax : undefined,
    tier: (rawFilters.tier as string[]) || [],
    status: (rawFilters.status as string[]) || [],
    sector: (rawFilters.sector as string[]) || [],
    leads: (rawFilters.leads as string[]) || [],
    platformAddOn: (rawFilters.platformAddOn as string[]) || [],
    referralContacts: (rawFilters.referralContacts as string[]) || [],
    referralCompanies: (rawFilters.referralCompanies as string[]) || [],
    dateOfOrigination: (rawFilters.dateOfOrigination as string[]) || [],
    dealcloud: (rawFilters.dealcloud as string[]) || [],
    headquarters: (rawFilters.headquarters as string[]) || []
  };

  const stats = useOpportunityStats(filters);

  const updateFilters = (newFilters: any) => {
    rawUpdateFilters(newFilters);
  };

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Opportunities</h1>
            <p className="text-muted-foreground">Track sales opportunities and business development</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 touch-target">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Opportunity</span>
          </Button>
        </div>

        {/* Filter Bar */}
        <OpportunityFilterBar 
          filters={filters}
          onFiltersChange={updateFilters}
          onClearFilters={clearFilters}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          <StatsCard
            title="Total Opportunities"
            value={stats.loading ? "..." : stats.totalOpportunities}
            icon={Target}
          />
          <StatsCard
            title="Active Deals"
            value={stats.loading ? "..." : stats.activeDeals}
            icon={TrendingUp}
          />
          <StatsCard
            title="% Family/Founder Owned"
            value={stats.loading ? "..." : stats.familyFounderPercentage}
            icon={Users}
          />
          <StatsCard
            title="Average EBITDA"
            value={stats.loading ? "..." : stats.averageEbitda}
            icon={DollarSign}
          />
        </div>

        <OpportunitiesTable filters={filters} />

        <AddOpportunityDialog 
          open={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)} 
          onOpportunityAdded={() => {
            setIsAddDialogOpen(false);
          }} 
        />
      </ResponsiveContainer>
    </div>
  );
}