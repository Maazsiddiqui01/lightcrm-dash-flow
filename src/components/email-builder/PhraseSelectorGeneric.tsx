import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Search, ExternalLink, Plus, Star, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { InlinePhraseForm } from "./InlinePhraseForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TriStateToggle } from "./TriStateToggle";
import { useCreatePhrase, useUpdatePhrase, useDeletePhrase } from "@/hooks/usePhraseLibrary";
import { useContactPhrasePreferences } from "@/hooks/useContactPhrasePreferences";
import type { PhraseLibraryItem, PhraseCategory, TriState } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PhraseSelectorGenericProps {
  category: PhraseCategory;
  categoryLabel: string;
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  multiSelect?: boolean;
  contactData?: {
    id?: string;
    firstName?: string;
    organization?: string;
    focusAreas?: string[];
    opportunities?: Array<{ dealName: string; monthsSince?: number }>;
  };
  previewVariables?: Record<string, any>;
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
  allowInlineManagement?: boolean;
  moduleKey?: string;
  subjectStyle?: 'formal' | 'hybrid' | 'casual';
}

export function PhraseSelectorGeneric({
  category,
  categoryLabel,
  phrases,
  currentSelection,
  onSelectionChange,
  multiSelect = false, // Deprecated: Always single-select now
  contactData,
  previewVariables = {},
  contactName = "this contact",
  defaultPhraseId,
  onDefaultToggle,
  allowInlineManagement = true,
  moduleKey = '',
  subjectStyle = 'hybrid',
}: PhraseSelectorGenericProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [deletingPhraseId, setDeletingPhraseId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load contact-specific phrase preferences (unified for all categories including subject)
  const phrasePrefs = useContactPhrasePreferences(
    contactData?.id ? contactData.id : null,
    moduleKey
  );

  const { getTriState, savePreference, isSaving } = phrasePrefs;

  const createPhrase = useCreatePhrase();
  const updatePhrase = useUpdatePhrase();
  const deletePhrase = useDeletePhrase();

  // Filter phrases by category
  const categoryPhrases = phrases.filter(p => p.category === category);

  // Check if default phrase still exists
  useEffect(() => {
    if (defaultPhraseId && !categoryPhrases.find(p => p.id === defaultPhraseId)) {
      toast({
        title: "Default phrase removed",
        description: "Your default phrase was deleted. Please select a new one.",
        variant: "destructive",
      });
      if (onDefaultToggle) {
        onDefaultToggle(null);
      }
    }
  }, [categoryPhrases, defaultPhraseId, onDefaultToggle, toast]);

  // Filter by search term
  const filteredPhrases = categoryPhrases.filter(phrase => {
    if (!searchTerm) return true;
    return phrase.phrase_text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get current selection ID (single-select only)
  const selectedIds = useMemo(() => {
    return currentSelection?.phraseId || currentSelection?.greetingId || null;
  }, [currentSelection]);

  // Handle single-select change
  const handleSingleSelect = (phraseId: string) => {
    if (phraseId === 'none') {
      // For all single-select phrase modules, prevent complete deselection
      toast({
        title: "Selection Required",
        description: `${categoryLabel} must always have one option selected.`,
        variant: "destructive",
      });
      return;
    } else {
      const phrase = categoryPhrases.find(p => p.id === phraseId);
      if (phrase) {
        onSelectionChange({
          type: 'phrase',
          category,
          phraseId: phrase.id,
          phraseText: phrase.phrase_text,
          defaultPhraseId: currentSelection?.defaultPhraseId,
          isDefault: phrase.id === defaultPhraseId,
          variables: previewVariables,
        });
      }
    }
  };
  
  // Handle default toggle
  const handleDefaultToggle = (id: string) => {
    if (!onDefaultToggle) return;
    
    if (defaultPhraseId === id) {
      onDefaultToggle(null);
      toast({
        title: "Default removed",
        description: `Removed default for ${contactName}`,
      });
    } else {
      onDefaultToggle(id);
      // Automatically set tri-state to 'always' for default phrases
      if (contactData?.id && moduleKey) {
        savePreference({ phraseId: id, triState: 'always' });
      }
      toast({
        title: "Default set",
        description: `Set as default for ${contactName}`,
      });
    }
  };

  // Handle tri-state change for contact-specific preferences
  const handleTriStateChange = (id: string, newTriState: TriState) => {
    // Validation: Default phrase must be "always"
    if (id === defaultPhraseId && newTriState !== 'always') {
      toast({
        title: "Invalid Selection",
        description: `Default phrase must be set to 'Always'. Remove default first to change this.`,
        variant: "destructive",
      });
      return;
    }
    
    savePreference({ phraseId: id, triState: newTriState });
  };

  // Handle multi-select change
  const handleMultiToggle = (phraseId: string, checked: boolean) => {
    let newIds: string[];
    
    if (checked) {
      newIds = [...(currentSelection?.phraseIds || []), phraseId];
    } else {
      newIds = (currentSelection?.phraseIds || []).filter(id => id !== phraseId);
    }

    onSelectionChange(newIds.length > 0 ? {
      type: 'phrase',
      category,
      phraseIds: newIds,
      variables: previewVariables,
    } : null);
  };

  // Handle create phrase (unified for all categories including subject)
  const handleCreatePhrase = async (phraseText: string, triState: TriState, style?: 'formal' | 'hybrid' | 'casual') => {
    try {
      const newPhrase = await createPhrase.mutateAsync({
        category,
        phrase_text: phraseText,
        tri_state: triState,
        is_global: true,
        sync_behavior: 'inherit',
        template_id: null,
        weight: null,
        style: style || null, // Include style for subject category
      });

      setIsAdding(false);
      
      // Auto-select the new phrase
      if (newPhrase) {
        onSelectionChange({
          type: 'phrase',
          category,
          phraseId: (newPhrase as any).id,
          phraseText: (newPhrase as any).phrase_text,
          variables: previewVariables,
        });
      }
    } catch (error) {
      console.error('Failed to create phrase:', error);
    }
  };

  // Handle update phrase (unified for all categories including subject)
  const handleUpdatePhrase = async (phraseId: string, phraseText: string, triState: TriState, style?: 'formal' | 'hybrid' | 'casual') => {
    try {
      await updatePhrase.mutateAsync({
        id: phraseId,
        updates: {
          phrase_text: phraseText,
          tri_state: triState,
          ...(style ? { style } : {}),
        } as any,
        applyToAll: false,
      });
      setEditingPhraseId(null);
    } catch (error) {
      console.error('Failed to update phrase:', error);
    }
  };

  // Handle delete phrase (unified for all categories including subject)
  const handleDeletePhrase = async (phraseId: string) => {
    const isCurrentSelection = selectedIds === phraseId || (Array.isArray(selectedIds) && selectedIds.includes(phraseId));
    const isDefault = defaultPhraseId === phraseId;

    try {
      await deletePhrase.mutateAsync(phraseId);
      
      // Clear selection if deleted phrase was selected
      if (isCurrentSelection) {
        onSelectionChange(null);
        toast({
          title: "Selection cleared",
          description: `Please select another phrase`,
          variant: "destructive",
        });
      }

      // Clear default if deleted phrase was default
      if (isDefault && onDefaultToggle) {
        onDefaultToggle(null);
      }

      setDeletingPhraseId(null);
    } catch (error) {
      console.error('Failed to delete phrase:', error);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['phrase-library'] });
    toast({
      title: "Refreshed",
      description: `Phrase library updated`,
    });
  };

  // Get selected phrase for preview (single-select only)
  const selectedPhrases = useMemo(() => {
    return categoryPhrases.filter(p => p.id === selectedIds);
  }, [categoryPhrases, selectedIds]);

  // Extract variables from phrase text
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? matches.map(m => m.slice(1, -1)) : [];
  };

  // Interpolate variables in preview
  const interpolatePreview = (text: string): string => {
    let preview = text;
    const allVars = { ...previewVariables, ...contactData };
    
    for (const [key, value] of Object.entries(allVars)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      preview = preview.replace(regex, String(value));
    }
    
    return preview;
  };

  // Get phrase being edited
  const editingPhrase = editingPhraseId ? categoryPhrases.find(p => p.id === editingPhraseId) : null;
  const deletingPhrase = deletingPhraseId ? categoryPhrases.find(p => p.id === deletingPhraseId) : null;
  const isDeletingSelected = deletingPhraseId === selectedIds || (Array.isArray(selectedIds) && selectedIds.includes(deletingPhraseId || ''));
  const isDeletingDefault = deletingPhraseId === defaultPhraseId;

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Phrase List */}
      <div className="space-y-4">
        {/* Action Toolbar */}
        {allowInlineManagement && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAdding(true)}
                size="sm"
                variant="outline"
                disabled={isAdding}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New
              </Button>
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="ghost"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs">
              {categoryPhrases.length} {categoryPhrases.length === 1 ? 'phrase' : 'phrases'}
            </Badge>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${categoryLabel.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Inline Add Form */}
        {isAdding && allowInlineManagement && (
          <InlinePhraseForm
            category={category}
            mode="create"
            initialStyle={category === 'subject' ? (subjectStyle || 'hybrid') : undefined}
            onSave={handleCreatePhrase}
            onCancel={() => setIsAdding(false)}
            isLoading={createPhrase.isPending}
          />
        )}

        {/* Single-select mode only - no count needed */}

        {/* Phrases List */}
        <div className="max-h-96 overflow-y-auto pr-2">
          {filteredPhrases.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? `No phrases match your search` : `No ${categoryLabel.toLowerCase()} configured`}
              </p>
              {!allowInlineManagement && (
                <Link to={`/global-libraries?category=${category}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Add phrases in Global Library
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            // Single-select radio (multi-select removed)
            <RadioGroup
              value={String(selectedIds || 'none')}
              onValueChange={handleSingleSelect}
            >
              {filteredPhrases.map((phrase) => (
                <div key={phrase.id} className="mb-3 pb-3 border-b last:border-0">
                  {editingPhraseId === phrase.id ? (
                    <InlinePhraseForm
                      category={category}
                      mode="edit"
                      initialText={phrase.phrase_text}
                      initialTriState={phrase.tri_state}
                      initialStyle={(phrase as any).style || (category === 'subject' ? 'hybrid' : undefined)}
                      onSave={(text, triState, style) => handleUpdatePhrase(phrase.id, text, triState, style)}
                      onCancel={() => setEditingPhraseId(null)}
                      isLoading={updatePhrase.isPending}
                    />
                  ) : (
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value={phrase.id} id={`phrase-${phrase.id}`} className="mt-1" />
                      {onDefaultToggle && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 mt-0.5"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDefaultToggle(phrase.id);
                                }}
                              >
                                <Star 
                                  className={cn(
                                    "h-4 w-4 transition-colors",
                                    phrase.id === defaultPhraseId && "fill-yellow-400 text-yellow-400"
                                  )}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{phrase.id === defaultPhraseId ? `Default for ${contactName}` : `Set as default for ${contactName}`}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Label htmlFor={`phrase-${phrase.id}`} className="cursor-pointer flex-1">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm">{phrase.phrase_text}</p>
                            {phrase.id === defaultPhraseId && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 mt-2">
                            {/* Row 1: Scope Badge (Global or Contact) */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant={phrase.id === defaultPhraseId ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {phrase.id === defaultPhraseId ? "Contact" : "Global"}
                              </Badge>
                              {extractVariables(phrase.phrase_text).map(variable => (
                                <Badge key={variable} variant="outline" className="text-xs font-mono">
                                  {`{${variable}}`}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Row 2: Tri-State Toggle */}
                            {contactData?.id && moduleKey && (
                              <TriStateToggle
                                value={getTriState(phrase.id) || phrase.tri_state}
                                onChange={(newTriState) => handleTriStateChange(phrase.id, newTriState)}
                                disabled={phrase.id === defaultPhraseId || isSaving}
                              />
                            )}
                          </div>
                        </div>
                      </Label>
                      {allowInlineManagement && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingPhraseId(phrase.id);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeletingPhraseId(phrase.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
      </div>

      {/* Right: Preview */}
      <div className="space-y-4">
        <div className="text-sm font-medium">Preview</div>
        
        {selectedPhrases.length > 0 ? (
          <div className="space-y-3">
            {selectedPhrases.map((phrase, index) => {
              const variables = extractVariables(phrase.phrase_text);
              const preview = interpolatePreview(phrase.phrase_text);
              
              return (
                <div key={phrase.id} className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                  {multiSelect && selectedPhrases.length > 1 && (
                    <div className="text-xs font-medium text-muted-foreground">
                      {index + 1}. {categoryLabel}
                    </div>
                  )}
                  
                  {variables.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Template:</div>
                      <p className="text-sm font-mono">{phrase.phrase_text}</p>
                      <div className="flex gap-1 flex-wrap">
                        {variables.map(variable => (
                          <Badge key={variable} variant="secondary" className="text-xs font-mono">
                            {`{${variable}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    {variables.length > 0 && (
                      <div className="text-xs text-muted-foreground">Example:</div>
                    )}
                    <p className="text-sm">{preview}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
            {multiSelect ? 'Select phrases to preview' : 'Select a phrase to preview'}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deletingPhraseId !== null}
        onOpenChange={(open) => !open && setDeletingPhraseId(null)}
        onConfirm={() => deletingPhraseId && handleDeletePhrase(deletingPhraseId)}
        title="Delete Phrase"
        description={
          isDeletingSelected || isDeletingDefault
            ? `This phrase ${isDeletingDefault ? 'is your default' : 'is currently selected'}. ${isDeletingSelected ? "You'll need to select another phrase after deletion." : ''} Are you sure you want to delete it?`
            : `Are you sure you want to delete "${deletingPhrase?.phrase_text}"? This will remove it from the global library.`
        }
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
