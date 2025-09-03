import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/shared/DataTable";
import { InteractionDrawer } from "./InteractionDrawer";
import { AddInteractionDialog } from "./AddInteractionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Mail, Video, Download, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Interaction {
  id: string;
  occurred_at: string;
  subject: string;
  source: string;
  from_name: string;
  from_email: string;
  to_emails: string;
  cc_emails: string;
  organization: string;
  all_emails: string;
  created_at: string;
  updated_at: string;
  to_names: string;
  cc_names: string;
}

export function InteractionsTable() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("occurred_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchInteractions();
  }, [sortKey, sortDirection]);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("interactions_app")
        .select("*");

      if (sortKey && sortDirection) {
        query = query.order(sortKey, { 
          ascending: sortDirection === 'asc',
          nullsFirst: false 
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load interactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchInteractions();
  };

  const filteredInteractions = useMemo(() => {
    return interactions.filter((interaction) => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        interaction.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interaction.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interaction.from_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Source filter
      const sourceMatch = sourceFilter === "all" || !sourceFilter || interaction.source === sourceFilter;

      // Date range filter
      const dateMatch = (!dateRange.from && !dateRange.to) || (() => {
        const occurrenceDate = new Date(interaction.occurred_at);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        
        return (!fromDate || occurrenceDate >= fromDate) && 
               (!toDate || occurrenceDate <= toDate);
      })();

      return searchMatch && sourceMatch && dateMatch;
    });
  }, [interactions, searchTerm, sourceFilter, dateRange]);

  const uniqueSources = useMemo(() => {
    return Array.from(new Set(
      interactions
        .map(interaction => interaction.source)
        .filter(Boolean)
    )).sort();
  }, [interactions]);

  const handleRowClick = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setIsDrawerOpen(true);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short", 
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportToCSV = () => {
    const csvData = filteredInteractions.map(interaction => ({
      'Occurred At': formatDateTime(interaction.occurred_at),
      Subject: interaction.subject || '',
      Source: interaction.source || '',
      'From Name': interaction.from_name || '',
      'From Email': interaction.from_email || '',
      'To Emails': interaction.to_emails || '',
      'CC Emails': interaction.cc_emails || '',
      Organization: interaction.organization || ''
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Transform data for DataTable - keep original data structure
  const tableData = filteredInteractions.map(interaction => ({
    ...interaction,
    // Add formatted display fields
    occurred_at_display: formatDateTime(interaction.occurred_at),
    subject_display: interaction.subject || "—",
    source_display: interaction.source || "—", 
    from_name_display: interaction.from_name || "—",
    to_emails_display: interaction.to_emails || "—",
    cc_emails_display: interaction.cc_emails || "—",
    organization_display: interaction.organization || "—"
  }));

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filters: { label: string; onRemove: () => void }[] = [];
    
    if (sourceFilter !== "all") {
      filters.push({
        label: `Source: ${sourceFilter}`,
        onRemove: () => setSourceFilter("all")
      });
    }

    if (dateRange.from) {
      filters.push({
        label: `From: ${dateRange.from}`,
        onRemove: () => setDateRange(prev => ({ ...prev, from: "" }))
      });
    }

    if (dateRange.to) {
      filters.push({
        label: `To: ${dateRange.to}`,
        onRemove: () => setDateRange(prev => ({ ...prev, to: "" }))
      });
    }

    return filters;
  }, [sourceFilter, dateRange]);

  const clearAllFilters = () => {
    setSourceFilter("all");
    setDateRange({ from: "", to: "" });
    setSearchTerm("");
  };

  return (
    <div className="bg-background">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">All Interactions</h3>
            <p className="text-sm text-muted-foreground">
              {filteredInteractions?.length || 0} interaction{filteredInteractions?.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>

        {/* Search, Filters and Export */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search interactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" onClick={exportToCSV} className="ml-4">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-32 focus-ring">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {uniqueSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="From date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-36 focus-ring"
              />
              
              <Input
                type="date"
                placeholder="To date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-36 focus-ring"
              />
            </div>

            {/* Active filters */}
            {activeFilters.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Filters:</span>
                {activeFilters.map((filter, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {filter.label}
                    <button onClick={filter.onRemove}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* DataTable */}
        <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
          <DataTable
            rows={loading ? undefined : tableData}
            preferredOrder={[
              "occurred_at", "subject", "source", "from_name", 
              "to_emails", "cc_emails", "organization"
            ]}
            initialWidths={{
              occurred_at: 180,
              subject: 300,
              source: 100,
              from_name: 180,
              to_emails: 200,
              cc_emails: 200,
              organization: 180
            }}
            persistKey="interactions"
            onRowClick={(row) => handleRowClick(row as unknown as Interaction)}
          />
        </div>
      </div>

      <InteractionDrawer
        interaction={selectedInteraction}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={refetch}
      />
    </div>
  );
}