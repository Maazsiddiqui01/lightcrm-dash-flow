import { format } from "date-fns";
import { Copy, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/hooks/useChatMessages";
import { ChatMessageRenderer } from "./ChatMessageRenderer";

interface MessageBubbleProps {
  message: ChatMessage;
  searchQuery?: string;
  isCurrentResult?: boolean;
}

// Helper function to highlight search matches
function highlightText(text: string, query: string, isCurrentResult: boolean) {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={index}
        className={cn(
          "rounded px-0.5 transition-colors",
          isCurrentResult
            ? "bg-[rgb(var(--chat-accent))] text-white"
            : "bg-[rgb(var(--chat-accent))]/20 text-[rgb(var(--chat-text))]"
        )}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function MessageBubble({ message, searchQuery = "", isCurrentResult = false }: MessageBubbleProps) {
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
        "flex gap-2 md:gap-3 mb-4 md:mb-6 animate-in fade-in slide-in-from-bottom-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar - only show for AI */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[rgb(var(--chat-surface))]">
          <Bot className="w-4 h-4 chat-text-muted" />
        </div>
      )}

      <div className={cn("flex flex-col", isUser ? "items-end max-w-[85%] md:max-w-[70%]" : "flex-1")}>
        <div
          className={cn(
            "break-words transition-colors",
            isUser
              ? "chat-user-bubble rounded-3xl px-4 py-2.5 md:px-5 md:py-3"
              : "chat-ai-background w-full"
          )}
        >
          {isUser ? (
            searchQuery.trim() ? (
              <div className="whitespace-pre-wrap text-[15px] md:text-[16px] leading-relaxed">
                {highlightText(content, searchQuery, isCurrentResult)}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-[15px] md:text-[16px] leading-relaxed">{content}</p>
            )
          ) : (
            <div className="prose prose-sm md:prose max-w-none">
              <ChatMessageRenderer message={message} searchQuery={searchQuery} isCurrentResult={isCurrentResult} />
            </div>
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
