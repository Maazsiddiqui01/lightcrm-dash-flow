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
import { Save, ExternalLink, Target, DollarSign, Calendar, Building, Mail } from "lucide-react";
import { useOpportunityNotes } from "@/hooks/useOpportunityNotes";
import { OpportunityNotesSection } from "./OpportunityNotesSection";
import { sendOpportunityEmail } from "@/features/opportunities/sendEmail";
import { useOpportunityOptions } from "@/hooks/useOpportunityOptions";
import { MultiSelectFocusArea } from "./MultiSelectFocusArea";
import { SingleSelectDropdown } from "./SingleSelectDropdown";
import { splitTokens, tierOptions, normalizePlatformAddonMapping, normalizeOwnershipTypeMapping } from "@/lib/export/opportunityUtils";

interface Opportunity {
  id: string;
  deal_name: string;
  status: string;
  tier: string;
  sector: string;
  lg_focus_area: string;
  platform_add_on: string;
  date_of_origination: string;
  deal_source_company: string;
  deal_source_individual_1: string;
  deal_source_individual_2: string;
  ownership: string;
  ownership_type: string;
  summary_of_opportunity: string;
  ebitda_in_ms: number;
  ebitda: string;
  ebitda_notes: string;
  investment_professional_point_person_1: string;
  investment_professional_point_person_2: string;
  next_steps: string;
  most_recent_notes: string;
  url: string;
  created_at: string;
  updated_at: string;
  dealcloud: boolean;
}

interface OpportunityDrawerProps {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
  onOpportunityUpdated: () => void;
}

