-- Refresh the materialized view to pick up the updated data
REFRESH MATERIALIZED VIEW IF EXISTS ui_distinct_focus_areas_v;

-- Also make sure any dependent views are refreshed
-- Check if there are any other views that might be affected
DO $$
BEGIN
    -- Try to refresh any materialized views that might contain focus area data
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'contacts_app_view') THEN
        REFRESH MATERIALIZED VIEW contacts_app_view;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'focus_area_options_v') THEN
        REFRESH MATERIALIZED VIEW focus_area_options_v;
    END IF;
END $$;