import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, Mail, Calendar } from "lucide-react";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { formatDistanceToNow } from "date-fns";

interface IndividualContactAlertProps {
  contactFullName: string;
  lastContactDate: string;
  latestEmailDate: string | null;
  latestMeetingDate: string | null;
}

export function IndividualContactAlert({ 
  contactFullName, 
  lastContactDate,
  latestEmailDate,
  latestMeetingDate
}: IndividualContactAlertProps) {
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
  
  return (
    <Alert className="mb-4 border-amber-500/50 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/20 dark:to-amber-950/10">
      <ContactIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1">
        <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold">
          Last Contact: {daysSince} {daysSince === 1 ? 'day' : 'days'} ago
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-300">
          You {contactType} <span className="font-semibold">{contactFullName}</span> {formatDistanceToNow(lastContact, { addSuffix: true })}
        </AlertDescription>
      </div>
    </Alert>
  );
}
