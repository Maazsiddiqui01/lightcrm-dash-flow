import { useState } from "react";
import { AskAI as AskAIComponent } from "@/components/ai/AskAI";
import DataMaintenance from "@/pages/DataMaintenance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Database } from "lucide-react";

export function AskAI() {
  return (
    <section className="h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="ai" className="h-full flex flex-col">
        <div className="p-4 pb-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Maintenance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ai" className="flex-1 mt-0 overflow-hidden">
          <div className="h-full flex flex-col">
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
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="flex-1 mt-0 overflow-hidden">
          <DataMaintenance />
        </TabsContent>
      </Tabs>
    </section>
  );
}