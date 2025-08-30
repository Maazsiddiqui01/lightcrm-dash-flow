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
import { Search, MessageSquare, Mail, Calendar, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  const filteredInteractions = interactions.filter((interaction) =>
    Object.values(interaction).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Interactions ({filteredInteractions.length})</span>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search interactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInteractions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm ? "No interactions found" : "No interactions yet"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInteractions.map((interaction) => (
                    <TableRow
                      key={interaction.id}
                      className="hover:bg-table-row-hover transition-colors cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        <div className="max-w-sm">
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
                          <div className="font-medium truncate">
                            {interaction.from_name || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {interaction.from_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="text-sm truncate">
                            {interaction.to_names || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {interaction.to_emails}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {interaction.organization || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDate(interaction.occurred_at)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}