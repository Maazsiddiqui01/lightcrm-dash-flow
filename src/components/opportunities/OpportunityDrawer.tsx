import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, ExternalLink, Target, Loader2, Trash2, Paperclip, ChevronDown, ChevronUp, History, Mail } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useOpportunityNotes } from "@/hooks/useOpportunityNotes";
import { OpportunityNotesSection } from "./OpportunityNotesSection";
import { sendOpportunityEmail } from "@/features/opportunities/sendEmail";
import { useOpportunityOptions } from "@/hooks/useOpportunityOptions";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { SingleSelectDropdown } from "./SingleSelectDropdown";
import { QuarterYearDropdown } from "./QuarterYearDropdown";
import { splitTokens, tierDisplayOptions, getTierDisplayValue, getTierDatabaseValue, platformAddonDisplayOptions, getPlatformAddonDisplayValue, getPlatformAddonDatabaseValue, defaultOwnershipTypes } from "@/lib/export/opportunityUtils";
import { useSectors, useFocusAreasBySector } from "@/hooks/useLookups";
import { calculateLgTeam } from "@/utils/opportunityHelpers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ContactPickerWithAddNew } from "./ContactPickerWithAddNew";
import { ContactSearchResult } from "@/hooks/useContactSearch";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useEntityAttachments } from "@/hooks/useEntityAttachments";
import { AttachmentUpload } from "@/components/attachments/AttachmentUpload";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FullHistoryDialog } from "@/components/shared/FullHistoryDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Opportunity {
  id: string;
  deal_name: string;
  status: string;
  tier: string;
  sector: string;
  lg_focus_area: string;
  platform_add_on: string;
  process_timeline?: string;
  date_of_origination: string;
  deal_source_company: string;
  deal_source_individual_1: string;
  deal_source_individual_2: string;
  ownership: string;
  ownership_type: string;
  summary_of_opportunity: string;
  ebitda_in_ms: number | null;
  ebitda_notes: string;
  investment_professional_point_person_1: string;
  investment_professional_point_person_2: string;
  investment_professional_point_person_3: string;
  investment_professional_point_person_4: string;
  next_steps: string;
  most_recent_notes: string;
  url: string;
  created_at: string;
  updated_at: string;
  dealcloud: boolean;
  priority: boolean | null;
  funds: string;
  acquisition_date: string | null;
}

interface OpportunityDrawerProps {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
  onOpportunityUpdated: () => void;
}

