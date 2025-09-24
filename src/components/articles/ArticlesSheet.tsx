import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, FileText } from "lucide-react";

interface ArticleInput {
  focus_area: string;
  article_link: string;
  article_date: string;
}

interface GeneralArticleInput {
  article_link: string;
  article_date: string;
}

export function ArticlesSheet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [articleInputs, setArticleInputs] = useState<Record<string, ArticleInput>>({});
  const [generalArticles, setGeneralArticles] = useState<GeneralArticleInput[]>(
    Array.from({ length: 5 }, () => ({ article_link: '', article_date: '' }))
  );

  // Fetch focus areas
  const { data: focusAreas, isLoading: focusAreasLoading } = useQuery({
    queryKey: ['focus_areas_for_articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ui_distinct_focus_areas_v')
        .select('focus_area')
        .order('focus_area');
      
      if (error) throw error;
      return data.map(item => item.focus_area);
    },
  });

  // Save articles mutation
  const saveArticlesMutation = useMutation({
    mutationFn: async (articles: ArticleInput[]) => {
      const articlesToInsert = articles.map(article => ({
        focus_area: article.focus_area,
        article_link: article.article_link,
        article_date: article.article_date ? new Date(article.article_date).toISOString() : null,
      }));

      const { error } = await supabase
        .from('articles')
        .insert(articlesToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Articles saved successfully",
        description: "Your articles have been added to the repository.",
      });
      setArticleInputs({});
      setGeneralArticles(Array.from({ length: 5 }, () => ({ article_link: '', article_date: '' })));
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving articles",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (focusArea: string, field: keyof ArticleInput, value: string) => {
    setArticleInputs(prev => ({
      ...prev,
      [focusArea]: {
        ...prev[focusArea],
        focus_area: focusArea,
        [field]: value,
      },
    }));
  };

  const handleGeneralArticleChange = (index: number, field: keyof GeneralArticleInput, value: string) => {
    setGeneralArticles(prev => 
      prev.map((article, i) => 
        i === index ? { ...article, [field]: value } : article
      )
    );
  };

  const handleSave = () => {
    const focusAreaArticles = Object.values(articleInputs).filter(
      article => article.article_link && article.article_link.trim()
    );

    const generalArticlesToSave = generalArticles
      .filter(article => article.article_link && article.article_link.trim())
      .map(article => ({
        focus_area: 'General',
        article_link: article.article_link,
        article_date: article.article_date,
      }));

    const allArticles = [...focusAreaArticles, ...generalArticlesToSave];

    if (allArticles.length === 0) {
      toast({
        title: "No articles to save",
        description: "Please add at least one article link before saving.",
        variant: "destructive",
      });
      return;
    }

    saveArticlesMutation.mutate(allArticles);
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  if (focusAreasLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading focus areas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Add Articles by Focus Area</CardTitle>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saveArticlesMutation.isPending}
            className="flex items-center gap-2"
          >
            {saveArticlesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save All Articles
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
              <div>Focus Area</div>
              <div>Article Link</div>
              <div>Article Date (Optional)</div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {focusAreas?.map((focusArea) => (
                <div key={focusArea} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2 border-b border-border/50">
                  <div className="flex items-center">
                    <Label htmlFor={`link-${focusArea}`} className="text-sm font-medium">
                      {focusArea}
                    </Label>
                  </div>
                  
                  <div>
                    <Input
                      id={`link-${focusArea}`}
                      type="url"
                      placeholder="https://example.com/article"
                      value={articleInputs[focusArea]?.article_link || ''}
                      onChange={(e) => handleInputChange(focusArea, 'article_link', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Input
                      type="date"
                      value={articleInputs[focusArea]?.article_date || ''}
                      onChange={(e) => handleInputChange(focusArea, 'article_date', e.target.value)}
                      max={getCurrentDate()}
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>General Articles</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
              <div>Article Link</div>
              <div>Article Date (Optional)</div>
            </div>
            
            <div className="space-y-3">
              {generalArticles.map((article, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center py-2 border-b border-border/50">
                  <div>
                    <Input
                      id={`general-link-${index}`}
                      type="url"
                      placeholder="https://example.com/article"
                      value={article.article_link}
                      onChange={(e) => handleGeneralArticleChange(index, 'article_link', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Input
                      type="date"
                      value={article.article_date}
                      onChange={(e) => handleGeneralArticleChange(index, 'article_date', e.target.value)}
                      max={getCurrentDate()}
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}