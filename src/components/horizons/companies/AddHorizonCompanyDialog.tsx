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
import { useHorizonDuplicateCheck, useHorizonGpsForLinking } from "@/hooks/useHorizonDuplicateCheck";
import {
  useHorizonCompanySectors,
  useHorizonCompanySubsectors,
  useHorizonCompanyOwnerships,
  useHorizonCompanyCities,
  useHorizonCompanyStates,
  useHorizonCompanySources,
  useHorizonProcessStatuses,
  useHorizonLgRelationships,
} from "@/hooks/useHorizonDistinctOptions";
import { cn } from "@/lib/utils";

interface AddHorizonCompanyDialogProps {
  open: boolean;
  onClose: () => void;
  onCompanyAdded: () => void;
}

interface CompanyFormData {
  company_name: string;
  priority: string;
  sector: string;
  subsector: string;
  parent_gp_name: string;
  parent_gp_id: string;
  process_status: string;
  ebitda: string;
  revenue: string;
  ownership: string;
  gp_aum: string;
  company_hq_city: string;
  company_hq_state: string;
  lg_relationship: string;
  gp_contact: string;
  company_url: string;
  original_date: string;
  latest_process_date: string;
  date_of_acquisition: string;
  description: string;
  additional_size_info: string;
  additional_information: string;
  source: string;
}

const initialFormData: CompanyFormData = {
  company_name: "",
  priority: "",
  sector: "",
  subsector: "",
  parent_gp_name: "",
  parent_gp_id: "",
  process_status: "",
  ebitda: "",
  revenue: "",
  ownership: "",
  gp_aum: "",
  company_hq_city: "",
  company_hq_state: "",
  lg_relationship: "",
  gp_contact: "",
  company_url: "",
  original_date: "",
  latest_process_date: "",
  date_of_acquisition: "",
  description: "",
  additional_size_info: "",
  additional_information: "",
  source: "",
};

const priorityOptions = ["1", "2", "3", "4", "5"];

