import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaged } from "@/utils/supabaseFetchAll";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ColumnDef } from "@/components/shared/AdvancedTable";
import { HorizonCompanyDrawer } from "./HorizonCompanyDrawer";
import { AddHorizonCompanyDialog } from "./AddHorizonCompanyDialog";
import { BulkImportModal } from "@/components/data-maintenance/BulkImportModal";
import { HorizonCompanyExportDropdown } from "./HorizonCompanyExportDropdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUpDown, ChevronDown, Trash2, FileText, ListTodo, Star } from "lucide-react";
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
import { LG_HORIZONS_COMPANIES_COLUMNS } from "@/lib/supabase/horizonColumns";
import { useEditMode } from "@/hooks/useEditMode";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { EditToolbar } from "@/components/shared/EditToolbar";
import { horizonCompaniesEditable } from "@/config/horizonEditableColumns";
import { EditableCell } from "@/components/shared/EditableCell";
import { NotesNextStepsDialog } from "@/components/horizons/shared/NotesNextStepsDialog";

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
import { format } from "date-fns";
import { parseFlexibleDate } from "@/utils/dateUtils";

interface HorizonCompany {
  id: string;
  priority: number | null;
  company_name: string;
  company_url: string | null;
  sector: string | null;
  subsector: string | null;
  ebitda: string | null;
  ebitda_numeric: number | null;
  revenue: string | null;
  revenue_numeric: number | null;
  ownership: string | null;
  parent_gp_name: string | null;
  gp_aum: string | null;
  gp_aum_numeric: number | null;
  lg_relationship: string | null;
  gp_contact: string | null;
  process_status: string | null;
  original_date: string | null;
  latest_process_date: string | null;
  company_hq_city: string | null;
  company_hq_state: string | null;
  date_of_acquisition: string | null;
  description: string | null;
  additional_size_info: string | null;
  additional_information: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface HorizonCompanyFilters {
  sector: string[];
  subsector: string[];
  processStatus: string[];
  ownership: string[];
  priority: string[];
  lgRelationship: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  gpAumMin?: number;
  gpAumMax?: number;
  state: string[];
  city: string[];
  source: string[];
  parentGp: string[];
  dateOfAcquisitionStart?: string;
  dateOfAcquisitionEnd?: string;
}

interface HorizonCompaniesTableProps {
  filters: HorizonCompanyFilters;
  selectedRows?: string[];
  onSelectionChange?: (rows: string[]) => void;
}

export function HorizonCompaniesTable({ filters, selectedRows = [], onSelectionChange }: HorizonCompaniesTableProps) {
  const [companies, setCompanies] = useState<HorizonCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<HorizonCompany | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<HorizonCompany | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogTab, setNotesDialogTab] = useState<"notes" | "next_steps">("notes");
  const [notesDialogCompany, setNotesDialogCompany] = useState<HorizonCompany | null>(null);
  const { toast } = useToast();
  
  const requestIdRef = useRef<string | null>(null);
  
  // Multi-sort state
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  
  // Debounce search term to prevent table resets on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load sort state on mount
  useEffect(() => {
    const savedSort = loadSortState('lg_horizons_companies');
    setSortLevels(savedSort);
  }, []);
  
  // Edit mode for horizon companies
  const editMode = useEditMode('lg_horizons_companies', companies, setCompanies);
  const columnVisibility = useColumnVisibility('columns:lg_horizons_companies');
  
