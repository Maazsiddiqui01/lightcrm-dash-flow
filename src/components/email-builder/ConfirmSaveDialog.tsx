import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type SaveScope = 'contact' | 'global';
export type AffectedField = 'coreSettings' | 'moduleStates' | 'moduleOrder' | 'moduleSelections' | 'team' | 'recipients';

interface ConfirmSaveDialogProps {
  open: boolean;
  onClose: () => void;
  scope: SaveScope;
  contactName: string;
  templateName: string;
  affectedFields: AffectedField[];
  onConfirm: () => void;
  isRandomized?: boolean;
  makeRandomizedDefaults?: boolean;
  onMakeDefaultsChange?: (value: boolean) => void;
}

const FIELD_LABELS: Record<AffectedField, string> = {
  coreSettings: 'Core Settings (tone, length)',
  moduleStates: 'Email Modules (always/sometimes/never)',
  moduleOrder: 'Module Order',
  moduleSelections: 'Module Selections (articles, greetings, etc.)',
  team: 'Team Members',
  recipients: 'Recipients (TO, CC)',
};

/**
 * Confirmation dialog explaining the scope and impact of save operations
 * Contact saves affect only one contact; global saves update template defaults
 */
export function ConfirmSaveDialog({
  open,
  onClose,
  scope,
  contactName,
  templateName,
  affectedFields,
  onConfirm,
  isRandomized,
  makeRandomizedDefaults,
  onMakeDefaultsChange,
}: ConfirmSaveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {scope === 'contact' ? (
              <>
                Save changes for {contactName}?
              </>
            ) : (
              <>
                Update global defaults for <Badge variant="secondary">{templateName}</Badge>?
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {scope === 'contact' ? (
                <>
                  <p>
                    These settings will apply <strong>only to {contactName}</strong>.
                    Other contacts will not be affected.
                  </p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-2">Changes being saved:</p>
                    <ul className="space-y-1">
                      {affectedFields.map(field => (
                        <li key={field} className="text-sm">
                          • {FIELD_LABELS[field]}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Randomize defaults checkbox (only shown after randomization) */}
                  {isRandomized && (
                    <div className="flex items-center space-x-2 pt-3 border-t">
                      <Checkbox
                        id="make-defaults"
                        checked={makeRandomizedDefaults}
                        onCheckedChange={(checked) => onMakeDefaultsChange?.(checked === true)}
                      />
                      <Label
                        htmlFor="make-defaults"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Make randomized picks my new defaults for this contact
                      </Label>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p>
                    <strong>Updates defaults for all contacts</strong> using the {templateName} template.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-900">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                      Scope limited to:
                    </p>
                    <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                      <li>• Core Settings (tone, length)</li>
                      <li>• Email Modules (always/sometimes/never states & order)</li>
                    </ul>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: Existing contact-specific overrides will continue to take precedence over these global defaults.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {scope === 'contact' ? 'Save for Contact' : 'Update Global Defaults'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
