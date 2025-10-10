import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import type { ModuleSelection } from "@/types/moduleSelections";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";

interface SubjectPoolSelectorProps {
  allSubjects: SubjectLibraryItem[];
  currentSelection: ModuleSelection | null;
  toneOverride?: 'casual' | 'hybrid' | 'formal' | null;
  onSelectionChange: (selection: ModuleSelection) => void;
}

export function SubjectPoolSelector({
  allSubjects,
  currentSelection,
  toneOverride,
  onSelectionChange,
}: SubjectPoolSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 250);
  
  const selectedIds = currentSelection?.subjectIds || [];
  const selectedStyle = currentSelection?.style || toneOverride || 'hybrid';
  
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
    const newIds = selectedIds.includes(subjectId)
      ? selectedIds.filter(id => id !== subjectId)
      : [...selectedIds, subjectId];
    
    onSelectionChange({
      subjectIds: newIds,
      style: selectedStyle,
    });
  };
  
  const selectedCount = selectedIds.length;
  const hasWarning = selectedCount === 0;
  
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
            Enable at least one subject line
          </AlertDescription>
        </Alert>
      )}
      
      {/* Subject List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No subjects found</p>
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                id={`subject-${subject.id}`}
                checked={selectedIds.includes(subject.id)}
                onCheckedChange={() => handleToggle(subject.id)}
                aria-label={`Toggle subject: ${subject.subject_template}`}
              />
              <label
                htmlFor={`subject-${subject.id}`}
                className="flex-1 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{subject.subject_template}</span>
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
          ))
        )}
      </div>
    </div>
  );
}
