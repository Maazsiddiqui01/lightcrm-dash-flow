import { AskAI as AskAIComponent } from "@/components/ai/AskAI";
import { PageHeader } from "@/components/layout/PageHeader";
import { Bot } from "lucide-react";

export function AskAI() {
  return (
    <section className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Ask AI</h1>
          <p className="text-muted-foreground">Get insights and analysis powered by artificial intelligence</p>
        </div>
      </div>

      {/* AI Component */}
      <div className="mt-4 mx-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
        <AskAIComponent />
      </div>
    </section>
  );
}