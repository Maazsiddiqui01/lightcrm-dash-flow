import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, TrendingUp, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface AIInsight {
  title: string;
  description: string;
  type: 'opportunity' | 'contact' | 'activity';
  metric?: string;
}

export function AIInsightsWidget() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      // Fetch recent stats for context
      const [contactsRes, oppsRes, interactionsRes] = await Promise.all([
        supabase.from('contacts_raw').select('*', { count: 'exact', head: true }),
        supabase.from('opportunities_raw').select('*', { count: 'exact', head: true }),
        supabase.from('interactions_app').select('*', { count: 'exact', head: true })
      ]);

      const prompt = `Based on CRM data: ${contactsRes.count} contacts, ${oppsRes.count} opportunities, ${interactionsRes.count} interactions.
      
Generate 3 actionable insights in JSON format:
{
  "insights": [
    {
      "title": "Brief insight title",
      "description": "Specific actionable recommendation",
      "type": "opportunity" | "contact" | "activity",
      "metric": "Optional key metric"
    }
  ]
}

Focus on: engagement trends, follow-up opportunities, pipeline health, and relationship building.`;

      const { data, error } = await supabase.functions.invoke('ai_tools', {
        body: { 
          message: prompt,
          model: 'google/gemini-2.5-flash',
          output: 'json'
        }
      });

      if (error) throw error;

      // Parse AI response
      let parsedInsights: AIInsight[] = [];
      if (data.insights && Array.isArray(data.insights)) {
        parsedInsights = data.insights;
      } else if (data.text) {
        try {
          const parsed = JSON.parse(data.text);
          parsedInsights = parsed.insights || [];
        } catch {
          // Fallback insights if parsing fails
          parsedInsights = [
            {
              title: "Review Pipeline Health",
              description: "Analyze your active opportunities for potential bottlenecks",
              type: "opportunity",
              metric: `${oppsRes.count} opportunities`
            },
            {
              title: "Strengthen Relationships",
              description: "Schedule follow-ups with contacts you haven't reached recently",
              type: "contact",
              metric: `${contactsRes.count} contacts`
            },
            {
              title: "Boost Engagement",
              description: "Increase touchpoints with high-value prospects this week",
              type: "activity",
              metric: `${interactionsRes.count} interactions`
            }
          ];
        }
      }

      setInsights(parsedInsights.slice(0, 3));
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Unable to Generate Insights",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateInsights();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Target className="h-4 w-4" />;
      case 'contact': return <Users className="h-4 w-4" />;
      case 'activity': return <TrendingUp className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'text-success';
      case 'contact': return 'text-primary';
      case 'activity': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const handleInsightClick = (type: string) => {
    switch (type) {
      case 'opportunity':
        navigate('/opportunities');
        break;
      case 'contact':
        navigate('/contacts');
        break;
      case 'activity':
        navigate('/interactions');
        break;
      default:
        break;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            AI-generated recommendations based on your CRM data
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateInsights}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : insights.length > 0 ? (
          insights.map((insight, index) => (
            <div
              key={index}
              onClick={() => handleInsightClick(insight.type)}
              className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleInsightClick(insight.type);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${getIconColor(insight.type)}`}>
                  {getIcon(insight.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  {insight.metric && (
                    <p className="text-xs text-primary font-medium">
                      {insight.metric}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No insights available. Click refresh to generate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
