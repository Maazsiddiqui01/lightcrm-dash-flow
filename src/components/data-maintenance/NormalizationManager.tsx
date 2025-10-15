import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertCircle, CheckCircle2, Play, Eye } from "lucide-react";
import { useNormalization } from "@/hooks/useNormalization";
import { useToast } from "@/hooks/use-toast";

export function NormalizationManager() {
  const { toast } = useToast();
  const {
    scanResults,
    isScanning,
    isNormalizing,
    progress,
    startScan,
    applyNormalization,
  } = useNormalization();

  const handleScan = async () => {
    try {
      await startScan();
      toast({
        title: "Scan Complete",
        description: "Data normalization opportunities have been identified",
      });
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan for normalization issues",
        variant: "destructive",
      });
    }
  };

  const handleApply = async () => {
    if (!scanResults || scanResults.totalIssues === 0) return;

    if (!confirm(`⚠️ Apply Normalization?\n\nThis will update ${scanResults.totalIssues} records in the database.\n\nChanges:\n- ${scanResults.focusAreaIssues} focus area normalizations\n- ${scanResults.nameVariations} name standardizations\n- ${scanResults.companyVariations} company suffix corrections\n\nContinue?`)) {
      return;
    }

    try {
      await applyNormalization();
      toast({
        title: "Normalization Applied",
        description: "Database has been successfully normalized",
      });
    } catch (error) {
      toast({
        title: "Normalization Failed",
        description: error instanceof Error ? error.message : "Failed to apply normalization",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scanResults?.focusAreaIssues || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Non-standard entries found
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Names</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scanResults?.nameVariations || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Variations detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scanResults?.companyVariations || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suffix variations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Normalization Actions</CardTitle>
          <CardDescription>
            Scan your database and apply standardization rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={handleScan}
              disabled={isScanning || isNormalizing}
              className="flex-1"
            >
              {isScanning ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Scan Database
                </>
              )}
            </Button>
            
            <Button
              onClick={handleApply}
              disabled={!scanResults || isScanning || isNormalizing || scanResults.totalIssues === 0}
              variant="default"
              className="flex-1"
            >
              {isNormalizing ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Apply Normalization
                </>
              )}
            </Button>
          </div>

          {(isScanning || isNormalizing) && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Results */}
      {scanResults && scanResults.totalIssues > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Normalization Preview</CardTitle>
            <CardDescription>
              Review changes before applying
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Records */}
            {scanResults.previewRecords && scanResults.previewRecords.length > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Eye className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Preview Mode Active:</strong> Showing sample records that will be affected. 
                  Review changes carefully before applying.
                </AlertDescription>
              </Alert>
            )}

            {/* Focus Area Normalizations */}
            {scanResults.focusAreaChanges && scanResults.focusAreaChanges.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Focus Area Standardization
                  <Badge variant="secondary">{scanResults.focusAreaChanges.length}</Badge>
                </h4>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {scanResults.focusAreaChanges.slice(0, 10).map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {change.from}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {change.to}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {change.count} record{change.count > 1 ? 's' : ''} affected
                        </p>
                      </div>
                    </div>
                  ))}
                  {scanResults.focusAreaChanges.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      + {scanResults.focusAreaChanges.length - 10} more changes
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Name Normalizations */}
            {scanResults.nameChanges && scanResults.nameChanges.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Name Standardization
                  <Badge variant="secondary">{scanResults.nameChanges.length}</Badge>
                </h4>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {scanResults.nameChanges.slice(0, 10).map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{change.from}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-medium">{change.to}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {change.count} occurrence{change.count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {scanResults.nameChanges.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      + {scanResults.nameChanges.length - 10} more changes
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {scanResults && scanResults.totalIssues === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            No normalization issues found! Your data is clean and standardized.
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Normalization Rules:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Focus Areas mapped to controlled vocabulary (e.g., "F&B" → "Food Manufacturing")</li>
            <li>Common name variations standardized (e.g., "Jeff" → "Jeffrey")</li>
            <li>Company suffixes normalized (e.g., "Corp" → "Corporation")</li>
            <li>Case and spacing standardized across all fields</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
