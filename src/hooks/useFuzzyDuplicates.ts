import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { edgeInvoke, formatEdgeError } from "@/lib/edgeInvoke";
import { useToast } from "@/hooks/use-toast";

interface DuplicateRecord {
  id: string;
  full_name: string;
  email: string;
  organization?: string;
  most_recent_contact?: string;
  emails_count: number;
  meetings_count: number;
  owner: string;
}

interface DuplicateGroup {
  id: string;
  confidence: number;
  matchReason: string;
  suggestedPrimary: string;
  suggestedReason: string;
  records: DuplicateRecord[];
}

interface DuplicatesResult {
  groups: DuplicateGroup[];
  totalDuplicates: number;
  avgConfidence: number;
}

export function useFuzzyDuplicates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [duplicates, setDuplicates] = useState<DuplicatesResult | null>(null);

  const scanMutation = useMutation({
    mutationFn: async () => {
      const data = await edgeInvoke<DuplicatesResult>('data_normalization', {
        action: 'scan_fuzzy_duplicates'
      });
      return data;
    },
    onSuccess: (data) => {
      setDuplicates(data);
      toast({
        title: "Scan complete",
        description: `Found ${data.groups.length} potential duplicate groups`,
      });
    },
    onError: (error) => {
      console.error('[useFuzzyDuplicates] Scan error:', formatEdgeError(error, 'data_normalization'));
      toast({
        title: "Scan failed",
        description: "Failed to scan for duplicates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ groupId, primaryId }: { groupId: string; primaryId: string }) => {
      const data = await edgeInvoke('data_normalization', {
        action: 'merge_contacts',
        groupId,
        primaryId
      });
      return data;
    },
    onSuccess: (data, variables) => {
      // Remove merged group from results
      if (duplicates) {
        setDuplicates({
          ...duplicates,
          groups: duplicates.groups.filter(g => g.id !== variables.groupId),
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      
      toast({
        title: "Contacts merged",
        description: `Successfully merged ${data.mergedIds?.length || 0} duplicate contacts`,
      });
    },
    onError: (error) => {
      console.error('[useFuzzyDuplicates] Merge error:', formatEdgeError(error, 'data_normalization'));
      toast({
        title: "Merge failed",
        description: "Failed to merge contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const data = await edgeInvoke('data_normalization', {
        action: 'dismiss_duplicate_group',
        groupId
      });
      return data;
    },
    onSuccess: (data, groupId) => {
      // Remove dismissed group from results
      if (duplicates) {
        setDuplicates({
          ...duplicates,
          groups: duplicates.groups.filter(g => g.id !== groupId),
        });
      }
      
      toast({
        title: "Duplicate dismissed",
        description: "This group won't appear in future scans",
      });
    },
    onError: (error) => {
      console.error('[useFuzzyDuplicates] Dismiss error:', formatEdgeError(error, 'data_normalization'));
      toast({
        title: "Dismiss failed",
        description: "Failed to dismiss duplicate group. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    duplicates,
    isScanning: scanMutation.isPending,
    isMerging: mergeMutation.isPending,
    isDismissing: dismissMutation.isPending,
    scanForDuplicates: scanMutation.mutate,
    mergeDuplicates: mergeMutation.mutate,
    dismissDuplicates: dismissMutation.mutate,
    refetch: scanMutation.mutate, // Alias for consistency
  };
}
