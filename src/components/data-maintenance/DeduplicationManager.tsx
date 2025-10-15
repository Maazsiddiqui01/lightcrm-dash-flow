import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitMerge, AlertCircle, CheckCircle2, Play, Eye, Users, Building } from "lucide-react";
import { useDeduplication } from "@/hooks/useDeduplication";
import { useToast } from "@/hooks/use-toast";

export function DeduplicationManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contacts");
  const {
    duplicates,
    isScanning,
    isMerging,
    progress,
    scanForDuplicates,
    mergeDuplicates,
  } = useDeduplication(activeTab as "contacts" | "opportunities");

  const handleScan = async () => {
    try {
      console.log(`[DeduplicationManager] Starting scan for ${activeTab}...`);
      await scanForDuplicates();
      console.log('[DeduplicationManager] Scan completed:', duplicates);
      toast({
        title: "Scan Complete",
        description: `Found ${duplicates?.groups.length || 0} duplicate groups`,
      });
    } catch (error) {
      console.error('[DeduplicationManager] Scan failed:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan for duplicates",
        variant: "destructive",
      });
    }
  };

  const handleMerge = async (groupId: string) => {
    const group = duplicates?.groups.find(g => g.id === groupId);
    if (!group) return;

    if (!confirm(`⚠️ Merge ${group.records.length} Duplicate Records?\n\nThis will:\n- Keep the most complete record\n- Delete ${group.records.length - 1} duplicate(s)\n- Update all related interactions and opportunities\n- Cannot be undone\n\nMatch Reason: ${group.matchReason}\nConfidence: ${group.confidence}%\n\nContinue?`)) {
      return;
    }

    try {
      console.log(`[DeduplicationManager] Merging group ${groupId}...`, group);
      await mergeDuplicates(groupId);
      console.log('[DeduplicationManager] Merge completed successfully');
      toast({
        title: "Merge Complete",
        description: "Duplicate records have been merged successfully",
      });
    } catch (error) {
      console.error('[DeduplicationManager] Merge failed:', error);
      toast({
        title: "Merge Failed",
        description: error instanceof Error ? error.message : "Failed to merge duplicates",
        variant: "destructive",
      });
    }
  };

  const handleMergeAll = async () => {
    if (!duplicates?.groups.length) return;
    
    if (!confirm(`⚠️ Merge All ${duplicates.groups.length} Duplicate Groups?\n\nThis cannot be undone. Continue?`)) {
      return;
    }

    try {
      console.log(`[DeduplicationManager] Merging all ${duplicates.groups.length} groups...`);
      for (const group of duplicates.groups) {
        console.log(`[DeduplicationManager] Merging group ${group.id}...`);
        await mergeDuplicates(group.id);
      }
      console.log('[DeduplicationManager] All merges completed successfully');
      
      toast({
        title: "All Merges Complete",
        description: `Merged ${duplicates.groups.length} duplicate groups`,
      });
    } catch (error) {
      console.error('[DeduplicationManager] Merge all failed:', error);
      toast({
        title: "Merge Failed",
        description: error instanceof Error ? error.message : "Failed to merge all duplicates",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Opportunities
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Duplicate Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {duplicates?.groups.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Groups identified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Duplicates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {duplicates?.totalDuplicates || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Records to merge
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {duplicates?.avgConfidence || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average match score
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Deduplication Actions</CardTitle>
              <CardDescription>
                Scan for and merge duplicate {activeTab}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  onClick={handleScan}
                  disabled={isScanning || isMerging}
                  className="flex-1"
                >
                  {isScanning ? (
                    <>
                      <GitMerge className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Scan for Duplicates
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleMergeAll}
                  disabled={!duplicates || isScanning || isMerging || duplicates.groups.length === 0}
                  variant="default"
                  className="flex-1"
                >
                  {isMerging ? (
                    <>
                      <GitMerge className="h-4 w-4 mr-2 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Merge All Duplicates
                    </>
                  )}
                </Button>
              </div>

              {(isScanning || isMerging) && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicate Groups */}
          {duplicates && duplicates.groups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Duplicate Groups</CardTitle>
                <CardDescription>
                  Review and merge duplicate records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-auto">
                {duplicates.groups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Group {group.id}</h4>
                        <Badge variant={group.confidence >= 90 ? "default" : "secondary"}>
                          {group.confidence}% match
                        </Badge>
                        <Badge variant="outline">
                          {group.records.length} records
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleMerge(group.id)}
                        disabled={isMerging}
                      >
                        <GitMerge className="h-4 w-4 mr-2" />
                        Merge
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.records.map((record, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            {activeTab === "contacts" ? (
                              <>
                                <div className="font-medium">{record.full_name || record.email}</div>
                                <div className="text-sm text-muted-foreground">
                                  {record.email} • {record.organization || "No organization"}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">{record.deal_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {record.sector} • EBITDA: ${record.ebitda_in_ms || "N/A"}M
                                </div>
                              </>
                            )}
                          </div>
                          {idx === 0 && (
                            <Badge variant="default">Primary</Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Match reason:</strong> {group.matchReason}
                      </AlertDescription>
                    </Alert>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {duplicates && duplicates.groups.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                No duplicates found! Your {activeTab} database is clean.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Duplicate Detection Rules:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {activeTab === "contacts" ? (
                  <>
                    <li>Exact email match (100% confidence)</li>
                    <li>Name + organization fuzzy match (85%+ confidence)</li>
                    <li>Phonetic name matching (Soundex algorithm)</li>
                    <li>Domain-based organization matching</li>
                  </>
                ) : (
                  <>
                    <li>Deal name similarity (90%+ confidence)</li>
                    <li>Company + sector combination match</li>
                    <li>EBITDA range + timing correlation</li>
                    <li>Source individual overlap detection</li>
                  </>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
