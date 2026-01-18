-- Create helper function to add business days (skip weekends)
CREATE OR REPLACE FUNCTION add_business_days(start_date DATE, num_days INT)
RETURNS DATE AS $$
DECLARE
  current_date_val DATE := start_date;
  days_added INT := 0;
BEGIN
  IF num_days = 0 THEN
    RETURN start_date;
  END IF;
  
  WHILE days_added < num_days LOOP
    current_date_val := current_date_val + 1;
    -- Skip Saturday (6) and Sunday (0)
    IF EXTRACT(DOW FROM current_date_val) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  
  RETURN current_date_val;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create comprehensive automated outreach queue view
CREATE OR REPLACE VIEW automated_outreach_queue_v AS
WITH 
-- Get base pipeline contacts with cadence data
pipeline_contacts AS (
  SELECT *
  FROM email_pipeline_contacts_v
  WHERE delta_days IS NOT NULL
    AND delta_days > 0
),

-- Get focus area descriptions for each contact
focus_area_descriptions AS (
  SELECT 
    pc.to_contact_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'focusArea', fad."LG Focus Area",
          'description', fad."Description",
          'sector', fad."LG Sector",
          'platformAddon', fad."Platform / Add-On"
        )
      ) FILTER (WHERE fad."LG Focus Area" IS NOT NULL),
      '[]'::jsonb
    ) as focus_area_descriptions,
    -- Separate platforms and add-ons
    array_agg(DISTINCT fad."LG Focus Area") 
      FILTER (WHERE fad."Platform / Add-On" = 'New Platform') as platforms,
    array_agg(DISTINCT fad."LG Focus Area") 
      FILTER (WHERE fad."Platform / Add-On" = 'Add-On') as addons,
    -- Insurance Services flag
    bool_or(fad."LG Focus Area" ILIKE '%insurance services%') as has_insurance_services
  FROM pipeline_contacts pc
  LEFT JOIN focus_area_description fad 
    ON fad."LG Focus Area" = ANY(pc.focus_areas_ordered)
  GROUP BY pc.to_contact_id
),

-- Get active tier 1 opportunities
active_opportunities AS (
  SELECT 
    pc.to_contact_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'dealName', o.deal_name,
          'ebitda', o.ebitda_in_ms,
          'tier', o.tier,
          'status', o.status,
          'sector', o.sector,
          'updatedAt', o.updated_at
        )
        ORDER BY o.updated_at DESC NULLS LAST, o.deal_name
      ) FILTER (WHERE o.id IS NOT NULL),
      '[]'::jsonb
    ) as opportunities_json
  FROM pipeline_contacts pc
  LEFT JOIN contacts_raw cr ON cr.id = pc.to_contact_id
  LEFT JOIN opportunities_raw o ON (
    (o.deal_source_individual_1 = cr.full_name OR o.deal_source_individual_2 = cr.full_name)
    AND o.status = 'Active' 
    AND o.tier = '1'
  )
  GROUP BY pc.to_contact_id
),

-- Get available articles (last 180 days)
available_articles AS (
  SELECT 
    pc.to_contact_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'focusArea', a.focus_area,
          'link', a.article_link,
          'title', a."Title",
          'lastDate', a.last_date_to_use
        )
        ORDER BY a.added_date DESC
      ) FILTER (WHERE a.id IS NOT NULL AND a.added_date >= NOW() - INTERVAL '180 days'),
      '[]'::jsonb
    ) as articles_json
  FROM pipeline_contacts pc
  LEFT JOIN articles a ON a.focus_area = ANY(pc.focus_areas_ordered)
  GROUP BY pc.to_contact_id
),

