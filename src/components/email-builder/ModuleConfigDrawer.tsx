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
import { ArticleRecommendationSelector } from "./ArticleRecommendationSelector";
import { GreetingSelector } from "./GreetingSelector";
import { TalkingPointsSelector } from "./TalkingPointsSelector";
import { AddonsSelector } from "./AddonsSelector";
import { SubjectPoolSelector } from "./SubjectPoolSelector";
import { SubjectLineSelector } from "./SubjectLineSelector";
import { TopOpportunitiesSelector } from "./TopOpportunitiesSelector";
import { SelfPersonalizationSelector } from "./SelfPersonalizationSelector";
import { PlatformsSelector } from "./PlatformsSelector";
import { GeneralOrgUpdateSelector } from "./GeneralOrgUpdateSelector";
import { AttachmentsSelector } from "./AttachmentsSelector";
import { MeetingRequestSelector } from "./MeetingRequestSelector";
import { AIBackupSelector } from "./AIBackupSelector";
import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";

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
  
  // Extract contact name for default tooltips
  const contactName = contactData?.first_name || contactData?.full_name || "this contact";
  
  // Handler for toggling default phrase
  const handleDefaultToggle = (phraseId: string | null) => {
    setTempSelection(prev => ({
      ...prev,
      defaultPhraseId: phraseId || undefined,
    }));
  };

  const handleSave = () => {
    onSave(tempSelection);
  };

  const handleCancel = () => {
    setTempSelection(currentSelection);
    onClose();
  };

  const renderContent = () => {
    if (isSubjectPool || moduleKey === 'subject_line') {
      if (moduleKey === 'subject_line') {
        // New single-select subject line
        return (
          <SubjectLineSelector
            allSubjects={allSubjects}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            toneOverride={toneOverride}
            contactName={contactData?.first_name || 'this contact'}
            defaultPhraseId={tempSelection?.defaultPhraseId}
            onDefaultToggle={(phraseId) => {
              setTempSelection(prev => prev ? { 
                ...prev, 
                defaultPhraseId: phraseId || undefined,
                defaultSubjectId: phraseId || undefined 
              } : null);
            }}
          />
        );
      }
      // Legacy subject_line_pool
      return (
        <SubjectPoolSelector
          allSubjects={allSubjects}
          currentSelection={tempSelection}
          toneOverride={toneOverride}
          onSelectionChange={setTempSelection}
          contactName={contactName}
        />
      );
    }

    switch (moduleKey) {
      case 'article_recommendations':
        return (
          <ArticleRecommendationSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            contactData={contactData ? {
              firstName: contactData.first_name,
              organization: contactData.organization,
              focusAreas: contactData.focus_areas || [],
            } : undefined}
            selectedArticleUrl={contactData?.articles?.[0]?.article_link}
            contactName={contactName}
            defaultPhraseId={tempSelection?.defaultPhraseId}
            onDefaultToggle={handleDefaultToggle}
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
      
      case 'self_personalization':
        return (
          <SelfPersonalizationSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            contactData={contactData ? {
              firstName: contactData.first_name,
              organization: contactData.organization,
              focusAreas: contactData.focus_areas || [],
            } : undefined}
            contactName={contactName}
            defaultPhraseId={tempSelection?.defaultPhraseId}
            onDefaultToggle={handleDefaultToggle}
          />
        );
      
      case 'top_opportunities':
        return (
          <TopOpportunitiesSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            contactData={contactData ? {
              firstName: contactData.first_name,
              organization: contactData.organization,
              opportunities: (contactData as any).opportunities || [],
            } : undefined}
            contactName={contactName}
            defaultPhraseId={tempSelection?.defaultPhraseId}
            onDefaultToggle={handleDefaultToggle}
          />
        );
      
      case 'platforms':
        return (
          <PlatformsSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            contactData={contactData ? {
              firstName: contactData.first_name,
              organization: contactData.organization,
              focusAreas: contactData.focus_areas || [],
            } : undefined}
          />
        );
      
      case 'general_org_update':
        return (
          <GeneralOrgUpdateSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            contactData={contactData ? {
              firstName: contactData.first_name,
              organization: contactData.organization,
            } : undefined}
            contactName={contactName}
            defaultPhraseId={tempSelection?.defaultPhraseId}
            onDefaultToggle={handleDefaultToggle}
          />
        );
      
      case 'meeting_request':
        return (
          <MeetingRequestSelector
            phrases={allPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            contactData={contactData ? {
              firstName: contactData.first_name,
            } : undefined}
            contactName={contactName}
            defaultPhraseId={tempSelection?.defaultPhraseId}
            onDefaultToggle={handleDefaultToggle}
          />
        );
      
      case 'closing_line':
        const closingPhrases = allPhrases.filter(p => p.category === 'closing');
        return (
          <PhraseSelectorGeneric
            category="closing"
            categoryLabel="Closing Line"
            phrases={closingPhrases}
            currentSelection={tempSelection}
            onSelectionChange={setTempSelection}
            multiSelect={false}
            contactName={contactName}
            defaultPhraseId={tempSelection?.defaultPhraseId}
            onDefaultToggle={handleDefaultToggle}
            allowInlineManagement={true}
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
