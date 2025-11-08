import { format } from "date-fns";
import { Copy, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/hooks/useChatMessages";
import { ChatMessageRenderer } from "./ChatMessageRenderer";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, created_at: timestamp } = message;
  const { toast } = useToast();
  const isUser = role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  return (
    <div
      className={cn(
        "flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar - only show for AI */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[rgb(var(--chat-surface))]">
          <Bot className="w-4 h-4 chat-text-muted" />
        </div>
      )}

      <div className={cn("flex flex-col", isUser ? "items-end max-w-[80%] md:max-w-[70%]" : "flex-1")}>
        <div
          className={cn(
            "break-words transition-colors",
            isUser
              ? "chat-user-bubble rounded-3xl px-5 py-3"
              : "chat-ai-bubble py-3"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[15px]">{content}</p>
          ) : (
            <ChatMessageRenderer message={message} />
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 px-2">
          <span className="text-xs chat-text-muted">
            {format(new Date(timestamp), "h:mm a")}
          </span>
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
