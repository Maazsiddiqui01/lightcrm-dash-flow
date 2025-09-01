import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { useState } from "react";
import { AddOpportunityDialog } from "@/components/opportunities/AddOpportunityDialog";

export function Opportunities() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Opportunities"
        description="Track sales opportunities and business development"
        actions={
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Button>
        }
      />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-card shadow-md border border-border overflow-hidden">
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