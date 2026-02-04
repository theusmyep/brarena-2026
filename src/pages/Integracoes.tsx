import { useMemo } from 'react'

export default function Integracoes() {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  const endpoints = useMemo(() => {
    const safeBase = typeof baseUrl === 'string' ? baseUrl.replace(/\/$/, '') : ''
    return {
      whatsapp: safeBase ? `${safeBase}/functions/v1/track_whatsapp_click` : '',
      rd: safeBase ? `${safeBase}/functions/v1/track_rd_event` : '',
    }
  }, [baseUrl])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Integrações</h1>
        <p className="mt-1 text-sm text-zinc-400">Endpoints para você plugar no n8n e no GTM.</p>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold">Webhook n8n → WhatsApp click</div>
        <div className="mt-2 text-xs text-zinc-400">POST</div>
        <div className="mt-1 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">
          {endpoints.whatsapp || 'Defina VITE_SUPABASE_URL'}
        </div>
        <div className="mt-4 text-xs text-zinc-400">Payload mínimo</div>
        <div className="mt-2 text-xs text-zinc-500">
          Headers recomendados no n8n: <span className="font-mono">apikey</span> e{' '}
          <span className="font-mono">Authorization: Bearer</span> usando o anon key do projeto.
        </div>
        <pre className="mt-1 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-200">
{JSON.stringify(
  {
    click_id: 'uuid-ou-id-unico',
    occurred_at: new Date().toISOString(),
    phone: '+5511999999999',
    gclid: 'EAIaIQob...',
    utm: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'campanha_x',
    },
    landing_url: 'https://seusite.com/pagina',
    payload: { any: 'extra' },
  },
  null,
  2
)}
        </pre>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold">Webhook n8n → RD Event</div>
        <div className="mt-2 text-xs text-zinc-400">POST</div>
        <div className="mt-1 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">
          {endpoints.rd || 'Defina VITE_SUPABASE_URL'}
        </div>
        <div className="mt-4 text-xs text-zinc-400">Payload mínimo</div>
        <div className="mt-2 text-xs text-zinc-500">
          Headers recomendados no n8n: <span className="font-mono">apikey</span> e{' '}
          <span className="font-mono">Authorization: Bearer</span> usando o anon key do projeto.
        </div>
        <pre className="mt-1 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-200">
{JSON.stringify(
  {
    rd_lead_id: 'rd_123',
    rd_event_type: 'conversion',
    occurred_at: new Date().toISOString(),
    email: 'lead@exemplo.com',
    phone: '+5511999999999',
    payload: { source: 'RD Station' },
  },
  null,
  2
)}
        </pre>
      </div>
    </div>
  )
}
