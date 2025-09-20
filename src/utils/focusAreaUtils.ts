/**
 * Utility functions for handling focus area filtering with HC: (All) support
 */

/**
 * Expands "HC: (All)" to all actual HC focus areas for database queries
 * @param focusAreas - Array of focus area strings that may contain "HC: (All)"
 * @param allFocusAreas - Array of all available focus areas
 * @returns Array with "HC: (All)" expanded to actual HC focus areas
 */
export const expandHcAllForQuery = (
  focusAreas: string[],
  allFocusAreas: string[]
): string[] => {
  if (!focusAreas.includes('HC: (All)')) {
    return focusAreas;
  }

  // Remove "HC: (All)" and add all actual HC focus areas
  const withoutHcAll = focusAreas.filter(area => area !== 'HC: (All)');
  const hcFocusAreas = allFocusAreas.filter(area => 
    area.startsWith('HC:') && area !== 'HC: (All)'
  );

  // Combine and deduplicate
  return [...new Set([...withoutHcAll, ...hcFocusAreas])];
};

/**
 * Checks if a contact's focus areas match the filter criteria
 * Handles both individual focus areas and HC: (All) expansion
 * @param contactFocusAreas - Contact's focus areas (comma-separated string)
 * @param filterFocusAreas - Filter focus areas array
 * @param allFocusAreas - All available focus areas
 * @returns True if contact matches the filter
 */
export const matchesFocusAreaFilter = (
  contactFocusAreas: string | null | undefined,
  filterFocusAreas: string[],
  allFocusAreas: string[]
): boolean => {
  if (!filterFocusAreas || filterFocusAreas.length === 0) {
    return true; // No filter applied
  }

  if (!contactFocusAreas) {
    return false; // Contact has no focus areas
  }

  // Parse contact's focus areas
  const contactAreas = contactFocusAreas
    .split(',')
    .map(area => area.trim())
    .filter(area => area.length > 0);

  // Expand HC: (All) in filter
  const expandedFilter = expandHcAllForQuery(filterFocusAreas, allFocusAreas);

  // Check if any contact focus area matches the filter
  return contactAreas.some(contactArea => 
    expandedFilter.some(filterArea => 
      contactArea.toLowerCase().includes(filterArea.toLowerCase()) ||
      filterArea.toLowerCase().includes(contactArea.toLowerCase())
    )
  );
};