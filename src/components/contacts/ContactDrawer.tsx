import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useContactNotes } from "@/hooks/useContactNotes";
import { useContactNextSteps } from "@/hooks/useContactNextSteps";
import { useContactGroups } from "@/hooks/useContactGroups";
import { useContactEmails } from "@/hooks/useContactEmails";
import { format } from 'date-fns';
import { parseFlexibleDate } from '@/utils/dateUtils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, User, Mail, Building, Loader2, ExternalLink, Trash2, Plus, ChevronDown, ChevronUp, Paperclip, History, Linkedin } from "lucide-react";
import { useContactOpps } from "@/hooks/useContactOpps";
import { Skeleton } from "@/components/ui/skeleton";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { useSectors, useFocusAreasBySector } from "@/hooks/useLookups";
import { DuplicateWarningBanner } from "./DuplicateWarningBanner";
import { ContactLockBanner } from "./ContactLockBanner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useDeleteContact } from "@/hooks/useDeleteContact";
import { useEntityAttachments } from "@/hooks/useEntityAttachments";
import { AttachmentUpload } from "@/components/attachments/AttachmentUpload";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FullHistoryDialog, TimelineItem } from "@/components/shared/FullHistoryDialog";
import { SingleSelectDropdown } from "@/components/opportunities/SingleSelectDropdown";
import { useOpportunityOptions } from "@/hooks/useOpportunityOptions";
import { ContactGroupsSection } from "./ContactGroupsSection";
import { ContactOpportunitiesSection } from "./ContactOpportunitiesSection";
import { ContactSimpleNotesInput } from "./ContactSimpleNotesInput";

// X/Twitter icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ContactRaw {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  title: string | null;
  organization: string | null;
  areas_of_specialization: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  notes: string | null;
  delta_type: string | null;
  delta: number | null;
  lg_sector: string | null;
  lg_focus_area_1: string | null;
  lg_focus_area_2: string | null;
  lg_focus_area_3: string | null;
  lg_focus_area_4: string | null;
  lg_focus_area_5: string | null;
  lg_focus_area_6: string | null;
  lg_focus_area_7: string | null;
  lg_focus_area_8: string | null;
  category: string | null;
  phone: string | null;
  url_to_online_bio: string | null;
  lg_lead: string | null;
  lg_assistant: string | null;
  group_contact: string | null;
  group_email_role: string | null;
  group_delta: number | null;
  group_notes: string | null;
  linkedin_url: string | null;
  x_twitter_url: string | null;
  intentional_no_outreach: boolean | null;
  intentional_no_outreach_date: string | null;
  intentional_no_outreach_note: string | null;
  most_recent_contact: string | null;
  most_recent_group_contact: string | null;
  of_emails: number | null;
  of_meetings: number | null;
  follow_up_days: number | null;
  follow_up_recency_threshold: number | null;
  follow_up_date: string | null;
  priority: boolean | null;
}

interface ContactApp {
  id: string | null;
  full_name: string | null;
  email_address: string | null;
  organization: string | null;
  title: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  of_emails: number | null;
  of_meetings: number | null;
  all_opps: number | null;
  most_recent_contact: string | null;
  most_recent_group_contact: string | null;
  group_contact: string | null;
}

interface ContactDrawerProps {
  contact: ContactApp | null;
  open: boolean;
  onClose: () => void;
  onContactUpdated: () => void | Promise<void>;
}

