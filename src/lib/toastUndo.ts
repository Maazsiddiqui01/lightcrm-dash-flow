import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createElement } from "react";

interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number;
}

/**
 * Shows a toast with an undo action
 * Useful for destructive operations
 */
export function showUndoToast({ message, onUndo, duration = 5000 }: UndoToastOptions) {
  let undoClicked = false;

  const toastId = toast(message, {
    duration,
    action: {
      label: "Undo",
      onClick: () => {
        undoClicked = true;
        onUndo();
        toast.success("Action undone");
      },
    },
  });

  return {
    dismiss: () => toast.dismiss(toastId),
    wasUndone: () => undoClicked,
  };
}

/**
 * Shows an error toast with actionable suggestions
 */
export function showActionableError(error: string, actions?: Array<{ label: string; onClick: () => void }>) {
  if (actions && actions.length > 0) {
    toast.error(error, {
      action: {
        label: actions[0].label,
        onClick: actions[0].onClick,
      },
    });
  } else {
    toast.error(error);
  }
}

/**
 * Shows a loading toast that can be updated
 */
export function showLoadingToast(message: string) {
  const toastId = toast.loading(message);

  return {
    success: (successMessage: string) => {
      toast.success(successMessage, { id: toastId });
    },
    error: (errorMessage: string) => {
      toast.error(errorMessage, { id: toastId });
    },
    dismiss: () => {
      toast.dismiss(toastId);
    },
  };
}
