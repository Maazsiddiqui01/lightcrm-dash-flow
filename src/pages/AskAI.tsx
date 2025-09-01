import { AskAI as AskAIComponent } from "@/components/ai/AskAI";
import { PageHeader } from "@/components/layout/PageHeader";
import { Bot } from "lucide-react";

export function AskAI() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Ask AI"
        description="Get insights and analysis powered by artificial intelligence"
      />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-card shadow-md border border-border overflow-hidden">
            <AskAIComponent />
          </div>
        </div>
      </main>
    </div>
  );
}