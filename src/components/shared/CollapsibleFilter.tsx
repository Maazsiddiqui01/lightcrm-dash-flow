import { ReactNode, useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CollapsibleFilterProps {
  children: ReactNode;
  activeCount?: number;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleFilter({ 
  children, 
  activeCount = 0, 
  defaultOpen = false,
  className 
}: CollapsibleFilterProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  // On desktop, always show filters expanded
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  // On mobile, make filters collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-12 touch-target"
          aria-label={isOpen ? "Hide filters" : "Show filters"}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeCount}
              </Badge>
            )}
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 animate-accordion-down data-[state=closed]:animate-accordion-up">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
