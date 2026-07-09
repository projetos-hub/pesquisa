# Survey Platform

Aplicacao Next.js do Mini App Layers Pesquisa.

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth + Postgres + Storage
- Tailwind CSS 4
- Vitest
- Playwright
- Vercel

## Rotas principais

| Rota | Uso |
|---|---|
| `/` | Home/admin hub do mini app |
| `/admin/surveys` | Lista de pesquisas |
| `/admin/surveys/[id]` | Edicao de pesquisa e perguntas |
| `/admin/surveys/[id]/sample` | Upload e gestao de amostras |
| `/admin/surveys/[id]/textos` | Adaptacoes de textos por comunidade |
| `/admin/surveys/[id]/dispatch` | Criacao de disparos |
| `/admin/auditoria` | Auditoria de disparos |
| `/admin/export` | Exportacao |
| `/admin/communities` | Identidade visual por comunidade |
| `/p/[surveySlug]` | Experiencia do respondente |
| `/api/health` | Health check operacional |

## Comandos

```bash
npm run dev
npm run typecheck
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

## Identidade visual atual

O admin usa uma identidade inspirada na Raiz:

- fundo escuro com animacao sutil;
- logo oficial `public/logo-raiz.png`;
- home sem sidebar;
- atalhos em cards/tiles com gradientes;
- nas telas internas, os atalhos migram para uma barra superior compacta.

Componentes centrais:

- `app/admin/AdminPageShell.tsx`
- `app/admin/AdminHubNav.tsx`
- `app/admin/AdminShell.tsx`
- `app/admin/page.tsx`

## Textos, placeholders e alinhamento

Campos editaveis de texto usam:

- placeholders visuais em `app/admin/components/PlaceholderTextField.tsx`;
- renderizacao em `lib/placeholders/render.ts`;
- catalogo em `lib/placeholders/catalog.ts`;
- controle de alinhamento em `app/admin/components/TextAlignControl.tsx`;
- aplicacao no respondente por `components/survey-engine/utils/textAlign.ts`.

Regra de UX para texto justificado:

- justificar somente quando ha largura suficiente;
- nao usar hifenizacao automatica agressiva;
- usar `text-wrap: pretty` e fallback para alinhamento a esquerda em cards estreitos;
- o idioma raiz do app e `pt-BR` para melhorar layout de texto.

### Adaptacoes por comunidade

A rota `/admin/surveys/[id]/textos` permite mudar textos por comunidade sem duplicar a pesquisa.

Os overrides ficam em `survey_communities.settings.contentOverrides`:

- `questions[question.key].title`
- `questions[question.key].description`
- `questions[question.key].pergunta`
- `thankyou.message`

Campos vazios herdam o texto padrao da pesquisa. O runtime aplica os overrides em `lib/survey-config.ts` durante `rowsToConfig()`.

Doc completa: `../docs/release-2026-07-09-community-text-overrides.md`.

## Dados e comunidades

Mapeamento de nomes importados para `community_id` fica em:

```text
lib/community-mapping.ts
```

Casos importantes recentes:

- `BOM TEMPO CRECHE E EDUCACAO INFANTIL LTDA` mapeia para `n6k47n81`.
- `COLEGIO QI BOTAFOGO` mapeia para `qi-botafogo`.
- nomes sem acento ou variantes TOTVS devem ser adicionados como aliases, nao como novas comunidades, quando representam a mesma comunidade.

## Cuidados

- Nao commitar `node_modules/.vite`; ha sujeira local antiga nesse caminho.
- Antes de commit, conferir `git config user.email`.
- Para mudancas em Supabase, criar migration ou documentar SQL aplicado.
