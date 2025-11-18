import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jsonToCsv, downloadFile } from '@/utils/csvExport';
import { 
  fetchFilteredOpportunityIds, 
  fetchOpportunitiesByIds, 
} from '@/utils/exportDetailedCsv';
import { READ_ONLY_OPPORTUNITY_COLUMNS } from '@/utils/opportunityColumnMapping';
import { downloadExcel, generateExcelFilename, safeCell, generateExportFilename } from '@/lib/export/csvUtils';

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

  const handleCsvExport = async () => {
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

      // Fetch full rows from opportunities_raw
      const rows = await fetchOpportunitiesByIds(ids);
      
      if (!rows.length) {
        toast({
          title: 'No rows to export',
          variant: 'destructive',
        });
        return;
      }

      // Filter to visible columns
      let exportData = rows;
      if (visibleColumns && visibleColumns.length > 0) {
        const columnsToExport = visibleColumns.filter(col => 
          col !== 'actions' && 
          (col === 'id' || !READ_ONLY_OPPORTUNITY_COLUMNS.includes(col as any))
        );
        
        exportData = rows.map(row => {
          const filteredRow: any = {};
          
          // Always include ID as first column
          if (row.id) {
            filteredRow.id = row.id;
          }
          
          // Add other columns
          columnsToExport.forEach(col => {
            if (col !== 'id') {
              filteredRow[col] = row[col];
            }
          });
          
          return filteredRow;
        });
      } else {
        // If no visible columns specified, filter out actions and read-only columns
        exportData = rows.map(row => {
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
      const filename = generateExportFilename('opportunities');
      downloadFile(csv, filename, 'text/csv');

      toast({
        title: `Exported ${exportData.length} opportunities`,
      });
    } catch (error: any) {
      console.error('CSV export failed:', error);
      toast({
        title: 'Export failed',
        description: error?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExcelExport = async () => {
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

      const rows = await fetchOpportunitiesByIds(ids);
      
      if (!rows.length) {
        toast({
          title: 'No rows to export',
          variant: 'destructive',
        });
        return;
      }

      // Filter to visible columns
      let exportData = rows;
      let orderedColumns: string[] = [];
      
      if (visibleColumns && visibleColumns.length > 0) {
        const columnsToExport = visibleColumns.filter(col => 
          col !== 'actions' && 
          (col === 'id' || !READ_ONLY_OPPORTUNITY_COLUMNS.includes(col as any))
        );
        
        // Ensure 'id' is first
        const columnsWithoutId = columnsToExport.filter(col => col !== 'id');
        orderedColumns = ['id', ...columnsWithoutId];
        
        exportData = rows.map(row => {
          const filteredRow: any = {};
          orderedColumns.forEach(col => {
            filteredRow[col] = row[col];
          });
          return filteredRow;
        });
      } else {
        // Get all columns except actions and read-only
        const allKeys = Object.keys(rows[0] || {});
        orderedColumns = ['id', ...allKeys.filter(k => 
          k !== 'id' && k !== 'actions' && !READ_ONLY_OPPORTUNITY_COLUMNS.includes(k as any)
        )];
        
        exportData = rows.map(row => {
          const filtered: any = {};
          orderedColumns.forEach(col => {
            filtered[col] = row[col];
          });
          return filtered;
        });
      }

      const headers = orderedColumns;
      const dataRows = exportData.map(row => 
        headers.map(h => safeCell(row[h]))
      );

      // Generate hyperlinks for deal names with URLs
      const hyperlinks: { row: number; col: number; url: string; display: string }[] = [];
      exportData.forEach((row, rowIndex) => {
        orderedColumns.forEach((colKey, colIndex) => {
          if (colKey === 'deal_name' && row.url) {
            hyperlinks.push({
              row: rowIndex + 1, // +1 for header row
              col: colIndex,
              url: row.url,
              display: row.deal_name || ''
            });
          }
        });
      });

      const filename = generateExcelFilename('opportunities');
      downloadExcel(filename, headers, dataRows, hyperlinks);

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
          onClick={handleCsvExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleExcelExport}
          disabled={isExporting}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}