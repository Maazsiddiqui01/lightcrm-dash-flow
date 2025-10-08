import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export type SettingSource = 'global' | 'contact';

interface SourceBadgeProps {
  source: SettingSource;
  templateName?: string;
  contactName?: string;
  onReset?: () => void;
  className?: string;
}

/**
 * Badge component showing whether current settings come from global template or contact override
 * Includes "Reset to Global" button when showing contact override
 */
export function SourceBadge({
  source,
  templateName = 'Unknown',
  contactName = 'this contact',
  onReset,
  className = '',
}: SourceBadgeProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <Badge 
        variant={source === 'contact' ? 'default' : 'secondary'}
        className="shrink-0"
      >
        {source === 'contact' 
          ? `Overridden for ${contactName}` 
          : `Using: Global (${templateName})`
        }
      </Badge>
      
      {source === 'contact' && onReset && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onReset}
          className="h-7 px-2 text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset to Global
        </Button>
      )}
    </div>
  );
}
