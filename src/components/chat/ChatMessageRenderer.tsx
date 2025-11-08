import { ChatMessage } from "@/hooks/useChatMessages";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
}

export function ChatMessageRenderer({ message }: ChatMessageRendererProps) {
  // Check if metadata contains table data
  if (message.metadata?.data && Array.isArray(message.metadata.data)) {
    const tableData = message.metadata.data;
    
    // Extract headers from first object
    const headers = tableData.length > 0 ? Object.keys(tableData[0]) : [];
    
    return (
      <div className="space-y-4">
        <div className="markdown-content text-base">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <CodeBlock language={match[1]}>
                    {String(children).replace(/\n$/, "")}
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
        <div className="rounded-lg border border-border/50 overflow-hidden bg-muted/30">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header} className="font-semibold bg-muted/50">
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

  // Regular markdown rendering
  return (
    <div className="markdown-content text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <CodeBlock language={match[1]}>
                {String(children).replace(/\n$/, "")}
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
