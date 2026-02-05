create or replace view public.lead_events_live_expanded as
select
  e.id,
  e.lead_id,
  e.event_type,
  e.event_key,
  e.occurred_at,
  e.payload,
  e.created_at,
  l.name as lead_name,
  l.email as lead_email,
  l.phone_e164 as lead_phone_e164,
  l.utm_source as lead_utm_source,
  l.utm_campaign as lead_utm_campaign,
  l.quality as lead_quality
from public.lead_events e
join public.leads l on l.id = e.lead_id
where l.discarded_at is null;

grant select on public.lead_events_live_expanded to anon, authenticated;

