create or replace function public._clean_tracking_value(p_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(trim(p_value), '^=+', ''), '');
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
  v_rd_lead_id text := public._clean_tracking_value(p_rd_lead_id);
  v_gclid text := public._clean_tracking_value(p_gclid);
  v_utm_source text := public._clean_tracking_value(p_utm_source);
  v_utm_medium text := public._clean_tracking_value(p_utm_medium);
  v_utm_campaign text := public._clean_tracking_value(p_utm_campaign);
  v_utm_content text := public._clean_tracking_value(p_utm_content);
  v_utm_term text := public._clean_tracking_value(p_utm_term);
  v_landing_url text := public._clean_tracking_value(p_landing_url);
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
      v_utm_source,
      v_utm_medium,
      v_utm_campaign,
      v_utm_content,
      v_utm_term,
      v_landing_url,
      v_landing_url
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
    utm_source = coalesce(v_utm_source, utm_source),
    utm_medium = coalesce(v_utm_medium, utm_medium),
    utm_campaign = coalesce(v_utm_campaign, utm_campaign),
    utm_content = coalesce(v_utm_content, utm_content),
    utm_term = coalesce(v_utm_term, utm_term),
    landing_url_first = coalesce(landing_url_first, v_landing_url),
    landing_url_last = coalesce(v_landing_url, landing_url_last)
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

update public.leads
set
  gclid = public._clean_tracking_value(gclid),
  rd_lead_id = public._clean_tracking_value(rd_lead_id),
  utm_source = public._clean_tracking_value(utm_source),
  utm_medium = public._clean_tracking_value(utm_medium),
  utm_campaign = public._clean_tracking_value(utm_campaign),
  utm_content = public._clean_tracking_value(utm_content),
  utm_term = public._clean_tracking_value(utm_term),
  landing_url_first = public._clean_tracking_value(landing_url_first),
  landing_url_last = public._clean_tracking_value(landing_url_last);

