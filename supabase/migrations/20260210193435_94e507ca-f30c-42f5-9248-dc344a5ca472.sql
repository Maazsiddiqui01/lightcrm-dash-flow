
-- Add a CTE to compute the effective most_recent_contact by looking at all contacts
-- that share email addresses via contact_email_addresses
CREATE OR REPLACE VIEW public.contacts_with_display_fields AS
WITH latest_next_steps AS (
  SELECT DISTINCT ON (contact_next_steps_timeline.contact_id)
    contact_next_steps_timeline.contact_id,
    contact_next_steps_timeline.content AS latest_next_steps_content,
    contact_next_steps_timeline.due_date AS latest_next_steps_due_date
  FROM contact_next_steps_timeline
  ORDER BY contact_next_steps_timeline.contact_id, contact_next_steps_timeline.created_at DESC
),
latest_notes AS (
  SELECT DISTINCT ON (contact_notes_timeline.contact_id)
    contact_notes_timeline.contact_id,
    contact_notes_timeline.content AS latest_notes_content
  FROM contact_notes_timeline
  WHERE contact_notes_timeline.field = 'notes'
  ORDER BY contact_notes_timeline.contact_id, contact_notes_timeline.created_at DESC
),
-- For each contact, find the max most_recent_contact across all contacts sharing emails via contact_email_addresses
linked_contact_dates AS (
  SELECT
    cea.contact_id,
    MAX(linked_cr.most_recent_contact) AS linked_most_recent_contact
  FROM contact_email_addresses cea
  JOIN contacts_raw linked_cr ON lower(linked_cr.email_address) = lower(cea.email_address)
  WHERE linked_cr.most_recent_contact IS NOT NULL
  GROUP BY cea.contact_id
)
SELECT c.id,
    c.days_since_last_email,
    c.days_since_last_meeting,
    c.full_name,
    c.title,
    c.organization,
    c.areas_of_specialization,
    c.lg_focus_areas_comprehensive_list,
    c.notes,
    c.latest_contact_email,
    c.email_subject,
    c.latest_contact_meeting,
    c.meeting_title,
    GREATEST(c.most_recent_contact, lcd.linked_most_recent_contact) AS most_recent_contact,
    c.contact_type,
    c.total_of_contacts,
    c.of_emails,
    c.of_meetings,
    c.delta_type,
    c.delta,
    c.lg_sector,
    c.email_address,
    c.first_name,
    c.last_name,
    c.lg_focus_area_1,
    c.lg_focus_area_2,
    c.lg_focus_area_3,
    c.lg_focus_area_4,
    c.lg_focus_area_5,
    c.lg_focus_area_6,
    c.lg_focus_area_7,
    c.lg_focus_area_8,
    c.category,
    c.phone,
    c.no_of_lg_focus_areas,
    c.all_opps,
    c.no_of_opps_sourced,
    c.url_to_online_bio,
    c.email_from,
    c.email_to,
    c.email_cc,
    c.meeting_from,
    c.meeting_to,
    c.meeting_cc,
    c.all_emails,
    c.created_at,
    c.updated_at,
    c.city,
    c.state,
    c.lg_lead,
    c.lg_assistant,
    c.group_contact,
    c.linkedin_url,
    c.outreach_date,
    c.intentional_no_outreach,
    c.intentional_no_outreach_date,
    c.intentional_no_outreach_note,
    c.x_twitter_url,
    c.most_recent_group_contact,
    c.group_email_role,
    c.assigned_to,
    c.created_by,
    c.organization_id,
    c.locked_by,
    c.locked_until,
    c.lock_reason,
    c.group_delta,
    c.group_focus_area,
    c.group_sector,
    c.group_notes,
    c.follow_up_days,
    c.follow_up_recency_threshold,
    c.follow_up_date,
    c.next_steps,
    c.next_steps_due_date,
    c.priority,
    COALESCE(NULLIF(TRIM(BOTH FROM c.next_steps), ''), lns.latest_next_steps_content) AS next_steps_display,
    COALESCE(NULLIF(TRIM(BOTH FROM c.notes), ''), ln.latest_notes_content) AS notes_display,
    COALESCE(c.next_steps_due_date, lns.latest_next_steps_due_date) AS next_steps_due_date_display
FROM contacts_raw c
LEFT JOIN latest_next_steps lns ON lns.contact_id = c.id
LEFT JOIN latest_notes ln ON ln.contact_id = c.id
LEFT JOIN linked_contact_dates lcd ON lcd.contact_id = c.id;
