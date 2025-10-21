import { GroupContactView } from '@/types/contact';

export interface GroupEmailPayload {
  group_name: string;
  max_lag_days: number | null;
  member_count: number;
  to_members: Array<{
    id: string;
    full_name: string;
    email_address: string;
    title: string | null;
    organization: string | null;
  }>;
  cc_members: Array<{
    id: string;
    full_name: string;
    email_address: string;
    title: string | null;
    organization: string | null;
  }>;
  bcc_members: Array<{
    id: string;
    full_name: string;
    email_address: string;
    title: string | null;
    organization: string | null;
  }>;
  opportunities: string[];
  opportunity_count: number;
  focus_areas: string[];
  sectors: string[];
  most_recent_contact: string | null;
  most_recent_email: string | null;
  most_recent_meeting: string | null;
  next_outreach_date: string | null;
}

export function buildGroupEmailPayload(group: GroupContactView): GroupEmailPayload {
  const toMembers = group.members.filter(m => m.group_email_role === 'to');
  const ccMembers = group.members.filter(m => m.group_email_role === 'cc');
  const bccMembers = group.members.filter(m => m.group_email_role === 'bcc');
  
  return {
    group_name: group.group_name,
    max_lag_days: group.max_lag_days,
    member_count: group.member_count,
    to_members: toMembers.map(m => ({
      id: m.contact_id,
      full_name: m.full_name,
      email_address: m.email_address,
      title: m.title,
      organization: m.organization,
    })),
    cc_members: ccMembers.map(m => ({
      id: m.contact_id,
      full_name: m.full_name,
      email_address: m.email_address,
      title: m.title,
      organization: m.organization,
    })),
    bcc_members: bccMembers.map(m => ({
      id: m.contact_id,
      full_name: m.full_name,
      email_address: m.email_address,
      title: m.title,
      organization: m.organization,
    })),
    opportunities: group.opportunities ? group.opportunities.split(',').map(o => o.trim()) : [],
    opportunity_count: group.opportunity_count,
    focus_areas: group.all_focus_areas ? group.all_focus_areas.split(',').map(f => f.trim()) : [],
    sectors: group.all_sectors ? group.all_sectors.split(',').map(s => s.trim()) : [],
    most_recent_contact: group.most_recent_contact,
    most_recent_email: group.most_recent_email,
    most_recent_meeting: group.most_recent_meeting,
    next_outreach_date: group.next_outreach_date,
  };
}
