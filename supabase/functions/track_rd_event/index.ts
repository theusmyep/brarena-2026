import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { corsHeaders, json } from "../_shared/http.ts"

type RdEventBody = {
  rd_lead_id: string
  rd_event_type: string
  occurred_at?: string
  event_id?: string
  name?: string
  email?: string
  phone?: string
  gclid?: string
  utm?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }
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

  let body: RdEventBody
  try {
    body = (await req.json()) as RdEventBody
  } catch {
    return json({ error: "invalid_json" }, { status: 400 })
  }

  const rdLeadId = (body.rd_lead_id ?? "").trim()
  const rdEventType = (body.rd_event_type ?? "").trim()
  if (!rdLeadId) return json({ error: "rd_lead_id_required" }, { status: 400 })
  if (!rdEventType) return json({ error: "rd_event_type_required" }, { status: 400 })

  const occurredAt = body.occurred_at ? new Date(body.occurred_at).toISOString() : new Date().toISOString()
  const eventKey = (body.event_id ?? "").trim() || `${rdLeadId}:${rdEventType}:${occurredAt}`
  const utm = body.utm ?? {}

  const supabaseUrl = getEnv("SUPABASE_URL")
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data, error } = await supabase
    .rpc("ingest_rd_event", {
      p_event_key: eventKey,
      p_occurred_at: occurredAt,
      p_rd_event_type: rdEventType,
      p_name: body.name ?? null,
      p_email: body.email ?? null,
      p_phone: body.phone ?? null,
      p_rd_lead_id: rdLeadId,
      p_gclid: body.gclid ?? null,
      p_utm_source: utm.utm_source ?? null,
      p_utm_medium: utm.utm_medium ?? null,
      p_utm_campaign: utm.utm_campaign ?? null,
      p_utm_content: utm.utm_content ?? null,
      p_utm_term: utm.utm_term ?? null,
      p_payload: { ...body.payload, rd_event_type: rdEventType },
    })
    .select()

  if (error) {
    return json({ error: "db_error", details: error.message }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  return json({ ok: true, lead_id: row?.lead_id, inserted: row?.inserted ?? false })
})