  // Create column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => {
    return LG_HORIZONS_COMPANIES_COLUMNS.map(col => ({
      key: col.name,
      label: col.displayName,
    }));
  }, []);

  // Format cell value for display
  const formatCellValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return '';
    if (type === 'date' || type === 'timestamp with time zone') {
      const date = parseFlexibleDate(value);
      if (date) return format(date, 'MMM dd, yyyy');
    }
    return String(value);
  };

  // Create dynamic columns
  const dynamicColumns = useMemo(() => {
    const baseColumns: ColumnDef<HorizonCompany>[] = LG_HORIZONS_COMPANIES_COLUMNS
      .filter(col => col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at' && 
                     col.name !== 'ebitda_numeric' && col.name !== 'revenue_numeric' && col.name !== 'gp_aum_numeric')
      .map((col): ColumnDef<HorizonCompany> => {
        const isEditable = editMode.editState.editMode && col.name in horizonCompaniesEditable;
        const config = horizonCompaniesEditable[col.name];
        const isVisible = columnVisibility.columnVisibility[col.name] !== false;

        return {
          key: col.name,
          label: col.displayName,
          visible: isVisible,
          enableHiding: true,
          resizable: true,
          width: col.name === 'company_name' ? 200 : col.name === 'description' ? 250 : 120,
          render: (value: any, row: HorizonCompany) => {
            const rowId = String(row.id);
            const editedValue = editMode.editState.editedRows[rowId]?.[col.name] ?? value;
            const hasError = editMode.editState.cellErrors[rowId]?.[col.name];
            const isCurrentlyEditing = editMode.editState.editingCell?.rowId === rowId && 
                                       editMode.editState.editingCell?.columnKey === col.name;

            // Editable cell
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

            // Special rendering for company_name with URL
            if (col.name === 'company_name' && row.company_url) {
              return (
                <a 
                  href={row.company_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {editedValue}
                </a>
              );
            }

            // Special rendering for process_status
            if (col.name === 'process_status' && editedValue) {
              return <Badge variant="outline">{editedValue}</Badge>;
            }

            return <div>{formatCellValue(editedValue, col.type)}</div>;
          },
        };
      });

    // Add Actions column at the beginning
    const actionsColumn: ColumnDef<HorizonCompany> = {
      key: 'actions',
      label: 'Actions',
      width: 100,
      enableHiding: false,
      render: (value: any, row: HorizonCompany) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              Actions
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async (e) => {
                e.stopPropagation();
                const { error } = await supabase
                  .from('lg_horizons_companies')
                  .update({ priority: 1 })
                  .eq('id', row.id);
                if (error) {
                  toast({ title: "Error", description: "Failed to set priority", variant: "destructive" });
                } else {
                  toast({ title: "Success", description: "Priority set to 1" });
                  fetchCompanies();
                }
              }}
            >
              <Star className="h-4 w-4 mr-2" />
              Set Priority 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCompany(row);
                setIsDrawerOpen(true);
              }}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setNotesDialogCompany(row);
                setNotesDialogTab("notes");
                setNotesDialogOpen(true);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Notes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setNotesDialogCompany(row);
                setNotesDialogTab("next_steps");
                setNotesDialogOpen(true);
              }}
            >
              <ListTodo className="h-4 w-4 mr-2" />
              Add Next Steps
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCompanyToDelete(row);
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
  
  // Stable key for filters
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  
  useEffect(() => {
    fetchCompanies();
  }, [sortLevels, filtersKey, debouncedSearchTerm]);

  const fetchCompanies = async () => {
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;
    
    try {
      setLoading(true);
      
      // Create a query factory for paged fetching
      const makeQuery = (from: number, to: number) => {
        let query = supabase.from("lg_horizons_companies").select("*").range(from, to);

        // Apply filters
        if (filters.sector.length > 0) query = query.in('sector', filters.sector);
        if (filters.subsector.length > 0) query = query.in('subsector', filters.subsector);
        if (filters.processStatus.length > 0) query = query.in('process_status', filters.processStatus);
        if (filters.ownership.length > 0) query = query.in('ownership', filters.ownership);
        if (filters.priority.length > 0) {
          const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
          if (vals.length > 0) query = query.in('priority', vals);
        }
        if (filters.state.length > 0) query = query.in('company_hq_state', filters.state);
        if (filters.city.length > 0) query = query.in('company_hq_city', filters.city);
        if (filters.source.length > 0) query = query.in('source', filters.source);
        if (filters.parentGp.length > 0) query = query.in('parent_gp_name', filters.parentGp);
        if (filters.ebitdaMin != null) query = query.gte('ebitda_numeric', filters.ebitdaMin);
        if (filters.ebitdaMax != null) query = query.lte('ebitda_numeric', filters.ebitdaMax);
        if (filters.revenueMin != null) query = query.gte('revenue_numeric', filters.revenueMin);
        if (filters.revenueMax != null) query = query.lte('revenue_numeric', filters.revenueMax);
        if (filters.gpAumMin != null) query = query.gte('gp_aum_numeric', filters.gpAumMin);
        if (filters.gpAumMax != null) query = query.lte('gp_aum_numeric', filters.gpAumMax);
        
        // Note: date_of_acquisition filtering is done client-side because it's stored as text in various formats
        
        // LG Relationship filter with special "No Known Relationship" handling
        // Using ilike for partial matching since lg_relationship can contain comma-separated names
        if (filters.lgRelationship.length > 0) {
          const hasNoKnownRelationship = filters.lgRelationship.includes('NO_KNOWN_RELATIONSHIP');
          const regularValues = filters.lgRelationship.filter(v => v !== 'NO_KNOWN_RELATIONSHIP');
          
          if (hasNoKnownRelationship && regularValues.length > 0) {
            const likeConditions = regularValues.map(name => `lg_relationship.ilike.%${name}%`).join(',');
            query = query.or(`lg_relationship.is.null,lg_relationship.eq.,${likeConditions}`);
          } else if (hasNoKnownRelationship) {
            query = query.or('lg_relationship.is.null,lg_relationship.eq.');
          } else if (regularValues.length > 0) {
            const likeConditions = regularValues.map(name => `lg_relationship.ilike.%${name}%`).join(',');
            query = query.or(likeConditions);
          }
        }

        // Search
        if (debouncedSearchTerm.trim()) {
          query = query.or(`company_name.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%,sector.ilike.%${debouncedSearchTerm}%`);
        }

        // Apply multi-sort with stable tie-breaker
        const serverOrders = buildSupabaseOrder(sortLevels);
        if (serverOrders.length > 0) {
          serverOrders.forEach(order => {
            query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
          });
        } else {
          query = query.order('priority', { ascending: true, nullsFirst: false })
                       .order('company_name', { ascending: true });
        }
        // Always add id as final tie-breaker for stable pagination
        query = query.order('id', { ascending: true });
        
        return query;
      };

      let data = await fetchAllPaged<HorizonCompany>(makeQuery);

      if (requestIdRef.current !== requestId) return;

      // Apply date of acquisition filter client-side (stored as text in various formats)
      if (filters.dateOfAcquisitionStart) {
        const startDate = parseFlexibleDate(filters.dateOfAcquisitionStart);
        if (startDate) {
          data = data.filter(c => {
            if (!c.date_of_acquisition) return false;
            const acqDate = parseFlexibleDate(c.date_of_acquisition);
            return acqDate && acqDate >= startDate;
          });
        }
      }
      if (filters.dateOfAcquisitionEnd) {
        const endDate = parseFlexibleDate(filters.dateOfAcquisitionEnd);
        if (endDate) {
          data = data.filter(c => {
            if (!c.date_of_acquisition) return false;
            const acqDate = parseFlexibleDate(c.date_of_acquisition);
            return acqDate && acqDate <= endDate;
          });
        }
      }

      const sortedData = applyClientSort(data, sortLevels);
      setCompanies(sortedData as HorizonCompany[]);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({ title: "Error", description: "Failed to fetch companies.", variant: "destructive" });
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        requestIdRef.current = null;
      }
    }
  };

  const handleRowClick = (company: HorizonCompany) => {
    setSelectedCompany(company);
    setIsDrawerOpen(true);
  };

  const handleRowDoubleClick = () => {
    if (!editMode.editState.editMode) {
      editMode.toggleEditMode();
    }
  };

  const handleSortChange = (newSortLevels: SortLevel[]) => {
    setSortLevels(newSortLevels);
    saveSortState('lg_horizons_companies', newSortLevels);
  };

  const handleClearSort = () => {
    setSortLevels([]);
    clearSortState('lg_horizons_companies');
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      const { error } = await supabase.from('lg_horizons_companies').delete().eq('id', companyId);
      if (error) throw error;
      toast({ title: "Success", description: "Company deleted successfully" });
      if (selectedRows.includes(companyId)) {
        onSelectionChange?.(selectedRows.filter(id => id !== companyId));
      }
      await fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({ title: "Error", description: "Failed to delete company.", variant: "destructive" });
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
            {companies.length} Compan{companies.length !== 1 ? 'ies' : 'y'}
          </h3>
        </div>
        <div className="flex gap-2">
          <HorizonCompanyExportDropdown
            data={companies}
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
            label="Add Company"
            primaryAction={() => setIsAddDialogOpen(true)}
            menu={[]}
            icon={<Plus className="h-4 w-4" />}
          />
        </div>
      </div>

      <ResponsiveAdvancedTable
        data={companies}
        hideExportButton={true}
        columns={dynamicColumns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRowClick={handleRowClick}
        onRowDoubleClick={handleRowDoubleClick}
        editMode={editMode.editState.editMode}
        emptyState={{
          title: "No companies found",
          description: "Try adjusting your search or filters, or add a new company.",
        }}
        enableRowSelection={true}
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
        idKey="id"
        initialPageSize={50}
        tableId="horizon-companies-table"
        tableType="opportunities"
        hideColumnsButton={true}
        enableResizing={true}
        persistKey="horizon-companies"
        enableColumnReordering={true}
      />

      <HorizonCompanyDrawer
        company={selectedCompany}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCompanyUpdated={fetchCompanies}
      />

      <AddHorizonCompanyDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onCompanyAdded={() => {
          fetchCompanies();
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
        onImportComplete={() => fetchCompanies()}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          if (companyToDelete) handleDeleteCompany(companyToDelete.id);
          setDeleteConfirmOpen(false);
          setCompanyToDelete(null);
        }}
        title="Delete Company"
        description={`Are you sure you want to delete "${companyToDelete?.company_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      <NotesNextStepsDialog
        open={notesDialogOpen}
        onClose={() => {
          setNotesDialogOpen(false);
          setNotesDialogCompany(null);
        }}
        recordId={notesDialogCompany?.id || ""}
        tableName="lg_horizons_companies"
        recordName={notesDialogCompany?.company_name || ""}
        initialTab={notesDialogTab}
        onSaved={fetchCompanies}
      />
    </div>
  );
}
