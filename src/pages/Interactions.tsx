import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { useInteractionStats } from "@/hooks/useInteractionStats";
import { MessageSquare, Mail, Calendar, Clock } from "lucide-react";
import { ResponsivePageShell } from "@/components/layout/ResponsivePageShell";

export function Interactions() {
  const stats = useInteractionStats();

  return (
    <section className="h-full flex flex-col overflow-hidden">
      {/* Header Cards */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Interactions</h1>
          <p className="text-muted-foreground">View communication history and touchpoints</p>
        </div>
        
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
      </div>

      <div className="flex-1 min-h-0 mx-4 mb-4">
        <InteractionsTable />
      </div>
    </section>
  );
}