import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateWithActionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyStateWithAction({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children
}: EmptyStateWithActionProps) {
  return (
    <Card className="p-12 animate-fade-in">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        </div>

        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-4">
            {actionLabel}
          </Button>
        )}

        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </Card>
  );
}
