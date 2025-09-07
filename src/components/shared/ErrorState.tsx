import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = "Something went wrong",
  description = "We encountered an error while loading this content. Please try again.",
  onRetry,
  className 
}: ErrorStateProps) {
  return (
    <Card className={cn("p-8 lg:p-12 text-center border-destructive/20", className)}>
      <div className="flex flex-col items-center space-y-4 animate-fade-in-up">
        <div className="p-4 bg-destructive/10 rounded-full">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        </div>

        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="mt-4 hover-lift"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </Card>
  );
}