import { useState, useEffect, useMemo } from "react";
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
import { Loader2 } from "lucide-react";
import { DndContext, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import "@/styles/chat-theme.css";
import "@/styles/markdown-chat.css";

function ChatContent() {
  const isMobile = useIsMobile();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggedConvId, setDraggedConvId] = useState<string | null>(null);
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
  } = useChatConversations(selectedFolderId);

  // Get all conversations for counting
  const { conversations: allConversations } = useChatConversations();

  // Count conversations per folder
  const conversationCounts = useMemo(() => {
    const counts: Record<string, number> = { unassigned: 0 };
    
    allConversations.forEach((conv) => {
      if (!conv.folder_id) {
        counts.unassigned++;
      } else {
        counts[conv.folder_id] = (counts[conv.folder_id] || 0) + 1;
      }
    });
    
    return counts;
  }, [allConversations]);

  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
    isSending,
  } = useChatMessages(currentConversationId);

  // Auto-select first conversation or create new one
  useEffect(() => {
    if (!conversationsLoading && !currentConversationId) {
      if (conversations.length > 0) {
        setCurrentConversationId(conversations[0].id);
      }
    }
  }, [conversations, conversationsLoading, currentConversationId]);

  const handleNewConversation = async () => {
    const newConv = await createConversation(undefined);
    setCurrentConversationId(newConv.id);
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
      folder_id: folderId === "unassigned" ? null : folderId 
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
      
      // Handle dropping on folder items
      if (targetFolderId === "all-chats") {
        // Do nothing - already showing all
        return;
      } else if (targetFolderId === "unassigned") {
        handleMoveToFolder(conversationId, null);
      } else {
        handleMoveToFolder(conversationId, targetFolderId);
      }
    }
  };

  const handleSendMessage = async (message: string) => {
    // Create conversation if none exists
    if (!currentConversationId) {
      const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      const newConv = await createConversation(title);
      setCurrentConversationId(newConv.id);
      // Wait a bit for the conversation to be set
      setTimeout(() => {
        sendMessage({ content: message });
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
        {!isMobile && (
          <div className="chat-sidebar border-r w-64 flex-shrink-0 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b chat-border gap-3">
              <h2 className="font-semibold chat-text text-lg">Chats</h2>
              <div className="flex-shrink-0">
                <ChatThemeToggle />
              </div>
            </div>
            
            <FolderList
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={createFolder}
              onUpdateFolder={updateFolder}
              onDeleteFolder={deleteFolder}
              conversationCounts={conversationCounts}
            />

            <div className="border-t chat-border">
              <div className="p-2 md:p-3">
                <button
                  onClick={handleNewConversation}
                  className="w-full rounded-lg bg-[rgb(var(--chat-accent))] text-white hover:opacity-90 transition-opacity h-9 md:h-10 text-sm flex items-center justify-center gap-2"
                >
                  New Chat
                </button>
              </div>
            </div>

            <ChatHistory
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
              onMoveToFolder={handleMoveToFolder}
              showFolderIndicator={!selectedFolderId}
              className="flex-1"
            />
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
        />
      </div>
    </div>
    </DndContext>
  );
}

export default function Chat() {
  return (
    <ChatThemeProvider>
      <ChatContent />
    </ChatThemeProvider>
  );
}
