import { OpportunitiesTableWithErrorBoundary } from "@/components/opportunities/OpportunitiesTableWithErrorBoundary";
import { OpportunityFilterBar } from "@/components/opportunities/OpportunityFilterBar";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useOpportunityStats } from "@/hooks/useOpportunityStats";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { Plus, Target, TrendingUp, Users, DollarSign, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddOpportunityDialog } from "@/components/opportunities/AddOpportunityDialog";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUsersList } from "@/hooks/useUsersList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CollapsibleFilter } from "@/components/shared/CollapsibleFilter";
import { MobileStatsGrid } from "@/components/shared/MobileStatsGrid";
import { FloatingActionButton } from "@/components/shared/FloatingActionButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";


export function Opportunities() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: users } = useUsersList();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { filters: rawFilters, updateFilters: rawUpdateFilters, clearFilters } = useUrlFilters({
    focusArea: [],
    ownershipType: [],
    ebitdaMin: undefined,
    ebitdaMax: undefined,
    tier: [],
    status: [],
    sector: [],
    leads: [],
    platformAddOn: [],
    referralContacts: [],
    referralCompanies: [],
    dateOfOrigination: [],
    dealcloud: [],
    headquarters: [],
    processTimeline: [],
    funds: []
  });

  // Type-safe filter conversion
  const filters = {
    focusArea: (rawFilters.focusArea as string[]) || [],
    ownershipType: (rawFilters.ownershipType as string[]) || [],
    ebitdaMin: typeof rawFilters.ebitdaMin === 'number' ? rawFilters.ebitdaMin : undefined,
    ebitdaMax: typeof rawFilters.ebitdaMax === 'number' ? rawFilters.ebitdaMax : undefined,
    tier: (rawFilters.tier as string[]) || [],
    status: (rawFilters.status as string[]) || [],
    sector: (rawFilters.sector as string[]) || [],
    leads: (rawFilters.leads as string[]) || [],
    platformAddOn: (rawFilters.platformAddOn as string[]) || [],
    referralContacts: (rawFilters.referralContacts as string[]) || [],
    referralCompanies: (rawFilters.referralCompanies as string[]) || [],
    dateOfOrigination: (rawFilters.dateOfOrigination as string[]) || [],
    dealcloud: (rawFilters.dealcloud as string[]) || [],
    headquarters: (rawFilters.headquarters as string[]) || [],
    processTimeline: (rawFilters.processTimeline as string[]) || [],
    funds: (rawFilters.funds as string[]) || []
  };

  const stats = useOpportunityStats(filters);

  const updateFilters = (newFilters: any) => {
    rawUpdateFilters(newFilters);
  };

  const handleBulkAssignment = async (userId: string) => {
    if (selectedRows.length === 0) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('opportunities_raw')
        .update({ assigned_to: userId })
        .in('id', selectedRows);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Assigned ${selectedRows.length} opportunities to user`,
      });
      setSelectedRows([]);
      
      // Trigger a re-render by updating a key prop or use query invalidation
      // The table will automatically refetch due to selectedRows change
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign opportunities",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('opportunities_raw')
        .delete()
        .in('id', selectedRows);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} ${selectedRows.length === 1 ? 'opportunity' : 'opportunities'}`,
      });
      
      // Clear selection and force table refresh
      setSelectedRows([]);
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      
      // Force a hard refresh of the page data to ensure table updates
      window.location.hash = Date.now().toString();
      window.location.hash = '';
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast({
        title: "Error",
        description: "Failed to delete opportunities",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>Opportunities</h1>
            {!isMobile && (
              <p className="text-muted-foreground">Track sales opportunities and business development</p>
            )}
          </div>
          {!isMobile && (
            <div className="flex gap-2">
              {selectedRows.length > 0 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="touch-target" disabled={isAssigning}>
                        <UserPlus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">
                          {isAssigning ? "Assigning..." : `Assign (${selectedRows.length})`}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {users?.map((user) => (
                        <DropdownMenuItem
                          key={user.id}
                          onClick={() => handleBulkAssignment(user.id)}
                          disabled={isAssigning}
                        >
                          {user.full_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    variant="destructive" 
                    className="touch-target" 
                    disabled={isDeleting}
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {isDeleting ? "Deleting..." : `Delete (${selectedRows.length})`}
                    </span>
                  </Button>
                </>
              )}
              <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 touch-target">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Opportunity</span>
              </Button>
            </div>
          )}
        </div>

        {/* Filter Bar - Collapsible on Mobile */}
        <CollapsibleFilter 
          activeCount={Object.values(filters).filter(v => 
            Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null
          ).length}
        >
          <OpportunityFilterBar 
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
          />
        </CollapsibleFilter>

        {/* KPI Cards - Horizontal Scroll on Mobile */}
        <MobileStatsGrid>
          <StatsCard
            title="Total Opportunities"
            value={stats.loading ? "..." : stats.totalOpportunities}
            icon={Target}
          />
          <StatsCard
            title="Tier 1 Active Deals"
            value={stats.loading ? "..." : stats.tier1ActiveDeals}
            icon={TrendingUp}
          />
          <StatsCard
            title="% Family/Founder Owned"
            value={stats.loading ? "..." : stats.familyFounderPercentage}
            icon={Users}
          />
          <StatsCard
            title="Average EBITDA"
            value={stats.loading ? "..." : stats.averageEbitda}
            icon={DollarSign}
          />
        </MobileStatsGrid>

        <OpportunitiesTableWithErrorBoundary 
          filters={filters}
          onSelectionChange={setSelectedRows}
        />

        <AddOpportunityDialog 
          open={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)} 
          onOpportunityAdded={() => {
            setIsAddDialogOpen(false);
            // Invalidate queries to refresh the list
            queryClient.invalidateQueries({ queryKey: ['opportunities'] });
          }} 
        />

        <ConfirmDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          onConfirm={handleBulkDelete}
          title="Delete Opportunities"
          description={`Are you sure you want to delete ${selectedRows.length} ${selectedRows.length === 1 ? 'opportunity' : 'opportunities'}? This action cannot be undone.`}
          confirmText="Delete All"
          cancelText="Cancel"
          variant="destructive"
        />

        {/* Floating Action Button - Mobile Only */}
        {isMobile && (
          <FloatingActionButton
            onClick={() => setIsAddDialogOpen(true)}
            aria-label="Add new opportunity"
          />
        )}

        {/* Sticky Bottom Action Bar - Mobile Only when rows selected */}
        {isMobile && selectedRows.length > 0 && (
          <div className="mobile-action-bar">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {selectedRows.length} selected
              </span>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isAssigning}
                      className="touch-target"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {users?.map((user) => (
                      <DropdownMenuItem
                        key={user.id}
                        onClick={() => handleBulkAssignment(user.id)}
                        disabled={isAssigning}
                      >
                        {user.full_name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="touch-target"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}