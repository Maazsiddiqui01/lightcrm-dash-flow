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
    
    // Validation for required fields
    const requiredFields = [
      { field: 'lg_focus_area', name: 'LG Focus Area' },
      { field: 'deal_name', name: 'Deal Name' },
      { field: 'deal_source_company', name: 'Deal Source Company' },
      { field: 'deal_source_individual_1', name: 'Deal Source Individual #1' },
      { field: 'investment_professional_point_person_1', name: 'Investment Professional Point Person #1' }
    ];

    for (const { field, name } of requiredFields) {
      if (!formData[field as keyof typeof formData].trim()) {
        toast({
          title: "Error",
          description: `${name} is required`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const req = (v: string) => v.trim();
      const opt = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);

      const payload = {
        lg_focus_area: req(formData.lg_focus_area),
        deal_name: req(formData.deal_name),
        deal_source_company: req(formData.deal_source_company),
        deal_source_individual_1: req(formData.deal_source_individual_1),
        investment_professional_point_person_1: req(formData.investment_professional_point_person_1),
        // Optionals
        status: opt(formData.status),
        tier: opt(formData.tier),
        sector: opt(formData.sector),
        platform_add_on: opt(formData.platform_add_on),
        date_of_origination: opt(formData.date_of_origination),
        deal_source_individual_2: opt(formData.deal_source_individual_2),
        ownership: opt(formData.ownership),
        ownership_type: opt(formData.ownership_type),
        ebitda: opt(formData.ebitda),
        ebitda_notes: opt(formData.ebitda_notes),
        url: opt(formData.url),
        summary_of_opportunity: opt(formData.summary_of_opportunity),
        investment_professional_point_person_2: opt(formData.investment_professional_point_person_2),
        most_recent_notes: opt(formData.most_recent_notes),
      };

      const { data, error } = await supabase
        .from('opportunities_raw')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity added",
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
        description: error.message || "Failed to add opportunity",
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
          {/* Required Fields */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-medium text-foreground">Required Fields</h3>
            
            <div className="space-y-2">
              <Label htmlFor="lg_focus_area">LG Focus Area *</Label>
              <Input
                id="lg_focus_area"
                value={formData.lg_focus_area}
                onChange={(e) => handleInputChange("lg_focus_area", e.target.value)}
                placeholder="Enter focus area"
                required
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="deal_source_company">Deal Source Company *</Label>
              <Input
                id="deal_source_company"
                value={formData.deal_source_company}
                onChange={(e) => handleInputChange("deal_source_company", e.target.value)}
                placeholder="Enter source company"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal_source_individual_1">Deal Source Individual #1 *</Label>
              <Input
                id="deal_source_individual_1"
                value={formData.deal_source_individual_1}
                onChange={(e) => handleInputChange("deal_source_individual_1", e.target.value)}
                placeholder="Enter individual #1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment_professional_point_person_1">Investment Professional Point Person #1 *</Label>
              <Input
                id="investment_professional_point_person_1"
                value={formData.investment_professional_point_person_1}
                onChange={(e) => handleInputChange("investment_professional_point_person_1", e.target.value)}
                placeholder="Enter point person #1"
                required
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Optional Fields</h3>
            
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
                <Label htmlFor="platform_add_on">Platform Add-On</Label>
                <Input
                  id="platform_add_on"
                  value={formData.platform_add_on}
                  onChange={(e) => handleInputChange("platform_add_on", e.target.value)}
                  placeholder="Enter platform add-on"
                />
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

            <div className="space-y-2">
              <Label htmlFor="investment_professional_point_person_2">Investment Professional Point Person #2</Label>
              <Input
                id="investment_professional_point_person_2"
                value={formData.investment_professional_point_person_2}
                onChange={(e) => handleInputChange("investment_professional_point_person_2", e.target.value)}
                placeholder="Enter point person #2"
              />
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

            {/* Financial & Additional Fields */}
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

            <div className="space-y-2">
              <Label htmlFor="ebitda_notes">EBITDA Notes</Label>
              <Textarea
                id="ebitda_notes"
                value={formData.ebitda_notes}
                onChange={(e) => handleInputChange("ebitda_notes", e.target.value)}
                placeholder="Additional EBITDA notes..."
                className="min-h-[60px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="most_recent_notes">Most Recent Notes</Label>
              <Textarea
                id="most_recent_notes"
                value={formData.most_recent_notes}
                onChange={(e) => handleInputChange("most_recent_notes", e.target.value)}
                placeholder="Latest notes or updates..."
                className="min-h-[60px] resize-none"
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