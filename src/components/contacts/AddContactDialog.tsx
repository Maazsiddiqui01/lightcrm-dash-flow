import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { useQuery } from "@tanstack/react-query";
import { fetchFocusAreaOptions, fetchSectorOptions } from "@/lib/options";
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
import { Plus, User } from "lucide-react";

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onContactAdded: () => void;
}

export function AddContactDialog({ open, onClose, onContactAdded }: AddContactDialogProps) {
  const [formData, setFormData] = useState({
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
  });
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Fetch focus area and sector options
  const { data: focusAreaOptions = [], isLoading: isLoadingFocusAreas } = useQuery({
    queryKey: ['focus-area-options'],
    queryFn: fetchFocusAreaOptions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sectorOptions = [], isLoading: isLoadingSectors } = useQuery({
    queryKey: ['sector-options'], 
    queryFn: fetchSectorOptions,
    staleTime: 10 * 60 * 1000,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFocusAreaChange = (newFocusAreas: string[]) => {
    setSelectedFocusAreas(newFocusAreas);
    
    // Auto-fill sector if first focus area is selected and sector is currently blank
    if (newFocusAreas.length === 1 && !formData.lg_sector) {
      const selectedOption = focusAreaOptions.find(opt => opt.focus_area === newFocusAreas[0]);
      if (selectedOption?.sector) {
        handleInputChange("lg_sector", selectedOption.sector);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim() || !formData.email_address.trim() || !formData.organization.trim() || selectedFocusAreas.length === 0) {
      toast({
        title: "Error",
        description: "Full name, email, organization, and at least one focus area are required",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_address.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Helper functions
      const opt = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);
      const numOrNull = (v?: string | number) =>
        v === undefined || v === null || String(v).trim() === "" ? null : Number(v);

      // Create consolidated focus areas list and individual slots
      const consolidatedList = selectedFocusAreas.join(', ');
      const focusAreaSlots: any = {};
      for (let i = 1; i <= 8; i++) {
        focusAreaSlots[`lg_focus_area_${i}`] = selectedFocusAreas[i - 1] || null;
      }

      const payload = {
        full_name: formData.full_name.trim(),
        organization: formData.organization.trim(),
        email_address: formData.email_address.trim().toLowerCase(),
        lg_focus_areas_comprehensive_list: consolidatedList,
        ...focusAreaSlots,
        title: opt(formData.title),
        areas_of_specialization: opt(formData.areas_of_specialization),
        notes: opt(formData.notes),
        delta_type: opt(formData.delta_type),
        delta: numOrNull(formData.delta),
        lg_sector: opt(formData.lg_sector),
        category: opt(formData.category),
        phone: opt(formData.phone),
        url_to_online_bio: opt(formData.url_to_online_bio),
      };

      // Insert into contacts_raw table
      const { data, error } = await supabase
        .from('contacts_raw')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact added successfully",
      });

      // Reset form
      setFormData({
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
      });
      setSelectedFocusAreas([]);

      onContactAdded();
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast({
        title: "Error",
        description: error.message === 'duplicate key value violates unique constraint "contacts_raw_email_address_key"' 
          ? "A contact with this email already exists"
          : "Failed to add contact",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
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
    });
    setSelectedFocusAreas([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span>Add New Contact</span>
          </DialogTitle>
          <DialogDescription>
            Add a new contact to your CRM. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Required Fields */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

          <div className="space-y-2">
            <Label htmlFor="email_address">Email *</Label>
            <Input
              id="email_address"
              type="email"
              value={formData.email_address}
              onChange={(e) => handleInputChange("email_address", e.target.value)}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization *</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) => handleInputChange("organization", e.target.value)}
              placeholder="Enter organization"
              required
            />
          </div>

          {/* Focus Areas - Multi-select */}
          <FocusAreaSelect
            value={selectedFocusAreas}
            onChange={handleFocusAreaChange}
            disabled={isLoadingFocusAreas}
            label="LG Focus Areas"
          />
          {selectedFocusAreas.length > 0 && !formData.lg_sector && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                💡 <button 
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    const firstOption = focusAreaOptions.find(opt => opt.focus_area === selectedFocusAreas[0]);
                    if (firstOption?.sector) {
                      handleInputChange("lg_sector", firstOption.sector);
                    }
                  }}
                >
                  Auto-fill sector with "{focusAreaOptions.find(opt => opt.focus_area === selectedFocusAreas[0])?.sector}"
                </button>
              </p>
            </div>
          )}

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter job title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lg_sector">LG Sector</Label>
              <Select
                value={formData.lg_sector}
                onValueChange={(value) => handleInputChange("lg_sector", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSectors ? (
                    <SelectItem value="" disabled>Loading...</SelectItem>
                  ) : (
                    sectorOptions?.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                placeholder="Enter category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delta_type">Outreach Cadence</Label>
              <Select
                value={formData.delta_type}
                onValueChange={(value) => handleInputChange("delta_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outreach type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delta">Outreach Cadence (Days)</Label>
              <Input
                id="delta"
                type="number"
                value={formData.delta}
                onChange={(e) => handleInputChange("delta", e.target.value)}
                placeholder="Enter number of days"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_to_online_bio">Online Bio URL</Label>
            <Input
              id="url_to_online_bio"
              type="url"
              value={formData.url_to_online_bio}
              onChange={(e) => handleInputChange("url_to_online_bio", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areas_of_specialization">Areas of Specialization</Label>
            <Input
              id="areas_of_specialization"
              value={formData.areas_of_specialization}
              onChange={(e) => handleInputChange("areas_of_specialization", e.target.value)}
              placeholder="Enter specializations (comma-separated)"
            />
          </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Add any notes about this contact..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Adding..." : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}