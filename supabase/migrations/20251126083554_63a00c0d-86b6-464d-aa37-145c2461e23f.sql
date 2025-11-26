-- Drop and recreate opportunities_with_display_fields view with priority column
DROP VIEW IF EXISTS opportunities_with_display_fields;

CREATE VIEW opportunities_with_display_fields AS
SELECT 
    id,
    lg_focus_area,
    sector,
    platform_add_on,
    next_steps,
    deal_name,
    tier,
    url,
    summary_of_opportunity,
    ebitda_in_ms,
    ebitda,
    ebitda_notes,
    ownership,
    ownership_type,
    investment_professional_point_person_1,
    investment_professional_point_person_2,
    deal_source_company,
    deal_source_individual_1,
    deal_source_individual_2,
    date_of_origination,
    status,
    most_recent_notes,
    dealcloud,
    created_at,
    updated_at,
    revenue,
    est_deal_size,
    est_lg_equity_invest,
    last_modified,
    headquarters,
    deal_source_contacts,
    investment_professional_point_person_3,
    investment_professional_point_person_4,
    lg_team,
    "Process Timeline",
    process_timeline,
    next_steps_due_date,
    funds,
    acquisition_date,
    assigned_to,
    created_by,
    organization_id,
    deal_source_contact_1_id,
    deal_source_contact_2_id,
    priority,
    COALESCE(NULLIF(TRIM(BOTH FROM next_steps), ''), 
        (SELECT content FROM opportunity_notes_timeline 
         WHERE opportunity_id = o.id AND field = 'next_steps' 
         ORDER BY created_at DESC LIMIT 1)
    ) AS next_steps_display,
    COALESCE(NULLIF(TRIM(BOTH FROM most_recent_notes), ''), 
        (SELECT content FROM opportunity_notes_timeline 
         WHERE opportunity_id = o.id AND field = 'most_recent_notes' 
         ORDER BY created_at DESC LIMIT 1)
    ) AS notes_display,
    COALESCE(next_steps_due_date, 
        (SELECT due_date FROM opportunity_notes_timeline 
         WHERE opportunity_id = o.id AND field = 'next_steps' 
         ORDER BY created_at DESC LIMIT 1)
    ) AS next_steps_due_date_display
FROM opportunities_raw o;