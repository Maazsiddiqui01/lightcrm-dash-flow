import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { Plus, Building2, Users2, TrendingUp, DollarSign, Trash2, UserPlus, Calendar } from "lucide-react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { MobileStatsGrid } from "@/components/shared/MobileStatsGrid";
import { FloatingActionButton } from "@/components/shared/FloatingActionButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { HorizonCompaniesTable } from "@/components/horizons/companies/HorizonCompaniesTable";
import { HorizonCompanyFilterBar } from "@/components/horizons/companies/HorizonCompanyFilterBar";
import { AddHorizonCompanyDialog } from "@/components/horizons/companies/AddHorizonCompanyDialog";
import { HorizonGpsTable } from "@/components/horizons/gps/HorizonGpsTable";
import { HorizonGpFilterBar } from "@/components/horizons/gps/HorizonGpFilterBar";
import { AddHorizonGpDialog } from "@/components/horizons/gps/AddHorizonGpDialog";
import { useHorizonCompanyStats } from "@/hooks/useHorizonCompanyStats";
import { useHorizonGpStats } from "@/hooks/useHorizonGpStats";
import { HorizonCombinedFilterBar, HorizonCombinedFilters } from "@/components/horizons/combined/HorizonCombinedFilterBar";
import { HorizonCombinedTable } from "@/components/horizons/combined/HorizonCombinedTable";
import { useHorizonCombinedStats } from "@/hooks/useHorizonCombinedStats";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LgHorizons() {
  const [isAddCompanyDialogOpen, setIsAddCompanyDialogOpen] = useState(false);
  const [isAddGpDialogOpen, setIsAddGpDialogOpen] = useState(false);
  const [selectedCompanyRows, setSelectedCompanyRows] = useState<string[]>([]);
  const [selectedGpRows, setSelectedGpRows] = useState<string[]>([]);
  const [selectedCombinedRows, setSelectedCombinedRows] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: users } = useUsersList();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Record type filter for showing Companies, GPs, or Both
  const [recordType, setRecordType] = useState<"companies" | "gps" | "both">("both");

  // Company filters
  const { filters: companyRawFilters, updateFilters: updateCompanyRawFilters, clearFilters: clearCompanyFilters } = useUrlFilters({
    sector: [],
    subsector: [],
    processStatus: [],
    ownership: [],
    priority: [],
    lgRelationship: [],
    ebitdaMin: undefined,
    ebitdaMax: undefined,
    revenueMin: undefined,
    revenueMax: undefined,
    gpAumMin: undefined,
    gpAumMax: undefined,
    state: [],
    city: [],
    source: [],
    parentGp: [],
    dateOfAcquisitionStart: undefined,
    dateOfAcquisitionEnd: undefined,
  });

  // GP filters
  const { filters: gpRawFilters, updateFilters: updateGpRawFilters, clearFilters: clearGpFilters } = useUrlFilters({
    lgRelationship: [],
    aumMin: undefined,
    aumMax: undefined,
    state: [],
    city: [],
    industrySector: [],
    priority: [],
  });

  // Combined filters for "Show Both" mode
  const [combinedFilters, setCombinedFilters] = useState<HorizonCombinedFilters>({
    priority: [],
    lgRelationship: [],
    sector: [],
    subsector: [],
    processStatus: [],
    ownership: [],
    ebitdaMin: undefined,
    ebitdaMax: undefined,
    revenueMin: undefined,
    revenueMax: undefined,
    companyState: [],
    companyCity: [],
    source: [],
    parentGp: [],
    gpAumMin: undefined,
    gpAumMax: undefined,
    dateOfAcquisitionStart: undefined,
    dateOfAcquisitionEnd: undefined,
    industrySector: [],
    aumMin: undefined,
    aumMax: undefined,
    gpState: [],
    gpCity: [],
  });

  const handleCombinedFiltersChange = (newFilters: Partial<HorizonCombinedFilters>) => {
    setCombinedFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearCombinedFilters = () => {
    setCombinedFilters({
      priority: [],
      lgRelationship: [],
      sector: [],
      subsector: [],
      processStatus: [],
      ownership: [],
      ebitdaMin: undefined,
      ebitdaMax: undefined,
      revenueMin: undefined,
      revenueMax: undefined,
      companyState: [],
      companyCity: [],
      source: [],
      parentGp: [],
      gpAumMin: undefined,
      gpAumMax: undefined,
      dateOfAcquisitionStart: undefined,
      dateOfAcquisitionEnd: undefined,
      industrySector: [],
      aumMin: undefined,
      aumMax: undefined,
      gpState: [],
      gpCity: [],
    });
  };

  // Type-safe filter conversion for companies
  const companyFilters = {
    sector: (companyRawFilters.sector as string[]) || [],
    subsector: (companyRawFilters.subsector as string[]) || [],
    processStatus: (companyRawFilters.processStatus as string[]) || [],
    ownership: (companyRawFilters.ownership as string[]) || [],
    priority: (companyRawFilters.priority as string[]) || [],
    lgRelationship: (companyRawFilters.lgRelationship as string[]) || [],
    ebitdaMin: typeof companyRawFilters.ebitdaMin === 'number' ? companyRawFilters.ebitdaMin : undefined,
    ebitdaMax: typeof companyRawFilters.ebitdaMax === 'number' ? companyRawFilters.ebitdaMax : undefined,
    revenueMin: typeof companyRawFilters.revenueMin === 'number' ? companyRawFilters.revenueMin : undefined,
    revenueMax: typeof companyRawFilters.revenueMax === 'number' ? companyRawFilters.revenueMax : undefined,
    gpAumMin: typeof companyRawFilters.gpAumMin === 'number' ? companyRawFilters.gpAumMin : undefined,
    gpAumMax: typeof companyRawFilters.gpAumMax === 'number' ? companyRawFilters.gpAumMax : undefined,
    state: (companyRawFilters.state as string[]) || [],
    city: (companyRawFilters.city as string[]) || [],
    source: (companyRawFilters.source as string[]) || [],
    parentGp: (companyRawFilters.parentGp as string[]) || [],
    dateOfAcquisitionStart: typeof companyRawFilters.dateOfAcquisitionStart === 'string' ? companyRawFilters.dateOfAcquisitionStart : undefined,
    dateOfAcquisitionEnd: typeof companyRawFilters.dateOfAcquisitionEnd === 'string' ? companyRawFilters.dateOfAcquisitionEnd : undefined,
  };

  // Type-safe filter conversion for GPs
  const gpFilters = {
    lgRelationship: (gpRawFilters.lgRelationship as string[]) || [],
    aumMin: typeof gpRawFilters.aumMin === 'number' ? gpRawFilters.aumMin : undefined,
    aumMax: typeof gpRawFilters.aumMax === 'number' ? gpRawFilters.aumMax : undefined,
    state: (gpRawFilters.state as string[]) || [],
    city: (gpRawFilters.city as string[]) || [],
    industrySector: (gpRawFilters.industrySector as string[]) || [],
    priority: (gpRawFilters.priority as string[]) || [],
  };

  const companyStats = useHorizonCompanyStats(companyFilters);
  const gpStats = useHorizonGpStats(gpFilters);
  const combinedStats = useHorizonCombinedStats(combinedFilters);

  // Selection logic based on record type
  const selectedRows = recordType === "gps" ? selectedGpRows : recordType === "companies" ? selectedCompanyRows : selectedCombinedRows;
  const setSelectedRows = recordType === "gps" ? setSelectedGpRows : recordType === "companies" ? setSelectedCompanyRows : setSelectedCombinedRows;
  const tableName = recordType === "gps" ? "lg_horizons_gps" : "lg_horizons_companies";

  const handleBulkAssignment = async (userId: string) => {
    if (selectedRows.length === 0) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ created_by: userId })
        .in('id', selectedRows);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Assigned ${selectedRows.length} records to user`,
      });
      setSelectedRows([]);
      queryClient.invalidateQueries({ queryKey: ['horizon-companies'] });
      queryClient.invalidateQueries({ queryKey: ['horizon-gps'] });
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign records",
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
        .from(tableName)
        .delete()
        .in('id', selectedRows);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} records`,
      });
      
      setSelectedRows([]);
      queryClient.invalidateQueries({ queryKey: ['horizon-companies'] });
      queryClient.invalidateQueries({ queryKey: ['horizon-gps'] });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast({
        title: "Error",
        description: "Failed to delete records",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  const handleAddClick = () => {
    if (recordType === "gps") {
      setIsAddGpDialogOpen(true);
    } else {
      setIsAddCompanyDialogOpen(true);
    }
  };

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>LG Horizon</h1>
              {!isMobile && (
                <p className="text-muted-foreground">Track target companies and GP relationships</p>
              )}
            </div>
            <Select value={recordType} onValueChange={(v) => setRecordType(v as "companies" | "gps" | "both")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Show Both</SelectItem>
                <SelectItem value="companies">Companies Only</SelectItem>
                <SelectItem value="gps">GPs Only</SelectItem>
              </SelectContent>
            </Select>
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
              {recordType === "both" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 touch-target">
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add New</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsAddCompanyDialogOpen(true)}>
                      <Building2 className="h-4 w-4 mr-2" />
                      Add Company
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsAddGpDialogOpen(true)}>
                      <Users2 className="h-4 w-4 mr-2" />
                      Add GP
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={handleAddClick} className="bg-primary hover:bg-primary/90 touch-target">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {recordType === "gps" ? "Add GP" : "Add Company"}
                  </span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Show Both - Unified View */}
        {recordType === "both" && (
          <div className="space-y-6">
            {/* Combined Filter Bar */}
            <HorizonCombinedFilterBar 
              filters={combinedFilters}
              onFiltersChange={handleCombinedFiltersChange}
              onClearFilters={handleClearCombinedFilters}
            />

            {/* Combined KPI Cards */}
            <MobileStatsGrid>
              <StatsCard
                title="Total Universe"
                value={combinedStats.loading ? "..." : combinedStats.totalUniverse}
                subtitle={combinedStats.loading ? undefined : `${combinedStats.totalCompanies} Companies, ${combinedStats.totalGps} GPs`}
                icon={Building2}
              />
              <StatsCard
                title="Priorities"
                value={combinedStats.loading ? "..." : combinedStats.filteredPriorityCount}
                icon={TrendingUp}
              />
              <StatsCard
                title="GP AUM Range"
                value={combinedStats.loading ? "..." : combinedStats.gpAumRange}
                icon={DollarSign}
              />
              <StatsCard
                title="Acquisition Date Range"
                value={combinedStats.loading ? "..." : combinedStats.acquisitionDateRange}
                icon={Calendar}
              />
            </MobileStatsGrid>

            {/* Combined Table */}
            <HorizonCombinedTable 
              filters={combinedFilters}
              selectedRows={selectedCombinedRows}
              onSelectionChange={setSelectedCombinedRows}
            />
          </div>
        )}

        {/* Companies Only Section */}
        {recordType === "companies" && (
          <div id="companies-section" className="space-y-6 scroll-mt-24">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Companies
            </h2>

            {/* Company Filter Bar */}
            <HorizonCompanyFilterBar 
              filters={companyFilters}
              onFiltersChange={updateCompanyRawFilters}
              onClearFilters={clearCompanyFilters}
            />

            {/* Company KPI Cards */}
            <MobileStatsGrid>
              <StatsCard
                title="Total Companies"
                value={companyStats.loading ? "..." : companyStats.totalCompanies}
                icon={Building2}
              />
              <StatsCard
                title="Priorities"
                value={companyStats.loading ? "..." : companyStats.filteredPriorityCount}
                icon={TrendingUp}
              />
              <StatsCard
                title="GP AUM Range"
                value={companyStats.loading ? "..." : companyStats.gpAumRange}
                icon={DollarSign}
              />
              <StatsCard
                title="Acquisition Date Range"
                value={companyStats.loading ? "..." : companyStats.acquisitionDateRange}
                icon={Calendar}
              />
            </MobileStatsGrid>

            {/* Companies Table */}
            <HorizonCompaniesTable 
              filters={companyFilters}
              onSelectionChange={setSelectedCompanyRows}
              selectedRows={selectedCompanyRows}
            />
          </div>
        )}

        {/* GPs Only Section */}
        {recordType === "gps" && (
          <div id="gps-section" className="space-y-6 scroll-mt-24">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              GPs
            </h2>

            {/* GP Filter Bar */}
            <HorizonGpFilterBar 
              filters={gpFilters}
              onFiltersChange={updateGpRawFilters}
              onClearFilters={clearGpFilters}
            />

            {/* GP KPI Cards */}
            <MobileStatsGrid>
              <StatsCard
                title="Total GPs"
                value={gpStats.loading ? "..." : gpStats.totalGps}
                icon={Users2}
              />
              <StatsCard
                title="Priorities"
                value={gpStats.loading ? "..." : gpStats.filteredPriorityCount}
                icon={TrendingUp}
              />
              <StatsCard
                title="Total AUM"
                value={gpStats.loading ? "..." : gpStats.totalAum}
                icon={DollarSign}
              />
              <StatsCard
                title="AUM Range"
                value={gpStats.loading ? "..." : gpStats.aumRange}
                icon={DollarSign}
              />
            </MobileStatsGrid>

            {/* GPs Table */}
            <HorizonGpsTable 
              filters={gpFilters}
              onSelectionChange={setSelectedGpRows}
              selectedRows={selectedGpRows}
            />
          </div>
        )}

        {/* Dialogs */}
        <AddHorizonCompanyDialog 
          open={isAddCompanyDialogOpen} 
          onClose={() => setIsAddCompanyDialogOpen(false)} 
          onCompanyAdded={() => {
            setIsAddCompanyDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['horizon-companies'] });
          }} 
        />

        <AddHorizonGpDialog 
          open={isAddGpDialogOpen} 
          onClose={() => setIsAddGpDialogOpen(false)} 
          onGpAdded={() => {
            setIsAddGpDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['horizon-gps'] });
          }} 
        />

        <ConfirmDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          onConfirm={handleBulkDelete}
          title="Delete Records"
          description={`Are you sure you want to delete ${selectedRows.length} record(s)? This action cannot be undone.`}
          confirmText="Delete All"
          cancelText="Cancel"
          variant="destructive"
        />

        {/* Floating Action Button - Mobile Only */}
        {isMobile && (
          <FloatingActionButton
            onClick={handleAddClick}
            aria-label="Add new record"
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

export default LgHorizons;
