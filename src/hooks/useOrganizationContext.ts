import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrgPastContact {
  contactName: string;
  daysAgo: number;
  deltaType: 'Email' | 'Meeting';
  subject: string;
  noContactFound?: boolean;
}

export interface OrgUpcomingMeeting {
  meetingDate: Date;
  attendeeNames: string[];
  subject: string;
}

export function useOrganizationContext(
  contactId: string | null,
  organization: string | null,
  emailDomain: string | null
) {
  // Query 1: Recent past contact in same organization
  const pastContactQuery = useQuery({
    queryKey: ['org-past-contact', contactId, organization, emailDomain],
    queryFn: async () => {
      if (!contactId || (!organization && !emailDomain)) return null;

      // Build organization match condition - select both email and meeting timestamps
      let query = supabase
        .from('contacts_raw')
        .select('full_name, most_recent_contact, latest_contact_email, latest_contact_meeting, email_subject, meeting_title, email_address')
        .neq('id', contactId)
        .not('most_recent_contact', 'is', null)
        .gte('most_recent_contact', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('most_recent_contact', { ascending: false })
        .limit(1);

      // Match by organization name or email domain
      if (organization) {
        query = query.ilike('organization', organization);
      } else if (emailDomain) {
        query = query.ilike('email_address', `%@${emailDomain}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        // Return a special object indicating no contact found
        return {
          contactName: '',
          daysAgo: 90,
          deltaType: 'Email' as const,
          subject: '',
          noContactFound: true
        } as OrgPastContact;
      }

      const contact = data[0];
      const mostRecentDate = new Date(contact.most_recent_contact!);
      const daysAgo = Math.floor((Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine actual most recent contact type by comparing timestamps
      const emailDate = contact.latest_contact_email 
        ? new Date(contact.latest_contact_email).getTime() 
        : 0;
      const meetingDate = contact.latest_contact_meeting 
        ? new Date(contact.latest_contact_meeting).getTime() 
        : 0;
      
      let actualDeltaType: 'Email' | 'Meeting' = 'Email';
      let actualSubject = '';
      
      if (meetingDate > emailDate) {
        actualDeltaType = 'Meeting';
        actualSubject = contact.meeting_title || 'Untitled Meeting';
      } else {
        actualDeltaType = 'Email';
        actualSubject = contact.email_subject || 'No Subject';
      }

      return {
        contactName: contact.full_name || 'Unknown',
        daysAgo,
        deltaType: actualDeltaType,
        subject: actualSubject
      } as OrgPastContact;
    },
    enabled: !!contactId && (!!organization || !!emailDomain),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Query 2: Upcoming meetings with same organization
  const upcomingMeetingQuery = useQuery({
    queryKey: ['org-upcoming-meeting', organization, emailDomain],
    queryFn: async () => {
      if (!organization && !emailDomain) return null;

      // First, get all contacts from the same organization
      let contactsQuery = supabase
        .from('contacts_raw')
        .select('email_address, full_name');

      if (organization) {
        contactsQuery = contactsQuery.ilike('organization', organization);
      } else if (emailDomain) {
        contactsQuery = contactsQuery.ilike('email_address', `%@${emailDomain}`);
      }

      const { data: orgContacts, error: contactsError } = await contactsQuery;
      
      if (contactsError) throw contactsError;
      if (!orgContacts || orgContacts.length === 0) return null;

      // Extract email addresses
      const orgEmails = orgContacts
        .map(c => c.email_address?.toLowerCase())
        .filter(Boolean) as string[];

      if (orgEmails.length === 0) return null;

      // Find upcoming meetings with these email addresses
      const { data: meetings, error: meetingsError } = await supabase
        .from('emails_meetings_raw')
        .select('subject, occurred_at, emails_arr')
        .ilike('source', '%meeting%')
        .gt('occurred_at', new Date().toISOString())
        .lte('occurred_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: true })
        .limit(10);

      if (meetingsError) throw meetingsError;
      if (!meetings || meetings.length === 0) return null;

      // Find first meeting that includes any org contact
      for (const meeting of meetings) {
        const meetingEmails = (meeting.emails_arr || []).map(e => e.toLowerCase());
        const matchingOrgEmails = meetingEmails.filter(e => orgEmails.includes(e));
        
        if (matchingOrgEmails.length > 0) {
          // Get names of matching attendees
          const attendeeNames = orgContacts
            .filter(c => matchingOrgEmails.includes(c.email_address?.toLowerCase()))
            .map(c => c.full_name)
            .filter(Boolean) as string[];

          return {
            meetingDate: new Date(meeting.occurred_at!),
            attendeeNames,
            subject: meeting.subject || 'Untitled Meeting'
          } as OrgUpcomingMeeting;
        }
      }

      return null;
    },
    enabled: !!organization || !!emailDomain,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    pastContact: pastContactQuery.data,
    upcomingMeeting: upcomingMeetingQuery.data,
    isLoading: pastContactQuery.isLoading || upcomingMeetingQuery.isLoading
  };
}
