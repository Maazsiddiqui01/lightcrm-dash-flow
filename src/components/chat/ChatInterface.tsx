import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput, ChatInputHandle } from "./ChatInput";
import { ChatTemplates } from "./ChatTemplates";
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
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

  // Reset current result index when search query changes
  useEffect(() => {
    setCurrentResultIndex(0);
  }, [searchQuery, searchResultsCount]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!searchQuery.trim()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending, searchQuery]);

  // Scroll to current search result
  useEffect(() => {
    if (searchResultsCount > 0 && filteredMessages[currentResultIndex]) {
      const messageId = filteredMessages[currentResultIndex].id;
      const element = messageRefs.current.get(messageId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentResultIndex, filteredMessages, searchResultsCount]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Arrow key navigation only when search is active
      if (searchQuery.trim() && searchResultsCount > 0) {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          setCurrentResultIndex((prev) => 
            prev < searchResultsCount - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          setCurrentResultIndex((prev) => 
            prev > 0 ? prev - 1 : searchResultsCount - 1
          );
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, searchResultsCount]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentResultIndex(0);
  };

  const handleNavigateResult = (direction: "prev" | "next") => {
    if (direction === "next") {
      setCurrentResultIndex((prev) => 
        prev < searchResultsCount - 1 ? prev + 1 : 0
      );
    } else {
      setCurrentResultIndex((prev) => 
        prev > 0 ? prev - 1 : searchResultsCount - 1
      );
    }
  };

  const handleTemplateSelect = (template: { prompt: string; placeholders: string[] }) => {
    // Set input value to template prompt
    inputRef.current?.setValue(template.prompt);
    // Focus the input
    inputRef.current?.focus();
    // Auto-select first placeholder
    const firstPlaceholderMatch = template.prompt.match(/\[([^\]]+)\]/);
    if (firstPlaceholderMatch) {
      const start = template.prompt.indexOf(firstPlaceholderMatch[0]);
      const end = start + firstPlaceholderMatch[0].length;
      setTimeout(() => {
        inputRef.current?.selectText(start, end);
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full relative bg-[rgb(var(--chat-bg))]">
      {hasMessages ? (
        // When messages exist - normal layout
        <>
          {/* Search Bar */}
          <SearchBar
            ref={searchInputRef}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            resultsCount={searchResultsCount}
            totalCount={messages.length}
            currentIndex={currentResultIndex}
            onNavigate={handleNavigateResult}
          />

          <ScrollArea className="flex-1 px-4 md:px-6">
            <div className="max-w-[48rem] mx-auto py-6 md:py-8" ref={scrollRef}>
              <div className="space-y-6">
                {filteredMessages.length > 0 ? (
                  filteredMessages.map((message, index) => (
                    <div 
                      key={message.id} 
                      className="group"
                      ref={(el) => {
                        if (el) {
                          messageRefs.current.set(message.id, el);
                        } else {
                          messageRefs.current.delete(message.id);
                        }
                      }}
                    >
                      <MessageBubble 
                        message={message} 
                        searchQuery={searchQuery}
                        isCurrentResult={searchQuery.trim() ? index === currentResultIndex : false}
                      />
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
            <ChatInput ref={inputRef} onSend={onSendMessage} disabled={isSending} />
          </div>
        </>
      ) : (
        // When no messages - centered empty state with templates
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-[48rem] mx-auto flex flex-col items-center">
            <h3 className="text-3xl md:text-4xl font-semibold mb-8 chat-text text-center">
              What can I help with?
            </h3>
            
            {/* Centered input */}
            <div className="w-full mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ChatInput ref={inputRef} onSend={onSendMessage} disabled={isSending} />
            </div>
            
            {/* Templates (collapsible, below input) */}
            <ChatTemplates onSelectTemplate={handleTemplateSelect} />
          </div>
        </div>
      )}
    </div>
  );
}