export function OpportunityDrawer({ opportunity, open, onClose, onOpportunityUpdated }: OpportunityDrawerProps) {
  const [editedFields, setEditedFields] = useState<Partial<Opportunity>>({});
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [customStatusOptions, setCustomStatusOptions] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSourceContact1, setSelectedSourceContact1] = useState<ContactSearchResult | null>(null);
  const [selectedSourceContact2, setSelectedSourceContact2] = useState<ContactSearchResult | null>(null);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [sourceContactField, setSourceContactField] = useState<'deal_source_individual_1' | 'deal_source_individual_2' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { currentNotes, timeline, saveNextSteps, saveMostRecentNotes, isLoadingCurrent, isLoadingTimeline, isSavingNextSteps, isSavingNotes, deleteNote, isDeletingNote } = useOpportunityNotes(opportunity?.id, opportunity?.deal_name);
  const focusAreasQuery = useFocusAreasBySector();
  const sectorsQuery = useSectors();
  const { lgLeadOptions } = useOpportunityOptions();

  useEffect(() => {
    if (opportunity) {
      setEditedFields(opportunity);
      const focusAreasArray = splitTokens(opportunity.lg_focus_area || '');
      setSelectedFocusAreas(focusAreasArray);
      if (opportunity.deal_source_individual_1) setSelectedSourceContact1({ id: '', full_name: opportunity.deal_source_individual_1, email_address: '', organization: '' });
      if (opportunity.deal_source_individual_2) setSelectedSourceContact2({ id: '', full_name: opportunity.deal_source_individual_2, email_address: '', organization: '' });
    }
  }, [opportunity]);

  const handleFieldChange = (field: keyof Opportunity, value: string | number | boolean) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleFocusAreaChange = (newSelection: string[]) => {
    setSelectedFocusAreas(newSelection);
    handleFieldChange('lg_focus_area', newSelection.join(', '));
  };

  const handleSave = async () => {
    if (!opportunity) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('opportunities_raw').update({ ...editedFields, updated_at: new Date().toISOString() }).eq('id', opportunity.id);
      if (error) throw error;
      toast({ title: "Success", description: "Opportunity updated successfully" });
      onOpportunityUpdated();
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update opportunity" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('opportunities_raw').delete().eq('id', opportunity.id);
      if (error) throw error;
      toast({ title: "Success", description: "Opportunity deleted successfully" });
      onOpportunityUpdated();
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete opportunity" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendEmail = () => { if (opportunity?.id) sendOpportunityEmail(opportunity.id); };
  const handleSourceContactSelect = (field: 'deal_source_individual_1' | 'deal_source_individual_2', contact: ContactSearchResult | null) => {
    if (field === 'deal_source_individual_1') setSelectedSourceContact1(contact); else setSelectedSourceContact2(contact);
    handleFieldChange(field, contact?.full_name || '');
  };

  if (!opportunity) return null;

  const displayLgTeam = calculateLgTeam(editedFields);
  const nextStepsTimeline = timeline.filter(t => t.field === 'next_steps');
  const notesTimeline = timeline.filter(t => t.field === 'most_recent_notes');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{editedFields.deal_name || opportunity.deal_name}</SheetTitle>
              <SheetDescription>Edit opportunity details</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="sticky top-0 z-10 bg-background border-b pb-3 mb-4 pt-4">
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={isUpdating || isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHistoryDialogOpen(true)} disabled={isUpdating || isDeleting}>
                <History className="h-4 w-4 mr-2" />History
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={isUpdating || isDeleting}>
                <Mail className="h-4 w-4 mr-2" />Draft Email
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSave} disabled={isUpdating || isDeleting}>
                {isUpdating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isUpdating || isDeleting}>Cancel</Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="space-y-4">
              <div><Label htmlFor="deal_name">Deal Name</Label><Input id="deal_name" value={editedFields.deal_name || ""} onChange={(e) => handleFieldChange("deal_name", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <SingleSelectDropdown label="Status" options={['Active','Pass','Likely Pass','Longer-Term Opportunity', ...customStatusOptions]} value={editedFields.status || ""} onChange={(value) => handleFieldChange("status", value)} placeholder="Select status" allowCustom onAddCustom={(value) => setCustomStatusOptions(prev => [...prev, value])} disabled={isLoading} />
                <SingleSelectDropdown label="Tier" options={tierDisplayOptions} value={getTierDisplayValue(editedFields.tier)} onChange={(displayValue) => handleFieldChange("tier", getTierDatabaseValue(displayValue))} placeholder="Select tier" disabled={isLoading} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="priority" checked={editedFields.priority === true} onCheckedChange={(checked) => handleFieldChange('priority', checked === true)} />
                <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Metrics</h3>
              <div><Label htmlFor="ebitda_in_ms">EBITDA (in millions)</Label><Input id="ebitda_in_ms" type="number" step="0.1" value={editedFields.ebitda_in_ms || ""} onChange={(e) => handleFieldChange("ebitda_in_ms", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><Label htmlFor="ownership">Ownership %</Label><Input id="ownership" value={editedFields.ownership || ""} onChange={(e) => handleFieldChange("ownership", e.target.value)} /></div>
              <SingleSelectDropdown label="Ownership Type" options={defaultOwnershipTypes} value={editedFields.ownership_type || ""} onChange={(value) => handleFieldChange("ownership_type", value)} placeholder="Select ownership type" allowCustom disabled={isLoading} />
            </div>
            <Separator />
            <div className="space-y-4">
              <FocusAreaSelect value={selectedFocusAreas} onChange={handleFocusAreaChange} disabled={focusAreasQuery.isLoading} label="LG Focus Area" sectorId={editedFields?.sector ? sectorsQuery.data?.find(s => s.label === editedFields.sector)?.meta?.id : undefined} />
              <SingleSelectDropdown label="Sector" options={(sectorsQuery.data || []).map(s => s.value)} value={editedFields.sector || ""} onChange={(value) => handleFieldChange("sector", value)} placeholder="Select sector" disabled={isLoading} />
              <SingleSelectDropdown label="Platform/Add-on" options={platformAddonDisplayOptions} value={getPlatformAddonDisplayValue(editedFields.platform_add_on)} onChange={(displayValue) => handleFieldChange("platform_add_on", getPlatformAddonDatabaseValue(displayValue))} placeholder="Select platform/add-on" disabled={isLoading} />
            </div>
            <Separator />
            <div className="space-y-4">
              <div><Label htmlFor="summary_of_opportunity">Summary</Label><Textarea id="summary_of_opportunity" value={editedFields.summary_of_opportunity || ""} onChange={(e) => handleFieldChange("summary_of_opportunity", e.target.value)} rows={4} /></div>
              <div><Label htmlFor="url">URL</Label><div className="flex space-x-2"><Input id="url" type="url" value={editedFields.url || ""} onChange={(e) => handleFieldChange("url", e.target.value)} />{editedFields.url && <Button variant="outline" size="sm" onClick={() => window.open(editedFields.url, '_blank')}><ExternalLink className="h-4 w-4" /></Button>}</div></div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Investment Professionals</h3>
              {[1, 2, 3, 4].map((num) => (
                <SingleSelectDropdown key={num} label={`Investment Professional Point Person #${num}`} options={lgLeadOptions} value={editedFields[`investment_professional_point_person_${num}` as keyof Opportunity] as string || ""} onChange={(value) => handleFieldChange(`investment_professional_point_person_${num}` as keyof Opportunity, value)} placeholder={`Select point person ${num}`} allowCustom={false} disabled={isLoading} />
              ))}
              {displayLgTeam && <div className="p-3 bg-muted rounded-md"><Label className="text-sm font-medium">LG Team (Auto-calculated)</Label><p className="text-sm text-muted-foreground mt-1">{displayLgTeam}</p></div>}
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Timeline & Dates</h3>
              <SingleSelectDropdown label="Process Timeline" options={['1-90 days', '91-180 days', '181-270 days', '271-365 days', '365+ days']} value={editedFields.process_timeline || ""} onChange={(value) => handleFieldChange("process_timeline", value)} placeholder="Select process timeline" disabled={isLoading} />
              <QuarterYearDropdown label="Date of Origination" value={editedFields.date_of_origination || ""} onChange={(value) => handleFieldChange("date_of_origination", value)} placeholder="Select quarter and year" disabled={isLoading} />
              <div className="space-y-2"><Label>Acquisition Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editedFields.acquisition_date && "text-muted-foreground")}><ExternalLink className="mr-2 h-4 w-4" />{editedFields.acquisition_date ? format(new Date(editedFields.acquisition_date), "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editedFields.acquisition_date ? new Date(editedFields.acquisition_date) : undefined} onSelect={(date) => handleFieldChange("acquisition_date", date ? date.toISOString().split('T')[0] : null)} initialFocus /></PopoverContent></Popover></div>
              <SingleSelectDropdown label="Funds" options={['LG Fund VI']} value={editedFields.funds || ""} onChange={(value) => handleFieldChange("funds", value)} placeholder="Select funds" disabled={isLoading} />
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Deal Source</h3>
              <div><Label htmlFor="deal_source_company">Deal Source Company</Label><Input id="deal_source_company" value={editedFields.deal_source_company || ""} onChange={(e) => handleFieldChange("deal_source_company", e.target.value)} /></div>
              <div><Label>Deal Source Contact #1</Label><ContactPickerWithAddNew label="" selectedContact={selectedSourceContact1} onContactSelect={(contact) => handleSourceContactSelect('deal_source_individual_1', contact)} onAddNewContact={() => { setSourceContactField('deal_source_individual_1'); setAddContactDialogOpen(true); }} /></div>
              <div><Label>Deal Source Contact #2</Label><ContactPickerWithAddNew label="" selectedContact={selectedSourceContact2} onContactSelect={(contact) => handleSourceContactSelect('deal_source_individual_2', contact)} onAddNewContact={() => { setSourceContactField('deal_source_individual_2'); setAddContactDialogOpen(true); }} /></div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              <div><Label htmlFor="ebitda_notes">EBITDA Notes</Label><Textarea id="ebitda_notes" value={editedFields.ebitda_notes || ""} onChange={(e) => handleFieldChange("ebitda_notes", e.target.value)} rows={3} /></div>
              <div className="flex items-center space-x-2"><Checkbox id="dealcloud" checked={editedFields.dealcloud === true} onCheckedChange={(checked) => handleFieldChange('dealcloud', checked === true)} /><Label htmlFor="dealcloud" className="text-sm font-medium">Deal Cloud</Label></div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <OpportunityNotesSection title="Next Steps" field="next_steps" currentValue={currentNotes?.next_steps || null} currentDueDate={currentNotes?.next_steps_due_date || null} timeline={nextStepsTimeline} onSave={saveNextSteps} onDelete={deleteNote} isLoadingCurrent={isLoadingCurrent} isLoadingTimeline={isLoadingTimeline} isSaving={isSavingNextSteps} isDeleting={isDeletingNote} />
            <Separator />
            <OpportunityNotesSection title="Most Recent Notes" field="most_recent_notes" currentValue={currentNotes?.most_recent_notes || null} currentDueDate={null} timeline={notesTimeline} onSave={(content) => saveMostRecentNotes(content)} onDelete={deleteNote} isLoadingCurrent={isLoadingCurrent} isLoadingTimeline={isLoadingTimeline} isSaving={isSavingNotes} isDeleting={isDeletingNote} />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <AttachmentsSection opportunityId={opportunity.id} />
          </TabsContent>
        </Tabs>

        <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} onConfirm={handleDelete} title="Delete Opportunity" description={`Are you sure you want to delete "${opportunity.deal_name}"? This action cannot be undone.`} confirmText="Delete" cancelText="Cancel" variant="destructive" />
        <FullHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} title={`Opportunity History: ${opportunity.deal_name}`} description="View all notes and next steps history" timeline={timeline} fieldLabels={{ most_recent_notes: "Notes", next_steps: "Next Steps" }} />
        <AddContactDialog open={addContactDialogOpen} onClose={() => setAddContactDialogOpen(false)} onContactAdded={(newContact) => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); if (newContact && sourceContactField) handleSourceContactSelect(sourceContactField, { id: newContact.id, full_name: newContact.full_name, email_address: newContact.email_address, organization: newContact.organization }); }} />
      </SheetContent>
    </Sheet>
  );
}

function AttachmentsSection({ opportunityId }: { opportunityId: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const { attachments, isLoading, uploadFile, isUploading, deleteFile, isDeleting, downloadFile, getFileUrl } = useEntityAttachments('opportunity', opportunityId);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Attachments</h3>
          {attachments.length > 0 && <Badge variant="secondary">{attachments.length}</Badge>}
        </div>
        <CollapsibleTrigger asChild><Button variant="ghost" size="sm">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-4 pt-4">
        <AttachmentUpload onUpload={(file, description) => uploadFile({ file, description })} isUploading={isUploading} />
        {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <AttachmentList attachments={attachments} onDownload={downloadFile} onDelete={deleteFile} onGetFileUrl={getFileUrl} isDeleting={isDeleting} />}
      </CollapsibleContent>
    </Collapsible>
  );
}
