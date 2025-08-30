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
import { Save, X, User, Mail, Building, Target, Calendar, Loader2 } from "lucide-react";

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
  total_of_contacts: number | null;
  most_recent_contact: string | null;
}

interface ContactDrawerProps {
  contact: ContactApp | null;
  open: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
}

export function ContactDrawer({ contact, open, onClose, onContactUpdated }: ContactDrawerProps) {
  const [contactData, setContactData] = useState<ContactRaw | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load full contact data from contacts_raw when contact changes
  useEffect(() => {
    if (contact?.id && open) {
      loadContactData(contact.id);
    }
  }, [contact?.id, open]);

  const loadContactData = async (contactId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts_raw")
        .select("*")
        .eq("id", contactId)
        .single();

      if (error) throw error;
      setContactData(data);
    } catch (error) {
      console.error("Error loading contact:", error);
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
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("contacts_raw")
        .update(updateData)
        .eq("id", contactData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });

      onContactUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating contact:", error);
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
      <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
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
            <Button onClick={handleSave} disabled={saving || loading}>
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
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Contact not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}