# Release 2026-07-07 - Upload de amostra Excel

## Contexto

O fluxo de upload de amostra no admin exibia mojibake em textos da tela e no preview do Excel, com exemplos como `usuÃ¡rios`, `Ã¢...` e marcadores quebrados no lugar de texto normal.

A base analisada foi:

```text
C:\Users\lucas.mesquita\Downloads\Base disparo Intencao de Renovacao - Marcas da Diretoria de Marca.xlsx
```

## Causa raiz

O problema tinha duas partes:

1. Alguns textos estaticos do fluxo de amostra ja estavam salvos corrompidos no codigo.
2. O parser do upload aceitava apenas o contrato antigo de colunas:
   - `NOME`
   - `NOMEFANTASIA`
   - `EMAIL INSTITUCIONAL`
   - `EMAIL RESP FIN`
   - `EMAIL RESP ACAD`

A base TOTVS de renovacao usa outro contrato:

- `ALUNO`
- `FILIAL`
- `EMAIL_ALUNO`
- `EMAIL_RESP_FINANCEIRO`
- `EMAIL_RESP_ACADEMICO`

Por isso o arquivo era legivel quando aberto diretamente, mas o preview do app aparecia vazio para nome/escola/emails.

## Correcao

Commit principal:

```text
ab9a988 fix(sample): corrige encoding e aliases do upload Excel
```

Mudancas principais:

- Criado helper de reparo de mojibake em `survey-platform/lib/sample-upload-text.ts`.
- Criado parser compartilhado de Excel em `survey-platform/lib/sample-excel.ts`.
- Preview client-side e API server-side passaram a usar a mesma extracao de colunas.
- Upload passou a aceitar aliases de headers do formato antigo e do formato TOTVS de renovacao.
- Textos visiveis do fluxo de amostra foram limpos.
- Adicionados aliases de comunidade para filiais presentes na base real.
- Criado teste unitario em `survey-platform/__tests__/unit/sample-excel.test.ts`.

## Validacao

Gates executados antes do commit:

```bash
npm run typecheck
npx eslint lib/sample-excel.ts lib/sample-upload-text.ts app/api/admin/surveys/[id]/sample/route.ts app/admin/surveys/[id]/sample/SampleUpload.tsx app/admin/surveys/[id]/sample/page.tsx app/admin/surveys/[id]/sample/QuickSample.tsx lib/community-mapping.ts
npx vitest run --config vitest.config.ts __tests__/unit/sample-excel.test.ts
npm run build
```

Resultado da simulacao contra a base real:

| Metrica | Resultado |
|---|---:|
| Linhas lidas | 11.946 |
| Emails antes de deduplicar | 28.572 |
| Pares unicos `community_id + email` | 26.576 |
| Linhas sem email | 0 |
| Escolas sem mapeamento | 0 |

## Observacao operacional

O app ignora as colunas excedentes da base. O excesso de colunas nao deve quebrar o upload.

Ponto de atencao: a planilha contem campos sensiveis que nao sao necessarios para disparo, como CPF, telefone, senha portal e dados financeiros. Eles nao sao persistidos pelo fluxo de amostra, mas trafegam no request durante o upload.
