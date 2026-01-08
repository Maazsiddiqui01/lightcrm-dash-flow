import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LG_HORIZONS_COMPANIES_COLUMNS } from "@/lib/supabase/horizonColumns";

interface HorizonCompanyExportDropdownProps {
  data: any[];
  selectedRows: Set<string>;
  visibleColumns?: string[];
}

export function HorizonCompanyExportDropdown({ data, selectedRows, visibleColumns }: HorizonCompanyExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const getColumnLabel = (key: string): string => {
    const col = LG_HORIZONS_COMPANIES_COLUMNS.find(c => c.name === key);
    return col?.displayName || key;
  };

  const exportToCsv = (rows: any[], filename: string) => {
    const columns = visibleColumns?.filter(c => c !== 'actions') || 
      LG_HORIZONS_COMPANIES_COLUMNS.map(c => c.name).filter(c => !['id', 'created_at', 'updated_at'].includes(c));
    
    const headers = columns.map(getColumnLabel);
    const csvRows = [
      headers.join(','),
      ...rows.map(row => 
        columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n') 
            ? `"${str.replace(/"/g, '""')}"` 
            : str;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      exportToCsv(data, 'horizon-companies-all');
      toast({ title: "Export Complete", description: `Exported ${data.length} companies` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to export data", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async () => {
    if (selectedRows.size === 0) {
      toast({ title: "No Selection", description: "Select rows to export", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const selected = data.filter(row => selectedRows.has(row.id));
      exportToCsv(selected, 'horizon-companies-selected');
      toast({ title: "Export Complete", description: `Exported ${selected.length} companies` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to export data", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportAll}>
          Export All ({data.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportSelected} disabled={selectedRows.size === 0}>
          Export Selected ({selectedRows.size})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
