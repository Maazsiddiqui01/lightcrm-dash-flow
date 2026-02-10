
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
          WHERE COALESCE(c.intentional_no_outreach, false) = false AND c.delta IS NOT NULL AND c.delta::numeric <> 0::numeric
        ),
-- NEW CTE: Get most recent contact date across all linked email addresses
linked_contact_dates AS (
  SELECT
    cea.contact_id,
    MAX(cr.most_recent_contact::date) AS linked_most_recent_contact
  FROM contact_email_addresses cea
  JOIN contacts_raw cr ON cr.email_address = cea.email_address
  WHERE cr.most_recent_contact IS NOT NULL
  GROUP BY cea.contact_id
),
contact_enriched AS (
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
                CASE
                    WHEN NULLIF(TRIM(BOTH FROM c.group_contact), ''::text) IS NOT NULL THEN COALESCE(c.group_delta, c.delta)
                    ELSE c.delta
                END AS effective_delta_days,
                CASE
                    WHEN NULLIF(TRIM(BOTH FROM c.group_contact), ''::text) IS NOT NULL THEN 'G:'::text || NULLIF(TRIM(BOTH FROM c.group_contact), ''::text)
                    ELSE 'I:'::text || c.id::text
                END AS entity_key,
            NULLIF(TRIM(BOTH FROM c.group_contact), ''::text) IS NOT NULL AS is_group,
            lcd.linked_most_recent_contact
           FROM eligible c
           LEFT JOIN linked_contact_dates lcd ON lcd.contact_id = c.id
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
            ce.linked_most_recent_contact,
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
            GREATEST(
              max(contact_enriched.most_recent_group_contact::date),
              max(contact_enriched.most_recent_contact::date),
              max(contact_enriched.linked_most_recent_contact)
            ) AS effective_last_contact_date
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
