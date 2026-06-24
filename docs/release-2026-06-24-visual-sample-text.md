# Release 2026-06-24 - identidade visual, amostras e textos

## Resumo

Rodada de evolucao do Mini App Layers Pesquisa focada em:

- nova identidade visual do admin;
- experiencia interna sem sidebar lateral permanente;
- identidade visual por comunidade;
- placeholders e alinhamento para textos editaveis;
- mapeamentos de comunidades em amostras;
- correcao de agregacao de comunidades em amostras grandes;
- refinamento de texto justificado no respondente.

## Commits relacionados

| Commit | Descricao |
|---|---|
| `53845b2` | Atualiza identidade visual do app, home/admin hub, navegacao compacta, placeholders, alinhamento e comunidades |
| `b8ea4e3` | Corrige paginacao da contagem por comunidade em amostras |
| `d93192b` | Centraliza helper de alinhamento de texto no respondente |
| `cdf3a08` | Remove hifenizacao agressiva e usa fallback responsivo para texto justificado |

## Identidade visual e UX admin

- Home passa a ser o ponto de entrada do mini app, com atalhos para Pesquisas, Disparos, Exportar, Identidade Visual e Auditoria.
- Sidebar lateral deixa de ser a estrutura principal.
- Em telas internas, os atalhos viram navegacao superior compacta.
- Logo oficial Raiz passa a ser usado.
- A identidade visual segue fundo escuro, movimento sutil e cards/atalhos com gradientes.

## Identidade visual por comunidade

Decisao de produto: a identidade visual pertence a comunidade/escola, nao a pesquisa.

Impacto:

- criar uma nova pesquisa nao deve exigir configurar identidade visual novamente;
- logos, cores e mensagens institucionais devem ser reaproveitados da comunidade;
- a tela de identidade visual e o lugar correto para administrar esses dados.

## Textos, placeholders e alinhamento

- Campos editaveis devem expor placeholders visuais quando houver variaveis seguras.
- Alinhamento de texto deve ser configuravel por controle visual.
- O respondente aplica alinhamento por helper unico em `components/survey-engine/utils/textAlign.ts`.

Regra para texto justificado:

- justificar apenas quando houver largura confortavel;
- nao usar hifenizacao automatica agressiva;
- em card estreito, cair para alinhamento a esquerda;
- usar `text-wrap: pretty`, `text-justify: inter-word`, `hyphens: manual` e container query.

## Amostras e comunidades

### Bug corrigido

O total de emails resolvidos podia ser maior que a soma exibida por comunidade porque o endpoint de comunidades da amostra agregava apenas uma pagina de dados.

Correcao:

- pagina a leitura;
- agrega todos os registros relevantes;
- preserva busca/filtro e contagens por comunidade.

Arquivo:

```text
survey-platform/app/api/admin/surveys/[id]/sample/communities/route.ts
```

### Mapeamentos importantes

| Nome importado | communityId |
|---|---|
| BOM TEMPO CRECHE E EDUCACAO INFANTIL LTDA | `n6k47n81` |
| COLEGIO QI BOTAFOGO | `qi-botafogo` |
| COLEGIO AMERICANO | `americano` |
| COLEGIOS INTEGRADOS LEONARDO DA VINCI - GAMA | `leonardodavinci-gama` |
| COLEGIO E CURSO MATRIZ EDUCACAO DUQUE DE CAXIAS | `matriz-caxias` |
| COLEGIO E CURSO AO CUBO BOTAFOGO | `ns8z5w8m` |
| COLEGIO E CURSO AO CUBO BARRA | `yxak8s0k` |
| COLEGIO E CURSO CUBO BARRA GOLFE | `k4ys44r2` |
| ESCOLA SA PEREIRA S.A. CAPISTRANO | `w213sfza` |

## Validacoes feitas

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Observacao: lint passou com warnings conhecidos de uso de `<img>`.
