/**
 * Maps focus areas to their corresponding sectors using the focus area master mapping
 */
export function mapFocusAreasToSectors(
  focusAreasList: string | null | undefined,
  mapping: Map<string, string> | undefined,
  fallbackSector?: string | null
): string {
  if (!focusAreasList || !mapping) {
    return fallbackSector || '';
  }

  // Split focus areas by comma and clean them
  const focusAreas = focusAreasList
    .split(',')
    .map(area => area.toLowerCase().trim())
    .filter(area => area.length > 0);

  // Map each focus area to its sector
  const sectors = new Set<string>();
  
  focusAreas.forEach(focusArea => {
    const sector = mapping.get(focusArea);
    if (sector) {
      sectors.add(sector);
    }
  });

  // If no sectors found from mapping, use fallback
  if (sectors.size === 0 && fallbackSector) {
    return fallbackSector;
  }

  // Return unique sectors as comma-separated string
  return Array.from(sectors).sort().join(', ');
}

/**
 * Get all focus areas from a contact record (comprehensive list + individual fields)
 */
export function getAllFocusAreas(contact: any): string {
  const focusAreas = new Set<string>();
  
  // Add from comprehensive list
  if (contact.lg_focus_areas_comprehensive_list) {
    contact.lg_focus_areas_comprehensive_list
      .split(',')
      .map((area: string) => area.trim())
      .filter((area: string) => area.length > 0)
      .forEach((area: string) => focusAreas.add(area));
  }
  
  // Add from individual fields
  for (let i = 1; i <= 8; i++) {
    const fieldName = `lg_focus_area_${i}`;
    if (contact[fieldName]) {
      focusAreas.add(contact[fieldName].trim());
    }
  }
  
  return Array.from(focusAreas).join(', ');
}