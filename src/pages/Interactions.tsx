import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { InteractionFilterBar } from "@/components/interactions/InteractionFilterBar";
import { StatsCard } from "@/components/shared/StatsCard";
import { useInteractionStats } from "@/hooks/useInteractionStats";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { MessageSquare, Mail, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { CollapsibleFilter } from "@/components/shared/CollapsibleFilter";
import { MobileStatsGrid } from "@/components/shared/MobileStatsGrid";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function Interactions() {
  return (
    <PageErrorBoundary pageName="Interactions">
      <InteractionsContent />
    </PageErrorBoundary>
  );
}

function InteractionsContent() {
  const stats = useInteractionStats();
  const { filters, updateFilters, clearFilters } = useUrlFilters();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden">
      <section className="container-fluid flex flex-col gap-6 py-6">
        <div className="space-y-4">
          <div>
            <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>Interactions</h1>
            {!isMobile && <p className="text-muted-foreground">View communication history and touchpoints</p>}
          </div>
          
          <MobileStatsGrid>
            <StatsCard title="Total Interactions" value={stats.loading ? "..." : stats.totalInteractions} icon={MessageSquare} />
            <StatsCard title="Emails" value={stats.loading ? "..." : stats.totalEmails} icon={Mail} />
            <StatsCard title="Meetings" value={stats.loading ? "..." : stats.totalMeetings} icon={Calendar} />
            <StatsCard title="Last Interaction" value={stats.loading ? "..." : stats.lastInteractionDate} icon={Clock} />
          </MobileStatsGrid>
        </div>

        <CollapsibleFilter activeCount={Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : v).length}>
          <InteractionFilterBar filters={filters} onFiltersChange={updateFilters} onClearFilters={clearFilters} />
        </CollapsibleFilter>

        <InteractionsTable />
      </section>
    </div>
  );
}