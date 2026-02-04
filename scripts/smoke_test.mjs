import { createClient } from '@supabase/supabase-js'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    throw new Error(`Missing env ${name}`)
  }
  return v
}

const SUPABASE_URL = requireEnv('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const now = new Date().toISOString()
const clickId = crypto.randomUUID()
const phone = '+5511999999999'
const email = `smoke.${clickId}@example.com`

const { data: wData, error: wErr } = await supabase
  .rpc('ingest_whatsapp_click', {
    p_event_key: clickId,
    p_occurred_at: now,
    p_name: 'Smoke Test',
    p_email: email,
    p_phone: phone,
    p_rd_lead_id: null,
    p_gclid: `gclid_${clickId}`,
    p_utm_source: 'google',
    p_utm_medium: 'cpc',
    p_utm_campaign: 'smoke',
    p_utm_content: null,
    p_utm_term: null,
    p_landing_url: 'https://example.com/landing',
    p_payload: { kind: 'smoke' },
  })
  .select()

if (wErr) {
  console.error('ingest_whatsapp_click failed:', wErr.message)
  process.exit(1)
}

const rdEventKey = `smoke:${clickId}`
const { data: rData, error: rErr } = await supabase
  .rpc('ingest_rd_event', {
    p_event_key: rdEventKey,
    p_occurred_at: now,
    p_rd_event_type: 'conversion',
    p_name: 'Smoke Test',
    p_email: email,
    p_phone: phone,
    p_rd_lead_id: `rd_${clickId}`,
    p_gclid: `gclid_${clickId}`,
    p_utm_source: 'google',
    p_utm_medium: 'cpc',
    p_utm_campaign: 'smoke',
    p_utm_content: null,
    p_utm_term: null,
    p_payload: { kind: 'smoke' },
  })
  .select()

if (rErr) {
  console.error('ingest_rd_event failed:', rErr.message)
  process.exit(1)
}

const leadIdFromWhatsapp = Array.isArray(wData) ? wData[0]?.lead_id : wData?.lead_id
const leadIdFromRd = Array.isArray(rData) ? rData[0]?.lead_id : rData?.lead_id

if (!leadIdFromWhatsapp || !leadIdFromRd) {
  console.error('Missing lead_id from RPC results')
  process.exit(1)
}

if (leadIdFromWhatsapp !== leadIdFromRd) {
  console.error('Dedup/merge mismatch: different lead_id values returned')
  console.error({ leadIdFromWhatsapp, leadIdFromRd })
  process.exit(1)
}

const { data: events, error: eErr } = await supabase
  .from('lead_events')
  .select('id,event_type,event_key,occurred_at,lead_id')
  .in('event_key', [clickId, rdEventKey])

if (eErr) {
  console.error('lead_events query failed:', eErr.message)
  process.exit(1)
}

if (!events || events.length < 2) {
  console.error('Expected at least 2 events inserted')
  console.error({ events })
  process.exit(1)
}

console.log('OK')
console.log({ lead_id: leadIdFromWhatsapp, events })

