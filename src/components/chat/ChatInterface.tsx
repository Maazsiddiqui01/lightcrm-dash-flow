import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
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
  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages area - only show if messages exist */}
      {hasMessages && (
        <ScrollArea className="flex-1 px-4 md:px-6">
          <div className="max-w-[48rem] mx-auto py-6 md:py-8" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  <MessageBubble message={message} />
                </div>
              ))}
              {isSending && <TypingIndicator />}
            </div>
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}

      {/* Empty state with centered heading */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
          <h3 className="text-3xl md:text-4xl font-semibold mb-8 chat-text text-center">
            What can I help with?
          </h3>
        </div>
      )}

      {/* Input box with smooth transition */}
      <div 
        className={cn(
          "transition-all duration-500 ease-in-out w-full",
          hasMessages 
            ? "relative" 
            : "absolute bottom-8 left-0 right-0"
        )}
      >
        <ChatInput onSend={onSendMessage} disabled={isSending} />
      </div>
    </div>
  );
}
