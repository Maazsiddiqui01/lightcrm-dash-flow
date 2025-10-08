import { useState, useEffect } from "react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { useRealtimeLibrarySync } from "@/hooks/useRealtimeSync";
import { ContactSelector } from "@/components/email-builder/ContactSelector";
import { ContactInfoPanel } from "@/components/email-builder/ContactInfoPanel";
import { ModeSwitcher } from "@/components/email-builder/ModeSwitcher";
import { GroupFilterBar } from "@/components/email-builder/GroupFilterBar";
import { GroupResultsTable } from "@/components/email-builder/GroupResultsTable";
import { SelectionTray } from "@/components/email-builder/SelectionTray";
import { ContactOverrideDrawer } from "@/components/email-builder/ContactOverrideDrawer";
import { QueueDialog } from "@/components/email-builder/QueueDialog";
import { useBatchQueueManager } from "@/hooks/useBatchQueueManager";
import { buildBatchPayload } from "@/lib/batchPayloadBuilder";
import type { FilterValues, ContactOverride } from "@/types/groupEmailBuilder";
import { MasterTemplateSelector } from "@/components/email-builder/MasterTemplateSelector";
import { EmailBuilderCoreSettings } from "@/components/email-builder/EmailBuilderCoreSettings";
import { ModulesCard, type ModuleStates, MODULE_DEFAULTS, getModuleDefaultsFromMaster } from "@/components/email-builder/ModulesCard";
import { useMasterTemplates } from "@/hooks/useMasterTemplates";
import { ArticlePicker } from "@/components/email-builder/ArticlePicker";
import { EditableRecipients } from "@/components/email-builder/EditableRecipients";
import { EnhancedDraftSection } from "@/components/email-builder/EnhancedDraftSection";
import { PreviewModal } from "@/components/email-builder/PreviewModal";
import { PreviewPanel } from "@/components/email-builder/PreviewPanel";
import { LivePreviewPanel } from "@/components/email-builder/LivePreviewPanel";
import { GroupContactAlert } from "@/components/email-builder/GroupContactAlert";
import { IndividualContactAlert } from "@/components/email-builder/IndividualContactAlert";
import { mergeEffectiveConfig } from "@/lib/previewMerge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Save, RotateCcw } from "lucide-react";
import { useEmailBuilderData } from "@/hooks/useEmailBuilderData";
import { useContactGroupInfo } from "@/hooks/useContactGroupInfo";
import { useResolvedTemplateQuery } from "@/hooks/useResolvedTemplate";
import { useComposerRow } from "@/hooks/useComposer";
import { useContactSettings } from "@/hooks/useContactSettings";
import { useAutoPreview } from "@/hooks/useAutoPreview";
import { useEnhancedDraftGenerator } from "@/hooks/useEnhancedDraftGenerator";
import { useGlobalPhrases } from "@/hooks/usePhraseLibrary";
import { useGlobalInquiries } from "@/hooks/useInquiryLibrary";
import { useSubjectLibrary } from "@/hooks/useSubjectLibrary";
import { buildEnhancedDraftPayload } from "@/lib/enhancedPayload";
import { routeMaster } from "@/lib/router";
import type { EmailTemplate } from "@/hooks/useEmailTemplates";
import type { Article } from "@/types/emailComposer";
import type { TriState } from "@/types/phraseLibrary";
import type { ModuleSelection, ModuleSelections } from "@/types/moduleSelections";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "@/components/email-builder/EditableTeam";
import { supabase } from "@/integrations/supabase/client";

