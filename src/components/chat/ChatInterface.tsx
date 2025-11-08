import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { SearchBar } from "./SearchBar";
import { ChatMessage } from "@/hooks/useChatMessages";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isSending: boolean;
}

export function ChatInterface({ messages, onSendMessage, isSending }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const hasMessages = messages.length > 0;

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    
    const query = searchQuery.toLowerCase();
    return messages.filter((message) =>
      message.content.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const searchResultsCount = searchQuery.trim() ? filteredMessages.length : 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <div className="flex flex-col h-full relative bg-[rgb(var(--chat-bg))]">
      {hasMessages ? (
        // When messages exist - normal layout
        <>
          {/* Search Bar */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultsCount={searchResultsCount}
            totalCount={messages.length}
          />

          <ScrollArea className="flex-1 px-4 md:px-6">
            <div className="max-w-[48rem] mx-auto py-6 md:py-8" ref={scrollRef}>
              <div className="space-y-6">
                {filteredMessages.length > 0 ? (
                  filteredMessages.map((message) => (
                    <div key={message.id} className="group">
                      <MessageBubble message={message} searchQuery={searchQuery} />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 chat-text-muted">
                    <p>No messages found matching "{searchQuery}"</p>
                  </div>
                )}
                {isSending && <TypingIndicator />}
              </div>
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          
          <div className="relative">
            <ChatInput onSend={onSendMessage} disabled={isSending} />
          </div>
        </>
      ) : (
        // When no messages - centered empty state
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-[48rem] mx-auto flex flex-col items-center">
            <h3 className="text-3xl md:text-4xl font-semibold mb-12 chat-text text-center">
              What can I help with?
            </h3>
            
            {/* Centered input */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ChatInput onSend={onSendMessage} disabled={isSending} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
