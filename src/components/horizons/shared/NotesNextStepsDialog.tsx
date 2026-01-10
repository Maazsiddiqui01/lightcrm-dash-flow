import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHorizonNotes } from "@/hooks/useHorizonNotes";
import { HorizonNotesSection } from "./HorizonNotesSection";

interface NotesNextStepsDialogProps {
  open: boolean;
  onClose: () => void;
  recordId: string;
  tableName: "lg_horizons_companies" | "lg_horizons_gps";
  recordName: string;
  initialTab?: "notes" | "next_steps";
  onSaved?: () => void;
}

export function NotesNextStepsDialog({
  open,
  onClose,
  recordId,
  tableName,
  recordName,
  initialTab = "notes",
  onSaved,
}: NotesNextStepsDialogProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const recordType = tableName === "lg_horizons_companies" ? "company" : "gp";
  
  const {
    currentNotes,
    timeline,
    isLoadingCurrent,
    isLoadingTimeline,
    saveNotes,
    saveNextSteps,
    isSavingNotes,
    isSavingNextSteps,
    deleteNote,
    isDeletingNote,
  } = useHorizonNotes(recordId, recordType, recordName);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSaveNotes = (content: string) => {
    saveNotes(content);
    onSaved?.();
  };

  const handleSaveNextSteps = (content: string, dueDate?: string, addInToDo?: boolean) => {
    saveNextSteps(content, dueDate, addInToDo);
    onSaved?.();
  };

  // Filter timeline by field
  const notesTimeline = timeline.filter(entry => entry.field === 'notes');
  const nextStepsTimeline = timeline.filter(entry => entry.field === 'next_steps');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notes & Next Steps - {recordName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "notes" | "next_steps")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="next_steps">Next Steps</TabsTrigger>
          </TabsList>
          
          <TabsContent value="notes" className="mt-4">
            <HorizonNotesSection
              title="Notes"
              field="notes"
              currentValue={currentNotes?.notes || null}
              timeline={notesTimeline}
              onSave={handleSaveNotes}
              onDelete={deleteNote}
              isSaving={isSavingNotes}
              isDeleting={isDeletingNote}
              isLoadingCurrent={isLoadingCurrent}
              isLoadingTimeline={isLoadingTimeline}
            />
          </TabsContent>
          
          <TabsContent value="next_steps" className="mt-4">
            <HorizonNotesSection
              title="Next Steps"
              field="next_steps"
              currentValue={currentNotes?.next_steps || null}
              currentDueDate={currentNotes?.next_steps_due_date}
              timeline={nextStepsTimeline}
              onSave={handleSaveNextSteps}
              onDelete={deleteNote}
              isSaving={isSavingNextSteps}
              isDeleting={isDeletingNote}
              isLoadingCurrent={isLoadingCurrent}
              isLoadingTimeline={isLoadingTimeline}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
