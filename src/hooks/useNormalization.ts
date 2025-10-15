import { useState } from "react";
import { edgeInvoke, formatEdgeError } from "@/lib/edgeInvoke";

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
      const data = await edgeInvoke<ScanResults>('data_normalization', {
        action: 'scan',
        preview
      });

      setScanResults(data);
      setProgress(100);
    } catch (error) {
      console.error('[useNormalization] Scan error:', formatEdgeError(error, 'data_normalization'));
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
      await edgeInvoke('data_normalization', {
        action: 'normalize',
        changes: scanResults
      });

      setProgress(100);
      // Reset results after successful normalization
      setScanResults(null);
    } catch (error) {
      console.error('[useNormalization] Apply error:', formatEdgeError(error, 'data_normalization'));
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
