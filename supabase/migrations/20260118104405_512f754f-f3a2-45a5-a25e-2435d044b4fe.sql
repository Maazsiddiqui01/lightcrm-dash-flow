-- Create function to find the next MWF date
CREATE OR REPLACE FUNCTION next_mwf_date(start_date DATE)
RETURNS DATE AS $$
DECLARE
  dow INT := EXTRACT(DOW FROM start_date);
BEGIN
  -- DOW: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  CASE dow
    WHEN 1 THEN RETURN start_date;      -- Monday -> Monday
    WHEN 3 THEN RETURN start_date;      -- Wednesday -> Wednesday
    WHEN 5 THEN RETURN start_date;      -- Friday -> Friday
    WHEN 0 THEN RETURN start_date + 1;  -- Sunday -> Monday
    WHEN 2 THEN RETURN start_date + 1;  -- Tuesday -> Wednesday
    WHEN 4 THEN RETURN start_date + 1;  -- Thursday -> Friday
    WHEN 6 THEN RETURN start_date + 2;  -- Saturday -> Monday
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to add N MWF days
CREATE OR REPLACE FUNCTION add_mwf_days(start_date DATE, num_slots INT)
RETURNS DATE AS $$
DECLARE
  current_date_val DATE := next_mwf_date(start_date);
  slots_added INT := 0;
BEGIN
  IF num_slots = 0 THEN
    RETURN current_date_val;  -- Returns next MWF (including today if MWF)
  END IF;
  
  WHILE slots_added < num_slots LOOP
    current_date_val := current_date_val + 1;
    -- Only count Monday (1), Wednesday (3), Friday (5)
    IF EXTRACT(DOW FROM current_date_val) IN (1, 3, 5) THEN
      slots_added := slots_added + 1;
    END IF;
  END LOOP;
  
  RETURN current_date_val;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop and recreate the view with MWF scheduling and safety buffer
DROP VIEW IF EXISTS automated_outreach_queue_v;

