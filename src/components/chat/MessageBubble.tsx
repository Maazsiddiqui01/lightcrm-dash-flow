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
        "group py-6 px-4 animate-in fade-in duration-500",
        isUser ? "bg-chat-user" : "bg-chat-assistant"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center bg-chat-avatar">
          {isUser ? (
            <User className="w-5 h-5 text-chat-avatar-foreground" />
          ) : (
            <Bot className="w-5 h-5 text-chat-avatar-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-chat-foreground">
            {isUser ? (
              <p className="whitespace-pre-wrap text-base">{content}</p>
            ) : (
              <ChatMessageRenderer message={message} />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-chat-meta">
              {format(new Date(timestamp), "h:mm a")}
            </span>
            {!isUser && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopy}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Copy</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
