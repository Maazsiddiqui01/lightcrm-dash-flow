import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, MessageCircle, Settings, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  format?: 'text' | 'json' | 'table' | 'csv' | 'rendered' | 'error';
  data?: any;
}

export function AskAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your CRM AI assistant. I can help you analyze your contacts, opportunities, and interactions. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [selectedOutput, setSelectedOutput] = useState("json");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const body = { 
        message: currentInput, 
        model: selectedModel, 
        output: selectedOutput 
      };

      const { data, error } = await supabase.functions.invoke("ai_tools", { body });

      if (error) {
        throw new Error(error.message);
      }

      // Determine response format and content
      let content = '';
      let format: Message['format'] = 'text';

      if (data.rendered) {
        format = 'rendered';
        content = data.rendered;
      } else if (data.rows && Array.isArray(data.rows)) {
        format = 'table';
        content = `Table with ${data.rows.length} rows`;
      } else if (data.csv) {
        format = 'csv';
        content = data.csv;
      } else if (data.format === 'error') {
        format = 'error';
        content = data.error || 'An error occurred';
      } else if (typeof data === 'object') {
        format = 'json';
        content = JSON.stringify(data, null, 2);
      } else {
        content = String(data);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content,
        isUser: false,
        timestamp: new Date(),
        format,
        data,
      };

      setMessages((prev) => [...prev, aiResponse]);

    } catch (error) {
      console.error('Error calling AI:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isUser: false,
        timestamp: new Date(),
        format: 'error',
      };

      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (message: Message) => {
    const { format, data } = message;

    // Handle rendered content
    if (format === 'rendered' && data?.rendered) {
      return (
        <div className="prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: data.rendered }} />
        </div>
      );
    }

    // Handle table format
    if (format === 'table' && data?.rows && Array.isArray(data.rows) && data.rows.length > 0) {
      const headers = Object.keys(data.rows[0]);
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
                        {row[header] || '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.rows.length > 10 && (
              <div className="p-2 text-center text-sm text-muted-foreground border-t">
                Showing first 10 of {data.rows.length} rows
              </div>
            )}
          </div>
        </div>
      );
    }

    // Handle CSV format
    if (format === 'csv' && data?.csv) {
      return (
        <div className="my-2">
          <pre className="bg-background border rounded p-3 text-sm overflow-x-auto">
            {data.csv}
          </pre>
        </div>
      );
    }

    // Handle error format
    if (format === 'error') {
      return (
        <div className="text-destructive text-sm">
          {message.content}
        </div>
      );
    }

    // Default to text
    return (
      <div className="text-sm whitespace-pre-wrap">
        {message.content}
      </div>
    );
  };


  return (
    <div className="space-y-4">
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>AI Assistant</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          {/* Configuration Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Settings:</span>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Output Format</label>
                <Select value={selectedOutput} onValueChange={setSelectedOutput}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-2 rounded-lg ${
                    message.isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {message.isUser ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div>
                      {message.format && message.format !== 'text' && (
                        <Badge variant="outline" className="mb-2">
                          {message.format}
                        </Badge>
                      )}
                      {renderMessageContent(message)}
                    </div>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your CRM data..."
              className="flex-1 min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Suggested Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "When did we last speak with jane@acme.com?",
              "Show opps sourced by Ziegler in 2025",
              "Show me my top contacts by engagement",
              "Which opportunities need immediate attention?",
              "What's my email response rate?",
              "Identify contacts I haven't touched recently",
            ].map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-left justify-start h-auto py-2 px-3"
                onClick={() => setInput(question)}
              >
                <span className="text-sm">{question}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}