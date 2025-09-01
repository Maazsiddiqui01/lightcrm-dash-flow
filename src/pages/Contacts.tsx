import { ContactsTable } from "@/components/contacts/ContactsTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";

export function Contacts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Contacts"
        description="Manage your professional contacts and relationships"
        actions={
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        }
      />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-card shadow-md border border-border overflow-hidden">
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