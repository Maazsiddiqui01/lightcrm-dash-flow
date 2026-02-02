
-- Fix email_pipeline_contacts_v to use group_delta for group contacts
-- The bug: using individual delta for calculating overdue instead of group_delta when contact is in a group

-- Recreate email_pipeline_contacts_v with correct delta logic
CREATE OR REPLACE VIEW email_pipeline_contacts_v AS
WITH eligible AS (
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
        c.most_recent_contact,
        c.contact_type,
        c.total_of_contacts,
        c.of_emails,
        c.of_meetings,
        c.delta_type,
        c.delta,
        c.group_delta,
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
        c.group_focus_area,
        c.group_sector,
        c.group_notes,
        c.follow_up_days,
        c.follow_up_recency_threshold,
        c.follow_up_date,
        c.next_steps,
        c.next_steps_due_date,
        c.priority
    FROM contacts_raw c
    WHERE COALESCE(c.intentional_no_outreach, false) = false 
      AND c.delta IS NOT NULL 
      AND c.delta::numeric <> 0::numeric
), contact_enriched AS (
    SELECT c.id AS contact_id,
        c.full_name,
        c.first_name,
        c.email_address,
        c.organization,
        c.lg_focus_areas_comprehensive_list,
        c.most_recent_contact,
        c.most_recent_group_contact,
        NULLIF(TRIM(BOTH FROM c.group_contact), ''::text) AS group_contact,
        c.group_email_role,
        c.delta AS delta_individual,
        c.group_delta,
        -- FIX: Use group_delta when contact is in a group, otherwise individual delta
        CASE 
            WHEN NULLIF(TRIM(BOTH FROM c.group_contact), ''::text) IS NOT NULL 
            THEN COALESCE(c.group_delta, c.delta)
            ELSE c.delta 
        END AS effective_delta_days,
        CASE
            WHEN NULLIF(TRIM(BOTH FROM c.group_contact), ''::text) IS NOT NULL THEN 'G:'::text || NULLIF(TRIM(BOTH FROM c.group_contact), ''::text)
            ELSE 'I:'::text || c.id::text
        END AS entity_key,
        NULLIF(TRIM(BOTH FROM c.group_contact), ''::text) IS NOT NULL AS is_group
    FROM eligible c
), ranked_to AS (
    SELECT ce.contact_id,
        ce.full_name,
        ce.first_name,
        ce.email_address,
        ce.organization,
        ce.lg_focus_areas_comprehensive_list,
        ce.most_recent_contact,
        ce.most_recent_group_contact,
        ce.group_contact,
        ce.group_email_role,
        ce.effective_delta_days,
        ce.entity_key,
        ce.is_group,
        row_number() OVER (PARTITION BY ce.entity_key ORDER BY (
            CASE
                WHEN lower(COALESCE(ce.group_email_role, ''::text)) = 'to'::text THEN 0
                ELSE 1
            END), ce.contact_id) AS rn_to
    FROM contact_enriched ce
), group_to_recipients AS (
    SELECT ce.entity_key,
        string_agg(DISTINCT ce.email_address, '; '::text ORDER BY ce.email_address) FILTER (WHERE ce.email_address IS NOT NULL AND lower(COALESCE(ce.group_email_role, ''::text)) = 'to'::text) AS to_emails
    FROM contact_enriched ce
    GROUP BY ce.entity_key
), to_contact AS (
    SELECT r.entity_key,
        r.is_group,
        r.group_contact,
        r.contact_id AS to_contact_id,
        r.first_name,
        r.full_name,
        r.organization,
        r.lg_focus_areas_comprehensive_list AS to_focus_areas_raw,
        r.effective_delta_days AS delta_days,
        COALESCE(gtr.to_emails, r.email_address) AS to_emails
    FROM ranked_to r
    LEFT JOIN group_to_recipients gtr ON gtr.entity_key = r.entity_key
    WHERE r.rn_to = 1
), entity_dates AS (
    SELECT contact_enriched.entity_key,
        max(contact_enriched.most_recent_contact::date) AS max_individual_contact_date,
        max(contact_enriched.most_recent_group_contact::date) AS max_group_contact_date,
        GREATEST(max(contact_enriched.most_recent_group_contact::date), max(contact_enriched.most_recent_contact::date)) AS effective_last_contact_date
    FROM contact_enriched
    GROUP BY contact_enriched.entity_key
), valid_entities AS (
    SELECT entity_dates.entity_key,
        entity_dates.max_individual_contact_date,
        entity_dates.max_group_contact_date,
        entity_dates.effective_last_contact_date
    FROM entity_dates
    WHERE entity_dates.effective_last_contact_date IS NOT NULL
), group_recipients AS (
    SELECT ce.entity_key,
        string_agg(DISTINCT ce.email_address, '; '::text ORDER BY ce.email_address) FILTER (WHERE ce.email_address IS NOT NULL AND lower(COALESCE(ce.group_email_role, ''::text)) = 'cc'::text AND (ce.email_address <> ALL ((ARRAY( SELECT TRIM(BOTH FROM e.e) AS btrim
               FROM unnest(string_to_array(COALESCE(tc_1.to_emails, ''::text), ';'::text)) e(e)
              WHERE TRIM(BOTH FROM e.e) <> ''::text))))) AS group_cc_emails,
        string_agg(DISTINCT ce.email_address, '; '::text ORDER BY ce.email_address) FILTER (WHERE ce.email_address IS NOT NULL AND lower(COALESCE(ce.group_email_role, ''::text)) = 'bcc'::text AND (ce.email_address <> ALL ((ARRAY( SELECT TRIM(BOTH FROM e.e) AS btrim
               FROM unnest(string_to_array(COALESCE(tc_1.to_emails, ''::text), ';'::text)) e(e)
              WHERE TRIM(BOTH FROM e.e) <> ''::text))))) AS group_bcc_emails
    FROM contact_enriched ce
    JOIN to_contact tc_1 ON tc_1.entity_key = ce.entity_key
    GROUP BY ce.entity_key
), to_focus AS (
    SELECT tc_1.entity_key,
        TRIM(BOTH FROM x.x) AS focus_area,
        x.ordinality AS pos
    FROM to_contact tc_1
    CROSS JOIN LATERAL unnest(string_to_array(COALESCE(tc_1.to_focus_areas_raw, ''::text), ','::text)) WITH ORDINALITY x(x, ordinality)
    WHERE TRIM(BOTH FROM x.x) <> ''::text
), all_focus AS (
    SELECT ce.entity_key,
        TRIM(BOTH FROM x.x) AS focus_area
    FROM contact_enriched ce
    CROSS JOIN LATERAL unnest(string_to_array(COALESCE(ce.lg_focus_areas_comprehensive_list, ''::text), ','::text)) x(x)
    WHERE TRIM(BOTH FROM x.x) <> ''::text
), focus_rank AS (
    SELECT af.entity_key,
        af.focus_area,
        min(tf.pos) AS pos_in_to
    FROM all_focus af
    LEFT JOIN to_focus tf ON tf.entity_key = af.entity_key AND tf.focus_area = af.focus_area
    GROUP BY af.entity_key, af.focus_area
), focus_ranked AS (
    SELECT fr.entity_key,
        fr.focus_area,
        COALESCE(fr.pos_in_to::numeric, 1000::numeric + dense_rank() OVER (PARTITION BY fr.entity_key ORDER BY fr.focus_area)::numeric) AS sort_key
    FROM focus_rank fr
), focus_with_water AS (
    SELECT focus_ranked.entity_key,
        focus_ranked.focus_area,
        focus_ranked.sort_key
    FROM focus_ranked
    UNION ALL
    SELECT fr.entity_key,
        'Water'::text AS focus_area,
        min(fr.sort_key) + 0.5 AS sort_key
    FROM focus_ranked fr
    WHERE fr.focus_area = 'Industrial Services'::text AND NOT (EXISTS ( SELECT 1
               FROM focus_ranked x
              WHERE x.entity_key = fr.entity_key AND x.focus_area = 'Water'::text))
    GROUP BY fr.entity_key
), focus_final AS (
    SELECT t.entity_key,
        array_agg(t.focus_area ORDER BY t.sort_key, t.focus_area) AS focus_areas_ordered
    FROM ( SELECT DISTINCT focus_with_water.entity_key,
                focus_with_water.focus_area,
                focus_with_water.sort_key
               FROM focus_with_water) t
    GROUP BY t.entity_key
), general_bd_only AS (
    SELECT ff_1.entity_key,
        array_length(ff_1.focus_areas_ordered, 1) = 1 AND ff_1.focus_areas_ordered[1] = 'General BD'::text AS is_general_bd_only
    FROM focus_final ff_1
), focus_opening_parts AS (
    SELECT ff_1.entity_key,
        fa.focus_area,
        fa.ord,
        CASE
            WHEN fa.focus_area = 'General BD'::text THEN 'for new platform opportunities'::text
            WHEN fa.focus_area = 'Food Manufacturing'::text THEN 'a new platform in F&B'::text
            WHEN fa.focus_area = 'HC: Services (Non-Clinical)'::text THEN 'a new platform that provides non-clinical services to hospitals and health systems'::text
            ELSE 'a new platform in '::text || fa.focus_area
        END AS opening_fragment
    FROM focus_final ff_1
    CROSS JOIN LATERAL unnest(ff_1.focus_areas_ordered) WITH ORDINALITY fa(focus_area, ord)
), opening_phrase AS (
    SELECT fop.entity_key,
        CASE
            WHEN count(*) = 1 THEN max(fop.opening_fragment)
            WHEN count(*) = 2 THEN ((array_agg(fop.opening_fragment ORDER BY fop.ord))[1] || ' and '::text) || (array_agg(fop.opening_fragment ORDER BY fop.ord))[2]
            ELSE (array_to_string((array_agg(fop.opening_fragment ORDER BY fop.ord))[1:(count(*) - 1)], ', '::text) || ', and '::text) || (array_agg(fop.opening_fragment ORDER BY fop.ord))[count(*)]
        END AS opening_focus_phrase
    FROM focus_opening_parts fop
    GROUP BY fop.entity_key
), focus_blocks AS (
    SELECT ff_1.entity_key,
        jsonb_agg(jsonb_build_object('focus_area', fa.focus_area, 'focus_area_display',
            CASE
                WHEN fa.focus_area = 'Food Manufacturing'::text THEN 'F&B'::text
                ELSE fa.focus_area
            END, 'new_platform_description', COALESCE(np.description, ''::text), 'has_addons', COALESCE(ao_1.add_on_platforms, ''::text) <> ''::text, 'add_on_platforms', COALESCE(ao_1.add_on_platforms, ''::text), 'add_on_description', COALESCE(ao_1.add_on_description, ''::text)) ORDER BY fa.ord) AS focus_area_blocks
    FROM focus_final ff_1
    CROSS JOIN LATERAL unnest(ff_1.focus_areas_ordered) WITH ORDINALITY fa(focus_area, ord)
    LEFT JOIN LATERAL ( SELECT max(fad."Description") AS description
           FROM focus_area_description fad
          WHERE fad."LG Focus Area" = fa.focus_area AND lower(TRIM(BOTH FROM fad."Platform / Add-On")) = 'new platform'::text) np ON true
    LEFT JOIN LATERAL ( SELECT string_agg(DISTINCT fad."Existing Platform (for Add-Ons)", ', '::text ORDER BY fad."Existing Platform (for Add-Ons)") FILTER (WHERE fad."Existing Platform (for Add-Ons)" IS NOT NULL AND TRIM(BOTH FROM fad."Existing Platform (for Add-Ons)") <> ''::text) AS add_on_platforms,
            string_agg(fad."Description", ' '::text ORDER BY fad."Existing Platform (for Add-Ons)") AS add_on_description
           FROM focus_area_description fad
          WHERE fad."LG Focus Area" = fa.focus_area AND lower(TRIM(BOTH FROM fad."Platform / Add-On")) = 'add-on'::text) ao_1 ON true
    GROUP BY ff_1.entity_key
), lg_leads_cc AS (
    SELECT ce.entity_key,
        string_agg(DISTINCT llu.lead1_email, '; '::text ORDER BY llu.lead1_email) FILTER (WHERE llu.lead1_email IS NOT NULL AND TRIM(BOTH FROM llu.lead1_email) <> ''::text) AS lg_lead_cc_emails
    FROM contact_enriched ce
    CROSS JOIN LATERAL unnest(string_to_array(COALESCE(ce.lg_focus_areas_comprehensive_list, ''::text), ','::text)) fa(fa)
    LEFT JOIN lg_focus_area_directory llu ON llu.focus_area = TRIM(BOTH FROM fa.fa)
    GROUP BY ce.entity_key
), lg_leads_cc_final AS (
    SELECT gbo.entity_key,
        CASE
            WHEN gbo.is_general_bd_only = true THEN NULL::text
            ELSE ll.lg_lead_cc_emails
        END AS lg_lead_cc_emails
    FROM general_bd_only gbo
    LEFT JOIN lg_leads_cc ll ON ll.entity_key = gbo.entity_key
), entity_names AS (
    SELECT ce.entity_key,
        array_agg(DISTINCT lower(TRIM(BOTH FROM ce.full_name))) FILTER (WHERE ce.full_name IS NOT NULL AND TRIM(BOTH FROM ce.full_name) <> ''::text) AS member_full_names
    FROM contact_enriched ce
    GROUP BY ce.entity_key
), tier12_active_opps AS (
    SELECT en.entity_key,
        o.deal_name
    FROM entity_names en
    JOIN opportunities_raw o ON (lower(TRIM(BOTH FROM o.deal_source_individual_1)) = ANY (en.member_full_names)) OR (lower(TRIM(BOTH FROM o.deal_source_individual_2)) = ANY (en.member_full_names))
    WHERE lower(TRIM(BOTH FROM o.status)) = 'active'::text AND (TRIM(BOTH FROM o.tier) = ANY (ARRAY['1'::text, '2'::text]))
), agg_opps AS (
    SELECT tier12_active_opps.entity_key,
        count(*) AS tier12_active_count,
        string_agg(DISTINCT tier12_active_opps.deal_name, ', '::text ORDER BY tier12_active_opps.deal_name) AS tier12_active_list
    FROM tier12_active_opps
    GROUP BY tier12_active_opps.entity_key
)
SELECT tc.entity_key,
    tc.is_group,
    tc.group_contact,
    tc.to_contact_id,
    tc.first_name,
    tc.full_name,
    tc.to_emails,
    tc.organization,
    NULLIF(TRIM(BOTH ';'::text FROM concat_ws('; '::text, NULLIF(TRIM(BOTH FROM COALESCE(gr.group_cc_emails, ''::text)), ''::text), NULLIF(TRIM(BOTH FROM COALESCE(lcf.lg_lead_cc_emails, ''::text)), ''::text))), ''::text) AS cc_emails,
    NULLIF(TRIM(BOTH FROM COALESCE(gr.group_bcc_emails, ''::text)), ''::text) AS bcc_emails,
    ff.focus_areas_ordered,
    op.opening_focus_phrase,
    fb.focus_area_blocks,
    tc.delta_days,
    ve.effective_last_contact_date,
    ve.effective_last_contact_date + tc.delta_days AS next_due_date,
    ve.effective_last_contact_date + tc.delta_days - CURRENT_DATE AS days_until_due,
    CURRENT_DATE > (ve.effective_last_contact_date + tc.delta_days) AS is_overdue,
    GREATEST(CURRENT_DATE - (ve.effective_last_contact_date + tc.delta_days), 0) AS overdue_days,
    COALESCE(ao.tier12_active_count, 0::bigint) AS tier12_active_count,
    COALESCE(ao.tier12_active_count, 0::bigint) > 0 AS has_tier12_active_opps,
    COALESCE(ao.tier12_active_list, ''::text) AS tier12_active_list,
    ve.max_group_contact_date,
    ve.max_individual_contact_date
