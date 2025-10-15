import { useState } from "react";
import { edgeInvoke, formatEdgeError } from "@/lib/edgeInvoke";

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
      const data = await edgeInvoke<DuplicatesResult>('data_normalization', {
        action: 'scan_duplicates',
        entityType
      });

      setDuplicates(data);
      setProgress(100);
    } catch (error) {
      console.error('[useDeduplication] Scan error:', formatEdgeError(error, 'data_normalization'));
      setDuplicates(null);
      setProgress(0);
      throw error;
    } finally {
      setIsScanning(false);
    }
  };

  const mergeDuplicates = async (groupId: string) => {
    setIsMerging(true);
    setProgress(0);

    try {
      const data = await edgeInvoke('data_normalization', {
        action: 'merge_duplicates',
        groupId,
        entityType
      });

      // Remove merged group from results
      if (duplicates) {
        const mergedGroup = duplicates.groups.find(g => g.id === groupId);
        const recordsCount = mergedGroup ? mergedGroup.records.length : 0;
        
        setDuplicates({
          ...duplicates,
          groups: duplicates.groups.filter(g => g.id !== groupId),
          totalDuplicates: duplicates.totalDuplicates - recordsCount
        });
      }
      
      setProgress(100);
      return data;
    } catch (error) {
      console.error('[useDeduplication] Merge error:', formatEdgeError(error, 'data_normalization'));
      setProgress(0);
      throw error;
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
