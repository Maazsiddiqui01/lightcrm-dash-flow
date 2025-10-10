import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Search, ExternalLink, Plus, Star } from "lucide-react";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PhraseSelectorGenericProps {
  category: string;
  categoryLabel: string;
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  multiSelect?: boolean;
  contactData?: {
    firstName?: string;
    organization?: string;
    focusAreas?: string[];
    opportunities?: Array<{ dealName: string; monthsSince?: number }>;
  };
  previewVariables?: Record<string, any>;
  contactName?: string;  // For default tooltips
  defaultPhraseId?: string;  // Current default phrase ID
  onDefaultToggle?: (phraseId: string | null) => void;  // Callback to set default
}

export function PhraseSelectorGeneric({
  category,
  categoryLabel,
  phrases,
  currentSelection,
  onSelectionChange,
  multiSelect = false,
  contactData,
  previewVariables = {},
  contactName = "this contact",
  defaultPhraseId,
  onDefaultToggle,
}: PhraseSelectorGenericProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

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

  // Get current selection IDs
  const selectedIds = useMemo(() => {
    if (multiSelect) {
      return currentSelection?.phraseIds || [];
    } else {
      return currentSelection?.phraseId || currentSelection?.greetingId || null;
    }
  }, [currentSelection, multiSelect]);

  // Handle single-select change
  const handleSingleSelect = (phraseId: string) => {
    if (phraseId === 'none') {
      onSelectionChange(null);
    } else {
      const phrase = categoryPhrases.find(p => p.id === phraseId);
      if (phrase) {
        onSelectionChange({
          type: 'phrase',
          category,
          phraseId: phrase.id,
          phraseText: phrase.phrase_text,
          defaultPhraseId: currentSelection?.defaultPhraseId,  // Preserve default
          isDefault: phrase.id === defaultPhraseId,
          variables: previewVariables,
        });
      }
    }
  };
  
  // Handle default toggle
  const handleDefaultToggle = (phraseId: string) => {
    if (!onDefaultToggle) return;
    
    if (defaultPhraseId === phraseId) {
      // Unset default
      onDefaultToggle(null);
      toast({
        title: "Default removed",
        description: `Removed default for ${contactName}`,
      });
    } else {
      // Set new default
      onDefaultToggle(phraseId);
      toast({
        title: "Default set",
        description: `Set as default for ${contactName}`,
      });
    }
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

  // Get selected phrase(s) for preview
  const selectedPhrases = useMemo(() => {
    if (multiSelect) {
      return categoryPhrases.filter(p => (selectedIds as string[]).includes(p.id));
    } else {
      return categoryPhrases.filter(p => p.id === selectedIds);
    }
  }, [categoryPhrases, selectedIds, multiSelect]);

  // Extract variables from phrase text
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? matches.map(m => m.slice(1, -1)) : [];
  };

  // Interpolate variables in preview
  const interpolatePreview = (text: string): string => {
    let preview = text;
    
    // Replace with contact data or preview variables
    const allVars = { ...previewVariables, ...contactData };
    
    for (const [key, value] of Object.entries(allVars)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      preview = preview.replace(regex, String(value));
    }
    
    return preview;
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Phrase List */}
      <div className="space-y-4">
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

        {/* Selection Count */}
        {multiSelect && (selectedIds as string[]).length > 0 && (
          <div className="text-sm text-muted-foreground">
            {(selectedIds as string[]).length} phrase{(selectedIds as string[]).length !== 1 ? 's' : ''} selected
          </div>
        )}

        {/* Phrases List */}
        <div className="max-h-96 overflow-y-auto pr-2">
          {filteredPhrases.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? `No phrases match your search` : `No ${categoryLabel.toLowerCase()} configured`}
              </p>
              <Link to={`/global-libraries?category=${category}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Add phrases in Global Library
                </Button>
              </Link>
            </div>
          ) : multiSelect ? (
            // Multi-select checkboxes
            <div className="space-y-3">
              {filteredPhrases.map((phrase) => (
                <div key={phrase.id} className="flex items-start space-x-2 pb-3 border-b last:border-0">
                  <Checkbox
                    id={`phrase-${phrase.id}`}
                    checked={(selectedIds as string[]).includes(phrase.id)}
                    onCheckedChange={(checked) => handleMultiToggle(phrase.id, checked as boolean)}
                    className="mt-1"
                  />
                  <Label htmlFor={`phrase-${phrase.id}`} className="cursor-pointer flex-1">
                    <div className="space-y-1">
                      <p className="text-sm">{phrase.phrase_text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={phrase.is_global ? "secondary" : "outline"} className="text-xs">
                          {phrase.is_global ? "Global" : "Custom"}
                        </Badge>
                        {phrase.tri_state && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {phrase.tri_state}
                          </Badge>
                        )}
                        {extractVariables(phrase.phrase_text).map(variable => (
                          <Badge key={variable} variant="outline" className="text-xs font-mono">
                            {`{${variable}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            // Single-select radio
            <RadioGroup
              value={String(selectedIds || 'none')}
              onValueChange={handleSingleSelect}
            >
              <div className="flex items-center space-x-2 mb-3 pb-3 border-b">
                <RadioGroupItem value="none" id={`${category}-none`} />
                <Label htmlFor={`${category}-none`} className="cursor-pointer text-sm font-medium">
                  No {categoryLabel.toLowerCase()}
                </Label>
              </div>

              {filteredPhrases.map((phrase) => (
                <div key={phrase.id} className="flex items-start space-x-2 mb-3 pb-3 border-b last:border-0">
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
                            aria-label={`Set as default for ${contactName}`}
                            aria-pressed={phrase.id === defaultPhraseId}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={phrase.is_global ? "secondary" : "outline"} className="text-xs">
                          {phrase.is_global ? "Global" : "Custom"}
                        </Badge>
                        {phrase.tri_state && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {phrase.tri_state}
                          </Badge>
                        )}
                        {extractVariables(phrase.phrase_text).map(variable => (
                          <Badge key={variable} variant="outline" className="text-xs font-mono">
                            {`{${variable}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Label>
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
                  
                  {/* Original with variables */}
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
                  
                  {/* Interpolated preview */}
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
    </div>
  );
}
