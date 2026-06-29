# Plano: exibir Marca e Unidade no lugar de IDs de comunidade

## Objetivo

Reduzir a exposicao de `community_id` cru na UI administrativa e nos links/exportacoes de acompanhamento.

Regra de exibicao:
- Primario: `Marca Unidade`, usando `communities.marca` + `communities.unidade`.
- Se `unidade = Geral`, mostrar apenas `Marca`.
- Secundario discreto: `community_id`, quando for util para operacao tecnica.
- Fallback: `nome_escola`, depois `community_id`, apenas se marca/unidade nao existirem.

Regra de exportacao:
- Toda base de respostas deve incluir as colunas `Marca`, `Unidade` e `Nome da Comunidade`.
- Manter `community_id` como coluna tecnica, mas sem ser o unico identificador visivel.

## Fonte de dados

Tabela fonte: `public.communities`

Campos ja existentes:
- `community_id`
- `nome_escola`
- `marca`
- `unidade`

Estado remoto confirmado em 2026-06-29:
- 42 comunidades cadastradas.
- 0 sem `marca`.
- 0 sem `unidade`.
- Nenhuma `survey_communities.community_id` aponta para comunidade ausente em `communities`.

## Padrao tecnico proposto

1. Evoluir `survey-platform/lib/community-identity.ts`
   - Adicionar `formatCommunityPrimaryName(identity)`.
   - Adicionar `formatCommunityExportFields(identity)`.
   - Manter `resolveSchoolName` compatível.

2. Evoluir `survey-platform/lib/community-name.tsx`
   - `CommunityDisplay` deve aceitar `marca` e `unidade`.
   - Renderizar nome principal com marca/unidade.
   - Renderizar `community_id` como subtitulo pequeno.
   - Evitar `font-mono` no nome principal; usar `font-mono` apenas no subtitulo tecnico.

3. Ajustar queries que hoje buscam so `community_id, nome_escola`
   - Trocar para `community_id, nome_escola, marca, unidade` nos pontos de UI/export.

## Mapeamento de UI

### P0 - Configuracao de pesquisa e selecao de comunidade

Arquivos:
- `survey-platform/app/admin/surveys/[id]/page.tsx`
- `survey-platform/app/admin/surveys/[id]/CommunityInstallManager.tsx`
- `survey-platform/app/admin/surveys/[id]/communities/page.tsx`
- `survey-platform/app/admin/surveys/[id]/communities/CommunitiesThemeEditor.tsx`
- `survey-platform/app/admin/communities/page.tsx`
- `survey-platform/app/admin/communities/CommunitiesThemeEditor.tsx`

Ajustes:
- Na lista de comunidades instaladas, exibir `Marca Unidade` e subtitulo com `community_id`.
- No input/datalist de instalar comunidade, trocar a experiencia de "ID da comunidade" por uma selecao pesquisavel com label humano.
- No confirm de remocao, usar nome humano: `Remover "Colégio Qi Valqueire" desta pesquisa?`.
- Manter o ID visivel em subtitulo tecnico.

### P0 - Disparos e segmentacao

Arquivos:
- `survey-platform/app/admin/surveys/[id]/dispatch/page.tsx`
- `survey-platform/app/admin/surveys/[id]/dispatch/dispatch-targeting-section.tsx`
- `survey-platform/app/admin/surveys/[id]/dispatch/ManualDispatch.tsx`
- `survey-platform/app/admin/surveys/[id]/dispatch/DispatchHistory.tsx`
- `survey-platform/app/admin/surveys/[id]/dispatch/preview/route.ts`
- `survey-platform/app/admin/surveys/[id]/disparos/page.tsx`
- `survey-platform/app/admin/surveys/[id]/disparos/DisparoForm.tsx`
- `survey-platform/app/admin/auditoria/[surveyId]/disparos/new/page.tsx`
- `survey-platform/app/admin/auditoria/[surveyId]/disparos/new/NovoDisparoForm.tsx`

Ajustes:
- Em filtros, selects e chips selecionados, mostrar nome humano.
- Em chips de comunidades selecionadas, usar `Marca Unidade` com `community_id` discreto ou tooltip.
- Em historico de jobs, substituir `job.community_id` cru pelo nome humano.
- APIs de preview/history devem devolver metadados de comunidade ou o componente deve receber um mapa.

### P1 - Amostras

Arquivos:
- `survey-platform/app/admin/surveys/[id]/sample/page.tsx`
- `survey-platform/app/admin/surveys/[id]/sample/QuickSample.tsx`
- `survey-platform/app/admin/surveys/[id]/sample/SampleUpload.tsx`
- `survey-platform/app/admin/surveys/[id]/sample/SampleGroups.tsx`
- `survey-platform/app/api/admin/surveys/[id]/sample/communities/route.ts`
- `survey-platform/app/api/admin/surveys/[id]/sample/groups/[groupId]/members/route.ts`

Ajustes:
- Selects de comunidade devem usar marca/unidade.
- Tabelas de amostra e grupos nao devem exibir so `community_id`.
- Export de nao encontrados deve incluir `marca,unidade,nome_comunidade,community_id`.
- Rotas de membros/grupos precisam enriquecer entradas com identidade de comunidade ou retornar mapa.

### P1 - Analytics, auditoria e dashboards

