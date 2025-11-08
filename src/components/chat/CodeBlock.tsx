import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  // Extract language from className (format: language-xxx)
  const language = className?.replace('language-', '') || 'text';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] rounded-t-lg border-b border-[#333]">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-gray-400 hover:text-white hover:bg-[#333]"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <pre className="!mt-0 !rounded-t-none overflow-x-auto">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
