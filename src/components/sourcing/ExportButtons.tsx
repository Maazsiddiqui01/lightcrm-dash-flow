import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
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
      'EBITDA (M$)',
      'IP1',
      'IP2',
      'Date of Origination',
      'Referral Contact 1',
      'Referral Contact 2',
      'Referral Company'
    ];

    const csvData = opportunities.map(opp => {
      // Calculate derived values from actual database fields
      const isPlatform = opp.platform_add_on?.toLowerCase().includes('platform') ? 'Yes' : 'No';
      const isAddon = opp.platform_add_on?.toLowerCase().includes('add') ? 'Yes' : 'No';
      const isFamilyFounder = (opp.ownership_type?.toLowerCase().includes('family') || 
                               opp.ownership_type?.toLowerCase().includes('founder')) ? 'Yes' : 'No';
      
      return [
        opp.deal_name || '',
        opp.status || '',
        opp.tier || '',
        opp.sector || '',
        opp.lg_focus_area || '',
        isPlatform,
        isAddon,
        isFamilyFounder,
        opp.ebitda_in_ms || '',
        opp.investment_professional_point_person_1 || '',
        opp.investment_professional_point_person_2 || '',
        opp.date_of_origination || '',
        opp.deal_source_individual_1 || '',
        opp.deal_source_individual_2 || '',
        opp.deal_source_company || ''
      ];
    });

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
      <span className="text-sm text-muted-foreground">
        {opportunities.length} opportunities
      </span>
    </div>
  );
}