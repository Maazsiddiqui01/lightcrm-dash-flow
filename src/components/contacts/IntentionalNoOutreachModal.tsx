import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, UserX, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IntentionalNoOutreachModalProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  isCurrentlySkipped: boolean;
  onSuccess: () => void;
}

export function IntentionalNoOutreachModal({
  open,
  onClose,
  contactId,
  contactName,
  isCurrentlySkipped,
  onSuccess
}: IntentionalNoOutreachModalProps) {
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const actionType = isCurrentlySkipped ? 'undo' : 'skip';
      
      const { error } = await supabase.rpc('set_intentional_no_outreach', {
        p_contact_id: contactId,
        p_note: note || null,
        p_action_type: actionType
      });

      if (error) throw error;

      toast({
        title: isCurrentlySkipped ? "Outreach Reset" : "Outreach Skipped",
        description: isCurrentlySkipped 
          ? `${contactName} can now be reached out to normally.`
          : `${contactName} has been marked as intentional no outreach. Their outreach date has been reset.`,
      });

      onSuccess();
      onClose();
      setNote("");
    } catch (error) {
      console.error('Error setting intentional no outreach:', error);
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNote("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCurrentlySkipped ? (
              <>
                <RotateCcw className="h-5 w-5 text-green-600" />
                Reset Outreach
              </>
            ) : (
              <>
                <UserX className="h-5 w-5 text-orange-600" />
                Skip Outreach
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isCurrentlySkipped ? (
              <>
                This will remove the "intentional no outreach" flag from <strong>{contactName}</strong>. 
                They will be subject to normal outreach cadence again.
              </>
            ) : (
              <>
                This will mark <strong>{contactName}</strong> as "intentional no outreach" and reset their 
                most recent contact date to today. They will no longer appear as overdue.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isCurrentlySkipped && (
          <div className="space-y-2">
            <Label htmlFor="note">Reason (optional)</Label>
            <Textarea
              id="note"
              placeholder="Why are you skipping outreach to this contact?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-20"
            />
          </div>
        )}

        {!isCurrentlySkipped && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <strong>What happens:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Most recent contact date becomes today</li>
                <li>• Contact will not count as overdue anymore</li>
                <li>• Action will be logged for audit purposes</li>
                <li>• You can undo this action later if needed</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            variant={isCurrentlySkipped ? "default" : "destructive"}
          >
            {isLoading ? "Processing..." : (isCurrentlySkipped ? "Reset Outreach" : "Skip Outreach")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}