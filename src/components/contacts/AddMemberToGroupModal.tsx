import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, User } from 'lucide-react';
import { useSearchContactsForGroup } from '@/hooks/useSearchContactsForGroup';
import { useAddContactToGroup } from '@/hooks/useAddContactToGroup';

interface AddMemberToGroupModalProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SelectedContact {
  id: string;
  role: 'to' | 'cc' | 'bcc';
}

export function AddMemberToGroupModal({
  groupId,
  groupName,
  open,
  onOpenChange,
  onSuccess,
}: AddMemberToGroupModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Map<string, SelectedContact>>(new Map());
  
  const { data: contacts = [], isLoading } = useSearchContactsForGroup(
    searchTerm,
    groupId,
    open
  );

  const addContactMutation = useAddContactToGroup();

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newMap = new Map(prev);
      if (newMap.has(contactId)) {
        newMap.delete(contactId);
      } else {
        newMap.set(contactId, { id: contactId, role: 'to' });
      }
      return newMap;
    });
  };

  const handleRoleChange = (contactId: string, role: 'to' | 'cc' | 'bcc') => {
    setSelectedContacts(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(contactId);
      if (existing) {
        newMap.set(contactId, { ...existing, role });
      }
      return newMap;
    });
  };

  const handleAddMembers = async () => {
    if (selectedContacts.size === 0) return;

    try {
      // Add each selected contact to the group
      for (const [contactId, { role }] of selectedContacts.entries()) {
        await addContactMutation.mutateAsync({
          contactId,
          groupId,
          emailRole: role,
        });
      }

      onSuccess?.();
      onOpenChange(false);
      setSearchTerm('');
      setSelectedContacts(new Map());
    } catch (error) {
      // Errors already handled by mutation
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchTerm('');
    setSelectedContacts(new Map());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Members to {groupName}</DialogTitle>
          <DialogDescription>
            Search and select contacts to add to this group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Count */}
          {selectedContacts.size > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Contact List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <User className="h-8 w-8 mb-2" />
                <p>
                  {searchTerm
                    ? 'No contacts found'
                    : 'Start typing to search for contacts'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {contacts.map((contact) => {
                  const isSelected = selectedContacts.has(contact.id);
                  const selectedData = selectedContacts.get(contact.id);

                  return (
                    <div
                      key={contact.id}
                      className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleContact(contact.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{contact.full_name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {contact.email_address}
                          </div>
                          {contact.title && (
                            <div className="text-sm text-muted-foreground">
                              {contact.title}
                            </div>
                          )}
                          {contact.organization && (
                            <div className="text-sm text-muted-foreground">
                              {contact.organization}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Select
                            value={selectedData?.role || 'to'}
                            onValueChange={(value) =>
                              handleRoleChange(contact.id, value as 'to' | 'cc' | 'bcc')
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="to">TO</SelectItem>
                              <SelectItem value="cc">CC</SelectItem>
                              <SelectItem value="bcc">BCC</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedContacts.size === 0 || addContactMutation.isPending}
          >
            {addContactMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedContacts.size > 0 ? selectedContacts.size : ''} Member${
                selectedContacts.size !== 1 ? 's' : ''
              }`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