export function OpportunityDrawer({ opportunity, open, onClose, onOpportunityUpdated }: OpportunityDrawerProps) {
  const [editedFields, setEditedFields] = useState<Partial<Opportunity>>({});
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [customStatusOptions, setCustomStatusOptions] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const { 
    focusAreaOptions,
    sectorOptions,
    statusOptions,
    platformAddonOptions,
    ownershipTypeOptions,
    lgLeadOptions,
    isLoading: isLoadingOptions
  } = useOpportunityOptions();

  const allStatusOptions = [...statusOptions, ...customStatusOptions];
  
  // Use the opportunity notes hook
  const {
    currentNotes,
    timeline,
    isLoadingCurrent,
    isLoadingTimeline,
    saveNextSteps,
    saveMostRecentNotes,
    isSavingNextSteps,
    isSavingNotes,
  } = useOpportunityNotes(opportunity?.id);

  useEffect(() => {
    if (opportunity) {
      // Parse focus areas from consolidated field and any individual slots
      const consolidatedAreas = splitTokens(opportunity.lg_focus_area);
      setSelectedFocusAreas(consolidatedAreas);
      
      setEditedFields({
        summary_of_opportunity: opportunity.summary_of_opportunity || "",
        ebitda_notes: opportunity.ebitda_notes || "",
        most_recent_notes: opportunity.most_recent_notes || "",
        status: opportunity.status || "",
        tier: opportunity.tier || "",
        sector: opportunity.sector || "",
        lg_focus_area: opportunity.lg_focus_area || "",
        platform_add_on: opportunity.platform_add_on || "",
        ownership: opportunity.ownership || "",
        ownership_type: opportunity.ownership_type || "",
        url: opportunity.url || "",
        ebitda: opportunity.ebitda || "",
        investment_professional_point_person_1: opportunity.investment_professional_point_person_1 || "",
        investment_professional_point_person_2: opportunity.investment_professional_point_person_2 || "",
      });
    }
  }, [opportunity]);

  const handleFieldChange = (field: keyof Opportunity, value: string | number) => {
    setEditedFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!opportunity) return;

    try {
      setIsUpdating(true);
      
      // Handle focus areas
      const consolidated = selectedFocusAreas.join(', ');
      
      const updatePayload: any = {
        ...editedFields,
        lg_focus_area: consolidated,
        updated_at: new Date().toISOString()
      };

      // Handle focus area slots if they exist in the table
      const focusAreaSlots = ['lg_focus_area_1','lg_focus_area_2','lg_focus_area_3','lg_focus_area_4',
                             'lg_focus_area_5','lg_focus_area_6','lg_focus_area_7','lg_focus_area_8'];
      focusAreaSlots.forEach((slot, i) => {
        updatePayload[slot] = selectedFocusAreas[i] ?? null;
      });
      
      // Update in opportunities_raw table
      const { error } = await supabase
        .from("opportunities_raw")
        .update(updatePayload)
        .eq("id", opportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });

      onOpportunityUpdated();
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast({
        title: "Error",
        description: "Failed to update opportunity",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "open":
        return "bg-success-light text-success";
      case "closed":
      case "won":
        return "bg-primary-light text-primary";
      case "lost":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "tier 1":
      case "1":
        return "bg-primary-light text-primary";
      case "tier 2":
      case "2":
        return "bg-warning-light text-warning";
      case "tier 3":
      case "3":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{opportunity.deal_name || "Unnamed Deal"}</SheetTitle>
              <SheetDescription>
                {opportunity.deal_source_company && (
                  <span>Source: {opportunity.deal_source_company}</span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {editedFields.status && (
                <Badge className={getStatusColor(editedFields.status)}>
                  {editedFields.status}
                </Badge>
              )}
              {editedFields.tier && (
                <Badge className={getTierColor(editedFields.tier)}>
                  {editedFields.tier}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                onClick={async () => {
                  try {
                    toast({ 
                      title: 'AI is drafting your email…',
                      description: 'This may take a moment'
                    });
                    await sendOpportunityEmail(opportunity.id);
                    toast({ 
                      title: 'Draft requested', 
                      description: 'Check your inbox shortly.' 
                    });
                  } catch (error: any) {
                    console.error('Send email error:', error);
                    toast({
                      title: 'Failed to request draft',
                      description: error?.message ?? 'Please try again.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Deal Information */}
          <div className="space-y-4">
            {/* LG Focus Area - Multi-select */}
            <MultiSelectFocusArea
              options={focusAreaOptions}
              value={selectedFocusAreas}
              onChange={setSelectedFocusAreas}
              disabled={isLoadingOptions}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sector - Single-select dropdown */}
              <SingleSelectDropdown
                label="Sector"
                options={sectorOptions}
                value={editedFields.sector || ""}
                onChange={(value) => handleFieldChange("sector", value)}
                placeholder="Select sector"
                disabled={isLoadingOptions}
              />

              {/* Status - Single-select dropdown with custom option */}
              <SingleSelectDropdown
                label="Status"
                options={allStatusOptions}
                value={editedFields.status || ""}
                onChange={(value) => handleFieldChange("status", value)}
                placeholder="Select status"
                allowCustom
                onAddCustom={(value) => setCustomStatusOptions(prev => [...prev, value])}
                disabled={isLoadingOptions}
              />

              {/* Tier - Hardcoded 1-5 */}
              <SingleSelectDropdown
                label="Tier"
                options={tierOptions}
                value={editedFields.tier || ""}
                onChange={(value) => handleFieldChange("tier", value)}
                placeholder="Select tier"
              />

              {/* Platform Add-On */}
              <SingleSelectDropdown
                label="Platform Add-On"
                options={platformAddonOptions}
                value={editedFields.platform_add_on || ""}
                onChange={(value) => handleFieldChange("platform_add_on", normalizePlatformAddonMapping(value))}
                placeholder="Select platform add-on"
                disabled={isLoadingOptions}
              />
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Financial Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ebitda">EBITDA</Label>
                <Input
                  id="ebitda"
                  value={editedFields.ebitda || ""}
                  onChange={(e) => handleFieldChange("ebitda", e.target.value)}
                  placeholder="Enter EBITDA"
                />
              </div>
              <div className="space-y-2">
                <Label>EBITDA (in Ms)</Label>
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {opportunity.ebitda_in_ms ? `$${opportunity.ebitda_in_ms}M` : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ebitda_notes">EBITDA Notes</Label>
              <Textarea
                id="ebitda_notes"
                value={editedFields.ebitda_notes || ""}
                onChange={(e) => handleFieldChange("ebitda_notes", e.target.value)}
                placeholder="Enter EBITDA notes"
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Ownership Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Ownership</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownership">Ownership</Label>
                <Input
                  id="ownership"
                  value={editedFields.ownership || ""}
                  onChange={(e) => handleFieldChange("ownership", e.target.value)}
                  placeholder="Enter ownership"
                />
              </div>
              
              {/* Ownership Type */}
              <SingleSelectDropdown
                label="Ownership Type"
                options={ownershipTypeOptions}
                value={editedFields.ownership_type || ""}
                onChange={(value) => handleFieldChange("ownership_type", normalizeOwnershipTypeMapping(value))}
                placeholder="Select ownership type"
                disabled={isLoadingOptions}
              />
            </div>
          </div>

          <Separator />

          {/* Team Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Investment Professionals</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Investment Professional Point Person #1 */}
              <SingleSelectDropdown
                label="Investment Professional Point Person #1"
                options={lgLeadOptions}
                value={editedFields.investment_professional_point_person_1 || ""}
                onChange={(value) => handleFieldChange("investment_professional_point_person_1", value)}
                placeholder="Select point person #1"
                disabled={isLoadingOptions}
              />

              {/* Investment Professional Point Person #2 */}
              <SingleSelectDropdown
                label="Investment Professional Point Person #2"
                options={lgLeadOptions}
                value={editedFields.investment_professional_point_person_2 || ""}
                onChange={(value) => handleFieldChange("investment_professional_point_person_2", value)}
                placeholder="Select point person #2"
                disabled={isLoadingOptions}
              />
            </div>
          </div>

          <Separator />

          {/* Deal Source Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deal Source</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium">Source Company</Label>
                <p className="text-sm text-muted-foreground">{opportunity.deal_source_company || "—"}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Individual #1</Label>
                  <p className="text-sm text-muted-foreground">{opportunity.deal_source_individual_1 || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Individual #2</Label>
                  <p className="text-sm text-muted-foreground">{opportunity.deal_source_individual_2 || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Summary of Opportunity</h3>
            <Textarea
              value={editedFields.summary_of_opportunity || ""}
              onChange={(e) => handleFieldChange("summary_of_opportunity", e.target.value)}
              placeholder="Enter opportunity summary"
              className="min-h-[120px] resize-none"
            />
          </div>

          <Separator />

          {/* Next Steps - Interactive with Timeline */}
          <OpportunityNotesSection
            title="Next Steps"
            field="next_steps"
            currentValue={currentNotes?.next_steps || null}
            timeline={timeline}
            onSave={(content) => saveNextSteps({ opportunityId: opportunity.id, content })}
            isSaving={isSavingNextSteps}
            isLoadingCurrent={isLoadingCurrent}
            isLoadingTimeline={isLoadingTimeline}
          />

          <Separator />

          {/* Most Recent Notes - Interactive with Timeline */}
          <OpportunityNotesSection
            title="Most Recent Notes"
            field="most_recent_notes"
            currentValue={currentNotes?.most_recent_notes || null}
            timeline={timeline}
            onSave={(content) => saveMostRecentNotes({ opportunityId: opportunity.id, content })}
            isSaving={isSavingNotes}
            isLoadingCurrent={isLoadingCurrent}
            isLoadingTimeline={isLoadingTimeline}
          />

          <Separator />

          {/* URL */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">URL</h3>
            <div className="flex space-x-2">
              <Input
                value={editedFields.url || ""}
                onChange={(e) => handleFieldChange("url", e.target.value)}
                placeholder="Enter URL"
                className="flex-1"
              />
              {editedFields.url && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(editedFields.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Date of Origination: {opportunity.date_of_origination || "—"}</span>
            </div>
            <p>Platform Add-On: {opportunity.platform_add_on || "—"}</p>
            <p>Created: {formatDate(opportunity.created_at)}</p>
            <p>Updated: {formatDate(opportunity.updated_at)}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}