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
  Sparkles,
  Copy,
  ChevronDown,
  ChevronRight
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
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
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
      // Use Lovable AI with Gemini models (FREE until Oct 6!)
      const aiModel = selectedModel.startsWith('google/') 
        ? selectedModel 
        : 'google/gemini-2.5-flash';
        
      const body = { 
        message: prompt, 
        model: aiModel, 
        output: "table" // Always use table format
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

  // Smart JSON parser to extract text and table data from various possible structures
  const parseAIResponse = (response: any) => {
    // Find text content from common field names
    const textFields = ['result', 'message', 'summary', 'text', 'answer', 'response'];
    const textContent = textFields
      .map(field => response[field])
      .filter(Boolean)
      .join('\n\n');
    
    // Find array data from common field names
    const arrayFields = ['data', 'rows', 'results', 'contacts', 'opportunities', 'items', 'records'];
    const rowsData = arrayFields
      .map(field => response[field])
      .find(arr => Array.isArray(arr) && arr.length > 0);
    
    return { text: textContent, rows: rowsData };
  };

  const renderAIResponse = (data: any) => {
    // Smart parse the AI response to extract text and table data
    let { text, rows } = parseAIResponse(data);

    // If no rows found, try to parse JSON from a text payload (including ```json fenced blocks)
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      const extractAndParse = (raw?: string) => {
        if (!raw || typeof raw !== 'string') return null;
        const sanitized = raw.replace(/```json\n?|```\n?/g, '').trim();
        try { return JSON.parse(sanitized); } catch { return null; }
      };

      const parsedFromText = extractAndParse(typeof data === 'string' ? data : data?.text);
      if (parsedFromText) {
        const parsed = parseAIResponse(parsedFromText);
        if (parsed.rows && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          rows = parsed.rows;
        }
        if (!text && parsed.text) text = parsed.text;
      }
    }

    // If we have table data, render it as a table
    if (rows && Array.isArray(rows) && rows.length > 0) {
      const headers = Object.keys(rows[0]);
      return (
        <div className="my-2 space-y-3">
          {/* Show text content if available */}
          {text && (
            <div className="prose prose-sm max-w-none">
              {text.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-foreground mb-2">{paragraph}</p>
              ))}
            </div>
          )}

          {/* Render table */}
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur">
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header} className="capitalize whitespace-nowrap">
                        {header.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row: any, index: number) => (
                    <TableRow key={index}>
                      {headers.map((header) => (
                        <TableCell key={header} className="max-w-[200px]">
                          <div className="truncate" title={row[header]?.toString()}>
                            {row[header]?.toString() || "—"}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min(50, rows.length)} of {rows.length} rows
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const csvContent = convertToCSV(rows);
                downloadCSV(csvContent);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      );
    }

    // If we have text but no table, display as readable paragraphs
    if (text) {
      return (
        <div className="prose prose-sm max-w-none">
          {text.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="text-foreground mb-2">{paragraph}</p>
          ))}
        </div>
      );
    }

    // Fallback: if data has format hints, handle them
    if (data?.rendered) {
      return (
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: data.rendered }} />
      );
    }

    if (data?.csv) {
      return (
        <div className="my-2">
          <div className="flex items-center justify-between p-4 border rounded-md bg-muted/30">
            <div>
              <h4 className="font-medium">CSV Data Ready</h4>
              <p className="text-sm text-muted-foreground">Click to download the generated CSV file</p>
            </div>
            <Button 
              onClick={() => downloadCSV(data.csv)}
              variant="default"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>
      );
    }

    // Last resort: render key-value pairs as readable text (never raw JSON viewer)
    if (typeof data === 'object' && data) {
      const entries = Object.entries(data)
        .filter(([_, v]) => ['string','number','boolean'].includes(typeof v))
        .slice(0, 20);
      if (entries.length) {
        return (
          <div className="prose prose-sm max-w-none">
            {entries.map(([k, v]) => (
              <p key={k} className="text-foreground mb-1"><strong>{k}:</strong> {String(v)}</p>
            ))}
          </div>
        );
      }
    }

    if (typeof data === 'string') {
      return (
        <div className="max-w-[70ch]">
          <p className="text-sm whitespace-pre-wrap break-words">{data}</p>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <p className="text-muted-foreground">AI returned a response, but no structured data to display.</p>
      </div>
    );
  };

  const JSONViewer = ({ data }: { data: any }) => {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const copyToClipboard = () => {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({
        title: "Copied",
        description: "JSON data copied to clipboard",
      });
    };

    const toggleCollapse = (key: string) => {
      setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderValue = (value: any, key: string = '', depth: number = 0): React.ReactNode => {
      if (value === null) return <span className="text-muted-foreground">null</span>;
      if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value);
        const isCollapsed = collapsed[`${depth}-${key}`];
        
        return (
          <div className="ml-4">
            <button
              onClick={() => toggleCollapse(`${depth}-${key}`)}
              className="flex items-center text-sm hover:bg-muted rounded px-1 -ml-1"
            >
              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="ml-1 font-mono">{`{${keys.length}}`}</span>
            </button>
            {!isCollapsed && (
              <div className="ml-4 border-l border-border pl-2">
                {keys.map((objKey) => (
                  <div key={objKey} className="my-1">
                    <span className="text-primary font-mono text-sm">"{objKey}"</span>
                    <span className="text-muted-foreground">: </span>
                    {renderValue(value[objKey], objKey, depth + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      
      if (Array.isArray(value)) {
        const isCollapsed = collapsed[`${depth}-${key}`];
        
        return (
          <div className="ml-4">
            <button
              onClick={() => toggleCollapse(`${depth}-${key}`)}
              className="flex items-center text-sm hover:bg-muted rounded px-1 -ml-1"
            >
              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="ml-1 font-mono">[{value.length}]</span>
            </button>
            {!isCollapsed && (
              <div className="ml-4 border-l border-border pl-2">
                {value.slice(0, 10).map((item, index) => (
                  <div key={index} className="my-1">
                    <span className="text-muted-foreground font-mono text-sm">{index}: </span>
                    {renderValue(item, `${key}-${index}`, depth + 1)}
                  </div>
                ))}
                {value.length > 10 && (
                  <div className="text-sm text-muted-foreground">... and {value.length - 10} more items</div>
                )}
              </div>
            )}
          </div>
        );
      }
      
      if (typeof value === 'string') {
        return <span className="text-green-600 dark:text-green-400 font-mono text-sm">"{value}"</span>;
      }
      
      if (typeof value === 'number') {
        return <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">{value}</span>;
      }
      
      if (typeof value === 'boolean') {
        return <span className="text-purple-600 dark:text-purple-400 font-mono text-sm">{value.toString()}</span>;
      }
      
      return <span className="font-mono text-sm break-all">{String(value)}</span>;
    };

    return (
      <div className="my-2 max-w-[70ch]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">JSON Response</span>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-sm font-mono overflow-x-auto">
          {renderValue(data)}
        </div>
      </div>
    );
  };

  const convertToCSV = (rows: any[]): string => {
    if (!rows.length) return '';
    
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header]?.toString() || '';
          return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div className="bg-primary text-primary-foreground rounded-lg px-3 sm:px-4 py-2 max-w-[85%] sm:max-w-[70ch]">
            <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
            <span className="text-xs opacity-70">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-start mb-4">
        <div className="flex space-x-2 sm:space-x-3 max-w-full sm:max-w-[85ch]">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="bg-muted rounded-lg px-3 sm:px-4 py-2 flex-1 min-w-0">
            {message.data ? renderAIResponse(message.data) : (
              <div className="max-w-full sm:max-w-[70ch]">
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
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
    <div className="bg-background">
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Get insights and analysis from your CRM data using artificial intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-6 h-[calc(100vh-200px)]">
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
              <ScrollArea className="h-[calc(100%-120px)] p-2 sm:p-4">
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
                             className="text-xs px-2 py-1 h-auto"
                           >
                             <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                             <span className="truncate">{suggestedPrompt}</span>
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
              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-background border-t">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything about your CRM data..."
                      className="min-h-[50px] sm:min-h-[60px] pr-16 sm:pr-20 resize-none focus-ring text-sm"
                      disabled={isLoading}
                    />
                    <div className="absolute right-1 sm:right-2 bottom-1 sm:bottom-2 flex space-x-1">
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
                    <SelectItem value="google/gemini-2.5-flash">
                      Gemini 2.5 Flash (FREE) ⚡
                    </SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">
                      Gemini 2.5 Pro (FREE) 🚀
                    </SelectItem>
                    <SelectItem value="google/gemini-2.5-flash-lite">
                      Gemini 2.5 Flash Lite (FREE) 💨
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All Gemini models are FREE until Oct 6, 2025!
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Output Format</label>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3 border border-border">
                  Results will always be displayed as interactive tables
                </div>
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
    </div>
  );
}