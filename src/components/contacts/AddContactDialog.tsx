import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, User } from "lucide-react";

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onContactAdded: () => void;
}

export function AddContactDialog({ open, onClose, onContactAdded }: AddContactDialogProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    organization: "",
    title: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast({
        title: "Error",
        description: "Full name and email are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Insert into contacts_raw table
      const { error } = await supabase
        .from("contacts_raw")
        .insert({
          full_name: formData.full_name.trim(),
          email_address: formData.email.trim(),
          organization: formData.organization.trim() || null,
          title: formData.title.trim() || null,
          notes: formData.notes.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact added successfully",
      });

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        organization: "",
        title: "",
        notes: "",
      });

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
      email: "",
      organization: "",
      title: "",
      notes: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) => handleInputChange("organization", e.target.value)}
              placeholder="Enter organization"
            />
          </div>

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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Add any notes about this contact..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}