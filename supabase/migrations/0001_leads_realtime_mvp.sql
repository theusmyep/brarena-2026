create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_quality') then
    create type public.lead_quality as enum ('unknown', 'low', 'medium', 'high');
  end if;
end $$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  canonical_id uuid null references public.leads(id) on delete set null,
  name text null,
  email text null,
  phone_e164 text null,
  rd_lead_id text null,
  gclid text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  utm_term text null,
  landing_url_first text null,
  landing_url_last text null,
  quality public.lead_quality not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_created_at on public.leads(created_at desc);
create index if not exists idx_leads_canonical_id on public.leads(canonical_id);
create index if not exists idx_leads_phone_e164 on public.leads(phone_e164);
create index if not exists idx_leads_email on public.leads(email);
create index if not exists idx_leads_rd_lead_id on public.leads(rd_lead_id);
create index if not exists idx_leads_gclid on public.leads(gclid);

create table if not exists public.lead_identities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  identity_type text not null,
  identity_value text not null,
  created_at timestamptz not null default now(),
  constraint lead_identities_identity_type_check check (identity_type in ('phone_e164', 'email', 'rd_lead_id', 'gclid')),
  constraint lead_identities_identity_value_not_empty check (length(trim(identity_value)) > 0)
);

create unique index if not exists uq_lead_identities_type_value on public.lead_identities(identity_type, identity_value);
create index if not exists idx_lead_identities_lead_id on public.lead_identities(lead_id);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null,
  event_key text not null,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_lead_events_type_key on public.lead_events(event_type, event_key);
create index if not exists idx_lead_events_lead_id on public.lead_events(lead_id);
create index if not exists idx_lead_events_occurred_at on public.lead_events(occurred_at desc);
create index if not exists idx_lead_events_type_occurred_at on public.lead_events(event_type, occurred_at desc);

create or replace function public._normalize_email(p_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(p_email)), '');
$$;

