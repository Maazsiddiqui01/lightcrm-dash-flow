import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, CheckCircle2 } from "lucide-react";

export function AutomaticScanBanner() {
  return (
    <Alert className="mb-6 border-primary/20 bg-primary/5">
      <CheckCircle2 className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        Automatic Scanning Enabled
        <Clock className="h-3 w-3 text-muted-foreground" />
      </AlertTitle>
      <AlertDescription className="text-sm">
        Duplicates are automatically detected in real-time when contacts are added or updated.
        Full fuzzy scans run daily at 2 AM, and exact match scans run every 6 hours.
        New duplicates will trigger notifications for affected users.
      </AlertDescription>
    </Alert>
  );
}
