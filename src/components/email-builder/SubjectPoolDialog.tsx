import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubjectPoolSelector } from "./SubjectPoolSelector";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface SubjectPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allSubjects: SubjectLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection) => void;
  toneOverride?: 'casual' | 'hybrid' | 'formal' | null;
}

export function SubjectPoolDialog({
  open,
  onOpenChange,
  allSubjects,
  currentSelection,
  onSelectionChange,
  toneOverride
}: SubjectPoolDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Subject Line Pool</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <SubjectPoolSelector
            allSubjects={allSubjects}
            currentSelection={currentSelection}
            onSelectionChange={onSelectionChange}
            toneOverride={toneOverride}
          />
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
