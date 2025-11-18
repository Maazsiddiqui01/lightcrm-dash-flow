import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jsonToCsv, downloadFile } from '@/utils/csvExport';
import { 
  fetchFilteredOpportunityIds, 
  fetchOpportunitiesByIds, 
  buildCsvFromObjects,
  generateExportFilename 
} from '@/utils/exportDetailedCsv';
import { READ_ONLY_OPPORTUNITY_COLUMNS } from '@/utils/opportunityColumnMapping';
import { downloadExcel, generateExcelFilename, safeCell } from '@/lib/export/csvUtils';

interface ExportDropdownProps {
  data: any[];
  selectedRows: Set<string>;
  filters: any;
  visibleColumns?: string[];
}

export function ExportDropdown({ 
  data, 
  selectedRows, 
  filters, 
  visibleColumns 
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleSummaryExport = () => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: 'No data to export',
          variant: 'destructive',
        });
        return;
      }

      // Filter data to visible columns if specified, ensuring 'id' is always first
      let exportData = data;
      if (visibleColumns && visibleColumns.length > 0) {
        // Filter columns: remove 'actions' and read-only columns (keep 'id')
        const columnsToExport = visibleColumns.filter(col => 
          col !== 'actions' && 
          (col === 'id' || !READ_ONLY_OPPORTUNITY_COLUMNS.includes(col as any))
        );
        
        exportData = data.map(row => {
          const filteredRow: any = {};
          
          // Always include ID as first column
          if (row.id) {
            filteredRow.id = row.id;
          }
          
          // Add other columns
          columnsToExport.forEach(col => {
            if (col !== 'id') { // Skip id since we already added it
              filteredRow[col] = row[col];
            }
          });
          
          return filteredRow;
        });
      } else {
        // If no visible columns specified, filter out actions and read-only columns
        exportData = data.map(row => {
          const filtered: any = { id: row.id };
          Object.keys(row).forEach(key => {
            if (key !== 'id' && key !== 'actions' && !READ_ONLY_OPPORTUNITY_COLUMNS.includes(key as any)) {
              filtered[key] = row[key];
            }
          });
          return filtered;
        });
      }

      const csv = jsonToCsv(exportData);
      const filename = generateExportFilename('opportunities-summary');
      downloadFile(csv, filename, 'text/csv');

      toast({
        title: `Exported ${exportData.length} opportunities`,
      });
    } catch (error) {
      console.error('Summary export failed:', error);
      toast({
        title: 'Export failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDetailedExport = async () => {
    try {
      setIsExporting(true);
      
      // Get IDs to export
      const selectedIds = Array.from(selectedRows);
      const ids = selectedIds.length > 0 
        ? selectedIds 
        : await fetchFilteredOpportunityIds(filters);

      if (!ids.length) {
        toast({
          title: 'No rows to export',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Preparing detailed CSV...',
      });

      // Fetch full rows from opportunities_raw
      const rows = await fetchOpportunitiesByIds(ids);
      
      if (!rows.length) {
        toast({
          title: 'No rows to export',
          variant: 'destructive',
        });
        return;
      }

      // Build CSV with all columns
      const csv = buildCsvFromObjects(rows);
      const filename = generateExportFilename('opportunities-detailed');
      downloadFile(csv, filename, 'text/csv');

      toast({
        title: `Exported ${rows.length} opportunities`,
      });
    } catch (error: any) {
      console.error('Detailed export failed:', error);
      toast({
        title: 'Export failed',
        description: error?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSummaryExportExcel = () => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: 'No data to export',
          variant: 'destructive',
        });
        return;
      }

      // Use same filtering logic as CSV
      let exportData = data;
      if (visibleColumns && visibleColumns.length > 0) {
        const columnsToExport = visibleColumns.filter(col => 
          col !== 'actions' && 
          (col === 'id' || !READ_ONLY_OPPORTUNITY_COLUMNS.includes(col as any))
        );
        
        exportData = data.map(row => {
          const filteredRow: any = {};
          if (row.id) {
            filteredRow.id = row.id;
          }
          columnsToExport.forEach(col => {
            if (col !== 'id') {
              filteredRow[col] = row[col];
            }
          });
          return filteredRow;
        });
      } else {
        exportData = data.map(row => {
          const filtered: any = { id: row.id };
          Object.keys(row).forEach(key => {
            if (key !== 'id' && key !== 'actions' && !READ_ONLY_OPPORTUNITY_COLUMNS.includes(key as any)) {
              filtered[key] = row[key];
            }
          });
          return filtered;
        });
      }

      const headers = Object.keys(exportData[0]);
      const rows = exportData.map(row => 
        headers.map(h => safeCell(row[h]))
      );

      const filename = generateExcelFilename('opportunities-summary');
      downloadExcel(filename, headers, rows);

      toast({
        title: `Exported ${exportData.length} opportunities to Excel`,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({
        title: 'Export failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDetailedExportExcel = async () => {
    try {
      setIsExporting(true);
      
      const selectedIds = Array.from(selectedRows);
      const ids = selectedIds.length > 0 
        ? selectedIds 
        : await fetchFilteredOpportunityIds(filters);

      if (!ids.length) {
        toast({
          title: 'No rows to export',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Preparing detailed Excel...',
      });

      const rows = await fetchOpportunitiesByIds(ids);
      
      if (!rows.length) {
        toast({
          title: 'No rows to export',
          variant: 'destructive',
        });
        return;
      }

      const headers = Object.keys(rows[0]);
      const dataRows = rows.map(row => 
        headers.map(h => safeCell(row[h]))
      );

      const filename = generateExcelFilename('opportunities-detailed');
      downloadExcel(filename, headers, dataRows);

      toast({
        title: `Exported ${rows.length} opportunities to Excel`,
      });
    } catch (error: any) {
      console.error('Excel export failed:', error);
      toast({
        title: 'Export failed',
        description: error?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={isExporting}
          className="bg-background"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={handleSummaryExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          Summary CSV
          <span className="ml-auto text-xs text-muted-foreground">
            Current view
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSummaryExportExcel}
          disabled={isExporting}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Summary Excel
          <span className="ml-auto text-xs text-muted-foreground">
            Current view
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDetailedExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          Detailed CSV
          <span className="ml-auto text-xs text-muted-foreground">
            All columns
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleDetailedExportExcel}
          disabled={isExporting}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Detailed Excel
          <span className="ml-auto text-xs text-muted-foreground">
            All columns
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}