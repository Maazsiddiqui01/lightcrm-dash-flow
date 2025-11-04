import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building, Database, FileText, Library, ArrowRight, Shield, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TableInfo {
  table_name: string;
  column_count: number;
  editable_columns: number;
  last_modified: string;
}

export function SchemaOverview() {
  const { data: tableStats, isLoading } = useQuery({
    queryKey: ['schema-overview'],
    queryFn: async () => {
      // For now, use static data since we don't have the RPC function yet
      return {
        contacts: {
          table_name: 'contacts_raw',
          column_count: 75, // Approximate count from schema
          editable_columns: 45, // From editableColumns config
          last_modified: new Date().toISOString()
        },
        opportunities: {
          table_name: 'opportunities_raw', 
          column_count: 50, // Approximate count from schema
          editable_columns: 32, // From editableColumns config
          last_modified: new Date().toISOString()
        }
      };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const tables = [
    {
      ...tableStats?.contacts,
      icon: Users,
      display_name: "Contacts",
      description: "Contact information and relationships"
    },
    {
      ...tableStats?.opportunities,
      icon: Building,
      display_name: "Opportunities", 
      description: "Investment opportunities and deals"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tables.map((table) => {
          const Icon = table.icon;
          return (
            <Card key={table.table_name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {table.display_name}
                </CardTitle>
                <CardDescription>{table.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{table.column_count}</div>
                    <div className="text-xs text-muted-foreground">Total Columns</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{table.editable_columns}</div>
                    <div className="text-xs text-muted-foreground">Editable</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {(table.column_count || 0) - (table.editable_columns || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">System</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Modified</span>
                    <Badge variant="outline">
                      {new Date(table.last_modified || '').toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">Active</div>
              <div className="text-sm text-muted-foreground">Schema Status</div>
            </div>
            <div>
              <div className="text-lg font-semibold">2</div>
              <div className="text-sm text-muted-foreground">Managed Tables</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">77</div>
              <div className="text-sm text-muted-foreground">Total Editable Fields</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">Real-time</div>
              <div className="text-sm text-muted-foreground">Sync Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/articles" className="group">
          <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Articles</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Manage content library and resources
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/global-libraries" className="group">
          <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Library className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Global Libraries</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Manage templates, phrases, and content
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/make-your-own-view" className="group">
          <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI Agent</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Query data with natural language
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/admin" className="group">
          <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Admin Panel</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Manage users and data assignments
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}