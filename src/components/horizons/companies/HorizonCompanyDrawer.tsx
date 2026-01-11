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
import { HorizonNotesSection } from "../shared/HorizonNotesSection";
import { useHorizonNotes } from "@/hooks/useHorizonNotes";

interface HorizonCompany {
  id: string;
  priority: number | null;
  company_name: string;
  company_url: string | null;
  sector: string | null;
  subsector: string | null;
  ebitda: string | null;
  revenue: string | null;
  ownership: string | null;
  parent_gp_name: string | null;
  gp_aum: string | null;
  lg_relationship: string | null;
  gp_contact: string | null;
  process_status: string | null;
  original_date: string | null;
  latest_process_date: string | null;
  company_hq_city: string | null;
  company_hq_state: string | null;
  date_of_acquisition: string | null;
  description: string | null;
  additional_size_info: string | null;
  additional_information: string | null;
  source: string | null;
}

interface HorizonCompanyDrawerProps {
  company: HorizonCompany | null;
  open: boolean;
  onClose: () => void;
  onCompanyUpdated: () => void;
}

export function HorizonCompanyDrawer({ company, open, onClose, onCompanyUpdated }: HorizonCompanyDrawerProps) {
  const [editedCompany, setEditedCompany] = useState<Partial<HorizonCompany>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const {
    currentNotes,
    timeline,
    isLoadingCurrent,
    isLoadingTimeline,
    saveNotes,
    saveNextSteps,
    isSavingNotes,
    isSavingNextSteps,
    deleteNote,
    isDeletingNote,
  } = useHorizonNotes(company?.id, 'company', company?.company_name);

  useEffect(() => {
    if (company) {
      setEditedCompany({ ...company });
    }
  }, [company]);

  const handleFieldChange = (field: keyof HorizonCompany, value: any) => {
    setEditedCompany(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!company) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('lg_horizons_companies')
        .update(editedCompany)
        .eq('id', company.id);

      if (error) throw error;

      toast({ title: "Success", description: "Company updated successfully" });
      onCompanyUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({ title: "Error", description: "Failed to update company", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    try {
      const { error } = await supabase.from('lg_horizons_companies').delete().eq('id', company.id);
      if (error) throw error;
      toast({ title: "Success", description: "Company deleted successfully" });
      onCompanyUpdated();
      onClose();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({ title: "Error", description: "Failed to delete company", variant: "destructive" });
    }
  };

  // Filter timeline by field
  const notesTimeline = timeline.filter(entry => entry.field === 'notes');
  const nextStepsTimeline = timeline.filter(entry => entry.field === 'next_steps');

  if (!company) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  {editedCompany.company_name}
                  {editedCompany.company_url && (
                    <a href={editedCompany.company_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </SheetTitle>
                {editedCompany.priority && (
                  <Badge className="mt-1">Priority {editedCompany.priority}</Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="notes-activity">Notes & Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* GP Info Section - First */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                  GP Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>General Partner</Label>
                    <Input
                      value={editedCompany.parent_gp_name || ''}
                      onChange={(e) => handleFieldChange('parent_gp_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GP AUM</Label>
                    <Input
                      value={editedCompany.gp_aum || ''}
                      onChange={(e) => handleFieldChange('gp_aum', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GP Contact</Label>
                    <Input
                      value={editedCompany.gp_contact || ''}
                      onChange={(e) => handleFieldChange('gp_contact', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LG Relationship</Label>
                    <Input
                      value={editedCompany.lg_relationship || ''}
                      onChange={(e) => handleFieldChange('lg_relationship', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Company Info Section - Second */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                  Company Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={editedCompany.company_name || ''}
                      onChange={(e) => handleFieldChange('company_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={editedCompany.company_url || ''}
                      onChange={(e) => handleFieldChange('company_url', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={String(editedCompany.priority || '')}
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
                    <Label>Sector</Label>
                    <Input
                      value={editedCompany.sector || ''}
                      onChange={(e) => handleFieldChange('sector', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subsector</Label>
                    <Input
                      value={editedCompany.subsector || ''}
                      onChange={(e) => handleFieldChange('subsector', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Process Status</Label>
                    <Select
                      value={editedCompany.process_status || ''}
                      onValueChange={(v) => handleFieldChange('process_status', v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {[
                          'Expected / Monitoring',
                          'Active Process',
                          'Failed Process', 
                          'No Known Process'
                        ].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Acquisition</Label>
                    <Input
                      type="date"
                      value={editedCompany.date_of_acquisition || ''}
                      onChange={(e) => handleFieldChange('date_of_acquisition', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>EBITDA</Label>
                    <Input
                      value={editedCompany.ebitda || ''}
                      onChange={(e) => handleFieldChange('ebitda', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenue</Label>
                    <Input
                      value={editedCompany.revenue || ''}
                      onChange={(e) => handleFieldChange('revenue', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ownership</Label>
                    <Input
                      value={editedCompany.ownership || ''}
                      onChange={(e) => handleFieldChange('ownership', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input
                      value={editedCompany.source || ''}
                      onChange={(e) => handleFieldChange('source', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company HQ City</Label>
                    <Input
                      value={editedCompany.company_hq_city || ''}
                      onChange={(e) => handleFieldChange('company_hq_city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company HQ State</Label>
                    <Input
                      value={editedCompany.company_hq_state || ''}
                      onChange={(e) => handleFieldChange('company_hq_state', e.target.value)}
                    />
                  </div>
                  {/* Only show Original Date if there's data */}
                  {editedCompany.original_date && (
                    <div className="space-y-2">
                      <Label>Original Date</Label>
                      <Input
                        type="date"
                        value={editedCompany.original_date || ''}
                        onChange={(e) => handleFieldChange('original_date', e.target.value)}
                      />
                    </div>
                  )}
                  {/* Only show Latest Process Date if there's data */}
                  {editedCompany.latest_process_date && (
                    <div className="space-y-2">
                      <Label>Latest Process Date</Label>
                      <Input
                        type="date"
                        value={editedCompany.latest_process_date || ''}
                        onChange={(e) => handleFieldChange('latest_process_date', e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Company Description</Label>
                  <Textarea
                    value={editedCompany.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes-activity" className="space-y-6 mt-4">
              {/* Notes & Next Steps Timeline */}
              <HorizonNotesSection
                title="Notes"
                field="notes"
                currentValue={currentNotes?.notes || null}
                timeline={notesTimeline}
                onSave={(content) => saveNotes(content)}
                onDelete={deleteNote}
                isSaving={isSavingNotes}
                isDeleting={isDeletingNote}
                isLoadingCurrent={isLoadingCurrent}
                isLoadingTimeline={isLoadingTimeline}
              />
              <HorizonNotesSection
                title="Next Steps"
                field="next_steps"
                currentValue={currentNotes?.next_steps || null}
                currentDueDate={currentNotes?.next_steps_due_date}
                timeline={nextStepsTimeline}
                onSave={(content, dueDate, addInToDo) => saveNextSteps(content, dueDate, addInToDo)}
                onDelete={deleteNote}
                isSaving={isSavingNextSteps}
                isDeleting={isDeletingNote}
                isLoadingCurrent={isLoadingCurrent}
                isLoadingTimeline={isLoadingTimeline}
              />

              {/* Additional Info Section at Bottom */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Additional Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Additional Size Info</Label>
                    <Textarea
                      value={editedCompany.additional_size_info || ''}
                      onChange={(e) => handleFieldChange('additional_size_info', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Information</Label>
                    <Textarea
                      value={editedCompany.additional_information || ''}
                      onChange={(e) => handleFieldChange('additional_information', e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
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
        title="Delete Company"
        description={`Are you sure you want to delete "${company.company_name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}
