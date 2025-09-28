import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import type { ContactEmailComposer, Article } from "@/types/emailComposer";

interface ArticlePickerProps {
  contactData: ContactEmailComposer | null;
  selectedArticle: Article | null;
  onArticleSelect: (article: Article | null) => void;
}

export function ArticlePicker({ contactData, selectedArticle, onArticleSelect }: ArticlePickerProps) {
  const articles = contactData?.articles || [];
  
  // Filter articles that are still valid (not past last_date_to_use)
  const validArticles = articles.filter(article => {
    if (!article.last_date_to_use) return true;
    const lastDate = new Date(article.last_date_to_use);
    return lastDate >= new Date();
  });

  const handleArticleChange = (value: string) => {
    if (value === 'none') {
      onArticleSelect(null);
    } else {
      const article = validArticles.find(a => a.article_link === value);
      onArticleSelect(article || null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Article Recommendation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Article (0-1)</label>
          <Select 
            value={selectedArticle?.article_link || 'none'} 
            onValueChange={handleArticleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an article..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No article</SelectItem>
              {validArticles.map((article, index) => (
                <SelectItem key={index} value={article.article_link}>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-48">
                      {article.article_link.replace(/^https?:\/\//, '')}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {article.focus_area}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedArticle && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900">Preview in email:</p>
                <p className="text-sm text-blue-700 mt-1">
                  "I came across this and thought to share: {selectedArticle.article_link}."
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedArticle.focus_area}
                  </Badge>
                  {selectedArticle.last_date_to_use && (
                    <span className="text-xs text-muted-foreground">
                      Valid until: {new Date(selectedArticle.last_date_to_use).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {validArticles.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No articles available for this contact</p>
          </div>
        )}

        {articles.length > validArticles.length && (
          <div className="text-xs text-orange-600">
            {articles.length - validArticles.length} article(s) expired and hidden
          </div>
        )}
      </CardContent>
    </Card>
  );
}