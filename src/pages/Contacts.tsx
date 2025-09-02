import { ContactsTable } from "@/components/contacts/ContactsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { useContactStats } from "@/hooks/useContactStats";
import { Plus, Users, Mail, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";

export function Contacts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const stats = useContactStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Contacts"
        description="Manage your professional contacts and relationships"
        actions={
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        }
      />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <ContactsTable />
          </div>
        </div>
      </main>

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