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
import { Plus, Target } from "lucide-react";

interface AddOpportunityDialogProps {
  open: boolean;
  onClose: () => void;
  onOpportunityAdded: () => void;
}

export function AddOpportunityDialog({ open, onClose, onOpportunityAdded }: AddOpportunityDialogProps) {
  const [formData, setFormData] = useState({
    deal_name: "",
    status: "",
    tier: "",
    sector: "",
    lg_focus_area: "",
    platform_add_on: "",
    date_of_origination: "",
    deal_source_company: "",
    deal_source_individual_1: "",
    deal_source_individual_2: "",
    ownership: "",
    ownership_type: "",
    summary_of_opportunity: "",
    ebitda: "",
    ebitda_notes: "",
    investment_professional_point_person_1: "",
    investment_professional_point_person_2: "",
    most_recent_notes: "",
    url: "",
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
    
    if (!formData.deal_name.trim()) {
      toast({
        title: "Error",
        description: "Deal name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Insert into opportunities_raw table
      const { error } = await supabase
        .from("opportunities_raw")
        .insert({
          deal_name: formData.deal_name.trim(),
          status: formData.status.trim() || null,
          tier: formData.tier.trim() || null,
          sector: formData.sector.trim() || null,
          lg_focus_area: formData.lg_focus_area.trim() || null,
          platform_add_on: formData.platform_add_on.trim() || null,
          date_of_origination: formData.date_of_origination.trim() || null,
          deal_source_company: formData.deal_source_company.trim() || null,
          deal_source_individual_1: formData.deal_source_individual_1.trim() || null,
          deal_source_individual_2: formData.deal_source_individual_2.trim() || null,
          ownership: formData.ownership.trim() || null,
          ownership_type: formData.ownership_type.trim() || null,
          summary_of_opportunity: formData.summary_of_opportunity.trim() || null,
          ebitda: formData.ebitda.trim() || null,
          ebitda_notes: formData.ebitda_notes.trim() || null,
          investment_professional_point_person_1: formData.investment_professional_point_person_1.trim() || null,
          investment_professional_point_person_2: formData.investment_professional_point_person_2.trim() || null,
          most_recent_notes: formData.most_recent_notes.trim() || null,
          url: formData.url.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          dealcloud: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity added successfully",
      });

      // Reset form
      setFormData({
        deal_name: "",
        status: "",
        tier: "",
        sector: "",
        lg_focus_area: "",
        platform_add_on: "",
        date_of_origination: "",
        deal_source_company: "",
        deal_source_individual_1: "",
        deal_source_individual_2: "",
        ownership: "",
        ownership_type: "",
        summary_of_opportunity: "",
        ebitda: "",
        ebitda_notes: "",
        investment_professional_point_person_1: "",
        investment_professional_point_person_2: "",
        most_recent_notes: "",
        url: "",
      });

      onOpportunityAdded();
    } catch (error: any) {
      console.error("Error adding opportunity:", error);
      toast({
        title: "Error",
        description: "Failed to add opportunity",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      deal_name: "",
      status: "",
      tier: "",
      sector: "",
      lg_focus_area: "",
      platform_add_on: "",
      date_of_origination: "",
      deal_source_company: "",
      deal_source_individual_1: "",
      deal_source_individual_2: "",
      ownership: "",
      ownership_type: "",
      summary_of_opportunity: "",
      ebitda: "",
      ebitda_notes: "",
      investment_professional_point_person_1: "",
      investment_professional_point_person_2: "",
      most_recent_notes: "",
      url: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span>Add New Opportunity</span>
          </DialogTitle>
          <DialogDescription>
            Add a new opportunity to your pipeline. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deal Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="deal_name">Deal Name *</Label>
            <Input
              id="deal_name"
              value={formData.deal_name}
              onChange={(e) => handleInputChange("deal_name", e.target.value)}
              placeholder="Enter deal name"
              required
            />
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                placeholder="e.g., Active, Closed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Input
                id="tier"
                value={formData.tier}
                onChange={(e) => handleInputChange("tier", e.target.value)}
                placeholder="e.g., Tier 1, Tier 2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Input
                id="sector"
                value={formData.sector}
                onChange={(e) => handleInputChange("sector", e.target.value)}
                placeholder="e.g., Healthcare, Technology"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lg_focus_area">LG Focus Area</Label>
              <Input
                id="lg_focus_area"
                value={formData.lg_focus_area}
                onChange={(e) => handleInputChange("lg_focus_area", e.target.value)}
                placeholder="Enter focus area"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform_add_on">Platform Add-On</Label>
              <Input
                id="platform_add_on"
                value={formData.platform_add_on}
                onChange={(e) => handleInputChange("platform_add_on", e.target.value)}
                placeholder="Enter platform add-on"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_origination">Date of Origination</Label>
            <Input
              id="date_of_origination"
              value={formData.date_of_origination}
              onChange={(e) => handleInputChange("date_of_origination", e.target.value)}
              placeholder="e.g., Q1 2024, Jan 2024"
            />
          </div>

          {/* Deal Source */}
          <div className="space-y-2">
            <Label htmlFor="deal_source_company">Deal Source Company</Label>
            <Input
              id="deal_source_company"
              value={formData.deal_source_company}
              onChange={(e) => handleInputChange("deal_source_company", e.target.value)}
              placeholder="Enter source company"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal_source_individual_1">Deal Source Individual #1</Label>
              <Input
                id="deal_source_individual_1"
                value={formData.deal_source_individual_1}
                onChange={(e) => handleInputChange("deal_source_individual_1", e.target.value)}
                placeholder="Enter individual #1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal_source_individual_2">Deal Source Individual #2</Label>
              <Input
                id="deal_source_individual_2"
                value={formData.deal_source_individual_2}
                onChange={(e) => handleInputChange("deal_source_individual_2", e.target.value)}
                placeholder="Enter individual #2"
              />
            </div>
          </div>

          {/* Ownership */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ownership">Ownership</Label>
              <Input
                id="ownership"
                value={formData.ownership}
                onChange={(e) => handleInputChange("ownership", e.target.value)}
                placeholder="Enter ownership"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownership_type">Ownership Type</Label>
              <Input
                id="ownership_type"
                value={formData.ownership_type}
                onChange={(e) => handleInputChange("ownership_type", e.target.value)}
                placeholder="e.g., Sponsor Owned, Public"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary_of_opportunity">Summary of Opportunity</Label>
            <Textarea
              id="summary_of_opportunity"
              value={formData.summary_of_opportunity}
              onChange={(e) => handleInputChange("summary_of_opportunity", e.target.value)}
              placeholder="Enter opportunity summary..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Financial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ebitda">EBITDA</Label>
              <Input
                id="ebitda"
                value={formData.ebitda}
                onChange={(e) => handleInputChange("ebitda", e.target.value)}
                placeholder="e.g., $5M, <20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}