import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Target, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { AddOpportunityDialog } from "./AddOpportunityDialog";

interface Opportunity {
  id: string;
  deal_name: string;
  status: string;
  tier: string;
  sector: string;
  lg_focus_area: string;
  platform_add_on: string;
  date_of_origination: string;
  deal_source_company: string;
  deal_source_individual_1: string;
  deal_source_individual_2: string;
  ownership: string;
  ownership_type: string;
  summary_of_opportunity: string;
  ebitda_in_ms: number;
  ebitda: string;
  ebitda_notes: string;
  investment_professional_point_person_1: string;
  investment_professional_point_person_2: string;
  most_recent_notes: string;
  url: string;
  created_at: string;
  updated_at: string;
  dealcloud: boolean;
}

export function OpportunitiesTable() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;
  const { toast } = useToast();

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("opportunities_app")
        .select("*")
        .order("date_of_origination", { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load opportunities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(opportunities.map(o => o.status).filter(Boolean))];
    return statuses.sort();
  }, [opportunities]);

  const uniqueSectors = useMemo(() => {
    const sectors = [...new Set(opportunities.map(o => o.sector).filter(Boolean))];
    return sectors.sort();
  }, [opportunities]);

  const uniqueTiers = useMemo(() => {
    const tiers = [...new Set(opportunities.map(o => o.tier).filter(Boolean))];
    return tiers.sort();
  }, [opportunities]);

  const uniqueFocusAreas = useMemo(() => {
    const areas = [...new Set(opportunities.map(o => o.lg_focus_area).filter(Boolean))];
    return areas.sort();
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opportunity) => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        opportunity.deal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opportunity.deal_source_company?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = selectedStatuses.length === 0 || 
        (opportunity.status && selectedStatuses.includes(opportunity.status));

      // Sector filter
      const sectorMatch = selectedSectors.length === 0 || 
        (opportunity.sector && selectedSectors.includes(opportunity.sector));

      // Tier filter
      const tierMatch = selectedTiers.length === 0 || 
        (opportunity.tier && selectedTiers.includes(opportunity.tier));

      // Focus area filter
      const focusAreaMatch = selectedFocusAreas.length === 0 || 
        (opportunity.lg_focus_area && selectedFocusAreas.includes(opportunity.lg_focus_area));

      return searchMatch && statusMatch && sectorMatch && tierMatch && focusAreaMatch;
    });
  }, [opportunities, searchTerm, selectedStatuses, selectedSectors, selectedTiers, selectedFocusAreas]);

  const paginatedOpportunities = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredOpportunities.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredOpportunities, currentPage]);

  const totalPages = Math.ceil(filteredOpportunities.length / rowsPerPage);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "open":
        return "bg-success-light text-success";
      case "closed":
      case "won":
        return "bg-primary-light text-primary";
      case "lost":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "tier 1":
      case "1":
        return "bg-primary-light text-primary";
      case "tier 2":
      case "2":
        return "bg-warning-light text-warning";
      case "tier 3":
      case "3":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const toggleFilter = (items: string[], setItems: (items: string[]) => void, item: string) => {
    setItems(
      items.includes(item) 
        ? items.filter(i => i !== item)
        : [...items, item]
    );
  };

  const handleOpportunityAdded = () => {
    fetchOpportunities();
    setShowAddDialog(false);
  };

  const handleOpportunityUpdated = () => {
    fetchOpportunities();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Opportunities ({filteredOpportunities.length})</span>
            </CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Opportunity
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by deal name or source company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Status
                    {selectedStatuses.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedStatuses.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-medium">Filter by Status</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uniqueStatuses.map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={selectedStatuses.includes(status)}
                            onCheckedChange={() => toggleFilter(selectedStatuses, setSelectedStatuses, status)}
                          />
                          <label htmlFor={`status-${status}`} className="text-sm">{status}</label>
                        </div>
                      ))}
                    </div>
                    {selectedStatuses.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedStatuses([])}>
                        Clear All
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sector Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sector
                    {selectedSectors.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedSectors.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-medium">Filter by Sector</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uniqueSectors.map((sector) => (
                        <div key={sector} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sector-${sector}`}
                            checked={selectedSectors.includes(sector)}
                            onCheckedChange={() => toggleFilter(selectedSectors, setSelectedSectors, sector)}
                          />
                          <label htmlFor={`sector-${sector}`} className="text-sm">{sector}</label>
                        </div>
                      ))}
                    </div>
                    {selectedSectors.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedSectors([])}>
                        Clear All
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Tier Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    Tier
                    {selectedTiers.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedTiers.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-medium">Filter by Tier</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uniqueTiers.map((tier) => (
                        <div key={tier} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tier-${tier}`}
                            checked={selectedTiers.includes(tier)}
                            onCheckedChange={() => toggleFilter(selectedTiers, setSelectedTiers, tier)}
                          />
                          <label htmlFor={`tier-${tier}`} className="text-sm">{tier}</label>
                        </div>
                      ))}
                    </div>
                    {selectedTiers.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedTiers([])}>
                        Clear All
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Focus Area Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    Focus Area
                    {selectedFocusAreas.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedFocusAreas.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-medium">Filter by Focus Area</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uniqueFocusAreas.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            id={`focus-${area}`}
                            checked={selectedFocusAreas.includes(area)}
                            onCheckedChange={() => toggleFilter(selectedFocusAreas, setSelectedFocusAreas, area)}
                          />
                          <label htmlFor={`focus-${area}`} className="text-sm">{area}</label>
                        </div>
                      ))}
                    </div>
                    {selectedFocusAreas.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedFocusAreas([])}>
                        Clear All
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow>
                  <TableHead>Deal Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>LG Focus Area</TableHead>
                  <TableHead>Platform Add-On</TableHead>
                  <TableHead>Date of Origination</TableHead>
                  <TableHead>Deal Source Company</TableHead>
                  <TableHead>Deal Source Individual #1</TableHead>
                  <TableHead>Deal Source Individual #2</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead>Ownership Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOpportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Target className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm || selectedStatuses.length > 0 || selectedSectors.length > 0 || selectedTiers.length > 0 || selectedFocusAreas.length > 0
                            ? "No opportunities match your filters" 
                            : "No opportunities yet"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOpportunities.map((opportunity) => (
                    <TableRow
                      key={opportunity.id}
                      className="hover:bg-table-row-hover transition-colors cursor-pointer"
                      onClick={() => setSelectedOpportunity(opportunity)}
                    >
                      <TableCell className="font-medium">
                        {opportunity.deal_name || "Unnamed Deal"}
                      </TableCell>
                      <TableCell>
                        {opportunity.status ? (
                          <Badge className={getStatusColor(opportunity.status)}>
                            {opportunity.status}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {opportunity.tier ? (
                          <Badge className={getTierColor(opportunity.tier)}>
                            {opportunity.tier}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{opportunity.sector || "—"}</TableCell>
                      <TableCell>{opportunity.lg_focus_area || "—"}</TableCell>
                      <TableCell>{opportunity.platform_add_on || "—"}</TableCell>
                      <TableCell>{opportunity.date_of_origination || "—"}</TableCell>
                      <TableCell>{opportunity.deal_source_company || "—"}</TableCell>
                      <TableCell>{opportunity.deal_source_individual_1 || "—"}</TableCell>
                      <TableCell>{opportunity.deal_source_individual_2 || "—"}</TableCell>
                      <TableCell>{opportunity.ownership || "—"}</TableCell>
                      <TableCell>{opportunity.ownership_type || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredOpportunities.length)} of {filteredOpportunities.length} opportunities
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <OpportunityDrawer
        opportunity={selectedOpportunity}
        open={!!selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        onOpportunityUpdated={handleOpportunityUpdated}
      />

      <AddOpportunityDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onOpportunityAdded={handleOpportunityAdded}
      />
    </div>
  );
}