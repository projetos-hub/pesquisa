# Decisões Arquiteturais — Plataforma de Pesquisas

> Documento vivo. Toda decisão relevante deve ser registrada aqui com contexto e alternativas descartadas.

---

## Stack escolhida

### Next.js 16 (App Router) — Frontend + API

**Decisão:** usar Next.js com App Router como único framework.

**Motivo:** o `pesquisa.html` é um React CDN monolítico. Para suportar área admin com roteamento, autenticação e SSR, um HTML único se tornaria inviável. Next.js unifica frontend respondente, API routes e admin em um único projeto deployável na Vercel sem infraestrutura adicional.

**Alternativa descartada:** manter React CDN e adicionar Express separado — duas bases de código, dois deploys, complexidade desnecessária.

---

### Supabase — Banco principal

**Decisão:** Supabase (PostgreSQL) como fonte de verdade para pesquisas e respostas.

**Motivo:** Google Sheets é ponto único de falha, sem idempotência, sem consultas relacionais, sem autenticação. Supabase oferece PostgreSQL gerenciado + Auth + RLS + REST auto-gerado, sem precisar de infraestrutura própria.

**Alternativa descartada:** PlanetScale (MySQL), Neon (PostgreSQL) — ambos sem Auth nativo integrado. Supabase é o único que oferece banco + auth + storage no mesmo produto.

---

### Google Sheets como espelho (não primário)

**Decisão:** Sheets continua recebendo dados, mas como espelho após gravação no Supabase. Campo `synced_to_sheets` permite reprocessamento quando Sheets falha.

**Motivo:** o time já usa Sheets para análise. Remover imediatamente criaria fricção operacional. Migração gradual: Supabase como verdade, Sheets como conveniência.

**Alternativa descartada:** manter Sheets como primário e adicionar Supabase como secundário — inverteria a dependência errada. Sheets não tem transações nem idempotência.

---

### Supabase Auth — Magic link para admin

**Decisão:** autenticação do painel admin via magic link por e-mail, sem senha.

**Motivo:** zero infraestrutura adicional, sem gerenciamento de senhas, mais seguro que senha simples. Admin é uso interno, usuários aceitam fluxo de e-mail.

**Alternativa descartada:** JWT custom com bcrypt — requer tabela de usuários própria, hash de senhas, refresh tokens. Complexidade sem benefício no contexto.

---

### `survey-platform/` dentro do repositório atual

**Decisão:** manter a nova plataforma como subpasta do repositório existente.

**Motivo:** histórico unificado; `pesquisa.html` permanece acessível como referência durante a migração; um único repositório para revisar em PRs.

**Alternativa descartada:** novo repositório separado — quebraria o histórico e dificultaria comparações entre legado e novo código.

---

## Estratégia de migração da engine (pesquisa.html → Next.js)

### Abordagem: migração por componentes, não big bang

A engine do `pesquisa.html` contém a lógica de:
1. `buildActiveSteps` — filtra steps ativos com base em respostas (lógica condicional)
2. `App()` — gerencia estado, navegação entre steps e submissão
3. Componentes de step individuais (NPS, Escala, Radio, Texto, Welcome, ThankYou)

**Estratégia adotada:**

1. **Fase 1:** migrar a engine completa com `SURVEYS` hardcoded. Objetivo: mesmo comportamento do `pesquisa.html`, zero regressões nos 10 cenários de teste. Nenhuma dependência de Supabase.
2. **Fase 2:** substituir `SURVEYS` hardcoded por chamadas à API. A engine não muda — só a fonte dos dados.

**Motivo:** separar "migrar comportamento" de "conectar banco" reduz superfície de bugs. Se `buildActiveSteps` estiver errado, descobre na Fase 1, não misturado com problemas de API.

### Navegação por `key`, não por índice

O `buildActiveSteps` do legado retorna um array filtrado. A navegação de "voltar" precisa encontrar o step anterior **no array filtrado**, não no array original. A implementação usará `key` como identificador estável, não índice posicional.

**Por que importa:** se o usuário responde bilíngue = "Não", o step bilíngue é removido do array ativo. Um "voltar" baseado em `currentIndex - 1` quebraria — voltaria para o step errado. Navegando por `key`, o sistema sempre encontra o step anterior correto no array filtrado atual.

---

## Estratégia de API Routes

### Duas rotas por pesquisa

```
GET  /api/surveys/[slug]         → retorna SurveyConfig completa
POST /api/surveys/[slug]/submit  → grava response_session + responses
```

**Motivo:** separação de responsabilidades. O frontend respondente nunca acessa Supabase diretamente — tudo passa pelas API routes, que usam `service role key` (não exposta ao browser).

### Idempotência na submissão

Constraint `UNIQUE (survey_id, community_id, user_id)` na tabela `response_sessions`. Se o usuário reenviar (botão voltar, duplo clique), a API retorna `{ ok: true, duplicate: true }` em vez de gravar duplicata.

