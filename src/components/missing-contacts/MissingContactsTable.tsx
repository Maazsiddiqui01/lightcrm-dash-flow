import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable } from "@/components/shared/AdvancedTable";
import { useMissingCandidates, useApproveMissing, useDismissMissing } from "@/hooks/useMissingContacts";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX } from "lucide-react";
import { MissingCandidate } from "@/types/missing-contacts";

interface MissingContactsTableProps {
  search: string;
  statusFilter: string;
  selectedRows: Set<string>;
  onSelectedRowsChange: (rows: Set<string>) => void;
  pageSize: number;
}

export function MissingContactsTable({ 
  search, 
  statusFilter, 
  selectedRows, 
  onSelectedRowsChange,
  pageSize
}: MissingContactsTableProps) {
  const { toast } = useToast();
  
  const { data: rawData, isLoading, error } = useMissingCandidates({
    search: '',
    status: statusFilter,
  });

  // Client-side filtered data for display
  const filteredData = useMemo(() => {
    if (!rawData) return [];
    
    return rawData.filter((candidate: any) => {
      if (!candidate || !candidate.email) return false;
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const emailMatch = candidate.email?.toLowerCase().includes(searchLower) || false;
        const nameMatch = candidate.fullName?.toLowerCase().includes(searchLower) || false;
        const domainMatch = candidate.email?.split('@')[1]?.toLowerCase().includes(searchLower) || false;
        const orgMatch = candidate.organization?.toLowerCase().includes(searchLower) || false;
        
        if (!emailMatch && !nameMatch && !domainMatch && !orgMatch) {
          return false;
        }
      }
      
      // Apply status filter client-side
      if (statusFilter !== 'all' && (candidate.status || 'pending') !== statusFilter) {
        return false;
      }
      
      return true;
    });
  }, [rawData, search, statusFilter]);

  const approveMutation = useApproveMissing();
  const dismissMutation = useDismissMissing();

  const handleApprove = async (email: string) => {
    if (!email) return;
    try {
      await approveMutation.mutateAsync(email);
      toast({
        title: "Success",
        description: "Contact approved and added to contacts.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve contact",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = async (email: string) => {
    if (!email) return;
    try {
      await dismissMutation.mutateAsync(email);
      toast({
        title: "Success",
        description: "Contact dismissed.",
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

  function StatusBadge({ status }: { status: string }) {
    const variant = status === 'approved' ? 'default' : status === 'dismissed' ? 'destructive' : 'secondary';
    return <Badge variant={variant} className="capitalize">{status || 'pending'}</Badge>;
  }

  const columns = [
    {
      key: 'select',
      label: 'Select',
      width: 50,
      enableHiding: false,
      render: (candidate: MissingCandidate) => {
        if (!candidate?.id) return null;
        return (
          <Checkbox
            checked={selectedRows.has(candidate.id)}
            onCheckedChange={(checked) => handleSelectRow(candidate.id, checked as boolean)}
            aria-label={`Select ${candidate.email}`}
          />
        );
      },
    },
    {
      key: 'fullName',
      label: 'Full Name',
      width: 200,
      render: (candidate: MissingCandidate) => {
        const name = candidate?.fullName?.trim();
        return name || '—';
      },
    },
    {
      key: 'email',
      label: 'Email',
      width: 250,
      render: (candidate: MissingCandidate) => {
        const email = candidate?.email?.trim();
        if (!email) {
          return <Badge variant="outline" className="text-muted-foreground">No email</Badge>;
        }
        return (
          <a href={`mailto:${email}`} className="font-mono text-sm text-primary underline hover:no-underline">
            {email}
          </a>
        );
      },
    },
    {
      key: 'organization',
      label: 'Organization',
      width: 200,
      render: (candidate: MissingCandidate) => {
        const org = candidate?.organization?.trim();
        return org || '—';
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (candidate: MissingCandidate) => {
        return <StatusBadge status={candidate?.status || 'pending'} />;
      },
    },
    {
      key: 'createdAt',
      label: 'Created At',
      width: 150,
      render: (candidate: MissingCandidate) => {
        if (!candidate?.createdAt) return '—';
        try {
          return format(new Date(candidate.createdAt), 'MMM d, yyyy p');
        } catch {
          return '—';
        }
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 160,
      enableHiding: false,
      render: (candidate: MissingCandidate) => {
        if (!candidate?.email) {
          return <div className="text-muted-foreground text-xs">No email</div>;
        }
        
        const isApproveDisabled = candidate.status !== 'pending' || approveMutation.isPending;
        const isDismissDisabled = candidate.status !== 'pending' || dismissMutation.isPending;
        
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => handleApprove(candidate.email)}
              disabled={isApproveDisabled}
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDismiss(candidate.email)}
              disabled={isDismissDisabled}
            >
              <UserX className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
          </div>
        );
      },
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
        initialPageSize={pageSize}
        enableRowSelection={false}
      />

    </>
  );
}