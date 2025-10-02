import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { AlertCircle } from "lucide-react";

interface GroupContactAlertProps {
  groupName: string;
  contactFullName: string;
  groupLastContactDate: string | null;
  deltaDays: number;
}

export function GroupContactAlert({ 
  groupName, 
  contactFullName,
  groupLastContactDate,
  deltaDays 
}: GroupContactAlertProps) {
  const { data: groupMembers } = useGroupMembers(groupName);

  // Fetch full interaction history for each group member
  const { data: memberInteractions } = useQuery({
    queryKey: ['group-member-interactions', groupName],
    queryFn: async () => {
      if (!groupName || !groupMembers?.all || groupMembers.all.length === 0) return [];

      // Get all email addresses from the group
      const memberEmails = groupMembers.all.map(m => m.email_address.toLowerCase());
      
      // Query interactions where any group member's email appears
      const { data, error } = await supabase
        .from('interactions_app')
        .select('from_name, from_email, to_names, to_emails, cc_emails, all_emails, source, occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(500); // Limit to recent interactions

      if (error) throw error;

      // Filter locally to find interactions involving group members
      const filteredData = (data || []).filter(interaction => {
        const allEmails = (interaction.all_emails || '').toLowerCase();
        return memberEmails.some(email => allEmails.includes(email));
      });

      return filteredData;
    },
    enabled: !!groupName && !!groupMembers?.all && groupMembers.all.length > 0,
  });

  if (!groupMembers || !groupLastContactDate || !memberInteractions) return null;

  const now = new Date();
  const groupLastContact = parseFlexibleDate(groupLastContactDate);
  
  if (!groupLastContact) return null;

  const daysSinceGroupContact = Math.floor(
    (now.getTime() - groupLastContact.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Find all group members who have been contacted since the group last contact date
  const recentContacts = groupMembers.all
    .filter(member => member.full_name !== contactFullName) // Exclude the selected contact
    .map(member => {
      // Get most recent interaction for this member by email
      const memberEmail = member.email_address.toLowerCase();
      const memberInteractionRecords = memberInteractions.filter(i => {
        const allEmails = (i.all_emails || '').toLowerCase();
        return allEmails.includes(memberEmail);
      });

      if (memberInteractionRecords.length === 0) return null;

      const mostRecentInteraction = memberInteractionRecords[0]; // Already sorted by date desc
      const interactionDate = parseFlexibleDate(mostRecentInteraction.occurred_at);
      
      if (!interactionDate) return null;

      const daysAgo = Math.floor(
        (now.getTime() - interactionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only include if:
      // 1. Contacted more recently than the group last contact
      // 2. Within the delta period
      if (interactionDate > groupLastContact && daysAgo < deltaDays) {
        const contactType = mostRecentInteraction.source?.toLowerCase() === 'meeting' 
          ? 'MET WITH' 
          : 'EMAILED';

        return {
          name: member.full_name,
          contactType,
          daysAgo,
        };
      }

      return null;
    })
    .filter(Boolean) as Array<{ name: string; contactType: string; daysAgo: number }>;

  // Don't show alert if no recent contacts
  if (recentContacts.length === 0) return null;

  // Sort by most recent first
  recentContacts.sort((a, b) => a.daysAgo - b.daysAgo);

  // Build the notification message
  const contactsList = recentContacts
    .map(c => `YOU ${c.contactType} ${c.name.toUpperCase()} ${c.daysAgo} ${c.daysAgo === 1 ? 'DAY' : 'DAYS'} AGO`)
    .join(', AND ');

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertDescription className="font-bold text-amber-900 dark:text-amber-200">
        GROUP CONTACT NOTIFICATION: IT HAS BEEN {daysSinceGroupContact} {daysSinceGroupContact === 1 ? 'DAY' : 'DAYS'} SINCE YOU EMAILED THIS GROUP CONTACT LIST, BUT {contactsList}.
      </AlertDescription>
    </Alert>
  );
}
