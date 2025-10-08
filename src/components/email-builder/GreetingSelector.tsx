import { useState } from "react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search } from "lucide-react";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface GreetingSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
}

export function GreetingSelector({ phrases, currentSelection, onSelectionChange }: GreetingSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter to greeting phrases only
  const greetings = phrases.filter(p => p.category === 'greeting');

  // Filter by search term
  const filteredGreetings = greetings.filter(greeting => {
    if (!searchTerm) return true;
    return greeting.phrase_text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectionChange = (greetingId: string) => {
    if (greetingId === 'none') {
      onSelectionChange(null);
    } else {
      const greeting = greetings.find(g => g.id === greetingId);
      if (greeting) {
        onSelectionChange({
          greetingId: greeting.id,
        });
      }
    }
  };

  const selectedGreeting = currentSelection?.greetingId 
    ? greetings.find(g => g.id === currentSelection.greetingId)
    : null;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search greetings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Greeting List */}
      <div className="max-h-96 overflow-y-auto pr-2">
        {filteredGreetings.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "No greetings match your search" : "No greetings configured"}
            </p>
          </div>
        ) : (
          <RadioGroup
            value={currentSelection?.greetingId || 'none'}
            onValueChange={handleSelectionChange}
          >
            <div className="flex items-center space-x-2 mb-3 pb-3 border-b">
              <RadioGroupItem value="none" id="greeting-none" />
              <Label htmlFor="greeting-none" className="cursor-pointer text-sm font-medium">
                No greeting
              </Label>
            </div>

            {filteredGreetings.map((greeting) => (
              <div key={greeting.id} className="flex items-start space-x-2 mb-3 pb-3 border-b last:border-0">
                <RadioGroupItem value={greeting.id} id={`greeting-${greeting.id}`} className="mt-1" />
                <Label htmlFor={`greeting-${greeting.id}`} className="cursor-pointer flex-1">
                  <div className="space-y-1">
                    <p className="text-sm">{greeting.phrase_text}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={greeting.is_global ? "secondary" : "outline"} className="text-xs">
                        {greeting.is_global ? "Global" : "Custom"}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {greeting.tri_state}
                      </Badge>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      {/* Preview */}
      {selectedGreeting && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium">Preview in email:</p>
          <p className="text-sm text-muted-foreground mt-1">
            "{selectedGreeting.phrase_text}"
          </p>
        </div>
      )}
    </div>
  );
}