### proxy.ts como única fonte de redirects de auth

**Decisão:** `app/admin/layout.tsx` não redireciona usuários não autenticados. Apenas retorna `<>{children}</>` quando sem sessão. O `proxy.ts` é a única fonte de lógica de redirect.

**Motivo:** o `layout.tsx` envolve **todas** as rotas sob `/admin/*`, incluindo `/admin/login` e `/admin/auth/callback`. Se o layout redirecionar para `/admin/login` quando sem sessão, e o usuário estiver em `/admin/login`, ocorre loop infinito (`ERR_TOO_MANY_REDIRECTS`).

**Alternativa descartada:** criar route group separado `(protected)` para isolar o layout autenticado — correto arquiteturalmente, mas over-engineering para o momento. A solução mínima (retornar `children` sem sidebar) resolve sem reestruturação.

---

### Falha silenciosa do Sheets

Se a chamada ao Apps Script falhar, a API route loga o erro mas responde `200` ao respondente. O campo `synced_to_sheets = false` permite reprocessamento posterior via job ou manualmente.

---

## Estrutura de diretórios — convenção adotada

```
survey-platform/
├── app/
│   ├── (respondente)/p/[surveySlug]/   ← rotas públicas dos respondentes
│   ├── admin/                           ← rotas protegidas (auth Supabase)
│   └── api/surveys/[slug]/              ← API routes
├── components/
│   ├── survey-engine/                   ← engine migrada
│   │   ├── steps/                       ← um arquivo por tipo de step
│   │   └── utils/                       ← buildActiveSteps, types
│   ├── admin/                           ← componentes do painel admin
│   └── ui/                              ← primitivos reutilizáveis
├── lib/
│   ├── supabase.ts                      ← cliente browser
│   ├── supabase-server.ts               ← cliente server-side
│   └── supabase-service.ts             ← service role (API routes)
└── supabase/
    └── migrations/                      ← SQL versionado
```

**Motivo do route group `(respondente)`:** isola o layout do respondente (sem navbar, sem footer) do layout admin, sem afetar a URL (`/p/csat`, não `/(respondente)/p/csat`).

---

## Decisoes de produto e UX - junho/2026

### Identidade visual por comunidade

**Decisao:** logos, cores e mensagens institucionais pertencem a comunidade/escola, nao a uma pesquisa especifica.

**Motivo:** o usuario nao deve configurar a mesma identidade visual toda vez que cria uma nova pesquisa. A identidade da comunidade tende a ser estavel; a pesquisa muda mais frequentemente.

**Impacto:** telas de criacao/edicao de pesquisa devem focar no conteudo da pesquisa. Ajustes de logo, tema e mensagens por escola ficam nas telas de comunidades/identidade visual.

### Home admin sem sidebar tradicional

**Decisao:** a home do mini app usa atalhos visuais em cards. Nas telas internas, os mesmos atalhos aparecem como uma navegacao superior compacta.

**Motivo:** o app e pequeno e orientado a poucos fluxos principais. Uma sidebar permanente consumia espaco e deixava a interface mais pesada que o necessario.

**Alternativa descartada:** manter sidebar lateral em todas as telas. Ela nao combinava com a home e reduzia a area util das tabelas/listas.

### Textos com placeholders e alinhamento visual

**Decisao:** campos editaveis de texto devem oferecer placeholders visuais sempre que houver variaveis seguras disponiveis. O alinhamento deve ser configuravel por controles visuais.

**Motivo:** textos de welcome, thank you, perguntas e mensagens de disparo precisam ser operados por usuarios nao tecnicos. Digitar variaveis manualmente aumenta risco de erro.

### Justificacao sem hifenizacao agressiva

**Decisao:** texto justificado e permitido, mas o respondente deve receber fallback para alinhamento a esquerda quando o card estiver estreito. A hifenizacao automatica agressiva foi removida.

**Motivo:** em portugues, texto justificado em largura estreita cria buracos grandes entre palavras. Hifenizacao automatica corrige parte disso, mas pode deixar muitas quebras e piorar a leitura. A solucao atual usa `text-wrap: pretty`, `text-justify: inter-word`, `hyphens: manual` e container query no card.

**Arquivos:** `components/survey-engine/utils/textAlign.ts` e `app/(respondente)/survey.css`.

### Agregacao de amostras sem limite de 1000 linhas

**Decisao:** endpoints que agregam comunidades de uma amostra devem paginar a leitura e processar todos os registros relevantes.

**Motivo:** Supabase pode retornar paginas limitadas. Agregar apenas a primeira pagina fazia a quebra por comunidade divergir do total de emails resolvidos em amostras grandes.

**Arquivo:** `app/api/admin/surveys/[id]/sample/communities/route.ts`.
