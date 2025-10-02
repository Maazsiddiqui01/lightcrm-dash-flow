import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { Users, Mail, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const { data: groupMembers, isLoading: loadingMembers } = useGroupMembers(groupName);

  // Fetch full interaction history for each group member
  const { data: memberInteractions, isLoading: loadingInteractions } = useQuery({
    queryKey: ['group-member-interactions', groupName],
    queryFn: async () => {
      if (!groupName || !groupMembers?.all || groupMembers.all.length === 0) return [];

      // Get all email addresses from the group
      const memberEmails = groupMembers.all
        .map(m => m.email_address?.toLowerCase())
        .filter(Boolean);
      
      if (memberEmails.length === 0) return [];
      
      // Query interactions where any group member's email appears
      const { data, error } = await supabase
        .from('interactions_app')
        .select('from_name, from_email, to_names, to_emails, cc_emails, all_emails, source, occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(500); // Limit to recent interactions

      if (error) {
        console.error('Error fetching group interactions:', error);
        throw error;
      }

      // Filter locally to find interactions involving group members
      const filteredData = (data || []).filter(interaction => {
        const allEmails = (interaction.all_emails || '').toLowerCase();
        return memberEmails.some(email => allEmails && allEmails.includes(email));
      });

      return filteredData;
    },
    enabled: !!groupName && !!groupMembers?.all && groupMembers.all.length > 0,
  });

  // Don't show anything while loading
  if (loadingMembers || loadingInteractions) return null;
  
  // Safety checks - only require groupMembers to exist
  if (!groupMembers || !groupMembers.all || groupMembers.all.length === 0) return null;

  const now = new Date();
  const groupLastContact = parseFlexibleDate(groupLastContactDate);
  
  // Calculate days since group contact
  let daysSinceGroupContact = 0;
  let hasGroupContact = false;
  
  if (groupLastContact) {
    daysSinceGroupContact = Math.floor(
      (now.getTime() - groupLastContact.getTime()) / (1000 * 60 * 60 * 24)
    );
    hasGroupContact = true;
  }

  // Find all group members who have been contacted since the group last contact date
  let recentContacts: Array<{ name: string; contactType: string; daysAgo: number; icon: 'email' | 'meeting' }> = [];
  
  if (memberInteractions && groupLastContact) {
    recentContacts = groupMembers.all
      .filter(member => member.full_name && member.full_name !== contactFullName) // Exclude the selected contact
      .map(member => {
        // Safety check for email
        if (!member.email_address) return null;
        
        // Get most recent interaction for this member by email
        const memberEmail = member.email_address.toLowerCase();
        const memberInteractionRecords = memberInteractions.filter(i => {
          const allEmails = (i.all_emails || '').toLowerCase();
          return allEmails && allEmails.includes(memberEmail);
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
          const isMeeting = mostRecentInteraction.source?.toLowerCase() === 'meeting';
          const contactType = isMeeting ? 'met with' : 'emailed';

          return {
            name: member.full_name,
            contactType,
            daysAgo,
            icon: isMeeting ? 'meeting' as const : 'email' as const,
          };
        }

        return null;
      })
      .filter(Boolean) as Array<{ name: string; contactType: string; daysAgo: number; icon: 'email' | 'meeting' }>;

    // Sort by most recent first
    recentContacts.sort((a, b) => a.daysAgo - b.daysAgo);
  }

  return (
    <Alert className="mb-4 border-blue-500/50 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10">
      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <AlertTitle className="text-blue-900 dark:text-blue-200 font-semibold">
            Group Contact
          </AlertTitle>
          <Badge variant="secondary" className="text-xs">
            {groupMembers.all.length} {groupMembers.all.length === 1 ? 'member' : 'members'}
          </Badge>
        </div>
        
        <AlertDescription className="text-blue-800 dark:text-blue-300 space-y-2">
          {hasGroupContact ? (
            <div>
              Last group email sent <span className="font-semibold">{daysSinceGroupContact} {daysSinceGroupContact === 1 ? 'day' : 'days'} ago</span>
            </div>
          ) : (
            <div className="font-medium">No group email sent yet</div>
          )}
          
          {recentContacts.length > 0 && (
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium mb-1.5">Recent individual contacts:</div>
              <div className="space-y-1">
                {recentContacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {contact.icon === 'email' ? (
                      <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                    <span>
                      You {contact.contactType} <span className="font-semibold">{contact.name}</span> {contact.daysAgo} {contact.daysAgo === 1 ? 'day' : 'days'} ago
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}
