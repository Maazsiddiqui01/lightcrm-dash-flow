import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface HorizonGp {
  id: string;
  priority: number | null;
  index_number: number | null;
  gp_name: string;
  gp_url: string | null;
  lg_relationship: string | null;
  gp_contact: string | null;
  aum: string | null;
  fund_hq_city: string | null;
  fund_hq_state: string | null;
  active_funds: number | null;
  total_funds: number | null;
  active_holdings: number | null;
  industry_sector_focus: string | null;
}

interface HorizonGpDrawerProps {
  gp: HorizonGp | null;
  open: boolean;
  onClose: () => void;
  onGpUpdated: () => void;
}

export function HorizonGpDrawer({ gp, open, onClose, onGpUpdated }: HorizonGpDrawerProps) {
  const [editedGp, setEditedGp] = useState<Partial<HorizonGp>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (gp) {
      setEditedGp({ ...gp });
    }
  }, [gp]);

  const handleFieldChange = (field: keyof HorizonGp, value: any) => {
    setEditedGp(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!gp) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('lg_horizons_gps')
        .update(editedGp)
        .eq('id', gp.id);

      if (error) throw error;

      toast({ title: "Success", description: "GP updated successfully" });
      onGpUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating GP:', error);
      toast({ title: "Error", description: "Failed to update GP", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gp) return;
    try {
      const { error } = await supabase.from('lg_horizons_gps').delete().eq('id', gp.id);
      if (error) throw error;
      toast({ title: "Success", description: "GP deleted successfully" });
      onGpUpdated();
      onClose();
    } catch (error) {
      console.error('Error deleting GP:', error);
      toast({ title: "Error", description: "Failed to delete GP", variant: "destructive" });
    }
  };

  if (!gp) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  {editedGp.gp_name}
                  {editedGp.gp_url && (
                    <a href={editedGp.gp_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </SheetTitle>
                {editedGp.priority && (
                  <Badge className="mt-1">Priority {editedGp.priority}</Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="holdings">Holdings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GP Name</Label>
                  <Input
                    value={editedGp.gp_name || ''}
                    onChange={(e) => handleFieldChange('gp_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={editedGp.gp_url || ''}
                    onChange={(e) => handleFieldChange('gp_url', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={String(editedGp.priority || '')}
                    onValueChange={(v) => handleFieldChange('priority', v ? parseInt(v) : null)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(p => (
                        <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>LG Relationship</Label>
                  <Input
                    value={editedGp.lg_relationship || ''}
                    onChange={(e) => handleFieldChange('lg_relationship', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>GP Contact</Label>
                  <Input
                    value={editedGp.gp_contact || ''}
                    onChange={(e) => handleFieldChange('gp_contact', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>AUM</Label>
                  <Input
                    value={editedGp.aum || ''}
                    onChange={(e) => handleFieldChange('aum', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HQ City</Label>
                  <Input
                    value={editedGp.fund_hq_city || ''}
                    onChange={(e) => handleFieldChange('fund_hq_city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HQ State</Label>
                  <Input
                    value={editedGp.fund_hq_state || ''}
                    onChange={(e) => handleFieldChange('fund_hq_state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Active Funds</Label>
                  <Input
                    type="number"
                    value={editedGp.active_funds ?? ''}
                    onChange={(e) => handleFieldChange('active_funds', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Funds</Label>
                  <Input
                    type="number"
                    value={editedGp.total_funds ?? ''}
                    onChange={(e) => handleFieldChange('total_funds', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="holdings" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Active Holdings</Label>
                  <Input
                    type="number"
                    value={editedGp.active_holdings ?? ''}
                    onChange={(e) => handleFieldChange('active_holdings', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Industry/Sector Focus</Label>
                <Textarea
                  value={editedGp.industry_sector_focus || ''}
                  onChange={(e) => handleFieldChange('industry_sector_focus', e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete GP"
        description={`Are you sure you want to delete "${gp.gp_name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}
