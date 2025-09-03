import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingStatusProps {
  className?: string;
}

const loadingMessages = [
  "Working on your request...",
  "Querying the data...",
  "Formatting your results...",
  "Almost done..."
];

export function LoadingStatus({ className = "" }: LoadingStatusProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1500);

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
        className="text-lg font-medium text-gray-700 transition-opacity duration-500"
        key={messageIndex}
      >
        {loadingMessages[messageIndex]}
      </p>
      <p className="text-sm text-gray-500 mt-2">
        This may take a few moments...
      </p>
    </div>
  );
}