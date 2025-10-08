import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EditableRecipients } from './EditableRecipients';
import { SubjectPoolSelector } from './SubjectPoolSelector';
import type { ContactOverride } from '@/types/groupEmailBuilder';
import type { ModuleSelections } from '@/types/moduleSelections';
import type { TeamMember } from './EditableTeam';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';

interface ContactOverrideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactEmail: string;
  sharedSettings: {
    team: TeamMember[];
    to: string;
    cc: string[];
    subjectLinePool: { selectedIds: string[]; style: 'formal' | 'hybrid' | 'casual' };
  };
  allSubjects: SubjectLibraryItem[];
  currentOverride?: ContactOverride;
  onSave: (override: ContactOverride) => void;
}

export function ContactOverrideDrawer({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactEmail,
  sharedSettings,
  allSubjects,
  currentOverride,
  onSave,
}: ContactOverrideDrawerProps) {
  const [to, setTo] = useState<string>('');
  const [cc, setCc] = useState<string[]>([]);
  const [subjectPool, setSubjectPool] = useState<{ selectedIds: string[]; style: 'formal' | 'hybrid' | 'casual' }>({
    selectedIds: [],
    style: 'hybrid',
  });

  // Initialize with current override or shared settings
  useEffect(() => {
    if (open) {
      if (currentOverride) {
        setTo(currentOverride.recipients?.to || contactEmail);
        setCc(currentOverride.recipients?.cc || sharedSettings.cc);
        setSubjectPool(currentOverride.subjectLinePool || sharedSettings.subjectLinePool);
      } else {
        // Inherit from shared settings
        setTo(contactEmail);
        setCc(sharedSettings.cc);
        setSubjectPool(sharedSettings.subjectLinePool);
      }
    }
  }, [open, currentOverride, contactEmail, sharedSettings]);

  const handleSave = () => {
    const override: ContactOverride = {
      contactId,
      recipients: { to, cc },
      subjectLinePool: subjectPool,
    };
    onSave(override);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize for {contactName}</SheetTitle>
          <SheetDescription>
            Override shared settings for this specific contact
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="recipients" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="subject">Subject Line</TabsTrigger>
          </TabsList>

          <TabsContent value="recipients" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited from shared settings:</strong>
              </p>
              <p>TO: {sharedSettings.to}</p>
              <p>CC: {sharedSettings.cc.join(', ') || 'None'}</p>
            </div>
            
            <EditableRecipients
              to={to}
              cc={cc}
              onToChange={setTo}
              onCcChange={setCc}
              teamMembers={sharedSettings.team}
              defaultContactEmail={contactEmail}
            />
          </TabsContent>

          <TabsContent value="subject" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p className="mb-1">
                <strong>Inherited from shared settings:</strong>
              </p>
              <p>Style: {sharedSettings.subjectLinePool.style}</p>
              <p>Subjects: {sharedSettings.subjectLinePool.selectedIds.length} selected</p>
            </div>
            
            <SubjectPoolSelector
              allSubjects={allSubjects}
              currentSelection={{
                subjectIds: subjectPool.selectedIds,
                style: subjectPool.style,
              }}
              toneOverride={subjectPool.style}
              onSelectionChange={(selection) => setSubjectPool({
                selectedIds: selection.subjectIds || [],
                style: selection.style || 'hybrid',
              })}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Override
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
