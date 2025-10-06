import { useState, useRef } from "react";
import { Bot, X, Minimize2, Maximize2, Send, Loader2, Sparkles, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

const QUICK_PROMPTS = [
  "Show me contacts needing follow-up",
  "What are my top opportunities?",
  "Recent interaction summary"
];

// AI Response Renderer Component
function AIResponseRenderer({ message }: { message: ChatMessage }) {
  const data = message.data;
  
  // Extract text content
  const textContent = data?.result || data?.summary || data?.text || message.content;
  
  // Extract table data
  const tableData = data?.data || data?.rows || null;
  
  // Detect if we have array data for table
  const hasTableData = Array.isArray(tableData) && tableData.length > 0;
  
  return (
    <div className="space-y-3">
      {/* Render text content */}
      {textContent && textContent !== "Here are your results" && (
        <div className="whitespace-pre-wrap break-words text-sm">
          {textContent.split('\n').map((line: string, i: number) => (
            <p key={i} className={line.trim() ? "mb-2" : "mb-1"}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      )}
      
      {/* Render table if we have array data */}
      {hasTableData && (
        <div className="overflow-x-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                {Object.keys(tableData[0]).map((header) => (
                  <TableHead key={header} className="text-xs font-semibold text-foreground">
                    {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  {Object.values(row).map((cell: any, cellIdx: number) => (
                    <TableCell key={cellIdx} className="text-xs py-2">
                      {cell !== null && cell !== undefined ? String(cell) : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai_tools", {
        body: { 
          message: prompt,
          model: 'google/gemini-2.5-flash',
          output: 'table'
        }
      });

      if (error) throw error;

      console.info('[FloatingAI] Received response:', data);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.result || data.summary || data.text || "Here are your results",
        timestamp: new Date(),
        data: data
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI error:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 bg-background border rounded-lg shadow-2xl z-50 flex flex-col transition-all",
        isMinimized && "w-80 h-14",
        !isMinimized && !isExpanded && "w-96 h-[600px]",
        !isMinimized && isExpanded && "w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] max-w-7xl"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Restore size" : "Maximize"}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Ask me anything about your CRM data
                </p>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPrompt(qp)}
                      className="w-full text-xs justify-start"
                    >
                      <Sparkles className="h-3 w-3 mr-2" />
                      {qp}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "mb-3",
                    msg.type === 'user' ? "flex justify-end" : "flex justify-start"
                  )}
                >
                  {msg.type === 'user' ? (
                    <div className="rounded-lg px-3 py-2 max-w-[80%] text-sm bg-primary text-primary-foreground">
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <span className="text-xs opacity-70 block mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-lg px-3 py-2 max-w-[90%] text-sm bg-muted">
                      <AIResponseRenderer message={msg} />
                      <span className="text-xs opacity-70 block mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me anything..."
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!prompt.trim() || isLoading}
                size="icon"
                className="flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
