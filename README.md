# Mini App Layers Pesquisa

Plataforma de pesquisas CSAT para rodar como mini app/iFrame dentro da Layers Education.

O produto atual fica em `survey-platform/` e usa Next.js, React, Supabase, Tailwind CSS e Vercel. Os arquivos legados `pesquisa.html` e `google-apps-script.js` permanecem no repositorio apenas como referencia historica.

## Status

- Producao: https://pesquisa-nu-sand.vercel.app
- Repositorio: https://github.com/projetos-hub/pesquisa
- Branch publicada: `main`
- Banco: Supabase `Mini-App Layers Pesquisa`
- Projeto Supabase: `qnpvlhfjknnvfiyxrhhl`

## Principais fluxos

- Home admin com identidade visual Raiz e atalhos para Pesquisas, Disparos, Exportar, Identidade Visual e Auditoria.
- CRUD de pesquisas, perguntas, opcoes, duplicacao e exclusao segura.
- Instalacao de comunidades por pesquisa.
- Identidade visual por comunidade, nao por pesquisa.
- Textos editaveis com placeholders visuais.
- Controle visual de alinhamento de texto, incluindo justificacao com fallback responsivo.
- Upload de amostras e resolucao de destinatarios por comunidade.
- Disparos Layers por amostra, comunidade, turma ou todas as comunidades.
- Historico/auditoria de disparos.
- Exportacao e relatorios.
- Engine respondente em `/p/[surveySlug]`.

## Como rodar localmente

```bash
cd survey-platform
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Gates recomendados antes de publicar

```bash
cd survey-platform
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Para releases maiores:

```bash
npm run test:ci
npm run test:e2e
```

## Estrutura

```text
survey-platform/
  app/
    (respondente)/        Rotas publicas do respondente
    admin/                Painel interno
    api/                  API routes
  components/
    survey-engine/        Engine de perguntas e steps
    ui/                   Primitivos compartilhados
  lib/                    Supabase, mapeamentos, relatorios e jobs
  supabase/migrations/    Migrations SQL versionadas
  tests/                  Unitarios e E2E
docs/                     Arquitetura, decisoes, runbooks e planos
PROGRESSO.md              Estado vivo do projeto
MANUAL-RETOMADA.md        Resumo para retomar desenvolvimento
```

## Regras operacionais

Commits neste repositorio devem usar:

```text
Projetos Raiz <projetos@raizeducacao.com.br>
```

O Vercel bloqueia deploys de outros autores.
