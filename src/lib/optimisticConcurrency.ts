/**
 * Optimistic Concurrency Control
 * Handles 409 conflicts with revision mismatches
 */

import { supabase } from '@/integrations/supabase/client';

export interface ConflictResolution {
  action: 'overwrite' | 'merge' | 'cancel';
  merged?: any;
}

export interface ConflictData {
  local: any;
  server: any;
  field: string;
  localRevision: number;
  serverRevision: number;
}

/**
 * Detects if error is a 409 conflict
 */
export function is409Conflict(error: any): boolean {
  return error?.code === 'PGRST116' || error?.status === 409;
}

/**
 * Fetches latest version from server
 */
async function fetchLatestVersion(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<any> {
  const query = supabase
    .from(table as any)
    .select('*')
    .eq(idColumn, id)
    .maybeSingle();
    
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Computes diff between local and server versions
 */
export function computeConflicts(
  local: any,
  server: any,
  fields: string[] = []
): ConflictData[] {
  const conflicts: ConflictData[] = [];
  const fieldsToCheck = fields.length > 0 ? fields : Object.keys(local);
  
  fieldsToCheck.forEach(field => {
    if (field === 'revision' || field === 'updated_at') return;
    
    const localValue = local[field];
    const serverValue = server[field];
    
    // Deep comparison for objects/arrays
    const isDifferent = JSON.stringify(localValue) !== JSON.stringify(serverValue);
    
    if (isDifferent) {
      conflicts.push({
        local: localValue,
        server: serverValue,
        field,
        localRevision: local.revision || 0,
        serverRevision: server.revision || 0,
      });
    }
  });
  
  return conflicts;
}

/**
 * Attempts to auto-merge non-conflicting changes
 */
export function tryAutoMerge(
  local: any,
  server: any,
  conflicts: ConflictData[]
): { canAutoMerge: boolean; merged?: any } {
  // If conflicts exist in critical fields, cannot auto-merge
  const criticalFields = ['module_states', 'module_order', 'recipients'];
  const hasCriticalConflict = conflicts.some(c => criticalFields.includes(c.field));
  
  if (hasCriticalConflict) {
    return { canAutoMerge: false };
  }
  
  // Merge: take server for conflicting fields, local for non-conflicting
  const merged = { ...server };
  Object.keys(local).forEach(key => {
    const hasConflict = conflicts.some(c => c.field === key);
    if (!hasConflict && key !== 'revision' && key !== 'updated_at') {
      merged[key] = local[key];
    }
  });
  
  return { canAutoMerge: true, merged };
}

/**
 * Handles save with optimistic concurrency control
 */
export async function saveWithOCC<T extends { revision?: number }>(
  table: string,
  id: string,
  data: T,
  options: {
    idColumn?: string;
    onConflict?: (conflicts: ConflictData[], server: any) => Promise<ConflictResolution>;
  } = {}
): Promise<{ success: boolean; data?: any; conflicts?: ConflictData[] }> {
  const { idColumn = 'id', onConflict } = options;
  
  try {
    // Attempt save with revision check
    const query = supabase
      .from(table as any)
      .upsert({
        ...data,
        revision: (data.revision || 0) + 1,
      } as any)
      .eq(idColumn, id)
      .eq('revision', data.revision || 0) // Optimistic lock
      .select()
      .single();
      
    const { data: saved, error } = await query;
      
    if (!error) {
      return { success: true, data: saved };
    }
    
    // Check if it's a 409 conflict
    if (!is409Conflict(error)) {
      throw error; // Re-throw non-conflict errors
    }
    
    // Fetch latest server version
    const serverVersion = await fetchLatestVersion(table, id, idColumn);
    if (!serverVersion) {
      throw new Error('Server version not found');
    }
    
    // Compute conflicts
    const conflicts = computeConflicts(data, serverVersion);
    
    if (conflicts.length === 0) {
      // No real conflicts, retry save
      return saveWithOCC(table, id, { ...data, revision: serverVersion.revision }, options);
    }
    
    // Try auto-merge
    const { canAutoMerge, merged } = tryAutoMerge(data, serverVersion, conflicts);
    
    if (canAutoMerge && merged) {
      // Auto-merge successful, save merged version
      return saveWithOCC(table, id, merged, options);
    }
    
    // Cannot auto-merge, ask user
    if (onConflict) {
      const resolution = await onConflict(conflicts, serverVersion);
      
      switch (resolution.action) {
        case 'overwrite':
          // Force overwrite with local version
          return saveWithOCC(table, id, { ...data, revision: serverVersion.revision }, options);
          
        case 'merge':
          // Use user-provided merge
          return saveWithOCC(table, id, { ...resolution.merged, revision: serverVersion.revision }, options);
          
        case 'cancel':
          return { success: false, conflicts };
      }
    }
    
    // No conflict handler, return conflicts
    return { success: false, conflicts };
    
  } catch (error: any) {
    console.error('Save with OCC failed:', error);
    throw error;
  }
}
