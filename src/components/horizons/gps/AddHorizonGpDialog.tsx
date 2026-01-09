import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronDown, AlertTriangle, Building2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SingleSelectDropdown } from "@/components/opportunities/SingleSelectDropdown";
import { useHorizonDuplicateCheck } from "@/hooks/useHorizonDuplicateCheck";
import {
  useHorizonGpCities,
  useHorizonGpStates,
  useHorizonGpIndustrySectors,
  useHorizonLgRelationships,
} from "@/hooks/useHorizonDistinctOptions";
import { cn } from "@/lib/utils";

interface AddHorizonGpDialogProps {
  open: boolean;
  onClose: () => void;
  onGpAdded: () => void;
}

interface GpFormData {
  gp_name: string;
  priority: string;
  aum: string;
  lg_relationship: string;
  gp_contact: string;
  gp_url: string;
  fund_hq_city: string;
  fund_hq_state: string;
  active_funds: string;
  total_funds: string;
  active_holdings: string;
  industry_sector_focus: string;
}

const initialFormData: GpFormData = {
  gp_name: "",
  priority: "",
  aum: "",
  lg_relationship: "",
  gp_contact: "",
  gp_url: "",
  fund_hq_city: "",
  fund_hq_state: "",
  active_funds: "",
  total_funds: "",
  active_holdings: "",
  industry_sector_focus: "",
};

const priorityOptions = ["1", "2", "3", "4", "5"];

