import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChatHistory } from "./ChatHistory";
import { ThemeToggle } from "./ThemeToggle";

interface ChatHeaderProps {
  title: string;
  conversations: any[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ChatHeader({
  title,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-chat-header-border bg-chat-header backdrop-blur-sm px-4 h-14 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="touch-target">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <ChatHistory
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={onSelectConversation}
              onNewConversation={onNewConversation}
              onDeleteConversation={onDeleteConversation}
            />
          </SheetContent>
        </Sheet>
        <h1 className="text-base font-semibold truncate">{title}</h1>
      </div>
      <ThemeToggle />
    </div>
  );
}
