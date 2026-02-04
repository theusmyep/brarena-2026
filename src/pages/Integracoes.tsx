import { useMemo } from 'react'

export default function Integracoes() {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  const endpoints = useMemo(() => {
    const safeBase = typeof baseUrl === 'string' ? baseUrl.replace(/\/$/, '') : ''
    return {
      whatsapp: safeBase ? `${safeBase}/functions/v1/track_whatsapp_click` : '',
      rd: safeBase ? `${safeBase}/functions/v1/track_rd_event` : '',
      rpcWhatsappClick: safeBase ? `${safeBase}/rest/v1/rpc/ingest_whatsapp_click` : '',
      rpcWhatsappMessage: safeBase ? `${safeBase}/rest/v1/rpc/ingest_whatsapp_message` : '',
      rpcRd: safeBase ? `${safeBase}/rest/v1/rpc/ingest_rd_event` : '',
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
        <div className="text-sm font-semibold">RPC (n8n → Supabase) — WhatsApp click</div>
        <div className="mt-2 text-xs text-zinc-400">POST</div>
        <div className="mt-1 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">
          {endpoints.rpcWhatsappClick || 'Defina VITE_SUPABASE_URL'}
        </div>
        <div className="mt-4 text-xs text-zinc-400">Payload mínimo</div>
        <div className="mt-2 text-xs text-zinc-500">
          Headers recomendados no n8n: <span className="font-mono">apikey</span> e{' '}
          <span className="font-mono">Authorization: Bearer</span> usando a key pública (publishable/anon).
        </div>
        <pre className="mt-1 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-200">
{JSON.stringify(
  {
    p_event_key: 'click_id_unico',
    p_occurred_at: new Date().toISOString(),
    p_name: null,
    p_email: null,
    p_phone: null,
    p_rd_lead_id: null,
    p_gclid: 'EAIaIQob...',
    p_utm_source: 'google',
    p_utm_medium: 'cpc',
    p_utm_campaign: 'campanha_x',
    p_utm_content: null,
    p_utm_term: null,
    p_landing_url: 'https://seusite.com/pagina',
    p_payload: { any: 'extra' },
  },
  null,
  2
)}
        </pre>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold">RPC (n8n → Supabase) — WhatsApp message</div>
        <div className="mt-2 text-xs text-zinc-400">POST</div>
        <div className="mt-1 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">
          {endpoints.rpcWhatsappMessage || 'Defina VITE_SUPABASE_URL'}
        </div>
        <div className="mt-4 text-xs text-zinc-400">Payload mínimo</div>
        <div className="mt-2 text-xs text-zinc-500">
          Use quando a mensagem chegar e você já tiver o telefone. Isso “cola” o clique no contato.
        </div>
        <pre className="mt-1 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-200">
{JSON.stringify(
  {
    p_event_key: 'message_id_unico',
    p_occurred_at: new Date().toISOString(),
    p_phone: '5511999999999',
    p_name: 'Nome do contato',
    p_click_id: null,
    p_payload: { source: 'Tallos/WhatsApp' },
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

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold">RPC (n8n → Supabase) — RD Event</div>
        <div className="mt-2 text-xs text-zinc-400">POST</div>
        <div className="mt-1 rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">
          {endpoints.rpcRd || 'Defina VITE_SUPABASE_URL'}
        </div>
        <div className="mt-4 text-xs text-zinc-400">Payload mínimo</div>
        <pre className="mt-1 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-200">
{JSON.stringify(
  {
    p_event_key: 'rd_event_id_ou_chave_unica',
    p_occurred_at: new Date().toISOString(),
    p_rd_event_type: 'conversion',
    p_name: 'Nome do lead',
    p_email: 'lead@exemplo.com',
    p_phone: '5511999999999',
    p_rd_lead_id: 'rd_123',
    p_gclid: 'EAIaIQob...',
    p_utm_source: 'google',
    p_utm_medium: 'cpc',
    p_utm_campaign: 'campanha_x',
    p_utm_content: null,
    p_utm_term: null,
    p_payload: { source: 'RD Station' },
  },
  null,
  2
)}
        </pre>
      </div>
    </div>
  )
}
