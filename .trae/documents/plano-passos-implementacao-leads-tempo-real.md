## Plano passo a passo (detalhado) — Acompanhamento de leads em tempo real

### 1) Definir “contrato” de eventos (antes de configurar ferramentas)
1. Definir os tipos mínimos de evento:
   - `gtm_capture` (opcional se você não enviar do GTM)
   - `whatsapp_click` (obrigatório)
   - `rd_event` (obrigatório; ex.: conversion, opportunity)
2. Definir chaves canônicas e prioridade de deduplicação:
   - Prioridade sugerida: `phone_e164` > `email` > `rd_lead_id` > `gclid` > `click_id`
   - Definir janela temporal para “match fraco” por `gclid` (ex.: 30 dias)
3. Definir normalizações:
   - Telefone: remover símbolos, aplicar DDI padrão do Brasil quando aplicável, gerar `E.164`.
   - Email: lowercase + trim.
   - UTM/gclid: persistir valores brutos e também valores normalizados.

### 2) Implementar captura gclid/utm e link gclid→WhatsApp (GTM)
1. No GTM/landing:
   - Capturar `gclid` e `utm_*` da URL de entrada.
   - Persistir em cookie/`localStorage` (ex.: `lead_ctx`).
2. Criar `click_id` no clique do WhatsApp (UUID/KSUID) e anexar ao link:
   - Link base WhatsApp: `https://wa.me/<numero>`
   - Query string: `?text=<mensagem>` (ou o formato aceito no seu fluxo)
   - Incluir no texto/parametrização (ou em um endpoint intermediário) os campos: `click_id`, `gclid`, `utm_*`, `landing_url`.
3. Disparar evento de clique para o pipeline:
   - Preferencial: enviar para um endpoint (webhook do n8n) com `navigator.sendBeacon()` para reduzir perda no unload.

### 3) n8n — workflows de ingestão
1. Workflow A: `whatsapp_click_ingest`
   - Trigger: Webhook.
   - Passos:
     1) Validar payload (campos mínimos: `click_id`, `occurred_at`).
     2) Normalizar dados (telefone/email/utm).
     3) Chamar Edge Function `track_whatsapp_click`.
     4) Logar sucesso/erro com correlação por `click_id`.
2. Workflow B: `rd_event_ingest`
   - Trigger: Webhook do RD Station (quando disponível) ou polling.
   - Passos:
     1) Mapear payload do RD para `rd_lead_id`, email, phone, tipo, occurred_at.
     2) Chamar Edge Function `track_rd_event`.
     3) Registrar auditoria do payload bruto (mínimo necessário).

### 4) Supabase — modelagem e realtime
1. Criar tabelas: `leads`, `lead_events`, `lead_identities`.
2. Ativar Realtime para `lead_events` (e/ou view materializada de “últimos eventos”).
3. Definir estratégia de RLS:
   - Se o dashboard for interno, manter RLS simples inicialmente e endurecer depois.

### 5) Supabase Edge Functions — deduplicação e merge (núcleo do sistema)
1. Function `track_whatsapp_click`:
   - Recebe evento, normaliza, resolve/gera lead canônico, grava em `lead_events`.
2. Function `track_rd_event`:
   - Recebe evento RD, normaliza, tenta encontrar lead existente e mescla.
3. Algoritmo de dedup (alto nível):
   1) Gerar conjunto de “identidades” candidatas (telefone/email/rd_lead_id/gclid/click_id).
   2) Buscar leads existentes por cada identidade (prioridade).
   3) Se encontrar múltiplos leads:
      - Eleger canônico pelo “sinal mais forte” (ex.: tem `rd_lead_id` e telefone) e mais recente/mais completo.
      - Atualizar `canonical_id` dos duplicados e registrar evento/razão (em `lead_events.payload`).
   4) Upsert do lead canônico com campos preenchidos sem “apagar” dados melhores.

### 6) Dashboard (React) — acompanhamento em tempo real
1. Página “Painel em tempo real”:
   - Assinar Realtime de `lead_events` e renderizar feed.
   - Exibir filtros por `event_type`, campanha (`utm_campaign`), status mesclado.
2. Página “Detalhe do lead”:
   - Carregar lead canônico + timeline (eventos por `occurred_at`).
   - Exibir chaves que causaram dedup/merge.
3. Página “Integrações & regras”:
   - Checklist operacional (GTM ok, webhook n8n ok, RD ok).
   - Mostrar exemplos de link WhatsApp com placeholders.

### 7) Testes ponta-a-ponta (cenários mínimos)
1. gclid presente → clique WhatsApp → evento aparece no painel em < 5s.
2. Conversão RD chega depois → lead é mesclado com o clique (match por telefone/email ou por gclid dentro da janela).
3. Dois cliques do mesmo telefone → não gerar dois leads, apenas novos eventos.
4. Erro/timeout no n8n ou função → retries controlados e idempotência por `click_id`/`rd_event_id`.

### 8) Operação e observabilidade (mínimo viável)
1. Correlation IDs: usar `click_id` e `rd_lead_id` em logs do n8n e payload de eventos.
2. Alarmes básicos:
   - taxa de erro de webhooks
   - atraso médio entre evento e aparição no painel
3. Política de retenção:
   - manter `lead_events` por X dias (conforme necessidade de auditoria).