export function AddHorizonCompanyDialog({ open, onClose, onCompanyAdded }: AddHorizonCompanyDialogProps) {
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const { toast } = useToast();

  // Fetch dropdown options
  const { data: sectorOptions = [] } = useHorizonCompanySectors();
  const { data: subsectorOptions = [] } = useHorizonCompanySubsectors();
  const { data: ownershipOptions = [] } = useHorizonCompanyOwnerships();
  const { data: cityOptions = [] } = useHorizonCompanyCities();
  const { data: stateOptions = [] } = useHorizonCompanyStates();
  const { data: sourceOptions = [] } = useHorizonCompanySources();
  const { data: processStatuses = [] } = useHorizonProcessStatuses();
  const { data: lgRelationshipOptions = [] } = useHorizonLgRelationships();
  const { data: gpOptions = [] } = useHorizonGpsForLinking();

  // Duplicate detection
  const { matches, isExactMatch, isLoading: isCheckingDuplicates } = useHorizonDuplicateCheck(
    'lg_horizons_companies',
    formData.company_name
  );

  // Show duplicate warning when exact match detected
  useEffect(() => {
    setShowDuplicateWarning(isExactMatch);
  }, [isExactMatch]);

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle Parent GP selection - auto-fill GP AUM
  const handleParentGpChange = (gpName: string) => {
    const selectedGp = gpOptions.find(gp => gp.gp_name === gpName);
    setFormData(prev => ({
      ...prev,
      parent_gp_name: gpName,
      parent_gp_id: selectedGp?.id || "",
      gp_aum: selectedGp?.aum || prev.gp_aum,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) return;

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
      const optDate = (v: string) => (v ? v : null);

      const payload = {
        company_name: formData.company_name.trim(),
        priority: optInt(formData.priority),
        sector: opt(formData.sector),
        subsector: opt(formData.subsector),
        parent_gp_name: opt(formData.parent_gp_name),
        parent_gp_id: opt(formData.parent_gp_id),
        process_status: opt(formData.process_status),
        ebitda: opt(formData.ebitda),
        revenue: opt(formData.revenue),
        ownership: opt(formData.ownership),
        gp_aum: opt(formData.gp_aum),
        company_hq_city: opt(formData.company_hq_city),
        company_hq_state: opt(formData.company_hq_state),
        lg_relationship: opt(formData.lg_relationship),
        gp_contact: opt(formData.gp_contact),
        company_url: opt(formData.company_url),
        original_date: optDate(formData.original_date),
        latest_process_date: optDate(formData.latest_process_date),
        date_of_acquisition: optDate(formData.date_of_acquisition),
        description: opt(formData.description),
        additional_size_info: opt(formData.additional_size_info),
        additional_information: opt(formData.additional_information),
        source: opt(formData.source),
      };

      const { error } = await supabase.from('lg_horizons_companies').insert(payload);

      if (error) throw error;

      toast({ title: "Success", description: "Company added successfully" });
      handleClose();
      onCompanyAdded();
    } catch (error: any) {
      console.error('Error adding company:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add company", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setShowFinancial(false);
    setShowLocation(false);
    setShowDates(false);
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
            <span>Add New Company</span>
          </DialogTitle>
          <DialogDescription>
            Add a new company to LG Horizon. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-10rem)] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name with duplicate detection */}
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange("company_name", e.target.value)}
                placeholder="Enter company name"
                required
                className={cn(isExactMatch && "border-yellow-500 focus-visible:ring-yellow-500")}
              />
              
              {/* Duplicate matches dropdown */}
              {matches.length > 0 && formData.company_name.trim().length >= 2 && (
                <div className="border rounded-md bg-muted/50 p-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    {isExactMatch ? (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <AlertTriangle className="h-3 w-3" />
                        This company already exists
                      </span>
                    ) : (
                      "Similar companies found:"
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

            {/* Priority and Sector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SingleSelectDropdown
                label="Priority"
                options={priorityOptions}
                value={formData.priority}
                onChange={(value) => handleInputChange("priority", value)}
                placeholder="Select priority"
              />

              <SingleSelectDropdown
                label="Sector"
                options={sectorOptions.map(o => o.value)}
                value={formData.sector}
                onChange={(value) => handleInputChange("sector", value)}
                placeholder="Select sector"
                allowCustom
              />
            </div>

            {/* Subsector and Process Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SingleSelectDropdown
                label="Subsector"
                options={subsectorOptions.map(o => o.value)}
                value={formData.subsector}
                onChange={(value) => handleInputChange("subsector", value)}
                placeholder="Select subsector"
                allowCustom
              />

              <SingleSelectDropdown
                label="Process Status"
                options={processStatuses.map(o => o.label)}
                value={formData.process_status}
                onChange={(value) => handleInputChange("process_status", value)}
                placeholder="Select status"
              />
            </div>

            {/* Parent GP Selection */}
            <SingleSelectDropdown
              label="Parent GP"
              options={gpOptions.map(gp => gp.gp_name)}
              value={formData.parent_gp_name}
              onChange={handleParentGpChange}
              placeholder="Select parent GP"
              allowCustom
            />

            {/* Financial Details - Collapsible */}
            <Collapsible open={showFinancial} onOpenChange={setShowFinancial}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showFinancial && "rotate-180")} />
                Financial Details
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ebitda">EBITDA</Label>
                    <Input
                      id="ebitda"
                      value={formData.ebitda}
                      onChange={(e) => handleInputChange("ebitda", e.target.value)}
                      placeholder="e.g., $50M"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="revenue">Revenue</Label>
                    <Input
                      id="revenue"
                      value={formData.revenue}
                      onChange={(e) => handleInputChange("revenue", e.target.value)}
                      placeholder="e.g., $200M"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SingleSelectDropdown
                    label="Ownership"
                    options={ownershipOptions.map(o => o.value)}
                    value={formData.ownership}
                    onChange={(value) => handleInputChange("ownership", value)}
                    placeholder="Select ownership"
                    allowCustom
                  />

                  <div className="space-y-2">
                    <Label htmlFor="gp_aum">GP AUM</Label>
                    <Input
                      id="gp_aum"
                      value={formData.gp_aum}
                      onChange={(e) => handleInputChange("gp_aum", e.target.value)}
                      placeholder="e.g., $3.6B"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Location & Contacts - Collapsible */}
            <Collapsible open={showLocation} onOpenChange={setShowLocation}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showLocation && "rotate-180")} />
                Location & Contacts
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SingleSelectDropdown
                    label="Company HQ City"
                    options={cityOptions.map(o => o.value)}
                    value={formData.company_hq_city}
                    onChange={(value) => handleInputChange("company_hq_city", value)}
                    placeholder="Select city"
                    allowCustom
                  />

                  <SingleSelectDropdown
                    label="Company HQ State"
                    options={stateOptions.map(o => o.value)}
                    value={formData.company_hq_state}
                    onChange={(value) => handleInputChange("company_hq_state", value)}
                    placeholder="Select state"
                    allowCustom
                  />
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="company_url">Company URL</Label>
                  <Input
                    id="company_url"
                    value={formData.company_url}
                    onChange={(e) => handleInputChange("company_url", e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Dates - Collapsible */}
            <Collapsible open={showDates} onOpenChange={setShowDates}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showDates && "rotate-180")} />
                Dates
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="original_date">Original Date</Label>
                    <Input
                      id="original_date"
                      type="date"
                      value={formData.original_date}
                      onChange={(e) => handleInputChange("original_date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="latest_process_date">Latest Process Date</Label>
                    <Input
                      id="latest_process_date"
                      type="date"
                      value={formData.latest_process_date}
                      onChange={(e) => handleInputChange("latest_process_date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_acquisition">Date of Acquisition</Label>
                    <Input
                      id="date_of_acquisition"
                      type="date"
                      value={formData.date_of_acquisition}
                      onChange={(e) => handleInputChange("date_of_acquisition", e.target.value)}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Additional Info - Collapsible */}
            <Collapsible open={showAdditional} onOpenChange={setShowAdditional}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdditional && "rotate-180")} />
                Additional Information
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Enter company description"
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_size_info">Additional Size Info</Label>
                  <Textarea
                    id="additional_size_info"
                    value={formData.additional_size_info}
                    onChange={(e) => handleInputChange("additional_size_info", e.target.value)}
                    placeholder="Enter size information"
                    className="min-h-[60px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_information">Additional Information</Label>
                  <Textarea
                    id="additional_information"
                    value={formData.additional_information}
                    onChange={(e) => handleInputChange("additional_information", e.target.value)}
                    placeholder="Enter any additional notes"
                    className="min-h-[60px] resize-none"
                  />
                </div>

                <SingleSelectDropdown
                  label="Source"
                  options={sourceOptions.map(o => o.value)}
                  value={formData.source}
                  onChange={(value) => handleInputChange("source", value)}
                  placeholder="Select source"
                  allowCustom
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Duplicate Warning */}
            {isExactMatch && showDuplicateWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Duplicate company detected</p>
                  <p className="text-yellow-700">
                    A company with this name already exists. Click "Add Company" again to confirm adding anyway.
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
                disabled={isSubmitting || !formData.company_name.trim()}
              >
                {isSubmitting ? "Adding..." : "Add Company"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
