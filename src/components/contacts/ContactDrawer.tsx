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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, User, Mail, Building, Target, Calendar, Loader2, Clock, ExternalLink } from "lucide-react";

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
  const { toast } = useToast();

  // Load full contact data from contacts_raw when contact changes
  useEffect(() => {
    if (contact?.id && open) {
      loadContactData(contact.id);
    }
  }, [contact?.id, open]);

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

  if (!contact) return null;

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
                  <Input
                    id="lg_sector"
                    value={contactData.lg_sector || ""}
                    onChange={(e) => updateField("lg_sector", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="url_to_online_bio">Online Bio URL</Label>
                  <Input
                    id="url_to_online_bio"
                    value={contactData.url_to_online_bio || ""}
                    onChange={(e) => updateField("url_to_online_bio", e.target.value)}
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
                <Label htmlFor="lg_focus_areas_comprehensive_list">LG Focus Areas (Comprehensive List)</Label>
                <Textarea
                  id="lg_focus_areas_comprehensive_list"
                  value={contactData.lg_focus_areas_comprehensive_list || ""}
                  onChange={(e) => updateField("lg_focus_areas_comprehensive_list", e.target.value)}
                  rows={3}
                />
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

            {/* Delta Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delta Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delta_type">Delta Type</Label>
                  <Input
                    id="delta_type"
                    value={contactData.delta_type || ""}
                    onChange={(e) => updateField("delta_type", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="delta">Delta</Label>
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

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notes</h3>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={contactData.notes || ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={4}
                  placeholder="Add notes about this contact..."
                />
              </div>
            </div>

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