import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, User } from "lucide-react";
import { format } from "date-fns";

export interface TimelineItem {
  id?: string;
  field: string;
  content: string;
  created_at: string;
  created_by: string | null;
  due_date?: string | null;
}

interface FullHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  timeline: TimelineItem[];
  fieldLabels: Record<string, string>;
}

export function FullHistoryDialog({
  open,
  onOpenChange,
  title,
  description,
  timeline,
  fieldLabels,
}: FullHistoryDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Filter timeline based on search and active tab
  const filteredTimeline = useMemo(() => {
    let filtered = timeline;

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter((item) => item.field === activeTab);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.content.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [timeline, activeTab, searchTerm]);

  // Get unique field types for tabs
  const fieldTypes = useMemo(() => {
    const types = new Set(timeline.map((item) => item.field));
    return Array.from(types);
  }, [timeline]);

  const getFieldLabel = (field: string) => {
    return fieldLabels[field] || field;
  };

  const getFieldColor = (field: string) => {
    switch (field) {
      case "notes":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "next_steps":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "most_recent_notes":
        return "bg-green-500/10 text-green-700 dark:text-green-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">
                All ({timeline.length})
              </TabsTrigger>
              {fieldTypes.map((field) => (
                <TabsTrigger key={field} value={field}>
                  {getFieldLabel(field)} (
                  {timeline.filter((item) => item.field === field).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-4">
              {filteredTimeline.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm ? "No matching entries found" : "No history available"}
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {filteredTimeline.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="border border-border rounded-lg p-4 space-y-3"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className={getFieldColor(item.field)}
                        >
                          {getFieldLabel(item.field)}
                        </Badge>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {item.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {format(new Date(item.due_date), "MMM d, yyyy")}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>
                              {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
