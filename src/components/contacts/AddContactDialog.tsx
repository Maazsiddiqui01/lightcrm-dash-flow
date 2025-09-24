import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { useSectors, useFocusAreasBySector } from "@/hooks/useLookups";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, User, Users, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onContactAdded: () => void;
}

interface IndividualContactForm {
  full_name: string;
  email_address: string;
  organization: string;
  title: string;
  areas_of_specialization: string;
  notes: string;
  delta_type: string;
  delta: string;
  lg_sector: string;
  category: string;
  phone: string;
  url_to_online_bio: string;
  lg_lead: string;
  lg_assistant: string;
  lg_focus_areas: string[];
}

const emptyContactForm: IndividualContactForm = {
  full_name: "",
  email_address: "",
  organization: "",
  title: "",
  areas_of_specialization: "",
  notes: "",
  delta_type: "",
  delta: "",
  lg_sector: "",
  category: "",
  phone: "",
  url_to_online_bio: "",
  lg_lead: "",
  lg_assistant: "",
  lg_focus_areas: [],
};

export function AddContactDialog({ open, onClose, onContactAdded }: AddContactDialogProps) {
  const [contactType, setContactType] = useState<"individual" | "group">("individual");
  const [groupName, setGroupName] = useState("");
  const [contacts, setContacts] = useState<IndividualContactForm[]>([emptyContactForm]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Fetch focus area and sector options
  const sectorsQuery = useSectors();
  const focusAreasQuery = useFocusAreasBySector(undefined);

  const addContact = () => {
    setContacts([...contacts, { ...emptyContactForm }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const updateContact = (index: number, field: string, value: string | string[]) => {
    const updatedContacts = [...contacts];
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    };
    setContacts(updatedContacts);
  };

  const handleFocusAreaChange = (index: number, newFocusAreas: string[]) => {
    updateContact(index, 'lg_focus_areas', newFocusAreas);
    
    // Auto-fill sector if first focus area is selected and sector is currently blank
    if (newFocusAreas.length === 1 && !contacts[index].lg_sector) {
      const selectedOption = focusAreasQuery.data?.find(opt => opt.value === newFocusAreas[0]);
      if (selectedOption?.meta?.sector_id) {
        const sector = sectorsQuery.data?.find(s => s.meta?.id === selectedOption.meta?.sector_id);
        if (sector) {
          updateContact(index, 'lg_sector', sector.value);
        }
      }
    }
  };

  const validateContact = (contact: IndividualContactForm) => {
    if (!contact.full_name.trim() || !contact.email_address.trim() || !contact.organization.trim() || contact.lg_focus_areas.length === 0) {
      return "Full name, email, organization, and at least one focus area are required";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email_address.trim())) {
      return "Please enter a valid email address";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate contacts
    for (let i = 0; i < contacts.length; i++) {
      const validationError = validateContact(contacts[i]);
      if (validationError) {
        toast({
          title: "Error",
          description: `Contact ${i + 1}: ${validationError}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate group name if group type
    if (contactType === "group" && !groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required for group contacts",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const contactsToInsert = contacts.map(contact => {
        // Helper functions
        const opt = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);
        const numOrNull = (v?: string | number) =>
          v === undefined || v === null || String(v).trim() === "" ? null : Number(v);

        // Create consolidated focus areas list and individual slots
        const consolidatedList = contact.lg_focus_areas.join(', ');
        const focusAreaSlots: any = {};
        for (let i = 1; i <= 8; i++) {
          focusAreaSlots[`lg_focus_area_${i}`] = contact.lg_focus_areas[i - 1] || null;
        }

        return {
          full_name: contact.full_name.trim(),
          organization: contact.organization.trim(),
          email_address: contact.email_address.trim().toLowerCase(),
          lg_focus_areas_comprehensive_list: consolidatedList,
          ...focusAreaSlots,
          title: opt(contact.title),
          areas_of_specialization: opt(contact.areas_of_specialization),
          notes: opt(contact.notes),
          delta_type: opt(contact.delta_type),
          delta: numOrNull(contact.delta),
          lg_sector: opt(contact.lg_sector),
          category: opt(contact.category),
          phone: opt(contact.phone),
          url_to_online_bio: opt(contact.url_to_online_bio),
          lg_lead: opt(contact.lg_lead),
          lg_assistant: opt(contact.lg_assistant),
          group_contact: contactType === "group" ? groupName.trim() : null,
        };
      });

      // Insert all contacts into contacts_raw table
      const { data, error } = await supabase
        .from('contacts_raw')
        .insert(contactsToInsert)
        .select();

      if (error) throw error;

      const successMessage = contactType === "group" 
        ? `${contacts.length} contacts added to group "${groupName}"`
        : "Contact added successfully";

      toast({
        title: "Success",
        description: successMessage,
      });

      // Reset form
      setContactType("individual");
      setGroupName("");
      setContacts([emptyContactForm]);

      onContactAdded();
    } catch (error: any) {
      console.error("Error adding contact(s):", error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate key value violates unique constraint') 
          ? "A contact with one of these emails already exists"
          : "Failed to add contact(s)",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setContactType("individual");
    setGroupName("");
    setContacts([emptyContactForm]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span>Add New Contact</span>
          </DialogTitle>
          <DialogDescription>
            Add individual contacts or create a group of contacts. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Contact Type Selection */}
            <div className="space-y-3">
              <Label>Contact Type</Label>
              <RadioGroup 
                value={contactType} 
                onValueChange={(value: "individual" | "group") => setContactType(value)}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="flex items-center cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Individual Contact
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="group" />
                  <Label htmlFor="group" className="flex items-center cursor-pointer">
                    <Users className="h-4 w-4 mr-2" />
                    Group Contact
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Group Name - Only show if group type */}
            {contactType === "group" && (
              <div className="space-y-2">
                <Label htmlFor="group_name">Group Name *</Label>
                <Input
                  id="group_name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>
            )}

            {/* Contacts */}
            <div className="space-y-4">
              {contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      {contactType === "group" ? `Contact ${index + 1}` : "Contact Information"}
                    </Label>
                    {contactType === "group" && contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Required Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`full_name_${index}`}>Full Name *</Label>
                      <Input
                        id={`full_name_${index}`}
                        value={contact.full_name}
                        onChange={(e) => updateContact(index, "full_name", e.target.value)}
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`email_address_${index}`}>Email *</Label>
                      <Input
                        id={`email_address_${index}`}
                        type="email"
                        value={contact.email_address}
                        onChange={(e) => updateContact(index, "email_address", e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`organization_${index}`}>Organization *</Label>
                      <Input
                        id={`organization_${index}`}
                        value={contact.organization}
                        onChange={(e) => updateContact(index, "organization", e.target.value)}
                        placeholder="Enter organization"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`title_${index}`}>Title</Label>
                      <Input
                        id={`title_${index}`}
                        value={contact.title}
                        onChange={(e) => updateContact(index, "title", e.target.value)}
                        placeholder="Enter job title"
                      />
                    </div>
                  </div>

                  {/* Focus Areas */}
                  <FocusAreaSelect
                    value={contact.lg_focus_areas}
                    onChange={(newFocusAreas) => handleFocusAreaChange(index, newFocusAreas)}
                    disabled={focusAreasQuery.isLoading}
                    label="LG Focus Areas *"
                    sectorId={contact.lg_sector ? sectorsQuery.data?.find(s => s.label === contact.lg_sector)?.meta?.id : undefined}
                  />

                  {/* Optional Fields - Collapsible */}
                  <details className="space-y-4">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                      Additional Information (Optional)
                    </summary>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor={`lg_sector_${index}`}>LG Sector</Label>
                        <Select
                          value={contact.lg_sector}
                          onValueChange={(value) => updateContact(index, "lg_sector", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                          <SelectContent>
                            {sectorsQuery.isLoading ? (
                              <SelectItem value="" disabled>Loading...</SelectItem>
                            ) : (
                              (sectorsQuery.data || []).map((sector) => (
                                <SelectItem key={sector.value} value={sector.value}>
                                  {sector.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`phone_${index}`}>Phone</Label>
                        <Input
                          id={`phone_${index}`}
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => updateContact(index, "phone", e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`lg_lead_${index}`}>LG Lead</Label>
                        <Input
                          id={`lg_lead_${index}`}
                          value={contact.lg_lead}
                          onChange={(e) => updateContact(index, "lg_lead", e.target.value)}
                          placeholder="Enter LG Lead"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`lg_assistant_${index}`}>LG Assistant</Label>
                        <Input
                          id={`lg_assistant_${index}`}
                          value={contact.lg_assistant}
                          onChange={(e) => updateContact(index, "lg_assistant", e.target.value)}
                          placeholder="Enter LG Assistant"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`areas_of_specialization_${index}`}>Areas of Specialization</Label>
                      <Input
                        id={`areas_of_specialization_${index}`}
                        value={contact.areas_of_specialization}
                        onChange={(e) => updateContact(index, "areas_of_specialization", e.target.value)}
                        placeholder="Enter specializations (comma-separated)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`notes_${index}`}>Notes</Label>
                      <Textarea
                        id={`notes_${index}`}
                        value={contact.notes}
                        onChange={(e) => updateContact(index, "notes", e.target.value)}
                        placeholder="Add any notes about this contact..."
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  </details>
                </div>
              ))}

              {/* Add Another Contact Button - Only show for group type */}
              {contactType === "group" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addContact}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Contact
                </Button>
              )}
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Adding..." : `Add ${contactType === "group" ? "Group" : "Contact"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}