import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { AskAI } from "@/components/ai/AskAI";
import { Button } from "@/components/ui/button";
import { Plus, Users, Target, MessageSquare, Bot } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("contacts");

  const getPageConfig = (tab: string) => {
    switch (tab) {
      case "contacts":
        return {
          title: "Contacts",
          description: "Manage your professional contacts and relationships",
          icon: Users,
          actions: (
            <Button className="focus-ring">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          )
        };
      case "opportunities":
        return {
          title: "Opportunities",
          description: "Track sales opportunities and business development",
          icon: Target,
          actions: (
            <Button className="focus-ring">
              <Plus className="h-4 w-4 mr-2" />
              Add Opportunity
            </Button>
          )
        };
      case "interactions":
        return {
          title: "Interactions",
          description: "View communication history and touchpoints",
          icon: MessageSquare,
          actions: (
            <Button className="focus-ring">
              <Plus className="h-4 w-4 mr-2" />
              Add Interaction
            </Button>
          )
        };
      case "ask-ai":
        return {
          title: "Ask AI",
          description: "Get insights and analysis powered by artificial intelligence",
          icon: Bot,
          actions: null
        };
      default:
        return {
          title: "Contacts",
          description: "Manage your professional contacts and relationships",
          icon: Users,
          actions: (
            <Button className="focus-ring">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          )
        };
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "contacts":
        return <ContactsTable />;
      case "opportunities":
        return <OpportunitiesTable />;
      case "interactions":
        return <InteractionsTable />;
      case "ask-ai":
        return <AskAI />;
      default:
        return <ContactsTable />;
    }
  };

  const pageConfig = getPageConfig(activeTab);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <SidebarInset className="flex-1">
          {/* Global header with trigger */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="focus-ring" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <pageConfig.icon className="h-4 w-4" />
              <span>Light CRM</span>
            </div>
          </header>

          {/* Page header */}
          <PageHeader 
            title={pageConfig.title}
            description={pageConfig.description}
            actions={pageConfig.actions}
          />

          {/* Main content */}
          <main className="flex-1">
            <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
              <div className="rounded-xl bg-card elevation-1 border border-border">
                {renderTabContent()}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
