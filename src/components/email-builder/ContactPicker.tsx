import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search, User } from "lucide-react";
import { useContactSearch, ContactSearchResult } from "@/hooks/useContactSearch";
import { cn } from "@/lib/utils";

interface ContactPickerProps {
  selectedContact: ContactSearchResult | null;
  onContactSelect: (contact: ContactSearchResult | null) => void;
}

export function ContactPicker({ selectedContact, onContactSelect }: ContactPickerProps) {
  const [isSearching, setIsSearching] = useState(false);
  const { contacts, isLoading, handleSearch } = useContactSearch();

  const handleInputChange = (value: string) => {
    handleSearch(value);
    setIsSearching(value.length >= 2);
  };

  const handleContactSelect = (contact: ContactSearchResult) => {
    onContactSelect(contact);
    setIsSearching(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="contact-search">Select Contact</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="contact-search"
          placeholder="Search by name or email..."
          onChange={(e) => handleInputChange(e.target.value)}
          className="pl-9"
        />
        
        {isSearching && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto bg-background border rounded-md shadow-lg">
            {isLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Searching...</div>
            ) : contacts.length > 0 ? (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                  onClick={() => handleContactSelect(contact)}
                >
                  <div className="font-medium">{contact.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {contact.email_address}
                  </div>
                  {contact.organization && (
                    <div className="text-xs text-muted-foreground">
                      {contact.organization}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-muted-foreground">
                No contacts found
              </div>
            )}
          </div>
        )}
      </div>

      {selectedContact && (
        <Card className="mt-3">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{selectedContact.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedContact.email_address}
                </div>
                {selectedContact.organization && (
                  <div className="text-xs text-muted-foreground">
                    {selectedContact.organization}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}