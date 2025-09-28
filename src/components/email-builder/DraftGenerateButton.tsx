import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Send, AlertTriangle } from "lucide-react";
import { useDraftBuilder, type DraftBuilderResult } from "@/hooks/useDraftBuilder";
import { buildDraftPayload } from "@/lib/payload";
import { buildCc } from "@/lib/buildCc";
import { useToast } from "@/hooks/use-toast";
import type { ContactEmailComposer } from "@/types/emailComposer";
import type { ModuleStates } from "@/components/email-builder/ModulesCard";
import type { Article } from "@/types/emailComposer";
import type { MasterTemplate } from "@/lib/router";

// Helper functions for computed fields
const uniqueEmails = (arr: (string | null | undefined)[]) =>
  Array.from(
    new Set(
      (arr || [])
        .filter(Boolean)
        .map(x => String(x).trim())
        .filter(x => /\S+@\S+\.\S+/.test(x))
        .map(x => x.toLowerCase())
    )
  );

const joinOxford = (arr: string[]) => {
  const a = (arr || []).filter(Boolean).map(s => s.trim());
  if (a.length <= 1) return a.join('');
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

const cleanText = (s?: string) =>
  (s || '')
    .replace(/\uFFFD/g, '')          // remove �
    .replace(/\s+/g, ' ')
    .trim();

const computeEbitdaMode = (hsPresent: boolean, lsPresent: boolean, hasOther: boolean) => {
  if ((hsPresent || lsPresent) && hasOther) return '30to35m';
  if (hsPresent || lsPresent) return '30m';
  return '35m';
};

const bucketMRC = (iso?: string) => {
  if (!iso) return { bucket: 'a few months', month: '' };
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  let bucket = 'a few months';
  if (diffDays <= 14) bucket = 'a few weeks';
  else if (diffDays <= 60) bucket = 'a month';
  else if (diffDays <= 90) bucket = 'a couple of months';
  else if (diffDays <= 110) bucket = 'about three months';
  const month = d.toLocaleString('en-US', { month: 'long' });
  return { bucket, month };
};

const computeBlackout = (iso?: string) => {
  const dt = iso ? new Date(iso) : new Date();
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1; // 1-12
  const d = dt.getUTCDate();
  const day = dt.getUTCDay();     // 0 Sun - 6 Sat

  const isRange = (start: string, end: string) => {
    const s = new Date(start), e = new Date(end);
    return dt >= s && dt <= e;
  };

  const lastMondayInMay = (() => {
    const lastDay = new Date(Date.UTC(y, 4 + 1, 0)); // May has index 4
    const offset = (lastDay.getUTCDay() + 6) % 7; // back to Monday
    return new Date(Date.UTC(y, 4, lastDay.getUTCDate() - offset));
  })();

  const firstMondayInSep = (() => {
    const firstDay = new Date(Date.UTC(y, 8, 1)); // Sep
    const offset = (8 - firstDay.getUTCDay()) % 7;
    return new Date(Date.UTC(y, 8, 1 + offset));
  })();

  const thirdMondayInJan = (() => {
    const firstDay = new Date(Date.UTC(y, 0, 1));
    const offset = (8 - firstDay.getUTCDay()) % 7; // first Monday
    return new Date(Date.UTC(y, 0, 1 + offset + 14)); // +2 weeks
  })();

  const isSameUTCDate = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  let blocked = false, reason = '';

  // weekend
  if (day === 0 || day === 6) { blocked = true; reason = 'Weekend blackout'; }

  // July 2–6
  if (!blocked && isRange(`${y}-07-02T00:00:00Z`, `${y}-07-06T23:59:59Z`)) {
    blocked = true; reason = 'July 2–6 blackout';
  }

  // Dec 20 – Jan 5  (spans years; handle both)
  if (!blocked && (isRange(`${y}-12-20T00:00:00Z`, `${y}-12-31T23:59:59Z`) ||
                   isRange(`${y}-01-01T00:00:00Z`, `${y}-01-05T23:59:59Z`))) {
    blocked = true; reason = 'Holiday blackout (Dec 20–Jan 5)';
  }

  // Nov 11
  if (!blocked && m === 11 && d === 11) { blocked = true; reason = 'Nov 11 blackout'; }

  // fourth Tuesday in November → following Tuesday
  if (!blocked && m === 11) {
    const firstNov = new Date(Date.UTC(y, 10, 1));
    const firstTueOffset = (9 - firstNov.getUTCDay()) % 7; // to Tuesday
    const fourthTue = new Date(Date.UTC(y, 10, 1 + firstTueOffset + 21));
    const nextTue = new Date(Date.UTC(y, 10, fourthTue.getUTCDate() + 7));
    if (dt >= fourthTue && dt <= nextTue) {
      blocked = true; reason = 'Thanksgiving blackout (4th Tue → following Tue)';
    }
  }

  // last Monday in May & preceding Friday
  if (!blocked && m === 5) {
    const friBefore = new Date(lastMondayInMay); friBefore.setUTCDate(friBefore.getUTCDate() - 3);
    if (dt >= friBefore && dt <= lastMondayInMay) {
      blocked = true; reason = 'Memorial Day blackout (Fri + Mon)';
    }
  }

  // first Monday in September & preceding Friday
  if (!blocked && m === 9) {
    const friBefore = new Date(firstMondayInSep); friBefore.setUTCDate(friBefore.getUTCDate() - 3);
    if (dt >= friBefore && dt <= firstMondayInSep) {
      blocked = true; reason = 'Labor Day blackout (Fri + Mon)';
    }
  }

  // third Monday in January
  if (!blocked && isSameUTCDate(dt, thirdMondayInJan)) {
    blocked = true; reason = 'MLK Day blackout';
  }

  return { blocked, reason };
};

const computeSubject = (focusAreas: string[], org: string) => {
  if (!focusAreas?.length) return `LG / ${org || 'Organization'}`;
  // HS/LS slash handling
  const normalized = focusAreas.map(f => f.replace(/\s+/g, ' ').trim());
  if (normalized.length === 2 &&
      normalized.some(f => /^healthcare services/i.test(f)) &&
      normalized.some(f => /^life sciences/i.test(f))) {
    return `Healthcare Services/Life Sciences: LG / ${org || 'Organization'}`;
  }
  if (normalized.length === 1) {
    return `${normalized[0]}: LG / ${org || 'Organization'}`;
  }
  // 2 FAs generic
  return `${normalized[0]} & ${normalized[1]}: LG / ${org || 'Organization'}`;
};

interface DraftGenerateButtonProps {
  contactData: ContactEmailComposer | null;
  deltaType: 'Email' | 'Meeting';
  moduleStates: ModuleStates;
  selectedArticle: Article | null;
  masterTemplate: MasterTemplate | null;
}

export function DraftGenerateButton({
  contactData,
  deltaType,
  moduleStates,
  selectedArticle,
  masterTemplate
}: DraftGenerateButtonProps) {
  const [draftResult, setDraftResult] = useState<DraftBuilderResult | null>(null);
  const draftMutation = useDraftBuilder();
  const { toast } = useToast();

  // Validation - more robust checks
  const canGenerate = contactData && 
    contactData.email && 
    contactData.focus_areas && 
    contactData.focus_areas.length > 0 &&
    masterTemplate;
  
  const hasWarning = deltaType === 'Meeting' && 
    (!contactData?.assistant_emails || contactData.assistant_emails.length === 0);

  const handleGenerateDraft = async () => {
    if (!contactData || !canGenerate) return;

    // Clear previous result
    setDraftResult(null);

    try {
      // Build base payload first
      const basePayload = buildDraftPayload(contactData, {
        deltaType,
        moduleStates,
        selectedArticle,
        masterTemplate,
      });

      const c = contactData;
      const focus = basePayload.focus;
      const team = basePayload.team;
      const opportunities = basePayload.opportunities;
      const articles = basePayload.articles;
      const timing = basePayload.timing;
      const routing = basePayload.routing;
      const custom = basePayload.custom;

      // --- assistants only if Meeting
      const baseCC = uniqueEmails(
        (c.lg_emails_cc || '').split(/[;,]/g)
      );
      const leadCC = uniqueEmails(team.leadEmails || []);
      const assistantCC = uniqueEmails(team.assistantEmails || []);
      const ccFinal = uniqueEmails([
        ...baseCC,
        ...leadCC,
        ...(custom.deltaType === 'Meeting' ? assistantCC : []),
      ]).filter(e => e !== c.email.toLowerCase());
      const ccFinalString = ccFinal.join('; ');

      // --- FA description map + clean text
      const descByFA: Record<string, string> = {};
      (focus.faDescriptions || []).forEach((r: any) => {
        if (r?.focus_area) descByFA[r.focus_area] = cleanText(r.description);
      });

      // --- platform vs add-on split
      const platformFAs = (focus.faDescriptions || [])
        .filter((r: any) => /new platform/i.test(r.platform_type || ''))
        .map((r: any) => r.focus_area);
      const addonFAs = (focus.faDescriptions || [])
        .filter((r: any) => /add-?on/i.test(r.platform_type || ''))
        .map((r: any) => r.focus_area);

      // --- EBITDA mode
      const hasHS = focus.hs_present === true;
      const hasLS = focus.ls_present === true;
      const hasOther = !!(focus.focusAreas || []).some((fa: string) =>
        !/^healthcare services/i.test(fa) && !/^life sciences/i.test(fa)
      );
      const ebitdaMode = computeEbitdaMode(hasHS, hasLS, hasOther);

      // --- most recent contact bucket
      const { bucket: mrcBucket, month: mrcMonth } = bucketMRC(timing?.mostRecentContact);

      // --- opportunities flat
      const oppNames = (opportunities?.list || []).slice(0, custom?.maxOpps || 3).map((o: any) => o.deal_name).filter(Boolean);
      const oppsFlat = joinOxford(oppNames);

      // --- subject
      const subjectComputed = computeSubject(focus.focusAreas || [], c.organization || '');

      // --- blackout
      const blackout = computeBlackout(timing?.outreachDate);

      // --- article choice
      const articleChosen = custom?.chosenArticle || (articles?.[0]?.article_link || null);
      const insertArticleAfterGreeting = !!articleChosen;

      // --- assistant clause (Meeting only)
      const assistantClause = (custom.deltaType === 'Meeting' && (team.assistantNames || []).length)
        ? `${joinOxford(team.assistantNames)}${team.assistantNames.length > 1 ? '' : ''}, copied here, can assist with scheduling on our end.`
        : '';

      // --- sectors unique (lowercase)
      const sectorsUnique = Array.from(new Set((focus.sectors || []).map((s: string) => String(s).toLowerCase())));

      // Enhanced payload with computed helpers
      const payload = {
        contact: basePayload.contact,
        focus,
        team,
        opportunities,
        articles,
        timing,
        routing,
        custom,

        // NEW computed helpers:
        helpers: {
          ccFinal,
          ccFinalString,
          descByFA,
          platformFAs,
          addonFAs,
          ebitdaMode,
          mrcBucket,
          mrcMonth,
          oppsFlat,
          subjectComputed,
          blackout,
          articleChosen,
          insertArticleAfterGreeting,
          assistantClause,
          caseHuman: 'Case 7 — No GB — (1–2) FAs — Has Opps',
          sectorsUnique,
        },
      };

      console.log('Sending enriched payload to n8n Email-Builder webhook:', payload);

      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Email-Builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Received response from n8n Email-Builder webhook:', result);
      
      setDraftResult(result as DraftBuilderResult);
      
      toast({
        title: "Draft Generated Successfully",
        description: `Email draft created${result.send ? ' and ready to send' : ''}`,
      });
    } catch (error) {
      console.error('Failed to generate draft:', error);
      toast({
        title: "Draft Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate email draft",
        variant: "destructive",
      });
    }
  };

  const handleCopyToClipboard = async () => {
    if (!draftResult) return;

    const ccList = contactData ? buildCc(
      contactData.lg_emails_cc,
      contactData.lead_emails || [],
      contactData.assistant_emails || [],
      deltaType,
      contactData.email
    ) : '';

    const emailContent = [
      `Subject: ${draftResult.subject}`,
      `To: ${contactData?.email || ''}`,
      ccList ? `CC: ${ccList}` : '',
      '',
      draftResult.body
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(emailContent);
      toast({
        title: "Copied to Clipboard",
        description: "Email draft has been copied to your clipboard",
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Email Preview
          {draftResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Warnings */}
        {!canGenerate && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {!contactData && "Please select a contact. "}
              {contactData && !contactData.email && "Contact email required. "}
              {contactData && (!contactData.focus_areas || contactData.focus_areas.length === 0) && "At least one focus area required. "}
              {!masterTemplate && "Template routing required."}
            </span>
          </div>
        )}

        {hasWarning && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Meeting selected but no assistant emails found. CC list may be incomplete.
            </span>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerateDraft}
          disabled={!canGenerate || draftMutation.isPending}
          className="w-full"
          size="lg"
        >
          {draftMutation.isPending ? (
            "Generating Draft..."
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Generate Draft
            </>
          )}
        </Button>

        {/* Draft Result */}
        {draftMutation.isPending && (
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        )}

        {draftResult && (
          <div className="space-y-4">
            <Separator />
            
            {/* Send Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={
                draftResult.skip_reason ? "secondary" :
                draftResult.send ? "default" : "destructive"
              }>
                {draftResult.skip_reason ? "Blackout" :
                 draftResult.send ? "Ready to Send" : "Draft Only"}
              </Badge>
            </div>

            {/* Skip Reason */}
            {draftResult.skip_reason && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Skip Reason:</strong> {draftResult.skip_reason}
                </p>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject:</label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{draftResult.subject}</p>
              </div>
            </div>

            {/* CC Preview */}
            {contactData && (
              <div className="space-y-2">
                <label className="text-sm font-medium">CC:</label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {draftResult.cc || buildCc(
                      contactData.lg_emails_cc,
                      contactData.lead_emails || [],
                      contactData.assistant_emails || [],
                      deltaType,
                      contactData.email
                    ) || "No CC recipients"}
                  </p>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Body:</label>
              <div className="p-3 bg-muted rounded-lg max-h-80 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {draftResult.body}
                </pre>
              </div>
            </div>

            {/* Article Insertion Preview */}
            {selectedArticle && moduleStates.article_recommendations && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Article insertion:</strong> I came across this and thought to share: {selectedArticle.article_link}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}