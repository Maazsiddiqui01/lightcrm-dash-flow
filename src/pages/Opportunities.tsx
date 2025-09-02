import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useOpportunityStats } from "@/hooks/useOpportunityStats";
import { Plus, Target, TrendingUp, CheckCircle, DollarSign } from "lucide-react";
import { useState } from "react";
import { AddOpportunityDialog } from "@/components/opportunities/AddOpportunityDialog";

export function Opportunities() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const stats = useOpportunityStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Opportunities"
        description="Track sales opportunities and business development"
        actions={
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Button>
        }
      />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              title="Closed Won"
              value={stats.loading ? "..." : stats.closedWon}
              icon={CheckCircle}
            />
            <StatsCard
              title="Pipeline Value"
              value={stats.loading ? "..." : stats.pipelineValue}
              icon={DollarSign}
            />
          </div>

          {/* Opportunities Table */}
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <OpportunitiesTable />
          </div>
        </div>
      </main>

      <AddOpportunityDialog 
        open={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
        onOpportunityAdded={() => {
          setIsAddDialogOpen(false);
        }} 
      />
    </div>
  );
}