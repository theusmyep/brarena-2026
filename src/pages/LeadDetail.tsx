import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabaseClient'

type Lead = {
  id: string
  canonical_id: string | null
  created_at: string
  updated_at: string
  name: string | null
  email: string | null
  phone_e164: string | null
  rd_lead_id: string | null
  gclid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  quality: 'unknown' | 'low' | 'medium' | 'high'
  landing_url_first: string | null
  landing_url_last: string | null
}

type LeadEvent = {
  id: string
  event_type: string
  event_key: string
  occurred_at: string
  payload: Record<string, unknown>
}

export default function LeadDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [events, setEvents] = useState<LeadEvent[]>([])

  useEffect(() => {
    const leadId = id
    if (!leadId) return

    async function load() {
      setLoading(true)
      setError(null)

      const [{ data: leadData, error: leadError }, { data: eventData, error: eventsError }] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).maybeSingle(),
        supabase
          .from('lead_events')
          .select('id,event_type,event_key,occurred_at,payload')
          .eq('lead_id', leadId)
          .order('occurred_at', { ascending: false })
          .limit(200),
      ])

      if (leadError) {
        setError(leadError.message)
        setLoading(false)
        return
      }
      if (eventsError) {
        setError(eventsError.message)
        setLoading(false)
        return
      }

      setLead((leadData ?? null) as Lead | null)
      setEvents((eventData ?? []) as LeadEvent[])
      setLoading(false)
    }

    void load()
  }, [id])

  if (loading) {
    return <div className="text-sm text-zinc-500">Carregando…</div>
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
  }

  if (!lead) {
    return <div className="text-sm text-zinc-500">Lead não encontrado.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Detalhe do lead</h1>
        <div className="mt-1 font-mono text-xs text-zinc-500">{lead.id}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 lg:col-span-2">
          <div className="text-sm font-semibold">Identidade</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-400">Nome</div>
              <div className="text-sm text-zinc-100">{lead.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Qualidade</div>
              <div className="text-sm text-zinc-100">{lead.quality}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Email</div>
              <div className="text-sm text-zinc-100">{lead.email || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Telefone</div>
              <div className="text-sm text-zinc-100">{lead.phone_e164 || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">RD Lead ID</div>
              <div className="text-sm text-zinc-100">{lead.rd_lead_id || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">gclid</div>
              <div className="text-sm text-zinc-100">{lead.gclid || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">UTM source</div>
              <div className="text-sm text-zinc-100">{lead.utm_source || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">UTM campaign</div>
              <div className="text-sm text-zinc-100">{lead.utm_campaign || '—'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-sm font-semibold">URLs</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs text-zinc-400">Primeira</div>
              <div className="break-words text-sm text-zinc-100">{lead.landing_url_first || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Última</div>
              <div className="break-words text-sm text-zinc-100">{lead.landing_url_last || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Criado</div>
              <div className="text-sm text-zinc-100">{format(new Date(lead.created_at), 'dd/MM HH:mm')}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Atualizado</div>
              <div className="text-sm text-zinc-100">{format(new Date(lead.updated_at), 'dd/MM HH:mm')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold">Timeline (últimos 200 eventos)</div>
        <div className="mt-3 space-y-2">
          {events.map((e) => (
            <div key={e.id} className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{e.event_type}</div>
                <div className="text-xs text-zinc-500">{format(new Date(e.occurred_at), 'dd/MM HH:mm:ss')}</div>
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">{e.event_key}</div>
              <pre className="mt-2 overflow-auto rounded bg-zinc-950/40 p-2 text-xs text-zinc-200 ring-1 ring-zinc-800/60">
                {JSON.stringify(e.payload ?? {}, null, 2)}
              </pre>
            </div>
          ))}
          {!events.length ? <div className="text-sm text-zinc-500">Sem eventos para este lead.</div> : null}
        </div>
      </div>
    </div>
  )
}

