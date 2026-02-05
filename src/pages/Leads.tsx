import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type LeadListRow = {
  id: string
  canonical_id: string | null
  created_at: string
  name: string | null
  email: string | null
  phone_e164: string | null
  utm_source: string | null
  utm_campaign: string | null
  quality: 'unknown' | 'low' | 'medium' | 'high'
}

export default function Leads() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<LeadListRow[]>([])

  const normalizedQuery = useMemo(() => query.trim(), [query])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let q = supabase
      .from('leads_live')
      .select('id,canonical_id,created_at,name,email,phone_e164,utm_source,utm_campaign,quality')
      .order('created_at', { ascending: false })
      .limit(100)

    if (normalizedQuery) {
      const like = `%${normalizedQuery}%`
      q = q.or(`email.ilike.${like},phone_e164.ilike.${like},name.ilike.${like}`)
    }

    const { data, error } = await q
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setRows((data ?? []) as LeadListRow[])
    setLoading(false)
  }, [normalizedQuery])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-zinc-400">Lista dos últimos 100 leads canônicos.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500/60 md:w-80"
            placeholder="Buscar por nome, email ou telefone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr] gap-3 border-b border-zinc-800/60 px-4 py-3 text-xs text-zinc-400">
          <div>Lead</div>
          <div>Contato</div>
          <div>Origem</div>
          <div>Qualidade</div>
          <div>Criado</div>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {rows.map((r) => (
            <Link
              key={r.id}
              to={`/lead/${r.id}`}
              className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-sm hover:bg-zinc-800/40"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-zinc-100">{r.name || 'Sem nome'}</div>
                <div className="truncate text-xs text-zinc-500">{r.id}</div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-zinc-200">{r.email || '—'}</div>
                <div className="truncate text-xs text-zinc-500">{r.phone_e164 || '—'}</div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-zinc-200">{r.utm_source || 'unknown'}</div>
                <div className="truncate text-xs text-zinc-500">{r.utm_campaign || '—'}</div>
              </div>
              <div className="text-zinc-200">{r.quality}</div>
              <div className="text-zinc-200">{format(new Date(r.created_at), 'dd/MM')}</div>
            </Link>
          ))}

          {loading ? <div className="px-4 py-6 text-sm text-zinc-500">Carregando…</div> : null}
          {!loading && !rows.length ? <div className="px-4 py-6 text-sm text-zinc-500">Nenhum lead.</div> : null}
        </div>
      </div>
    </div>
  )
}
