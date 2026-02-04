import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { corsHeaders, json } from "../_shared/http.ts"

type WhatsappClickBody = {
  click_id: string
  occurred_at?: string
  name?: string
  email?: string
  phone?: string
  rd_lead_id?: string
  gclid?: string
  utm?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }
  landing_url?: string
  payload?: Record<string, unknown>
}

function getEnv(name: string) {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, { status: 405 })
  }

  let body: WhatsappClickBody
  try {
    body = (await req.json()) as WhatsappClickBody
  } catch {
    return json({ error: "invalid_json" }, { status: 400 })
  }

  const clickId = (body.click_id ?? "").trim()
  if (!clickId) {
    return json({ error: "click_id_required" }, { status: 400 })
  }

  const occurredAt = body.occurred_at ? new Date(body.occurred_at).toISOString() : new Date().toISOString()
  const utm = body.utm ?? {}

  const supabaseUrl = getEnv("SUPABASE_URL")
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data, error } = await supabase
    .rpc("ingest_whatsapp_click", {
      p_event_key: clickId,
      p_occurred_at: occurredAt,
      p_name: body.name ?? null,
      p_email: body.email ?? null,
      p_phone: body.phone ?? null,
      p_rd_lead_id: body.rd_lead_id ?? null,
      p_gclid: body.gclid ?? null,
      p_utm_source: utm.utm_source ?? null,
      p_utm_medium: utm.utm_medium ?? null,
      p_utm_campaign: utm.utm_campaign ?? null,
      p_utm_content: utm.utm_content ?? null,
      p_utm_term: utm.utm_term ?? null,
      p_landing_url: body.landing_url ?? null,
      p_payload: body.payload ?? {},
    })
    .select()

  if (error) {
    return json({ error: "db_error", details: error.message }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  return json({ ok: true, lead_id: row?.lead_id, inserted: row?.inserted ?? false })
})

