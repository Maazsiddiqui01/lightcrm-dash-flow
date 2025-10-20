import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useContactNotes } from "@/hooks/useContactNotes";
import { useGroupNotes } from "@/hooks/useGroupNotes";
import { useContactGroups } from "@/hooks/useContactGroups";
import { useRemoveContactFromGroup } from "@/hooks/useRemoveContactFromGroup";
import { ContactNotesSection } from "./ContactNotesSection";
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
import { Save, X, User, Mail, Building, Target, Calendar, Loader2, Clock, ExternalLink, Briefcase, UserX, Trash2, Users } from "lucide-react";
import { useContactOpps } from "@/hooks/useContactOpps";
import { Skeleton } from "@/components/ui/skeleton";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { useSectors, useFocusAreasBySector, findMatchingOption } from "@/hooks/useLookups";
import { DuplicateWarningBanner } from "./DuplicateWarningBanner";
import { ContactLockBanner } from "./ContactLockBanner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useDeleteContact } from "@/hooks/useDeleteContact";

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

interface Interaction {
  id: string;
  occurred_at: string;
  subject: string;
  source: string;
  from_email: string;
  to_emails: string;
  cc_emails: string;
}

interface ContactDrawerProps {
  contact: ContactApp | null;
  open: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
}

export function ContactDrawer({ contact, open, onClose, onContactUpdated }: ContactDrawerProps) {
  const [contactData, setContactData] = useState<ContactRaw | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
  } = useContactNotes(contact?.id);

  // Group notes hook (only if contact is part of a group)
  const {
    currentNotes: groupCurrentNotes,
    timeline: groupTimeline,
    isLoadingCurrent: isLoadingGroupCurrent,
    isLoadingTimeline: isLoadingGroupTimeline,
    saveNotes: saveGroupNotes,
    isSavingNotes: isSavingGroupNotes,
  } = useGroupNotes(contactData?.group_contact || undefined);

  // Fetch all groups this contact belongs to (new many-to-many schema)
  const { data: contactGroupMemberships = [], isLoading: isLoadingGroups } = useContactGroups(contact?.id || null);
  const removeFromGroupMutation = useRemoveContactFromGroup();

  // Use canonical lookup options
  const sectorsQuery = useSectors();
  const focusAreasQuery = useFocusAreasBySector(contactData?.lg_sector || undefined);

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

  // Load interactions when contact email changes
  useEffect(() => {
    if (contactData?.email_address && open) {
      loadInteractions(contactData.email_address);
    }
  }, [contactData?.email_address, open]);

  const loadContactData = async (contactId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts_raw")
        .select("*")
        .eq("id", contactId)
        .single();

      if (error) {
        console.error({ where: 'ContactDrawer', contactId, error });
        if (error.code === 'PGRST116') {
          toast({
            title: "Contact not found",
            description: "This contact record could not be found.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
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

  const loadInteractions = async (email: string) => {
    try {
      setLoadingInteractions(true);
      const { data, error } = await supabase
        .from('interactions_app')
        .select('id, occurred_at, subject, source, from_email, to_emails, cc_emails')
        .or(`from_email.eq.${email.toLowerCase()},to_emails.ilike.%${email.toLowerCase()}%,cc_emails.ilike.%${email.toLowerCase()}%`)
        .order('occurred_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error({ where: 'ContactDrawer', email, error });
      toast({
        title: "Error",
        description: "Failed to load interaction history",
        variant: "destructive",
      });
    } finally {
      setLoadingInteractions(false);
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

      onContactUpdated();
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
    
    // Auto-fill sector if first focus area is selected and sector is currently blank
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
    
    // Handle delta field specifically since it's a number field
    if (field === "delta") {
      const numValue = value === null || value === "" ? null : Number(value);
      setContactData({ ...contactData, [field]: numValue });
    } else {
      setContactData({ ...contactData, [field]: value });
    }
  };

  if (!contact) {
    return null;
  }

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
              <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Edit Contact</SheetTitle>
                <SheetDescription>{contact.full_name || "Unknown Contact"}</SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

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
          <div className="mt-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
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

                <div>
                  <Label htmlFor="email_address">Email Address</Label>
                  <Input
                    id="email_address"
                    type="email"
                    value={contactData.email_address || ""}
                    onChange={(e) => updateField("email_address", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={contactData.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
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

                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={contactData.organization || ""}
                    onChange={(e) => updateField("organization", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={contactData.category || ""}
                    onChange={(e) => updateField("category", e.target.value)}
                  />
                </div>

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
                  <Label htmlFor="url_to_online_bio">Online Bio URL</Label>
                  <Input
                    id="url_to_online_bio"
                    value={contactData.url_to_online_bio || ""}
                    onChange={(e) => updateField("url_to_online_bio", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                  <Input
                    id="linkedin_url"
                    value={contactData.linkedin_url || ""}
                    onChange={(e) => updateField("linkedin_url", e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div>
                  <Label htmlFor="x_twitter_url">X / Twitter</Label>
                  <Input
                    id="x_twitter_url"
                    value={contactData.x_twitter_url || ""}
                    onChange={(e) => updateField("x_twitter_url", e.target.value)}
                    placeholder="https://x.com/username"
                  />
                </div>

                <div>
                  <Label htmlFor="lg_lead">LG Lead</Label>
                  <Input
                    id="lg_lead"
                    value={contactData.lg_lead || ""}
                    onChange={(e) => updateField("lg_lead", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="lg_assistant">LG Assistant</Label>
                  <Input
                    id="lg_assistant"
                    value={contactData.lg_assistant || ""}
                    onChange={(e) => updateField("lg_assistant", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="group_contact">Group Contact</Label>
                  <Input
                    id="group_contact"
                    value={contactData.group_contact || ""}
                    onChange={(e) => updateField("group_contact", e.target.value)}
                    placeholder="Enter group name (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="group_email_role">Group Email Role</Label>
                  <Select 
                    value={contactData.group_email_role || undefined} 
                    onValueChange={(value) => updateField("group_email_role", value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None - Select role if in a group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to">To (Primary Recipient)</SelectItem>
                      <SelectItem value="cc">CC (Carbon Copy)</SelectItem>
                      <SelectItem value="bcc">BCC (Blind Carbon Copy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              
              <div>
                <Label htmlFor="areas_of_specialization">Areas of Specialization</Label>
                <Textarea
                  id="areas_of_specialization"
                  value={contactData.areas_of_specialization || ""}
                  onChange={(e) => updateField("areas_of_specialization", e.target.value)}
                  rows={3}
                />
              </div>

                <div>
                  <FocusAreaSelect
                    value={selectedFocusAreas}
                    onChange={handleFocusAreaChange}
                    disabled={focusAreasQuery.isLoading}
                    label="LG Focus Areas (Comprehensive List)"
                    sectorId={contactData?.lg_sector ? sectorsQuery.data?.find(s => s.label === contactData.lg_sector)?.meta?.id : undefined}
                  />
                  {selectedFocusAreas.length > 0 && !contactData?.lg_sector && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        💡 <button 
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => {
                            const firstOption = focusAreasQuery.data?.find(opt => opt.value === selectedFocusAreas[0]);
                            if (firstOption?.meta?.sector_id) {
                              const sector = sectorsQuery.data?.find(s => s.meta?.id === firstOption.meta?.sector_id);
                              if (sector) {
                                updateField("lg_sector", sector.value);
                              }
                            }
                          }}
                        >
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
            </div>

            <Separator />

            {/* LG Focus Areas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">LG Focus Areas (Individual)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <div key={num}>
                    <Label htmlFor={`lg_focus_area_${num}`}>LG Focus Area {num}</Label>
                    <Input
                      id={`lg_focus_area_${num}`}
                      value={contactData[`lg_focus_area_${num}` as keyof ContactRaw] as string || ""}
                      onChange={(e) => updateField(`lg_focus_area_${num}` as keyof ContactRaw, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Contact Statistics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Statistics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Most Recent Contact</Label>
                  <p className="text-sm font-medium mt-1">
                    {contactData.most_recent_contact 
                      ? format(parseFlexibleDate(contactData.most_recent_contact) || new Date(), 'MMM dd, yyyy')
                      : '—'
                    }
                  </p>
                </div>

                {contactData.group_contact && (
                  <div>
                    <Label className="text-muted-foreground">Most Recent Group Contact</Label>
                    <p className="text-sm font-medium mt-1">
                      {contactData.most_recent_group_contact 
                        ? format(parseFlexibleDate(contactData.most_recent_group_contact) || new Date(), 'MMM dd, yyyy')
                        : '—'
                      }
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground"># of Emails</Label>
                  <p className="text-sm font-medium mt-1">{contactData.of_emails || 0}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground"># of Meetings</Label>
                  <p className="text-sm font-medium mt-1">{contactData.of_meetings || 0}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Opportunities Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Opportunities (as Deal Source)</h3>
              
              {isLoadingOpps ? (
                <Skeleton className="h-6 w-full" />
              ) : oppsError ? (
                <p className="text-sm text-destructive">Failed to load opportunities</p>
              ) : contactOpps.length > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      {contactOpps.map((opp, index) => (
                        <span key={opp.name}>
                          {opp.name}
                          {opp.ownershipType && (
                            <span className="text-muted-foreground"> ({opp.ownershipType})</span>
                          )}
                          {index < contactOpps.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-3 text-xs">
                    {contactOpps.length}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>

            <Separator />

            {/* Outreach Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Outreach Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delta_type">Outreach Cadence</Label>
                  <Input
                    id="delta_type"
                    value={contactData.delta_type || ""}
                    onChange={(e) => updateField("delta_type", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="delta">Individual Max Lag (Days)</Label>
                  <Input
                    id="delta"
                    type="number"
                    value={contactData.delta || ""}
                    onChange={(e) => updateField("delta", e.target.value)}
                  />
                </div>

                {contactData.group_contact && (
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="group_delta">Group Max Lag (Days)</Label>
                    <Input
                      id="group_delta"
                      type="number"
                      value={contactData.group_delta || ""}
                      disabled
                      className="bg-muted cursor-not-allowed"
                      title="Group Max Lag is inherited from the group and can only be edited in Group Contacts view"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Inherited from group (edit in Group Contacts view)
                    </p>
                  </div>
                )}

                {/* Display all group memberships for this contact */}
                {contactGroupMemberships.length > 0 && (
                  <div className="col-span-2 space-y-3 border-t pt-4 mt-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Group Memberships ({contactGroupMemberships.length})
                    </Label>
                    <div className="space-y-2">
                      {contactGroupMemberships.map((membership: any) => (
                        <div key={membership.group_id} className="border rounded-lg p-3 bg-card space-y-1">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{membership.group_name}</p>
                              {membership.focus_area && (
                                <p className="text-xs text-muted-foreground">
                                  Focus: {membership.focus_area}
                                </p>
                              )}
                              {membership.sector && (
                                <p className="text-xs text-muted-foreground">
                                  Sector: {membership.sector}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {membership.email_role?.toUpperCase() || 'TO'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Max Lag: {membership.max_lag_days || '—'} days
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This contact's group_delta is inherited from the first group listed above. 
                      To change it, edit the group in the Group Contacts view.
                    </p>
                  </div>
                )}

                {/* If contact has group_delta but no memberships, show warning */}
                {contactData.group_delta && contactGroupMemberships.length === 0 && (
                  <div className="col-span-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ This contact has a group_delta value but is not assigned to any groups in the new system. 
                      Legacy data detected.
                    </p>
                  </div>
                )}
                
                {contactData.group_contact && (
                  <div className="col-span-2 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium mb-2">Effective Values (Using Group)</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Effective Most Recent:</span>
                        <p className="font-medium">
                          {contactData.most_recent_group_contact 
                            ? format(parseFlexibleDate(contactData.most_recent_group_contact) || new Date(), 'MMM dd, yyyy')
                            : '—'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Effective Max Lag:</span>
                        <p className="font-medium">{contactData.group_delta || '—'} days</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="intentional_no_outreach">Intentional No Outreach</Label>
                  <Select
                    value={contactData.intentional_no_outreach ? "true" : "false"}
                    onValueChange={(value) => updateField("intentional_no_outreach", value === "true")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Intentional No Outreach Status */}
              {contactData.intentional_no_outreach && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <UserX className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-amber-800 dark:text-amber-200">Intentional No Outreach</span>
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                          {contactData.intentional_no_outreach_date 
                            ? new Date(contactData.intentional_no_outreach_date).toLocaleDateString()
                            : 'Date unknown'
                          }
                        </Badge>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        This contact has been marked to skip outreach and will not count as overdue.
                      </p>
                      {contactData.intentional_no_outreach_note && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          <strong>Reason:</strong> {contactData.intentional_no_outreach_note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Notes Section - Using new ContactNotesSection */}
            <ContactNotesSection
              title="Notes"
              field="notes"
              currentValue={currentNotes?.notes || null}
              timeline={timeline}
              onSave={saveNotes}
              isLoadingCurrent={isLoadingCurrent}
              isLoadingTimeline={isLoadingTimeline}
              isSaving={isSavingNotes}
            />

            {/* Group Notes Section - Only show if contact is part of a group */}
            {contactData.group_contact && (
              <>
                <Separator />
                <GroupNotesSection
                  title="Group Notes (Legacy)"
                  field="group_notes"
                  currentValue={groupCurrentNotes?.notes || null}
                  timeline={groupTimeline}
                  onSave={saveGroupNotes}
                  isLoadingCurrent={isLoadingGroupCurrent}
                  isLoadingTimeline={isLoadingGroupTimeline}
                  isSaving={isSavingGroupNotes}
                  showSharedIndicator={true}
                />
              </>
            )}

            {/* New Many-to-Many Groups Section */}
            {contactGroupMemberships.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Group Memberships</h3>
                  </div>
                  <div className="space-y-2">
                    {contactGroupMemberships.map((membership) => (
                      <div key={membership.group_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{membership.group_name}</span>
                            {membership.email_role && (
                              <Badge variant="outline" className="text-xs">
                                {membership.email_role.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          {(membership.max_lag_days || membership.focus_area || membership.sector) && (
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {membership.max_lag_days && (
                                <span>Max Lag: {membership.max_lag_days}d</span>
                              )}
                              {membership.focus_area && (
                                <span>• {membership.focus_area}</span>
                              )}
                              {membership.sector && (
                                <span>• {membership.sector}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (contact?.id && membership.group_id) {
                              removeFromGroupMutation.mutate({
                                contactId: contact.id,
                                groupId: membership.group_id,
                              });
                            }
                          }}
                          disabled={removeFromGroupMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Interaction Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Interactions</h3>
                {loadingInteractions && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
              
              {interactions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="p-3 border rounded-lg bg-muted/5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={interaction.source.includes('email') ? 'default' : 'secondary'} className="text-xs">
                            {interaction.source}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(interaction.occurred_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="font-medium text-sm mb-1">{interaction.subject}</p>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>From: {interaction.from_email}</div>
                        {interaction.to_emails && (
                          <div>To: {interaction.to_emails}</div>
                        )}
                        {interaction.cc_emails && (
                          <div>CC: {interaction.cc_emails}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No recent interactions found</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="destructive" 
                onClick={() => setDeleteConfirmOpen(true)} 
                disabled={saving || loading || isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={saving || loading || isDeleting}>
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
                <Button variant="ghost" onClick={onClose} disabled={saving || isDeleting}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

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
          </div>
        ) : !loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Contact not found</p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}