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
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Opportunities"
        description="Track sales opportunities and business development"
        actions={
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 touch-target">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Opportunity</span>
          </Button>
        }
      />
      
      <main className="flex-1">
        <div className="container-fluid py-4 lg:py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
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
          <div className="rounded-lg bg-card shadow-sm border border-border overflow-hidden">
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