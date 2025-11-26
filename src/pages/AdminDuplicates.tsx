import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { PageErrorBoundary } from '@/components/shared/PageErrorBoundary';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useContactDuplicates, ContactDuplicate } from '@/hooks/useContactDuplicates';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

export function AdminDuplicates() {
  const { duplicates, isLoading, resolveDuplicate, isResolving } = useContactDuplicates();
  const [selectedDuplicate, setSelectedDuplicate] = useState<ContactDuplicate | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionType, setResolutionType] = useState<'resolved' | 'accepted'>('resolved');

  const handleResolve = () => {
    if (!selectedDuplicate) return;

    resolveDuplicate(
      {
        duplicateId: selectedDuplicate.id,
        status: resolutionType,
        note: resolutionNote,
      },
      {
        onSuccess: () => {
          setSelectedDuplicate(null);
          setResolutionNote('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <PageErrorBoundary pageName="Admin Duplicates">
        <ResponsiveContainer>
        <PageHeader
          title="Duplicate Contacts"
          description="Manage duplicate contacts across your organization"
        />
        <div className="p-6">Loading...</div>
      </ResponsiveContainer>
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary pageName="Admin Duplicates">
      <ResponsiveContainer>
      <PageHeader
        title="Duplicate Contacts"
        description="Manage duplicate contacts across your organization"
      />
      <div className="p-6 space-y-4">
        {duplicates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">No duplicates found</p>
              <p className="text-sm text-muted-foreground">
                All contacts have unique email addresses
              </p>
            </CardContent>
          </Card>
        ) : (
          duplicates.map((duplicate) => (
            <Card key={duplicate.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {duplicate.email_address}
                    </CardTitle>
                    <CardDescription>
                      Owned by {duplicate.user_count} users • Detected{' '}
                      {format(new Date(duplicate.first_detected_at), 'PPp')}
                    </CardDescription>
                  </div>
                  <Badge variant={duplicate.status === 'active' ? 'destructive' : 'secondary'}>
                    {duplicate.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Contact Instances:</h4>
                    <div className="space-y-2">
                      {duplicate.contacts.map((contact) => (
                        <div
                          key={contact.contact_id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{contact.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.organization}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Owner: {contact.user_name} ({contact.user_email})
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(contact.created_at), 'PP')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {duplicate.status === 'active' && (
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => {
                          setSelectedDuplicate(duplicate);
                          setResolutionType('resolved');
                        }}
                      >
                        Resolve Duplicate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedDuplicate(duplicate);
                          setResolutionType('accepted');
                        }}
                      >
                        Mark as Acceptable
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedDuplicate} onOpenChange={() => setSelectedDuplicate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolutionType === 'resolved' ? 'Resolve Duplicate' : 'Mark as Acceptable'}
            </DialogTitle>
            <DialogDescription>
              {resolutionType === 'resolved'
                ? 'Add a note about how this duplicate was resolved (e.g., merged contacts, reassigned ownership).'
                : 'Mark this duplicate as acceptable if both users legitimately need to maintain this contact.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add resolution notes..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDuplicate(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              {resolutionType === 'resolved' ? 'Resolve' : 'Mark Acceptable'}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </ResponsiveContainer>
    </PageErrorBoundary>
  );
}
