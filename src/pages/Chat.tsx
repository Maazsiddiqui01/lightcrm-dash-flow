import { useState, useEffect, useMemo } from "react";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatThemeToggle } from "@/components/chat/ChatThemeToggle";
import { FolderList } from "@/components/chat/FolderList";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useChatFolders } from "@/hooks/useChatFolders";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatThemeProvider, useChatTheme } from "@/contexts/ChatThemeContext";
import { Loader2, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DndContext, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import "@/styles/chat-theme.css";
import "@/styles/markdown-chat.css";

function ChatContent() {
  const isMobile = useIsMobile();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggedConvId, setDraggedConvId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [newChatFolder, setNewChatFolder] = useState<string | null>(null);
  const { effectiveTheme } = useChatTheme();

  const {
    folders,
    isLoading: foldersLoading,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useChatFolders();

  const {
    conversations,
    isLoading: conversationsLoading,
    createConversation,
    deleteConversation,
    updateConversation,
    archiveConversation,
    unarchiveConversation,
  } = useChatConversations(showArchived ? undefined : selectedFolderId, showArchived);

  // Get all conversations for counting (both archived and active)
  const { conversations: allActiveConversations } = useChatConversations(undefined, false);
  const { conversations: allArchivedConversations } = useChatConversations(undefined, true);

  // Count conversations per folder
  const conversationCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    allActiveConversations.forEach((conv) => {
      if (conv.folder_id) {
        counts[conv.folder_id] = (counts[conv.folder_id] || 0) + 1;
      }
    });

    return counts;
  }, [allActiveConversations]);

  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
    isSending,
  } = useChatMessages(currentConversationId);

  // Auto-select first conversation on initial load only
  useEffect(() => {
    if (!conversationsLoading && !hasInitialized && !showArchived) {
      if (conversations.length > 0) {
        setCurrentConversationId(conversations[0].id);
      }
      setHasInitialized(true);
    }
  }, [conversations, conversationsLoading, hasInitialized, showArchived]);

  const handleNewConversation = async () => {
    // Just clear selection - don't create conversation yet
    setCurrentConversationId(null);
    setNewChatFolder(null);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (currentConversationId === id) {
      setCurrentConversationId(conversations[0]?.id || null);
    }
  };

  const handleRenameConversation = async (id: string, title: string) => {
    await updateConversation({ id, title });
  };

  const handleMoveToFolder = async (conversationId: string, folderId: string | null) => {
    await updateConversation({ 
      id: conversationId, 
      folder_id: folderId 
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedConvId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedConvId(null);

    if (event.over && event.active.id !== event.over.id) {
      const conversationId = event.active.id as string;
      const targetFolderId = event.over.id as string;

      handleMoveToFolder(conversationId, targetFolderId);
    }
  };

  const handleSendMessage = async (message: string) => {
    // Create conversation if none exists
    if (!currentConversationId) {
      const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      const newConv = await createConversation({ title, folderId: newChatFolder });
      setCurrentConversationId(newConv.id);
      setNewChatFolder(null); // Reset folder selection
      // Wait for the conversation to be set and send the message
      setTimeout(async () => {
        await sendMessage({ content: message });
      }, 100);
    } else {
      await sendMessage({ content: message });
    }
  };

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  if (conversationsLoading || foldersLoading) {
    return (
      <div className="flex items-center justify-center h-screen chat-container" data-chat-theme={effectiveTheme}>
        <Loader2 className="w-8 h-8 animate-spin chat-text-muted" />
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] chat-container" data-chat-theme={effectiveTheme}>
        {/* Desktop Sidebar */}
        {!isMobile && !sidebarCollapsed && (
          <div className="chat-sidebar border-r w-72 flex-shrink-0 flex flex-col transition-all overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b chat-border gap-3">
              <h2 className="font-semibold chat-text text-lg">Chats</h2>
              <div className="flex items-center gap-2">
                <ChatThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <FolderList
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={(id) => {
                setSelectedFolderId(id);
                setShowArchived(false);
              }}
              onCreateFolder={createFolder}
              onUpdateFolder={updateFolder}
              onDeleteFolder={deleteFolder}
              conversationCounts={conversationCounts}
              onShowArchived={() => {
                setShowArchived(!showArchived);
                setSelectedFolderId(null);
              }}
              archivedCount={allArchivedConversations.length}
              showingArchived={showArchived}
            />

            <ChatHistory
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
              onMoveToFolder={handleMoveToFolder}
              onArchiveConversation={archiveConversation}
              onUnarchiveConversation={unarchiveConversation}
              showArchived={showArchived}
              showFolderIndicator={!selectedFolderId && !showArchived}
              className="flex-1"
              folders={folders}
            />
          </div>
        )}

        {/* Collapsed sidebar button */}
        {!isMobile && sidebarCollapsed && (
          <div className="flex flex-col items-center py-4 px-2 border-r chat-border gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
            <div className="h-px w-full bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNewConversation}
              title="New chat"
            >
              <span className="text-xl">+</span>
            </Button>
          </div>
        )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatHeader
          title={currentConversation?.title || "New Chat"}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
        />

        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          folders={folders}
          newChatFolder={newChatFolder}
          onNewChatFolderChange={setNewChatFolder}
        />
      </div>
    </div>
    </DndContext>
  );
}

export default function Chat() {
  return (
    <ChatThemeProvider>
      <PageErrorBoundary pageName="Chat">
        <ChatContent />
      </PageErrorBoundary>
    </ChatThemeProvider>
  );
}