create or replace function public._normalize_phone_br_e164(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_phone is null then
    return null;
  end if;

  v := regexp_replace(p_phone, '[^0-9]+', '', 'g');
  v := nullif(v, '');
  if v is null then
    return null;
  end if;

  if length(v) = 11 then
    v := '55' || v;
  end if;

  return '+' || v;
end;
$$;

create or replace function public._touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_leads_touch_updated_at on public.leads;
create trigger trg_leads_touch_updated_at
before update on public.leads
for each row execute function public._touch_updated_at();

create or replace function public._merge_leads(p_canonical uuid, p_duplicate uuid)
returns void
language plpgsql
as $$
begin
  if p_canonical = p_duplicate then
    return;
  end if;

  update public.lead_events set lead_id = p_canonical where lead_id = p_duplicate;
  update public.lead_identities set lead_id = p_canonical where lead_id = p_duplicate;
  update public.leads set canonical_id = p_canonical where id = p_duplicate;
end;
$$;

create or replace function public._resolve_canonical_lead(
  p_name text,
  p_email text,
  p_phone text,
  p_rd_lead_id text,
  p_gclid text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_utm_content text,
  p_utm_term text,
  p_landing_url text
)
returns uuid
language plpgsql
as $$
declare
  v_email text := public._normalize_email(p_email);
  v_phone text := public._normalize_phone_br_e164(p_phone);
  v_rd_lead_id text := nullif(trim(p_rd_lead_id), '');
  v_gclid text := nullif(trim(p_gclid), '');
  v_canonical uuid;
  v_by_rd uuid;
  v_by_phone uuid;
  v_by_email uuid;
  v_by_gclid uuid;
  v_other uuid;
begin
  if v_rd_lead_id is not null then
    select lead_id into v_by_rd from public.lead_identities where identity_type = 'rd_lead_id' and identity_value = v_rd_lead_id limit 1;
  end if;

  if v_phone is not null then
    select lead_id into v_by_phone from public.lead_identities where identity_type = 'phone_e164' and identity_value = v_phone limit 1;
  end if;

  if v_email is not null then
    select lead_id into v_by_email from public.lead_identities where identity_type = 'email' and identity_value = v_email limit 1;
  end if;

  if v_gclid is not null then
    select lead_id into v_by_gclid from public.lead_identities where identity_type = 'gclid' and identity_value = v_gclid limit 1;
  end if;

  v_canonical := coalesce(v_by_rd, v_by_phone, v_by_email, v_by_gclid);

  if v_canonical is null then
    insert into public.leads (
      name,
      email,
      phone_e164,
      rd_lead_id,
      gclid,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      landing_url_first,
      landing_url_last
    ) values (
      nullif(trim(p_name), ''),
      v_email,
      v_phone,
      v_rd_lead_id,
      v_gclid,
      nullif(trim(p_utm_source), ''),
      nullif(trim(p_utm_medium), ''),
      nullif(trim(p_utm_campaign), ''),
      nullif(trim(p_utm_content), ''),
      nullif(trim(p_utm_term), ''),
      nullif(trim(p_landing_url), ''),
      nullif(trim(p_landing_url), '')
    ) returning id into v_canonical;
  end if;

  for v_other in
    select distinct lead_id from public.lead_identities
    where (v_rd_lead_id is not null and identity_type = 'rd_lead_id' and identity_value = v_rd_lead_id)
       or (v_phone is not null and identity_type = 'phone_e164' and identity_value = v_phone)
       or (v_email is not null and identity_type = 'email' and identity_value = v_email)
       or (v_gclid is not null and identity_type = 'gclid' and identity_value = v_gclid)
  loop
    if v_other <> v_canonical then
      perform public._merge_leads(v_canonical, v_other);
    end if;
  end loop;

  update public.leads
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    email = coalesce(v_email, email),
    phone_e164 = coalesce(v_phone, phone_e164),
    rd_lead_id = coalesce(v_rd_lead_id, rd_lead_id),
    gclid = coalesce(v_gclid, gclid),
    utm_source = coalesce(nullif(trim(p_utm_source), ''), utm_source),
    utm_medium = coalesce(nullif(trim(p_utm_medium), ''), utm_medium),
    utm_campaign = coalesce(nullif(trim(p_utm_campaign), ''), utm_campaign),
    utm_content = coalesce(nullif(trim(p_utm_content), ''), utm_content),
    utm_term = coalesce(nullif(trim(p_utm_term), ''), utm_term),
    landing_url_first = coalesce(landing_url_first, nullif(trim(p_landing_url), '')),
    landing_url_last = coalesce(nullif(trim(p_landing_url), ''), landing_url_last)
  where id = v_canonical;

  if v_phone is not null then
    insert into public.lead_identities (lead_id, identity_type, identity_value)
    values (v_canonical, 'phone_e164', v_phone)
    on conflict (identity_type, identity_value)
    do update set lead_id = excluded.lead_id;
  end if;

  if v_email is not null then
    insert into public.lead_identities (lead_id, identity_type, identity_value)
    values (v_canonical, 'email', v_email)
    on conflict (identity_type, identity_value)
    do update set lead_id = excluded.lead_id;
  end if;

  if v_rd_lead_id is not null then
    insert into public.lead_identities (lead_id, identity_type, identity_value)
    values (v_canonical, 'rd_lead_id', v_rd_lead_id)
    on conflict (identity_type, identity_value)
    do update set lead_id = excluded.lead_id;
  end if;

  if v_gclid is not null then
    insert into public.lead_identities (lead_id, identity_type, identity_value)
    values (v_canonical, 'gclid', v_gclid)
    on conflict (identity_type, identity_value)
    do update set lead_id = excluded.lead_id;
  end if;

  return v_canonical;
end;
$$;

create or replace function public.ingest_whatsapp_click(
  p_event_key text,
  p_occurred_at timestamptz,
  p_name text,
  p_email text,
  p_phone text,
  p_rd_lead_id text,
  p_gclid text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_utm_content text,
  p_utm_term text,
  p_landing_url text,
  p_payload jsonb default '{}'::jsonb
)
returns table (lead_id uuid, inserted boolean)
language plpgsql
as $$
declare
  v_lead_id uuid;
  v_rowcount integer;
begin
  if p_event_key is null or length(trim(p_event_key)) = 0 then
    raise exception 'event_key is required';
  end if;

  v_lead_id := public._resolve_canonical_lead(
    p_name,
    p_email,
    p_phone,
    p_rd_lead_id,
    p_gclid,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_content,
    p_utm_term,
    p_landing_url
  );

  insert into public.lead_events (lead_id, event_type, event_key, occurred_at, payload)
  values (v_lead_id, 'whatsapp_click', p_event_key, p_occurred_at, coalesce(p_payload, '{}'::jsonb))
  on conflict (event_type, event_key) do nothing;

  get diagnostics v_rowcount = row_count;

  return query select v_lead_id, (v_rowcount > 0);
end;
$$;

create or replace function public.ingest_rd_event(
  p_event_key text,
  p_occurred_at timestamptz,
  p_rd_event_type text,
  p_name text,
  p_email text,
  p_phone text,
  p_rd_lead_id text,
  p_gclid text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_utm_content text,
  p_utm_term text,
  p_payload jsonb default '{}'::jsonb
)
returns table (lead_id uuid, inserted boolean)
language plpgsql
as $$
declare
  v_lead_id uuid;
  v_rowcount integer;
  v_payload jsonb;
begin
  if p_event_key is null or length(trim(p_event_key)) = 0 then
    raise exception 'event_key is required';
  end if;

  v_lead_id := public._resolve_canonical_lead(
    p_name,
    p_email,
    p_phone,
    p_rd_lead_id,
    p_gclid,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_content,
    p_utm_term,
    null
  );

  v_payload := jsonb_set(coalesce(p_payload, '{}'::jsonb), '{rd_event_type}', to_jsonb(nullif(trim(p_rd_event_type), '')));

  insert into public.lead_events (lead_id, event_type, event_key, occurred_at, payload)
  values (v_lead_id, 'rd_event', p_event_key, p_occurred_at, v_payload)
  on conflict (event_type, event_key) do nothing;

  get diagnostics v_rowcount = row_count;

  return query select v_lead_id, (v_rowcount > 0);
end;
$$;

alter table public.leads enable row level security;
alter table public.lead_identities enable row level security;
alter table public.lead_events enable row level security;

drop policy if exists leads_read_authenticated on public.leads;
create policy leads_read_authenticated on public.leads
for select to authenticated
using (true);

drop policy if exists lead_identities_read_authenticated on public.lead_identities;
create policy lead_identities_read_authenticated on public.lead_identities
for select to authenticated
using (true);

drop policy if exists lead_events_read_authenticated on public.lead_events;
create policy lead_events_read_authenticated on public.lead_events
for select to authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on public.leads, public.lead_identities, public.lead_events to anon, authenticated;
grant execute on function public.ingest_whatsapp_click(
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to anon, authenticated;

grant execute on function public.ingest_rd_event(
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to anon, authenticated;

