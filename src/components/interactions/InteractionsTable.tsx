import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedTable, ColumnDef, TablePreset } from "@/components/shared/AdvancedTable";
import { InteractionDrawer } from "./InteractionDrawer";
import { AddInteractionDialog } from "./AddInteractionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Mail, Video, RefreshCw, Database } from "lucide-react";
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
  const [limit, setLimit] = useState<number | null>(1000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInteractions();
  }, [sortKey, sortDirection, limit]);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      
      console.log('Fetching interactions with limit:', limit);
      
      // Get total count first
      const { count } = await supabase
        .from("interactions_app")
        .select("*", { count: 'exact', head: true });
      
      setTotalCount(count);
      console.log('Total count:', count);
      
      // Build base query with sort first
      const base = supabase
        .from("interactions_app")
        .select("*");

      const applySort = (q: typeof base) =>
        (sortKey && sortDirection)
          ? q.order(sortKey, { ascending: sortDirection === 'asc', nullsFirst: false })
          : q;

      let dataAccum: Interaction[] = [];

      if (limit === null) {
        // Client-side load-all: fetch in 1000-row chunks to avoid PostgREST max row limit
        const total = count ?? 0;
        const pageSize = 1000;

        if (total <= pageSize) {
          const { data, error } = await applySort(base);
          if (error) throw error;
          dataAccum = data || [];
        } else {
          const pages = Math.ceil(total / pageSize);
          for (let p = 0; p < pages; p++) {
            const from = p * pageSize;
            const to = Math.min(from + pageSize - 1, total - 1);
            console.log(`Fetching range ${from}-${to}`);
            const { data, error } = await applySort(base).range(from, to);
            if (error) throw error;
            dataAccum = dataAccum.concat(data || []);
          }
        }
      } else {
        // Limited fetch (default 1000)
        let q = applySort(base);
        if (typeof limit === 'number') {
          q = q.limit(limit);
        }
        const { data, error } = await q;
        if (error) throw error;
        dataAccum = data || [];
      }

      console.log('Fetched interactions total:', dataAccum.length);
      setInteractions(dataAccum);
    } catch (error) {
      console.error('Error fetching interactions:', error);
      toast({
        title: "Error",
        description: "Failed to load interactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const refetch = () => {
    fetchInteractions();
  };

  const handleLoadAll = () => {
    if (totalCount && totalCount > 10000) {
      if (!confirm(`This will load ${totalCount.toLocaleString()} interactions. This may take a moment. Continue?`)) {
        return;
      }
    }
    console.log('Setting limit to null to load all interactions');
    setLimit(null);
  };

  const handleRefresh = () => {
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

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
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

  const getSourceIcon = (source: string) => {
    switch (source?.toLowerCase()) {
      case "email":
        return <Mail className="h-3 w-3" />;
      case "meeting":
        return <Video className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source?.toLowerCase()) {
      case "email":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "meeting":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Column definitions
  const columns: ColumnDef<Interaction>[] = [
    {
      key: "occurred_at",
      label: "Occurred At",
      width: 180,
      minWidth: 160,
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(value)}
        </span>
      )
    },
    {
      key: "subject",
      label: "Subject",
      width: 300,
      minWidth: 200,
      sortable: true,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block font-medium">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{value || "No subject"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "source",
      label: "Source",
      width: 100,
      minWidth: 80,
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={`${getSourceColor(value)} flex items-center gap-1`}>
          {getSourceIcon(value)}
          {value || "—"}
        </Badge>
      )
    },
    {
      key: "from_name",
      label: "From Name",
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{value || "—"}</div>
          <div className="text-xs text-muted-foreground truncate">
            {row.from_email || "—"}
          </div>
        </div>
      )
    },
    {
      key: "to_emails",
      label: "To Emails",
      width: 200,
      minWidth: 150,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{value || "No recipients"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "cc_emails",
      label: "CC Emails",
      width: 200,
      minWidth: 150,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm text-muted-foreground">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{value || "No CC recipients"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "organization",
      label: "Organization",
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (value) => value || "—"
    }
  ];

  // Table presets
  const presets: TablePreset[] = [
    {
      name: "Compact",
      columns: ["occurred_at", "subject", "source", "from_name"]
    },
    {
      name: "Standard",
      columns: ["occurred_at", "subject", "source", "from_name", "to_emails", "organization"]
    },
    {
      name: "Wide",
      columns: ["occurred_at", "subject", "source", "from_name", "to_emails", "cc_emails", "organization"]
    }
  ];

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

  // Filters component
  const filtersComponent = (
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
  );

  const emptyState = {
    title: "No interactions found",
    description: searchTerm || activeFilters.length > 0 
      ? "Try adjusting your search or filters to find interactions."
      : "Start tracking your communications by adding your first interaction.",
    action: <AddInteractionDialog onInteractionAdded={refetch} />
  };

  return (
    <div className="bg-background">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">All Interactions</h3>
            <p className="text-sm text-muted-foreground">
              Showing {filteredInteractions?.length || 0} of {interactions.length} loaded
              {totalCount && interactions.length < totalCount && (
                <span className="text-amber-600 ml-1">
                  ({(totalCount - interactions.length).toLocaleString()} more available)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {totalCount && interactions.length < totalCount && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadAll}
                disabled={loading}
              >
                <Database className="h-4 w-4 mr-2" />
                Load All ({totalCount.toLocaleString()} total)
              </Button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
          <AdvancedTable
            data={filteredInteractions}
            columns={columns}
            loading={loading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onRowClick={handleRowClick}
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
            filters={filtersComponent}
            activeFilters={activeFilters}
            onClearAllFilters={clearAllFilters}
            emptyState={emptyState}
            tableId="interactions"
            presets={presets}
            exportFilename="interactions"
            initialPageSize={50}
            tableType="interactions"
            stickyFirstColumn={true}
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