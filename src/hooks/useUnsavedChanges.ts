/**
 * Unsaved Changes Detection Hook
 * Tracks changes to email builder settings and warns before navigation
 */

import { useEffect, useRef, useState } from 'react';
import { hasChanges, createSnapshot } from '@/lib/deepMerge';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { ModuleSelections } from '@/types/moduleSelections';

export interface EmailBuilderState {
  toneOverride: string | null;
  lengthOverride: string | null;
  moduleStates: ModuleStates;
  moduleOrder: (string | number)[];
  moduleSelections: ModuleSelections;
  curatedTo: string;
  curatedCc: string[];
  subjectPoolOverride: string[];
}

/**
 * Hook to detect unsaved changes in email builder
 */
export function useUnsavedChanges(currentState: EmailBuilderState) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const savedSnapshot = useRef<EmailBuilderState | null>(null);
  
  /**
   * Mark current state as saved (creates snapshot)
   */
  const markAsSaved = () => {
    savedSnapshot.current = createSnapshot(currentState);
    setHasUnsavedChanges(false);
  };
  
  /**
   * Reset to initial state (no saved snapshot)
   */
  const reset = () => {
    savedSnapshot.current = null;
    setHasUnsavedChanges(false);
  };
  
  // Detect changes whenever state updates
  useEffect(() => {
    if (!savedSnapshot.current) {
      // First load - mark as saved
      savedSnapshot.current = createSnapshot(currentState);
      setHasUnsavedChanges(false);
      return;
    }
    
    const changed = hasChanges(savedSnapshot.current, currentState);
    setHasUnsavedChanges(changed);
  }, [currentState]);
  
  // Warn before leaving page if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  return {
    hasUnsavedChanges,
    markAsSaved,
    reset,
  };
}
