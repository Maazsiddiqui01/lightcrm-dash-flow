import { Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface ChatHistoryProps {
  conversations: Array<{
    id: string;
    title: string;
    last_message_at: string | null;
    message_count: number;
  }>;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  className?: string;
}

export function ChatHistory({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  className,
}: ChatHistoryProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDeleteConversation(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className={cn("flex flex-col h-full border-r bg-chat-sidebar border-chat-sidebar-border", className)}>
        <div className="p-3 border-b border-chat-sidebar-border">
          <Button 
            onClick={onNewConversation} 
            className="w-full justify-start bg-transparent border border-chat-sidebar-border hover:bg-chat-sidebar-hover text-foreground"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative rounded-md px-3 py-2.5 cursor-pointer transition-colors",
                    currentConversationId === conv.id 
                      ? "bg-chat-sidebar-active text-foreground" 
                      : "hover:bg-chat-sidebar-hover text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs opacity-70 mt-0.5">
                        {conv.message_count} message{conv.message_count !== 1 ? "s" : ""}
                        {conv.last_message_at &&
                          ` • ${formatDistanceToNow(new Date(conv.last_message_at), {
                            addSuffix: true,
                          })}`}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(conv.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
