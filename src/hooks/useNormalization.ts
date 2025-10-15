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
  previewRecords?: Array<{
    id: string;
    full_name: string;
    organization: string;
    lg_focus_areas_comprehensive_list: string;
  }>;
}

export function useNormalization() {
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const startScan = async (preview: boolean = true) => {
    setIsScanning(true);
    setProgress(0);

    try {
      // Call edge function to scan for normalization issues
      const { data, error } = await supabase.functions.invoke('data_normalization', {
        body: { action: 'scan', preview }
      });

      if (error) throw error;

      setScanResults(data);
      setProgress(100);
    } catch (error) {
      console.error("Scan error:", error);
      setScanResults(null);
      setProgress(0);
      throw error;
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
      const { data, error } = await supabase.functions.invoke('data_normalization', {
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
      setProgress(0);
      throw error;
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
