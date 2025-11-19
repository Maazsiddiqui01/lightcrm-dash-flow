import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useContactNotes } from "@/hooks/useContactNotes";
import { useContactNextSteps } from "@/hooks/useContactNextSteps";
import { useGroupNotes } from "@/hooks/useGroupNotes";
import { useContactGroups } from "@/hooks/useContactGroups";
import { useRemoveContactFromGroup } from "@/hooks/useRemoveContactFromGroup";
import { useContactEmails } from "@/hooks/useContactEmails";
import { ContactNotesSection } from "./ContactNotesSection";
import { ContactNextStepsSection } from "./ContactNextStepsSection";
import { GroupNotesSection } from "./GroupNotesSection";
import { format } from 'date-fns';
import { parseFlexibleDate } from '@/utils/dateUtils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, User, Mail, Building, Target, Calendar, Loader2, Clock, ExternalLink, Briefcase, UserX, Trash2, Users, Plus, ChevronDown, ChevronUp, Paperclip, History } from "lucide-react";
import { useContactOpps } from "@/hooks/useContactOpps";
import { Skeleton } from "@/components/ui/skeleton";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { useSectors, useFocusAreasBySector, findMatchingOption } from "@/hooks/useLookups";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

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
  email_address: string | null;
  full_name?: string | null;
  [key: string]: any;
}

interface Interaction {
  id: string;
  source: string;
  subject: string | null;
  occurred_at: string | null;
  from_name: string | null;
  to_names: string | null;
  cc_names: string | null;
}

interface ContactDrawerProps {
  contact: ContactApp;
  open: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
}

