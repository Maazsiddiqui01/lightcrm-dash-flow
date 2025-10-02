import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock } from "lucide-react";
import { parseFlexibleDate } from "@/utils/dateUtils";

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
  
  const contactType = deltaType === 'Email' ? 'EMAILED' : 'MET WITH';
  const daysText = daysSince === 1 ? 'DAY' : 'DAYS';
  
  return (
    <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="font-bold text-amber-900 dark:text-amber-200">
        IT HAS BEEN {daysSince} {daysText} SINCE YOU {contactType} {contactFullName.toUpperCase()}
      </AlertDescription>
    </Alert>
  );
}
