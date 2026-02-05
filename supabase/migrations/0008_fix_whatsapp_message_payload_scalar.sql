create or replace function public.ingest_whatsapp_message(
  p_event_key text,
  p_occurred_at timestamptz,
  p_phone text,
  p_name text default null,
  p_click_id text default null,
  p_payload jsonb default '{}'::jsonb,
  p_window_minutes int default 5
)
returns table (lead_id uuid, inserted boolean, matched_click_id text)
language plpgsql
as $$
declare
  v_phone text := public._normalize_phone_br_e164(p_phone);
  v_phone_lead uuid;
  v_click_lead uuid;
  v_lead uuid;
  v_rowcount integer;
  v_payload jsonb;
  v_click_id text := nullif(trim(p_click_id), '');
  v_match_click_id text;
  v_window interval := make_interval(mins => greatest(1, p_window_minutes));
begin
  if p_event_key is null or length(trim(p_event_key)) = 0 then
    raise exception 'event_key is required';
  end if;

  if v_phone is null then
    raise exception 'phone is required';
  end if;

  select li.lead_id
  into v_phone_lead
  from public.lead_identities li
  where li.identity_type = 'phone_e164' and li.identity_value = v_phone
  limit 1;

  if v_click_id is not null then
    select le.lead_id
    into v_click_lead
    from public.lead_events le
    where le.event_type = 'whatsapp_click' and le.event_key = v_click_id
    limit 1;
  else
    select le.lead_id, le.event_key
    into v_click_lead, v_match_click_id
    from public.lead_events le
    join public.leads l on l.id = le.lead_id
    where le.event_type = 'whatsapp_click'
      and le.occurred_at >= (p_occurred_at - v_window)
      and le.occurred_at <= p_occurred_at
      and l.phone_e164 is null
      and l.canonical_id is null
      and l.discarded_at is null
    order by le.occurred_at desc
    limit 1;
  end if;

  if v_click_lead is not null then
    v_lead := v_click_lead;
  else
    v_lead := coalesce(
      v_phone_lead,
      public._resolve_canonical_lead(
        p_name,
        null,
        p_phone,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      )
    );
  end if;

  update public.leads
  set
    discarded_at = null,
    phone_e164 = coalesce(v_phone, phone_e164),
    name = coalesce(nullif(trim(p_name), ''), name)
  where id = v_lead;

  insert into public.lead_identities (lead_id, identity_type, identity_value)
  values (v_lead, 'phone_e164', v_phone)
  on conflict (identity_type, identity_value)
  do update set lead_id = excluded.lead_id;

  if v_phone_lead is not null and v_phone_lead <> v_lead then
    perform public._merge_leads(v_lead, v_phone_lead);
  end if;

  v_payload := coalesce(p_payload, '{}'::jsonb);
  if jsonb_typeof(v_payload) is distinct from 'object' then
    v_payload := jsonb_build_object('raw', v_payload);
  end if;

  v_payload := jsonb_set(v_payload, '{match}', jsonb_build_object(
    'click_id', coalesce(v_click_id, v_match_click_id),
    'window_minutes', greatest(1, p_window_minutes),
    'matched', (v_click_lead is not null)
  ));

  insert into public.lead_events (lead_id, event_type, event_key, occurred_at, payload)
  values (v_lead, 'whatsapp_message', p_event_key, p_occurred_at, v_payload)
  on conflict (event_type, event_key) do nothing;

  get diagnostics v_rowcount = row_count;

  return query select v_lead, (v_rowcount > 0), coalesce(v_click_id, v_match_click_id);
end;
$$;

