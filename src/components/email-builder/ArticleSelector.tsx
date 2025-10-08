import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, Search, ExternalLink } from "lucide-react";
import type { ContactEmailComposer } from "@/types/emailComposer";
import type { ModuleSelection } from "@/types/moduleSelections";

interface ArticleSelectorProps {
  contactData: ContactEmailComposer | null;
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
}

export function ArticleSelector({ contactData, currentSelection, onSelectionChange }: ArticleSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const articles = contactData?.articles || [];

  // Filter valid articles (not expired)
  const validArticles = articles.filter(article => {
    if (!article.last_date_to_use) return true;
    const lastDate = new Date(article.last_date_to_use);
    return lastDate >= new Date();
  });

  // Filter by search term
  const filteredArticles = validArticles.filter(article => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      article.article_link.toLowerCase().includes(search) ||
      article.focus_area.toLowerCase().includes(search)
    );
  });

  const handleSelectionChange = (articleLink: string) => {
    if (articleLink === 'none') {
      onSelectionChange(null);
    } else {
      const article = validArticles.find(a => a.article_link === articleLink);
      if (article) {
        onSelectionChange({
          articleId: article.article_link,
          articleUrl: article.article_link,
          articleTitle: article.article_link.replace(/^https?:\/\//, ''),
          articleFocusArea: article.focus_area,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Article List */}
      <div className="max-h-96 overflow-y-auto pr-2">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "No articles match your search" : "No articles available for this contact"}
            </p>
          </div>
        ) : (
          <RadioGroup
            value={currentSelection?.articleId || 'none'}
            onValueChange={handleSelectionChange}
          >
            <div className="flex items-center space-x-2 mb-3 pb-3 border-b">
              <RadioGroupItem value="none" id="article-none" />
              <Label htmlFor="article-none" className="cursor-pointer text-sm font-medium">
                No article
              </Label>
            </div>

            {filteredArticles.map((article, index) => (
              <div key={index} className="flex items-start space-x-2 mb-3 pb-3 border-b last:border-0">
                <RadioGroupItem value={article.article_link} id={`article-${index}`} className="mt-1" />
                <Label htmlFor={`article-${index}`} className="cursor-pointer flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium line-clamp-2">
                        {article.article_link.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {article.focus_area}
                      </Badge>
                      {article.last_date_to_use && (
                        <span className="text-xs text-muted-foreground">
                          Valid until: {new Date(article.last_date_to_use).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      {/* Preview */}
      {currentSelection?.articleUrl && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-2">
            <ExternalLink className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Preview in email:</p>
              <p className="text-sm text-muted-foreground mt-1">
                "I came across this and thought to share: {currentSelection.articleUrl}."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expired articles notice */}
      {articles.length > validArticles.length && (
        <div className="text-xs text-orange-600">
          {articles.length - validArticles.length} article(s) expired and hidden
        </div>
      )}
    </div>
  );
}
