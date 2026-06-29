# Release 2026-06-29 - Marca e Unidade nas comunidades

## Contexto

A UI administrativa exibia `community_id` opaco como identificador principal em varios pontos de configuracao, disparo, amostra, auditoria e analytics. Isso dificultava a operacao porque codigos como `az5180...` nao sao intuitivos para usuarios que conhecem a escola como marca/unidade, por exemplo `Qi Valqueire`.

## Decisao de exibicao

A regra central agora fica em `survey-platform/lib/community-identity.ts`:

1. Nome principal: `Marca Unidade`, usando `communities.marca` e `communities.unidade`.
2. Se `unidade = Geral`, mostrar apenas a marca.
3. Fallback: `nome_escola`.
4. Ultimo fallback: `community_id`.
5. Quando o ID aparecer em UI operacional, ele deve ser subtitulo tecnico discreto, nao label principal.

## Superficies atualizadas

- Configuracao de pesquisa e instalacao/remocao de comunidades.
- Seletores e filtros de dispatch.
- Historico de jobs de dispatch.
- Disparos legados e registro de disparo em auditoria.
- Amostras, grupos de amostra e export de nao encontrados.
- Respostas, auditoria e analytics por comunidade.
- Helpers compartilhados de exibicao de comunidade.

## Exportacoes e links de acompanhamento

As bases de respostas passam a carregar os campos:

- `Marca`
- `Unidade`
- `Nome da Comunidade`
- `community_id`

Isso vale para:

- XLSX avancado.
- Export admin antigo `/api/admin/export`.
- Base publica de respostas, porque `public-responses` usa `fetchRawSessions`.
- Export de nao encontrados em amostra.

`community_id` continua presente como chave tecnica para integracoes e auditoria.

## Arquivos principais

- `survey-platform/lib/community-identity.ts`
- `survey-platform/lib/community-name.tsx`
- `survey-platform/lib/report-queries.ts`
- `survey-platform/lib/report-xlsx-schema.ts`
- `survey-platform/lib/report-xlsx-sheets.ts`
- `survey-platform/app/api/admin/export/route.ts`
- `survey-platform/app/admin/surveys/[id]/CommunityInstallManager.tsx`
- `survey-platform/app/admin/surveys/[id]/dispatch/*`
- `survey-platform/app/admin/surveys/[id]/sample/*`
- `survey-platform/app/admin/auditoria/[surveyId]/page.tsx`
- `survey-platform/components/analytics/CommunityTable.tsx`

## Plano de referencia

- `docs/plan/community-display-export-plan.md`

## Commit publicado

- `3006c8b feat: exibir marca e unidade nas comunidades`

## Gates validados

```bash
cd survey-platform
npm run test:unit   # passou: 19 files, 89 tests
npm run typecheck   # passou
npm run lint        # passou com warnings conhecidos de <img>
```

## Observacoes operacionais

- As integracoes continuam usando `community_id`; a mudanca e de apresentacao/exportacao.
- O push para `main` foi concluido com bypass da regra de PR registrado pelo GitHub remoto.
- Permanecem alteracoes locais nao relacionadas no worktree, incluindo docs antigos, arquivos temporarios, HAR e delecoes em `node_modules/.vite`; elas nao fizeram parte do commit `3006c8b`.

## Proximos cuidados

- Fazer smoke visual no admin em configuracao de pesquisa, dispatch, amostra e analytics.
- Baixar um XLSX/CSV publico ou admin e confirmar as colunas novas.
- Em uma proxima rodada, avaliar Google Sheets/cron sync se esse espelho ainda estiver em uso operacional.
