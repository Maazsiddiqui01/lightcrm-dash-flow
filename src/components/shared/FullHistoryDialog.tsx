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
import { Button } from "@/components/ui/button";
import { Search, Calendar, User, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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

  const handleExport = () => {
    try {
      // Prepare CSV data
      const headers = ['Type', 'Content', 'Created Date', 'Created By', 'Due Date'];
      const rows = filteredTimeline.map(item => [
        getFieldLabel(item.field),
        `"${(item.content || '').replace(/"/g, '""')}"`, // Escape quotes in content
        format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss'),
        item.created_by || 'Unknown',
        item.due_date ? format(new Date(item.due_date), 'yyyy-MM-dd') : ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `history_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${filteredTimeline.length} entries to CSV`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "Failed to export timeline data",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredTimeline.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
