import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ColumnDef } from "@/components/shared/AdvancedTable";
import { HorizonGpDrawer } from "./HorizonGpDrawer";
import { AddHorizonGpDialog } from "./AddHorizonGpDialog";
import { BulkImportModal } from "@/components/data-maintenance/BulkImportModal";
import { HorizonGpExportDropdown } from "./HorizonGpExportDropdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUpDown, ChevronDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SplitButton } from "@/components/shared/SplitButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// Dynamic column imports
import { LG_HORIZONS_GPS_COLUMNS } from "@/lib/supabase/horizonColumns";
import { useEditMode } from "@/hooks/useEditMode";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { EditToolbar } from "@/components/shared/EditToolbar";
import { horizonGpsEditable } from "@/config/horizonEditableColumns";
import { EditableCell } from "@/components/shared/EditableCell";

// Multi-sort imports
import { MultiSortDialog, SortLevel, ColumnOption } from "@/components/shared/MultiSortDialog";
import { SortChips } from "@/components/shared/SortChips";
import { 
  loadSortState, 
  saveSortState, 
  clearSortState,
  buildSupabaseOrder,
  applyClientSort 
} from "@/lib/sort/customSort";

interface HorizonGp {
  id: string;
  priority: number | null;
  index_number: number | null;
  gp_name: string;
  gp_url: string | null;
  lg_relationship: string | null;
  gp_contact: string | null;
  aum: string | null;
  aum_numeric: number | null;
  fund_hq_city: string | null;
  fund_hq_state: string | null;
  active_funds: number | null;
  total_funds: number | null;
  active_holdings: number | null;
  industry_sector_focus: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface HorizonGpFilters {
  lgRelationship: string[];
  aumMin?: number;
  aumMax?: number;
  state: string[];
  city: string[];
  industrySector: string[];
  priority: string[];
  activeFundsMin?: number;
  activeFundsMax?: number;
  activeHoldingsMin?: number;
  activeHoldingsMax?: number;
}

interface HorizonGpsTableProps {
  filters: HorizonGpFilters;
  selectedRows?: string[];
  onSelectionChange?: (rows: string[]) => void;
}

export function HorizonGpsTable({ filters, selectedRows = [], onSelectionChange }: HorizonGpsTableProps) {
  const [gps, setGps] = useState<HorizonGp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGp, setSelectedGp] = useState<HorizonGp | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [gpToDelete, setGpToDelete] = useState<HorizonGp | null>(null);
  const { toast } = useToast();
  
  const requestIdRef = useRef<string | null>(null);
  
  // Multi-sort state
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  
  useEffect(() => {
    const savedSort = loadSortState('lg_horizons_gps');
    setSortLevels(savedSort);
  }, []);
  
  // Edit mode - use opportunities_raw as compatible type
  const editMode = useEditMode('opportunities_raw' as any, gps, setGps as any);
  const columnVisibility = useColumnVisibility('columns:lg_horizons_gps');
  
