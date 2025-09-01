import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { MessageSquare } from "lucide-react";

export function Interactions() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Interactions"
        description="View communication history and touchpoints"
      />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-card shadow-md border border-border overflow-hidden">
            <InteractionsTable />
          </div>
        </div>
      </main>
    </div>
  );
}