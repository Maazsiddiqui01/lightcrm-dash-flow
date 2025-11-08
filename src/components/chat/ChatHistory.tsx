import { Plus, Trash2, MessageSquare, Pencil, Check, X, GripVertical } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface ChatHistoryProps {
  conversations: Array<{
    id: string;
    title: string;
    last_message_at: string | null;
    message_count: number;
    folder_id: string | null;
  }>;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onMoveToFolder?: (conversationId: string, folderId: string | null) => void;
  showFolderIndicator?: boolean;
  className?: string;
}

// Draggable conversation item component
function DraggableConversation({
  conv,
  isActive,
  isEditing,
  editTitle,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSetEditTitle,
  onDelete,
  isDragging,
}: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: conv.id,
    data: { conversation: conv },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg p-2.5 md:p-3 transition-colors",
        isActive && "chat-surface",
        !isEditing && "cursor-pointer chat-hover"
      )}
      onClick={() => !isEditing && onSelect()}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing flex-shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4 chat-text-muted" />
        </div>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => onSetEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
                className="h-8 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveEdit();
                  }}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelEdit();
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium truncate chat-text">{conv.title}</p>
              <p className="text-xs chat-text-muted">
                {conv.message_count} message{conv.message_count !== 1 ? "s" : ""}
                {conv.last_message_at &&
                  ` • ${formatDistanceToNow(new Date(conv.last_message_at), {
                    addSuffix: true,
                  })}`}
              </p>
            </>
          )}
        </div>
        
        {!isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatHistory({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onMoveToFolder,
  showFolderIndicator = false,
  className,
}: ChatHistoryProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDeleteConversation(deleteId);
      setDeleteId(null);
    }
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
      setEditingId(null);
      setEditTitle("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <>
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-2 md:p-3">
          <Button
            onClick={onNewConversation}
            className="w-full rounded-lg bg-[rgb(var(--chat-accent))] text-white hover:opacity-90 transition-opacity h-9 md:h-10 text-sm"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 chat-text-muted text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <DraggableConversation
                  key={conv.id}
                  conv={conv}
                  isActive={currentConversationId === conv.id}
                  isEditing={editingId === conv.id}
                  editTitle={editTitle}
                  onSelect={() => onSelectConversation(conv.id)}
                  onStartEdit={() => startEditing(conv.id, conv.title)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onSetEditTitle={setEditTitle}
                  onDelete={() => setDeleteId(conv.id)}
                  isDragging={draggedId === conv.id}
                />
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
