import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, ExternalLink, Target, Calendar as CalendarIcon, Mail, Loader2, Trash2, Paperclip, ChevronDown, ChevronUp, History } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useOpportunityNotes } from "@/hooks/useOpportunityNotes";
import { SimpleNotesInput } from "./SimpleNotesInput";
import { OpportunityHistoryTab } from "./OpportunityHistoryTab";
import { sendOpportunityEmail } from "@/features/opportunities/sendEmail";
import { useOpportunityOptions } from "@/hooks/useOpportunityOptions";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { SingleSelectDropdown } from "./SingleSelectDropdown";
import { QuarterYearDropdown } from "./QuarterYearDropdown";
import { 
  splitTokens,
  tierDisplayOptions, 
  getTierDisplayValue, 
  getTierDatabaseValue,
  platformAddonDisplayOptions,
  getPlatformAddonDisplayValue,
  getPlatformAddonDatabaseValue,
  defaultOwnershipTypes,
} from "@/lib/export/opportunityUtils";
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
import { FullHistoryDialog, TimelineItem } from "@/components/shared/FullHistoryDialog";

interface Opportunity {
  id: string;
  deal_name: string;
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
  onOpportunityUpdated: () => void | Promise<void>;
}

export function OpportunityDrawer({ opportunity, open, onClose, onOpportunityUpdated }: OpportunityDrawerProps) {
  const [editedFields, setEditedFields] = useState<Partial<Opportunity>>({});
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSourceContact1, setSelectedSourceContact1] = useState<ContactSearchResult | null>(null);
  const [selectedSourceContact2, setSelectedSourceContact2] = useState<ContactSearchResult | null>(null);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [pendingContactField, setPendingContactField] = useState<'contact1' | 'contact2' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use canonical lookup options
  const sectorsQuery = useSectors();
  const currentSector = editedFields.sector || opportunity?.sector;
  const focusAreasQuery = useFocusAreasBySector(currentSector || undefined);
  
  const { 
    dealSourceCompanyOptions,
    lgLeadOptions,
    isLoading: isLoadingOptions
  } = useOpportunityOptions();

  const isLoading = focusAreasQuery.isLoading || sectorsQuery.isLoading || isLoadingOptions;
  
  // Use the opportunity notes hook
  const {
    currentNotes,
    timeline,
    isLoadingCurrent,
    isLoadingTimeline,
    saveNextSteps,
    saveMostRecentNotes,
    isSavingNextSteps,
    isSavingNotes,
    deleteNote,
    isDeletingNote,
  } = useOpportunityNotes(opportunity?.id, opportunity?.deal_name);

  useEffect(() => {
    if (opportunity) {
      // Parse focus areas from consolidated field and any individual slots
      const consolidatedAreas = splitTokens(opportunity.lg_focus_area);
      setSelectedFocusAreas(consolidatedAreas);
      
      setEditedFields({
        summary_of_opportunity: opportunity.summary_of_opportunity || "",
        ebitda_notes: opportunity.ebitda_notes || "",
        most_recent_notes: opportunity.most_recent_notes || "",
        tier: opportunity.tier || "",
        sector: opportunity.sector || "",
        lg_focus_area: opportunity.lg_focus_area || "",
        platform_add_on: opportunity.platform_add_on || "",
        process_timeline: opportunity.process_timeline || "",
        ownership: opportunity.ownership || "",
        ownership_type: opportunity.ownership_type || "",
        url: opportunity.url || "",
        ebitda_in_ms: opportunity.ebitda_in_ms || null,
        funds: opportunity.funds || "",
        date_of_origination: opportunity.date_of_origination || "",
        investment_professional_point_person_1: opportunity.investment_professional_point_person_1 || "",
        investment_professional_point_person_2: opportunity.investment_professional_point_person_2 || "",
        investment_professional_point_person_3: opportunity.investment_professional_point_person_3 || "",
        investment_professional_point_person_4: opportunity.investment_professional_point_person_4 || "",
        acquisition_date: opportunity.acquisition_date || null,
        deal_source_company: opportunity.deal_source_company || "",
        priority: opportunity.priority || false,
      });

      // Initialize contact selections if names exist
      if (opportunity.deal_source_individual_1) {
        setSelectedSourceContact1({
          id: '',
          full_name: opportunity.deal_source_individual_1,
          email_address: '',
          organization: undefined
        });
      } else {
        setSelectedSourceContact1(null);
      }
      
      if (opportunity.deal_source_individual_2) {
        setSelectedSourceContact2({
          id: '',
          full_name: opportunity.deal_source_individual_2,
          email_address: '',
          organization: undefined
        });
      } else {
        setSelectedSourceContact2(null);
      }
    }
  }, [opportunity]);

  const handleFieldChange = (field: keyof Opportunity, value: string | number | boolean | null) => {
    setEditedFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFocusAreaChange = (newFocusAreas: string[]) => {
    setSelectedFocusAreas(newFocusAreas);
    
    // Auto-fill sector if first focus area is selected and sector is currently blank
    if (newFocusAreas.length === 1 && !editedFields.sector) {
      const selectedOption = focusAreasQuery.data?.find(opt => opt.value === newFocusAreas[0]);
      if (selectedOption?.meta?.sector_id) {
        const sector = sectorsQuery.data?.find(s => s.meta?.id === selectedOption.meta?.sector_id);
        if (sector) {
          handleFieldChange("sector", sector.value);
        }
      }
    }
  };

  const handleAddNewContact = (field: 'contact1' | 'contact2') => {
    setPendingContactField(field);
    setIsAddContactModalOpen(true);
  };

  const handleContactAdded = (newContact?: { id: string; full_name: string; email_address: string; organization?: string }) => {
    if (newContact && pendingContactField) {
      const contactResult: ContactSearchResult = {
        id: newContact.id,
        full_name: newContact.full_name,
        email_address: newContact.email_address,
        organization: newContact.organization,
      };
      
      if (pendingContactField === 'contact1') {
        setSelectedSourceContact1(contactResult);
        handleFieldChange("deal_source_individual_1", newContact.full_name);
      } else {
        setSelectedSourceContact2(contactResult);
        handleFieldChange("deal_source_individual_2", newContact.full_name);
      }
      
      queryClient.invalidateQueries({ queryKey: ['contact_search'] });
    }
    
    setIsAddContactModalOpen(false);
    setPendingContactField(null);
  };

  const handleSourceContact1Select = (contact: ContactSearchResult | null) => {
    setSelectedSourceContact1(contact);
    handleFieldChange("deal_source_individual_1", contact?.full_name || "");
  };

  const handleSourceContact2Select = (contact: ContactSearchResult | null) => {
    setSelectedSourceContact2(contact);
    handleFieldChange("deal_source_individual_2", contact?.full_name || "");
  };

  const handleSave = async () => {
    if (!opportunity) return;

    try {
      setIsUpdating(true);
      
      // Handle focus areas
      const consolidated = selectedFocusAreas.join(', ');
      
      const updatePayload: any = {
        ...editedFields,
        lg_focus_area: consolidated,
        lg_team: calculateLgTeam(
          editedFields.investment_professional_point_person_1,
          editedFields.investment_professional_point_person_2,
          editedFields.investment_professional_point_person_3,
          editedFields.investment_professional_point_person_4
        ),
        updated_at: new Date().toISOString()
      };
      
      // Update in opportunities_raw table
      const { error } = await supabase
        .from("opportunities_raw")
        .update(updatePayload)
        .eq("id", opportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });

      // Trigger refresh and wait before closing
      await onOpportunityUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast({
        title: "Error",
        description: "Failed to update opportunity",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('opportunities_raw')
        .delete()
        .eq('id', opportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity deleted successfully",
      });

      // Close drawer first
      onClose();
      
      // Then trigger async refresh
      await onOpportunityUpdated();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to delete opportunity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "tier 1":
      case "1":
        return "bg-primary-light text-primary";
      case "tier 2":
      case "2":
        return "bg-warning-light text-warning";
      case "tier 3":
      case "3":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!opportunity) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{opportunity.deal_name || "Unnamed Deal"}</SheetTitle>
              <SheetDescription>
                {opportunity.deal_source_company && (
                  <span>Source: {opportunity.deal_source_company}</span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-10 bg-background border-b py-3 -mx-6 px-6 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={isDeleting || isUpdating}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                disabled={isUpdating}
              >
                <History className="h-4 w-4 mr-2" />
                Full History
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm"
                variant="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={async () => {
                  try {
                    toast({ 
                      title: 'AI is drafting your email…',
                      description: 'This may take a moment'
                    });
                    await sendOpportunityEmail(opportunity.id);
                    toast({ 
                      title: 'Draft requested', 
                      description: 'Check your inbox shortly.' 
                    });
                  } catch (error: any) {
                    console.error('Send email error:', error);
                    toast({
                      title: 'Failed to request draft',
                      description: error?.message ?? 'Please try again.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        <>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab - All fields consolidated */}
          <TabsContent value="overview" className="space-y-6">
            {/* Status Badges */}
            <div className="flex items-center space-x-2">
              {editedFields.tier && (
                <Badge className={getTierColor(editedFields.tier)}>
                  {editedFields.tier}
                </Badge>
              )}
              {editedFields.priority && (
                <Badge variant="secondary">Priority</Badge>
              )}
            </div>

            {/* Priority Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="priority"
                checked={editedFields.priority === true}
                onCheckedChange={(checked) => 
                  handleFieldChange('priority', checked === true)
                }
              />
              <Label 
                htmlFor="priority" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Priority
              </Label>
            </div>

            {/* Key Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Information</h3>
              
              {/* LG Focus Area - Multi-select */}
              <FocusAreaSelect
                value={selectedFocusAreas}
                onChange={handleFocusAreaChange}
                disabled={isLoading}
                label="LG Focus Area"
              />

              {/* Consolidated Focus Areas (Read-only) */}
              {selectedFocusAreas.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">LG Focus Area (Consolidated)</Label>
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    {selectedFocusAreas.join(', ')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <SingleSelectDropdown
                  label="Sector"
                  options={(sectorsQuery.data || []).map(s => s.value)}
                  value={editedFields.sector || ""}
                  onChange={(value) => handleFieldChange("sector", value)}
                  placeholder="Select sector"
                  disabled={isLoading}
                />

                <SingleSelectDropdown
                  label="Tier"
                  options={tierDisplayOptions}
                  value={getTierDisplayValue(editedFields.tier)}
                  onChange={(displayValue) => {
                    const dbValue = getTierDatabaseValue(displayValue);
                    handleFieldChange("tier", dbValue);
                  }}
                  placeholder="Select tier"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Separator />

            {/* Summary of Opportunity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Summary of Opportunity</h3>
              <Textarea
                value={editedFields.summary_of_opportunity || ""}
                onChange={(e) => handleFieldChange("summary_of_opportunity", e.target.value)}
                placeholder="Enter opportunity summary"
                className="min-h-[120px] resize-none"
              />
            </div>

            <Separator />

            {/* LG Leads */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">LG Leads</h3>
              <div className="grid grid-cols-2 gap-4">
                <SingleSelectDropdown
                  label="LG Lead 1"
                  options={lgLeadOptions}
                  value={editedFields.investment_professional_point_person_1 || ""}
                  onChange={(value) => handleFieldChange("investment_professional_point_person_1", value)}
                  placeholder="Select LG lead 1"
                  disabled={isLoading}
                />

                <SingleSelectDropdown
                  label="LG Lead 2"
                  options={lgLeadOptions}
                  value={editedFields.investment_professional_point_person_2 || ""}
                  onChange={(value) => handleFieldChange("investment_professional_point_person_2", value)}
                  placeholder="Select LG lead 2"
                  disabled={isLoading}
                />

                <SingleSelectDropdown
                  label="LG Lead 3"
                  options={lgLeadOptions}
                  value={editedFields.investment_professional_point_person_3 || ""}
                  onChange={(value) => handleFieldChange("investment_professional_point_person_3", value)}
                  placeholder="Select LG lead 3"
                  disabled={isLoading}
                />

                <SingleSelectDropdown
                  label="LG Lead 4"
                  options={lgLeadOptions}
                  value={editedFields.investment_professional_point_person_4 || ""}
                  onChange={(value) => handleFieldChange("investment_professional_point_person_4", value)}
                  placeholder="Select LG lead 4"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Separator />

            {/* Deal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Deal Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <SingleSelectDropdown
                  label="Platform/Add-on"
                  options={platformAddonDisplayOptions}
                  value={getPlatformAddonDisplayValue(editedFields.platform_add_on)}
                  onChange={(displayValue) => {
                    const dbValue = getPlatformAddonDatabaseValue(displayValue);
                    handleFieldChange("platform_add_on", dbValue);
                  }}
                  placeholder="Select platform/add-on"
                  disabled={isLoading}
                />

                <SingleSelectDropdown
                  label="Ownership Type"
                  options={defaultOwnershipTypes}
                  value={editedFields.ownership_type || ""}
                  onChange={(value) => handleFieldChange("ownership_type", value)}
                  placeholder="Select ownership type"
                  disabled={isLoading}
                />

                <SingleSelectDropdown
                  label="Process Timeline"
                  options={['1-90 days', '91-180 days', '181-270 days', '271-365 days', '365+ days']}
                  value={editedFields.process_timeline || ""}
                  onChange={(value) => handleFieldChange("process_timeline", value)}
                  placeholder="Select process timeline"
                  disabled={isLoading}
                />

                <QuarterYearDropdown
                  label="Date of Origination"
                  value={editedFields.date_of_origination || opportunity.date_of_origination || ""}
                  onChange={(value) => handleFieldChange("date_of_origination", value)}
                  placeholder="Select quarter and year"
                  disabled={isLoading}
                />

                <SingleSelectDropdown
                  label="Funds"
                  options={['LG Fund VI']}
                  value={editedFields.funds || ""}
                  onChange={(value) => handleFieldChange("funds", value)}
                  placeholder="Select funds"
                  disabled={isLoading}
                />

                <div className="space-y-2">
                  <Label>Ownership</Label>
                  <Input
                    value={editedFields.ownership || ""}
                    onChange={(e) => handleFieldChange("ownership", e.target.value)}
                    placeholder="Enter ownership"
                  />
                </div>

                <div className="space-y-2">
                  <Label>EBITDA ($M)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editedFields.ebitda_in_ms ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFieldChange("ebitda_in_ms", val === "" ? null : parseFloat(val));
                    }}
                    placeholder="Enter EBITDA in millions"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Acquisition Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedFields.acquisition_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedFields.acquisition_date 
                          ? format(new Date(editedFields.acquisition_date), "MMM yyyy")
                          : "Select acquisition date"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedFields.acquisition_date ? new Date(editedFields.acquisition_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                            handleFieldChange("acquisition_date", firstDay.toISOString().split('T')[0]);
                          } else {
                            handleFieldChange("acquisition_date", null);
                          }
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* EBITDA Notes - Full width */}
              <div className="space-y-2">
                <Label>EBITDA Notes</Label>
                <Textarea
                  value={editedFields.ebitda_notes || ""}
                  onChange={(e) => handleFieldChange("ebitda_notes", e.target.value)}
                  placeholder="Additional EBITDA notes..."
                  className="min-h-[60px] resize-none"
                />
              </div>
            </div>

            <Separator />

            {/* URL */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">URL</h3>
              <div className="flex space-x-2">
                <Input
                  value={editedFields.url || ""}
                  onChange={(e) => handleFieldChange("url", e.target.value)}
                  placeholder="Enter URL"
                  className="flex-1"
                />
                {editedFields.url && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(editedFields.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Deal Source */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Deal Source</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <SingleSelectDropdown
                  label="Deal Source Company"
                  options={dealSourceCompanyOptions}
                  value={editedFields.deal_source_company || ""}
                  onChange={(value) => handleFieldChange("deal_source_company", value)}
                  placeholder="Search or add company..."
                  allowCustom
                  onAddCustom={(value) => handleFieldChange("deal_source_company", value)}
                  disabled={isUpdating}
                />

                <ContactPickerWithAddNew
                  label="Deal Source Individual #1"
                  selectedContact={selectedSourceContact1}
                  onContactSelect={handleSourceContact1Select}
                  onAddNewContact={() => handleAddNewContact('contact1')}
                />

                <ContactPickerWithAddNew
                  label="Deal Source Individual #2"
                  selectedContact={selectedSourceContact2}
                  onContactSelect={handleSourceContact2Select}
                  onAddNewContact={() => handleAddNewContact('contact2')}
                />
              </div>
            </div>

            <Separator />

            {/* Next Steps Input (without timeline) */}
            <SimpleNotesInput
              title="Next Steps"
              field="next_steps"
              placeholder="Enter next steps..."
              onSave={(content, dueDate, addInToDo) => saveNextSteps(content, dueDate, addInToDo)}
              isSaving={isSavingNextSteps}
            />

            {/* Notes Input (without timeline) */}
            <SimpleNotesInput
              title="Notes"
              field="most_recent_notes"
              placeholder="Enter notes..."
              onSave={(content) => saveMostRecentNotes(content)}
              isSaving={isSavingNotes}
            />

            <Separator />

            {/* Attachments */}
            {opportunity && (
              <OpportunityAttachmentsSection opportunityId={opportunity.id} />
            )}
          </TabsContent>

          {/* History Tab - Timeline view */}
          <TabsContent value="history" className="space-y-6">
            <OpportunityHistoryTab
              timeline={timeline}
              onDelete={deleteNote}
              isLoading={isLoadingTimeline}
              isDeleting={isDeletingNote}
            />
          </TabsContent>
        </Tabs>

        <AddContactDialog
          open={isAddContactModalOpen}
          onClose={() => {
            setIsAddContactModalOpen(false);
            setPendingContactField(null);
          }}
          onContactAdded={handleContactAdded}
        />

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={handleDelete}
          title="Delete Opportunity"
          description={`Are you sure you want to delete "${opportunity.deal_name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />

        <FullHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          title={`Full History: ${opportunity.deal_name || "Opportunity"}`}
          description="Complete timeline of next steps and notes"
          timeline={(timeline || []) as TimelineItem[]}
          fieldLabels={{
            next_steps: "Next Steps",
            most_recent_notes: "Notes",
          }}
        />
        </>
      </SheetContent>
    </Sheet>
  );
}

function OpportunityAttachmentsSection({ opportunityId }: { opportunityId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { attachments, isLoading, uploadFile, isUploading, deleteFile, isDeleting, downloadFile, getFileUrl } = 
    useEntityAttachments('opportunity', opportunityId);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Attachments</h3>
          {attachments.length > 0 && (
            <Badge variant="secondary">{attachments.length}</Badge>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-4 pt-4">
        <AttachmentUpload
          onUpload={(file, description) => uploadFile({ file, description })}
          isUploading={isUploading}
        />
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AttachmentList
            attachments={attachments}
            onDownload={downloadFile}
            onDelete={deleteFile}
            onGetFileUrl={getFileUrl}
            isDeleting={isDeleting}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
