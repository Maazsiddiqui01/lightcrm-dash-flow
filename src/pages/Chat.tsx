import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatThemeToggle } from "@/components/chat/ChatThemeToggle";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatThemeProvider, useChatTheme } from "@/contexts/ChatThemeContext";
import { Loader2 } from "lucide-react";
import "@/styles/chat-theme.css";
import "@/styles/markdown-chat.css";

function ChatContent() {
  const isMobile = useIsMobile();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { effectiveTheme } = useChatTheme();

  const {
    conversations,
    isLoading: conversationsLoading,
    createConversation,
    deleteConversation,
  } = useChatConversations();

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

  if (conversationsLoading) {
    return (
      <div className="flex items-center justify-center h-screen chat-container" data-chat-theme={effectiveTheme}>
        <Loader2 className="w-8 h-8 animate-spin chat-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] chat-container" data-chat-theme={effectiveTheme}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="chat-sidebar border-r w-64 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b chat-border gap-3">
            <h2 className="font-semibold chat-text text-lg">Chat History</h2>
            <div className="flex-shrink-0">
              <ChatThemeToggle />
            </div>
          </div>
          <ChatHistory
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
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
        />

        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isSending={isSending}
        />
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <ChatThemeProvider>
      <ChatContent />
    </ChatThemeProvider>
  );
}
