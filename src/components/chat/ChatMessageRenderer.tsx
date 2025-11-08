import { ChatMessage } from "@/hooks/useChatMessages";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./CodeBlock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChatMessageRendererProps {
  message: ChatMessage;
  searchQuery?: string;
}

// Helper function to highlight search matches in text
function highlightText(text: string, query: string) {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
  const parts = text.split(regex);
  
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={index}
        className="bg-[rgb(var(--chat-accent))]/20 text-[rgb(var(--chat-text))] rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function ChatMessageRenderer({ message, searchQuery = "" }: ChatMessageRendererProps) {
  // Check if metadata contains table data
  if (message.metadata?.data && Array.isArray(message.metadata.data)) {
    const tableData = message.metadata.data;
    
    // Extract headers from first object
    const headers = tableData.length > 0 ? Object.keys(tableData[0]) : [];
    
    return (
      <div className="space-y-2">
        {searchQuery.trim() ? (
          <div className="text-sm text-foreground whitespace-pre-wrap">
            {highlightText(message.content, searchQuery)}
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
        )}
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header} className="font-semibold">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, idx) => (
                <TableRow key={idx}>
                  {headers.map((header) => (
                    <TableCell key={header}>
                      {String(row[header] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // When searching, show plain text with highlighting instead of markdown
  if (searchQuery.trim()) {
    return (
      <div className="chat-markdown whitespace-pre-wrap">
        {highlightText(message.content, searchQuery)}
      </div>
    );
  }

  // Regular text rendering with markdown
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const content = String(children).replace(/\n$/, '');
            
            return !inline && match ? (
              <CodeBlock className={className}>
                {content}
              </CodeBlock>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a({ node, children, ...props }: any) {
            return (
              <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}
