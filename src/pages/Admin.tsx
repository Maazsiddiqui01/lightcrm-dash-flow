import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersManagementTable } from "@/components/admin/UsersManagementTable";
import { UserAssignmentPanel } from "@/components/admin/UserAssignmentPanel";
import { DataAssignmentHub } from "@/components/admin/DataAssignmentHub";
import { Shield, AlertTriangle, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useContactDuplicates } from "@/hooks/useContactDuplicates";

export function Admin() {
  const navigate = useNavigate();
  const { duplicates } = useContactDuplicates();
  
  return (
    <ResponsiveContainer>
      <PageHeader
        title="Admin Panel"
        description="Manage users, roles, and system settings"
      />
      <div className="p-6 space-y-6">
        {/* Duplicate Contacts Alert */}
        {duplicates.length > 0 && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-semibold">Duplicate Contacts Detected</p>
                    <p className="text-sm text-muted-foreground">
                      {duplicates.length} duplicate contact{duplicates.length !== 1 ? 's' : ''} found across multiple users
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('/admin/duplicates')}>
                  View Duplicates
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>System Administration</CardTitle>
            </div>
            <CardDescription>
              Manage users, assign roles, and configure access controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="assignments">Overview</TabsTrigger>
                <TabsTrigger value="assign" className="gap-2">
                  <Users2 className="h-4 w-4" />
                  Assign Data
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="users" className="mt-6">
                <UsersManagementTable />
              </TabsContent>
              
              <TabsContent value="assignments" className="mt-6">
                <UserAssignmentPanel />
              </TabsContent>

              <TabsContent value="assign" className="mt-6">
                <DataAssignmentHub />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ResponsiveContainer>
  );
}