FROM to_contact tc
JOIN valid_entities ve ON ve.entity_key = tc.entity_key
LEFT JOIN group_recipients gr ON gr.entity_key = tc.entity_key
LEFT JOIN focus_final ff ON ff.entity_key = tc.entity_key
LEFT JOIN opening_phrase op ON op.entity_key = tc.entity_key
LEFT JOIN focus_blocks fb ON fb.entity_key = tc.entity_key
LEFT JOIN lg_leads_cc_final lcf ON lcf.entity_key = tc.entity_key
LEFT JOIN agg_opps ao ON ao.entity_key = tc.entity_key;

-- Recreate the dependent view
CREATE OR REPLACE VIEW automated_outreach_queue_v AS
WITH pipeline_contacts AS (
    SELECT email_pipeline_contacts_v.entity_key,
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
    WHERE email_pipeline_contacts_v.delta_days IS NOT NULL AND email_pipeline_contacts_v.delta_days > 0 AND (email_pipeline_contacts_v.effective_last_contact_date IS NULL OR email_pipeline_contacts_v.effective_last_contact_date < (CURRENT_DATE - '1 day'::interval))
), focus_area_descriptions AS (
    SELECT pc.to_contact_id,
        COALESCE(jsonb_agg(jsonb_build_object('focusArea', fad_1."LG Focus Area", 'description', fad_1."Description", 'sector', fad_1."LG Sector", 'platformAddon', fad_1."Platform / Add-On")) FILTER (WHERE fad_1."LG Focus Area" IS NOT NULL), '[]'::jsonb) AS focus_area_descriptions,
        array_agg(DISTINCT fad_1."LG Focus Area") FILTER (WHERE fad_1."Platform / Add-On" = 'New Platform'::text) AS platforms,
        array_agg(DISTINCT fad_1."LG Focus Area") FILTER (WHERE fad_1."Platform / Add-On" = 'Add-On'::text) AS addons,
        bool_or(fad_1."LG Focus Area" ~~* '%insurance services%'::text) AS has_insurance_services
    FROM pipeline_contacts pc
    LEFT JOIN focus_area_description fad_1 ON fad_1."LG Focus Area" = ANY (pc.focus_areas_ordered)
    GROUP BY pc.to_contact_id
), active_opportunities AS (
    SELECT pc.to_contact_id,
        COALESCE(jsonb_agg(jsonb_build_object('id', o.id, 'dealName', o.deal_name, 'ebitda', o.ebitda_in_ms, 'tier', o.tier, 'status', o.status, 'sector', o.sector, 'updatedAt', o.updated_at) ORDER BY o.updated_at DESC NULLS LAST, o.deal_name) FILTER (WHERE o.id IS NOT NULL), '[]'::jsonb) AS opportunities_json
    FROM pipeline_contacts pc
    LEFT JOIN contacts_raw cr ON cr.id = pc.to_contact_id
    LEFT JOIN opportunities_raw o ON (o.deal_source_individual_1 = cr.full_name OR o.deal_source_individual_2 = cr.full_name) AND o.status = 'Active'::text AND o.tier = '1'::text
    GROUP BY pc.to_contact_id
), available_articles AS (
    SELECT pc.to_contact_id,
        COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'focusArea', a.focus_area, 'link', a.article_link, 'title', a."Title", 'lastDate', a.last_date_to_use) ORDER BY a.added_date DESC) FILTER (WHERE a.id IS NOT NULL AND a.added_date >= (now() - '180 days'::interval)), '[]'::jsonb) AS articles_json
    FROM pipeline_contacts pc
    LEFT JOIN articles a ON a.focus_area = ANY (pc.focus_areas_ordered)
    GROUP BY pc.to_contact_id
), leads_assistants AS (
    SELECT pc.to_contact_id,
        array_agg(DISTINCT dir.lead1_email) FILTER (WHERE dir.lead1_email IS NOT NULL) AS lead1_emails,
        array_agg(DISTINCT dir.lead2_email) FILTER (WHERE dir.lead2_email IS NOT NULL) AS lead2_emails,
        array_agg(DISTINCT dir.assistant_email) FILTER (WHERE dir.assistant_email IS NOT NULL) AS assistant_emails,
        array_agg(DISTINCT dir.lead1_name) FILTER (WHERE dir.lead1_name IS NOT NULL) AS lead_names,
        array_agg(DISTINCT dir.assistant_name) FILTER (WHERE dir.assistant_name IS NOT NULL) AS assistant_names
    FROM pipeline_contacts pc
    LEFT JOIN lg_focus_area_directory dir ON dir.focus_area = ANY (pc.focus_areas_ordered)
    GROUP BY pc.to_contact_id
), contact_metadata AS (
    SELECT contacts_raw.id AS contact_id,
        contacts_raw.delta_type,
        contacts_raw.group_email_role,
        contacts_raw.email_address AS primary_email
    FROM contacts_raw
), ranked_contacts AS (
    SELECT pc.entity_key,
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
            WHEN pc.days_until_due <= 7 THEN 1
            WHEN pc.days_until_due <= 14 THEN 2
            WHEN pc.days_until_due <= 30 THEN 3
            ELSE 4
        END AS urgency_tier,
        COALESCE(- pc.overdue_days, pc.days_until_due) AS sort_score
    FROM pipeline_contacts pc
), scheduled_contacts AS (
    SELECT ranked_contacts.entity_key,
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
        floor(((row_number() OVER (ORDER BY ranked_contacts.urgency_tier, ranked_contacts.sort_score) - 1) / 4)::double precision)::integer AS slot_number
    FROM ranked_contacts
)
SELECT sc.to_contact_id,
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
    sc.queue_position::integer AS queue_position,
    sc.slot_number,
    add_mwf_days(CURRENT_DATE, sc.slot_number) AS scheduled_date,
    CASE sc.urgency_tier
        WHEN 0 THEN 'Overdue'::text
        WHEN 1 THEN 'Due in 7 days'::text
        WHEN 2 THEN 'Due in 14 days'::text
        WHEN 3 THEN 'Due in 30 days'::text
        ELSE 'Future'::text
    END AS urgency_label
FROM scheduled_contacts sc
LEFT JOIN focus_area_descriptions fad ON fad.to_contact_id = sc.to_contact_id
LEFT JOIN active_opportunities ao ON ao.to_contact_id = sc.to_contact_id
LEFT JOIN available_articles aa ON aa.to_contact_id = sc.to_contact_id
LEFT JOIN leads_assistants la ON la.to_contact_id = sc.to_contact_id
LEFT JOIN contact_metadata cm ON cm.contact_id = sc.to_contact_id
ORDER BY sc.queue_position;
