import { ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileActionMenuProps {
  children: ReactNode;
  triggerLabel?: string;
}

export function MobileActionMenu({ children, triggerLabel = "More actions" }: MobileActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 touch-target">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DropdownMenuItem as MobileActionMenuItem };
