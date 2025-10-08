import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Save, Globe, ChevronDown } from "lucide-react";

interface SplitSaveButtonProps {
  onSaveContact: () => void;
  onSaveGlobal: () => void;
  templateName: string;
  contactName: string;
  isSaving: boolean;
  mode: 'individual' | 'group-drawer' | 'group-shared';
  disabled?: boolean;
}

/**
 * Split button offering two save scopes:
 * - Save for this contact (contact-specific override)
 * - Save to Global (template-level defaults)
 * 
 * In group-shared mode, only global save is available
 */
export function SplitSaveButton({
  onSaveContact,
  onSaveGlobal,
  templateName,
  contactName,
  isSaving,
  mode,
  disabled = false,
}: SplitSaveButtonProps) {
  const isGroupShared = mode === 'group-shared';

  if (isGroupShared) {
    // Shared Settings panel: only global save
    return (
      <Button
        onClick={onSaveGlobal}
        disabled={isSaving || disabled}
        className="w-full"
      >
        <Globe className="h-4 w-4 mr-2" />
        Save to Global ({templateName})
      </Button>
    );
  }

  // Individual or per-contact drawer: split button with both options
  return (
    <div className="flex gap-2">
      <Button
        onClick={onSaveContact}
        disabled={isSaving || disabled}
        className="flex-1"
      >
        <Save className="h-4 w-4 mr-2" />
        Save for this contact
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            disabled={isSaving || disabled}
            className="shrink-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={onSaveContact}>
            <Save className="h-4 w-4 mr-2" />
            <div className="flex flex-col items-start">
              <span>Save for {contactName}</span>
              <kbd className="text-xs text-muted-foreground">Ctrl+S</kbd>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveGlobal}>
            <Globe className="h-4 w-4 mr-2" />
            <div className="flex flex-col items-start">
              <span>Save to Global ({templateName})</span>
              <kbd className="text-xs text-muted-foreground">Shift+Ctrl+S</kbd>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
