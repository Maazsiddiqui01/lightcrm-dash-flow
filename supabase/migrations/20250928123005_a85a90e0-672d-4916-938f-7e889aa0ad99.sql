-- Create function to calculate dynamic leads and assistants for a contact
CREATE OR REPLACE FUNCTION public.calculate_contact_leads_and_assistants(
  p_focus_areas_list text
) RETURNS TABLE(leads text, assistants text)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  focus_areas_array text[];
  unique_leads text[];
  unique_assistants text[];
  fa text;
BEGIN
  -- Initialize arrays
  unique_leads := '{}';
  unique_assistants := '{}';
  
  -- Return empty if no focus areas
  IF p_focus_areas_list IS NULL OR trim(p_focus_areas_list) = '' THEN
    RETURN QUERY SELECT ''::text, ''::text;
    RETURN;
  END IF;
  
  -- Split focus areas by comma and clean them
  focus_areas_array := string_to_array(p_focus_areas_list, ',');
  
  -- Process each focus area
  FOREACH fa IN ARRAY focus_areas_array LOOP
    fa := trim(fa);
    IF fa != '' THEN
      -- Add leads from this focus area
      SELECT array_agg(DISTINCT lead_name) 
      INTO unique_leads
      FROM (
        SELECT unnest(unique_leads) AS lead_name
        UNION
        SELECT lead1_name FROM lg_focus_area_directory WHERE focus_area = fa AND lead1_name IS NOT NULL
        UNION 
        SELECT lead2_name FROM lg_focus_area_directory WHERE focus_area = fa AND lead2_name IS NOT NULL
      ) t
      WHERE lead_name IS NOT NULL AND trim(lead_name) != '';
      
      -- Add assistants from this focus area  
      SELECT array_agg(DISTINCT assistant_name)
      INTO unique_assistants
      FROM (
        SELECT unnest(unique_assistants) AS assistant_name
        UNION
        SELECT assistant_name FROM lg_focus_area_directory WHERE focus_area = fa AND assistant_name IS NOT NULL
      ) t
      WHERE assistant_name IS NOT NULL AND trim(assistant_name) != '';
    END IF;
  END LOOP;
  
  -- Return comma-separated unique values
  RETURN QUERY SELECT 
    COALESCE(array_to_string(unique_leads, ', '), ''),
    COALESCE(array_to_string(unique_assistants, ', '), '');
END;
$$;

-- Create trigger function to update leads and assistants on contacts_raw changes
CREATE OR REPLACE FUNCTION public.trg_update_contact_leads_assistants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  calc_result record;
BEGIN
  -- Calculate leads and assistants based on focus areas
  SELECT leads, assistants 
  INTO calc_result
  FROM public.calculate_contact_leads_and_assistants(NEW.lg_focus_areas_comprehensive_list);
  
  -- Update the fields
  NEW.lg_lead := calc_result.leads;
  NEW.lg_assistant := calc_result.assistants;
  
  RETURN NEW;
END;
$$;

-- Create trigger on contacts_raw to auto-update leads/assistants
DROP TRIGGER IF EXISTS trg_contacts_update_leads_assistants ON public.contacts_raw;
CREATE TRIGGER trg_contacts_update_leads_assistants
  BEFORE INSERT OR UPDATE OF lg_focus_areas_comprehensive_list 
  ON public.contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_contact_leads_assistants();

-- Create function to refresh all contacts when directory changes
CREATE OR REPLACE FUNCTION public.refresh_all_contact_leads_assistants()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  contact_rec record;
  calc_result record;
  updated_count integer := 0;
BEGIN
  -- Update all contacts with their calculated leads/assistants
  FOR contact_rec IN 
    SELECT id, lg_focus_areas_comprehensive_list 
    FROM public.contacts_raw 
    WHERE lg_focus_areas_comprehensive_list IS NOT NULL
  LOOP
    -- Calculate new values
    SELECT leads, assistants 
    INTO calc_result
    FROM public.calculate_contact_leads_and_assistants(contact_rec.lg_focus_areas_comprehensive_list);
    
    -- Update the contact
    UPDATE public.contacts_raw 
    SET 
      lg_lead = calc_result.leads,
      lg_assistant = calc_result.assistants,
      updated_at = now()
    WHERE id = contact_rec.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Create trigger function for directory changes
CREATE OR REPLACE FUNCTION public.trg_refresh_contacts_on_directory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh all contacts when directory changes
  PERFORM public.refresh_all_contact_leads_assistants();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on lg_focus_area_directory to refresh contacts
DROP TRIGGER IF EXISTS trg_directory_refresh_contacts ON public.lg_focus_area_directory;
CREATE TRIGGER trg_directory_refresh_contacts
  AFTER INSERT OR UPDATE OR DELETE
  ON public.lg_focus_area_directory
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trg_refresh_contacts_on_directory_change();

-- Initial refresh of all existing contacts
SELECT public.refresh_all_contact_leads_assistants() AS contacts_updated;