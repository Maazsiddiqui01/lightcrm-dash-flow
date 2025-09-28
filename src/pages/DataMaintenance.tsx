import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Settings, Users, Building } from "lucide-react";
import { ColumnManager } from "@/components/data-maintenance/ColumnManager";
import { LookupManager } from "@/components/data-maintenance/LookupManager";
import { SchemaOverview } from "@/components/data-maintenance/SchemaOverview";

export function DataMaintenance() {
  const [activeTable, setActiveTable] = useState<'contacts_raw' | 'opportunities_raw'>('contacts_raw');

  return (
    <section className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Data Maintenance
          </h1>
          <p className="text-muted-foreground">
            Manage database schema and configuration without technical intervention
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 mx-4 mb-4 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="columns">Column Management</TabsTrigger>
            <TabsTrigger value="lookups">Dropdown Values</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 mt-4">
            <SchemaOverview />
          </TabsContent>

          <TabsContent value="columns" className="flex-1 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
              {/* Table Selector */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm">Select Table</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button
                    onClick={() => setActiveTable('contacts_raw')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      activeTable === 'contacts_raw'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Contacts</div>
                        <div className="text-xs text-muted-foreground">contacts_raw</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTable('opportunities_raw')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      activeTable === 'opportunities_raw'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Opportunities</div>
                        <div className="text-xs text-muted-foreground">opportunities_raw</div>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>

              {/* Column Management */}
              <div className="lg:col-span-3">
                <ColumnManager tableName={activeTable} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lookups" className="flex-1 mt-4">
            <LookupManager />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  System Settings
                </CardTitle>
                <CardDescription>
                  Advanced configuration and maintenance options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  System settings coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}