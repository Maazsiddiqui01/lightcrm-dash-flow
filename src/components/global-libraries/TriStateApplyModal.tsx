import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface TriStateApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (applyToAll: boolean, updateTriStateDefaults: boolean) => void;
  itemType: 'phrase' | 'inquiry';
}

export function TriStateApplyModal({ open, onOpenChange, onConfirm, itemType }: TriStateApplyModalProps) {
  const [scope, setScope] = useState<'all' | 'single'>('single');
  const [updateDefaults, setUpdateDefaults] = useState(false);

  const handleConfirm = () => {
    onConfirm(scope === 'all', updateDefaults);
    onOpenChange(false);
    // Reset state
    setScope('single');
    setUpdateDefaults(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Scope</DialogTitle>
          <DialogDescription>
            Choose whether to apply this change globally or only to this template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={scope} onValueChange={(val) => setScope(val as 'all' | 'single')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">All templates</div>
                  <div className="text-sm text-muted-foreground">
                    Update this {itemType} across all templates that use it
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">This template only</div>
                  <div className="text-sm text-muted-foreground">
                    Create a local copy that won't auto-sync
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {scope === 'all' && (
            <div className="flex items-center space-x-2 pl-6 pt-2">
              <Checkbox 
                id="updateDefaults" 
                checked={updateDefaults}
                onCheckedChange={(checked) => setUpdateDefaults(checked as boolean)}
              />
              <Label 
                htmlFor="updateDefaults" 
                className="text-sm font-normal cursor-pointer"
              >
                Also update tri-state defaults for all templates
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
