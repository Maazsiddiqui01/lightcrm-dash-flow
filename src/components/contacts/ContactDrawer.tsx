import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useContactNotes } from "@/hooks/useContactNotes";
import { ContactNotesSection } from "./ContactNotesSection";
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
import { Save, X, User, Mail, Building, Target, Calendar, Loader2, Clock, ExternalLink, Briefcase } from "lucide-react";
import { useContactOpps } from "@/hooks/useContactOpps";
import { Skeleton } from "@/components/ui/skeleton";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { useSectors, useFocusAreasBySector, findMatchingOption } from "@/hooks/useLookups";

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
  linkedin_url: string | null; // Added LinkedIn URL field
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
  const { toast } = useToast();
  
  // Contact notes hook
  const {
    currentNotes,
    timeline,
    isLoadingCurrent,
    isLoadingTimeline,
    saveNotes,
    isSavingNotes,
  } = useContactNotes(contact?.id);

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

  const updateField = (field: keyof ContactRaw, value: string | null) => {
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
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
                  <Label htmlFor="delta">Outreach Cadence (Days)</Label>
                  <Input
                    id="delta"
                    type="number"
                    value={contactData.delta || ""}
                    onChange={(e) => updateField("delta", e.target.value)}
                  />
                </div>
              </div>
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
            <div className="flex space-x-2 pt-4">
              <Button onClick={handleSave} disabled={saving || loading} className="flex-1">
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
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
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