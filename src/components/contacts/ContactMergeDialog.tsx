import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Mail, Calendar, Loader2, User, Building, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import type { ContactWithOpportunities } from '@/types/contact';
import { useManualContactMerge } from '@/hooks/useManualContactMerge';

interface ContactMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactWithOpportunities[];
  onSuccess?: () => void;
}

export function ContactMergeDialog({ open, onOpenChange, contacts, onSuccess }: ContactMergeDialogProps) {
  const { mergeContacts, isMerging } = useManualContactMerge();
  
  // Auto-select contact with most recent contact date as primary
  const suggestedPrimaryId = useMemo(() => {
    if (contacts.length === 0) return '';
    
    // Find contact with most recent contact date
    const sorted = [...contacts].sort((a, b) => {
      const dateA = a.most_recent_contact ? new Date(a.most_recent_contact).getTime() : 0;
      const dateB = b.most_recent_contact ? new Date(b.most_recent_contact).getTime() : 0;
      return dateB - dateA;
    });
    
    return sorted[0]?.id || contacts[0].id;
  }, [contacts]);

  const [selectedPrimaryId, setSelectedPrimaryId] = useState(suggestedPrimaryId);

  // Update primary selection when contacts change
  useMemo(() => {
    setSelectedPrimaryId(suggestedPrimaryId);
  }, [suggestedPrimaryId]);

  const handleMerge = () => {
    mergeContacts(
      {
        contactIds: contacts.map(c => c.id),
        primaryId: selectedPrimaryId,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
      }
    );
  };

  // Get primary contact details
  const primaryContact = contacts.find(c => c.id === selectedPrimaryId);

  // Calculate merged field preview
  const mergedPreview = useMemo(() => {
    const fields = [
      { key: 'full_name', label: 'Name', icon: User },
      { key: 'email_address', label: 'Email', icon: Mail },
      { key: 'organization', label: 'Organization', icon: Building },
      { key: 'title', label: 'Title', icon: Briefcase },
      { key: 'lg_sector', label: 'Sector' },
      { key: 'lg_focus_areas_comprehensive_list', label: 'Focus Areas' },
      { key: 'areas_of_specialization', label: 'Specialization' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'most_recent_contact', label: 'Most Recent Contact', icon: Calendar },
    ];

    return fields.map(field => {
      const values = contacts.map(c => ({
        contactId: c.id,
        value: (c as any)[field.key],
        isPrimary: c.id === selectedPrimaryId,
      }));

      // Determine which value will be used (primary's value, or first non-null)
      const primaryValue = values.find(v => v.isPrimary)?.value;
      const mergedValue = primaryValue || values.find(v => v.value)?.value || null;

      return {
        ...field,
        values,
        mergedValue,
      };
    });
  }, [contacts, selectedPrimaryId]);

  // Count related data
  const totalEmails = contacts.reduce((sum, c) => sum + (c.of_emails || 0), 0);
  const totalMeetings = contacts.reduce((sum, c) => sum + (c.of_meetings || 0), 0);
  const totalOpportunities = contacts.reduce((sum, c) => sum + (c.no_of_opps_sourced || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Merge {contacts.length} Contacts</DialogTitle>
          <DialogDescription>
            Review the merge preview and select which contact should be the primary record.
            All data from other contacts will be preserved and transferred.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Primary Contact Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Select Primary Contact</Label>
              <p className="text-sm text-muted-foreground mb-3">
                The primary contact's data will be preferred. Other contact records will be merged into this one.
              </p>
              <RadioGroup value={selectedPrimaryId} onValueChange={setSelectedPrimaryId}>
                <div className="space-y-2">
                  {contacts.map((contact) => {
                    const isSuggested = contact.id === suggestedPrimaryId;
                    return (
                      <div
                        key={contact.id}
                        className={`flex items-start space-x-3 rounded-lg border p-3 ${
                          contact.id === selectedPrimaryId ? 'border-primary bg-accent' : ''
                        }`}
                      >
                        <RadioGroupItem value={contact.id} id={contact.id} className="mt-1" />
                        <Label htmlFor={contact.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{contact.full_name || 'Unnamed'}</span>
                            {isSuggested && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Suggested
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contact.email_address || 'No email'}
                            </div>
                            {contact.organization && (
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {contact.organization}
                              </div>
                            )}
                            {contact.most_recent_contact && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Last contact: {format(new Date(contact.most_recent_contact), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Field Merge Preview */}
            <div>
              <Label className="text-base font-semibold">Field Merge Preview</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Fields from the primary contact will be used. Empty fields will be filled from other contacts.
              </p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Field</TableHead>
                      <TableHead>Merged Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergedPreview.map((field) => {
                      const Icon = field.icon;
                      let displayValue = field.mergedValue;
                      
                      // Format dates
                      if (field.key === 'most_recent_contact' && displayValue) {
                        try {
                          displayValue = format(new Date(displayValue), 'MMM d, yyyy');
                        } catch (e) {
                          // Keep original if parsing fails
                        }
                      }
                      
                      return (
                        <TableRow key={field.key}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                              {field.label}
                            </div>
                          </TableCell>
                          <TableCell>
                            {displayValue ? (
                              <span className="text-sm">{displayValue}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Related Data Summary */}
            <div>
              <Label className="text-base font-semibold">Related Data to be Preserved</Label>
              <p className="text-sm text-muted-foreground mb-3">
                All interactions, opportunities, and notes will be transferred to the merged contact.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{totalEmails}</div>
                  <div className="text-sm text-muted-foreground">Emails</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{totalMeetings}</div>
                  <div className="text-sm text-muted-foreground">Meetings</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{totalOpportunities}</div>
                  <div className="text-sm text-muted-foreground">Opportunities</div>
                </div>
              </div>
            </div>

            {/* Email Addresses Notice */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">
                <strong>Note:</strong> All email addresses from the selected contacts will be preserved and linked to the merged contact.
                The primary contact's email will be set as the default.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={isMerging || contacts.length < 2}>
            {isMerging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                Confirm Merge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
