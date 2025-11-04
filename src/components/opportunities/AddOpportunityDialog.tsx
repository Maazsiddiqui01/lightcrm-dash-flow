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
import { useOpportunityOptions } from "@/hooks/useOpportunityOptions";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { SingleSelectDropdown } from "./SingleSelectDropdown";
import { useSectors, useFocusAreasBySector } from "@/hooks/useLookups";
import { calculateLgTeam } from "@/utils/opportunityHelpers";
import { ContactPickerWithAddNew } from "./ContactPickerWithAddNew";
import { ContactSearchResult } from "@/hooks/useContactSearch";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { useQueryClient } from "@tanstack/react-query";
import { 
  tierDisplayOptions, 
  getTierDisplayValue, 
  getTierDatabaseValue,
  platformAddonDisplayOptions,
  getPlatformAddonDisplayValue,
  getPlatformAddonDatabaseValue,
  defaultOwnershipTypes
} from "@/lib/export/opportunityUtils";

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
    ebitda_in_ms: "",
    ebitda_notes: "",
    investment_professional_point_person_1: "",
    investment_professional_point_person_2: "",
    investment_professional_point_person_3: "",
    investment_professional_point_person_4: "",
    most_recent_notes: "",
    url: "",
  });
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [customStatusOptions, setCustomStatusOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSourceContact1, setSelectedSourceContact1] = useState<ContactSearchResult | null>(null);
  const [selectedSourceContact2, setSelectedSourceContact2] = useState<ContactSearchResult | null>(null);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [pendingContactField, setPendingContactField] = useState<'contact1' | 'contact2' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use the canonical lookup hooks
  const { data: sectorOptions = [], isLoading: isLoadingSectors } = useSectors();
  // Fetch focus areas for auto-fill sector logic
  const { data: focusAreaOptionsForAutoFill = [], isLoading: isLoadingFocusAreas } = useFocusAreasBySector(
    formData.sector && formData.sector.trim() ? formData.sector : undefined
  );
  
  // Derive sectorId from the selected sector for filtering FocusAreaSelect
  const selectedSectorId = formData.sector && formData.sector.trim() 
    ? sectorOptions.find(s => s.label === formData.sector)?.meta?.id 
    : undefined;
  
  const { 
    dealSourceCompanyOptions,
    lgLeadOptions,
    isLoading: isLoadingOptions
  } = useOpportunityOptions();

  const isLoading = isLoadingFocusAreas || isLoadingSectors || isLoadingOptions;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFocusAreaChange = (newFocusAreas: string[]) => {
    setSelectedFocusAreas(newFocusAreas);
    
    // Auto-fill sector if first focus area is selected and sector is currently blank
    if (newFocusAreas.length === 1 && !formData.sector) {
      const selectedOption = focusAreaOptionsForAutoFill.find(opt => opt.label === newFocusAreas[0]);
      if (selectedOption?.meta?.sector_id) {
        // Find the sector label from the sector options
        const sectorOption = sectorOptions.find(s => s.meta?.id === selectedOption.meta.sector_id);
        if (sectorOption) {
          handleInputChange("sector", sectorOption.label);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for required fields
    if (selectedFocusAreas.length === 0) {
      toast({
        title: "Error",
        description: "At least one LG Focus Area is required",
        variant: "destructive",
      });
      return;
    }

    const requiredFields = [
      { field: 'deal_name', name: 'Deal Name' },
      { field: 'sector', name: 'Sector' },
      { field: 'status', name: 'Status' },
      { field: 'tier', name: 'Tier' }
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

      // Handle focus areas
      const consolidated = selectedFocusAreas.join(', ');

      const payload: any = {
        lg_focus_area: consolidated,
        deal_name: req(formData.deal_name),
        sector: req(formData.sector),
        status: req(formData.status),
        tier: req(formData.tier),
        // Optionals
        platform_add_on: opt(formData.platform_add_on) 
          ? getPlatformAddonDatabaseValue(formData.platform_add_on) 
          : null,
        date_of_origination: opt(formData.date_of_origination),
        deal_source_company: opt(formData.deal_source_company),
        deal_source_individual_1: selectedSourceContact1?.full_name || null,
        deal_source_individual_2: selectedSourceContact2?.full_name || null,
        deal_source_contact_1_id: selectedSourceContact1?.id || null,
        deal_source_contact_2_id: selectedSourceContact2?.id || null,
        ownership: opt(formData.ownership),
        ownership_type: opt(formData.ownership_type),
        
        ebitda_in_ms: formData.ebitda_in_ms ? parseFloat(formData.ebitda_in_ms) : null,
        ebitda_notes: opt(formData.ebitda_notes),
        url: opt(formData.url),
        summary_of_opportunity: opt(formData.summary_of_opportunity),
        investment_professional_point_person_1: opt(formData.investment_professional_point_person_1),
        investment_professional_point_person_2: opt(formData.investment_professional_point_person_2),
        investment_professional_point_person_3: opt(formData.investment_professional_point_person_3),
        investment_professional_point_person_4: opt(formData.investment_professional_point_person_4),
        lg_team: calculateLgTeam(
          formData.investment_professional_point_person_1,
          formData.investment_professional_point_person_2,
          formData.investment_professional_point_person_3,
          formData.investment_professional_point_person_4
        ),
        most_recent_notes: opt(formData.most_recent_notes),
      };

      // Note: Only lg_focus_area column exists in opportunities_raw table

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
        ebitda_in_ms: "",
        ebitda_notes: "",
        investment_professional_point_person_1: "",
        investment_professional_point_person_2: "",
        investment_professional_point_person_3: "",
        investment_professional_point_person_4: "",
        most_recent_notes: "",
        url: "",
      });
      setSelectedFocusAreas([]);
      setCustomStatusOptions([]);

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
      ebitda_in_ms: "",
      ebitda_notes: "",
      investment_professional_point_person_1: "",
      investment_professional_point_person_2: "",
      investment_professional_point_person_3: "",
      investment_professional_point_person_4: "",
      most_recent_notes: "",
      url: "",
    });
    setSelectedFocusAreas([]);
    setCustomStatusOptions([]);
    setSelectedSourceContact1(null);
    setSelectedSourceContact2(null);
    onClose();
  };

  const handleAddNewContact = (field: 'contact1' | 'contact2') => {
    setPendingContactField(field);
    setIsAddContactModalOpen(true);
  };

  const handleContactAdded = (newContact?: { id: string; full_name: string; email_address: string; organization?: string }) => {
    if (newContact && pendingContactField) {
      const contactResult: ContactSearchResult = {
        id: newContact.id,
        full_name: newContact.full_name,
        email_address: newContact.email_address,
        organization: newContact.organization,
      };
      
      if (pendingContactField === 'contact1') {
        setSelectedSourceContact1(contactResult);
      } else {
        setSelectedSourceContact2(contactResult);
      }
      
      // Invalidate contact search cache so new contact appears in searches
      queryClient.invalidateQueries({ queryKey: ['contact_search'] });
    }
    
    setIsAddContactModalOpen(false);
    setPendingContactField(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
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

        <div className="overflow-y-auto max-h-[calc(80vh-8rem)] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required Fields */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-medium text-foreground">Required Fields</h3>
            
            {/* LG Focus Area - Multi-select */}
            <FocusAreaSelect
              value={selectedFocusAreas}
              onChange={handleFocusAreaChange}
              disabled={isLoading}
              label="LG Focus Area"
              sectorId={selectedSectorId}
            />

            {/* Consolidated Focus Areas (Read-only) */}
            {selectedFocusAreas.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">LG Focus Area (Consolidated)</Label>
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {selectedFocusAreas.join(', ')}
                </p>
              </div>
            )}

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

            {/* Sector - Single-select dropdown */}
            <SingleSelectDropdown
              label="Sector"
              options={sectorOptions.map(opt => opt.label)}
              value={formData.sector}
              onChange={(value) => handleInputChange("sector", value)}
              placeholder="Select sector"
              required
              disabled={isLoading}
            />

            {/* Status - Single-select dropdown with predefined options */}
            <SingleSelectDropdown
              label="Status"
              options={['Active','Pass','Likely Pass','Longer-Term Opportunity']}
              value={formData.status}
              onChange={(value) => handleInputChange("status", value)}
              placeholder="Select status"
              required
              allowCustom
              onAddCustom={(value) => setCustomStatusOptions(prev => [...prev, value])}
              disabled={isLoading}
            />

            {/* Tier with Display Labels */}
            <SingleSelectDropdown
              label="Tier"
              options={tierDisplayOptions}
              value={getTierDisplayValue(formData.tier)}
              onChange={(displayValue) => {
                const dbValue = getTierDatabaseValue(displayValue);
                handleInputChange("tier", dbValue);
              }}
              placeholder="Select tier"
              required
              disabled={isLoading}
            />
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Optional Fields</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LG Lead 1 */}
              <SingleSelectDropdown
                label="LG Lead 1"
                options={lgLeadOptions}
                value={formData.investment_professional_point_person_1}
                onChange={(value) => handleInputChange("investment_professional_point_person_1", value)}
                placeholder="Select LG lead 1"
                disabled={isLoading}
              />

              {/* LG Lead 2 */}
              <SingleSelectDropdown
                label="LG Lead 2"
                options={lgLeadOptions}
                value={formData.investment_professional_point_person_2}
                onChange={(value) => handleInputChange("investment_professional_point_person_2", value)}
                placeholder="Select LG lead 2"
                disabled={isLoading}
              />

              {/* LG Lead 3 */}
              <SingleSelectDropdown
                label="LG Lead 3"
                options={lgLeadOptions}
                value={formData.investment_professional_point_person_3}
                onChange={(value) => handleInputChange("investment_professional_point_person_3", value)}
                placeholder="Select LG lead 3"
                disabled={isLoading}
              />

              {/* LG Lead 4 */}
              <SingleSelectDropdown
                label="LG Lead 4"
                options={lgLeadOptions}
                value={formData.investment_professional_point_person_4}
                onChange={(value) => handleInputChange("investment_professional_point_person_4", value)}
                placeholder="Select LG lead 4"
                disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform/Add-on with Display Labels */}
              <SingleSelectDropdown
                label="Platform/Add-on"
                options={platformAddonDisplayOptions}
                value={getPlatformAddonDisplayValue(formData.platform_add_on)}
                onChange={(displayValue) => {
                  const dbValue = getPlatformAddonDatabaseValue(displayValue);
                  handleInputChange("platform_add_on", dbValue);
                }}
                placeholder="Select platform/add-on"
                disabled={isLoading}
              />

              {/* Ownership Type with All Defaults */}
              <SingleSelectDropdown
                label="Ownership Type"
                options={defaultOwnershipTypes}
                value={formData.ownership_type}
                onChange={(value) => handleInputChange("ownership_type", value)}
                placeholder="Select ownership type"
                disabled={isLoading}
              />

            <SingleSelectDropdown
              label="Date of Origination"
              options={['2024', '2025', '2026', '2027']}
              value={formData.date_of_origination}
              onChange={(value) => handleInputChange("date_of_origination", value)}
              placeholder="Select year"
              disabled={isLoading}
            />
            </div>

            <SingleSelectDropdown
              label="Deal Source Company"
              options={dealSourceCompanyOptions}
              value={formData.deal_source_company}
              onChange={(value) => handleInputChange("deal_source_company", value)}
              placeholder="Search or add company..."
              allowCustom
              onAddCustom={(value) => handleInputChange("deal_source_company", value)}
              disabled={isLoading}
            />

            <ContactPickerWithAddNew
              label="Deal Source Individual #1"
              selectedContact={selectedSourceContact1}
              onContactSelect={setSelectedSourceContact1}
              onAddNewContact={() => handleAddNewContact('contact1')}
            />

            <ContactPickerWithAddNew
              label="Deal Source Individual #2"
              selectedContact={selectedSourceContact2}
              onContactSelect={setSelectedSourceContact2}
              onAddNewContact={() => handleAddNewContact('contact2')}
            />

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
                <Label htmlFor="ebitda_in_ms">EBITDA (in M$)</Label>
                <Input
                  id="ebitda_in_ms"
                  type="number"
                  step="0.1"
                  value={formData.ebitda_in_ms}
                  onChange={(e) => handleInputChange("ebitda_in_ms", e.target.value)}
                  placeholder="e.g., 5.5"
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
          </form>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Opportunity"}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Add Contact Modal */}
      <AddContactDialog
        open={isAddContactModalOpen}
        onClose={() => {
          setIsAddContactModalOpen(false);
          setPendingContactField(null);
        }}
        onContactAdded={handleContactAdded}
      />
    </Dialog>
  );
}