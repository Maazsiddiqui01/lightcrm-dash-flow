import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Article {
  id: string;
  focus_area: string;
  article_link: string;
  article_date: string | null;
  last_date_to_use: string | null;
}

interface ArticleSelectorProps {
  selectedArticle: Article | null;
  onArticleSelect: (article: Article | null) => void;
}

export function ArticleSelector({ selectedArticle, onArticleSelect }: ArticleSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all articles
  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: ['articles_all'],
    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, focus_area, article_link, article_date, last_date_to_use')
        .order('article_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching articles:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        focus_area: item.focus_area || '',
        article_link: item.article_link || '',
        article_date: item.article_date,
        last_date_to_use: item.last_date_to_use
      }));
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Filter articles based on search term
  const filteredArticles = articles.filter(article => 
    article.focus_area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.article_link.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleArticleToggle = (article: Article, checked: boolean) => {
    if (checked) {
      onArticleSelect(article);
    } else {
      onArticleSelect(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const openArticleLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Article Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Error loading articles: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Article Selection
          {selectedArticle && (
            <Badge variant="secondary" className="ml-auto">
              1 Selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div>
          <input
            type="text"
            placeholder="Search articles by focus area or link..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Clear Selection Button */}
        {selectedArticle && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onArticleSelect(null)}
            className="w-full"
          >
            Clear Selection
          </Button>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading articles...
          </div>
        )}

        {/* No Articles Found */}
        {!isLoading && filteredArticles.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            {searchTerm ? 'No articles found matching your search.' : 'No articles available.'}
          </div>
        )}

        {/* Articles List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredArticles.map((article) => (
            <div 
              key={article.id} 
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={selectedArticle?.id === article.id}
                onCheckedChange={(checked) => handleArticleToggle(article, !!checked)}
                className="mt-0.5"
              />
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {article.focus_area}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(article.article_date)}
                  </span>
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Article:</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => openArticleLink(article.article_link)}
                      className="h-auto p-0 text-xs text-primary underline"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Article
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground truncate">
                    {article.article_link}
                  </div>
                  
                  {article.last_date_to_use && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Use until:</span> {formatDate(article.last_date_to_use)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}