export function ContactDrawer({ contact, open, onClose, onContactUpdated }: ContactDrawerProps) {
  const [contactData, setContactData] = useState<ContactRaw | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailType, setNewEmailType] = useState<'work' | 'personal' | 'alternate'>('work');
  const { toast } = useToast();
  
  const { deleteContact, isDeleting } = useDeleteContact({
    onSuccess: () => {
      setDeleteConfirmOpen(false);
      onContactUpdated();
      onClose();
    }
  });
  
  // Contact notes hook
  const {
    currentNotes,
    timeline,
    isLoadingCurrent,
    isLoadingTimeline,
    saveNotes,
    isSavingNotes,
    deleteNote,
    isDeletingNote,
  } = useContactNotes(contact?.id);

  // Contact next steps hook
  const {
    currentNextSteps,
    timeline: nextStepsTimeline,
    isLoadingCurrent: isLoadingNextSteps,
    isLoadingTimeline: isLoadingNextStepsTimeline,
    saveNextSteps,
    isSaving: isSavingNextSteps,
    deleteNextStep,
    isDeleting: isDeletingNextStep,
  } = useContactNextSteps(contact?.id, contact?.full_name || contact?.email_address || undefined);

  // Fetch all groups this contact belongs to
  const { data: contactGroupMemberships = [], isLoading: isLoadingGroups } = useContactGroups(contact?.id || null);
  
  // Hook for managing contact email addresses
  const { 
    emails, 
    isLoading: isLoadingEmails, 
    addEmail, 
    setAsPrimary, 
    deleteEmail,
    isAdding: isAddingNewEmail,
    isSettingPrimary,
    isDeleting: isDeletingEmail
  } = useContactEmails(contact?.id);

  // Use canonical lookup options
  const sectorsQuery = useSectors();
  const focusAreasQuery = useFocusAreasBySector(contactData?.lg_sector || undefined);
  const { lgLeadOptions } = useOpportunityOptions();

  // Hook to fetch opportunities for this contact
  const { data: contactOpps = [], isLoading: isLoadingOpps, error: oppsError } = useContactOpps(contactData?.full_name);

  // Load full contact data from contacts_raw when contact changes
  useEffect(() => {
    if (contact?.id && open) {
      loadContactData(contact.id);
    }
  }, [contact?.id, open]);

  // Parse focus areas when contact data changes
  useEffect(() => {
    if (contactData?.lg_focus_areas_comprehensive_list) {
      const areas = contactData.lg_focus_areas_comprehensive_list
        .split(',')
        .map(area => area.trim())
        .filter(Boolean);
      setSelectedFocusAreas(areas);
    } else {
      setSelectedFocusAreas([]);
    }
  }, [contactData?.lg_focus_areas_comprehensive_list]);

  const loadContactData = async (contactId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts_raw")
        .select("*")
        .eq("id", contactId)
        .maybeSingle();

      if (error) {
        console.error({ where: 'ContactDrawer', contactId, error });
        toast({
          title: "Error loading contact",
          description: "Failed to load contact details.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data) {
        toast({
          title: "Contact not found",
          description: "This contact record could not be found.",
          variant: "destructive",
        });
        return;
      }
      
      setContactData(data);
    } catch (error) {
      console.error({ where: 'ContactDrawer', contactId, error });
      toast({
        title: "Error",
        description: "Failed to load contact details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contactData) return;

    try {
      setSaving(true);
      
      const updateData = {
        ...contactData,
        email_address: contactData.email_address?.toLowerCase() || null,
        delta: contactData.delta === null || contactData.delta === undefined || String(contactData.delta).trim() === "" ? null : Number(contactData.delta),
        lg_focus_areas_comprehensive_list: selectedFocusAreas.join(', '),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("contacts_raw")
        .update(updateData)
        .eq("id", contactData.id);

      if (error) {
        console.error({ where: 'ContactDrawer', contactId: contactData.id, error });
        throw error;
      }

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });

      await onContactUpdated();
      onClose();
    } catch (error) {
      console.error({ where: 'ContactDrawer', contactId: contactData?.id, error });
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFocusAreaChange = (newFocusAreas: string[]) => {
    setSelectedFocusAreas(newFocusAreas);
    
    if (newFocusAreas.length === 1 && (!contactData?.lg_sector || contactData.lg_sector.trim() === '')) {
      const selectedOption = focusAreasQuery.data?.find(opt => opt.value === newFocusAreas[0]);
      if (selectedOption?.meta?.sector_id) {
        const sector = sectorsQuery.data?.find(s => s.meta?.id === selectedOption.meta?.sector_id);
        if (sector) {
          updateField("lg_sector", sector.value);
        }
      }
    }
  };

  const updateField = (field: keyof ContactRaw, value: string | number | boolean | null) => {
    if (!contactData) return;
    
    if (field === "delta") {
      const numValue = value === null || value === "" ? null : Number(value);
      setContactData({ ...contactData, [field]: numValue });
    } else {
      setContactData({ ...contactData, [field]: value });
    }
  };
  
  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    addEmail({ email: newEmail.trim(), type: newEmailType });
    setNewEmail('');
    setNewEmailType('work');
    setIsAddingEmail(false);
  };

  const openExternalLink = (url: string | null) => {
    if (!url) return;
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  if (!contact) {
    return null;
  }

  // Calculate stats
  const totalContacts = (contactData?.of_emails || 0) + (contactData?.of_meetings || 0);
  const opportunityCount = contactOpps.length;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          {contactData?.email_address && (
            <>
              <DuplicateWarningBanner email={contactData.email_address} />
              <ContactLockBanner contactId={contactData.id} />
            </>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Edit Contact</SheetTitle>
                <SheetDescription>{contact.full_name || "Unknown Contact"}</SheetDescription>
              </div>
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
                disabled={saving || loading || isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                disabled={saving || loading || isDeleting}
              >
                <History className="h-4 w-4 mr-2" />
                View Full History
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSave} disabled={saving || loading || isDeleting}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving || isDeleting}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-center text-sm text-muted-foreground">Loading contact details...</p>
          </div>
        ) : saving ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-center text-sm text-muted-foreground">Saving changes...</p>
          </div>
        ) : contactData ? (
          <>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            {/* ========== OVERVIEW TAB ========== */}
            <TabsContent value="overview" className="space-y-6">
              {/* Priority */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="priority"
                  checked={contactData.priority || false}
                  onCheckedChange={(checked) => updateField("priority", checked)}
                />
                <Label htmlFor="priority" className="cursor-pointer font-medium">Priority Contact</Label>
              </div>

              {/* Full Name, Organization, Title */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={contactData.full_name || ""}
                    onChange={(e) => updateField("full_name", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      value={contactData.organization || ""}
                      onChange={(e) => updateField("organization", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={contactData.title || ""}
                      onChange={(e) => updateField("title", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Max Lag (Days) & Follow-Up Days */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delta">Max Lag (Days)</Label>
                  <Input
                    id="delta"
                    type="number"
                    value={contactData.delta || ""}
                    onChange={(e) => updateField("delta", e.target.value)}
                    placeholder="e.g., 30"
                  />
                </div>
                <div>
                  <Label htmlFor="follow_up_days">Follow-Up Days</Label>
                  <Input
                    id="follow_up_days"
                    type="number"
                    min="0"
                    value={contactData.follow_up_days ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseInt(e.target.value);
                      updateField("follow_up_days", value);
                    }}
                    placeholder="e.g., 7"
                  />
                </div>
              </div>

              <Separator />

              {/* LG Sector, Focus Areas, Specialization */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="lg_sector">LG Sector</Label>
                  <Select 
                    value={contactData.lg_sector || ""} 
                    onValueChange={(value) => updateField("lg_sector", value)}
                    disabled={sectorsQuery.isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {(sectorsQuery.data || []).map((sector) => (
                        <SelectItem key={sector.value} value={sector.value}>
                          {sector.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FocusAreaSelect
                    value={selectedFocusAreas}
                    onChange={handleFocusAreaChange}
                    disabled={focusAreasQuery.isLoading}
                    label="LG Focus Areas Comprehensive List"
                  />
                </div>

                <div>
                  <Label htmlFor="areas_of_specialization">Areas of Specialization</Label>
                  <Textarea
                    id="areas_of_specialization"
                    value={contactData.areas_of_specialization || ""}
                    onChange={(e) => updateField("areas_of_specialization", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Groups Section */}
              <ContactGroupsSection
                contactId={contactData.id}
                contactFullName={contactData.full_name || ''}
                contactEmail={contactData.email_address || ''}
                groups={contactGroupMemberships}
                isLoading={isLoadingGroups}
              />

              <Separator />

              {/* Notes */}
              <ContactSimpleNotesInput
                title="Notes"
                field="notes"
                placeholder="Enter notes..."
                currentValue={currentNotes?.notes}
                onSave={(content) => saveNotes(content)}
                isSaving={isSavingNotes}
              />

              {/* Next Steps */}
              <ContactSimpleNotesInput
                title="Next Steps"
                field="next_steps"
                placeholder="Enter next steps..."
                currentValue={currentNextSteps?.next_steps}
                onSave={(content, dueDate, addInToDo) => saveNextSteps(content, dueDate, addInToDo)}
                isSaving={isSavingNextSteps}
              />

              <Separator />

              {/* Contact History at a Glance */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Contact History at a Glance</Label>
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {contactData.most_recent_contact 
                        ? format(parseFlexibleDate(contactData.most_recent_contact) || new Date(), 'MMM d')
                        : '—'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Most Recent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalContacts}</p>
                    <p className="text-xs text-muted-foreground"># of Contacts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{opportunityCount}</p>
                    <p className="text-xs text-muted-foreground"># of Opportunities</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ========== DETAILS TAB ========== */}
            <TabsContent value="details" className="space-y-6">
              {/* First Name, Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={contactData.first_name || ""}
                    onChange={(e) => updateField("first_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={contactData.last_name || ""}
                    onChange={(e) => updateField("last_name", e.target.value)}
                  />
                </div>
              </div>

              {/* All Email Addresses */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">All Email Addresses ({emails.length})</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllEmails(!showAllEmails)}
                  >
                    {showAllEmails ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
                
                {showAllEmails && (
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    {isLoadingEmails ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Loading emails...</span>
                      </div>
                    ) : emails.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No email addresses found
                      </p>
                    ) : (
                      emails.map((email) => (
                        <div key={email.id} className="flex items-center justify-between p-2 border rounded bg-background">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="text-sm truncate">{email.email_address}</span>
                            {email.is_primary && (
                              <Badge variant="default" className="flex-shrink-0">Primary</Badge>
                            )}
                            <Badge variant="outline" className="flex-shrink-0 capitalize">{email.email_type}</Badge>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {!email.is_primary && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAsPrimary(email.id)}
                                  disabled={isSettingPrimary}
                                  title="Set as primary email"
                                >
                                  Set Primary
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteEmail(email.id)}
                                  disabled={isDeletingEmail}
                                  title="Delete this email"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Add Email Form */}
                    {isAddingEmail ? (
                      <div className="space-y-2 p-3 border rounded bg-background">
                        <Label htmlFor="new_email">New Email Address</Label>
                        <Input
                          id="new_email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="email@example.com"
                        />
                        <Label htmlFor="new_email_type">Type</Label>
                        <Select value={newEmailType} onValueChange={(value: any) => setNewEmailType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="work">Work</SelectItem>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="alternate">Alternate</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddEmail}
                            disabled={isAddingNewEmail}
                          >
                            {isAddingNewEmail ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Adding...
                              </>
                            ) : (
                              'Add Email'
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsAddingEmail(false);
                              setNewEmail('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingEmail(true)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Email Address
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={contactData.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              <Separator />

              {/* Opportunities Section */}
              <ContactOpportunitiesSection
                contactId={contactData.id}
                contactFullName={contactData.full_name || ''}
                opportunities={contactOpps}
                isLoading={isLoadingOpps}
                error={oppsError}
              />

              <Separator />

              {/* Files / Attachments */}
              <AttachmentsSection contactId={contactData.id} />

              <Separator />

              {/* Social Profiles & Links */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Social Profiles & Links</Label>
                
                {/* Online Bio URL */}
                <div className="space-y-2">
                  <Label htmlFor="url_to_online_bio">Online Bio URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url_to_online_bio"
                      value={contactData.url_to_online_bio || ""}
                      onChange={(e) => updateField("url_to_online_bio", e.target.value)}
                      placeholder="https://example.com/bio"
                      className="flex-1"
                    />
                    {contactData.url_to_online_bio && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openExternalLink(contactData.url_to_online_bio)}
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* LinkedIn Profile */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                  <div className="flex gap-2">
                    <Input
                      id="linkedin_url"
                      value={contactData.linkedin_url || ""}
                      onChange={(e) => updateField("linkedin_url", e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="flex-1"
                    />
                    {contactData.linkedin_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openExternalLink(contactData.linkedin_url)}
                        title="Open LinkedIn profile"
                        className="text-[#0A66C2]"
                      >
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* X / Twitter */}
                <div className="space-y-2">
                  <Label htmlFor="x_twitter_url">X / Twitter</Label>
                  <div className="flex gap-2">
                    <Input
                      id="x_twitter_url"
                      value={contactData.x_twitter_url || ""}
                      onChange={(e) => updateField("x_twitter_url", e.target.value)}
                      placeholder="https://x.com/username"
                      className="flex-1"
                    />
                    {contactData.x_twitter_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openExternalLink(contactData.x_twitter_url)}
                        title="Open X profile"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Team Assignment */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Team Assignment</Label>
                
                <SingleSelectDropdown
                  label="LG Lead"
                  value={contactData.lg_lead || ''}
                  onChange={(value) => updateField('lg_lead', value)}
                  options={lgLeadOptions}
                  placeholder="Select LG Lead"
                />

                <div>
                  <Label htmlFor="lg_assistant">LG Assistant</Label>
                  <Input
                    id="lg_assistant"
                    value={contactData.lg_assistant || ""}
                    onChange={(e) => updateField("lg_assistant", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <ConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={(open) => !isDeleting && setDeleteConfirmOpen(open)}
            onConfirm={() => contactData && deleteContact(contactData.id)}
            title="Delete Contact?"
            description={`Are you sure you want to delete ${contactData?.full_name || 'this contact'}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
          />

          <FullHistoryDialog
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
            title={`Full History: ${contactData?.full_name || "Contact"}`}
            description="Complete timeline of all notes and next steps"
            timeline={[
              ...(timeline || []).map((item) => ({
                ...item,
                field: item.field,
              })),
              ...(nextStepsTimeline || []).map((item) => ({
                ...item,
                field: item.field,
              })),
            ] as TimelineItem[]}
            fieldLabels={{
              notes: "Notes",
              next_steps: "Next Steps",
            }}
          />
          </>
        ) : !loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Contact not found</p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function AttachmentsSection({ contactId }: { contactId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { attachments, isLoading, uploadFile, isUploading, deleteFile, isDeleting, downloadFile, getFileUrl } = 
    useEntityAttachments('contact', contactId);

  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Files / Attachments</Label>
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
    </div>
  );
}
