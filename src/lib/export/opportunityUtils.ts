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