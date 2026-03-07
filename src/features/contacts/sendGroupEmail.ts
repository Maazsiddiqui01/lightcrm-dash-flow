import { supabase } from '@/integrations/supabase/client';
import { callN8nProxy } from '@/lib/n8nProxy';

export async function sendGroupEmail(groupId: string) {
  // 1. Fetch full group data from get_group_contacts_view RPC
  const { data: groupsData, error: groupError } = await supabase.rpc('get_group_contacts_view');
  
  if (groupError) throw groupError;
  
  // 2. Find the specific group
  const groupData = groupsData.find((g: any) => g.group_id === groupId);
  if (!groupData) throw new Error('Group not found');
  
  // 3. Parse members if they're in string format
  const members = typeof groupData.members === 'string' 
    ? JSON.parse(groupData.members) 
    : (Array.isArray(groupData.members) ? groupData.members : []);
  
  // 4. Build comprehensive payload
  const payload = {
    group_id: groupData.group_id,
    group_name: groupData.group_name,
    max_lag_days: groupData.max_lag_days,
    most_recent_contact: groupData.most_recent_contact,
    most_recent_email: groupData.most_recent_email,
    most_recent_meeting: groupData.most_recent_meeting,
    next_outreach_date: groupData.next_outreach_date,
    days_since_last_contact: groupData.days_since_last_contact,
    days_over_under_max_lag: groupData.days_over_under_max_lag,
    is_overdue: groupData.is_overdue,
    is_over_max_lag: groupData.is_over_max_lag,
    
    // Member information
    member_count: groupData.member_count,
    member_names: groupData.member_names,
    
    // Detailed member lists by role
    to_members: members
      .filter((m: any) => m.group_email_role === 'to')
      .map((m: any) => ({
        contact_id: m.contact_id,
        full_name: m.full_name,
        email_address: m.email_address,
        title: m.title,
        organization: m.organization,
        most_recent_contact: m.most_recent_contact,
      })),
    
    cc_members: members
      .filter((m: any) => m.group_email_role === 'cc')
      .map((m: any) => ({
        contact_id: m.contact_id,
        full_name: m.full_name,
        email_address: m.email_address,
        title: m.title,
        organization: m.organization,
        most_recent_contact: m.most_recent_contact,
      })),
    
    bcc_members: members
      .filter((m: any) => m.group_email_role === 'bcc')
      .map((m: any) => ({
        contact_id: m.contact_id,
        full_name: m.full_name,
        email_address: m.email_address,
        title: m.title,
        organization: m.organization,
        most_recent_contact: m.most_recent_contact,
      })),
    
    // Opportunities
    opportunities: groupData.opportunities ? groupData.opportunities.split(',').map((o: string) => o.trim()) : [],
    opportunity_count: groupData.opportunity_count,
    
    // Focus areas and sectors
    focus_areas: groupData.all_focus_areas ? groupData.all_focus_areas.split(',').map((f: string) => f.trim()) : [],
    sectors: groupData.all_sectors ? groupData.all_sectors.split(',').map((s: string) => s.trim()) : [],
    group_focus_area: groupData.group_focus_area,
    group_sector: groupData.group_sector,
    
    // Additional metadata
    group_notes: groupData.group_notes,
    assigned_to: groupData.assigned_to,
    created_by: groupData.created_by,
    group_created_at: groupData.group_created_at,
    last_updated: groupData.last_updated,
  };
  
  // 5. POST to n8n via authenticated proxy
  return callN8nProxy('group-contact', payload);
}
