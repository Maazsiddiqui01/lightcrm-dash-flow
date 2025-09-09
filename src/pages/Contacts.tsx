import { ContactsTable } from "@/components/contacts/ContactsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useContactStats } from "@/hooks/useContactStats";
import { Plus, Users, Mail, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { ResponsivePageShell } from "@/components/layout/ResponsivePageShell";

export function Contacts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const stats = useContactStats();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Contacts"
        description="Manage your professional contacts and relationships"
        actions={
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 touch-target">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Contact</span>
          </Button>
        }
      />
      
      <ResponsivePageShell headerHeight={120}>
        <div className="container-fluid p-4 lg:p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <StatsCard
              title="Total Contacts"
              value={stats.loading ? "..." : stats.totalContacts}
              icon={Users}
            />
            <StatsCard
              title="Active Contacts"
              value={stats.loading ? "..." : stats.activeContacts}
              subtitle="Last 90 days"
              icon={TrendingUp}
            />
            <StatsCard
              title="Emails Sent"
              value={stats.loading ? "..." : stats.totalEmails}
              icon={Mail}
            />
            <StatsCard
              title="Meetings Logged"
              value={stats.loading ? "..." : stats.totalMeetings}
              icon={Calendar}
            />
          </div>

          {/* Contacts Table */}
          <ContactsTable />
        </div>
      </ResponsivePageShell>

      <AddContactDialog 
        open={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
        onContactAdded={() => {
          setIsAddDialogOpen(false);
        }} 
      />
    </div>
  );
}