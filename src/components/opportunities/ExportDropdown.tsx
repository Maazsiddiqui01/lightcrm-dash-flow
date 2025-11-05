import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jsonToCsv, downloadFile } from '@/utils/csvExport';
import { 
  fetchFilteredOpportunityIds, 
  fetchOpportunitiesByIds, 
  buildCsvFromObjects,
  generateExportFilename 
} from '@/utils/exportDetailedCsv';

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
        exportData = data.map(row => {
          const filteredRow: any = {};
          
          // Always include ID as first column
          if (row.id) {
            filteredRow.id = row.id;
          }
          
          // Add other visible columns
          visibleColumns.forEach(col => {
            if (col !== 'id') { // Skip id since we already added it
              filteredRow[col] = row[col];
            }
          });
          
          return filteredRow;
        });
      } else {
        // If no visible columns specified, ensure id is first
        exportData = data.map(row => {
          const { id, ...rest } = row;
          return { id, ...rest };
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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleSummaryExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          Summary CSV
          <span className="ml-auto text-xs text-muted-foreground">
            Visible columns
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleDetailedExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          Detailed CSV
          <span className="ml-auto text-xs text-muted-foreground">
            All fields
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}