Arquivos:
- `survey-platform/app/admin/analytics/[surveyId]/communities/page.tsx`
- `survey-platform/app/admin/analytics/[surveyId]/overview/page.tsx`
- `survey-platform/app/api/admin/analytics/communities/route.ts`
- `survey-platform/app/api/admin/analytics/summary/route.ts`
- `survey-platform/components/analytics/CommunityTable.tsx`
- `survey-platform/app/admin/auditoria/[surveyId]/page.tsx`

Ajustes:
- Rankings/tabelas por comunidade devem usar marca/unidade.
- `community_id` fica secundario.
- Queries que buscam `nome_escola` devem buscar tambem `marca, unidade`.

### P1 - Relatorios avancados e export admin

Arquivos:
- `survey-platform/lib/report-queries.ts`
- `survey-platform/lib/report-xlsx-schema.ts`
- `survey-platform/lib/report-xlsx-sheets.ts`
- `survey-platform/lib/report-xlsx.ts`
- `survey-platform/app/api/admin/reports/[surveyId]/route.ts`
- `survey-platform/app/api/admin/export/route.ts`
- `survey-platform/app/admin/reports/ReportsClient.tsx`

Ajustes:
- Tipos `NpsRow`, `ScaleAverageRow`, `SessionRow` devem carregar `marca`, `unidade`, `nome_escola`/`nome_comunidade`.
- RPCs `rpc_nps_breakdown` e `rpc_scale_averages` hoje retornam `nome_escola`; avaliar migration para retornar tambem `marca` e `unidade`.
- Export antigo `/api/admin/export` deve enriquecer sessions com `communities`.
- XLSX "Respostas Brutas" deve conter `Marca`, `Unidade`, `Nome da Comunidade`, `community_id`.
- Abas "NPS Breakdown" e "Medias por Eixo" devem trocar "Escola" por colunas separadas ou ao menos nome humano consistente.

### P0 - Links de acompanhamento/public responses

Arquivos:
- `survey-platform/lib/public-responses.ts`
- `survey-platform/app/public/responses/[token]/page.tsx`
- `survey-platform/app/api/public/responses/[token]/route.ts`
- `survey-platform/app/admin/export/page.tsx`
- `survey-platform/app/admin/export/actions.ts`

Ajustes:
- `getPublicResponsesDataset` usa `fetchRawSessions`, entao precisa receber identidade enriquecida.
- CSV, JSON e XLSX dos links publicos devem incluir `Marca`, `Unidade`, `Nome da Comunidade`, `community_id`.
- A pagina publica deve continuar simples, mas a amostra/tabela deve mostrar nome humano quando renderizar colunas.
- Garantir que `include_pii=false` nao remova marca/unidade, pois sao metadados de pesquisa, nao PII.

### P2 - Sincronizacao externa e operacao

Arquivos:
- `survey-platform/app/api/cron/sync-sheets/route.ts`
- `survey-platform/lib/sheets.ts`
- `survey-platform/app/api/admin/operations/dispatch-health/route.ts`
- `survey-platform/app/api/cron/process-dispatches/route.ts`

Ajustes:
- Google Sheets, se ainda usado, deve receber marca/unidade/nome da comunidade.
- Health operacional pode manter ID cru como campo tecnico, mas exibir nome humano em qualquer UI consumidora.

## Sequencia de execucao

1. Criar modelo compartilhado de identidade
   - Atualizar helpers `community-identity.ts` e `community-name.tsx`.
   - Adicionar testes unitarios para `Geral`, fallback e subtitulo tecnico.

2. Enriquecer queries server-side
   - Substituir selects `community_id, nome_escola` por `community_id, nome_escola, marca, unidade`.
   - Atualizar tipos `Community` usados nos componentes admin.

3. Corrigir superficies P0 de UI
   - Configuracao de pesquisa.
   - Identidade visual/comunidades.
   - Dispatch targeting/history.
   - Links publicos/export base.

4. Corrigir P1
   - Amostras.
   - Analytics.
   - Relatorios avancados.
   - Auditoria.

5. Corrigir exports
   - `/api/admin/export`.
   - Relatorios XLSX avancados.
   - Public response CSV/JSON/XLSX.
   - Export de nao encontrados.

6. Validacao
   - Unit: helpers de identidade e schema XLSX.
   - Unit: public responses inclui headers novos.
   - E2E: admin instala comunidade e ve `Colégio Qi Valqueire`, nao apenas `az51800x`.
   - E2E: dispatch seleciona comunidade por nome humano.
   - Smoke: baixar link publico XLSX/CSV e confirmar colunas `Marca`, `Unidade`, `Nome da Comunidade`, `community_id`.

## Criterios de pronto

- Usuario admin nao precisa conhecer `community_id` para configurar pesquisa, disparo, amostra ou relatorio.
- IDs opacos como `az51800x`, `n6k47n81`, `yf24y2k7` nao aparecem como label principal em UI intuitiva.
- Quando `community_id` aparecer, aparece como metadado tecnico secundario.
- Toda base de respostas exportada contem `Marca`, `Unidade`, `Nome da Comunidade`, `community_id`.
- Nenhum payload tecnico para Layers troca `community_id` por nome humano; APIs externas continuam recebendo o ID correto.

