import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { useInteractionStats } from "@/hooks/useInteractionStats";
import { MessageSquare, Mail, Calendar, Clock } from "lucide-react";

export function Interactions() {
  const stats = useInteractionStats();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Interactions"
        description="View communication history and touchpoints"
      />
      
      <main className="flex-1">
        <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
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
          <div className="rounded-lg bg-card shadow-sm border border-border overflow-hidden">
            <InteractionsTable />
          </div>
        </div>
      </main>
    </div>
  );
}