# BR Arena — Leads em tempo real (MVP)

MVP end-to-end para ingestão de eventos (GTM/n8n/RD Station) + deduplicação + dashboard web em tempo real.

## Stack
- Frontend: React + Vite + Tailwind + Recharts
- Backend: Supabase Postgres + Realtime + Auth + Edge Functions
- Automação: n8n (webhooks para as Edge Functions)

## Setup local (dashboard)
1) Instalar dependências
```bash
npm install
```

2) Configurar variáveis de ambiente
- Copie `.env.example` para `.env.local`
- Preencha:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` (pode ser a key “publishable/anon” do projeto)

3) Rodar
```bash
npm run dev
```

## Supabase (schema + funções)
- Migração: `supabase/migrations/0001_leads_realtime_mvp.sql`
- Edge Functions:
  - `track_whatsapp_click`
  - `track_rd_event`

## Endpoints para o n8n
Base: `${VITE_SUPABASE_URL}/functions/v1`

### 1) WhatsApp click
POST `/track_whatsapp_click`

Exemplo:
```bash
curl -X POST "$VITE_SUPABASE_URL/functions/v1/track_whatsapp_click" \
  -H "Content-Type: application/json" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -d '{
    "click_id":"9f2c2a98-6f35-41e6-9a7b-3d127ea2a3b1",
    "occurred_at":"2026-02-03T22:15:00.000Z",
    "phone":"+5511999999999",
    "gclid":"EAIaIQob...",
    "utm":{"utm_source":"google","utm_medium":"cpc","utm_campaign":"brarena"},
    "landing_url":"https://brarena.com/landing"
  }'
```

### 2) RD Event
POST `/track_rd_event`

Exemplo:
```bash
curl -X POST "$VITE_SUPABASE_URL/functions/v1/track_rd_event" \
  -H "Content-Type: application/json" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -d '{
    "rd_lead_id":"rd_123",
    "rd_event_type":"conversion",
    "occurred_at":"2026-02-03T22:20:00.000Z",
    "email":"lead@exemplo.com",
    "phone":"+5511999999999",
    "payload":{ "pipeline":"Comercial" }
  }'
```

## Regras do MVP
- Idempotência: o clique WhatsApp é deduplicado por `click_id`; eventos RD por `event_id` (se enviar) ou chave derivada.
- Deduplicação: unificação por identidades (`rd_lead_id`, `phone_e164`, `email`, `gclid`) e merge dos registros.

## RPCs (alternativa rápida ao deploy de Edge Functions)
Se você preferir chamar direto o Postgres via REST (como RPC), use os endpoints abaixo.

Base: `${VITE_SUPABASE_URL}/rest/v1/rpc`

### 1) WhatsApp click (RPC)
POST `/ingest_whatsapp_click`

### 2) WhatsApp message (RPC)
POST `/ingest_whatsapp_message`
- Use quando a mensagem chegar e você já tiver o telefone (é o que “cola” o clique no contato).

Parâmetros importantes:
- `p_window_minutes` (default: 5): janela para casar a mensagem com o último clique sem telefone (regra “last-click-wins”).

## Descarte de cliques órfãos
Para não poluir métricas com cliques que não viraram conversa, marque como descartados os leads que tiveram apenas `whatsapp_click` e não receberam mensagem/conversão dentro de X minutos.

RPC:
- POST `/rest/v1/rpc/discard_orphan_whatsapp_clicks`
- Body: `{ "p_minutes": 10 }`

Recomendação: chamar via n8n em um cron (ex.: a cada 1–5 minutos).

### 3) RD event (RPC)
POST `/ingest_rd_event`

## Realtime
- A migração já adiciona `public.lead_events` na publicação `supabase_realtime`. Se o feed não atualizar ao vivo, confira no painel do Supabase se o Realtime está habilitado no projeto.

## Smoke test (opcional)
Executa uma ingestão completa (WhatsApp + RD) direto via RPC (usa `service role`).

```bash
SUPABASE_URL="$VITE_SUPABASE_URL" \
SUPABASE_SERVICE_ROLE_KEY="<SUA_SERVICE_ROLE_KEY>" \
npm run smoke
```

## Deploy na VPS (Portainer / Docker)
Esse dashboard é estático (Vite build) e pode ser servido via Nginx em um container.

### Opção recomendada: GitHub → Portainer (Stack)
1) Suba este repositório no GitHub.
2) No Portainer: **Stacks → Add stack → Repository**.
3) Aponte para o repo e use o `docker-compose.yml`.
4) Configure as variáveis do build no Portainer (Environment variables):
   - `VITE_SUPABASE_URL=https://ubryegvwacrpvhcavdyo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<sua publishable/anon key>`

Por padrão, o container sobe em `http://SEU_IP:8080`.

### Opção rápida: rodar direto na VPS (sem Portainer)
```bash
VITE_SUPABASE_URL="https://ubryegvwacrpvhcavdyo.supabase.co" \
VITE_SUPABASE_ANON_KEY="<sua publishable/anon key>" \
docker compose up -d --build
```

## Edge Functions
As Edge Functions do Supabase rodam no próprio Supabase (não na VPS). Você só precisa fazer o deploy delas uma vez no seu projeto Supabase.
