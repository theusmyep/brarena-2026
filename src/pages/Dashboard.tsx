import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, startOfDay, subDays } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import KpiCard from '@/components/KpiCard'
import { supabase } from '@/lib/supabaseClient'
import { useLeadEventsRealtime } from '@/hooks/useLeadEventsRealtime'

type PeriodKey = '1' | '7' | '30'

type LeadRow = {
  id: string
  canonical_id: string | null
  created_at: string
  quality: 'unknown' | 'low' | 'medium' | 'high'
  utm_source: string | null
}

type EventRow = {
  id: string
  event_type: string
  event_key: string
  occurred_at: string
  payload: Record<string, unknown>
  lead_id: string
  lead_name: string | null
  lead_email: string | null
  lead_phone_e164: string | null
  lead_utm_source: string | null
  lead_utm_campaign: string | null
  lead_quality: string | null
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return '0%'
  return `${Math.round((numerator / denominator) * 1000) / 10}%`
}

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const realtime = useLeadEventsRealtime()

  const from = useMemo(() => startOfDay(subDays(new Date(), Number(period) - 1)), [period])
  const fromIso = useMemo(() => from.toISOString(), [from])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: leadsData, error: leadsError }, { data: eventsData, error: eventsError }] = await Promise.all([
      supabase
        .from('leads_live')
        .select('id,canonical_id,created_at,quality,utm_source')
        .gte('created_at', fromIso)
        .order('created_at', { ascending: true }),
      supabase
        .from('lead_events_live_expanded')
        .select(
          'id,event_type,event_key,occurred_at,payload,lead_id,lead_name,lead_email,lead_phone_e164,lead_utm_source,lead_utm_campaign,lead_quality'
        )
        .gte('occurred_at', fromIso)
        .order('occurred_at', { ascending: false })
        .limit(80),
    ])

    if (leadsError) {
      setError(leadsError.message)
      setLoading(false)
      return
    }

    if (eventsError) {
      setError(eventsError.message)
      setLoading(false)
      return
    }

    setLeads((leadsData ?? []) as LeadRow[])
    setEvents((eventsData ?? []) as EventRow[])
    setLoading(false)
  }, [fromIso])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!realtime.lastInsertAt) return
    void load()
  }, [realtime.lastInsertAt, load])

  const leadsTotal = leads.length
  const whatsappClicks = events.filter((e) => e.event_type === 'whatsapp_click').length
  const rdEvents = events.filter((e) => e.event_type === 'rd_event').length
  const conversions = events.filter((e) => e.event_type === 'rd_event' && e.payload?.rd_event_type === 'conversion').length

  const dailySeries = useMemo(() => {
    const days = Number(period)
    const base = Array.from({ length: days }).map((_, i) => {
      const d = subDays(startOfDay(new Date()), days - 1 - i)
      return { day: format(d, 'dd/MM'), leads: 0 }
    })

    const byDay = new Map(base.map((x) => [x.day, x]))
    for (const l of leads) {
      const key = format(new Date(l.created_at), 'dd/MM')
      const item = byDay.get(key)
      if (item) item.leads += 1
    }

    return base
  }, [leads, period])

  const qualitySeries = useMemo(() => {
    const counts = { unknown: 0, low: 0, medium: 0, high: 0 }
    for (const l of leads) counts[l.quality] += 1
    return (Object.entries(counts) as Array<[keyof typeof counts, number]>).map(([k, v]) => ({
      name: k,
      value: v,
    }))
  }, [leads])

  const qualityColors: Record<string, string> = {
    unknown: '#71717a',
    low: '#f59e0b',
    medium: '#60a5fa',
    high: '#34d399',
  }

  const conversionsBySource = useMemo(() => {
    const map = new Map<string, { source: string; clicks: number; conversions: number; rate: number }>()
    for (const e of events) {
      const src = (e.lead_utm_source || 'unknown').toString()
      const item = map.get(src) ?? { source: src, clicks: 0, conversions: 0, rate: 0 }
      if (e.event_type === 'whatsapp_click') item.clicks += 1
      if (e.event_type === 'rd_event' && e.payload?.rd_event_type === 'conversion') item.conversions += 1
      item.rate = item.clicks ? Math.round((item.conversions / item.clicks) * 1000) / 10 : 0
      map.set(src, item)
    }

    return Array.from(map.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8)
  }, [events])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="mt-1 text-sm text-zinc-400">
            Realtime: {realtime.connected ? 'conectado' : 'conectando'}
            {realtime.lastInsertAt ? ` • último evento ${format(new Date(realtime.lastInsertAt), 'HH:mm:ss')}` : ''}
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-1">
          {(
            [
              { k: '1', label: 'Hoje' },
              { k: '7', label: '7 dias' },
              { k: '30', label: '30 dias' },
            ] as const
          ).map((p) => (
            <button
              key={p.k}
              type="button"
              className={
                'rounded-md px-3 py-1.5 text-sm ' +
                (period === p.k ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-300 hover:bg-zinc-800/60')
              }
              onClick={() => setPeriod(p.k)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Leads (canônicos)" value={loading ? '—' : String(leadsTotal)} hint={`Desde ${format(from, 'dd/MM')}`} />
        <KpiCard label="Cliques WhatsApp" value={loading ? '—' : String(whatsappClicks)} />
        <KpiCard label="Eventos RD" value={loading ? '—' : String(rdEvents)} />
        <KpiCard label="Taxa de conversão" value={loading ? '—' : pct(conversions, whatsappClicks)} hint="Conversões RD / cliques" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 lg:col-span-2">
          <div className="text-sm font-semibold">Leads por dia</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={12} />
                <YAxis stroke="#a1a1aa" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 10 }} />
                <Line type="monotone" dataKey="leads" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-sm font-semibold">Qualidade</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 10 }} />
                <Pie
                  data={qualitySeries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  stroke="#09090b"
                >
                  {qualitySeries.map((entry) => (
                    <Cell key={entry.name} fill={qualityColors[entry.name] ?? '#71717a'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 lg:col-span-2">
          <div className="text-sm font-semibold">Conversões por fonte (top 8)</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionsBySource} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="source" stroke="#a1a1aa" fontSize={12} />
                <YAxis stroke="#a1a1aa" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 10 }} />
                <Bar dataKey="clicks" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                <Bar dataKey="conversions" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-sm font-semibold">Feed (últimos 80)</div>
          <div className="mt-3 max-h-64 space-y-2 overflow-auto">
            {events.map((e) => (
              <div key={e.id} className="rounded-lg border border-zinc-800/60 bg-zinc-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{e.event_type}</div>
                  <div className="text-xs text-zinc-500">{format(new Date(e.occurred_at), 'dd/MM HH:mm:ss')}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {e.lead_utm_source ? `Fonte: ${e.lead_utm_source}` : 'Fonte: —'}
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">{e.event_key}</div>
              </div>
            ))}
            {!events.length && !loading ? <div className="text-sm text-zinc-500">Sem eventos no período.</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
