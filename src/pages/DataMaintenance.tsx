import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Users, Building, Settings, List, Eye, Sparkles, Upload, FileText, Library, ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { ColumnManager } from "@/components/data-maintenance/ColumnManager";
import { LookupManager } from "@/components/data-maintenance/LookupManager";
import { SchemaOverview } from "@/components/data-maintenance/SchemaOverview";
import { DataHygienePanel } from "@/components/data-maintenance/DataHygienePanel";
import { BulkImportModal } from "@/components/data-maintenance/BulkImportModal";

export function DataMaintenance() {
  const [activeContactsTab, setActiveContactsTab] = useState<string>("columns");
  const [activeOpportunitiesTab, setActiveOpportunitiesTab] = useState<string>("columns");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importEntityType, setImportEntityType] = useState<'contacts' | 'opportunities'>('contacts');

  return (
    <section className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="h-8 w-8" />
            Data Maintenance
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete database management and configuration without technical intervention
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              System Overview
            </TabsTrigger>
            <TabsTrigger value="hygiene" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Data Hygiene
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Global Settings
            </TabsTrigger>
          </TabsList>

          {/* System Overview */}
          <TabsContent value="overview" className="flex-1 mt-0">
            <SchemaOverview />
          </TabsContent>

          {/* Data Hygiene */}
          <TabsContent value="hygiene" className="flex-1 mt-0">
            <DataHygienePanel />
          </TabsContent>

          {/* Contacts Management */}
          <TabsContent value="contacts" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Contacts Data Management
                    </CardTitle>
                    <CardDescription>
                      Manage contacts table structure, columns, validation rules, and dropdown options
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setImportEntityType('contacts');
                      setImportModalOpen(true);
                    }}
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-full">
                <Tabs value={activeContactsTab} onValueChange={setActiveContactsTab} className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="columns">Columns & Structure</TabsTrigger>
                    <TabsTrigger value="lookups">Dropdown Values</TabsTrigger>
                    <TabsTrigger value="validation">Validation Rules</TabsTrigger>
                  </TabsList>

                  <TabsContent value="columns" className="flex-1 mt-4">
                    <ColumnManager tableName="contacts_raw" />
                  </TabsContent>

                  <TabsContent value="lookups" className="flex-1 mt-4">
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Manage dropdown options for contacts fields like LG Sectors, Focus Areas, Contact Types, etc.
                      </div>
                      <LookupManager tableScope="contacts" />
                    </div>
                  </TabsContent>

                  <TabsContent value="validation" className="flex-1 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Validation Rules</CardTitle>
                        <CardDescription>
                          Configure field validation, required fields, and data integrity rules
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          Validation rules management coming soon...
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opportunities Management */}
          <TabsContent value="opportunities" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Opportunities Data Management
                    </CardTitle>
                    <CardDescription>
                      Manage opportunities table structure, columns, validation rules, and dropdown options
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setImportEntityType('opportunities');
                      setImportModalOpen(true);
                    }}
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-full">
                <Tabs value={activeOpportunitiesTab} onValueChange={setActiveOpportunitiesTab} className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="columns">Columns & Structure</TabsTrigger>
                    <TabsTrigger value="lookups">Dropdown Values</TabsTrigger>
                    <TabsTrigger value="validation">Validation Rules</TabsTrigger>
                  </TabsList>

                  <TabsContent value="columns" className="flex-1 mt-4">
                    <ColumnManager tableName="opportunities_raw" />
                  </TabsContent>

                  <TabsContent value="lookups" className="flex-1 mt-4">
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Manage dropdown options for opportunities fields like Status, Tier, Ownership Type, Platform/Add-on, etc.
                      </div>
                      <LookupManager tableScope="opportunities" />
                    </div>
                  </TabsContent>

                  <TabsContent value="validation" className="flex-1 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Validation Rules</CardTitle>
                        <CardDescription>
                          Configure field validation, required fields, and data integrity rules
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          Validation rules management coming soon...
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Global Settings */}
          <TabsContent value="global" className="flex-1 mt-0 overflow-auto">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      System Lookups
                    </CardTitle>
                    <CardDescription>
                      Manage global dropdown values and lookup tables
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LookupManager tableScope="global" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      System Configuration
                    </CardTitle>
                    <CardDescription>
                      Advanced system settings and maintenance options
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center py-8 text-muted-foreground">
                        System configuration options coming soon...
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Modal */}
      <BulkImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        entityType={importEntityType}
        onImportComplete={() => {
          // Could trigger a refresh of data here if needed
        }}
      />
    </section>
  );
}