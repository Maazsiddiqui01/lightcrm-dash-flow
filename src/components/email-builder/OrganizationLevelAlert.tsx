import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, Calendar, Info } from "lucide-react";
import { format } from "date-fns";
import type { OrgPastContact, OrgUpcomingMeeting } from "@/hooks/useOrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";

interface OrganizationLevelAlertProps {
  pastContact?: OrgPastContact | null;
  upcomingMeeting?: OrgUpcomingMeeting | null;
  currentOrgName: string;
  isLoading?: boolean;
}

export function OrganizationLevelAlert({ 
  pastContact, 
  upcomingMeeting,
  currentOrgName,
  isLoading = false
}: OrganizationLevelAlertProps) {
  // Show loading skeleton
  if (isLoading) {
    return (
      <Alert className="mb-4 border-muted bg-muted/30">
        <div className="flex items-start space-x-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </Alert>
    );
  }

  // Handle no contact found case
  if (pastContact?.noContactFound && !upcomingMeeting) {
    return (
      <Alert className="mb-4 border-muted bg-muted/30">
        <Info className="h-4 w-4 text-muted-foreground" />
        <AlertTitle className="text-muted-foreground font-medium">No Recent Contact</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground mt-1">
          No recorded interactions with <span className="font-semibold">{currentOrgName}</span> in the last 90 days. 
          This could be a great opportunity to reconnect.
        </AlertDescription>
      </Alert>
    );
  }

  // Prioritize upcoming meeting if it's within 7 days, otherwise show past contact
  const showUpcoming = upcomingMeeting && 
    upcomingMeeting.meetingDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  // Show upcoming meeting alert (higher priority if soon)
  if (showUpcoming && upcomingMeeting) {
    const daysUntil = Math.ceil((upcomingMeeting.meetingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return (
      <Alert className="mb-4 border-purple-500/50 bg-gradient-to-r from-purple-50 to-purple-50/50 dark:from-purple-950/20 dark:to-purple-950/10">
        <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <div className="space-y-1">
          <AlertTitle className="text-purple-900 dark:text-purple-200 font-semibold">
            Upcoming Meeting {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} Days`}
          </AlertTitle>
          <AlertDescription className="text-purple-800 dark:text-purple-300">
            You have a meeting scheduled with{' '}
            <span className="font-semibold">{upcomingMeeting.attendeeNames.join(', ')}</span> from{' '}
            <span className="font-semibold">{currentOrgName}</span> regarding{' '}
            <span className="italic">"{upcomingMeeting.subject}"</span>{' '}
            on <span className="font-semibold">{format(upcomingMeeting.meetingDate, 'MMM d, yyyy')}</span>.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  // Show past contact alert
  if (pastContact && !pastContact.noContactFound) {
    const contactVerb = pastContact.deltaType === 'Email' ? 'emailed' : 'met with';
    const timeframe = pastContact.daysAgo <= 7 ? 'recently' : pastContact.daysAgo <= 30 ? 'this month' : 'within the last 90 days';
    
    return (
      <Alert className="mb-4 border-blue-500/50 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10">
        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <AlertTitle className="text-blue-900 dark:text-blue-200 font-semibold">
            Recent Organization Contact ({timeframe})
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            You {contactVerb}{' '}
            <span className="font-semibold">{pastContact.contactName}</span> from{' '}
            <span className="font-semibold">{currentOrgName}</span> regarding{' '}
            <span className="italic">"{pastContact.subject}"</span>{' '}
            <span className="font-semibold">{pastContact.daysAgo}</span> {pastContact.daysAgo === 1 ? 'day' : 'days'} ago.
            Other contacts at this organization may already be aware of this conversation.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return null;
}
