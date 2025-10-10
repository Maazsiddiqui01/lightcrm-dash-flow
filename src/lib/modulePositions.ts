/**
 * Module Position Management Utilities
 * Ensures positions are always contiguous (1..N) after reordering
 */

/**
 * Recomputes positions to be contiguous 1..N
 * @param moduleOrder - Array of module keys in current order
 * @returns Array of module keys with guaranteed contiguous positions
 */
export function recomputePositions(moduleOrder: (string | number)[]): string[] {
  // Filter out any invalid entries and ensure string type
  const validModules = moduleOrder
    .filter(key => key !== null && key !== undefined)
    .map(key => String(key));
  
  // Return array is implicitly 0-indexed, which translates to 1..N positions
  return validModules;
}

/**
 * Validates that module order has no gaps or duplicates
 * @param moduleOrder - Array of module keys to validate
 * @returns Validation result with any issues found
 */
export function validateModuleOrder(moduleOrder: (string | number)[]): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const seen = new Set<string>();
  
  moduleOrder.forEach((key, index) => {
    const stringKey = String(key);
    
    if (seen.has(stringKey)) {
      issues.push(`Duplicate module key "${stringKey}" found at position ${index + 1}`);
    }
    seen.add(stringKey);
    
    if (!stringKey || stringKey.trim() === '') {
      issues.push(`Empty module key at position ${index + 1}`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Creates module sequence for payload with positions 1..N
 * @param moduleOrder - Array of module keys in order
 * @param moduleStates - Map of module keys to their tri-state values
 * @returns Array of {key, mode, position} for payload
 */
export function buildModuleSequence(
  moduleOrder: (string | number)[],
  moduleStates: Record<string, 'always' | 'sometimes' | 'never'>
): Array<{ key: string; mode: 'always' | 'sometimes' | 'never'; position: number }> {
  const recomputed = recomputePositions(moduleOrder);
  
  return recomputed.map((key, index) => ({
    key,
    mode: (moduleStates[key] || 'sometimes') as 'always' | 'sometimes' | 'never',
    position: index + 1, // 1-indexed positions
  }));
}

/**
 * Announces module position change for screen readers
 * @param moduleKey - Key of the moved module
 * @param newPosition - New 1-indexed position
 * @returns Announcement string for ARIA live region
 */
export function announceModuleMove(moduleKey: string, newPosition: number): string {
  // Convert snake_case to readable format
  const readableName = moduleKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `${readableName} moved to position ${newPosition}`;
}
