import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { useInteractionStats } from "@/hooks/useInteractionStats";
import { MessageSquare, Mail, Calendar, Clock } from "lucide-react";

export function Interactions() {
  const stats = useInteractionStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Interactions"
        description="View communication history and touchpoints"
      />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          <div className="mx-6 rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <InteractionsTable />
          </div>
        </div>
      </main>
    </div>
  );
}