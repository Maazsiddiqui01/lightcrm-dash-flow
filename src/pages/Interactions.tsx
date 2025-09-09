import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { useInteractionStats } from "@/hooks/useInteractionStats";
import { MessageSquare, Mail, Calendar, Clock } from "lucide-react";
import { ResponsivePageShell } from "@/components/layout/ResponsivePageShell";

export function Interactions() {
  const stats = useInteractionStats();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Interactions"
        description="View communication history and touchpoints"
      />
      
      <ResponsivePageShell headerHeight={120}>
        <div className="container-fluid p-4 lg:p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <StatsCard
              title="Total Interactions"
              value={stats.loading ? "..." : stats.totalInteractions}
              icon={MessageSquare}
            />
            <StatsCard
              title="Emails"
              value={stats.loading ? "..." : stats.totalEmails}
              icon={Mail}
            />
            <StatsCard
              title="Meetings"
              value={stats.loading ? "..." : stats.totalMeetings}
              icon={Calendar}
            />
            <StatsCard
              title="Last Interaction"
              value={stats.loading ? "..." : stats.lastInteractionDate}
              icon={Clock}
            />
          </div>

          {/* Interactions Table */}
          <InteractionsTable />
        </div>
      </ResponsivePageShell>
    </div>
  );
}