import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, GitMerge } from "lucide-react";
import { NormalizationManager } from "./NormalizationManager";
import { DeduplicationManager } from "./DeduplicationManager";

export function DataHygienePanel() {
  const [activeTab, setActiveTab] = useState("normalization");

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Data Hygiene & Quality
        </CardTitle>
        <CardDescription>
          Automatically normalize data and detect duplicates to maintain database quality
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="normalization" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Normalization
            </TabsTrigger>
            <TabsTrigger value="deduplication" className="flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Deduplication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="normalization" className="flex-1 mt-0 overflow-auto">
            <NormalizationManager />
          </TabsContent>

          <TabsContent value="deduplication" className="flex-1 mt-0 overflow-auto">
            <DeduplicationManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
