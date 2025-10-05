import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, GitMerge, Calendar, User, Database, Filter } from "lucide-react";
import { format } from "date-fns";

export function AuditLogViewer() {
  const [schemaFilter, setSchemaFilter] = useState<string>("all");
  const [mergeFilter, setMergeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch schema change logs
  const { data: schemaLogs = [], isLoading: schemaLoading } = useQuery({
    queryKey: ['schema-change-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schema_change_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch duplicate merge logs
  const { data: mergeLogs = [], isLoading: mergeLoading } = useQuery({
    queryKey: ['duplicate-merge-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duplicate_merge_log')
        .select('*')
        .order('merged_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filter schema logs
  const filteredSchemaLogs = schemaLogs.filter(log => {
    const matchesTable = schemaFilter === "all" || log.table_name === schemaFilter;
    const matchesSearch = searchTerm === "" || 
      log.column_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTable && matchesSearch;
  });

  // Filter merge logs
  const filteredMergeLogs = mergeLogs.filter(log => {
    const matchesType = mergeFilter === "all" || log.entity_type === mergeFilter;
    const matchesSearch = searchTerm === "" ||
      log.merge_reason?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Get unique table names for filter
  const uniqueTables = Array.from(new Set(schemaLogs.map(log => log.table_name))).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Audit Logs
        </CardTitle>
        <CardDescription>
          Complete history of schema changes and data merges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="schema" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schema" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Schema Changes
            </TabsTrigger>
            <TabsTrigger value="merges" className="flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Data Merges
            </TabsTrigger>
          </TabsList>

          {/* Schema Changes Tab */}
          <TabsContent value="schema" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by column or operation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={schemaFilter} onValueChange={setSchemaFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table}>{table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[500px] rounded-md border">
              {schemaLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
              ) : filteredSchemaLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No schema changes found
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredSchemaLogs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={log.success ? "default" : "destructive"}>
                                {log.operation}
                              </Badge>
                              <span className="font-mono text-sm">
                                {log.table_name}.{log.column_name}
                              </span>
                            </div>
                            
                            {log.old_value && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">From:</span> {log.old_value}
                              </div>
                            )}
                            
                            {log.new_value && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">To:</span> {log.new_value}
                              </div>
                            )}

                            {log.error_message && (
                              <div className="text-sm text-destructive">
                                Error: {log.error_message}
                              </div>
                            )}
                          </div>

                            <div className="text-right text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(log.performed_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs">
                              {format(new Date(log.performed_at), 'h:mm a')}
                            </div>
                            {log.performed_by && (
                              <div className="flex items-center gap-1 justify-end text-xs">
                                <User className="h-3 w-3" />
                                User ID: {log.performed_by.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Data Merges Tab */}
          <TabsContent value="merges" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search merge reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={mergeFilter} onValueChange={setMergeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contact">Contacts</SelectItem>
                  <SelectItem value="opportunity">Opportunities</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[500px] rounded-md border">
              {mergeLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
              ) : filteredMergeLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No merge operations found
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredMergeLogs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge>{log.entity_type}</Badge>
                              <span className="text-sm font-medium">
                                Merged {log.merged_record_ids.length} records
                              </span>
                            </div>

                            <div className="text-sm">
                              <span className="font-medium">Primary Record:</span>
                              <span className="font-mono text-xs ml-2">
                                {log.primary_record_id}
                              </span>
                            </div>

                            {log.merge_reason && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Reason:</span> {log.merge_reason}
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Merged Records:</span>
                              <div className="mt-1 space-y-0.5">
                                {log.merged_record_ids.slice(0, 3).map((id: string) => (
                                  <div key={id} className="font-mono">{id}</div>
                                ))}
                                {log.merged_record_ids.length > 3 && (
                                  <div>... and {log.merged_record_ids.length - 3} more</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(log.merged_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs">
                              {format(new Date(log.merged_at), 'h:mm a')}
                            </div>
                            {log.merged_by && (
                              <div className="flex items-center gap-1 justify-end text-xs">
                                <User className="h-3 w-3" />
                                User ID: {log.merged_by.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