  // Create column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => {
    return LG_HORIZONS_GPS_COLUMNS.map(col => ({
      key: col.name,
      label: col.displayName,
    }));
  }, []);

  // Create dynamic columns
  const dynamicColumns = useMemo(() => {
    const baseColumns: ColumnDef<HorizonGp>[] = LG_HORIZONS_GPS_COLUMNS
      .filter(col => col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at' && col.name !== 'aum_numeric')
      .map((col): ColumnDef<HorizonGp> => {
        const isEditable = editMode.editState.editMode && col.name in horizonGpsEditable;
        const config = horizonGpsEditable[col.name];
        const isVisible = columnVisibility.columnVisibility[col.name] !== false;

        return {
          key: col.name,
          label: col.displayName,
          visible: isVisible,
          enableHiding: true,
          resizable: true,
          width: col.name === 'gp_name' ? 200 : col.name === 'industry_sector_focus' ? 250 : 120,
          render: (value: any, row: HorizonGp) => {
            const rowId = String(row.id);
            const editedValue = editMode.editState.editedRows[rowId]?.[col.name] ?? value;
            const hasError = editMode.editState.cellErrors[rowId]?.[col.name];
            const isCurrentlyEditing = editMode.editState.editingCell?.rowId === rowId && 
                                       editMode.editState.editingCell?.columnKey === col.name;

            if (isEditable && config) {
              return (
                <EditableCell
                  value={editedValue}
                  config={config}
                  onChange={(newValue: any) => editMode.commitEdit(rowId, col.name, newValue)}
                  onCommit={() => editMode.cancelEdit()}
                  onCancel={() => editMode.cancelEdit()}
                  editing={isCurrentlyEditing}
                  onStartEdit={() => editMode.startEdit(rowId, col.name)}
                  error={hasError}
                  columnKey={col.name}
                />
              );
            }

            // Special rendering for priority
            if (col.name === 'priority' && editedValue) {
              const variants: Record<number, string> = {
                1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
                3: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
              };
              return <Badge className={variants[editedValue] || ""}>{editedValue}</Badge>;
            }

            // Special rendering for gp_name with URL
            if (col.name === 'gp_name' && row.gp_url) {
              return (
                <a 
                  href={row.gp_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {editedValue}
                </a>
              );
            }

            // Truncate long text
            if (col.name === 'industry_sector_focus' && editedValue && String(editedValue).length > 50) {
              return <div className="truncate max-w-xs" title={editedValue}>{editedValue}</div>;
            }

            return <div>{editedValue ?? ''}</div>;
          },
        };
      });

    // Add Actions column at the beginning
    const actionsColumn: ColumnDef<HorizonGp> = {
      key: 'actions',
      label: 'Actions',
      width: 100,
      enableHiding: false,
      render: (value: any, row: HorizonGp) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              Actions
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedGp(row);
                setIsDrawerOpen(true);
              }}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setGpToDelete(row);
                setDeleteConfirmOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    };

    return [actionsColumn, ...baseColumns];
  }, [editMode.editState, columnVisibility.columnVisibility]);
  
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  
  useEffect(() => {
    fetchGps();
  }, [sortLevels, filtersKey, searchTerm]);

  const fetchGps = async () => {
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;
    
    try {
      setLoading(true);
      let query = supabase.from("lg_horizons_gps").select("*").limit(10000);

      // Apply filters
      if (filters.state.length > 0) query = query.in('fund_hq_state', filters.state);
      if (filters.city.length > 0) query = query.in('fund_hq_city', filters.city);
      if (filters.priority.length > 0) {
        const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
        if (vals.length > 0) query = query.in('priority', vals);
      }
      if (filters.aumMin != null) query = query.gte('aum_numeric', filters.aumMin * 1_000_000_000);
      if (filters.aumMax != null) query = query.lte('aum_numeric', filters.aumMax * 1_000_000_000);
      if (filters.activeFundsMin != null) query = query.gte('active_funds', filters.activeFundsMin);
      if (filters.activeFundsMax != null) query = query.lte('active_funds', filters.activeFundsMax);
      if (filters.activeHoldingsMin != null) query = query.gte('active_holdings', filters.activeHoldingsMin);
      if (filters.activeHoldingsMax != null) query = query.lte('active_holdings', filters.activeHoldingsMax);
      
      // LG Relationship filter with special "No Known Relationship" handling
      if (filters.lgRelationship.length > 0) {
        const hasNoKnownRelationship = filters.lgRelationship.includes('NO_KNOWN_RELATIONSHIP');
        const regularValues = filters.lgRelationship.filter(v => v !== 'NO_KNOWN_RELATIONSHIP');
        
        if (hasNoKnownRelationship && regularValues.length > 0) {
          query = query.or(`lg_relationship.is.null,lg_relationship.eq.,lg_relationship.in.(${regularValues.join(',')})`);
        } else if (hasNoKnownRelationship) {
          query = query.or('lg_relationship.is.null,lg_relationship.eq.');
        } else {
          query = query.in('lg_relationship', regularValues);
        }
      }
      
      // Industry/Sector filter
      if (filters.industrySector.length > 0) {
        const conditions = filters.industrySector.map(sector => `industry_sector_focus.ilike.%${sector}%`).join(',');
        query = query.or(conditions);
      }

      // Search
      if (searchTerm.trim()) {
        query = query.or(`gp_name.ilike.%${searchTerm}%,industry_sector_focus.ilike.%${searchTerm}%`);
      }

      // Apply multi-sort
      const serverOrders = buildSupabaseOrder(sortLevels);
      if (serverOrders.length > 0) {
        serverOrders.forEach(order => {
          query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
        });
      } else {
        query = query.order('priority', { ascending: true, nullsFirst: false })
                     .order('gp_name', { ascending: true });
      }

      const { data, error } = await query;

      if (requestIdRef.current !== requestId) return;

      if (error) {
        console.error("Error fetching GPs:", error);
        toast({ title: "Error", description: "Failed to fetch GPs.", variant: "destructive" });
        return;
      }

      const sortedData = applyClientSort(data || [], sortLevels);
      setGps(sortedData as HorizonGp[]);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        requestIdRef.current = null;
      }
    }
  };

  const handleRowClick = (gp: HorizonGp) => {
    setSelectedGp(gp);
    setIsDrawerOpen(true);
  };

  const handleRowDoubleClick = () => {
    if (!editMode.editState.editMode) {
      editMode.toggleEditMode();
    }
  };

  const handleSortChange = (newSortLevels: SortLevel[]) => {
    setSortLevels(newSortLevels);
    saveSortState('lg_horizons_gps', newSortLevels);
  };

  const handleClearSort = () => {
    setSortLevels([]);
    clearSortState('lg_horizons_gps');
  };

  const handleDeleteGp = async (gpId: string) => {
    try {
      const { error } = await supabase.from('lg_horizons_gps').delete().eq('id', gpId);
      if (error) throw error;
      toast({ title: "Success", description: "GP deleted successfully" });
      if (selectedRows.includes(gpId)) {
        onSelectionChange?.(selectedRows.filter(id => id !== gpId));
      }
      await fetchGps();
    } catch (error) {
      console.error('Error deleting GP:', error);
      toast({ title: "Error", description: "Failed to delete GP.", variant: "destructive" });
    }
  };

  const editedRowsCount = Object.keys(editMode.editState.editedRows).length;

  return (
    <div className="space-y-4">
      <EditToolbar
        editMode={editMode.editState.editMode}
        onToggleEditMode={editMode.toggleEditMode}
        editedRowsCount={editedRowsCount}
        onSave={editMode.saveChanges}
        onDiscard={editMode.discardChanges}
        isSaving={editMode.isSaving}
      />

      <SortChips
        sortLevels={sortLevels}
        columns={columnOptions}
        onClear={handleClearSort}
        className="mb-2"
      />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {gps.length} GP{gps.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="flex gap-2">
          <HorizonGpExportDropdown
            data={gps}
            selectedRows={new Set(selectedRows)}
            visibleColumns={dynamicColumns
              .filter(col => col.key !== 'actions' && columnVisibility.columnVisibility[col.key] !== false)
              .map(col => col.key)}
          />
          
          <ColumnsMenu
            columns={dynamicColumns}
            columnVisibility={columnVisibility.columnVisibility}
            onColumnVisibilityChange={columnVisibility.updateColumnVisibility}
            onShowAll={(columns) => columnVisibility.showAllColumns(columns)}
            onHideAll={(columns) => columnVisibility.hideAllColumns(columns)}
          />

          <Button variant="outline" size="sm" onClick={() => setIsSortDialogOpen(true)}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>

          <SplitButton
            label="Add GP"
            primaryAction={() => setIsAddDialogOpen(true)}
            menu={[{ label: 'Import CSV/Excel', onClick: () => setIsImportModalOpen(true) }]}
            icon={<Plus className="h-4 w-4" />}
          />
        </div>
      </div>

      <ResponsiveAdvancedTable
        data={gps}
        hideExportButton={true}
        columns={dynamicColumns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRowClick={handleRowClick}
        onRowDoubleClick={handleRowDoubleClick}
        editMode={editMode.editState.editMode}
        emptyState={{
          title: "No GPs found",
          description: "Try adjusting your search or filters, or add a new GP.",
        }}
        enableRowSelection={true}
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
        idKey="id"
        initialPageSize={50}
        tableId="horizon-gps-table"
        tableType="opportunities"
        hideColumnsButton={true}
        enableResizing={true}
        persistKey="horizon-gps"
        enableColumnReordering={true}
      />

      <HorizonGpDrawer
        gp={selectedGp}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onGpUpdated={fetchGps}
      />

      <AddHorizonGpDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onGpAdded={() => {
          fetchGps();
          setIsAddDialogOpen(false);
        }}
      />

      <MultiSortDialog
        open={isSortDialogOpen}
        onOpenChange={setIsSortDialogOpen}
        columns={columnOptions}
        sortLevels={sortLevels}
        onApply={handleSortChange}
      />

      <BulkImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        entityType="opportunities"
        onImportComplete={() => fetchGps()}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          if (gpToDelete) handleDeleteGp(gpToDelete.id);
          setDeleteConfirmOpen(false);
          setGpToDelete(null);
        }}
        title="Delete GP"
        description={`Are you sure you want to delete "${gpToDelete?.gp_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
