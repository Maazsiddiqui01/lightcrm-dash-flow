import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Search } from "lucide-react";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface AddonsSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
}

export function AddonsSelector({ phrases, currentSelection, onSelectionChange }: AddonsSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter to add-ons only
  const addons = phrases.filter(p => p.category === 'addons');

  // Filter by search term
  const filteredAddons = addons.filter(addon => {
    if (!searchTerm) return true;
    return addon.phrase_text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedIds = currentSelection?.phraseIds || [];

  const handleToggle = (phraseId: string, checked: boolean) => {
    let newIds: string[];
    
    if (checked) {
      newIds = [...selectedIds, phraseId];
    } else {
      newIds = selectedIds.filter(id => id !== phraseId);
    }

    onSelectionChange(newIds.length > 0 ? { phraseIds: newIds } : null);
  };

  const selectedPhrases = addons.filter(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search add-ons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selection Count */}
      {selectedIds.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedIds.length} add-on{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Add-ons List */}
      <div className="max-h-96 overflow-y-auto pr-2">
        {filteredAddons.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "No add-ons match your search" : "No add-ons configured"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAddons.map((addon) => (
              <div key={addon.id} className="flex items-start space-x-2 pb-3 border-b last:border-0">
                <Checkbox
                  id={`addon-${addon.id}`}
                  checked={selectedIds.includes(addon.id)}
                  onCheckedChange={(checked) => handleToggle(addon.id, checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor={`addon-${addon.id}`} className="cursor-pointer flex-1">
                  <div className="space-y-1">
                    <p className="text-sm">{addon.phrase_text}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={addon.is_global ? "secondary" : "outline"} className="text-xs">
                        {addon.is_global ? "Global" : "Custom"}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {addon.tri_state}
                      </Badge>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {selectedPhrases.length > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium mb-2">Selected add-ons:</p>
          <ul className="space-y-1">
            {selectedPhrases.map((phrase, index) => (
              <li key={phrase.id} className="text-sm text-muted-foreground">
                {index + 1}. {phrase.phrase_text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
