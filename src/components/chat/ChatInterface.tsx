import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "@/hooks/useChatMessages";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isSending: boolean;
}

export function ChatInterface({ messages, onSendMessage, isSending }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 md:px-6">
        <div className="max-w-[48rem] mx-auto py-6 md:py-8" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <h3 className="text-3xl font-semibold mb-4 chat-text">What can I help with?</h3>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  <MessageBubble message={message} />
                </div>
              ))}
              {isSending && <TypingIndicator />}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <ChatInput onSend={onSendMessage} disabled={isSending} />
    </div>
  );
}
