import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  "aria-label"?: string;
}

export function FloatingActionButton({ 
  onClick, 
  icon: Icon = Plus, 
  className,
  "aria-label": ariaLabel = "Add new item"
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "transition-all duration-200 hover-lift bounce-subtle",
        "lg:hidden", // Only show on mobile
        className
      )}
      aria-label={ariaLabel}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );
}