import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Hero } from "@/components/layout/Hero";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { AskAI } from "@/components/ai/AskAI";
import { Button } from "@/components/ui/button";
import { Plus, Users, Target, MessageSquare, Bot } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("hero");
  const [showCRM, setShowCRM] = useState(false);

  const handleGetStarted = () => {
    setShowCRM(true);
    setActiveTab("contacts");
  };

  const handleAskAI = () => {
    setShowCRM(true);
    setActiveTab("ask-ai");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== "hero") {
      setShowCRM(true);
    }
  };

  const getPageConfig = (tab: string) => {
    switch (tab) {
      case "contacts":
        return {
          title: "Contacts",
          description: "Manage your professional contacts and relationships",
          icon: Users,
          actions: (
            <Button className="shadow-primary hover:shadow-xl transition-all duration-300 hover:scale-105">
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
            <Button className="shadow-primary hover:shadow-xl transition-all duration-300 hover:scale-105">
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
            <Button className="shadow-primary hover:shadow-xl transition-all duration-300 hover:scale-105">
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
          title: "Welcome",
          description: "Your AI-Powered Custom CRM",
          icon: Users,
          actions: null
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
        return null;
    }
  };

  const pageConfig = getPageConfig(activeTab);

  // Show hero section if not in CRM mode
  if (!showCRM) {
    return (
      <div className="min-h-screen bg-background">
        <Hero onGetStarted={handleGetStarted} onAskAI={handleAskAI} />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        
        <SidebarInset className="flex-1">
          {/* Global header with trigger */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm">
            <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground transition-colors duration-200" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <pageConfig.icon className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate font-medium">Light CRM</span>
            </div>
          </header>

          {/* Page header */}
          <PageHeader 
            title={pageConfig.title}
            description={pageConfig.description}
            actions={pageConfig.actions}
          />

          {/* Main content */}
          <main className="flex-1 bg-gradient-subtle min-h-screen relative">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-30" />
            
            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="rounded-3xl bg-card shadow-xl shadow-primary/8 border border-border/50 overflow-hidden backdrop-blur-sm bg-gradient-card">
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
