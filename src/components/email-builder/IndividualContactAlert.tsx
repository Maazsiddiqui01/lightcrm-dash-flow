import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, Mail, Calendar } from "lucide-react";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { formatDistanceToNow } from "date-fns";

interface IndividualContactAlertProps {
  contactFullName: string;
  lastContactDate: string;
  deltaType: 'Email' | 'Meeting';
}

export function IndividualContactAlert({ 
  contactFullName, 
  lastContactDate,
  deltaType 
}: IndividualContactAlertProps) {
  const lastContact = parseFlexibleDate(lastContactDate);
  
  if (!lastContact) return null;
  
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  
  const contactType = deltaType === 'Email' ? 'emailed' : 'met with';
  const ContactIcon = deltaType === 'Email' ? Mail : Calendar;
  
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
