import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ContactOverride } from '@/types/groupEmailBuilder';

interface ContactRaw {
  id: string;
  full_name: string | null;
  email_address: string | null;
  organization: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  most_recent_contact: string | null;
  lg_lead: string | null;
}

interface GroupResultsTableProps {
  contacts: ContactRaw[];
  selectedContactIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCustomize: (contactId: string) => void;
  overrides: Map<string, ContactOverride>;
  loading?: boolean;
}

export function GroupResultsTable({
  contacts,
  selectedContactIds,
  onSelectionChange,
  onCustomize,
  overrides,
  loading = false,
}: GroupResultsTableProps) {
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const MAX_SELECTION = 500;

  const hasOverride = (contactId: string) => overrides.has(contactId);

  const toggleRow = (contactId: string) => {
    const newSelection = new Set(selectedContactIds);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      if (newSelection.size >= MAX_SELECTION) {
        return; // Don't allow selection beyond cap
      }
      newSelection.add(contactId);
    }
    onSelectionChange(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      // Deselect all
      onSelectionChange(new Set());
      setSelectAllChecked(false);
    } else {
      // Select all (up to cap)
      const newSelection = new Set(
        contacts.slice(0, MAX_SELECTION).map(c => c.id)
      );
      onSelectionChange(newSelection);
      setSelectAllChecked(true);
    }
  };

  const columns = useMemo<ColumnDef<ContactRaw>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectAllChecked}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all contacts"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedContactIds.has(row.original.id)}
              onCheckedChange={() => toggleRow(row.original.id)}
              aria-label={`Select ${row.original.full_name || row.original.email_address}`}
            />
          </div>
        ),
        size: 50,
      },
      {
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {row.original.full_name || row.original.email_address || 'Unknown'}
            </span>
            {hasOverride(row.original.id) && (
              <Badge variant="secondary" className="text-xs">
                Customized
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'organization',
        header: 'Organization',
        cell: ({ getValue }) => getValue() || '—',
      },
      {
        accessorKey: 'lg_focus_areas_comprehensive_list',
        header: 'Focus Areas',
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '—';
          const areas = value.split(',').map(a => a.trim()).filter(Boolean);
          return (
            <div className="flex flex-wrap gap-1">
              {areas.slice(0, 2).map((area, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {area}
                </Badge>
              ))}
              {areas.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{areas.length - 2}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'most_recent_contact',
        header: 'Last Contact',
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '—';
          try {
            return formatDistanceToNow(new Date(value), { addSuffix: true });
          } catch {
            return '—';
          }
        },
      },
      {
        accessorKey: 'lg_lead',
        header: 'LG Lead',
        cell: ({ getValue }) => getValue() || '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCustomize(row.original.id)}
            className="h-8"
          >
            <Settings className="mr-2 h-4 w-4" />
            Customize
          </Button>
        ),
        size: 120,
      },
    ],
    [selectedContactIds, selectAllChecked, overrides]
  );

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  // Virtualization setup
  const parentRef = useState<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef[0],
    estimateSize: () => 50,
    overscan: 10,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-card">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-card">
        <div className="text-center space-y-2">
          <User className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No contacts match these filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedContactIds.size >= MAX_SELECTION && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
          <strong>Selection limit reached:</strong> Maximum {MAX_SELECTION} contacts can be selected at once.
        </div>
      )}
      
      <div
        ref={(el) => (parentRef[0] = el)}
        className="h-[500px] overflow-auto border rounded-lg bg-card"
      >
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 text-sm font-medium text-foreground"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Showing {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
