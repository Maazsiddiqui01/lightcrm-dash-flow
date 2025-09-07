import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn("p-8 lg:p-12 text-center", className)}>
      <div className="flex flex-col items-center space-y-4 animate-fade-in-up">
        <div className="p-4 bg-muted rounded-full">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        </div>

        {action && (
          <Button 
            onClick={action.onClick}
            className="mt-4 hover-lift"
          >
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}