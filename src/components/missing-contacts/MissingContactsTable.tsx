import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable } from "@/components/shared/AdvancedTable";
import { AddContactModal } from "./AddContactModal";
import { useMissingCandidates, useApproveMissing, useDismissMissing } from "@/hooks/useMissingContacts";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX } from "lucide-react";
import { MissingCandidate } from "@/types/missing-contacts";

interface MissingContactsTableProps {
  search: string;
  statusFilter: string;
  selectedRows: Set<string>;
  onSelectedRowsChange: (rows: Set<string>) => void;
}

export function MissingContactsTable({ 
  search, 
  statusFilter, 
  selectedRows, 
  onSelectedRowsChange 
}: MissingContactsTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<MissingCandidate | null>(null);
  
  const { toast } = useToast();
  
  console.log('MissingContactsTable render with filters:', { search, statusFilter });
  
  const { data, isLoading, error } = useMissingCandidates({
    search,
    status: statusFilter === 'all' ? ['pending', 'approved', 'dismissed'] : [statusFilter as any],
    page: 1,
    pageSize: 100,
  });

  console.log('useMissingCandidates result:', { data, isLoading, error });

  // Client-side filtered data for display
  const filteredData = useMemo(() => {
    if (!data?.rows) {
      console.log('No candidates data available');
      return [];
    }
    console.log('Raw candidates:', data.rows);
    return data.rows.filter(candidate => candidate && candidate.id && candidate.email);
  }, [data?.rows]);

  const approveMutation = useApproveMissing();
  const dismissMutation = useDismissMissing();

  const handleApprove = async (email: string) => {
    if (!email) return;
    try {
      await approveMutation.mutateAsync(email);
    } catch (error) {
      // Error handled by mutation's onError
    }
  };

  const handleDismiss = async (email: string) => {
    if (!email) return;
    try {
      await dismissMutation.mutateAsync(email);
    } catch (error) {
      // Error handled by mutation's onError
    }
  };

  const handleSelectRow = (candidateId: string, checked: boolean) => {
    console.log('handleSelectRow called:', { candidateId, checked });
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(candidateId);
    } else {
      newSelected.delete(candidateId);
    }
    onSelectedRowsChange(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    console.log('handleSelectAll called:', { checked, dataLength: filteredData.length });
    if (checked && filteredData.length > 0) {
      const allIds = new Set<string>();
      filteredData.forEach(c => {
        if (c?.id) {
          allIds.add(c.id);
        }
      });
      console.log('All IDs:', allIds);
      onSelectedRowsChange(allIds);
    } else {
      onSelectedRowsChange(new Set<string>());
    }
  };

  function StatusBadge({ s }: { s: string }) {
    const tone = s === 'approved' ? 'default' : s === 'dismissed' ? 'destructive' : 'secondary';
    return <Badge variant={tone as any} className="capitalize">{s || 'pending'}</Badge>;
  }

  const columns = [
    {
      key: 'select',
      label: 'Select',
      width: 50,
      enableHiding: false,
      render: (candidate: MissingCandidate) => {
        console.log('Rendering checkbox for candidate:', candidate);
        if (!candidate || !candidate.id) {
          console.warn('Invalid candidate for checkbox:', candidate);
          return null;
        }
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
      key: 'full_name',
      label: 'Full Name',
      width: 200,
      render: (candidate: MissingCandidate) => {
        console.log('Rendering full_name for candidate:', candidate);
        if (!candidate) return '—';
        return candidate.full_name || '—';
      },
    },
    {
      key: 'email',
      label: 'Email',
      width: 250,
      render: (candidate: MissingCandidate) => {
        console.log('Rendering email for candidate:', candidate);
        if (!candidate) return '—';
        return (
          <span className="font-mono text-sm">{candidate.email}</span>
        );
      },
    },
    {
      key: 'organization',
      label: 'Organization',
      width: 200,
      render: (candidate: MissingCandidate) => {
        console.log('Rendering organization for candidate:', candidate);
        if (!candidate) return '—';
        return candidate.organization || '—';
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (candidate: MissingCandidate) => {
        console.log('Rendering status for candidate:', candidate);
        if (!candidate) return <Badge>Unknown</Badge>;
        return <StatusBadge s={candidate.status} />;
      },
    },
    {
      key: 'created_at',
      label: 'Created At',
      width: 150,
      render: (candidate: MissingCandidate) => {
        console.log('Rendering created_at for candidate:', candidate);
        if (!candidate || !candidate.created_at) return '—';
        return format(new Date(candidate.created_at), 'MMM d, yyyy');
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 160,
      enableHiding: false,
      render: (candidate: MissingCandidate) => {
        console.log('Rendering actions for candidate:', candidate);
        if (!candidate || !candidate.id || !candidate.email) {
          console.warn('Invalid candidate for actions:', candidate);
          return <div className="text-muted-foreground text-xs">No email</div>;
        }
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => handleApprove(candidate.email)}
              disabled={!candidate.email || candidate.status !== 'pending' || approveMutation.isPending}
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDismiss(candidate.email)}
              disabled={!candidate.email || candidate.status !== 'pending' || dismissMutation.isPending}
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
        initialPageSize={25}
        enableRowSelection={false}
      />

    </>
  );
}