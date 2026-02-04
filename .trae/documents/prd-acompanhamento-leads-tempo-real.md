## 1. Product Overview
Sistema de acompanhamento de leads em tempo real, unificando eventos de GTM, cliques no WhatsApp e conversões do RD Station.
Foca em rastreabilidade ponta-a-ponta (incluindo gclid→WhatsApp) e deduplicação para evitar contagem/atribuição duplicada.

## 2. Core Features

### 2.1 User Roles
| Role | Registration Method | Core Permissions |
|------|---------------------|------------------|
| Operação (Marketing/Vendas) | Acesso interno | Visualizar leads em tempo real, filtrar, abrir detalhes e validar deduplicação/atribuição |
| Admin de Integrações | Acesso interno | Configurar integrações (GTM/n8n/RD Station), regras de deduplicação e parâmetros de rastreio |

### 2.2 Feature Module
Nosso sistema consiste nas seguintes páginas principais:
1. **Painel em Tempo Real**: stream de leads/eventos, filtros, métricas rápidas, status de deduplicação/merge.
2. **Detalhe do Lead**: identidade consolidada, timeline (GTM→WhatsApp→RD), eventos brutos, chaves de dedup.
3. **Integrações & Regras**: setup de captura (gclid), template de link WhatsApp, conectores n8n/RD, regras de deduplicação e auditoria.

### 2.3 Page Details
| Page Name | Module Name | Feature description |
|-----------|-------------|---------------------|
| Painel em Tempo Real | Feed de eventos/leads | Exibir eventos mais recentes (ex.: whatsapp_click, rd_conversion), com ordenação por hora e atualização em tempo real. |
| Painel em Tempo Real | Filtros e busca | Filtrar por período, origem/campanha (UTM/gclid), status (novo/mesclado), e buscar por telefone/email. |
| Painel em Tempo Real | Resumo operacional | Mostrar contagens do período (leads novos, mesclados por dedup, conversões RD), e taxa de cliques WhatsApp. |
| Detalhe do Lead | Identidade consolidada | Exibir “Lead canônico” (nome, telefone normalizado, email, rd_lead_id quando existir, gclid/utm). |
| Detalhe do Lead | Linha do tempo | Listar eventos por ordem (captura GTM, clique WhatsApp, criação/conversão RD), com payload essencial e links de auditoria. |
| Detalhe do Lead | Deduplicação | Mostrar por que foi mesclado (chaves que bateram), e qual registro é o canônico. |
| Integrações & Regras | gclid→WhatsApp | Definir padrão de link para WhatsApp contendo parâmetros (ex.: gclid, utm_*, click_id) e registrar evento de clique. |
| Integrações & Regras | RD Station + n8n | Configurar recebimento de webhooks/eventos do RD Station via n8n e mapeamento de campos para o modelo do sistema. |
| Integrações & Regras | Regras de dedup | Configurar prioridade de chaves (telefone > email > rd_lead_id > gclid) e janela temporal para merge. |

## 3. Core Process
**Fluxo Operação (tempo real):** você acompanha o Painel em Tempo Real para ver novos cliques no WhatsApp e conversões do RD Station chegando em segundos; quando necessário, abre o Detalhe do Lead para auditar a timeline e entender se houve merge por deduplicação.

**Fluxo de rastreio gclid→WhatsApp:** a landing captura o gclid via GTM e persiste no navegador; ao clicar no botão de WhatsApp, o link inclui gclid/UTMs e um `click_id`; o evento é enviado para o pipeline (n8n) e registrado no Supabase, permitindo atribuição posterior quando a conversão do RD Station chegar.

**Fluxo de deduplicação:** a cada evento recebido (whatsapp_click, rd_conversion, etc.), o sistema normaliza identidades (telefone/email) e executa merge/upsert para manter um “lead canônico”, registrando motivo e chaves que bateram.

```mermaid
graph TD
  A["Landing + GTM (captura gclid/utm)"] --> B["Clique no botão WhatsApp (gera click_id)"]
  B --> C["n8n Webhook (evento whatsapp_click)"]
  C --> D["Supabase (leads + eventos)"]
  E["RD Station (conversão/lead)"] --> F["n8n (webhook/poll)"]
  F --> D
  D --> G["Painel em Tempo Real"]
  G --> H["Detalhe do Lead"]
  G --> I["