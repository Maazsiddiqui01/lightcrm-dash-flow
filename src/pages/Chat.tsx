import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";

export default function Chat() {
  const isMobile = useIsMobile();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <ChatHistory
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          className="w-64 flex-shrink-0"
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {isMobile && (
          <ChatHeader
            title={currentConversation?.title || "New Chat"}
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        )}

        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isSending={isSending}
        />
      </div>
    </div>
  );
}
