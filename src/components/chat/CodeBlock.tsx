import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 bg-chat-code-header hover:bg-chat-code-header/80"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      {language && (
        <div className="bg-chat-code-header px-4 py-2 text-xs text-chat-code-header-foreground font-medium rounded-t-lg border-b border-border/50">
          {language}
        </div>
      )}
      <pre className={`bg-chat-code text-sm overflow-x-auto ${language ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <code className="text-chat-code-foreground">{children}</code>
      </pre>
    </div>
  );
}
