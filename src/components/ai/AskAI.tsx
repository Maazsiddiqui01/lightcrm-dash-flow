import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Bot, 
  Send, 
  Download, 
  Settings, 
  User, 
  Loader2,
  Paperclip,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

const SUGGESTED_PROMPTS = [
  "Show me top 10 contacts by recent activity",
  "List opportunities by status and tier",
  "Find contacts with no recent interactions",
  "Generate a summary of Q4 pipeline",
  "Show meeting frequency by organization",
  "Identify high-value prospects to follow up"
];

export function AskAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [selectedOutput, setSelectedOutput] = useState("json");
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
      const body = { 
        message: prompt, 
        model: selectedModel || "gpt-4o-mini", 
        output: selectedOutput || "json" 
      };
      
      const { data, error } = await supabase.functions.invoke("ai_tools", { body });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.text || "Response received",
        timestamp: new Date(),
        data: data
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling AI:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderAIResponse = (data: any) => {
    if (data.rendered) {
      return (
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: data.rendered }} />
      );
    }

    if (data.rows && Array.isArray(data.rows)) {
      const headers = data.rows.length > 0 ? Object.keys(data.rows[0]) : [];
      return (
        <div className="my-2">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="capitalize">
                      {header.replace(/_/g, ' ')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.slice(0, 10).map((row: any, index: number) => (
                  <TableRow key={index}>
                    {headers.map((header) => (
                      <TableCell key={header}>
                        {row[header]?.toString() || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.rows.length > 10 && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing 10 of {data.rows.length} rows
            </p>
          )}
        </div>
      );
    }

    if (data.csv) {
      return (
        <div className="my-2">
          <div className="flex items-center justify-between p-4 border rounded-md bg-muted/30">
            <div>
              <h4 className="font-medium">CSV Data Ready</h4>
              <p className="text-sm text-muted-foreground">Click to download the generated CSV file</p>
            </div>
            <Button 
              onClick={() => downloadCSV(data.csv)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>
      );
    }

    if (data.text) {
      return <p className="text-sm whitespace-pre-wrap">{data.text}</p>;
    }

    return (
      <pre className="text-sm bg-muted p-3 rounded text-wrap overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
            <p className="text-sm">{message.content}</p>
            <span className="text-xs opacity-70">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-start mb-4">
        <div className="flex space-x-3 max-w-[90%]">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="bg-muted rounded-lg px-4 py-2 flex-1">
            {message.data ? renderAIResponse(message.data) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            <span className="text-xs text-muted-foreground block mt-2">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const downloadCSV = (csvData: string, filename = "ai_export.csv") => {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSuggestedPrompt = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  const exportChat = () => {
    const chatText = messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.type.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-section-title">AI Assistant</h3>
        <p className="text-meta mt-1">
          Get insights and analysis from your CRM data using artificial intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Stream - Left Panel */}
        <div className="lg:col-span-3 flex flex-col">
          <Card className="flex-1 flex flex-col elevation-1">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-primary" />
                <span>Chat Stream</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 relative">
              {/* Messages Area */}
              <ScrollArea className="h-[calc(100%-120px)] p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Welcome to AI Assistant</h3>
                    <p className="text-muted-foreground mb-6">
                      Ask questions about your CRM data to get insights and analysis.
                    </p>
                    
                    {/* Suggested Prompts */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Try these suggestions:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {SUGGESTED_PROMPTS.slice(0, 3).map((suggestedPrompt, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuggestedPrompt(suggestedPrompt)}
                            className="text-xs"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {suggestedPrompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messages.map(renderMessage)}
                    {isLoading && (
                      <div className="flex justify-start mb-4">
                        <div className="flex space-x-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg px-4 py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Suggested Prompts Bar */}
              {messages.length > 0 && (
                <div className="border-t p-3 bg-muted/30">
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_PROMPTS.slice(0, 4).map((suggestedPrompt, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSuggestedPrompt(suggestedPrompt)}
                        className="text-xs h-6 px-2"
                      >
                        {suggestedPrompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Composer - Sticky Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything about your CRM data... (Enter to send, Shift+Enter for new line)"
                      className="min-h-[60px] pr-20 resize-none focus-ring"
                      disabled={isLoading}
                    />
                    <div className="absolute right-2 bottom-2 flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Paperclip className="h-4 w-4" />
                        <span className="sr-only">Attach file</span>
                      </Button>
                      <Button 
                        onClick={handleSend} 
                        disabled={!prompt.trim() || isLoading}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span className="sr-only">Send message</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel - Right */}
        <div className="lg:col-span-1">
          <Card className="elevation-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="focus-ring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Output Format</label>
                <Select value={selectedOutput} onValueChange={setSelectedOutput}>
                  <SelectTrigger className="focus-ring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Actions</p>
                <div className="space-y-1">
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={exportChat}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Chat
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={clearHistory}>
                    <Bot className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}