import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable } from "@/components/shared/AdvancedTable";
import { AddContactModal } from "./AddContactModal";
import { useMissingCandidates, useApproveMissingContact, useDismissMissingContact } from "@/hooks/useMissingContacts";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX } from "lucide-react";

interface MissingContactsTableProps {
  search: string;
  statusFilter: string;
  selectedRows: Set<string>;
  onSelectedRowsChange: (rows: Set<string>) => void;
}

interface MissingCandidate {
  id: number;
  full_name: string | null;
  email: string;
  organization: string | null;
  status: string;
  created_at: string;
}

export function MissingContactsTable({ 
  search, 
  statusFilter, 
  selectedRows, 
  onSelectedRowsChange 
}: MissingContactsTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<MissingCandidate | null>(null);
  
  const { toast } = useToast();
  
  const { data, isLoading, error } = useMissingCandidates({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: 0,
    pageSize: 100, // Start with larger page size for client-side filtering
  });

  // Client-side filtered data for display
  const filteredData = useMemo(() => {
    if (!data?.candidates) return [];
    return data.candidates;
  }, [data?.candidates]);

  const approveMutation = useApproveMissingContact();
  const dismissMutation = useDismissMissingContact();

  const handleApprove = async (candidate: MissingCandidate) => {
    setSelectedCandidate(candidate);
  };

  const handleDismiss = async (email: string) => {
    try {
      await dismissMutation.mutateAsync(email);
      toast({
        title: "Success",
        description: "Contact candidate dismissed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss contact",
        variant: "destructive",
      });
    }
  };

  const handleSelectRow = (candidateId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(candidateId);
    } else {
      newSelected.delete(candidateId);
    }
    onSelectedRowsChange(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.candidates) {
      const allIds = new Set(data.candidates.map(c => c.id.toString()));
      onSelectedRowsChange(allIds);
    } else {
      onSelectedRowsChange(new Set());
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'dismissed':
        return <Badge variant="destructive">Dismissed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const columns = [
    {
      key: 'select',
      label: 'Select',
      width: 50,
      enableHiding: false,
      render: (candidate: MissingCandidate) => (
        <Checkbox
          checked={selectedRows.has(candidate.id.toString())}
          onCheckedChange={(checked) => handleSelectRow(candidate.id.toString(), checked as boolean)}
          aria-label={`Select ${candidate.email}`}
        />
      ),
    },
    {
      key: 'full_name',
      label: 'Full Name',
      width: 200,
      render: (candidate: MissingCandidate) => candidate.full_name || '—',
    },
    {
      key: 'email',
      label: 'Email',
      width: 250,
      render: (candidate: MissingCandidate) => (
        <span className="font-mono text-sm">{candidate.email}</span>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      width: 200,
      render: (candidate: MissingCandidate) => candidate.organization || '—',
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (candidate: MissingCandidate) => getStatusBadge(candidate.status),
    },
    {
      key: 'created_at',
      label: 'Created At',
      width: 150,
      render: (candidate: MissingCandidate) => format(new Date(candidate.created_at), 'MMM d, yyyy'),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 160,
      enableHiding: false,
      render: (candidate: MissingCandidate) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={() => handleApprove(candidate)}
            disabled={candidate.status !== 'pending'}
          >
            <UserCheck className="h-3 w-3 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDismiss(candidate.email)}
            disabled={candidate.status !== 'pending' || dismissMutation.isPending}
          >
            <UserX className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading missing contacts: {error.message}</p>
      </div>
    );
  }

  return (
    <>
      <AdvancedTable
        data={filteredData}
        columns={columns}
        loading={isLoading}
        tableId="missing-contacts"
        emptyState={{
          title: "No candidates found",
          description: "Click 'Refresh from Interactions' to scan for new contacts.",
        }}
        enablePagination={true}
        initialPageSize={25}
        enableRowSelection={false}
      />

      {selectedCandidate && (
        <AddContactModal
          candidate={selectedCandidate}
          open={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </>
  );
}