import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MissingContactsTable } from "@/components/missing-contacts/MissingContactsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, UserCheck, UserX } from "lucide-react";
import { useRefreshMissingContacts } from "@/hooks/useMissingContacts";
import { useToast } from "@/hooks/use-toast";

export default function MissingContacts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const refreshMutation = useRefreshMissingContacts();

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

  const handleExportCSV = async () => {
    // TODO: Implement CSV export
    toast({
      title: "Export Started",
      description: "Your CSV export will download shortly.",
    });
  };

  const actions = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by email, name, or domain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
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
            <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
              <UserCheck className="h-4 w-4 mr-2" />
              Approve Selected ({selectedRows.size})
            </Button>
            <Button size="sm" variant="destructive">
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
    <div className="space-y-4">
      <PageHeader
        title="Missing Contacts"
        description="Review and promote new contacts discovered from interactions."
        actions={actions}
      />
      
      <MissingContactsTable
        search={search}
        statusFilter={statusFilter}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
      />
    </div>
  );
}