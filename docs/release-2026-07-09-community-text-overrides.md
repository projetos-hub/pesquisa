# Release 2026-07-09 - Adaptacoes de texto por comunidade

## Objetivo

Permitir que uma mesma pesquisa tenha textos diferentes por comunidade sem duplicar a pesquisa, as perguntas, a amostra, os disparos ou os relatorios. O primeiro uso previsto e a pesquisa de intencao de rematricula, onde cada marca/unidade pode precisar de linguagem propria.

## O que foi entregue

- Nova tela admin: `/admin/surveys/[id]/textos`.
- Card de acesso no detalhe da pesquisa: `Adaptações por comunidade`.
- Editor por comunidade com tres areas:
  - lista de comunidades instaladas;
  - lista de etapas/perguntas da pesquisa;
  - formulario de adaptacao com preview lateral.
- Indicador por comunidade: `Texto padrão` ou `N personalizados`.
- Indicador por etapa: `Usando padrão` ou `Personalizado`.
- Botao `Usar texto padrão`, que limpa a adaptacao da comunidade para aquela etapa.
- Botao `Abrir link de teste`, usando `/p/[surveySlug]?communityId=[communityId]`.
- Suporte a variaveis visuais no texto: `{{nomeAluno}}`, `{{nomeEscola}}`, `{{marca}}`, `{{unidade}}`, `{{serie}}`.

## Modelo de dados

Nao foi criada migration nova. A feature usa o JSONB ja existente em `survey_communities.settings`.

Contrato salvo por instalacao de comunidade:

```json
{
  "contentOverrides": {
    "questions": {
      "intencao_rematricula": {
        "title": "Voce pretende renovar a matricula de {{nomeAluno}} no {{nomeEscola}}?",
        "description": "Sua resposta ajuda a equipe da escola a planejar 2027.",
        "pergunta": "Selecione a alternativa mais proxima da sua decisao atual."
      }
    },
    "thankyou": {
      "message": "Obrigado. A equipe do {{nomeEscola}} recebeu sua resposta."
    }
  }
}
```

Regras:

- `questions` e indexado por `question.key`; para `welcome`, pode usar a propria key da pergunta ou o tipo `welcome` quando a key nao for especifica.
- Campo vazio nao sobrescreve nada; herda o texto padrao da pesquisa.
- `thankyou.message` alimenta `settings.theme.thankyouMessage` no runtime.
- A pesquisa base continua sendo a fonte da estrutura: ordem, tipo, opcoes, obrigatoriedade e condicionais.

## Fluxo de runtime

1. Respondente acessa `/p/[slug]?communityId=[id]`.
2. API `/api/surveys/[slug]` carrega `survey_communities.settings` da comunidade.
3. `rowsToConfig()` aplica `contentOverrides` antes de montar os `StepDef`.
4. O respondente recebe a mesma pesquisa, mas com textos efetivos daquela comunidade.
5. Respostas continuam vinculadas a mesma `survey_id`, preservando analytics e exportacoes consolidadas.

## Arquivos principais

- `survey-platform/app/admin/surveys/[id]/textos/page.tsx`
- `survey-platform/app/admin/surveys/[id]/textos/TextOverridesEditor.tsx`
- `survey-platform/app/admin/surveys/[id]/textos/actions.ts`
- `survey-platform/lib/survey-config.ts`
- `survey-platform/__tests__/unit/survey-config.test.ts`

## Como usar na intencao de rematricula

1. Criar ou abrir a pesquisa de intencao de rematricula no admin.
2. Instalar as comunidades que participarao da pesquisa.
3. Entrar em `Adaptações por comunidade`.
4. Selecionar uma comunidade.
5. Personalizar apenas as etapas que precisam de linguagem propria.
6. Conferir o preview lateral.
7. Usar `Abrir link de teste` para validar a experiencia real.
8. Repetir para as comunidades que precisam de texto diferente.
9. Antes do disparo, conferir se cada comunidade esta como `Texto padrão` ou com o numero esperado de textos personalizados.

## Checklist antes de iniciar a campanha

- [ ] Pesquisa base revisada e com `question.key` legivel nas perguntas principais.
- [ ] Comunidades instaladas na pesquisa.
- [ ] Textos padrao funcionando para comunidades sem adaptacao.
- [ ] Adaptacoes criadas apenas onde houver necessidade real.
- [ ] Preview testado em pelo menos uma comunidade de cada marca/unidade critica.
- [ ] Link real `/p/[slug]?communityId=[communityId]` validado.
- [ ] Amostra/importacao validada, se a pesquisa for amostral.
- [ ] Disparo testado com publico reduzido antes do envio geral.

## Validacoes executadas

```bash
cd survey-platform
npm run typecheck
npm run lint -- app/admin/surveys/[id]/page.tsx app/admin/surveys/[id]/textos/page.tsx app/admin/surveys/[id]/textos/TextOverridesEditor.tsx app/admin/surveys/[id]/textos/actions.ts lib/survey-config.ts __tests__/unit/survey-config.test.ts
npx vitest run --config vitest.config.ts __tests__/unit/survey-config.test.ts --pool=threads
npm run build
```

Todos passaram.

## Commit de codigo

- `4e35667 feat(surveys): adiciona textos por comunidade`

## Riscos e cuidados

- Evitar transformar a tela em editor paralelo de perguntas. Ela deve alterar texto, nao estrutura.
- Evitar personalizar todas as comunidades sem necessidade; isso aumenta custo operacional de revisao.
- Se uma pergunta tiver `key` generica, renomear antes de operar em larga escala para facilitar auditoria.
- Mudancas aparecem no respondente apos revalidacao/cache do Next; o Server Action chama `revalidateTag('survey-config', 'default')`.