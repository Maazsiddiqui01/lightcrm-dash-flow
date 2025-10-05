import { useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface AIContactSearchProps {
  onSearchResults: (query: string, filters: any) => void;
}

export function AIContactSearch({ onSearchResults }: AIContactSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleAISearch = async () => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const prompt = `Convert this natural language query into specific contact search filters: "${query}"

Return JSON format:
{
  "filters": {
    "fullName": "partial name if mentioned",
    "organization": "company name if mentioned",
    "sector": "sector if mentioned",
    "focusArea": "focus area if mentioned",
    "deltaType": "email or meeting if mentioned",
    "hasOpportunities": true/false if relevant
  },
  "explanation": "Brief explanation of search"
}

Examples:
- "contacts in healthcare" → {"filters": {"sector": "Healthcare"}, "explanation": "Searching healthcare sector"}
- "people I haven't emailed recently" → {"filters": {"deltaType": "email"}, "explanation": "Contacts needing email follow-up"}
- "contacts with active opportunities" → {"filters": {"hasOpportunities": true}, "explanation": "Contacts with pipeline"}`;

      const { data, error } = await supabase.functions.invoke('ai_tools', {
        body: { 
          message: prompt,
          model: 'google/gemini-2.5-flash',
          output: 'json'
        }
      });

      if (error) throw error;

      let filters = {};
      let explanation = "Searching...";

      if (data.filters) {
        filters = data.filters;
        explanation = data.explanation || "AI-powered search";
      } else if (data.text) {
        try {
          const parsed = JSON.parse(data.text);
          filters = parsed.filters || {};
          explanation = parsed.explanation || "AI-powered search";
        } catch {
          // Fallback to basic text search
          filters = { fullName: query };
          explanation = `Searching for "${query}"`;
        }
      }

      toast({
        title: "AI Search Applied",
        description: explanation,
      });

      onSearchResults(query, filters);
    } catch (error) {
      console.error('AI search error:', error);
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Using basic search instead",
        variant: "destructive"
      });
      
      // Fallback to basic search
      onSearchResults(query, { fullName: query });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleAISearch();
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ask AI: 'contacts in healthcare' or 'people I should email'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-12"
          disabled={isSearching}
        />
        <Badge 
          variant="secondary" 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
        >
          AI
        </Badge>
      </div>
      <Button
        onClick={handleAISearch}
        disabled={!query.trim() || isSearching}
        className="gap-2"
      >
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Search
      </Button>
    </div>
  );
}
