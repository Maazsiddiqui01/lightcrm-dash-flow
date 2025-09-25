import { useState, useEffect } from "react";
import { ContactPicker } from "./ContactPicker";
import { VariablesModal } from "./VariablesModal";
import { ContactSummaryCard } from "./ContactSummaryCard";
import { CCPreviewCard } from "./CCPreviewCard";
import { OpportunitiesCard } from "./OpportunitiesCard";
import { DraftResultCard } from "./DraftResultCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Send, Zap } from "lucide-react";
import { ContactSearchResult } from "@/hooks/useContactSearch";
import { useContactEnriched, EnrichedContact } from "@/hooks/useContactEnriched";
import { useEmailTemplatesQuery } from "@/hooks/useEmailTemplates";
import { useDraftGenerator, DraftResult } from "@/hooks/useDraftGenerator";
import { useRouterLLM, RouterLLMInput, RouterLLMResult } from "@/hooks/useRouterLLM";

export function DraftSection() {
  const [selectedContact, setSelectedContact] = useState<ContactSearchResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [variables, setVariables] = useState({
    focusAreas: [],
    gb_present: false,
    fa_count: 1,
    has_opps: false,
    delta_type: 'Email',
    hs_present: false,
    ls_present: false,
    subjectMode: 'lg_first',
    maxOpps: 3,
    extraCC: '',
    customInstructions: '',
    customPosition: 'before_closing',
  });
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [routerResult, setRouterResult] = useState<RouterLLMResult | null>(null);

  const { data: enrichedContact } = useContactEnriched(selectedContact?.id || null);
  const { data: templates = [] } = useEmailTemplatesQuery();
  const draftMutation = useDraftGenerator();
  const routerMutation = useRouterLLM();

  // Auto-route template using RouterLLM
  const getAutoRoutedTemplate = async (contact: EnrichedContact | null) => {
    if (!contact || templates.length === 0) return null;
    
    try {
      const routerInput: RouterLLMInput = {
        gb_present: variables.gb_present,
        fa_count: Math.max(1, contact.focusAreas.length),
        has_opps: contact.has_opps,
        delta_type: contact.delta_type || 'Email',
        hs_present: variables.hs_present,
        ls_present: variables.ls_present,
        summary_sector_list: contact.focusMeta?.map(fm => fm.sector_id) || []
      };

      const result = await routerMutation.mutateAsync(routerInput);
      setRouterResult(result);
      
      // Find template matching the case_id or use first template
      return templates.find(t => t.fa_bucket === result.case_id) || templates[0];
    } catch (error) {
      console.error('RouterLLM failed, using fallback:', error);
      // Fallback to simple logic
      if (contact.has_opps && contact.focusAreas.length >= 3) {
        return templates.find(t => t.has_opps && t.fa_bucket && t.fa_bucket >= 3);
      }
      return templates.find(t => !t.is_preset) || templates[0];
    }
  };

  // Derive variables from contact data
  const getDerivedVariables = (contact: EnrichedContact | null) => {
    if (!contact) return variables;
    
    return {
      ...variables,
      focusAreas: contact.focusAreas || [],
      gb_present: contact.focusAreas.some(fa => fa.toLowerCase().includes('general')),
      fa_count: Math.max(1, contact.focusAreas.length),
      has_opps: contact.has_opps,
      delta_type: contact.delta_type || 'Email',
    };
  };

  const derivedVariables = getDerivedVariables(enrichedContact || null);

  const [autoRoutedTemplate, setAutoRoutedTemplate] = useState<any>(null);

  // Effect to handle contact changes and auto-routing
  useEffect(() => {
    if (enrichedContact && templates.length > 0) {
      getAutoRoutedTemplate(enrichedContact).then(template => {
        setAutoRoutedTemplate(template);
      });
    }
  }, [enrichedContact, templates, variables.gb_present, variables.hs_present, variables.ls_present]);

  const handleGenerateDraft = async () => {
    if (!selectedContact || !enrichedContact) return;

    const selectedTemplateData = templates.find(t => t.id === selectedTemplate) || autoRoutedTemplate;
    if (!selectedTemplateData) return;

    const payload = {
      contact: enrichedContact,
      template: selectedTemplateData,
      variables: derivedVariables,
    };

    try {
      const result = await draftMutation.mutateAsync(payload);
      setDraftResult(result);
    } catch (error) {
      console.error('Failed to generate draft:', error);
    }
  };

  const getSendStatus = () => {
    if (!draftResult) return { status: 'draft', label: 'Draft' };
    if (draftResult.skip_reason) return { status: 'blackout', label: 'Blackout' };
    if (draftResult.send) return { status: 'ready', label: 'Ready' };
    return { status: 'error', label: 'Error' };
  };

  const sendStatus = getSendStatus();

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Contact Picker */}
      <ContactPicker
        selectedContact={selectedContact}
        onContactSelect={setSelectedContact}
      />

      {selectedContact && enrichedContact && (
        <>
          {/* Derived Variables Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Derived Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>GB Present: {derivedVariables.gb_present ? '✓' : '✗'}</div>
                <div>FA Count: {derivedVariables.fa_count}</div>
                <div>Has Opps: {derivedVariables.has_opps ? '✓' : '✗'}</div>
                <div>Delta Type: {derivedVariables.delta_type}</div>
                <div>HS Present: {derivedVariables.hs_present ? '✓' : '✗'}</div>
                <div>LS Present: {derivedVariables.ls_present ? '✓' : '✗'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {routerMutation.isPending && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                  <Zap className="h-4 w-4 animate-pulse" />
                  Routing template with AI...
                </div>
              )}
              
              {autoRoutedTemplate && (
                <div className="p-3 bg-accent rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">Auto-routed Template:</div>
                    {routerResult && (
                      <Badge variant="secondary" className="text-xs">
                        Case {routerResult.case_id}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {autoRoutedTemplate.name} - {autoRoutedTemplate.has_opps ? 'Has opportunities' : 'Standard outreach'}
                  </div>
                  {routerResult && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {routerResult.reason}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Override Template:</label>
                <Select value={selectedTemplate} onValueChange={(value) => {
                  setSelectedTemplate(value);
                  setRouterResult(null); // Clear router result when manually overriding
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template override" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.is_preset && '(Preset)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Variables Modal Button */}
          <Button 
            variant="outline" 
            onClick={() => setShowVariablesModal(true)}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Adjust Variables
          </Button>

          {/* Right Column Cards */}
          <div className="grid grid-cols-1 gap-4">
            <ContactSummaryCard contact={enrichedContact} />
            <CCPreviewCard 
              contact={enrichedContact}
              extraCC={derivedVariables.extraCC}
            />
            <OpportunitiesCard opportunities={enrichedContact.opps} />
            <DraftResultCard result={draftResult} />
          </div>

          {/* Send Status and Generate Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Badge 
              variant={sendStatus.status === 'ready' ? 'default' : 
                     sendStatus.status === 'blackout' ? 'secondary' : 'destructive'}
            >
              {sendStatus.label}
            </Badge>
            <Button 
              onClick={handleGenerateDraft}
              disabled={draftMutation.isPending}
              className="ml-auto"
            >
              {draftMutation.isPending ? (
                "Generating..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Generate Draft
                </>
              )}
            </Button>
          </div>
        </>
      )}

      <VariablesModal
        open={showVariablesModal}
        onClose={() => setShowVariablesModal(false)}
        variables={variables}
        onVariablesChange={(newVars) => {
          setVariables(newVars);
          // Re-route template when variables change
          if (enrichedContact) {
            getAutoRoutedTemplate(enrichedContact).then(template => {
              setAutoRoutedTemplate(template);
            });
          }
        }}
        derivedVariables={derivedVariables}
      />
    </div>
  );
}