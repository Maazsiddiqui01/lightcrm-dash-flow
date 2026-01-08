import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddHorizonGpDialogProps {
  open: boolean;
  onClose: () => void;
  onGpAdded: () => void;
}

export function AddHorizonGpDialog({ open, onClose, onGpAdded }: AddHorizonGpDialogProps) {
  const [gpName, setGpName] = useState("");
  const [aum, setAum] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpName.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('lg_horizons_gps')
        .insert({ gp_name: gpName.trim(), aum: aum.trim() || null });

      if (error) throw error;

      toast({ title: "Success", description: "GP added successfully" });
      setGpName("");
      setAum("");
      onGpAdded();
    } catch (error) {
      console.error('Error adding GP:', error);
      toast({ title: "Error", description: "Failed to add GP", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New GP</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gpName">GP Name *</Label>
            <Input
              id="gpName"
              value={gpName}
              onChange={(e) => setGpName(e.target.value)}
              placeholder="Enter GP name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aum">AUM</Label>
            <Input
              id="aum"
              value={aum}
              onChange={(e) => setAum(e.target.value)}
              placeholder="e.g., $3.6B"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !gpName.trim()}>
              {isSubmitting ? "Adding..." : "Add GP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
