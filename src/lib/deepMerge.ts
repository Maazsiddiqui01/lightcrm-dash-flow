/**
 * Deep Merge Utilities
 * Properly merges nested objects and arrays for effective settings resolution
 */

type PlainObject = { [key: string]: any };

/**
 * Checks if value is a plain object (not array, date, etc.)
 */
function isPlainObject(value: any): value is PlainObject {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) &&
         !(value instanceof Date) &&
         !(value instanceof RegExp);
}

/**
 * Deep merges two objects, with target taking precedence over source
 * Arrays are replaced, not merged
 * 
 * @param source - Base object (global defaults)
 * @param target - Override object (contact overrides)
 * @returns Deeply merged object where target values win
 */
export function deepMerge<T extends PlainObject>(
  source: T,
  target: Partial<T> | null | undefined
): T {
  // If no target, return source
  if (!target) return { ...source };
  
  const result = { ...source };
  
  for (const key in target) {
    const targetValue = target[key];
    const sourceValue = source[key];
    
    // Skip undefined values in target
    if (targetValue === undefined) continue;
    
    // If target value is null, it explicitly overrides
    if (targetValue === null) {
      (result as any)[key] = null;
      continue;
    }
    
    // If both are plain objects, recurse
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      (result as any)[key] = deepMerge(sourceValue, targetValue);
    } else {
      // Otherwise, target wins (including arrays)
      (result as any)[key] = targetValue;
    }
  }
  
  return result;
}

/**
 * Computes diff between two objects to detect unsaved changes
 * Returns true if objects differ
 */
export function hasChanges<T extends PlainObject>(
  original: T | null,
  current: T | null
): boolean {
  if (original === current) return false;
  if (!original && !current) return false;
  if (!original || !current) return true;
  
  // Check all keys in current
  for (const key in current) {
    const currentValue = current[key];
    const originalValue = original[key];
    
    if (currentValue === originalValue) continue;
    
    // Both are plain objects - recurse
    if (isPlainObject(currentValue) && isPlainObject(originalValue)) {
      if (hasChanges(originalValue, currentValue)) return true;
    } else if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
      // Arrays - compare length and elements
      if (currentValue.length !== originalValue.length) return true;
      if (!arraysEqual(currentValue, originalValue)) return true;
    } else {
      // Primitive or null - direct comparison
      if (currentValue !== originalValue) return true;
    }
  }
  
  // Check for keys in original but not in current
  for (const key in original) {
    if (!(key in current)) return true;
  }
  
  return false;
}

/**
 * Helper to compare arrays
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (isPlainObject(a[i]) && isPlainObject(b[i])) {
      if (hasChanges(a[i], b[i])) return false;
    } else if (a[i] !== b[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Creates a snapshot of current settings for diff comparison
 */
export function createSnapshot<T extends PlainObject>(settings: T): T {
  return JSON.parse(JSON.stringify(settings));
}
