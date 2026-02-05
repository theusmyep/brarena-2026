alter table public.leads
add column if not exists discarded_at timestamptz null;

create or replace function public.discard_orphan_whatsapp_clicks(
  p_minutes int default 10
)
returns int
language plpgsql
as $$
declare
  v_cutoff timestamptz := now() - make_interval(mins => p_minutes);
  v_count int;
begin
  with candidate as (
    select l.id
    from public.leads l
    where l.canonical_id is null
      and l.discarded_at is null
      and l.phone_e164 is null
      and l.email is null
      and l.rd_lead_id is null
      and exists (
        select 1
        from public.lead_events e
        where e.lead_id = l.id
          and e.event_type = 'whatsapp_click'
      )
      and not exists (
        select 1
        from public.lead_events e
        where e.lead_id = l.id
          and e.event_type <> 'whatsapp_click'
      )
      and (
        select max(e.occurred_at)
        from public.lead_events e
        where e.lead_id = l.id
          and e.event_type = 'whatsapp_click'
      ) < v_cutoff
  )
  update public.leads l
  set discarded_at = now()
  from candidate c
  where l.id = c.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.discard_orphan_whatsapp_clicks(int) to anon, authenticated;

create or replace view public.leads_live as
select *
from public.leads
where canonical_id is null
  and discarded_at is null;

create or replace view public.lead_events_live as
select e.*
from public.lead_events e
join public.leads l on l.id = e.lead_id
where l.discarded_at is null;

grant select on public.leads_live, public.lead_events_live to anon, authenticated;

