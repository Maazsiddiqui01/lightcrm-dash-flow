import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, MessageSquare, Mail, Calendar, Users, Plus, Filter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractionDrawer } from "./InteractionDrawer";
import { AddInteractionDialog } from "./AddInteractionDialog";

interface Interaction {
  id: string;
  subject: string;
  source: string;
  from_name: string;
  from_email: string;
  to_names: string;
  to_emails: string;
  cc_names: string;
  cc_emails: string;
  organization: string;
  occurred_at: string;
  all_emails: string;
}

export function InteractionsTable() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const itemsPerPage = 25;
  const { toast } = useToast();

  useEffect(() => {
    fetchInteractions();
  }, []);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("interactions_app")
        .select("*")
        .order("occurred_at", { ascending: false });

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

  const filteredInteractions = interactions.filter((interaction) => {
    // Search filter (Subject and From Email)
    const searchMatch = searchTerm === "" || 
      interaction.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.from_email?.toLowerCase().includes(searchTerm.toLowerCase());

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

  // Pagination
  const totalPages = Math.ceil(filteredInteractions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInteractions = filteredInteractions.slice(startIndex, startIndex + itemsPerPage);

  // Get unique sources for filter dropdown
  const uniqueSources = Array.from(new Set(interactions.map(i => i.source).filter(Boolean)));

  const getSourceColor = (source: string) => {
    switch (source?.toLowerCase()) {
      case "email":
        return "bg-primary-light text-primary";
      case "meeting":
        return "bg-success-light text-success";
      case "call":
        return "bg-warning-light text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRowClick = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setIsDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSourceFilter("all");
    setDateRange({ from: "", to: "" });
    setCurrentPage(1);
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
    <>
      <div className="space-y-4">
        <Card className="elevation-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">Interactions ({filteredInteractions.length})</span>
              </div>
              <AddInteractionDialog onInteractionAdded={fetchInteractions} />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subject and from email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px]">
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
                className="w-[150px]"
              />
              
              <Input
                type="date"
                placeholder="To date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-[150px]"
              />

              {(searchTerm || sourceFilter || dateRange.from || dateRange.to) && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow>
                  <TableHead>Occurred At</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>From Name</TableHead>
                  <TableHead>From Email</TableHead>
                  <TableHead>To Emails</TableHead>
                  <TableHead>CC Emails</TableHead>
                  <TableHead>Organization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInteractions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm || sourceFilter || dateRange.from || dateRange.to ? "No interactions found matching filters" : "No interactions yet"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInteractions.map((interaction) => (
                    <TableRow
                      key={interaction.id}
                      className="hover:bg-table-row-hover transition-colors cursor-pointer"
                      onClick={() => handleRowClick(interaction)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDate(interaction.occurred_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-xs">
                          <div className="font-medium truncate">
                            {interaction.subject || "No Subject"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSourceColor(interaction.source)}>
                          <div className="flex items-center space-x-1">
                            {interaction.source?.toLowerCase() === "email" && <Mail className="h-3 w-3" />}
                            {interaction.source?.toLowerCase() === "meeting" && <Users className="h-3 w-3" />}
                            <span>{interaction.source || "Unknown"}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <span className="text-sm truncate">
                            {interaction.from_name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <span className="text-sm text-muted-foreground truncate">
                            {interaction.from_email || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <span className="text-sm text-muted-foreground truncate">
                            {interaction.to_emails || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <span className="text-sm text-muted-foreground truncate">
                            {interaction.cc_emails || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {interaction.organization || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInteractions.length)} of {filteredInteractions.length} interactions
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <InteractionDrawer
        interaction={selectedInteraction}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={fetchInteractions}
      />
    </>
  );
}