export function EmailBuilder() {
  // Enable real-time synchronization with Global Libraries
  useRealtimeLibrarySync();
  
  const { toast } = useToast();
  
  // Mode state
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  
  // Individual mode state
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [deltaType, setDeltaType] = useState<'Email' | 'Meeting'>('Email');
  
  // Group mode state
  const [groupFilters, setGroupFilters] = useState<FilterValues>({});
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactOverrides, setContactOverrides] = useState<Map<string, ContactOverride>>(new Map());
  const [overrideDrawerOpen, setOverrideDrawerOpen] = useState(false);
  const [activeOverrideContactId, setActiveOverrideContactId] = useState<string>('');
  const [groupContacts, setGroupContacts] = useState<any[]>([]);
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false);
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null); // Track focused contact for preview
  
  // Queue management for Group mode
  const queueManager = useBatchQueueManager();
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Core Settings state
  const [daysSinceContact, setDaysSinceContact] = useState<number>(0);
  const [toneOverride, setToneOverride] = useState<'casual' | 'hybrid' | 'formal' | null>(null);
  const [lengthOverride, setLengthOverride] = useState<'brief' | 'medium' | 'detailed' | null>(null);
  const [subjectPoolOverride, setSubjectPoolOverride] = useState<string[]>([]);
  
  // Module states for email builder
  const [moduleStates, setModuleStates] = useState<ModuleStates>({
    initial_greeting: 'always',
    self_personalization: 'always',
    top_opportunities: 'always',
    article_recommendations: 'always',
    platforms: 'never',
    addons: 'never',
    suggested_talking_points: 'sometimes',
    general_org_update: 'never',
    attachments: 'never',
    meeting_request: 'always',
    ai_backup_personalization: 'always',
  });
  
  // Module order state
  const [moduleOrder, setModuleOrder] = useState<Array<keyof ModuleStates>>([
    'initial_greeting',
    'self_personalization',
    'top_opportunities',
    'article_recommendations',
    'platforms',
    'addons',
    'suggested_talking_points',
    'general_org_update',
    'attachments',
    'meeting_request',
    'ai_backup_personalization',
  ]);
  
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null); // Deprecated - keep for backward compat
  
  // Module selections state
  const [moduleSelections, setModuleSelections] = useState<ModuleSelections>({});
  
  // Curated team and recipients state
  const [curatedTeam, setCuratedTeam] = useState<TeamMember[]>([]);
  const [curatedTo, setCuratedTo] = useState<string>("");
  const [curatedCc, setCuratedCc] = useState<string[]>([]);
  const [autoTeam, setAutoTeam] = useState<TeamMember[]>([]);
  
  // Get contact data from new composer view
  const { data: contactData } = useComposerRow(selectedContact?.email || null);
  
  // Get group contact info from contacts_raw
  const { data: groupInfo } = useContactGroupInfo(selectedContact?.contact_id || null);
  
  // Load library data
  const { data: allPhrases = [] } = useGlobalPhrases();
  const { data: allInquiries = [] } = useGlobalInquiries();
  const { data: allSubjects = [] } = useSubjectLibrary();
  
  // Enhanced draft generator
  const {
    generateDraft,
    isGenerating,
    progress,
    streamedContent,
  } = useEnhancedDraftGenerator();
  
  const [draftResult, setDraftResult] = useState<any | null>(null);
  
  // Auto-set days since contact when contact changes
  useEffect(() => {
    if (contactData?.most_recent_contact) {
      const days = Math.floor(
        (Date.now() - new Date(contactData.most_recent_contact).getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysSinceContact(days);
    }
  }, [contactData?.most_recent_contact]);
  
  // Auto-set module defaults when master template changes
  const masterTemplate = contactData ? routeMaster(contactData.most_recent_contact) : null;
  
  // Load and save contact-specific settings
  const {
    settings: contactSettings,
    isLoading: isLoadingSettings,
    saveSettings,
    isSaving,
    resetSettings,
    isResetting,
  } = useContactSettings(selectedContact?.contact_id || null);
  const [initializedContactId, setInitializedContactId] = useState<string | null>(null);

  // Initialize team and recipients when contact changes
  useEffect(() => {
    const initializeTeamAndRecipients = async () => {
      if (!contactData || !selectedContact) return;
      
      // If we have saved curated recipients, use those
      if (contactSettings?.curated_recipients) {
        setCuratedTeam(contactSettings.curated_recipients.team || []);
        setCuratedTo(contactSettings.curated_recipients.to || selectedContact.email || '');
        setCuratedCc(contactSettings.curated_recipients.cc || []);
        return;
      }
      
      // Otherwise, auto-populate from contact's focus areas
      setCuratedTo(selectedContact.email || '');
      
      // Fetch team members from focus area directory
      const focusAreas = contactData.focus_areas || [];
      const teamMembers: TeamMember[] = [];
      const ccEmails: string[] = [];
      
      for (const focusArea of focusAreas) {
        const { data: teamData } = await supabase
          .from('lg_focus_area_directory')
          .select('lead1_name, lead1_email, lead2_name, lead2_email, assistant_name, assistant_email')
          .eq('focus_area', focusArea)
          .maybeSingle();
        
        if (teamData) {
          // Add lead 1
          if (teamData.lead1_name && teamData.lead1_email) {
            const id = `lead1_${focusArea}`;
            if (!teamMembers.some(m => m.id === id)) {
              teamMembers.push({
                id,
                name: teamData.lead1_name,
                email: teamData.lead1_email,
                role: 'Lead'
              });
              if (!ccEmails.includes(teamData.lead1_email)) {
                ccEmails.push(teamData.lead1_email);
              }
            }
          }
          
          // Add lead 2
          if (teamData.lead2_name && teamData.lead2_email) {
            const id = `lead2_${focusArea}`;
            if (!teamMembers.some(m => m.id === id)) {
              teamMembers.push({
                id,
                name: teamData.lead2_name,
                email: teamData.lead2_email,
                role: 'Lead'
              });
              if (!ccEmails.includes(teamData.lead2_email)) {
                ccEmails.push(teamData.lead2_email);
              }
            }
          }
          
          // Add assistant
          if (teamData.assistant_name && teamData.assistant_email) {
            const id = `assistant_${focusArea}`;
            if (!teamMembers.some(m => m.id === id)) {
              teamMembers.push({
                id,
                name: teamData.assistant_name,
                email: teamData.assistant_email,
                role: 'Assistant'
              });
              if (!ccEmails.includes(teamData.assistant_email)) {
                ccEmails.push(teamData.assistant_email);
              }
            }
          }
        }
      }
      
      setAutoTeam(teamMembers);
      setCuratedTeam(teamMembers);
      setCuratedCc(ccEmails);
    };
    
    initializeTeamAndRecipients();
  }, [contactData, selectedContact, contactSettings]);

  // Load master templates from database
  const { data: masterTemplates } = useMasterTemplates();
  
  // Auto-load saved settings once per contact to avoid snapping back after drag
  useEffect(() => {
    const currentId = selectedContact?.contact_id || null;
    if (!currentId) return;

    if (initializedContactId !== currentId) {
      if (contactSettings) {
        setModuleStates(contactSettings.module_states as ModuleStates);
        setDeltaType(contactSettings.delta_type);
        if (
          contactSettings.module_order &&
          Array.isArray(contactSettings.module_order) &&
          contactSettings.module_order.length > 0
        ) {
          setModuleOrder(contactSettings.module_order as Array<keyof ModuleStates>);
        }
        if (contactSettings.module_selections) {
          setModuleSelections(contactSettings.module_selections as ModuleSelections);
        } else {
          setModuleSelections({});
        }
        if (contactSettings.selected_article_id) {
          // reserved for future
        }
        if (contactSettings.curated_recipients) {
          setCuratedTeam(contactSettings.curated_recipients.team || []);
          setCuratedTo(contactSettings.curated_recipients.to || selectedContact?.email || '');
          setCuratedCc(contactSettings.curated_recipients.cc || []);
        }
        setInitializedContactId(currentId);
      } else if (masterTemplate && masterTemplates) {
        const defaults = getModuleDefaultsFromMaster(masterTemplate.master_key, masterTemplates);
        if (defaults) {
          setModuleStates(defaults);
        } else {
          const fallback = MODULE_DEFAULTS[masterTemplate.master_key];
          if (fallback) {
            setModuleStates(fallback);
          }
        }
        // Do NOT force-reset order here; keep current local order
        setInitializedContactId(currentId);
      }
    }
  }, [selectedContact?.contact_id, contactSettings, masterTemplate, masterTemplates]);

  // Auto-preview hook
  const { previewData, isGenerating: isAutoGenerating } = useAutoPreview(
    contactData,
    deltaType,
    moduleStates,
    selectedArticle,
    masterTemplate
  );
  
  const handleModuleChange = (module: keyof ModuleStates, value: TriState) => {
    setModuleStates(prev => ({ ...prev, [module]: value }));
  };
  
  const handleResetToDefaults = () => {
    if (masterTemplate && masterTemplates) {
      // Load defaults from database-driven master template
      const defaults = getModuleDefaultsFromMaster(masterTemplate.master_key, masterTemplates);
      if (defaults) {
        setModuleStates(defaults);
      } else {
        // Fallback to hardcoded defaults
        const fallback = MODULE_DEFAULTS[masterTemplate.master_key];
        if (fallback) {
          setModuleStates(fallback);
        }
      }
    }
  };

  const handleModuleSelectionChange = (module: keyof ModuleStates | 'subject_line_pool', selection: ModuleSelection | null) => {
    setModuleSelections(prev => ({
      ...prev,
      [module]: selection,
    }));
  };

  // Auto-save module order on change in Individual mode (debounced)
  useEffect(() => {
    if (mode !== 'individual' || !selectedContact?.contact_id) return;
    const t = setTimeout(() => {
      saveSettings({
        contactId: selectedContact.contact_id,
        moduleStates,
        deltaType,
        selectedArticleId: selectedArticle?.article_link,
        moduleOrder,
        moduleSelections,
        curatedTeam,
        curatedTo,
        curatedCc,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [moduleOrder]);

  const handleSaveSettings = () => {
    if (!selectedContact?.contact_id) return;
    
    saveSettings({
      contactId: selectedContact.contact_id,
      moduleStates,
      deltaType,
      selectedArticleId: selectedArticle?.article_link,
      moduleOrder,
      moduleSelections,
      curatedTeam,
      curatedTo,
      curatedCc,
    });
  };

  const handleResetSettings = () => {
    if (!selectedContact?.contact_id) return;
    
    resetSettings(selectedContact.contact_id);
    // Reset to template defaults
    handleResetToDefaults();
  };

  // Enhanced draft generation handler
  const handleGenerateDraft = async () => {
    if (!contactData || !masterTemplate) {
      toast({
        title: 'Missing Data',
        description: 'Please select a contact first',
        variant: 'destructive',
      });
      return;
    }

    // Get full master template from database
    const fullMasterTemplate = masterTemplates?.find(
      t => t.master_key === masterTemplate.master_key
    );
    
    if (!fullMasterTemplate) {
      toast({
        title: 'Template Not Found',
        description: 'Master template not found in database',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Build enhanced payload with curated recipients
      const payload = await buildEnhancedDraftPayload(
        contactData,
        fullMasterTemplate,
        allPhrases,
        allInquiries,
        allSubjects,
        daysSinceContact,
        selectedArticle?.article_link,
        toneOverride || undefined,
        subjectPoolOverride,
        moduleOrder,
        curatedTeam.length > 0 ? curatedTeam : undefined,
        curatedTo,
        curatedCc.length > 0 ? curatedCc : undefined,
        autoTeam.length > 0 ? autoTeam : undefined
      );

      // Generate draft
      const result = await generateDraft(payload);
      
      if (result) {
        setDraftResult(result);
      }
    } catch (error) {
      console.error('Failed to generate draft:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Copy to clipboard handler
  const handleCopyToClipboard = () => {
    if (!draftResult) return;

    const fullEmail = `Subject: ${draftResult.subject}

${draftResult.greeting},

${draftResult.body}

${draftResult.signature}`;

    navigator.clipboard.writeText(fullEmail);
    toast({
      title: 'Copied!',
      description: 'Email draft copied to clipboard',
    });
  };
  
  // Fetch group contacts when filters change (NO LIMIT)
  useEffect(() => {
    if (mode === 'group') {
      const fetchGroupContacts = async () => {
        setLoadingGroupContacts(true);
        let query = supabase.from('contacts_raw').select('*');
        
        // Apply filters (simplified for MVP)
        if (groupFilters.sectors && groupFilters.sectors.length > 0) {
          query = query.in('lg_sector', groupFilters.sectors);
        }
        if (groupFilters.lgLead && groupFilters.lgLead.length > 0) {
          query = query.in('lg_lead', groupFilters.lgLead);
        }
        
        // NO LIMIT - fetch all matching contacts
        const { data, error } = await query;
        if (!error && data) {
          setGroupContacts(data);
        }
        setLoadingGroupContacts(false);
      };
      
      fetchGroupContacts();
    }
  }, [mode, groupFilters]);
  
  // Handle batch generate
  const handleBatchGenerate = async () => {
    if (selectedContactIds.size === 0) return;
    
    try {
      // Build batch payload
      const contactsToProcess = groupContacts.filter(c => selectedContactIds.has(c.id));
      
      queueManager.addToQueue(contactsToProcess.map(c => ({
        id: c.id,
        name: c.full_name || c.email_address || 'Unknown'
      })));
      
      setQueueDialogOpen(true);
      queueManager.setIsProcessing(true);
      
      // Process each contact (simplified MVP - using fan-out approach)
      for (const contact of contactsToProcess) {
        const override = contactOverrides.get(contact.id);
        queueManager.updateQueueItem(contact.id, { status: 'running', progress: 10 });
        
        try {
          // Build individual payload (reuse existing enhanced payload builder)
          const contactForPayload = {
            contact_id: contact.id,
            email: contact.email_address || '',
            full_name: contact.full_name || '',
            first_name: contact.first_name || '',
            organization: contact.organization || '',
            lg_emails_cc: null,
            focus_areas: contact.lg_focus_areas_comprehensive_list
              ? contact.lg_focus_areas_comprehensive_list.split(',').map((fa: string) => fa.trim()).filter(Boolean)
              : [],
            fa_count: 0,
            fa_sectors: [],
            fa_descriptions: [],
            gb_present: false,
            hs_present: false,
            ls_present: false,
            has_opps: false,
            opps: [],
            articles: [],
            lead_emails: [],
            assistant_names: [],
            assistant_emails: [],
            most_recent_contact: contact.most_recent_contact,
            outreach_date: contact.outreach_date,
          };
          
          const payload = await buildEnhancedDraftPayload(
            contactForPayload,
            masterTemplate || MODULE_DEFAULTS[0] as any,
            allPhrases || [],
            allInquiries || [],
            allSubjects || [],
            daysSinceContact,
            selectedArticle?.article_link || null,
            toneOverride,
            subjectPoolOverride,
            moduleOrder,
            override?.team || curatedTeam,
            override?.recipients?.to || contact.email_address || '',
            override?.recipients?.cc || curatedCc,
            autoTeam
          );
          
          // Call edge function
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(
            'https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/post_to_n8n',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                mode: 'individual',
                batchId: `b_${Date.now()}`,
                batchIndex: contactsToProcess.indexOf(contact),
                batchTotal: contactsToProcess.length,
                payload,
              }),
            }
          );
          
          if (!response.ok) throw new Error('Generation failed');
          
          queueManager.updateQueueItem(contact.id, { status: 'succeeded', progress: 100 });
        } catch (error: any) {
          queueManager.updateQueueItem(contact.id, {
            status: 'failed',
            progress: 0,
            error: error.message,
          });
        }
      }
      
      queueManager.setIsProcessing(false);
      toast({ title: 'Batch generation complete' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      queueManager.setIsProcessing(false);
    }
  };
  
  // Legacy support - remove when fully migrated
  const { contact, lag, opportunities, payload, isLoading } = useEmailBuilderData(selectedContact?.contact_id || null, null);

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Email Builder</h1>
              <p className="text-muted-foreground">Generate personalized email drafts with AI</p>
            </div>
          </div>
          
          {/* Mode Switcher */}
          <ModeSwitcher mode={mode} onModeChange={setMode} />
        </div>

        {/* Group Mode Layout */}
        {mode === 'group' && (
          <div className="space-y-6">
            <GroupFilterBar
              filters={groupFilters}
              onFiltersChange={setGroupFilters}
              onClearFilters={() => {
                setGroupFilters({});
                setSelectedContactIds(new Set());
              }}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <GroupResultsTable
                  contacts={groupContacts}
                  selectedContactIds={selectedContactIds}
                  onSelectionChange={setSelectedContactIds}
                  onCustomize={(contactId) => {
                    setActiveOverrideContactId(contactId);
                    setOverrideDrawerOpen(true);
                  }}
                  onFocusChange={setFocusedContactId}
                  focusedContactId={focusedContactId}
                  overrides={contactOverrides}
                  loading={loadingGroupContacts}
                />
              </div>
              
              <div className="lg:col-span-4">
                {/* Preview Panel for focused contact */}
                {focusedContactId && (() => {
                  const focusedContact = groupContacts.find(c => c.id === focusedContactId);
                  if (!focusedContact) return null;
                  
                  const effectiveConfig = mergeEffectiveConfig(
                    {
                      toneOverride,
                      lengthOverride,
                      daysSinceContact,
                      masterTemplate: masterTemplates?.find(t => t.master_key === masterTemplate?.master_key) || {} as any,
                      moduleSelections,
                      moduleOrder,
                      moduleStates: moduleStates as Record<string, any>,
                      subjectLinePool: {
                        selectedIds: subjectPoolOverride,
                        style: 'hybrid',
                      },
                      team: curatedTeam,
                      cc: curatedCc,
                    },
                    contactOverrides.get(focusedContactId),
                    focusedContact
                  );
                  
                  return (
                    <PreviewPanel
                      config={effectiveConfig}
                      contactName={focusedContact.full_name || focusedContact.email_address || 'Unknown'}
                      onEdit={() => {
                        setActiveOverrideContactId(focusedContactId);
                        setOverrideDrawerOpen(true);
                      }}
                    />
                  );
                })()}
                
                {!focusedContactId && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Click on a contact row to preview their effective settings
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            
            <SelectionTray
              selectedCount={selectedContactIds.size}
              totalCount={groupContacts.length}
              onSelectAll={() => setSelectedContactIds(new Set(groupContacts.map(c => c.id)))}
              onClear={() => setSelectedContactIds(new Set())}
              onGenerate={handleBatchGenerate}
              isGenerating={queueManager.isProcessing}
            />
          </div>
        )}

        {/* Individual Mode Layout (existing) */}
        {mode === 'individual' && (
          <>
        {/* Alert Section - Show Group Alert if in group, otherwise Individual Alert */}
        {groupInfo?.group_contact ? (
          <GroupContactAlert
            groupName={groupInfo.group_contact}
            contactFullName={contactData?.full_name || groupInfo.full_name}
            groupLastContactDate={groupInfo.most_recent_group_contact || null}
            deltaDays={groupInfo.delta || 30}
          />
        ) : (
          selectedContact && contactData?.most_recent_contact && (
            <IndividualContactAlert
              contactFullName={contactData.full_name}
              lastContactDate={contactData.most_recent_contact}
              deltaType={deltaType}
            />
          )
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Left Column - Contact Selection & Info */}
          <div className="flex flex-col gap-6">
            <ContactSelector
              selectedContact={selectedContact}
              onContactSelect={setSelectedContact}
            />
            {selectedContact && (
              <ContactInfoPanel 
                contactId={selectedContact.contact_id}
                team={curatedTeam}
                onTeamChange={setCuratedTeam}
                onQuickAddToCC={(member) => {
                  if (!curatedCc.includes(member.email)) {
                    setCuratedCc([...curatedCc, member.email]);
                  }
                }}
              />
            )}

            {/* Live Preview Section */}
            {selectedContact && (
              <LivePreviewPanel
                isGenerating={isAutoGenerating}
                subject={previewData?.subject}
                inquiry={previewData?.inquiry}
                assistantClause={previewData?.assistantClause}
                bodyPreview={previewData?.bodyPreview}
              />
            )}
          </div>

          {/* Right Column - Template, Preview & Generation */}
          <div className="flex flex-col gap-6">
            <MasterTemplateSelector
              selectedContactId={selectedContact?.contact_id || null}
              selectedContactEmail={selectedContact?.email || null}
              deltaType={deltaType}
              onDeltaTypeChange={setDeltaType}
            />
            
            <EmailBuilderCoreSettings
              daysSinceContact={daysSinceContact}
              onDaysSinceContactChange={setDaysSinceContact}
              toneOverride={toneOverride}
              onToneOverrideChange={setToneOverride}
              lengthOverride={lengthOverride}
              onLengthOverrideChange={setLengthOverride}
            />
            
            <ModulesCard
              masterTemplate={masterTemplate}
              moduleStates={moduleStates}
              moduleOrder={moduleOrder}
              onModuleChange={handleModuleChange}
              onModuleOrderChange={setModuleOrder}
              onResetToDefaults={handleResetToDefaults}
              moduleSelections={moduleSelections}
              onModuleSelectionChange={handleModuleSelectionChange}
              contactData={contactData}
              allPhrases={allPhrases}
              allInquiries={allInquiries}
              allSubjects={allSubjects}
              toneOverride={toneOverride}
            />
            
            <EditableRecipients
              to={curatedTo}
              cc={curatedCc}
              onToChange={setCuratedTo}
              onCcChange={setCuratedCc}
              teamMembers={curatedTeam}
              defaultContactEmail={selectedContact?.email || ''}
            />

            {/* Settings Controls */}
            {selectedContact && (
              <div className="flex items-center gap-2 flex-wrap">
                {contactSettings && (
                  <Badge variant="secondary" className="gap-1">
                    <Save className="h-3 w-3" />
                    Custom Settings
                  </Badge>
                )}
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving || !selectedContact}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
                {contactSettings && (
                  <Button
                    onClick={handleResetSettings}
                    disabled={isResetting}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </Button>
                )}
              </div>
            )}
            
            {/* Enhanced Draft Section - replaces old DraftGenerateButton */}
            {selectedContact && contactData && masterTemplate && (
              <EnhancedDraftSection
                isGenerating={isGenerating}
                progress={progress}
                streamedContent={streamedContent}
                result={draftResult}
                onGenerate={handleGenerateDraft}
                onCopyToClipboard={handleCopyToClipboard}
                disabled={!contactData}
              />
            )}
          </div>
        </div>
        </>
        )}
        
        {/* Dialogs */}
        <ContactOverrideDrawer
          open={overrideDrawerOpen}
          onOpenChange={setOverrideDrawerOpen}
          contactId={activeOverrideContactId}
          contactName={groupContacts.find(c => c.id === activeOverrideContactId)?.full_name || ''}
          contactEmail={groupContacts.find(c => c.id === activeOverrideContactId)?.email_address || ''}
          sharedSettings={{
            masterTemplate: masterTemplate,
            toneOverride: toneOverride || undefined,
            lengthOverride: (lengthOverride === 'medium' ? 'standard' : lengthOverride) || undefined,
            daysSinceContact,
            team: curatedTeam,
            to: curatedTo,
            cc: curatedCc,
            subjectLinePool: {
              selectedIds: subjectPoolOverride,
              style: (toneOverride || 'hybrid') as 'formal' | 'hybrid' | 'casual',
            },
            moduleSelections,
            moduleOrder,
            moduleStates,
          }}
          allMasterTemplates={masterTemplates || []}
          allSubjects={allSubjects || []}
          allPhrases={allPhrases || []}
          allInquiries={allInquiries || []}
          currentOverride={contactOverrides.get(activeOverrideContactId)}
          onSave={async (override) => {
            setContactOverrides(new Map(contactOverrides.set(override.contactId, override)));
            // Persist module order to DB so individual view reflects it
            if (override.moduleOrder && override.moduleOrder.length > 0) {
              // Load any existing row to preserve required fields
              const { data: existing } = await supabase
                .from('contact_email_builder_settings')
                .select('*')
                .eq('contact_id', override.contactId)
                .maybeSingle();

              const payload = {
                contact_id: override.contactId,
                module_order: override.moduleOrder,
                // Preserve or provide sane defaults for NOT NULL columns
                module_states: (existing?.module_states as any) || (moduleStates as any),
                delta_type: (existing?.delta_type as string) || (deltaType as string) || 'Email',
                selected_article_id: existing?.selected_article_id || null,
                module_selections: existing?.module_selections || (moduleSelections as any) || null,
                curated_recipients: existing?.curated_recipients || null,
              } as any;

              const { error: upsertErr } = await supabase
                .from('contact_email_builder_settings')
                .upsert([payload]);

              if (upsertErr) {
                console.error('Failed to save module order override', upsertErr);
              }
            }
          }}
        />
        
        <QueueDialog
          open={queueDialogOpen}
          onOpenChange={setQueueDialogOpen}
          queue={queueManager.queue}
          onRetry={queueManager.retryItem}
          onCancelPending={queueManager.cancelPending}
          isProcessing={queueManager.isProcessing}
        />
      </ResponsiveContainer>

      <PreviewModal 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={null}
        contactId={selectedContact?.contact_id || null}
        focusAreas={contactData?.focus_areas || []}
        hasOpps={contactData?.has_opps || false}
        lagDays={0}
      />
    </div>
  );
}