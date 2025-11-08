import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultsCount: number;
  totalCount: number;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  resultsCount,
  totalCount,
}: SearchBarProps) {
  const hasResults = searchQuery.trim().length > 0;

  return (
    <div className="border-b chat-border px-4 py-3">
      <div className="max-w-[48rem] mx-auto">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 chat-text-muted" />
            <Input
              type="text"
              placeholder="Search messages..."
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
          {hasResults && (
            <span className="text-sm chat-text-muted whitespace-nowrap">
              {resultsCount} of {totalCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
