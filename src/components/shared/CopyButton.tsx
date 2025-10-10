import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  textToCopy: string;
  successMessage?: string;
  onCopySuccess?: () => void;
}

export function CopyButton({ 
  textToCopy, 
  successMessage = "Copied!",
  onCopySuccess,
  className,
  children,
  ...props 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onCopySuccess?.();
      
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      className={cn(
        "transition-all duration-200",
        copied && "bg-green-600 hover:bg-green-600 text-white scale-105",
        className
      )}
      {...props}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2 animate-scale-in" />
          {successMessage}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          {children || "Copy"}
        </>
      )}
    </Button>
  );
}
