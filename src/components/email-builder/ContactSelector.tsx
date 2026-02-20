import { useState } from "react";
import { useSearchContacts } from "@/hooks/useComposer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User, Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyStateWithAction } from "@/components/shared/EmptyStateWithAction";
import { QuickSelectPanel, type QuickSelectContact } from "@/components/email-builder/QuickSelectPanel";
import type { ContactEmailComposer } from "@/types/emailComposer";

interface ContactSelectorProps {
  selectedContact: ContactEmailComposer | null;
  onContactSelect: (contact: ContactEmailComposer | null) => void;
}

export function ContactSelector({ selectedContact, onContactSelect }: ContactSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectorMode, setSelectorMode] = useState<'search' | 'quick'>('quick');
  const { data: contacts = [], isLoading } = useSearchContacts(searchTerm);

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
  };
  
  // Handle quick select - need to fetch full contact data by searching for the contact
  const handleQuickSelect = (quickContact: QuickSelectContact) => {
    // Create a minimal ContactEmailComposer that will trigger full data load
    // The email builder uses the email field to fetch full data via useComposerRow
    const minimalContact = {
      contact_id: quickContact.contact_id,
      full_name: quickContact.full_name,
      email: quickContact.email || '',
      organization: quickContact.organization || null,
      // Provide defaults for required fields - full data will be loaded
      first_name: (quickContact.full_name || '').split(' ')[0] || '',
      focus_areas: [],
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
      most_recent_contact: null,
      latest_contact_email: null,
      latest_contact_meeting: null,
      outreach_date: null,
      email_cc: null,
      meeting_cc: null,
      delta_type: null,
    } as ContactEmailComposer;
    
    onContactSelect(minimalContact);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Select Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedContact ? (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedContact.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedContact.email}</p>
                {selectedContact.organization && (
                  <p className="text-sm text-muted-foreground">{selectedContact.organization}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onContactSelect(null)}
              >
                Change
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={selectorMode} onValueChange={(v) => setSelectorMode(v as 'search' | 'quick')}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="quick" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Quick Select
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Search
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="quick" className="mt-3">
              <QuickSelectPanel onContactSelect={handleQuickSelect} />
            </TabsContent>
            
            <TabsContent value="search" className="mt-3 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search contacts by name or email..."
                  value={searchTerm}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchTerm.length >= 2 && (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {isLoading ? (
                    <div className="text-center py-4 text-muted-foreground animate-fade-in">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Searching contacts...
                      </div>
                    </div>
                  ) : contacts.length === 0 ? (
                    <EmptyStateWithAction
                      icon={Mail}
                      title="No contacts found"
                      description="Try adjusting your search terms or check if the contact exists in the database."
                    />
                  ) : (
                    contacts.map((contact) => (
                      <div
                        key={contact.contact_id}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer transition-all duration-200",
                          "hover:bg-muted/50 hover:border-primary/50 hover:scale-[1.02]",
                          "animate-fade-in"
                        )}
                        onClick={() => onContactSelect(contact)}
                      >
                        <div className="font-medium">{contact.full_name}</div>
                        <div className="text-sm text-muted-foreground">{contact.email}</div>
                        {contact.organization && (
                          <div className="text-sm text-muted-foreground">{contact.organization}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {searchTerm.length < 2 && (
                <EmptyStateWithAction
                  icon={Search}
                  title="Search for a contact"
                  description="Start typing a name or email address to find contacts in your database."
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
