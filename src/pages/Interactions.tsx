import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { StatsCard } from "@/components/shared/StatsCard";
import { useInteractionStats } from "@/hooks/useInteractionStats";
import { MessageSquare, Mail, Calendar, Clock } from "lucide-react";


export function Interactions() {
  const stats = useInteractionStats();

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden">
      <section className="container-fluid flex flex-col gap-6 py-6">
        {/* Header Cards */}
        <div className="space-y-4">
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

        <InteractionsTable />
      </section>
    </div>
  );
}