import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const normalize = (s?: string | null) =>
  (s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function useContactOpps(fullName?: string | null) {
  return useQuery({
    queryKey: ['contact-opps', fullName],
    enabled: !!fullName,
    queryFn: async () => {
      if (!fullName) return [];
      
      const normalizedName = normalize(fullName);
      
      // Single query using OR condition to check both fields
      const { data, error } = await supabase
        .from('opportunities_raw')
        .select('deal_name, deal_source_individual_1, deal_source_individual_2, ownership_type')
        .or(`deal_source_individual_1.ilike.%${fullName}%,deal_source_individual_2.ilike.%${fullName}%`)
        .limit(50);
      
      if (error) throw error;

      // Filter with strict normalized name matching and build unique deals list
      const seen = new Set<string>();
      const deals: Array<{ name: string; ownershipType?: string }> = [];
      
      for (const row of data || []) {
        const match1 = normalize(row.deal_source_individual_1) === normalizedName;
        const match2 = normalize(row.deal_source_individual_2) === normalizedName;
        
        if (match1 || match2) {
          const dealName = (row.deal_name ?? '').trim();
          if (!dealName) continue;
          
          const key = dealName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            deals.push({
              name: dealName,
              ownershipType: row.ownership_type || undefined
            });
          }
        }
      }
      
      return deals;
    },
  });
}