-- Get leads and assistants from directory
leads_assistants AS (
  SELECT 
    pc.to_contact_id,
    array_agg(DISTINCT dir.lead1_email) FILTER (WHERE dir.lead1_email IS NOT NULL) as lead1_emails,
    array_agg(DISTINCT dir.lead2_email) FILTER (WHERE dir.lead2_email IS NOT NULL) as lead2_emails,
    array_agg(DISTINCT dir.assistant_email) FILTER (WHERE dir.assistant_email IS NOT NULL) as assistant_emails,
    array_agg(DISTINCT dir.lead1_name) FILTER (WHERE dir.lead1_name IS NOT NULL) as lead_names,
    array_agg(DISTINCT dir.assistant_name) FILTER (WHERE dir.assistant_name IS NOT NULL) as assistant_names
  FROM pipeline_contacts pc
  LEFT JOIN lg_focus_area_directory dir ON dir.focus_area = ANY(pc.focus_areas_ordered)
  GROUP BY pc.to_contact_id
),

-- Get delta type and group email role from contacts_raw
contact_metadata AS (
  SELECT 
    id as contact_id,
    delta_type,
    group_email_role,
    email_address as primary_email
  FROM contacts_raw
),

-- Rank and schedule contacts
ranked_contacts AS (
  SELECT 
    pc.*,
    -- Urgency tier for prioritization
    CASE 
      WHEN pc.is_overdue THEN 0
      WHEN pc.days_until_due <= 7 THEN 1
      WHEN pc.days_until_due <= 14 THEN 2
      WHEN pc.days_until_due <= 30 THEN 3
      ELSE 4
    END as urgency_tier,
    COALESCE(-pc.overdue_days, pc.days_until_due) as sort_score
  FROM pipeline_contacts pc
),

scheduled_contacts AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      ORDER BY urgency_tier ASC, sort_score ASC
    ) as queue_position,
    FLOOR((ROW_NUMBER() OVER (
      ORDER BY urgency_tier ASC, sort_score ASC
    ) - 1) / 4)::int as slot_number
  FROM ranked_contacts
)

SELECT 
  -- Core identifiers
  sc.to_contact_id,
  sc.entity_key,
  sc.is_group,
  sc.group_contact,
  
  -- Contact info
  sc.full_name,
  sc.first_name,
  sc.organization,
  cm.primary_email,
  cm.group_email_role,
  
  -- Recipients
  sc.to_emails,
  sc.cc_emails,
  sc.bcc_emails,
  
  -- Focus areas (raw array and full descriptions)
  sc.focus_areas_ordered,
  sc.focus_area_blocks,
  fad.focus_area_descriptions,
  fad.platforms,
  fad.addons,
  fad.has_insurance_services,
  
  -- Opportunities
  sc.has_tier12_active_opps,
  sc.tier12_active_count,
  sc.tier12_active_list,
  ao.opportunities_json,
  
  -- Articles
  aa.articles_json,
  
  -- Leads and assistants (for CC)
  la.lead1_emails,
  la.lead2_emails,
  la.assistant_emails,
  la.lead_names,
  la.assistant_names,
  
  -- Cadence data
  cm.delta_type,
  sc.delta_days,
  sc.next_due_date,
  sc.days_until_due,
  sc.overdue_days,
  sc.is_overdue,
  sc.effective_last_contact_date,
  
  -- Scheduling columns
  sc.urgency_tier,
  sc.queue_position::int,
  sc.slot_number,
  add_business_days(CURRENT_DATE, sc.slot_number) as scheduled_date,
  
  -- Human-readable urgency
  CASE sc.urgency_tier
    WHEN 0 THEN 'Overdue'
    WHEN 1 THEN 'Due in 7 days'
    WHEN 2 THEN 'Due in 14 days'
    WHEN 3 THEN 'Due in 30 days'
    ELSE 'Future'
  END as urgency_label

FROM scheduled_contacts sc
LEFT JOIN focus_area_descriptions fad ON fad.to_contact_id = sc.to_contact_id
LEFT JOIN active_opportunities ao ON ao.to_contact_id = sc.to_contact_id
LEFT JOIN available_articles aa ON aa.to_contact_id = sc.to_contact_id
LEFT JOIN leads_assistants la ON la.to_contact_id = sc.to_contact_id
LEFT JOIN contact_metadata cm ON cm.contact_id = sc.to_contact_id

ORDER BY sc.queue_position;