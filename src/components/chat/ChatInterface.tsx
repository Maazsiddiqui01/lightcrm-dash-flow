import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { MessageSquare, Bot } from "lucide-react";
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
    <div className="flex flex-col h-full bg-chat-background">
      <ScrollArea className="flex-1">
        <div ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center px-4">
              <MessageSquare className="w-16 h-16 text-muted-foreground/30 mb-6" />
              <h3 className="text-2xl font-semibold mb-2 text-foreground">Start a conversation</h3>
              <p className="text-base text-muted-foreground max-w-md">
                Type a message or use the microphone to start chatting with the AI assistant.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
              {isSending && (
                <div className="py-6 px-4 bg-chat-assistant">
                  <div className="max-w-3xl mx-auto flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center bg-chat-avatar">
                      <Bot className="w-5 h-5 text-chat-avatar-foreground" />
                    </div>
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <ChatInput onSend={onSendMessage} disabled={isSending} />
    </div>
  );
}
