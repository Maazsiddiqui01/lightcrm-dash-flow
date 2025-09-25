import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface DraftLoadingStateProps {
  className?: string;
}

const loadingMessages = [
  "Creating draft...",
  "Analyzing contact...",
  "Generating content...",
  "Finalizing email...",
  "Almost ready..."
];

export function DraftLoadingState({ className = "" }: DraftLoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
        <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75" />
        <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150" />
      </div>
      <p 
        className="text-lg font-medium text-foreground transition-opacity duration-500"
        key={messageIndex}
      >
        {loadingMessages[messageIndex]}
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        This may take a few moments...
      </p>
    </div>
  );
}