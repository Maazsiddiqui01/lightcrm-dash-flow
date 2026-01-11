import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CombinedCompany {
  id: string;
  priority: number | null;
  company_name: string;
  company_url: string | null;
  sector: string | null;
  subsector: string | null;
  ebitda: string | null;
  revenue: string | null;
  ownership: string | null;
  parent_gp_name: string | null;
  parent_gp_id: string | null;
  gp_aum: string | null;
  lg_relationship: string | null;
  gp_contact: string | null;
  process_status: string | null;
  company_hq_city: string | null;
  company_hq_state: string | null;
  source: string | null;
  description: string | null;
  gp_data?: {
    id: string;
    gp_name: string;
    gp_url: string | null;
    aum: string | null;
    lg_relationship: string | null;
    gp_contact: string | null;
    fund_hq_city: string | null;
    fund_hq_state: string | null;
    active_funds: number | null;
    total_funds: number | null;
    active_holdings: number | null;
    industry_sector_focus: string | null;
  } | null;
}

interface HorizonCombinedExportDropdownProps {
  data: CombinedCompany[];
}

// Combined columns for export - includes both company and GP fields
const COMBINED_EXPORT_COLUMNS = [
  { key: 'priority', label: 'Priority' },
  { key: 'company_name', label: 'Company' },
  { key: 'company_url', label: 'Company URL' },
  { key: 'sector', label: 'Sector' },
  { key: 'subsector', label: 'Subsector' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'process_status', label: 'Process Status' },
  { key: 'ownership', label: 'Ownership' },
  { key: 'company_hq_city', label: 'Company HQ City' },
  { key: 'company_hq_state', label: 'Company HQ State' },
  { key: 'source', label: 'Source' },
  { key: 'description', label: 'Company Description' },
  // GP fields
  { key: 'gp_name', label: 'GP Name', fromGp: true },
  { key: 'gp_url', label: 'GP URL', fromGp: true },
  { key: 'gp_aum', label: 'GP AUM' },
  { key: 'lg_relationship', label: 'LG Relationship' },
  { key: 'gp_contact', label: 'GP Contact' },
  { key: 'fund_hq_city', label: 'GP HQ City', fromGp: true },
  { key: 'fund_hq_state', label: 'GP HQ State', fromGp: true },
  { key: 'active_funds', label: 'GP Active Funds', fromGp: true },
  { key: 'total_funds', label: 'GP Total Funds', fromGp: true },
  { key: 'active_holdings', label: 'GP Active Holdings', fromGp: true },
  { key: 'industry_sector_focus', label: 'GP Industry/Sector Focus', fromGp: true },
];

export function HorizonCombinedExportDropdown({ data }: HorizonCombinedExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const getRowValue = (row: CombinedCompany, column: { key: string; fromGp?: boolean }): string => {
    if (column.fromGp && row.gp_data) {
      const val = (row.gp_data as any)[column.key];
      if (val === null || val === undefined) return '';
      return String(val);
    }
    
    // For GP fields that might also exist on the company
    if (column.key === 'gp_name') {
      return row.gp_data?.gp_name || row.parent_gp_name || '';
    }
    if (column.key === 'gp_aum') {
      return row.gp_data?.aum || row.gp_aum || '';
    }
    if (column.key === 'lg_relationship') {
      return row.gp_data?.lg_relationship || row.lg_relationship || '';
    }
    if (column.key === 'gp_contact') {
      return row.gp_data?.gp_contact || row.gp_contact || '';
    }
    
    const val = (row as any)[column.key];
    if (val === null || val === undefined) return '';
    return String(val);
  };

  const exportToCsv = (rows: CombinedCompany[], filename: string) => {
    const headers = COMBINED_EXPORT_COLUMNS.map(c => c.label);
    const csvRows = [
      headers.join(','),
      ...rows.map(row => 
        COMBINED_EXPORT_COLUMNS.map(col => {
          const val = getRowValue(row, col);
          return val.includes(',') || val.includes('"') || val.includes('\n') 
            ? `"${val.replace(/"/g, '""')}"` 
            : val;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
      exportToCsv(data, 'horizon-combined-all');
      toast({ title: "Export Complete", description: `Exported ${data.length} records (companies with GP data)` });
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
