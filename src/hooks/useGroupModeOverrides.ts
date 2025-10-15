/**
 * FIX #7: Group Mode Override Persistence
 * Persists contact overrides to localStorage with 24-hour expiry
 */

import { useState, useEffect, useCallback } from 'react';
import type { ContactOverride } from '@/types/groupEmailBuilder';

const STORAGE_KEY = 'email_builder_group_overrides';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredOverrides {
  data: Record<string, ContactOverride>;
  timestamp: number;
}

/**
 * Hook to persist group mode contact overrides to localStorage
 */
export function useGroupModeOverrides() {
  const [overrides, setOverrides] = useState<Map<string, ContactOverride>>(new Map());
  const [hasRestoredDrafts, setHasRestoredDrafts] = useState(false);

  // Load overrides from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed: StoredOverrides = JSON.parse(stored);
      const age = Date.now() - parsed.timestamp;

      // Check if data is expired (older than 24 hours)
      if (age > EXPIRY_MS) {
        console.log('🗑️ Clearing expired group mode overrides (age:', Math.round(age / 1000 / 60 / 60), 'hours)');
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Restore overrides from storage
      const restoredMap = new Map(Object.entries(parsed.data));
      
      if (restoredMap.size > 0) {
        console.log('✅ Restored', restoredMap.size, 'group mode overrides from localStorage');
        setOverrides(restoredMap);
        setHasRestoredDrafts(true);
      }
    } catch (error) {
      console.error('Failed to restore group mode overrides:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save overrides to localStorage whenever they change
  const persistOverrides = useCallback((newOverrides: Map<string, ContactOverride>) => {
    try {
      if (newOverrides.size === 0) {
        // Clear storage if no overrides
        localStorage.removeItem(STORAGE_KEY);
        console.log('🗑️ Cleared group mode overrides from localStorage');
        return;
      }

      const stored: StoredOverrides = {
        data: Object.fromEntries(newOverrides),
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      console.log('💾 Persisted', newOverrides.size, 'group mode overrides to localStorage');
    } catch (error) {
      console.error('Failed to persist group mode overrides:', error);
      
      // Check if quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded. Clearing old overrides.');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Update overrides and persist to localStorage
  const updateOverrides = useCallback((newOverrides: Map<string, ContactOverride>) => {
    setOverrides(newOverrides);
    persistOverrides(newOverrides);
  }, [persistOverrides]);

  // Clear all overrides
  const clearOverrides = useCallback(() => {
    setOverrides(new Map());
    localStorage.removeItem(STORAGE_KEY);
    setHasRestoredDrafts(false);
    console.log('🗑️ Cleared all group mode overrides');
  }, []);

  // Dismiss "Restore Drafts" notification
  const dismissRestoredDrafts = useCallback(() => {
    setHasRestoredDrafts(false);
  }, []);

  return {
    overrides,
    updateOverrides,
    clearOverrides,
    hasRestoredDrafts,
    dismissRestoredDrafts,
  };
}
