-- Replace the function with proper null date handling
create or replace function avg_minutes_per_week_by_lead(
  start_date date default null,
  end_date   date default null
)
returns table (
  lead_name text,
  avg_minutes_per_week integer
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select
      coalesce(start_date, (select min(occurred_at) from one_on_one_meetings)) as s,
      coalesce(end_date,   (select max(occurred_at) from one_on_one_meetings)) as e
  ),
  weeks as (
    select greatest(1.0, ((b.e - b.s) + 1) / 7.0) as n_weeks
    from bounds b
  )
  select
    o.lead_name,
    round((count(*) * 30) / w.n_weeks, 0)::int as avg_minutes_per_week
  from one_on_one_meetings o
  cross join bounds b
  cross join weeks w
  where o.occurred_at between b.s and b.e
  group by o.lead_name, w.n_weeks
  order by o.lead_name;
$$;

-- Allow your app role to execute
grant execute on function avg_minutes_per_week_by_lead(date, date) to authenticated;