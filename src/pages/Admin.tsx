import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersManagementTable } from "@/components/admin/UsersManagementTable";
import { Shield } from "lucide-react";

export function Admin() {
  return (
    <ResponsiveContainer>
      <PageHeader
        title="Admin Panel"
        description="Manage users, roles, and system settings"
      />
      <div className="p-6 space-y-6">
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
                <TabsTrigger value="roles">Role Assignment</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users" className="mt-6">
                <UsersManagementTable />
              </TabsContent>
              
              <TabsContent value="roles" className="mt-6">
                <div className="text-sm text-muted-foreground">
                  Role assignment is available in the user management table
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ResponsiveContainer>
  );
}