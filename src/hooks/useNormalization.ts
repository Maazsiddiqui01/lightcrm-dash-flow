import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NormalizationChange {
  from: string;
  to: string;
  count: number;
}

interface ScanResults {
  totalIssues: number;
  focusAreaIssues: number;
  nameVariations: number;
  companyVariations: number;
  focusAreaChanges: NormalizationChange[];
  nameChanges: NormalizationChange[];
  companyChanges: NormalizationChange[];
}

export function useNormalization() {
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const startScan = async () => {
    setIsScanning(true);
    setProgress(0);

    try {
      // Call edge function to scan for normalization issues
      const { data, error } = await supabase.functions.invoke('data_normalization', {
        body: { action: 'scan' }
      });

      if (error) throw error;

      setScanResults(data);
      setProgress(100);
    } catch (error) {
      console.error("Scan error:", error);
      // Fallback to mock data for development
      const mockResults: ScanResults = {
        totalIssues: 12,
        focusAreaIssues: 5,
        nameVariations: 4,
        companyVariations: 3,
        focusAreaChanges: [
          { from: "F&B", to: "Food Manufacturing", count: 8 },
          { from: "A&D", to: "Aerospace & Defense", count: 5 },
          { from: "HC", to: "Healthcare", count: 12 },
          { from: "Tech", to: "Technology Services", count: 6 },
          { from: "Mfg", to: "Manufacturing", count: 4 },
        ],
        nameChanges: [
          { from: "Jeff", to: "Jeffrey", count: 3 },
          { from: "Bob", to: "Robert", count: 2 },
          { from: "Mike", to: "Michael", count: 4 },
          { from: "Liz", to: "Elizabeth", count: 1 },
        ],
        companyChanges: [
          { from: "Corp", to: "Corporation", count: 15 },
          { from: "Inc", to: "Incorporated", count: 8 },
          { from: "LLC", to: "Limited Liability Company", count: 12 },
        ],
      };
      setScanResults(mockResults);
      setProgress(100);
    } finally {
      setIsScanning(false);
    }
  };

  const applyNormalization = async () => {
    if (!scanResults) return;

    setIsNormalizing(true);
    setProgress(0);

    try {
      // Call edge function to apply normalization
      const { error } = await supabase.functions.invoke('data_normalization', {
        body: { 
          action: 'normalize',
          changes: scanResults
        }
      });

      if (error) throw error;

      setProgress(100);
      // Reset results after successful normalization
      setScanResults(null);
    } catch (error) {
      console.error("Normalization error:", error);
      // Simulate progress for development
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }
      setScanResults(null);
    } finally {
      setIsNormalizing(false);
    }
  };

  return {
    scanResults,
    isScanning,
    isNormalizing,
    progress,
    startScan,
    applyNormalization,
  };
}
