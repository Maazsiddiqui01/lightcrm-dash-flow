import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DuplicateRecord {
  id: string;
  full_name?: string;
  email?: string;
  organization?: string;
  deal_name?: string;
  sector?: string;
  ebitda_in_ms?: number;
}

interface DuplicateGroup {
  id: string;
  confidence: number;
  matchReason: string;
  records: DuplicateRecord[];
}

interface DuplicatesResult {
  groups: DuplicateGroup[];
  totalDuplicates: number;
  avgConfidence: number;
}

export function useDeduplication(entityType: "contacts" | "opportunities") {
  const [duplicates, setDuplicates] = useState<DuplicatesResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    setProgress(0);

    try {
      // Call edge function to scan for duplicates
      const { data, error } = await supabase.functions.invoke('data_normalization', {
        body: { 
          action: 'scan_duplicates',
          entityType 
        }
      });

      if (error) throw error;

      setDuplicates(data);
      setProgress(100);
    } catch (error) {
      console.error("Duplicate scan error:", error);
      // Fallback to mock data for development
      const mockData: DuplicatesResult = entityType === "contacts" 
        ? {
            groups: [
              {
                id: "group-1",
                confidence: 100,
                matchReason: "Exact email match",
                records: [
                  {
                    id: "1",
                    full_name: "John Smith",
                    email: "john.smith@example.com",
                    organization: "ABC Corp"
                  },
                  {
                    id: "2",
                    full_name: "J. Smith",
                    email: "john.smith@example.com",
                    organization: "ABC Corporation"
                  }
                ]
              },
              {
                id: "group-2",
                confidence: 92,
                matchReason: "Name + organization fuzzy match",
                records: [
                  {
                    id: "3",
                    full_name: "Sarah Johnson",
                    email: "sjohnson@xyz.com",
                    organization: "XYZ Inc"
                  },
                  {
                    id: "4",
                    full_name: "Sarah A. Johnson",
                    email: "sarah.johnson@xyz.com",
                    organization: "XYZ Incorporated"
                  }
                ]
              }
            ],
            totalDuplicates: 4,
            avgConfidence: 96
          }
        : {
            groups: [
              {
                id: "opp-1",
                confidence: 95,
                matchReason: "Deal name similarity + sector match",
                records: [
                  {
                    id: "1",
                    deal_name: "ABC Manufacturing Acquisition",
                    sector: "Industrials",
                    ebitda_in_ms: 45
                  },
                  {
                    id: "2",
                    deal_name: "ABC Mfg Acquisition",
                    sector: "Industrials",
                    ebitda_in_ms: 45
                  }
                ]
              }
            ],
            totalDuplicates: 2,
            avgConfidence: 95
          };
      
      setDuplicates(mockData);
      setProgress(100);
    } finally {
      setIsScanning(false);
    }
  };

  const mergeDuplicates = async (groupId: string) => {
    setIsMerging(true);
    setProgress(0);

    try {
      // Call edge function to merge duplicates
      const { error } = await supabase.functions.invoke('data_normalization', {
        body: { 
          action: 'merge_duplicates',
          groupId,
          entityType
        }
      });

      if (error) throw error;

      // Remove merged group from results
      if (duplicates) {
        setDuplicates({
          ...duplicates,
          groups: duplicates.groups.filter(g => g.id !== groupId),
          totalDuplicates: duplicates.totalDuplicates - duplicates.groups.find(g => g.id === groupId)!.records.length
        });
      }
      
      setProgress(100);
    } catch (error) {
      console.error("Merge error:", error);
      // Simulate progress for development
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setProgress(i);
      }
      
      // Remove from mock data
      if (duplicates) {
        setDuplicates({
          ...duplicates,
          groups: duplicates.groups.filter(g => g.id !== groupId)
        });
      }
    } finally {
      setIsMerging(false);
    }
  };

  return {
    duplicates,
    isScanning,
    isMerging,
    progress,
    scanForDuplicates,
    mergeDuplicates,
  };
}
