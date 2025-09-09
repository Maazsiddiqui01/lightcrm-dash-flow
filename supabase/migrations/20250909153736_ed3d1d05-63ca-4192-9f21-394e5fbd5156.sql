-- Distinct LG sectors (from contacts)
create or replace view ui_distinct_lg_sectors as
select distinct trim(lg_sector) as lg_sector
from contacts_raw
where coalesce(trim(lg_sector), '') <> ''
order by 1;

-- Distinct Focus Areas (flatten lg_focus_area_1..8, remove blanks)
create or replace view ui_distinct_focus_areas as
select distinct trim(fa) as focus_area
from (
  select lg_focus_area_1 as fa from contacts_raw
  union all select lg_focus_area_2 from contacts_raw
  union all select lg_focus_area_3 from contacts_raw
  union all select lg_focus_area_4 from contacts_raw
  union all select lg_focus_area_5 from contacts_raw
  union all select lg_focus_area_6 from contacts_raw
  union all select lg_focus_area_7 from contacts_raw
  union all select lg_focus_area_8 from contacts_raw
) t
where coalesce(trim(fa), '') <> ''
order by 1;