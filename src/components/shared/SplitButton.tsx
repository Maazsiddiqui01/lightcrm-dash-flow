import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface SplitButtonProps {
  label: string;
  primaryAction: () => void;
  menu: MenuItem[];
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function SplitButton({
  label,
  primaryAction,
  menu,
  disabled = false,
  loading = false,
  icon,
  className
}: SplitButtonProps) {
  return (
    <div className={cn("flex", className)}>
      {/* Primary button */}
      <Button
        onClick={primaryAction}
        disabled={disabled || loading}
        variant="outline"
        className="rounded-r-none border-r-0"
      >
        {icon}
        {loading ? 'Exporting...' : label}
      </Button>
      
      {/* Dropdown button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            className="rounded-l-none px-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {menu.map((item, index) => (
            <DropdownMenuItem
              key={index}
              onClick={item.onClick}
              disabled={item.disabled || loading}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}