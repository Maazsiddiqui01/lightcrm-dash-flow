import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { TabNavigation } from "@/components/layout/TabNavigation";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { InteractionsTable } from "@/components/interactions/InteractionsTable";
import { AskAI } from "@/components/ai/AskAI";

const Index = () => {
  const [activeTab, setActiveTab] = useState("contacts");

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default Index;
