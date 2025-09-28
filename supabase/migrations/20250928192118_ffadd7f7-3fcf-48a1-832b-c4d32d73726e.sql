-- Create functions to compute dynamic contact interaction dates

-- Function to get latest email interaction for a contact
CREATE OR REPLACE FUNCTION public.get_latest_contact_email(p_email text)
RETURNS timestamp with time zone
LANGUAGE sql STABLE
AS $$
  SELECT MAX(occurred_at)
  FROM public.interactions_parsed
  WHERE emails_arr @> array[lower(trim(p_email))]
    AND source ILIKE '%email%'
$$;

-- Function to get latest meeting interaction for a contact
CREATE OR REPLACE FUNCTION public.get_latest_contact_meeting(p_email text)
RETURNS timestamp with time zone
LANGUAGE sql STABLE
AS $$
  SELECT MAX(occurred_at)
  FROM public.interactions_parsed
  WHERE emails_arr @> array[lower(trim(p_email))]
    AND source ILIKE '%meeting%'
$$;

-- Function to get most recent contact (max of email/meeting)
CREATE OR REPLACE FUNCTION public.get_most_recent_contact_dynamic(p_email text)
RETURNS timestamp with time zone
LANGUAGE sql STABLE
AS $$
  SELECT GREATEST(
    public.get_latest_contact_email(p_email),
    public.get_latest_contact_meeting(p_email)
  )
$$;

-- Create view with dynamic interaction columns that replaces static ones
CREATE OR REPLACE VIEW public.contacts_with_dynamic_interactions AS
SELECT 
  c.id,
  c.full_name,
  c.first_name,
  c.last_name,
  c.email_address,
  c.title,
  c.organization,
  c.phone,
  c.url_to_online_bio,
  c.linkedin_url,
  c.x_twitter_url,
  c.category,
  c.contact_type,
  c.lg_sector,
  c.areas_of_specialization,
  c.lg_focus_areas_comprehensive_list,
  c.lg_focus_area_1,
  c.lg_focus_area_2,
  c.lg_focus_area_3,
  c.lg_focus_area_4,
  c.lg_focus_area_5,
  c.lg_focus_area_6,
  c.lg_focus_area_7,
  c.lg_focus_area_8,
  c.no_of_lg_focus_areas,
  c.lg_lead,
  c.lg_assistant,
  c.delta_type,
  c.delta,
  c.outreach_date,
  c.intentional_no_outreach,
  c.intentional_no_outreach_date,
  c.intentional_no_outreach_note,
  c.notes,
  c.group_contact,
  c.state,
  c.city,
  c.total_of_contacts,
  c.of_emails,
  c.of_meetings,
  c.days_since_last_email,
  c.days_since_last_meeting,
  c.email_subject,
  c.meeting_title,
  c.email_from,
  c.email_to,
  c.email_cc,
  c.meeting_from,
  c.meeting_to,
  c.meeting_cc,
  c.all_emails,
  c.no_of_opps_sourced,
  c.all_opps,
  c.created_at,
  c.updated_at,
  -- Dynamic computed columns replace static ones
  public.get_latest_contact_email(c.email_address) as latest_contact_email,
  public.get_latest_contact_meeting(c.email_address) as latest_contact_meeting,
  public.get_most_recent_contact_dynamic(c.email_address) as most_recent_contact
FROM public.contacts_raw c;