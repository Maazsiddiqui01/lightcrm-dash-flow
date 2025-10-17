import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, Calendar } from "lucide-react";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface IndividualContactAlertProps {
  contactFullName: string;
  lastContactDate: string;
  latestEmailDate: string | null;
  latestMeetingDate: string | null;
  isLoading?: boolean;
}

export function IndividualContactAlert({ 
  contactFullName,
  lastContactDate,
  latestEmailDate,
  latestMeetingDate,
  isLoading = false
}: IndividualContactAlertProps) {
  // Show loading skeleton
  if (isLoading) {
    return (
      <Alert className="mb-4 border-muted bg-muted/30">
        <div className="flex items-start space-x-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </Alert>
    );
  }
  const lastContact = parseFlexibleDate(lastContactDate);
  
  if (!lastContact) return null;
  
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine actual most recent contact type by comparing timestamps
  const emailDate = latestEmailDate ? parseFlexibleDate(latestEmailDate)?.getTime() || 0 : 0;
  const meetingDate = latestMeetingDate ? parseFlexibleDate(latestMeetingDate)?.getTime() || 0 : 0;
  const lastContactTime = lastContact.getTime();
  
  // Start with the max timestamp logic
  let actualDeltaType: 'Email' | 'Meeting' = meetingDate > emailDate ? 'Meeting' : 'Email';
  
  // Tie-breaker: If both timestamps are within 12 hours of each other, 
  // choose the one that matches lastContactDate most closely (within 1 minute)
  if (emailDate > 0 && meetingDate > 0 && Math.abs(emailDate - meetingDate) <= 12 * 60 * 60 * 1000) {
    const emailDiff = Math.abs(emailDate - lastContactTime);
    const meetingDiff = Math.abs(meetingDate - lastContactTime);
    
    // If one is within 1 minute of lastContactDate, use that
    if (emailDiff < 60 * 1000 && emailDiff < meetingDiff) {
      actualDeltaType = 'Email';
    } else if (meetingDiff < 60 * 1000 && meetingDiff < emailDiff) {
      actualDeltaType = 'Meeting';
    }
  }
  
  const contactType = actualDeltaType === 'Email' ? 'emailed' : 'met with';
  const ContactIcon = actualDeltaType === 'Email' ? Mail : Calendar;
  
  const timeAgo = formatDistanceToNow(lastContact, { addSuffix: true });
  
  return (
    <Alert className="mb-4 border-green-500/50 bg-gradient-to-r from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10">
      <ContactIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
      <div className="space-y-1">
        <AlertTitle className="text-green-900 dark:text-green-200 font-semibold">
          Most Recent Contact
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-300">
          You {contactType}{' '}
          <span className="font-semibold">{contactFullName}</span>{' '}
          {timeAgo}. This is your latest recorded interaction with this contact.
        </AlertDescription>
      </div>
    </Alert>
  );
}