export default function ContactDrawer({ contact, open, onClose, onContactUpdated }: ContactDrawerProps) {
  const { toast } = useToast();
  const [contactData, setContactData] = useState<ContactRaw | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const { deleteContact, isDeleting } = useDeleteContact();
  
  const { currentNotes, timeline, saveNotes, isLoadingCurrent, isLoadingTimeline, isSavingNotes, deleteNote, isDeletingNote } = useContactNotes(contact?.id);
  const { 
    currentNextSteps, 
    timeline: nextStepsTimeline, 
    saveNextSteps, 
    isLoadingCurrent: isLoadingNextSteps,
    isLoadingTimeline: isLoadingNextStepsTimeline,
    isSaving: isSavingNextSteps,
    deleteNextStep,
    isDeleting: isDeletingNextStep
  } = useContactNextSteps(contact?.id);
  const {
    currentNotes: groupCurrentNotes,
    timeline: groupTimeline,
    saveNotes: saveGroupNotes,
    isLoadingCurrent: isLoadingGroupCurrent,
    isLoadingTimeline: isLoadingGroupTimeline,
    isSavingNotes: isSavingGroupNotes
  } = useGroupNotes(contactData?.group_contact);
  const { data: contactGroupMemberships = [], isLoading: groupMembershipsLoading } = useContactGroups(contact?.id);
  const { mutate: removeFromGroup, isPending: removingFromGroup } = useRemoveContactFromGroup();
  const contactEmailsQuery = useContactEmails(contact?.id);
  const focusAreasQuery = useFocusAreasBySector();
  const sectorsQuery = useSectors();
  const selectedFocusAreas = contactData?.lg_focus_areas_comprehensive_list?.split(',').map(fa => fa.trim()).filter(fa => fa) || [];
  const { lgLeadOptions } = useOpportunityOptions();
  const { data: contactOpps = [], isLoading: contactOppsLoading } = useContactOpps(contact?.id);

  useEffect(() => {
    if (open && contact?.id) {
      loadContactData();
      loadInteractions();
    }
  }, [open, contact]);

  const loadContactData = async () => {
    if (!contact?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('contacts_raw').select('*').eq('id', contact.id).single();
      if (error) throw error;
      setContactData(data);
    } catch (error: any) {
      console.error("Error loading contact:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load contact details" });
    } finally {
      setLoading(false);
    }
  };

  const loadInteractions = async () => {
    if (!contact?.email_address) return;
    try {
      const { data, error } = await supabase.from('emails_meetings_raw').select('id, source, subject, occurred_at, from_name, to_names, cc_names').contains('emails_arr', [contact.email_address]).order('occurred_at', { ascending: false }).limit(50);
      if (error) throw error;
      setInteractions(data || []);
    } catch (error: any) {
      console.error("Error loading interactions:", error);
    }
  };

  const handleSave = async () => {
    if (!contactData || !contact.id) return;
    setSaving(true);
    try {
      const updates = { ...contactData, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('contacts_raw').update(updates).eq('id', contact.id);
      if (error) throw error;
      toast({ title: "Success", description: "Contact updated successfully" });
      onContactUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error saving contact:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save contact" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ContactRaw, value: any) => {
    if (!contactData) return;
    setContactData({ ...contactData, [field]: value });
  };

  const handleFocusAreaChange = (newSelection: string[]) => {
    const newValue = newSelection.length > 0 ? newSelection.join(', ') : null;
    updateField('lg_focus_areas_comprehensive_list', newValue);
    if (newSelection.length > 0 && !contactData?.lg_sector) {
      const firstOption = focusAreasQuery.data?.find(opt => opt.value === newSelection[0]);
      if (firstOption?.meta?.sector_id) {
        const sector = sectorsQuery.data?.find(s => s.meta?.id === firstOption.meta?.sector_id);
        if (sector) {
          updateField('lg_sector', sector.value);
        }
      }
    }
  };

  const handleDeleteContact = async () => {
    if (!contact?.id) return;
    try {
      deleteContact(contact.id);
      onContactUpdated();
      onClose();
    } catch (error) {}
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          {contact?.id && contact?.email_address && (
            <>
              <DuplicateWarningBanner email={contact.email_address} />
              <ContactLockBanner contactId={contact.id} />
            </>
          )}
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Edit Contact</SheetTitle>
              <SheetDescription>{contact.full_name || "Unknown Contact"}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="sticky top-0 z-10 bg-background border-b pb-3 mb-4 pt-4">
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || loading || isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHistoryDialogOpen(true)} disabled={saving || loading || isDeleting}>
                <History className="h-4 w-4 mr-2" />View Full History
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSave} disabled={saving || loading || isDeleting}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving || isDeleting}>
                <X className="h-4 w-4 mr-2" />Cancel
              </Button>
            </div>
          </div>
        </div>

        {loading || saving ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            <p className="text-center text-sm text-muted-foreground">{loading ? 'Loading contact details...' : 'Saving changes...'}</p>
          </div>
        ) : contactData ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
              <TabsTrigger value="opportunities">Opps</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" value={contactData.full_name || ""} onChange={(e) => updateField("full_name", e.target.value)} />
                </div>

                {contactEmailsQuery.emails && contactEmailsQuery.emails.length > 0 && (
                  <div className="space-y-2">
                    <Label>All Email Addresses</Label>
                    <div className="space-y-2">
                      {contactEmailsQuery.emails.map((emailRecord) => (
                        <div key={emailRecord.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1">{emailRecord.email_address}</span>
                          {emailRecord.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                          <Badge variant="outline" className="text-xs">{emailRecord.email_type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={contactData.phone || ""} onChange={(e) => updateField("phone", e.target.value)} />
                </div>

                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input id="organization" value={contactData.organization || ""} onChange={(e) => updateField("organization", e.target.value)} />
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={contactData.title || ""} onChange={(e) => updateField("title", e.target.value)} />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="priority" checked={contactData.priority === true} onCheckedChange={(checked) => updateField('priority', checked === true)} />
                  <Label htmlFor="priority" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Priority</Label>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Emails</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contactData.of_emails || 0}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Number of Meetings</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contactData.of_meetings || 0}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Follow-Up Date</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contactData.follow_up_date ? format(new Date(contactData.follow_up_date), 'MMM d, yyyy') : 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <FocusAreaSelect value={selectedFocusAreas} onChange={handleFocusAreaChange} disabled={focusAreasQuery.isLoading} label="LG Focus Areas Comprehensive List" sectorId={contactData?.lg_sector ? sectorsQuery.data?.find(s => s.label === contactData.lg_sector)?.meta?.id : undefined} />
                {selectedFocusAreas.length > 0 && !contactData?.lg_sector && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      💡 <button type="button" className="text-primary hover:underline" onClick={() => {
                        const firstOption = focusAreasQuery.data?.find(opt => opt.value === selectedFocusAreas[0]);
                        if (firstOption?.meta?.sector_id) {
                          const sector = sectorsQuery.data?.find(s => s.meta?.id === firstOption.meta?.sector_id);
                          if (sector) updateField("lg_sector", sector.value);
                        }
                      }}>
                        Auto-fill sector with "{(() => {
                          const firstOption = focusAreasQuery.data?.find(opt => opt.value === selectedFocusAreas[0]);
                          if (firstOption?.meta?.sector_id) {
                            const sector = sectorsQuery.data?.find(s => s.meta?.id === firstOption.meta?.sector_id);
                            return sector?.label;
                          }
                          return '';
                        })()}"
                      </button>
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="lg_sector">LG Sector</Label>
                  <Select value={contactData.lg_sector || ""} onValueChange={(value) => updateField("lg_sector", value)}>
                    <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                    <SelectContent>
                      {sectorsQuery.data?.map((sector) => (
                        <SelectItem key={sector.value} value={sector.value}>{sector.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={contactData.category || ""} onChange={(e) => updateField("category", e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Name Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" value={contactData.first_name || ""} onChange={(e) => updateField("first_name", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" value={contactData.last_name || ""} onChange={(e) => updateField("last_name", e.target.value)} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Professional Information</h3>
                <div>
                  <Label htmlFor="areas_of_specialization">Areas of Specialization</Label>
                  <Textarea id="areas_of_specialization" value={contactData.areas_of_specialization || ""} onChange={(e) => updateField("areas_of_specialization", e.target.value)} rows={3} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Profiles & URLs</h3>
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input id="linkedin_url" type="url" value={contactData.linkedin_url || ""} onChange={(e) => updateField("linkedin_url", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="x_twitter_url">X (Twitter) URL</Label>
                  <Input id="x_twitter_url" type="url" value={contactData.x_twitter_url || ""} onChange={(e) => updateField("x_twitter_url", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="url_to_online_bio">URL to Online Bio</Label>
                  <Input id="url_to_online_bio" type="url" value={contactData.url_to_online_bio || ""} onChange={(e) => updateField("url_to_online_bio", e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">LG Team</h3>
                <div>
                  <SingleSelectDropdown label="LG Lead" options={lgLeadOptions} value={contactData.lg_lead || ""} onChange={(value) => updateField("lg_lead", value)} placeholder="Select LG Lead" allowCustom={false} />
                </div>
                <div>
                  <Label htmlFor="lg_assistant">LG Assistant</Label>
                  <Input id="lg_assistant" value={contactData.lg_assistant || ""} onChange={(e) => updateField("lg_assistant", e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Delta Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="delta_type">Delta Type</Label>
                    <Input id="delta_type" value={contactData.delta_type || ""} onChange={(e) => updateField("delta_type", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="delta">Delta (days)</Label>
                    <Input id="delta" type="number" value={contactData.delta || ""} onChange={(e) => updateField("delta", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Timeline</h3>
                <div>
                  <Label>Most Recent Contact</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contactData.most_recent_contact ? format(new Date(contactData.most_recent_contact), 'MMM d, yyyy') : 'No contact recorded'}</span>
                  </div>
                </div>
                {contactData.most_recent_group_contact && (
                  <div>
                    <Label>Most Recent Group Contact</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(contactData.most_recent_group_contact), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">LG Focus Areas (Individual)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <div key={num}>
                      <Label htmlFor={`lg_focus_area_${num}`}>LG Focus Area {num}</Label>
                      <Input id={`lg_focus_area_${num}`} value={contactData[`lg_focus_area_${num}` as keyof ContactRaw] as string || ""} onChange={(e) => updateField(`lg_focus_area_${num}` as keyof ContactRaw, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* GROUPS TAB */}
            <TabsContent value="groups" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Legacy Group Information</h3>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="text-sm text-amber-900 dark:text-amber-200">⚠️ Legacy group fields (below) are being phased out. Use "Group Memberships" section for new many-to-many group associations.</p>
                </div>
                
                <div>
                  <Label htmlFor="group_contact">Group Contact (Legacy)</Label>
                  <Input id="group_contact" value={contactData.group_contact || ""} onChange={(e) => updateField("group_contact", e.target.value)} placeholder="Enter group name (optional)" />
                </div>

                <div>
                  <Label htmlFor="group_email_role">Group Email Role (Legacy)</Label>
                  <Select value={contactData.group_email_role || undefined} onValueChange={(value) => updateField("group_email_role", value || null)}>
                    <SelectTrigger><SelectValue placeholder="None - Select role if in a group" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to">To (Primary Recipient)</SelectItem>
                      <SelectItem value="cc">CC (Carbon Copy)</SelectItem>
                      <SelectItem value="bcc">BCC (Blind Carbon Copy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {contactData.group_delta !== null && (
                  <div>
                    <Label>Group Delta (Legacy)</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contactData.group_delta} days</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Group Memberships</h3>
                </div>
                
                {groupMembershipsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : contactGroupMemberships.length > 0 ? (
                  <div className="space-y-2">
                    {contactGroupMemberships.map((membership) => (
                      <div key={membership.group_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{membership.group_name}</span>
                            {membership.email_role && <Badge variant="outline" className="text-xs">{membership.email_role.toUpperCase()}</Badge>}
                          </div>
                          {membership.focus_area && <div className="text-xs text-muted-foreground">Focus: {membership.focus_area}</div>}
                          {membership.sector && <div className="text-xs text-muted-foreground">Sector: {membership.sector}</div>}
                          {membership.max_lag_days && <div className="text-xs text-muted-foreground">Max Lag: {membership.max_lag_days} days</div>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (confirm(`Remove ${contactData.full_name} from group "${membership.group_name}"?`)) {
                            removeFromGroup({ contactId: contact.id!, groupId: membership.group_id });
                          }
                        }} disabled={removingFromGroup}>
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Not a member of any groups</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity" className="space-y-6">
              <ContactNextStepsSection currentValue={currentNextSteps?.next_steps || null} currentDueDate={currentNextSteps?.next_steps_due_date || null} timeline={nextStepsTimeline} onSave={saveNextSteps} onDelete={deleteNextStep} isSaving={isSavingNextSteps} isDeleting={isDeletingNextStep} isLoadingCurrent={isLoadingNextSteps} isLoadingTimeline={isLoadingNextStepsTimeline} />
              <Separator />
              <ContactNotesSection title="Notes" field="notes" currentValue={currentNotes?.notes || null} timeline={timeline} onSave={saveNotes} onDelete={deleteNote} isLoadingCurrent={isLoadingCurrent} isLoadingTimeline={isLoadingTimeline} isSaving={isSavingNotes} isDeleting={isDeletingNote} />
              {contactData.group_contact && (
                <>
                  <Separator />
                  <GroupNotesSection title="Group Notes (Legacy)" field="group_notes" currentValue={groupCurrentNotes?.notes || null} timeline={groupTimeline} onSave={saveGroupNotes} isLoadingCurrent={isLoadingGroupCurrent} isLoadingTimeline={isLoadingGroupTimeline} isSaving={isSavingGroupNotes} showSharedIndicator={true} />
                </>
              )}
              <Separator />
              <Collapsible>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Contact Emails</h3>
                    {contactEmailsQuery.emails && <Badge variant="secondary">{contactEmailsQuery.emails.length}</Badge>}
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4" /></Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2">
                  {contactEmailsQuery.isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : contactEmailsQuery.emails && contactEmailsQuery.emails.length > 0 ? (
                    contactEmailsQuery.emails.map((emailRecord) => (
                      <div key={emailRecord.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{emailRecord.email_address}</span>
                        {emailRecord.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                        <Badge variant="outline" className="text-xs">{emailRecord.email_type}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No additional email addresses</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>

            {/* TRACKING TAB */}
            <TabsContent value="tracking" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Intentional No Outreach</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox id="intentional_no_outreach" checked={contactData.intentional_no_outreach === true} onCheckedChange={(checked) => updateField('intentional_no_outreach', checked === true)} />
                  <Label htmlFor="intentional_no_outreach">Mark as Intentional No Outreach</Label>
                </div>
                {contactData.intentional_no_outreach && (
                  <>
                    <div>
                      <Label htmlFor="intentional_no_outreach_date">No Outreach Date</Label>
                      <Input id="intentional_no_outreach_date" type="date" value={contactData.intentional_no_outreach_date || ""} onChange={(e) => updateField("intentional_no_outreach_date", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="intentional_no_outreach_note">No Outreach Note</Label>
                      <Textarea id="intentional_no_outreach_note" value={contactData.intentional_no_outreach_note || ""} onChange={(e) => updateField("intentional_no_outreach_note", e.target.value)} rows={3} />
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Follow-Up Configuration</h3>
                <div>
                  <Label htmlFor="follow_up_days">Follow-Up Days</Label>
                  <Input id="follow_up_days" type="number" value={contactData.follow_up_days || ""} onChange={(e) => updateField("follow_up_days", e.target.value ? Number(e.target.value) : null)} />
                  <p className="text-xs text-muted-foreground mt-1">Number of days after last contact to schedule follow-up. Set to 0 to disable.</p>
                </div>
                <details className="border rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-medium">Advanced: Follow-up Recency Threshold</summary>
                  <div className="mt-3">
                    <Label htmlFor="follow_up_recency_threshold">Recency Threshold (days)</Label>
                    <Input id="follow_up_recency_threshold" type="number" value={contactData.follow_up_recency_threshold || ""} onChange={(e) => updateField("follow_up_recency_threshold", e.target.value ? Number(e.target.value) : null)} />
                    <p className="text-xs text-muted-foreground mt-1">Only schedule follow-ups if last contact was within this many days. Default: 15.</p>
                  </div>
                </details>
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <strong>How it works:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Follow-up date = Last contact + Follow-up days</li>
                    <li>Only shows if last contact is within {contactData.follow_up_recency_threshold || 15} days</li>
                    <li>Blanks out if calculated date is in the past</li>
                    <li>Set days to 0 to disable follow-ups</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* OPPORTUNITIES TAB */}
            <TabsContent value="opportunities" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Associated Opportunities</h3>
                  {contactOpps.length > 0 && <Badge variant="secondary">{contactOpps.length}</Badge>}
                </div>
                {contactOppsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : contactOpps.length > 0 ? (
                  <div className="space-y-2">
                    {contactOpps.map((opp: any) => (
                      <div key={opp.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{opp.deal_name}</span>
                              {opp.status && <Badge variant="outline" className="text-xs">{opp.status}</Badge>}
                            </div>
                            {opp.lg_sector && <p className="text-xs text-muted-foreground mt-1">Sector: {opp.lg_sector}</p>}
                            {opp.investment_professional_point_person_1 && <p className="text-xs text-muted-foreground">Point Person: {opp.investment_professional_point_person_1}</p>}
                          </div>
                          {opp.url && (
                            <Button variant="ghost" size="sm" onClick={() => window.open(opp.url, '_blank')}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No associated opportunities</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* FILES TAB */}
            <TabsContent value="files" className="space-y-6">
              <AttachmentsSection contactId={contactData.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Contact not found</p>
          </div>
        )}

        <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} onConfirm={handleDeleteContact} title="Delete Contact" description={`Are you sure you want to delete ${contact.full_name || 'this contact'}? This action cannot be undone.`} confirmText="Delete" cancelText="Cancel" variant="destructive" />
        <FullHistoryDialog 
          open={historyDialogOpen} 
          onOpenChange={setHistoryDialogOpen} 
          title={`Contact History: ${contact.full_name || 'Unknown'}`}
          description="View all notes and next steps history for this contact"
          timeline={[...timeline, ...nextStepsTimeline]} 
          fieldLabels={{ notes: "Notes", next_steps: "Next Steps" }} 
        />
      </SheetContent>
    </Sheet>
  );
}

function AttachmentsSection({ contactId }: { contactId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { attachments, isLoading, uploadFile, isUploading, deleteFile, isDeleting, downloadFile, getFileUrl } = useEntityAttachments('contact', contactId);

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Attachments</h3>
            {attachments.length > 0 && <Badge variant="secondary">{attachments.length}</Badge>}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-4 pt-4">
          <AttachmentUpload onUpload={(file, description) => uploadFile({ file, description })} isUploading={isUploading} />
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <AttachmentList attachments={attachments} onDownload={downloadFile} onDelete={deleteFile} onGetFileUrl={getFileUrl} isDeleting={isDeleting} />
          )}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