CREATE OR REPLACE VIEW automated_outreach_queue_v AS
WITH pipeline_contacts AS (
  SELECT 
    email_pipeline_contacts_v.entity_key,
    email_pipeline_contacts_v.is_group,
    email_pipeline_contacts_v.group_contact,
    email_pipeline_contacts_v.to_contact_id,
    email_pipeline_contacts_v.first_name,
    email_pipeline_contacts_v.full_name,
    email_pipeline_contacts_v.to_emails,
    email_pipeline_contacts_v.organization,
    email_pipeline_contacts_v.cc_emails,
    email_pipeline_contacts_v.bcc_emails,
    email_pipeline_contacts_v.focus_areas_ordered,
    email_pipeline_contacts_v.opening_focus_phrase,
    email_pipeline_contacts_v.focus_area_blocks,
    email_pipeline_contacts_v.delta_days,
    email_pipeline_contacts_v.effective_last_contact_date,
    email_pipeline_contacts_v.next_due_date,
    email_pipeline_contacts_v.days_until_due,
    email_pipeline_contacts_v.is_overdue,
    email_pipeline_contacts_v.overdue_days,
    email_pipeline_contacts_v.tier12_active_count,
    email_pipeline_contacts_v.has_tier12_active_opps,
    email_pipeline_contacts_v.tier12_active_list,
    email_pipeline_contacts_v.max_group_contact_date,
    email_pipeline_contacts_v.max_individual_contact_date
  FROM email_pipeline_contacts_v
  WHERE (email_pipeline_contacts_v.delta_days IS NOT NULL) 
    AND (email_pipeline_contacts_v.delta_days > 0)
    -- Safety buffer: exclude contacts with recent contact (within last day)
    AND (
      email_pipeline_contacts_v.effective_last_contact_date IS NULL 
      OR email_pipeline_contacts_v.effective_last_contact_date::date < CURRENT_DATE - INTERVAL '1 day'
    )
),
focus_area_descriptions AS (
  SELECT 
    pc.to_contact_id,
    COALESCE(jsonb_agg(jsonb_build_object('focusArea', fad."LG Focus Area", 'description', fad."Description", 'sector', fad."LG Sector", 'platformAddon', fad."Platform / Add-On")) FILTER (WHERE (fad."LG Focus Area" IS NOT NULL)), '[]'::jsonb) AS focus_area_descriptions,
    array_agg(DISTINCT fad."LG Focus Area") FILTER (WHERE (fad."Platform / Add-On" = 'New Platform'::text)) AS platforms,
    array_agg(DISTINCT fad."LG Focus Area") FILTER (WHERE (fad."Platform / Add-On" = 'Add-On'::text)) AS addons,
    bool_or((fad."LG Focus Area" ~~* '%insurance services%'::text)) AS has_insurance_services
  FROM pipeline_contacts pc
  LEFT JOIN focus_area_description fad ON (fad."LG Focus Area" = ANY (pc.focus_areas_ordered))
  GROUP BY pc.to_contact_id
),
active_opportunities AS (
  SELECT 
    pc.to_contact_id,
    COALESCE(jsonb_agg(jsonb_build_object('id', o.id, 'dealName', o.deal_name, 'ebitda', o.ebitda_in_ms, 'tier', o.tier, 'status', o.status, 'sector', o.sector, 'updatedAt', o.updated_at) ORDER BY o.updated_at DESC NULLS LAST, o.deal_name) FILTER (WHERE (o.id IS NOT NULL)), '[]'::jsonb) AS opportunities_json
  FROM pipeline_contacts pc
  LEFT JOIN contacts_raw cr ON (cr.id = pc.to_contact_id)
  LEFT JOIN opportunities_raw o ON (((o.deal_source_individual_1 = cr.full_name) OR (o.deal_source_individual_2 = cr.full_name)) AND (o.status = 'Active'::text) AND (o.tier = '1'::text))
  GROUP BY pc.to_contact_id
),
available_articles AS (
  SELECT 
    pc.to_contact_id,
    COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'focusArea', a.focus_area, 'link', a.article_link, 'title', a."Title", 'lastDate', a.last_date_to_use) ORDER BY a.added_date DESC) FILTER (WHERE ((a.id IS NOT NULL) AND (a.added_date >= (now() - '180 days'::interval)))), '[]'::jsonb) AS articles_json
  FROM pipeline_contacts pc
  LEFT JOIN articles a ON (a.focus_area = ANY (pc.focus_areas_ordered))
  GROUP BY pc.to_contact_id
),
leads_assistants AS (
  SELECT 
    pc.to_contact_id,
    array_agg(DISTINCT dir.lead1_email) FILTER (WHERE (dir.lead1_email IS NOT NULL)) AS lead1_emails,
    array_agg(DISTINCT dir.lead2_email) FILTER (WHERE (dir.lead2_email IS NOT NULL)) AS lead2_emails,
    array_agg(DISTINCT dir.assistant_email) FILTER (WHERE (dir.assistant_email IS NOT NULL)) AS assistant_emails,
    array_agg(DISTINCT dir.lead1_name) FILTER (WHERE (dir.lead1_name IS NOT NULL)) AS lead_names,
    array_agg(DISTINCT dir.assistant_name) FILTER (WHERE (dir.assistant_name IS NOT NULL)) AS assistant_names
  FROM pipeline_contacts pc
  LEFT JOIN lg_focus_area_directory dir ON (dir.focus_area = ANY (pc.focus_areas_ordered))
  GROUP BY pc.to_contact_id
),
contact_metadata AS (
  SELECT 
    contacts_raw.id AS contact_id,
    contacts_raw.delta_type,
    contacts_raw.group_email_role,
    contacts_raw.email_address AS primary_email
  FROM contacts_raw
),
ranked_contacts AS (
  SELECT 
    pc.entity_key,
    pc.is_group,
    pc.group_contact,
    pc.to_contact_id,
    pc.first_name,
    pc.full_name,
    pc.to_emails,
    pc.organization,
    pc.cc_emails,
    pc.bcc_emails,
    pc.focus_areas_ordered,
    pc.opening_focus_phrase,
    pc.focus_area_blocks,
    pc.delta_days,
    pc.effective_last_contact_date,
    pc.next_due_date,
    pc.days_until_due,
    pc.is_overdue,
    pc.overdue_days,
    pc.tier12_active_count,
    pc.has_tier12_active_opps,
    pc.tier12_active_list,
    pc.max_group_contact_date,
    pc.max_individual_contact_date,
    CASE
      WHEN pc.is_overdue THEN 0
      WHEN (pc.days_until_due <= 7) THEN 1
      WHEN (pc.days_until_due <= 14) THEN 2
      WHEN (pc.days_until_due <= 30) THEN 3
      ELSE 4
    END AS urgency_tier,
    COALESCE((- pc.overdue_days), pc.days_until_due) AS sort_score
  FROM pipeline_contacts pc
),
scheduled_contacts AS (
  SELECT 
    ranked_contacts.entity_key,
    ranked_contacts.is_group,
    ranked_contacts.group_contact,
    ranked_contacts.to_contact_id,
    ranked_contacts.first_name,
    ranked_contacts.full_name,
    ranked_contacts.to_emails,
    ranked_contacts.organization,
    ranked_contacts.cc_emails,
    ranked_contacts.bcc_emails,
    ranked_contacts.focus_areas_ordered,
    ranked_contacts.opening_focus_phrase,
    ranked_contacts.focus_area_blocks,
    ranked_contacts.delta_days,
    ranked_contacts.effective_last_contact_date,
    ranked_contacts.next_due_date,
    ranked_contacts.days_until_due,
    ranked_contacts.is_overdue,
    ranked_contacts.overdue_days,
    ranked_contacts.tier12_active_count,
    ranked_contacts.has_tier12_active_opps,
    ranked_contacts.tier12_active_list,
    ranked_contacts.max_group_contact_date,
    ranked_contacts.max_individual_contact_date,
    ranked_contacts.urgency_tier,
    ranked_contacts.sort_score,
    row_number() OVER (ORDER BY ranked_contacts.urgency_tier, ranked_contacts.sort_score) AS queue_position,
    (floor((((row_number() OVER (ORDER BY ranked_contacts.urgency_tier, ranked_contacts.sort_score) - 1) / 4))::double precision))::integer AS slot_number
  FROM ranked_contacts
)
SELECT 
  sc.to_contact_id,
  sc.entity_key,
  sc.is_group,
  sc.group_contact,
  sc.full_name,
  sc.first_name,
  sc.organization,
  cm.primary_email,
  cm.group_email_role,
  sc.to_emails,
  sc.cc_emails,
  sc.bcc_emails,
  sc.focus_areas_ordered,
  sc.focus_area_blocks,
  fad.focus_area_descriptions,
  fad.platforms,
  fad.addons,
  fad.has_insurance_services,
  sc.has_tier12_active_opps,
  sc.tier12_active_count,
  sc.tier12_active_list,
  ao.opportunities_json,
  aa.articles_json,
  la.lead1_emails,
  la.lead2_emails,
  la.assistant_emails,
  la.lead_names,
  la.assistant_names,
  cm.delta_type,
  sc.delta_days,
  sc.next_due_date,
  sc.days_until_due,
  sc.overdue_days,
  sc.is_overdue,
  sc.effective_last_contact_date,
  sc.urgency_tier,
  (sc.queue_position)::integer AS queue_position,
  sc.slot_number,
  -- Use MWF scheduling instead of business days
  add_mwf_days(CURRENT_DATE, sc.slot_number) AS scheduled_date,
  CASE sc.urgency_tier
    WHEN 0 THEN 'Overdue'::text
    WHEN 1 THEN 'Due in 7 days'::text
    WHEN 2 THEN 'Due in 14 days'::text
    WHEN 3 THEN 'Due in 30 days'::text
    ELSE 'Future'::text
  END AS urgency_label
FROM scheduled_contacts sc
LEFT JOIN focus_area_descriptions fad ON (fad.to_contact_id = sc.to_contact_id)
LEFT JOIN active_opportunities ao ON (ao.to_contact_id = sc.to_contact_id)
LEFT JOIN available_articles aa ON (aa.to_contact_id = sc.to_contact_id)
LEFT JOIN leads_assistants la ON (la.to_contact_id = sc.to_contact_id)
LEFT JOIN contact_metadata cm ON (cm.contact_id = sc.to_contact_id)
ORDER BY sc.queue_position;