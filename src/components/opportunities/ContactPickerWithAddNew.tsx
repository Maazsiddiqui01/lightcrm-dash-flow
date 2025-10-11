import { useState } from "react";
import { Search, User, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useContactSearch, ContactSearchResult } from "@/hooks/useContactSearch";
import { cn } from "@/lib/utils";

interface ContactPickerWithAddNewProps {
  label: string;
  selectedContact: ContactSearchResult | null;
  onContactSelect: (contact: ContactSearchResult | null) => void;
  onAddNewContact: () => void;
}

export function ContactPickerWithAddNew({ 
  label, 
  selectedContact, 
  onContactSelect,
  onAddNewContact 
}: ContactPickerWithAddNewProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { contacts, isLoading, handleSearch } = useContactSearch();

  const handleInputChange = (value: string) => {
    setInputValue(value);
    handleSearch(value);
    setIsSearching(value.length >= 2);
  };

  const handleContactClick = (contact: ContactSearchResult) => {
    onContactSelect(contact);
    setIsSearching(false);
    setInputValue(contact.full_name);
  };

  const handleClear = () => {
    onContactSelect(null);
    setInputValue("");
    handleSearch("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (inputValue.length >= 2) {
              setIsSearching(true);
            }
          }}
          className="pl-9"
        />
        
        {/* Dropdown with contacts + "Add New" option */}
        {isSearching && (
          <div className="absolute z-[9999] w-full mt-1 bg-popover border-border border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {isLoading && (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Loading contacts...
              </div>
            )}
            
            {!isLoading && contacts.length === 0 && (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No contacts found
              </div>
            )}
            
            {!isLoading && contacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => handleContactClick(contact)}
                className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
              >
                <div className="font-medium">{contact.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {contact.email_address}
                  {contact.organization && ` • ${contact.organization}`}
                </div>
              </div>
            ))}
            
            {/* Add New Contact Button */}
            <div
              onClick={() => {
                onAddNewContact();
                setIsSearching(false);
              }}
              className="p-3 hover:bg-accent cursor-pointer border-t bg-primary/5 flex items-center gap-2 sticky bottom-0"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Add New Contact</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Contact Display */}
      {selectedContact && (
        <Card className="border-primary/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{selectedContact.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedContact.email_address}
                  {selectedContact.organization && ` • ${selectedContact.organization}`}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
