import React, { useState } from "react";
import { MissingContactsTable } from "@/components/missing-contacts/MissingContactsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { RefreshCw, Download, UserCheck, UserX, RotateCcw } from "lucide-react";
import { useRefreshMissingContacts, useMissingCandidates, useApproveMissing, useDismissMissing } from "@/hooks/useMissingContacts";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function MissingContacts() {
  return (
    <PageErrorBoundary pageName="Missing Contacts">
      <MissingContactsContent />
    </PageErrorBoundary>
  );
}

function MissingContactsContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(50);
  const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState(false);
  const [showBulkDismissConfirm, setShowBulkDismissConfirm] = useState(false);
  
  const { toast } = useToast();
  const refreshMutation = useRefreshMissingContacts();
  const approveMutation = useApproveMissing();
  const dismissMutation = useDismissMissing();
  
  // Get data for export
  const { data: allData } = useMissingCandidates({
    search: '',
    status: 'all'
  });

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync();
      toast({
        title: "Success",
        description: "New contacts have been discovered and staged for review.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh missing contacts",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    if (!allData || allData.length === 0) {
      toast({
        title: "No Data",
        description: "No contacts available to export.",
        variant: "destructive",
      });
      return;
    }

    // Filter data based on current search
    const filteredData = allData?.filter((candidate: any) => {
      if (!candidate?.email) return false;
      
      if (search) {
        const searchLower = search.toLowerCase();
        const emailMatch = candidate.email.toLowerCase().includes(searchLower);
        const nameMatch = candidate.full_name?.toLowerCase().includes(searchLower) || false;
        const domainMatch = candidate.email.split('@')[1]?.toLowerCase().includes(searchLower) || false;
        const orgMatch = candidate.organization?.toLowerCase().includes(searchLower) || false;
        
        if (!emailMatch && !nameMatch && !domainMatch && !orgMatch) {
          return false;
        }
      }
      
      // Apply status filter
      if (statusFilter !== 'all' && candidate.status !== statusFilter) {
        return false;
      }
      
      return true;
    }) || [];

    // Create CSV content
    const headers = ['full_name', 'email', 'organization', 'status', 'created_at', 'updated_at'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map((candidate: any) => [
        `"${candidate.full_name || ''}"`,
        `"${candidate.email || ''}"`,
        `"${candidate.organization || ''}"`,
        `"${candidate.status || ''}"`,
        `"${candidate.created_at || ''}"`,
        `"${candidate.updated_at || ''}"`,
      ].join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `missing-contacts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredData.length} contacts to CSV.`,
    });
  };

  const handleBulkApprove = () => {
    if (selectedRows.size === 0) return;
    setShowBulkApproveConfirm(true);
  };

  const confirmBulkApprove = async () => {
    const emailsToApprove = allData
      ?.filter((c: any) => selectedRows.has(c.id.toString()))
      .map((c: any) => c.email)
      .filter(Boolean) || [];

    let successCount = 0;
    let errorCount = 0;

    for (const email of emailsToApprove) {
      try {
        await approveMutation.mutateAsync(email);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    toast({
      title: errorCount > 0 ? "Partial Success" : "Success",
      description: `Approved ${successCount} contacts${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
    
    setSelectedRows(new Set());
    setShowBulkApproveConfirm(false);
  };

  const handleBulkDismiss = () => {
    if (selectedRows.size === 0) return;
    setShowBulkDismissConfirm(true);
  };

  const confirmBulkDismiss = async () => {
    const emailsToDismiss = allData
      ?.filter((c: any) => selectedRows.has(c.id.toString()))
      .map((c: any) => c.email)
      .filter(Boolean) || [];

    let successCount = 0;
    let errorCount = 0;

    for (const email of emailsToDismiss) {
      try {
        await dismissMutation.mutateAsync(email);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    toast({
      title: errorCount > 0 ? "Partial Success" : "Success",
      description: `Dismissed ${successCount} contacts${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
    
    setSelectedRows(new Set());
    setShowBulkDismissConfirm(false);
  };

  const handleClearSearch = () => {
    setSearch("");
  };

  const handleClearStatusFilter = () => {
    setStatusFilter("pending");
  };

  const actions = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            placeholder="Search by email, name, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pr-8"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent hover:text-destructive"
              onClick={handleClearSearch}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          {statusFilter !== "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent hover:text-destructive"
              onClick={handleClearStatusFilter}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(value === "All" ? Math.min(allData?.length || 1000, 1000) : Number(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
            <SelectItem value="300">300</SelectItem>
            <SelectItem value="All">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh from Interactions
        </Button>
        
        {selectedRows.size > 0 && (
          <>
            <Button 
              onClick={handleBulkApprove}
              disabled={approveMutation.isPending}
              size="sm" 
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Approve Selected ({selectedRows.size})
            </Button>
            <Button 
              onClick={handleBulkDismiss}
              disabled={dismissMutation.isPending}
              size="sm" 
              variant="destructive"
            >
              <UserX className="h-4 w-4 mr-2" />
              Dismiss Selected ({selectedRows.size})
            </Button>
          </>
        )}
        
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden">
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Pending Contacts</h1>
          <p className="text-muted-foreground">Review and promote pending contacts discovered from interactions.</p>
        </div>
        
        <div className="space-y-4">
          {actions}
          <MissingContactsTable
            search={search}
            statusFilter={statusFilter}
            selectedRows={selectedRows}
            onSelectedRowsChange={setSelectedRows}
            pageSize={pageSize}
          />
        </div>
      </div>
      
      {/* Bulk Action Confirmation Dialogs */}
      <ConfirmDialog
        open={showBulkApproveConfirm}
        onOpenChange={setShowBulkApproveConfirm}
        onConfirm={confirmBulkApprove}
        title={`Approve ${selectedRows.size} Contacts`}
        description="Are you sure you want to approve the selected contacts? They will be added to your Contacts list with basic information only."
        confirmText="Approve All"
        cancelText="Cancel"
      />

      <ConfirmDialog
        open={showBulkDismissConfirm}
        onOpenChange={setShowBulkDismissConfirm}
        onConfirm={confirmBulkDismiss}
        title={`Dismiss ${selectedRows.size} Contacts`}
        description="Are you sure you want to dismiss the selected contacts? They will remain visible in the 'Dismissed' status filter."
        confirmText="Dismiss All"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}