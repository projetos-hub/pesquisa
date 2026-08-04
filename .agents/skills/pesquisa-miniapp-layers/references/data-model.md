# Modelo de dados e contratos

Projeto Supabase: `qnpvlhfjknnvfiyxrhhl`.

| Tabela | Papel |
|---|---|
| `surveys` | template, ciclo, acesso e settings |
| `questions` | etapas, perguntas, ordem e settings |
| `question_options` | opcoes e secoes |
| `survey_communities` | instalacao, status, datas, tema e overrides |
| `communities` | identidade da unidade, marca, cores, logo e indicacao |
| `survey_sample_lists` | amostra individual e resolucao Layers |
| `survey_sample_groups` | grupos da amostra |
| `survey_sample_group_members` | membros dos grupos |
| `response_sessions` | submissao consolidada e metadados |
| `responses` | valores por pergunta |
| `survey_dispatches` | disparos e templates |
| `survey_dispatch_jobs` | execucao por comunidade |
| `notification_audit_logs` | auditoria individual |
| `survey_broadcasts` | historico do fluxo legado |
| `comunicados` | posts/comunicados |
| `public_response_links` | exportacao compartilhada e escopo |

## Contrato externo

Usar somente recursos, colunas, filtros e RPCs publicados por `GET /api/ops/v1/capabilities`. Nao procurar implementacoes, migrations ou nomes de tabela fora deste contrato. Se uma capacidade nao estiver publicada, reportar a lacuna; nao tentar acessar o banco diretamente.
