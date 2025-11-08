import { useState } from "react";
import { Folder, FolderOpen, Plus, MoreHorizontal, Pencil, Trash2, Users, Briefcase, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatFolder } from "@/hooks/useChatFolders";
import { FolderDialog } from "./FolderDialog";
import { useDroppable } from "@dnd-kit/core";

interface FolderListProps {
  folders: ChatFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (folder: { name: string; color?: string; icon?: string }) => Promise<ChatFolder>;
  onUpdateFolder: (updates: Partial<ChatFolder> & { id: string }) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  conversationCounts: Record<string, number>;
  onShowArchived: () => void;
  archivedCount: number;
  showingArchived: boolean;
}

const iconMap: Record<string, any> = {
  folder: Folder,
  users: Users,
  briefcase: Briefcase,
};

// Droppable folder component for simple folders (All Chats, Unassigned, Archive)
function DroppableFolder({ 
  id, 
  isSelected, 
  onSelect, 
  icon: Icon, 
  label, 
  count,
  iconOpacity = 1 
}: {
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  icon: any;
  label: string;
  count: number;
  iconOpacity?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { folderId: id === "unassigned" ? null : id },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all chat-hover",
        isSelected && "chat-surface",
        isOver && "ring-2 ring-[rgb(var(--chat-accent))] bg-[rgb(var(--chat-accent))]/10"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ opacity: iconOpacity }} />
      <span className="flex-1 text-left truncate chat-text">{label}</span>
      <span className="text-xs chat-text-muted">{count}</span>
    </button>
  );
}

// Droppable folder with edit/delete menu
function DroppableFolderWithMenu({
  id,
  isSelected,
  onSelect,
  icon: Icon,
  label,
  count,
  color,
  onEdit,
  onDelete,
}: {
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  icon: any;
  label: string;
  count: number;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { folderId: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all chat-hover",
        isSelected && "chat-surface",
        isOver && "ring-2 ring-[rgb(var(--chat-accent))] bg-[rgb(var(--chat-accent))]/10"
      )}
    >
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 min-w-0"
      >
        <Icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color }}
        />
        <span className="flex-1 text-left truncate chat-text">
          {label}
        </span>
        <span className="text-xs chat-text-muted">
          {count}
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FolderList({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  conversationCounts,
  onShowArchived,
  archivedCount,
  showingArchived,
}: FolderListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | null>(null);

  const handleCreate = async (folder: { name: string; color?: string; icon?: string }) => {
    await onCreateFolder(folder);
    setIsCreating(false);
  };

  const handleUpdate = async (folder: Partial<ChatFolder> & { id: string }) => {
    await onUpdateFolder(folder);
    setEditingFolder(null);
  };

  const getIcon = (iconName: string, isOpen: boolean) => {
    if (isOpen && iconName === "folder") return FolderOpen;
    return iconMap[iconName] || Folder;
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-xs font-semibold chat-text-muted uppercase tracking-wider">
            Folders
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-0.5 px-2 pb-2">
            {/* User Folders */}
            {!showingArchived && (
              <>
                {folders.map((folder) => {
                  const Icon = getIcon(folder.icon, selectedFolderId === folder.id);
                  return (
                    <DroppableFolderWithMenu
                      key={folder.id}
                      id={folder.id}
                      isSelected={selectedFolderId === folder.id}
                      onSelect={() => onSelectFolder(folder.id)}
                      icon={Icon}
                      label={folder.name}
                      count={conversationCounts[folder.id] || 0}
                      color={folder.color}
                      onEdit={() => setEditingFolder(folder)}
                      onDelete={() => onDeleteFolder(folder.id)}
                    />
                  );
                })}

                <div className="h-px bg-border my-2" />
              </>
            )}

            {/* Archived Conversations */}
            <button
              onClick={onShowArchived}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors chat-hover",
                showingArchived && "chat-surface"
              )}
            >
              <Archive className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left truncate chat-text">Archive</span>
              <span className="text-xs chat-text-muted">{archivedCount}</span>
            </button>
          </div>
        </ScrollArea>
      </div>

      <FolderDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onSave={handleCreate}
        mode="create"
      />

      {editingFolder && (
        <FolderDialog
          open={!!editingFolder}
          onOpenChange={(open) => !open && setEditingFolder(null)}
          onSave={handleUpdate}
          folder={editingFolder}
          mode="edit"
        />
      )}
    </>
  );
}
