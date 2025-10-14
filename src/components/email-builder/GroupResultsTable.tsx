import { useMemo, useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  lg_assistant: string | null;
}

interface GroupResultsTableProps {
  contacts: ContactRaw[];
  selectedContactIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCustomize: (contactId: string) => void;
  onFocusChange: (contactId: string | null) => void;
  focusedContactId: string | null;
  overrides: Map<string, ContactOverride>;
  loading?: boolean;
}

export function GroupResultsTable({
  contacts,
  selectedContactIds,
  onSelectionChange,
  onCustomize,
  onFocusChange,
  focusedContactId,
  overrides,
  loading = false,
}: GroupResultsTableProps) {
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  // Removed MAX_SELECTION cap - using cohortSnapshotId approach instead
  
  const hasOverride = (contactId: string) => overrides.has(contactId);

  const toggleRow = (contactId: string) => {
    const newSelection = new Set(selectedContactIds);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
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
      // Select all contacts (no cap)
      const newSelection = new Set(contacts.map(c => c.id));
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
        id: 'team',
        header: 'Team',
        cell: ({ row }) => {
          const contactId = row.original.id;
          const override = overrides.get(contactId);
          
          // Use override team if exists, otherwise parse from contact's lg_lead and lg_assistant
          let teamMembers = override?.team || [];
          
          // If no override, build team from contact data
          if (teamMembers.length === 0) {
            const contact = row.original;
            const tempTeam: any[] = [];
            
            // Parse LG Leads
            if (contact.lg_lead) {
              const leads = contact.lg_lead.split(',').map((l: string) => l.trim()).filter(Boolean);
              leads.forEach((leadName: string) => {
                tempTeam.push({ name: leadName, role: 'Lead' });
              });
            }
            
            // Parse LG Assistants
            if (contact.lg_assistant) {
              const assistants = contact.lg_assistant.split(',').map((a: string) => a.trim()).filter(Boolean);
              assistants.forEach((assistantName: string) => {
                tempTeam.push({ name: assistantName, role: 'Assistant' });
              });
            }
            
            teamMembers = tempTeam;
          }
          
          if (teamMembers.length === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          
          return (
            <div className="flex flex-wrap gap-1">
              {teamMembers.slice(0, 2).map((member, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {member.name}
                </Badge>
              ))}
              {teamMembers.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{teamMembers.length - 2}
                </Badge>
              )}
            </div>
          );
        },
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (contacts.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedRowIndex(prev => Math.min(prev + 1, contacts.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedRowIndex(prev => Math.max(prev - 1, 0));
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (focusedRowIndex >= 0 && focusedRowIndex < contacts.length) {
            const contactId = contacts[focusedRowIndex].id;
            toggleRow(contactId);
          }
          break;
        case 'c':
        case 'C':
          if (focusedRowIndex >= 0 && focusedRowIndex < contacts.length) {
            const contactId = contacts[focusedRowIndex].id;
            onCustomize(contactId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedRowIndex, contacts]);

  // Update focus callback when row index changes
  useEffect(() => {
    if (focusedRowIndex >= 0 && focusedRowIndex < contacts.length) {
      onFocusChange(contacts[focusedRowIndex].id);
    }
  }, [focusedRowIndex, contacts, onFocusChange]);

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
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-muted/50 border-b backdrop-blur-sm">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
        </div>

        {/* Scrollable Body */}
        <div
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
          tabIndex={0}
        >
          <Table>
            <TableBody>
              {rows.map((row, index) => {
                const contactId = row.original.id;
                const isFocused = focusedContactId === contactId;
                const isKeyboardFocused = focusedRowIndex === index;
                
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => {
                      setFocusedRowIndex(index);
                      onFocusChange(contactId);
                    }}
                    className={`
                      cursor-pointer transition-colors
                      ${isFocused ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}
                      ${isKeyboardFocused ? 'bg-muted/50' : ''}
                    `}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer with contact count and keyboard hints */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <div>
          Showing <span className="font-medium text-foreground">{contacts.length.toLocaleString()}</span> contact{contacts.length !== 1 ? 's' : ''}
          {selectedContactIds.size > 0 && (
            <> · <span className="font-medium text-foreground">{selectedContactIds.size}</span> selected</>
          )}
        </div>
        <div className="text-xs">
          Use <kbd className="px-1.5 py-0.5 bg-muted rounded border">↑↓</kbd> to navigate, 
          <kbd className="px-1.5 py-0.5 bg-muted rounded border ml-1">Space</kbd> to select, 
          <kbd className="px-1.5 py-0.5 bg-muted rounded border ml-1">C</kbd> to customize
        </div>
      </div>
    </div>
  );
}
