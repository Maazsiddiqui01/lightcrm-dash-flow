import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NotesNextStepsDialogProps {
  open: boolean;
  onClose: () => void;
  recordId: string;
  tableName: "lg_horizons_companies" | "lg_horizons_gps";
  recordName: string;
  initialTab?: "notes" | "next_steps";
  onSaved?: () => void;
}

export function NotesNextStepsDialog({
  open,
  onClose,
  recordId,
  tableName,
  recordName,
  initialTab = "notes",
  onSaved,
}: NotesNextStepsDialogProps) {
  const [notes, setNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const { toast } = useToast();

  useEffect(() => {
    if (open && recordId) {
      fetchData();
    }
  }, [open, recordId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("notes, next_steps")
        .eq("id", recordId)
        .single();

      if (error) throw error;

      setNotes(data?.notes || "");
      setNextSteps(data?.next_steps || "");
    } catch (error) {
      console.error("Error fetching notes/next steps:", error);
      toast({
        title: "Error",
        description: "Failed to load notes and next steps.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ 
          notes, 
          next_steps: nextSteps,
          updated_at: new Date().toISOString()
        })
        .eq("id", recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes and next steps saved successfully.",
      });
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error saving notes/next steps:", error);
      toast({
        title: "Error",
        description: "Failed to save notes and next steps.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notes & Next Steps - {recordName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "notes" | "next_steps")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="next_steps">Next Steps</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this record..."
                  className="min-h-[200px]"
                />
              </div>
            </TabsContent>
            <TabsContent value="next_steps" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="next_steps">Next Steps</Label>
                <Textarea
                  id="next_steps"
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="Add next steps for this record..."
                  className="min-h-[200px]"
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