export function AddHorizonGpDialog({ open, onClose, onGpAdded }: AddHorizonGpDialogProps) {
  const [formData, setFormData] = useState<GpFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const { toast } = useToast();

  // Fetch dropdown options
  const { data: cityOptions = [] } = useHorizonGpCities();
  const { data: stateOptions = [] } = useHorizonGpStates();
  const { data: sectorOptions = [] } = useHorizonGpIndustrySectors();
  const { data: lgRelationshipOptions = [] } = useHorizonLgRelationships();

  // Duplicate detection
  const { matches, isExactMatch, isLoading: isCheckingDuplicates } = useHorizonDuplicateCheck(
    'lg_horizons_gps',
    formData.gp_name
  );

  // Show duplicate warning when exact match detected
  useEffect(() => {
    setShowDuplicateWarning(isExactMatch);
  }, [isExactMatch]);

  const handleInputChange = (field: keyof GpFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gp_name.trim()) return;

    // If exact match, require confirmation
    if (isExactMatch && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const opt = (v: string) => (v.trim() !== "" ? v.trim() : null);
      const optInt = (v: string) => {
        const parsed = parseInt(v, 10);
        return isNaN(parsed) ? null : parsed;
      };

      const payload = {
        gp_name: formData.gp_name.trim(),
        priority: optInt(formData.priority),
        aum: opt(formData.aum),
        lg_relationship: opt(formData.lg_relationship),
        gp_contact: opt(formData.gp_contact),
        gp_url: opt(formData.gp_url),
        fund_hq_city: opt(formData.fund_hq_city),
        fund_hq_state: opt(formData.fund_hq_state),
        active_funds: optInt(formData.active_funds),
        total_funds: optInt(formData.total_funds),
        active_holdings: optInt(formData.active_holdings),
        industry_sector_focus: opt(formData.industry_sector_focus),
      };

      const { error } = await supabase.from('lg_horizons_gps').insert(payload);

      if (error) throw error;

      toast({ title: "Success", description: "GP added successfully" });
      handleClose();
      onGpAdded();
    } catch (error: any) {
      console.error('Error adding GP:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add GP", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setShowAdditional(false);
    setShowDuplicateWarning(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span>Add New GP</span>
          </DialogTitle>
          <DialogDescription>
            Add a new GP to LG Horizon. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-10rem)] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* GP Name with duplicate detection */}
            <div className="space-y-2">
              <Label htmlFor="gp_name">GP Name *</Label>
              <Input
                id="gp_name"
                value={formData.gp_name}
                onChange={(e) => handleInputChange("gp_name", e.target.value)}
                placeholder="Enter GP name"
                required
                className={cn(isExactMatch && "border-yellow-500 focus-visible:ring-yellow-500")}
              />
              
              {/* Duplicate matches dropdown */}
              {matches.length > 0 && formData.gp_name.trim().length >= 2 && (
                <div className="border rounded-md bg-muted/50 p-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    {isExactMatch ? (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertTriangle className="h-3 w-3" />
                        This GP already exists
                      </span>
                    ) : (
                      "Similar GPs found:"
                    )}
                  </p>
                  {matches.slice(0, 5).map((match) => (
                    <div 
                      key={match.id} 
                      className="flex items-center gap-2 text-sm p-1 rounded hover:bg-muted"
                    >
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{match.name}</span>
                      {match.subtitle && (
                        <span className="text-muted-foreground">• {match.subtitle}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority and AUM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SingleSelectDropdown
                label="Priority"
                options={priorityOptions}
                value={formData.priority}
                onChange={(value) => handleInputChange("priority", value)}
                placeholder="Select priority"
              />

              <div className="space-y-2">
                <Label htmlFor="aum">AUM</Label>
                <Input
                  id="aum"
                  value={formData.aum}
                  onChange={(e) => handleInputChange("aum", e.target.value)}
                  placeholder="e.g., $3.6B"
                />
              </div>
            </div>

            {/* LG Relationship and GP Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SingleSelectDropdown
                label="LG Relationship"
                options={lgRelationshipOptions.map(o => o.value)}
                value={formData.lg_relationship}
                onChange={(value) => handleInputChange("lg_relationship", value)}
                placeholder="Select LG relationship"
                allowCustom
              />

              <div className="space-y-2">
                <Label htmlFor="gp_contact">GP Contact</Label>
                <Input
                  id="gp_contact"
                  value={formData.gp_contact}
                  onChange={(e) => handleInputChange("gp_contact", e.target.value)}
                  placeholder="Enter contact name"
                />
              </div>
            </div>

            {/* Additional Details - Collapsible */}
            <Collapsible open={showAdditional} onOpenChange={setShowAdditional}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdditional && "rotate-180")} />
                {showAdditional ? "Hide additional details" : "Show additional details"}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {/* URL */}
                <div className="space-y-2">
                  <Label htmlFor="gp_url">GP URL</Label>
                  <Input
                    id="gp_url"
                    value={formData.gp_url}
                    onChange={(e) => handleInputChange("gp_url", e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SingleSelectDropdown
                    label="Fund HQ City"
                    options={cityOptions.map(o => o.value)}
                    value={formData.fund_hq_city}
                    onChange={(value) => handleInputChange("fund_hq_city", value)}
                    placeholder="Select or enter city"
                    allowCustom
                  />

                  <SingleSelectDropdown
                    label="Fund HQ State"
                    options={stateOptions.map(o => o.value)}
                    value={formData.fund_hq_state}
                    onChange={(value) => handleInputChange("fund_hq_state", value)}
                    placeholder="Select or enter state"
                    allowCustom
                  />
                </div>

                {/* Fund Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="active_funds">Active Funds</Label>
                    <Input
                      id="active_funds"
                      type="number"
                      min="0"
                      value={formData.active_funds}
                      onChange={(e) => handleInputChange("active_funds", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_funds">Total Funds</Label>
                    <Input
                      id="total_funds"
                      type="number"
                      min="0"
                      value={formData.total_funds}
                      onChange={(e) => handleInputChange("total_funds", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active_holdings">Active Holdings</Label>
                    <Input
                      id="active_holdings"
                      type="number"
                      min="0"
                      value={formData.active_holdings}
                      onChange={(e) => handleInputChange("active_holdings", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Industry Sector Focus */}
                <div className="space-y-2">
                  <Label htmlFor="industry_sector_focus">Industry/Sector Focus</Label>
                  <Textarea
                    id="industry_sector_focus"
                    value={formData.industry_sector_focus}
                    onChange={(e) => handleInputChange("industry_sector_focus", e.target.value)}
                    placeholder="Enter industry sectors (comma-separated)"
                    className="min-h-[60px] resize-none"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Duplicate Warning */}
            {isExactMatch && showDuplicateWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Duplicate GP detected</p>
                  <p className="text-yellow-700">
                    A GP with this name already exists. Click "Add GP" again to confirm adding anyway.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.gp_name.trim()}
              >
                {isSubmitting ? "Adding..." : "Add GP"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
