# Reputation Boost IA MVP

MVP web responsivo para automacao de reputacao online, com foco em respostas inteligentes a reviews.

## Stack

- Node.js nativo no backend, sem dependencias externas
- SPA em HTML, CSS e JavaScript
- Persistencia local em `data/app-state.json`
- Integracoes opcionais via `fetch` com OpenAI, Google Business Profile e Stripe/Asaas

## Como rodar

```bash
npm start
```

A aplicacao sobe em `http://localhost:3000`.

## Variaveis de ambiente

Copie `.env.example` para `.env` e preencha as credenciais se quiser ativar integracoes reais:

- `OPENAI_API_KEY`: gera respostas com a OpenAI; sem ela o sistema usa fallback local
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: ativam OAuth e selecao de localidades do Google Business Profile
- `STRIPE_SECRET_KEY`: ativa portal de cobranca Stripe e cancelamento no fim do periodo
- `ASAAS_API_KEY`: ativa consulta/cancelamento basico de assinatura no Asaas

## Observacoes de integracao

- O Google Business Profile pode exigir habilitacao das APIs e aprovacao de acesso/quota no projeto GCP.
- O fluxo de reply no Google usa o escopo `business.manage`.
- O Stripe usa o Customer Portal quando configurado.
- O Asaas usa a API REST para consulta e remocao da assinatura.

## Estrutura

- `src/`: servidor, roteamento e servicos
- `public/`: interface web
- `data/`: persistencia local do MVP

