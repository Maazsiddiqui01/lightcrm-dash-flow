import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  loading: boolean;
  children: ReactNode;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({ 
  loading, 
  children, 
  message = "Loading...",
  fullScreen = false 
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      
      {loading && (
        <div 
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm z-50",
            "flex items-center justify-center animate-fade-in",
            fullScreen && "fixed"
          )}
        >
          <div className="flex flex-col items-center space-y-4 p-8 rounded-lg bg-card border shadow-lg animate-scale-in">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
