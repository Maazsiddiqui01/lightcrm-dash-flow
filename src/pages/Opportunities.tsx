import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useOpportunityStats } from "@/hooks/useOpportunityStats";
import { Plus, Target, TrendingUp, CheckCircle, DollarSign } from "lucide-react";
import { useState } from "react";
import { AddOpportunityDialog } from "@/components/opportunities/AddOpportunityDialog";
import { ResponsivePageShell } from "@/components/layout/ResponsivePageShell";

export function Opportunities() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const stats = useOpportunityStats();

  return (
    <section className="h-full flex flex-col overflow-hidden">
      {/* Header Cards */}
      <div className="p-4 space-y-4">
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
      </div>

      <div className="mt-4 mx-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
        <OpportunitiesTable />
      </div>

      <AddOpportunityDialog 
        open={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
        onOpportunityAdded={() => {
          setIsAddDialogOpen(false);
        }} 
      />
    </section>
  );
}