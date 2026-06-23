# QA Baseline

Data: 2026-06-22

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | pass | TypeScript sem erros. |
| `npm run build` | pass | Build passa sem warning de workspace root apos configurar `turbopack.root`. |
| `npm run lint` | pass with warnings | ESLint executa analise real; restam 18 warnings nao bloqueantes. |
| `npm run test:unit` | pass | 2 arquivos, 11 testes unitarios puros, sem Supabase real. |
| `npm run test:integration` | not run | Suite separada para testes que dependem de app/Supabase/env. |

## Initial QA Assessment

- Testes unitarios e integracao estavam misturados no mesmo comando.
- Testes existentes dependem de Supabase real e env local.
- Primeiro objetivo: separar unitarios puros de testes de integracao e restaurar lint/build/test local.

## Current Gate Status

- `test:unit` cobre inicialmente `rowsToConfig`, `applyConditionals` e `buildActiveSteps`.
- `test:integration` preserva os testes antigos dependentes de Supabase real sem bloquear o loop unitario local.
- `lint` ainda revela warnings de melhoria, mas deixou de falhar por erro de instalacao ou erro de codigo.
