import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ExternalLink, Search, Archive } from "lucide-react";

interface Article {
  id: string;
  focus_area: string;
  article_link: string;
  article_date: string | null;
  last_date_to_use: string | null;
  added_date: string;
}

export function ArticlesRepository() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFocusArea, setSelectedFocusArea] = useState<string>("all");

  // Fetch all articles
  const { data: articles = [], isLoading, refetch } = useQuery({
    queryKey: ['articles_repository'],
    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, focus_area, article_link, article_date, last_date_to_use, added_date')
        .order('added_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching articles:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        focus_area: item.focus_area || '',
        article_link: item.article_link || '',
        article_date: item.article_date,
        last_date_to_use: item.last_date_to_use,
        added_date: item.added_date
      }));
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Get unique focus areas for filtering
  const focusAreas = Array.from(new Set(articles.map(article => article.focus_area))).sort();

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Article deleted",
        description: "The article has been removed from the repository.",
      });
      queryClient.invalidateQueries({ queryKey: ['articles_repository'] });
      queryClient.invalidateQueries({ queryKey: ['articles_all'] }); // For article selector
    },
    onError: (error) => {
      toast({
        title: "Error deleting article",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter articles based on search term and focus area
  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchTerm === "" || 
      article.focus_area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.article_link.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFocusArea = selectedFocusArea === "all" || article.focus_area === selectedFocusArea;
    
    return matchesSearch && matchesFocusArea;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const openArticleLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteArticle = (articleId: string) => {
    deleteArticleMutation.mutate(articleId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Articles Repository
          <Badge variant="secondary" className="ml-auto">
            {filteredArticles.length} of {articles.length} articles
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles by focus area or link..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="min-w-48">
            <select
              value={selectedFocusArea}
              onChange={(e) => setSelectedFocusArea(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Focus Areas</option>
              {focusAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">Loading articles...</div>
          </div>
        )}

        {/* No Articles Found */}
        {!isLoading && filteredArticles.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              {articles.length === 0 
                ? 'No articles in repository yet. Add some articles above to get started.'
                : 'No articles found matching your search criteria.'}
            </div>
          </div>
        )}

        {/* Articles List */}
        <div className="space-y-3">
          {filteredArticles.map((article) => (
            <div 
              key={article.id} 
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">
                      {article.focus_area}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Added: {formatDate(article.added_date)}
                    </span>
                    {article.article_date && (
                      <span className="text-xs text-muted-foreground">
                        Published: {formatDate(article.article_date)}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => openArticleLink(article.article_link)}
                        className="h-auto p-0 text-sm text-primary underline justify-start"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Article
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground break-all">
                      {article.article_link}
                    </div>
                    
                    {article.last_date_to_use && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Use until:</span> {formatDate(article.last_date_to_use)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={deleteArticleMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Article</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this article from the repository? This action cannot be undone.
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Focus Area:</strong> {article.focus_area}<br />
                          <strong>Link:</strong> {article.article_link}
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteArticle(article.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Article
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        {!isLoading && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh Repository
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}