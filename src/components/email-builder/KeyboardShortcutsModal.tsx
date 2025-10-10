import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Command } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  context?: string;
}

const shortcuts: Shortcut[] = [
  {
    keys: ["Ctrl", "S"],
    description: "Save contact settings",
    context: "Individual mode"
  },
  {
    keys: ["Shift", "Ctrl", "S"],
    description: "Save as template defaults",
    context: "Individual mode"
  },
  {
    keys: ["Ctrl", "R"],
    description: "Randomize module selections",
    context: "Individual mode"
  },
  {
    keys: ["?"],
    description: "Show keyboard shortcuts",
  },
  {
    keys: ["Esc"],
    description: "Close modals/drawers",
  },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl animate-fade-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts in the Email Builder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{shortcut.description}</p>
                {shortcut.context && (
                  <p className="text-sm text-muted-foreground mt-1">{shortcut.context}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center">
                    <Badge 
                      variant="secondary" 
                      className="font-mono px-2 py-1 text-xs"
                    >
                      {key === "Command" ? <Command className="h-3 w-3" /> : key}
                    </Badge>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Press <kbd className="px-2 py-1 rounded bg-background border text-xs font-mono">?</kbd> anytime to open this help dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
