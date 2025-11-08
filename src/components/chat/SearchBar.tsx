import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forwardRef } from "react";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultsCount: number;
  totalCount: number;
  currentIndex: number;
  onNavigate: (direction: "prev" | "next") => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar({
    searchQuery,
    onSearchChange,
    resultsCount,
    totalCount,
    currentIndex,
    onNavigate,
  }, ref) {
    const hasResults = searchQuery.trim().length > 0;

    return (
      <div className="border-b chat-border px-4 py-3">
        <div className="max-w-[48rem] mx-auto">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 chat-text-muted" />
              <Input
                ref={ref}
                type="text"
                placeholder="Search messages... (Ctrl+F)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10 h-9 chat-input"
              />
              {hasResults && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => onSearchChange("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {hasResults && resultsCount > 0 && (
              <>
                <span className="text-sm chat-text-muted whitespace-nowrap">
                  {currentIndex + 1} of {resultsCount}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onNavigate("prev")}
                    title="Previous result (↑ or ←)"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onNavigate("next")}
                    title="Next result (↓ or →)"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
            {hasResults && resultsCount === 0 && (
              <span className="text-sm chat-text-muted whitespace-nowrap">
                No results
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);
