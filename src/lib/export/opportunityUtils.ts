// Utility functions for opportunity dropdown data processing

export const splitTokens = (s?: string | null): string[] =>
  (s ?? '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

export const uniqCasefold = (arr: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of arr) {
    const k = t.toLowerCase();
    if (!seen.has(k)) { 
      seen.add(k); 
      out.push(t); 
    }
  }
  return out;
};

export const normalizeOwnershipTypeMapping = (value: string): string => {
  switch (value) {
    case 'Family/Founder':
      return 'Family/Founder';
    case 'Sponsor Owned':
      return 'Sponsor Owned';
    case 'Public':
      return 'Public';
    case 'Other':
      return 'Other';
    default:
      return value;
  }
};

export const normalizePlatformAddonMapping = (value: string): string => {
  switch (value) {
    case 'Platform':
      return 'Platform';
    case 'Add-On':
      return 'Add-On';
    case 'Both':
      return 'Platform, Add-On';
    default:
      return value;
  }
};

export const tierOptions = ['1', '2', '3', '4', '5'];

export const defaultOwnershipTypes = ['Family/Founder', 'Sponsor Owned', 'Public', 'Other'];
export const defaultPlatformAddons = ['Platform', 'Add-On', 'Both'];

// Platform/Add-On display mapping
export const platformAddonDisplayMapping: Record<string, string> = {
  'Platform': 'Platform',
  'Add-On': 'Add-On',
  'Both': 'Platform & Add-On'
};

export const platformAddonValueMapping: Record<string, string> = {
  'Platform': 'Platform',
  'Add-On': 'Add-On',
  'Platform & Add-On': 'Both'
};

export const getPlatformAddonDisplayValue = (value: string | null | undefined): string => {
  if (!value) return '';
  return platformAddonDisplayMapping[value] || value;
};

export const getPlatformAddonDatabaseValue = (displayValue: string): string => {
  return platformAddonValueMapping[displayValue] || displayValue;
};

export const platformAddonDisplayOptions = ['Platform', 'Add-On', 'Platform & Add-On'];

// Tier mapping utilities
export const tierDisplayMapping: Record<string, string> = {
  '1': '1-Active',
  '2': '2-Longer Term', 
  '3': '3-For Review',
  '4': '4-Likely Pass',
  '5': '5-Passed'
};

export const tierValueMapping: Record<string, string> = {
  '1-Active': '1',
  '2-Longer Term': '2',
  '3-For Review': '3', 
  '4-Likely Pass': '4',
  '5-Passed': '5'
};

export const getTierDisplayValue = (value: string | null | undefined): string => {
  if (!value) return '';
  
  // Normalize the input value
  const normalized = String(value).trim();
  
  // Extract just the number if the value contains extra text
  // e.g., "Tier 3- For Review" -> "3", "tier 3" -> "3"
  const numberMatch = normalized.match(/(\d+)/);
  if (numberMatch) {
    const tierNumber = numberMatch[1];
    return tierDisplayMapping[tierNumber] || normalized;
  }
  
  // If it's already in display format, return it
  if (Object.keys(tierValueMapping).includes(normalized)) {
    return normalized;
  }
  
  // Direct mapping lookup
  return tierDisplayMapping[normalized] || normalized;
};

export const getTierDatabaseValue = (displayValue: string): string => {
  if (!displayValue) return '';
  
  // Normalize the input
  const normalized = String(displayValue).trim();
  
  // If it's already a single digit, return it
  if (/^[1-5]$/.test(normalized)) {
    return normalized;
  }
  
  // Extract number from display value like "3-For Review"
  const numberMatch = normalized.match(/^(\d+)-/);
  if (numberMatch) {
    return numberMatch[1];
  }
  
  // Try reverse mapping
  return tierValueMapping[normalized] || normalized;
};

export const tierDisplayOptions = [
  '1-Active',
  '2-Longer Term',
  '3-For Review', 
  '4-Likely Pass',
  '5-Passed'
];

// Group Email Role mapping utilities
export const groupEmailRoleDisplayMapping: Record<string, string> = {
  'to': 'To (Primary Recipient)',
  'cc': 'CC (Carbon Copy)',
  'bcc': 'BCC (Blind Carbon Copy)'
};

export const groupEmailRoleValueMapping: Record<string, string> = {
  'To (Primary Recipient)': 'to',
  'CC (Carbon Copy)': 'cc',
  'BCC (Blind Carbon Copy)': 'bcc'
};

export const getGroupEmailRoleDisplayValue = (value: string | null | undefined): string => {
  if (!value) return '';
  return groupEmailRoleDisplayMapping[value] || value;
};

export const getGroupEmailRoleDatabaseValue = (displayValue: string): string => {
  return groupEmailRoleValueMapping[displayValue] || displayValue;
};

export const groupEmailRoleDisplayOptions = [
  'To (Primary Recipient)',
  'CC (Carbon Copy)',
  'BCC (Blind Carbon Copy)'
];