import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";
import { useState } from "react";

export interface DebugData {
  resolvedLibraries: {
    selectedSubject: { text: string; tone: string } | null;
    selectedInquiry: { text: string; category: string } | null;
    selectedSignature: { text: string; tone: string } | null;
    assistantClause: string;
  };
  triStateSnapshot: Record<string, { decision: boolean; rule: 'always' | 'sometimes' | 'never' }>;
  rotationWrites: { phrases: number; inquiries: number };
  payloadPreview: any;
}

interface DebugResolvedLibrariesProps {
  debugData: DebugData | null;
}

export function DebugResolvedLibraries({ debugData }: DebugResolvedLibrariesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!debugData) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-muted-foreground" />
                <span>Debug: Resolved Libraries</span>
                <Badge variant="outline" className="text-xs">
                  Dev Tool
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Selected Libraries */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selected Libraries
              </h4>
              
              <div className="space-y-2">
                <div className="p-2 bg-muted/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Subject:</span>
                    <Badge variant="secondary" className="text-xs">
                      {debugData.resolvedLibraries.selectedSubject?.tone || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {debugData.resolvedLibraries.selectedSubject?.text || '—'}
                  </p>
                </div>

                <div className="p-2 bg-muted/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Inquiry:</span>
                    <Badge variant="secondary" className="text-xs">
                      {debugData.resolvedLibraries.selectedInquiry?.category || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {debugData.resolvedLibraries.selectedInquiry?.text || '—'}
                  </p>
                </div>

                <div className="p-2 bg-muted/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Signature:</span>
                    <Badge variant="secondary" className="text-xs">
                      {debugData.resolvedLibraries.selectedSignature?.tone || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {debugData.resolvedLibraries.selectedSignature?.text || '—'}
                  </p>
                </div>

                <div className="p-2 bg-muted/50 rounded">
                  <span className="text-xs font-medium">Assistant Clause:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {debugData.resolvedLibraries.assistantClause || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tri-State Snapshot */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tri-State Evaluations
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(debugData.triStateSnapshot).map(([module, { decision, rule }]) => (
                  <div key={module} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                    <span className="text-xs font-mono truncate">{module}</span>
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant={decision ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {decision ? 'ON' : 'OFF'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rule}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rotation Writes */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Rotation Writes (Session)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted/50 rounded">
                  <span className="text-xs font-medium">Phrases:</span>
                  <p className="text-lg font-bold text-primary">
                    {debugData.rotationWrites.phrases}
                  </p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="text-xs font-medium">Inquiries:</span>
                  <p className="text-lg font-bold text-primary">
                    {debugData.rotationWrites.inquiries}
                  </p>
                </div>
              </div>
            </div>

            {/* Payload Preview */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Payload Preview (POST to n8n)
              </h4>
              <div className="p-3 bg-slate-950 text-slate-50 rounded-lg overflow-auto max-h-96">
                <pre className="text-xs font-mono">
                  {JSON.stringify(debugData.payloadPreview, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
