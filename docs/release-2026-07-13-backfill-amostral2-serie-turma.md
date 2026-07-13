# Release 2026-07-13 - Backfill serie/turma da Amostral 2

## Resumo

Backfill operacional dos campos `serie` e `turma` em `response_sessions` para a pesquisa `amostral-2-2026`.

Pesquisa:

```text
slug: amostral-2-2026
survey_id: 897a492a-62ed-42a8-8b7d-8bebf01dbd22
```

Resultado final apos o backfill:

```text
Respostas totais:              1.182
Com serie preenchida:            878
Com turma preenchida:            878
Ainda sem serie/turma:           304
Atualizadas nesta operacao:      533
```

## Contexto

O diagnostico anterior mostrava que `serie` e `turma` estavam vazios em grande parte das respostas antigas da `amostral-2-2026`, principalmente antes de 2026-07-06. O fluxo atual de submit ja tenta enriquecer esses campos via Layers, mas as sessoes antigas tinham sido gravadas antes desse comportamento estar consistente.

## Regra aplicada

O backfill atualizou somente casos considerados seguros:

- sessao com `community_id` e `user_id`;
- respondente com `perfil='responsavel'`;
- Layers retornando exatamente 1 aluno relacionado em `/v1/users/{userId}/related`;
- grupos do aluno relacionado contendo `serie` e `turma` extraiveis pela mesma heuristica de `layers-hub.ts`.

Casos ambiguos ou sem permissao nao foram atualizados.

## Script

Script criado:

```text
survey-platform/scripts/backfill-amostral2-serie-turma.mjs
```

Modos:

```bash
cd survey-platform
node scripts/backfill-amostral2-serie-turma.mjs
node scripts/backfill-amostral2-serie-turma.mjs --apply
node scripts/backfill-amostral2-serie-turma.mjs --limit=10
```

O modo padrao e dry-run. O update so ocorre com `--apply`.

## Dry-run completo

```text
Sessoes pendentes analisadas: 837
Candidatas seguras:          533
Ignoradas por seguranca:     304
```

Motivos ignorados:

| Motivo | Quantidade |
|---|---:|
| `enrollments_403` para alunos | 144 |
| responsavel com multiplos alunos relacionados | 137 |
| responsavel sem aluno relacionado retornado | 22 |
| identidade/comunidade insuficiente | 1 |
| **Total** | **304** |

## Apply

O apply atualizou 533 sessoes.

Todas as 533 atualizacoes preencheram os dois campos:

```text
noSerie: 0
noTurma: 0
source: related_groups
```

Nao houve update parcial somente com `serie` ou somente com `turma`.

## Estado verificado apos update

Consulta de verificacao:

```text
total:         1182
withSerie:      878
withTurma:      878
missingEither:  304
```

Por perfil nos pendentes:

```text
aluno:       144 pendentes
responsavel: 160 pendentes
```

## Sheets

Foi verificado que as 1.182 sessoes ainda estavam com `synced_to_sheets=false`.

Consequencia: quando o cron de Sheets rodar, ele deve ler os valores atuais de `response_sessions`, incluindo as 533 linhas preenchidas agora.

## Relatorios locais

Os relatorios JSON foram gerados em `tmp/` para auditoria local:

```text
tmp/amostral2-serie-turma-dry-run-2026-07-13T21-34-43-569Z.json
tmp/amostral2-serie-turma-apply-2026-07-13T21-39-25-466Z.json
```

Eles nao devem ser tratados como fonte permanente versionada; a fonte permanente e este documento + estado do banco.

## Pendencias

Para fechar os 304 restantes:

1. Alunos: usar rota/credencial Layers com permissao para matriculas ou cruzar por base TOTVS.
2. Responsaveis com multiplos filhos: cruzar com TOTVS/amostra original para escolher a turma correta ou marcar como multi-aluno.
3. Responsaveis sem aluno relacionado: investigar Layers/TOTVS por `community_id + user/email`.
4. Sessao sem identidade suficiente: revisar manualmente o registro.
