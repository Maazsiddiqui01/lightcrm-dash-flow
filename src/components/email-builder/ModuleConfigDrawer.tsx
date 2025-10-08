import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ModuleStates } from "@/components/email-builder/ModulesCard";
import type { ModuleSelection } from "@/types/moduleSelections";
import type { ContactEmailComposer } from "@/types/emailComposer";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { InquiryLibraryItem } from "@/hooks/useInquiryLibrary";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";
import { ArticleSelector } from "./ArticleSelector";
import { GreetingSelector } from "./GreetingSelector";
import { TalkingPointsSelector } from "./TalkingPointsSelector";
import { AddonsSelector } from "./AddonsSelector";
import { SubjectPoolSelector } from "./SubjectPoolSelector";

interface ModuleConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  moduleKey: keyof ModuleStates;
  moduleLabel: string;
  contactData: ContactEmailComposer | null;
  currentSelection: ModuleSelection | null;
  onSave: (selection: ModuleSelection | null) => void;
  allPhrases: PhraseLibraryItem[];
  allInquiries: InquiryLibraryItem[];
  allSubjects: SubjectLibraryItem[];
  toneOverride?: 'casual' | 'hybrid' | 'formal' | null;
  isSubjectPool?: boolean;
}

export function ModuleConfigDrawer({
  isOpen,
  onClose,
  moduleKey,
  moduleLabel,
  contactData,
  currentSelection,
  onSave,
  allPhrases,
  allSubjects,
  toneOverride,
  isSubjectPool = false,
}: ModuleConfigDrawerProps) {
  const isMobile = useIsMobile();
  const [tempSelection, setTempSelection] = useState<ModuleSelection | null>(currentSelection);

  // Update temp selection when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTempSelection(currentSelection);
    }
  }, [isOpen, currentSelection]);

  const handleSave = () => {
    onSave(tempSelection);
  };

  const handleCancel = () => {
    setTempSelection(currentSelection);
    onClose();
  };

  const renderContent = () => {
    if (isSubjectPool) {
      return (
        <SubjectPoolSelector
          allSubjects={allSubjects}
          currentSelection={tempSelection}
          toneOverride={toneOverride}
          onSelectionChange={setTempSelection}
        />
      );
    }

    switch (moduleKey) {
      case 'article_recommendations':
        return (
          <ArticleSelector
            contactData={contactData}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
          />
        );
      
      case 'initial_greeting':
        return (
          <GreetingSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
          />
        );
      
      case 'suggested_talking_points':
        return (
          <TalkingPointsSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
          />
        );
      
      case 'addons':
        return (
          <AddonsSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
          />
        );
      
      default:
        return (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No configuration options available for {moduleLabel}
            </p>
          </div>
        );
    }
  };

  const content = (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {renderContent()}
      </div>
      <div className="sticky bottom-0 bg-background border-t p-4 flex gap-2">
        <Button onClick={handleSave} className="flex-1">Save</Button>
        <Button variant="outline" onClick={handleCancel} className="flex-1">Cancel</Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>{moduleLabel}</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{moduleLabel}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
