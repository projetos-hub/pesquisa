# Manual de Retomada - Mini App Layers Pesquisa

## Objetivo

Mini app de pesquisas CSAT para a Layers Education. A plataforma substitui processos manuais de enquetes, centraliza respostas no Supabase, permite amostras, disparos Layers, auditoria, exportacao e identidade visual por comunidade.

## Onde esta o produto atual

```text
C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\survey-platform
```

Arquivos legados:

- `pesquisa.html`
- `google-apps-script.js`

Eles sao referencia historica e nao devem ser o ponto principal de evolucao.

## Producao

- App: https://pesquisa-nu-sand.vercel.app
- Repo: https://github.com/projetos-hub/pesquisa
- Supabase project id: `qnpvlhfjknnvfiyxrhhl`
- Supabase project name: `Mini-App Layers Pesquisa`

## Como rodar

```bash
cd survey-platform
npm install
npm run dev
```

Local: `http://localhost:3000`

## Como validar

Para ajustes pequenos:

```bash
npm run typecheck
npm run lint
npm run build
```

Para mudancas maiores:

```bash
npm run test:ci
npm run test:e2e
```

## Estado atual

O sistema ja tem:

- home/admin hub com identidade visual Raiz;
- paginas internas sem sidebar tradicional, usando atalhos superiores compactos;
- lista de pesquisas objetiva;
- criacao, edicao, duplicacao e exclusao de pesquisas;
- editor de perguntas;
- placeholders visuais para textos editaveis;
- alinhamento de textos configuravel;
- identidade visual por comunidade;
- upload e resolucao de amostras;
- mapeamento de nomes TOTVS/import para `community_id`;
- disparos Layers;
- historico e auditoria de disparos;
- exportacao e relatorios;
- health check em `/api/health`;
- testes unitarios, E2E e build validando releases maiores.

## Regras de produto recentes

### Identidade visual

A identidade visual pertence a comunidade/escola, nao a cada pesquisa. Ao criar nova pesquisa, nao deve ser necessario reconfigurar logo, cores e mensagens da escola se a comunidade ja tem identidade cadastrada.

### Navegacao admin

A home nao usa sidebar. As opcoes principais aparecem como tiles/cards. Em telas internas, esses tiles viram atalhos superiores compactos, alinhados ao conteudo.

### Textos e placeholders

Campos editaveis de texto devem expor placeholders de forma visual e intuitiva sempre que possivel. Excecoes aceitaveis sao campos em que placeholder nao faz sentido ou nao ha variavel segura disponivel.

### Texto justificado

Justificacao pode ser usada, mas nao deve sacrificar leitura. Em cards estreitos, o respondente deve ver texto alinhado a esquerda para evitar buracos entre palavras ou hifenizacao excessiva.

## Comunidades e mapeamentos importantes

Arquivo principal:

```text
survey-platform/lib/community-mapping.ts
```

Casos recentes:

- `BOM TEMPO CRECHE E EDUCACAO INFANTIL LTDA` -> `n6k47n81`
- `COLEGIO QI BOTAFOGO` -> `qi-botafogo`
- variantes sem acento de Colegio, Colegio e Curso, Cubo, Matriz, Leonardo da Vinci e Sa Pereira devem ser tratadas como aliases quando forem a mesma comunidade.

## Problemas recentes corrigidos

### Contagem de amostra por comunidade

O endpoint de comunidades da amostra estava limitando agregacao aos primeiros 1000 registros. A contagem total de emails resolvidos podia mostrar 12 mil, enquanto a quebra por comunidade somava muito menos. O endpoint passou a paginar a leitura e agregar todos os registros.

Arquivo:

```text
survey-platform/app/api/admin/surveys/[id]/sample/communities/route.ts
```

### Historico de disparos

O historico principal de disparos nao tinha o mesmo problema da amostra. Pontos de auditoria podem ser paginados intencionalmente por tela/consulta, mas isso nao significa que a execucao do disparo esteja limitada a 1000 destinatarios.

## Missao em andamento: Comunicados Layers

Objetivo: usar o modulo Comunicados da Layers como canal persistente para divulgar pesquisas, complementando email e push.

Documento principal da investigacao:

```text
docs/comunicados-apihub-missao-2026-06-26.md
```

Manifesto AppMaker/API Hub mais recente, sem secret:

```text
docs/layers-appmaker-manifest-apihub-2026-06-26.json
```

Estado atual:

- API Hub apareceu na UI do AppMaker.
- Respond configurado para `@layers:Posts:getUpdatedAfter` apontando para `https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts`.
- Discovery da Layers lista o app `m3jzq5s00b`, mas ainda com `versions: []`.
- A chamada via `services/call` ainda nao esta funcional enquanto nao houver versao chamavel.
- A API privada do app oficial de Comunicados foi analisada por HAR, mas nao deve ser usada como integracao de producao.

Cuidados:

- Nao commitar `docs/app.layers.education.criacaocomunicado.har`; ele contem contexto sensivel de sessao/rede.
- Antes de producao real, validar o secret do API Hub no endpoint `/api/layers/actions/posts`.
- A rota `/portal/comunicados-test` e temporaria e deve ser removida ou escondida apos a investigacao.

## Git

Antes de qualquer commit:

```bash
git config user.email
```

Deve retornar:

```text
projetos@raizeducacao.com.br
```

Se estiver errado:

```bash
git config user.email "projetos@raizeducacao.com.br"
git config user.name "Projetos Raiz"
```

## Como retomar com o assistente

Use:

```text
Estou desenvolvendo o Mini App Layers Pesquisa.
Leia AGENTS.md, PROGRESSO.md e MANUAL-RETOMADA.md antes de mexer.
O app atual fica em survey-platform/.
```
