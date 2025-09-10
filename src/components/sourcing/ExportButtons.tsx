import { Button } from '@/components/ui/button';
import { Download, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonsProps {
  opportunities: any[];
  filters: any;
}

export function ExportButtons({ opportunities, filters }: ExportButtonsProps) {
  const { toast } = useToast();

  const exportToCsv = () => {
    if (opportunities.length === 0) {
      toast({
        title: "No data to export",
        description: "Apply filters to get opportunities data.",
      });
      return;
    }

    const headers = [
      'Deal Name',
      'Status',
      'Tier',
      'Sector',
      'LG Focus Area',
      'Platform',
      'Add-on',
      'Family/Founder',
      'EBITDA (Ms)',
      'IP1',
      'IP2',
      'Date of Origination',
      'Referral Contact 1',
      'Referral Contact 2',
      'Referral Company'
    ];

    const csvData = opportunities.map(opp => [
      opp.deal_name || '',
      opp.status || '',
      opp.tier || '',
      opp.sector || '',
      opp.lg_focus_area || '',
      opp.is_platform ? 'Yes' : 'No',
      opp.is_addon ? 'Yes' : 'No',
      opp.is_family_founder ? 'Yes' : 'No',
      opp.ebitda_m || '',
      opp.ip1 || '',
      opp.ip2 || '',
      opp.date_of_origination_raw || '',
      opp.referral_contact_1 || '',
      opp.referral_contact_2 || '',
      opp.referral_company || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sourcing-greatness-opportunities-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Export successful",
      description: `Exported ${opportunities.length} opportunities to CSV.`,
    });
  };

  const exportToJson = () => {
    if (opportunities.length === 0) {
      toast({
        title: "No data to export",
        description: "Apply filters to get opportunities data.",
      });
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      filters: filters,
      count: opportunities.length,
      opportunities: opportunities
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sourcing-greatness-opportunities-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast({
      title: "Export successful",
      description: `Exported ${opportunities.length} opportunities to JSON.`,
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCsv}
        className="flex items-center space-x-2"
      >
        <Download className="h-4 w-4" />
        <span>CSV</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToJson}
        className="flex items-center space-x-2"
      >
        <FileJson className="h-4 w-4" />
        <span>JSON</span>
      </Button>
      <span className="text-sm text-muted-foreground">
        {opportunities.length} opportunities
      </span>
    </div>
  );
}