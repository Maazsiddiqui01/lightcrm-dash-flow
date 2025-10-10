import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Search, AlertCircle, Star } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import type { ModuleSelection } from "@/types/moduleSelections";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";
import { cn } from "@/lib/utils";

interface SubjectPoolSelectorProps {
  allSubjects: SubjectLibraryItem[];
  currentSelection: ModuleSelection | null;
  toneOverride?: 'casual' | 'hybrid' | 'formal' | null;
  onSelectionChange: (selection: ModuleSelection) => void;
  contactName?: string;
}

export function SubjectPoolSelector({
  allSubjects,
  currentSelection,
  toneOverride,
  onSelectionChange,
  contactName = "this contact",
}: SubjectPoolSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 250);
  const { toast } = useToast();
  
  const selectedIds = currentSelection?.subjectIds || [];
  const selectedStyle = currentSelection?.style || toneOverride || 'hybrid';
  const [primaryId, setPrimaryId] = useState<string | null>(
    currentSelection?.defaultSubjectId || selectedIds[0] || null
  );
  
  // Sync primary with currentSelection
  useEffect(() => {
    if (currentSelection?.defaultSubjectId) {
      setPrimaryId(currentSelection.defaultSubjectId);
    } else if (selectedIds.length > 0 && !primaryId) {
      // Auto-select first as primary if none set
      setPrimaryId(selectedIds[0]);
    }
  }, [currentSelection?.defaultSubjectId, selectedIds, primaryId]);
  
  // Check if primary subject still exists
  useEffect(() => {
    if (primaryId && !allSubjects.find(s => s.id === primaryId)) {
      toast({
        title: "Primary subject removed",
        description: "Your primary subject was deleted. Please select a new one.",
        variant: "destructive",
      });
      setPrimaryId(null);
    }
  }, [allSubjects, primaryId, toast]);
  
  // Filter subjects by search and style
  const filteredSubjects = useMemo(() => {
    let filtered = allSubjects;
    
    // Filter by style/tone
    if (toneOverride) {
      filtered = filtered.filter(s => s.style === toneOverride);
    }
    
    // Filter by search term
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s => 
        s.subject_template.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [allSubjects, debouncedSearch, toneOverride]);
  
  const handleToggle = (subjectId: string) => {
    let newIds: string[];
    let newPrimaryId = primaryId;
    
    if (selectedIds.includes(subjectId)) {
      // Removing - need to handle primary
      newIds = selectedIds.filter(id => id !== subjectId);
      
      if (subjectId === primaryId) {
        // If removing primary, auto-select another or clear
        newPrimaryId = newIds.length > 0 ? newIds[0] : null;
      }
    } else {
      // Adding
      newIds = [...selectedIds, subjectId];
      
      // If no primary set, make this the primary
      if (!newPrimaryId || !newIds.includes(newPrimaryId)) {
        newPrimaryId = subjectId;
      }
    }
    
    setPrimaryId(newPrimaryId);
    onSelectionChange({
      subjectIds: newIds,
      style: selectedStyle,
      defaultSubjectId: newPrimaryId || undefined,
    });
  };
  
  const handlePrimaryChange = (subjectId: string) => {
    setPrimaryId(subjectId);
    onSelectionChange({
      subjectIds: selectedIds,
      style: selectedStyle,
      defaultSubjectId: subjectId,
    });
    
    toast({
      title: "Primary subject set",
      description: `Set as primary for ${contactName}`,
    });
  };
  
  const selectedCount = selectedIds.length;
  const hasWarning = selectedCount === 0 || !primaryId;
  
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* Count & Warning */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {selectedCount} of {filteredSubjects.length} enabled
          {primaryId && ` (1 primary)`}
        </span>
        {toneOverride && (
          <Badge variant="secondary" className="text-xs">
            {toneOverride} tone
          </Badge>
        )}
      </div>
      
      {hasWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {selectedCount === 0 
              ? "Enable at least one subject line"
              : "Select a primary subject"}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Subject List with Radio + Checkbox */}
      <RadioGroup value={primaryId || ''} onValueChange={handlePrimaryChange}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No subjects found</p>
            </div>
          ) : (
            filteredSubjects.map((subject) => {
              const isPrimary = subject.id === primaryId;
              const isEnabled = selectedIds.includes(subject.id);
              
              return (
                <div
                  key={subject.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    isPrimary ? "bg-primary/5 border-primary/30" : "hover:bg-accent/50"
                  )}
                >
                  {/* Radio for primary */}
                  <RadioGroupItem
                    value={subject.id}
                    id={`primary-${subject.id}`}
                    disabled={!isEnabled}
                    className="mt-1"
                    aria-label={`Set ${subject.subject_template} as primary`}
                  />
                  
                  {/* Checkbox for enabled */}
                  <Checkbox
                    id={`subject-${subject.id}`}
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(subject.id)}
                    aria-label={`Toggle subject: ${subject.subject_template}`}
                    className="mt-1"
                  />
                  
                  <label
                    htmlFor={`subject-${subject.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{subject.subject_template}</span>
                        {isPrimary && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Primary
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {subject.style}
                        </Badge>
                      </div>
                      {/* Show variables if they exist */}
                      {(subject.subject_template.includes('[') && subject.subject_template.includes(']')) && (
                        <div className="flex gap-1 flex-wrap">
                          {subject.subject_template.match(/\[([^\]]+)\]/g)?.map((variable, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-mono">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              );
            })
          )}
        </div>
      </RadioGroup>
    </div>
  );
}
