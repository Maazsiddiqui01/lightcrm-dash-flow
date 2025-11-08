import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChatHistory } from "./ChatHistory";
import { ChatThemeToggle } from "./ChatThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatHeaderProps {
  title: string;
  conversations: any[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
}

export function ChatHeader({
  title,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: ChatHeaderProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className="sticky top-0 z-10 chat-border border-b px-4 h-14 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="touch-target">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 chat-sidebar">
            <div className="flex items-center justify-between p-4 border-b chat-border">
              <h2 className="font-semibold chat-text">Chat History</h2>
              <ChatThemeToggle />
            </div>
            <ChatHistory
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={onSelectConversation}
              onNewConversation={onNewConversation}
              onDeleteConversation={onDeleteConversation}
              onRenameConversation={onRenameConversation}
            />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold truncate chat-text">{title}</h1>
      </div>
      {isMobile && <ChatThemeToggle />}
    </div>
  );
}
